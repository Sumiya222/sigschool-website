-- Ensure the existing Super Admin whitelist row is correct.
UPDATE public.whitelist
SET
  status = 'approved',
  role = 'admin',
  is_super_admin = true,
  assigned_school_id = NULL
WHERE lower(email) = lower('shameerzeeshan@gmail.com');

-- If the whitelist row is somehow missing, create it once.
INSERT INTO public.whitelist (email, role, status, is_super_admin, assigned_school_id)
SELECT 'shameerzeeshan@gmail.com', 'admin'::public.app_role, 'approved'::public.whitelist_status, true, NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.whitelist WHERE lower(email) = lower('shameerzeeshan@gmail.com') AND role = 'admin'::public.app_role
);

-- Backfill the authenticated user's admin role row when the account already exists.
INSERT INTO public.user_roles (user_id, role, school_id)
SELECT u.id, 'admin'::public.app_role, NULL
FROM auth.users u
WHERE lower(u.email) = lower('shameerzeeshan@gmail.com')
  AND NOT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = u.id
      AND ur.role = 'admin'::public.app_role
  );

-- Make Super Admin count as Admin for all backend role checks.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
  OR (
    _role = 'admin'::public.app_role
    AND EXISTS (
      SELECT 1
      FROM auth.users u
      JOIN public.whitelist w ON lower(w.email) = lower(u.email)
      WHERE u.id = _user_id
        AND w.role = 'admin'::public.app_role
        AND w.status = 'approved'::public.whitelist_status
        AND w.is_super_admin = true
    )
  );
$function$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Reuse the canonical role check for the dashboard login RPC.
CREATE OR REPLACE FUNCTION public.verify_dashboard_access(_selected public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.has_role(auth.uid(), _selected);
$function$;

GRANT EXECUTE ON FUNCTION public.verify_dashboard_access(public.app_role) TO authenticated;