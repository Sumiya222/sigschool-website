
-- Auto-create initial enrollment_history row when a student is added,
-- and backfill any existing students that don't have an open enrollment.

CREATE OR REPLACE FUNCTION public.students_seed_enrollment_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school uuid;
  v_grade  int;
BEGIN
  SELECT school_id, grade INTO v_school, v_grade
    FROM public.sections WHERE id = NEW.section_id;

  IF v_school IS NULL THEN
    RETURN NEW;
  END IF;

  -- Avoid duplicates if an open row already exists for this student+section
  IF EXISTS (
    SELECT 1 FROM public.enrollment_history
     WHERE student_id = NEW.id
       AND section_id = NEW.section_id
       AND end_date IS NULL
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.enrollment_history
    (student_id, school_id, section_id, grade, academic_year, start_date, end_date)
  VALUES
    (NEW.id, v_school, NEW.section_id, v_grade,
     public.compute_academic_year(now()::date), now()::date, NULL);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_students_seed_enrollment_history ON public.students;
CREATE TRIGGER trg_students_seed_enrollment_history
AFTER INSERT ON public.students
FOR EACH ROW EXECUTE FUNCTION public.students_seed_enrollment_history();

-- Backfill: for every active student without an open enrollment row, create one
INSERT INTO public.enrollment_history
  (student_id, school_id, section_id, grade, academic_year, start_date, end_date)
SELECT st.id, s.school_id, st.section_id, s.grade,
       public.compute_academic_year(now()::date), now()::date, NULL
  FROM public.students st
  JOIN public.sections s ON s.id = st.section_id
 WHERE NOT EXISTS (
   SELECT 1 FROM public.enrollment_history eh
    WHERE eh.student_id = st.id AND eh.end_date IS NULL
 );
