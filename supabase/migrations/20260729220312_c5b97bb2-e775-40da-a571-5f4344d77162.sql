-- SECURITY FIX: user_roles had no protection against a regular (non-super)
-- admin directly granting themselves or anyone else the 'admin' or 'cms'
-- role via a raw INSERT/UPDATE — the RLS policy only required the caller to
-- already have ANY 'admin' role, with no check on which role was being
-- granted. The equivalent protection already existed on `whitelist`
-- (enforce_super_admin_rules), but user_roles is the table RLS actually
-- reads for has_role(), so that protection could be bypassed entirely by
-- writing directly to user_roles instead of going through whitelist.
--
-- pg_trigger_depth() > 1 lets the trusted internal sync paths (handle_new_user
-- on auth.users, sync_whitelist_to_user_roles on whitelist) keep working —
-- those always run nested inside another trigger already, so this only gates
-- direct, top-level writes coming straight from a client request.
CREATE OR REPLACE FUNCTION public.enforce_user_roles_privilege_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF OLD.role IN ('admin'::public.app_role, 'cms'::public.app_role) AND NOT public.is_current_user_super_admin() THEN
      RAISE EXCEPTION 'Only the Super Admin can remove an Admin or CMS role assignment';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF (OLD.role IN ('admin'::public.app_role, 'cms'::public.app_role)
        OR NEW.role IN ('admin'::public.app_role, 'cms'::public.app_role))
       AND NOT public.is_current_user_super_admin() THEN
      RAISE EXCEPTION 'Only the Super Admin can modify an Admin or CMS role assignment';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role IN ('admin'::public.app_role, 'cms'::public.app_role) AND NOT public.is_current_user_super_admin() THEN
      RAISE EXCEPTION 'Only the Super Admin can grant an Admin or CMS role';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS enforce_user_roles_privilege_rules_trg ON public.user_roles;
CREATE TRIGGER enforce_user_roles_privilege_rules_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.enforce_user_roles_privilege_rules();
