
DO $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM public.whitelist WHERE lower(email) = 'shameerzeeshan@gmail.com' LIMIT 1;

  ALTER TABLE public.whitelist DISABLE TRIGGER USER;

  IF v_id IS NULL THEN
    INSERT INTO public.whitelist (email, role, status, is_super_admin)
    VALUES ('shameerzeeshan@gmail.com', 'admin', 'approved', true);
  ELSE
    UPDATE public.whitelist
      SET role = 'admin',
          status = 'approved',
          is_super_admin = true
      WHERE id = v_id;
  END IF;

  ALTER TABLE public.whitelist ENABLE TRIGGER USER;
END $$;
