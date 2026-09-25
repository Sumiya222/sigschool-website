
-- Seed for document generation audit re-run.
-- 1) Assign instructor.alpha to 22 TEST_ sections that have sessions.
DO $$
DECLARE
  v_instructor uuid;
  v_admin uuid;
BEGIN
  SELECT id INTO v_instructor FROM auth.users WHERE lower(email) = 'instructor.alpha@astrobot.demo' OR id = '52137dd0-896d-4a64-958c-9dbb03959588' LIMIT 1;
  SELECT id INTO v_admin FROM auth.users LIMIT 1;

  IF v_instructor IS NOT NULL THEN
    INSERT INTO public.instructor_assignments (instructor_user_id, section_id, assigned_by)
    SELECT v_instructor, x.section_id::uuid, v_admin
    FROM (VALUES
     ('00cd7bf8-106b-4059-bf59-a52aa1dc8364'),('011fed1c-da8e-4354-b79b-8459ff4bd763'),
     ('0151de77-ef74-4daf-86ed-4a96c5f733a3'),('01546576-99cf-4104-b0db-ec2d7c532739'),
     ('017efd09-a3fa-44be-8002-764c248b6f5e'),('058d8785-a698-4929-a52e-1df26344c841'),
     ('05afe7d4-f8f8-4122-a179-24436689a5d2'),('066b6f5a-1d2a-44dd-9c08-029cbe2e5de8'),
     ('071ba8ac-2a9a-4f72-9608-611c9f4f1419'),('072737d8-c269-47b9-b4c8-182eb35f4d2f'),
     ('07316c6b-62b8-4a85-a311-8231b77c9218'),('07e05bc3-506a-409d-87e4-e9677b0109a0'),
     ('08265481-7c9f-496f-a20e-3970f9b85eac'),('0847cd53-e09e-4a7e-8f26-4f5a2f25c36f'),
     ('0936d5f6-9dfd-4af9-8e74-7ebf7d124759'),('0a60916e-226c-4aea-ba03-0e414cd3b3c7'),
     ('0b4da2be-dd58-4f03-920a-6ef1c201b663'),('0b59e0f6-57c3-46fa-a0a9-9946d017a4f4'),
     ('0b97d570-2670-41a5-b777-3de6ad3a45f2'),('0bb82fa1-6802-42a9-9661-913bae450e55'),
     ('0bf16cb7-5b95-445a-8830-089c11a22559'),('0bf5b1f2-0c4d-45db-aadf-3b9be22fc31c')
    ) AS x(section_id)
    WHERE EXISTS (SELECT 1 FROM public.sections s WHERE s.id = x.section_id::uuid)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 2) 1-student TEST section with a session for instructor.alpha
DO $$
DECLARE
  v_section uuid;
  v_session uuid;
  v_student uuid;
  v_term uuid := '11111111-0000-0000-0000-000000000002';
  v_school uuid;
  v_instructor uuid;
  v_admin uuid;
BEGIN
  SELECT id INTO v_school FROM public.schools LIMIT 1;
  IF v_school IS NULL THEN
    INSERT INTO public.schools (id, name, address)
    VALUES ('74baa63e-6d4e-4adc-8c8b-1667fd40b30a', 'Test Academy', '123 Demo St')
    ON CONFLICT (id) DO NOTHING;
    SELECT id INTO v_school FROM public.schools WHERE id = '74baa63e-6d4e-4adc-8c8b-1667fd40b30a';
  END IF;

  IF v_school IS NOT NULL THEN
    SELECT id INTO v_instructor FROM auth.users WHERE lower(email) = 'instructor.alpha@astrobot.demo' OR id = '52137dd0-896d-4a64-958c-9dbb03959588' LIMIT 1;
    SELECT id INTO v_admin FROM auth.users LIMIT 1;

    INSERT INTO public.sections (school_id, grade, section_name)
    VALUES (v_school, 9, 'TEST_EDGE_ONE') RETURNING id INTO v_section;

    INSERT INTO public.students (section_id, full_name, roll_number, is_active, created_by)
    VALUES (v_section, 'TEST_EDGE_ONE_Student', '001', true, v_admin)
    RETURNING id INTO v_student;

    IF v_instructor IS NOT NULL THEN
      INSERT INTO public.instructor_assignments (instructor_user_id, section_id, assigned_by)
      VALUES (v_instructor, v_section, v_admin);

      IF EXISTS (SELECT 1 FROM public.terms WHERE id = v_term) THEN
        INSERT INTO public.class_sessions (section_id, instructor_user_id, term_id, session_date, week_number)
        VALUES (v_section, v_instructor, v_term, CURRENT_DATE, 1)
        RETURNING id INTO v_session;

        INSERT INTO public.attendance (session_id, student_id, status)
        VALUES (v_session, v_student, 'present');
        INSERT INTO public.marks (session_id, student_id, score, max_score)
        VALUES (v_session, v_student, 8, 10);
      END IF;
    END IF;
  END IF;
END $$;

-- 3) Blank-marks student: new student in one of the assigned sections, no marks rows.
DO $$
DECLARE
  v_section uuid := '00cd7bf8-106b-4059-bf59-a52aa1dc8364';
  v_student uuid;
  v_sess RECORD;
  v_admin uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.sections WHERE id = v_section) THEN
    SELECT id INTO v_admin FROM auth.users LIMIT 1;

    INSERT INTO public.students (section_id, full_name, roll_number, is_active, created_by)
    VALUES (v_section, 'TEST_BLANK_MARKS_Student', '999', true, v_admin)
    RETURNING id INTO v_student;

    FOR v_sess IN SELECT id FROM public.class_sessions WHERE section_id=v_section LOOP
      INSERT INTO public.attendance (session_id, student_id, status)
      VALUES (v_sess.id, v_student, 'present')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;
END $$;
