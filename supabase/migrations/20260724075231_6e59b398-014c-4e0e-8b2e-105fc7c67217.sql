
-- Replace single-email uniqueness with (email, role) uniqueness so one email can hold multiple roles.
ALTER TABLE public.whitelist DROP CONSTRAINT IF EXISTS whitelist_email_key;
ALTER TABLE public.whitelist ADD CONSTRAINT whitelist_email_role_key UNIQUE (email, role);

-- Update signup trigger to grant every approved role for this email.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  wl RECORD;
  approved_count int := 0;
BEGIN
  FOR wl IN
    SELECT role, assigned_school_id, status
    FROM public.whitelist
    WHERE lower(email) = lower(NEW.email)
      AND status = 'approved'
  LOOP
    approved_count := approved_count + 1;
    INSERT INTO public.user_roles (user_id, role, school_id)
    VALUES (NEW.id, wl.role, wl.assigned_school_id)
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;

  IF approved_count = 0 THEN
    RAISE EXCEPTION 'This email has not been approved for dashboard access. Contact your administrator.';
  END IF;

  RETURN NEW;
END;
$function$;

-- Update check_whitelist to prefer an approved row when multiple exist.
CREATE OR REPLACE FUNCTION public.check_whitelist(_email text)
RETURNS TABLE(approved boolean, role app_role)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    (w.status = 'approved') AS approved,
    w.role
  FROM public.whitelist w
  WHERE lower(w.email) = lower(_email)
  ORDER BY (w.status = 'approved') DESC, w.created_at ASC
  LIMIT 1;
$function$;
