ALTER TABLE public.whitelist DISABLE TRIGGER USER;
UPDATE public.whitelist SET is_super_admin = true, status = 'approved', role = 'admin' WHERE lower(email) = 'shameerzeeshan@gmail.com';
ALTER TABLE public.whitelist ENABLE TRIGGER USER;