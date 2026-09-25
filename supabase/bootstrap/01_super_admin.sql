-- ---------------------------------------------------------------------------
-- BOOTSTRAP 1 of 2 — Super Admin
--
-- Run this ONCE against a fresh database, AFTER all migrations have been
-- applied and BEFORE anyone tries to sign in. Without it, nobody can log in:
-- sign-up is whitelist-gated, and only a Super Admin may whitelist other
-- Admin/CMS accounts.
--
-- HOW TO RUN: paste into the SQL editor of the new backend and execute.
-- Change the email on the next line first.
-- ---------------------------------------------------------------------------



DO $$
DECLARE
  -- >>> CHANGE THIS to the owner's Google account email <<<
  v_email text := 'shameerzeeshan@gmail.com';
BEGIN
  -- The whitelist guard trigger refuses to grant Super Admin status from the
  -- dashboard on purpose. Bootstrapping happens below that guard.
  ALTER TABLE public.whitelist DISABLE TRIGGER USER;

  INSERT INTO public.whitelist (email, role, status, is_super_admin)
  VALUES (lower(v_email), 'admin', 'approved', true)
  ON CONFLICT DO NOTHING;

  UPDATE public.whitelist
     SET role = 'admin', status = 'approved', is_super_admin = true
   WHERE lower(email) = lower(v_email);

  ALTER TABLE public.whitelist ENABLE TRIGGER USER;

  -- If the account has already signed in once, give it its role row too.
  INSERT INTO public.user_roles (user_id, role)
  SELECT u.id, 'admin'::public.app_role
    FROM auth.users u
   WHERE lower(u.email) = lower(v_email)
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;

-- Verify: expect exactly one row, is_super_admin = true, status = approved.
SELECT email, role, status, is_super_admin FROM public.whitelist WHERE is_super_admin;
