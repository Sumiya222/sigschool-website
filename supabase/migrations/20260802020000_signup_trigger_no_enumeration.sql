-- Closes a whitelist-enumeration hole: this trigger previously raised an
-- exception ("This email has not been approved for dashboard access...")
-- for a non-whitelisted signup, which Postgres/GoTrue surfaces as a
-- distinctly-shaped response (HTTP 500, {"code":"P0001","message":"..."})
-- that a whitelisted signup never produces (200, real user object). Calling
-- /auth/v1/signup directly with the public anon key — no app code involved
-- — let anyone tell whitelisted emails from non-whitelisted ones purely from
-- that shape/status-code difference, regardless of the exception's wording.
--
-- There is no way to keep rejecting the signup (which requires some
-- differentiating signal) while also making the response indistinguishable.
-- So this trigger no longer rejects at all: it grants a role for every
-- approved whitelist match exactly as before, and now simply grants none
-- for a non-whitelisted email rather than raising. Both cases return the
-- identical 200/created-user shape from GoTrue. A non-whitelisted signup
-- therefore creates a real but role-less auth.users row — harmless, since
-- every RLS policy and the app's own login flow (check_whitelist +
-- verify_dashboard_access in dashboard.login.tsx) gate on has_role()/the
-- whitelist table, not on account existence, so this person can still never
-- reach any dashboard data or feature.
--
-- The app's OWN signup form is unaffected: it already pre-checks
-- check_whitelist() before ever calling signUp() and shows the friendly
-- "hasn't been approved" message itself — this trigger is only what a
-- direct API caller bypassing that pre-check now hits, and it stays silent.
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
    VALUES (NEW.id, wl.role, wl.assigned_school_id)
    ON CONFLICT (user_id, role) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$function$;
