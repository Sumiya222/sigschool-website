-- Audit trail for user_roles — mirrors the audit_whitelist() pattern, but
-- for the table RLS actually reads permissions from. Closes the blind spot
-- found during the privilege-escalation review: whitelist changes were
-- logged, but a direct write to user_roles (the exact vector the escalation
-- bug used) left no trail at all.
--
-- Where auth.uid() is null (service-role or SQL-editor access carries no JWT
-- claims), the actor is recorded explicitly as "direct database access"
-- rather than left null and ambiguous.
CREATE OR REPLACE FUNCTION public.audit_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  act text;
  tgt uuid;
  det jsonb;
  target_email text;
  actor_email text;
  actor_label text;
BEGIN
  SELECT email INTO target_email FROM auth.users WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  IF auth.uid() IS NOT NULL THEN
    SELECT email INTO actor_email FROM auth.users WHERE id = auth.uid();
    actor_label := COALESCE(actor_email, auth.uid()::text);
  ELSE
    actor_label := 'direct database access (service-role or SQL editor — no authenticated actor)';
  END IF;

  IF TG_OP = 'INSERT' THEN
    act := 'user_role_granted';
    tgt := NEW.user_id;
    det := jsonb_build_object(
      'target_user_id', NEW.user_id,
      'target_email', target_email,
      'role', NEW.role,
      'school_id', NEW.school_id,
      'actor', actor_label
    );
  ELSIF TG_OP = 'UPDATE' THEN
    act := 'user_role_updated';
    tgt := NEW.user_id;
    det := jsonb_build_object(
      'target_user_id', NEW.user_id,
      'target_email', target_email,
      'role_before', OLD.role,
      'role_after', NEW.role,
      'school_id_before', OLD.school_id,
      'school_id_after', NEW.school_id,
      'actor', actor_label
    );
  ELSIF TG_OP = 'DELETE' THEN
    act := 'user_role_revoked';
    tgt := OLD.user_id;
    det := jsonb_build_object(
      'target_user_id', OLD.user_id,
      'target_email', target_email,
      'role', OLD.role,
      'school_id', OLD.school_id,
      'actor', actor_label
    );
  END IF;

  INSERT INTO public.audit_log(actor_user_id, action_type, target_type, target_id, details)
  VALUES (auth.uid(), act, 'user_role', tgt::text, det);

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$function$;

DROP TRIGGER IF EXISTS audit_user_roles_trg ON public.user_roles;
CREATE TRIGGER audit_user_roles_trg
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles();
