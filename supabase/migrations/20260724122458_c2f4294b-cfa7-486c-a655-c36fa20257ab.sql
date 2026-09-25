ALTER TABLE public.whitelist DISABLE TRIGGER USER;
INSERT INTO public.whitelist (email, role, status, is_super_admin)
VALUES ('shameerzeeshan@gmail.com', 'admin', 'approved', true)
ON CONFLICT DO NOTHING;
ALTER TABLE public.whitelist ENABLE TRIGGER USER;

-- Sync to user_roles if the auth user already exists
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role FROM auth.users u
WHERE lower(u.email) = 'shameerzeeshan@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;