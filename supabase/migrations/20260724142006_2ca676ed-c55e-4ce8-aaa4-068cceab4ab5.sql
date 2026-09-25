ALTER TABLE public.whitelist DISABLE TRIGGER USER;
INSERT INTO public.whitelist (email, role, status, is_super_admin)
VALUES ('shameerzeeshan@gmail.com', 'admin', 'approved', false)
ON CONFLICT DO NOTHING;
ALTER TABLE public.whitelist ENABLE TRIGGER USER;