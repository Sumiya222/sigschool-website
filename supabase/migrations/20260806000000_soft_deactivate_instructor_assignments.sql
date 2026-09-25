-- Two live paths (sync_whitelist_to_user_roles, admin_set_instructor_status)
-- run DELETE FROM instructor_assignments WHERE instructor_user_id = uid --
-- a blanket wipe of every section assignment across every school for that
-- instructor, SECURITY DEFINER, triggered by an admin clicking Revoke/Pause.
-- If the email-to-user-id resolution is ever wrong, this silently destroys
-- the wrong instructor's entire assignment history with no way to tell what
-- was removed.
--
-- Soft-deactivate instead: add revoked_at, replace every DELETE with an
-- UPDATE that sets it. Fully recoverable (an admin can see and manually
-- restore what a revoke removed) instead of gone. Re-approving an
-- instructor does NOT auto-revive their old assignments -- that stays a
-- conscious admin action, since circumstances may have changed.

ALTER TABLE public.instructor_assignments
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz;

-- Replace the plain unique constraint with a partial one covering only
-- active rows. This is what makes re-assigning someone after a revoke work:
-- the old (now-revoked) row no longer participates in the uniqueness check,
-- so a fresh INSERT for the same (instructor, section) pair succeeds as a
-- new row, sitting alongside the historical revoked one -- no upsert logic
-- needed in the app, the existing INSERT call sites are untouched.
ALTER TABLE public.instructor_assignments
  DROP CONSTRAINT IF EXISTS instructor_assignments_instructor_user_id_section_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS instructor_assignments_active_unique
  ON public.instructor_assignments (instructor_user_id, section_id)
  WHERE revoked_at IS NULL;

-- Access control: a revoked assignment must stop granting section access
-- immediately. This is the actual security gate every instructor RLS check
-- runs through -- without this filter, "revoking" someone would do nothing
-- except cosmetically hide the row while leaving their access intact.
CREATE OR REPLACE FUNCTION public.is_assigned_to_section(_section_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.instructor_assignments ia
    WHERE ia.instructor_user_id = auth.uid()
      AND ia.section_id = _section_id
      AND ia.revoked_at IS NULL
      AND public.is_whitelist_approved(auth.uid())
  );
$$;

-- Instructor-list "assignments_count" should reflect current load, not
-- lifetime history.
DROP FUNCTION IF EXISTS public.admin_list_instructors();
CREATE OR REPLACE FUNCTION public.admin_list_instructors()
RETURNS TABLE(
  email text,
  user_id uuid,
  full_name text,
  whitelist_status whitelist_status,
  created_at timestamp with time zone,
  assignments_count integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT ON (lower(w.email))
    w.email,
    u.id AS user_id,
    p.full_name,
    w.status AS whitelist_status,
    w.created_at,
    COALESCE((
      SELECT count(*)::int FROM public.instructor_assignments ia
      WHERE ia.instructor_user_id = u.id AND ia.revoked_at IS NULL
    ), 0) AS assignments_count
  FROM public.whitelist w
  LEFT JOIN auth.users u ON lower(u.email) = lower(w.email)
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE w.role = 'instructor'
    AND public.has_role(auth.uid(), 'admin')
  ORDER BY lower(w.email), w.created_at DESC;
$$;

-- Extend the existing per-assignment audit trigger to fire on the revoke/
-- revive UPDATE transition too, not just INSERT/DELETE -- otherwise
-- converting DELETE to UPDATE would silently stop logging revokes at all.
-- Only fires when revoked_at actually changes (not on unrelated updates).
CREATE OR REPLACE FUNCTION public.audit_instructor_assignments()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  act text; tgt uuid; det jsonb;
  sec_name text; sec_grade int; sch_name text; ie text;
  sid uuid; iuid uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    act := 'instructor_assigned'; tgt := NEW.id; sid := NEW.section_id; iuid := NEW.instructor_user_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.revoked_at IS NOT DISTINCT FROM OLD.revoked_at THEN
      RETURN NEW;
    END IF;
    act := CASE WHEN NEW.revoked_at IS NOT NULL THEN 'instructor_unassigned' ELSE 'instructor_assigned' END;
    tgt := NEW.id; sid := NEW.section_id; iuid := NEW.instructor_user_id;
  ELSE
    act := 'instructor_unassigned'; tgt := OLD.id; sid := OLD.section_id; iuid := OLD.instructor_user_id;
  END IF;
  SELECT s.section_name, s.grade, sc.name INTO sec_name, sec_grade, sch_name
    FROM public.sections s LEFT JOIN public.schools sc ON sc.id = s.school_id
    WHERE s.id = sid;
  SELECT email INTO ie FROM auth.users WHERE id = iuid;
  det := jsonb_build_object('instructor_email', ie, 'section_id', sid,
    'section_name', sec_name, 'grade', sec_grade, 'school_name', sch_name);
  INSERT INTO public.audit_log(actor_user_id, action_type, target_type, target_id, details)
  VALUES (auth.uid(), act, 'instructor_assignment', tgt::text, det);
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS audit_instructor_assignments_trg ON public.instructor_assignments;
CREATE TRIGGER audit_instructor_assignments_trg
AFTER INSERT OR UPDATE OR DELETE ON public.instructor_assignments
FOR EACH ROW EXECUTE FUNCTION public.audit_instructor_assignments();

-- The two blanket-revoke call sites: DELETE -> soft-deactivate.
CREATE OR REPLACE FUNCTION public.sync_whitelist_to_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT id INTO uid FROM auth.users WHERE lower(email) = lower(OLD.email) LIMIT 1;
    IF uid IS NOT NULL THEN
      DELETE FROM public.user_roles WHERE user_id = uid AND role = OLD.role;
      IF OLD.role = 'instructor' THEN
        UPDATE public.instructor_assignments
          SET revoked_at = now()
          WHERE instructor_user_id = uid AND revoked_at IS NULL;
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  SELECT id INTO uid FROM auth.users WHERE lower(email) = lower(NEW.email) LIMIT 1;
  IF uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' THEN
    INSERT INTO public.user_roles (user_id, role, school_id)
    VALUES (uid, NEW.role, CASE WHEN NEW.role = 'instructor' THEN NULL ELSE NEW.assigned_school_id END)
    ON CONFLICT (user_id, role) DO UPDATE SET school_id = EXCLUDED.school_id;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = uid AND role = NEW.role;
    IF NEW.role = 'instructor' THEN
      UPDATE public.instructor_assignments
        SET revoked_at = now()
        WHERE instructor_user_id = uid AND revoked_at IS NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_instructor_status(_email text, _status whitelist_status)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change instructor status';
  END IF;

  UPDATE public.whitelist
    SET status = _status
    WHERE lower(email) = lower(_email) AND role = 'instructor';

  SELECT id INTO uid FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF uid IS NOT NULL THEN
    IF _status = 'approved' THEN
      INSERT INTO public.user_roles(user_id, role)
        VALUES (uid, 'instructor')
        ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
      DELETE FROM public.user_roles WHERE user_id = uid AND role = 'instructor';
      UPDATE public.instructor_assignments
        SET revoked_at = now()
        WHERE instructor_user_id = uid AND revoked_at IS NULL;
    END IF;
  END IF;
END;
$function$;
