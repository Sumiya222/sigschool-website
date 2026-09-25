
-- 1. is_active on schools
ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2. audit_log table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read audit log" ON public.audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
-- No INSERT/UPDATE/DELETE policies -> immutable from Data API. Trigger inserts run as table owner.

CREATE INDEX audit_log_created_at_idx ON public.audit_log(created_at DESC);
CREATE INDEX audit_log_action_type_idx ON public.audit_log(action_type);

-- 3. Trigger: prevent revoking/deleting last active admin
CREATE OR REPLACE FUNCTION public.protect_last_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  losing_admin boolean := false;
  remaining int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    losing_admin := (OLD.role = 'admin' AND OLD.status = 'approved');
  ELSIF TG_OP = 'UPDATE' THEN
    losing_admin := (OLD.role = 'admin' AND OLD.status = 'approved' AND NEW.status <> 'approved');
  END IF;

  IF losing_admin THEN
    SELECT count(*) INTO remaining FROM public.whitelist
      WHERE role='admin' AND status='approved' AND id <> OLD.id;
    IF remaining = 0 THEN
      RAISE EXCEPTION 'You cannot revoke the last active admin account — approve another admin first';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
CREATE TRIGGER whitelist_protect_last_admin
BEFORE UPDATE OR DELETE ON public.whitelist
FOR EACH ROW EXECUTE FUNCTION public.protect_last_admin();

-- 4. Whitelist audit trigger
CREATE OR REPLACE FUNCTION public.audit_whitelist()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  act text; tgt uuid; det jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    act := 'whitelist_added'; tgt := NEW.id;
    det := jsonb_build_object('email', NEW.email, 'role', NEW.role, 'status', NEW.status);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'revoked' THEN act := 'whitelist_revoked';
      ELSIF NEW.status = 'approved' AND OLD.status = 'revoked' THEN act := 'whitelist_reapproved';
      ELSIF NEW.status = 'approved' THEN act := 'whitelist_approved';
      ELSE act := 'whitelist_status_changed';
      END IF;
      tgt := NEW.id;
      det := jsonb_build_object('email', NEW.email, 'role', NEW.role, 'from', OLD.status, 'to', NEW.status);
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    act := 'whitelist_deleted'; tgt := OLD.id;
    det := jsonb_build_object('email', OLD.email, 'role', OLD.role);
  END IF;
  INSERT INTO public.audit_log(actor_user_id, action_type, target_type, target_id, details)
  VALUES (auth.uid(), act, 'whitelist', tgt::text, det);
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
CREATE TRIGGER audit_whitelist_trg
AFTER INSERT OR UPDATE OR DELETE ON public.whitelist
FOR EACH ROW EXECUTE FUNCTION public.audit_whitelist();

-- 5. Schools audit trigger
CREATE OR REPLACE FUNCTION public.audit_schools()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  act text; tgt uuid; det jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    act := 'school_created'; tgt := NEW.id;
    det := jsonb_build_object('name', NEW.name);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      act := CASE WHEN NEW.is_active THEN 'school_activated' ELSE 'school_deactivated' END;
      det := jsonb_build_object('name', NEW.name);
    ELSIF (OLD.name, COALESCE(OLD.address,'')) IS DISTINCT FROM (NEW.name, COALESCE(NEW.address,'')) THEN
      act := 'school_edited';
      det := jsonb_build_object('name', NEW.name, 'old_name', OLD.name, 'old_address', OLD.address, 'new_address', NEW.address);
    ELSE
      RETURN NEW;
    END IF;
    tgt := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    act := 'school_deleted'; tgt := OLD.id;
    det := jsonb_build_object('name', OLD.name);
  END IF;
  INSERT INTO public.audit_log(actor_user_id, action_type, target_type, target_id, details)
  VALUES (auth.uid(), act, 'school', tgt::text, det);
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
CREATE TRIGGER audit_schools_trg
AFTER INSERT OR UPDATE OR DELETE ON public.schools
FOR EACH ROW EXECUTE FUNCTION public.audit_schools();

-- 6. Terms audit trigger
CREATE OR REPLACE FUNCTION public.audit_terms()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  act text; tgt uuid; det jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    act := 'term_created'; tgt := NEW.id;
    det := jsonb_build_object('name', NEW.name, 'start_date', NEW.start_date, 'end_date', NEW.end_date);
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active IS DISTINCT FROM NEW.is_active AND NEW.is_active = true THEN
      act := 'term_activated'; tgt := NEW.id;
      det := jsonb_build_object('name', NEW.name);
    ELSE
      RETURN NEW;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    act := 'term_deleted'; tgt := OLD.id;
    det := jsonb_build_object('name', OLD.name);
  END IF;
  INSERT INTO public.audit_log(actor_user_id, action_type, target_type, target_id, details)
  VALUES (auth.uid(), act, 'term', tgt::text, det);
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
CREATE TRIGGER audit_terms_trg
AFTER INSERT OR UPDATE OR DELETE ON public.terms
FOR EACH ROW EXECUTE FUNCTION public.audit_terms();

-- 7. Instructor assignments audit trigger
CREATE OR REPLACE FUNCTION public.audit_instructor_assignments()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  act text; tgt uuid; det jsonb;
  sec_name text; sec_grade int; sch_name text; ie text;
  sid uuid; iuid uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    act := 'instructor_assigned'; tgt := NEW.id; sid := NEW.section_id; iuid := NEW.instructor_user_id;
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
CREATE TRIGGER audit_instructor_assignments_trg
AFTER INSERT OR DELETE ON public.instructor_assignments
FOR EACH ROW EXECUTE FUNCTION public.audit_instructor_assignments();

-- 8. Admin RPC for audit log listing
CREATE OR REPLACE FUNCTION public.admin_list_audit_log(_action_type text, _from timestamptz, _to timestamptz, _limit int)
RETURNS TABLE(id uuid, actor_user_id uuid, actor_email text, action_type text, target_type text, target_id text, details jsonb, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.id, l.actor_user_id, u.email::text AS actor_email, l.action_type, l.target_type, l.target_id, l.details, l.created_at
  FROM public.audit_log l
  LEFT JOIN auth.users u ON u.id = l.actor_user_id
  WHERE public.has_role(auth.uid(), 'admin')
    AND (_action_type IS NULL OR l.action_type = _action_type)
    AND (_from IS NULL OR l.created_at >= _from)
    AND (_to IS NULL OR l.created_at <= _to)
  ORDER BY l.created_at DESC
  LIMIT COALESCE(_limit, 500);
$$;
