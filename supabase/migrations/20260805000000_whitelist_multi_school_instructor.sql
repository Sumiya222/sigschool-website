-- Fixes: an instructor could never be whitelisted for a second school.
-- whitelist_email_role_key was UNIQUE (lower(email), role) -- but each row
-- also carries a single assigned_school_id, so whitelisting the same
-- instructor email for a second school hit this same index and failed
-- outright, with no clear error shown (dashboard.admin.whitelist.tsx
-- supplies a generic fallback message for every insert failure).
--
-- Actual student/section access was never affected by this bug -- that's
-- gated entirely by instructor_assignments + is_assigned_to_section(),
-- a separate table that already correctly supports one instructor across
-- unlimited sections and schools. This was a setup blocker, not a data
-- exposure risk.
--
-- COALESCE'd to a sentinel UUID rather than left as plain NULL, since
-- Postgres unique indexes treat NULL <> NULL -- without this, two admin/cms
-- whitelist rows (which always have assigned_school_id = NULL) for the same
-- email could both be inserted, silently reintroducing duplicates for those
-- roles instead.
DROP INDEX IF EXISTS public.whitelist_email_role_key;
CREATE UNIQUE INDEX whitelist_email_role_school_key
ON public.whitelist (
  lower(email),
  role,
  COALESCE(assigned_school_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- admin_list_instructors() selected one row per whitelist row, not per
-- instructor -- with two whitelist rows now possible for the same email
-- (one per school), it would return the same instructor twice, breaking
-- the `key={r.email}` list rendering and the `.find(email)` lookup on the
-- detail page. None of the columns this returns are actually per-school
-- (full_name/status/created_at/assignments_count all describe the person,
-- not the whitelist row), so collapsing to one row per email is correct,
-- not a data loss -- DISTINCT ON picks each person's most-recently-created
-- whitelist row for the status/created_at shown.
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
    COALESCE((SELECT count(*)::int FROM public.instructor_assignments ia WHERE ia.instructor_user_id = u.id), 0) AS assignments_count
  FROM public.whitelist w
  LEFT JOIN auth.users u ON lower(u.email) = lower(w.email)
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE w.role = 'instructor'
    AND public.has_role(auth.uid(), 'admin')
  ORDER BY lower(w.email), w.created_at DESC;
$$;

-- Both of these insert whitelist.assigned_school_id straight into
-- user_roles.school_id. That column is only ever read by
-- current_user_school_id(), which filters WHERE role = 'school' -- it's
-- never consulted for role = 'instructor' (confirmed by grep across every
-- migration). With two instructor whitelist rows now possible, storing
-- either one's school_id here would be an arbitrary, misleading value for
-- a column nothing reads for this role -- store NULL instead, since
-- instructor_assignments is the real, correctly per-school source of truth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  wl RECORD;
BEGIN
  FOR wl IN
    SELECT role, assigned_school_id, status
    FROM public.whitelist
    WHERE lower(email) = lower(NEW.email)
      AND status = 'approved'
  LOOP
    INSERT INTO public.user_roles (user_id, role, school_id)
    VALUES (NEW.id, wl.role, CASE WHEN wl.role = 'instructor' THEN NULL ELSE wl.assigned_school_id END)
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$function$;

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
        DELETE FROM public.instructor_assignments WHERE instructor_user_id = uid;
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
      DELETE FROM public.instructor_assignments WHERE instructor_user_id = uid;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
