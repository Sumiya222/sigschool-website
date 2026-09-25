UPDATE public.whitelist SET status='approved' WHERE lower(email)='instructor.alpha@astrobot.demo';
UPDATE public.schools SET is_active=true WHERE id='22222222-0000-0000-0000-000000000001';

DO $$
DECLARE
  v_instructor_id uuid;
BEGIN
  SELECT id INTO v_instructor_id FROM auth.users WHERE lower(email) = 'instructor.alpha@astrobot.demo' OR id = '52137dd0-896d-4a64-958c-9dbb03959588' LIMIT 1;
  IF v_instructor_id IS NOT NULL THEN
    INSERT INTO public.instructor_assignments (instructor_user_id, section_id)
    VALUES
      (v_instructor_id,'33333333-0000-0000-0000-000000000101'),
      (v_instructor_id,'33333333-0000-0000-0000-000000000102'),
      (v_instructor_id,'33333333-0000-0000-0000-000000000203')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;