-- 1. Table
CREATE TABLE public.enrollment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  grade integer NOT NULL CHECK (grade >= 1 AND grade <= 12),
  academic_year text NOT NULL,
  start_date date NOT NULL DEFAULT (now()::date),
  end_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX enrollment_history_student_idx ON public.enrollment_history(student_id, start_date DESC);
CREATE INDEX enrollment_history_section_idx ON public.enrollment_history(section_id);
CREATE UNIQUE INDEX enrollment_history_one_active_per_student
  ON public.enrollment_history(student_id) WHERE end_date IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollment_history TO authenticated;
GRANT ALL ON public.enrollment_history TO service_role;

ALTER TABLE public.enrollment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrollment_history admin all"
  ON public.enrollment_history FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "enrollment_history school read own"
  ON public.enrollment_history FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'school')
    AND school_id = public.current_user_school_id()
  );

CREATE POLICY "enrollment_history instructor read assigned"
  ON public.enrollment_history FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'instructor')
    AND public.is_assigned_to_section(section_id)
  );

-- 2. Helper: current academic year (Aug–Jul rollover)
CREATE OR REPLACE FUNCTION public.compute_academic_year(_d date DEFAULT now()::date)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN extract(month FROM _d) >= 8
      THEN extract(year FROM _d)::int || '-' || (extract(year FROM _d)::int + 1)
    ELSE (extract(year FROM _d)::int - 1) || '-' || extract(year FROM _d)::int
  END;
$$;

-- 3. Backfill: one current enrollment row per active student
INSERT INTO public.enrollment_history (student_id, school_id, section_id, grade, academic_year, start_date, end_date)
SELECT st.id, sec.school_id, st.section_id, sec.grade, public.compute_academic_year(), st.created_at::date, NULL
FROM public.students st
JOIN public.sections sec ON sec.id = st.section_id
WHERE st.is_active = true
ON CONFLICT DO NOTHING;

-- 4. Promotion function
CREATE OR REPLACE FUNCTION public.promote_students(
  _student_ids uuid[],
  _target_section_id uuid,
  _academic_year text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_school uuid;
  target_grade int;
  target_section_name text;
  source_summary jsonb;
  moved int := 0;
  today date := now()::date;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can promote students';
  END IF;
  IF _student_ids IS NULL OR array_length(_student_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'No students selected';
  END IF;
  IF _academic_year IS NULL OR length(trim(_academic_year)) = 0 THEN
    RAISE EXCEPTION 'Academic year is required';
  END IF;

  SELECT s.school_id, s.grade, s.section_name
    INTO target_school, target_grade, target_section_name
  FROM public.sections s WHERE s.id = _target_section_id;

  IF target_school IS NULL THEN
    RAISE EXCEPTION 'Target section not found';
  END IF;

  -- Snapshot origin sections (for audit summary) before mutation
  SELECT jsonb_agg(DISTINCT jsonb_build_object(
    'section_id', sec.id,
    'grade', sec.grade,
    'section_name', sec.section_name,
    'school_name', sch.name
  ))
  INTO source_summary
  FROM public.students st
  JOIN public.sections sec ON sec.id = st.section_id
  JOIN public.schools sch ON sch.id = sec.school_id
  WHERE st.id = ANY(_student_ids);

  -- Close current active enrollment rows for these students
  UPDATE public.enrollment_history
    SET end_date = today
    WHERE student_id = ANY(_student_ids) AND end_date IS NULL;

  -- Move students
  UPDATE public.students
    SET section_id = _target_section_id
    WHERE id = ANY(_student_ids);
  GET DIAGNOSTICS moved = ROW_COUNT;

  -- Open new enrollment rows
  INSERT INTO public.enrollment_history (student_id, school_id, section_id, grade, academic_year, start_date, end_date)
  SELECT id, target_school, _target_section_id, target_grade, _academic_year, today, NULL
  FROM public.students WHERE id = ANY(_student_ids);

  -- Single audit summary
  INSERT INTO public.audit_log (actor_user_id, action_type, target_type, target_id, details)
  VALUES (
    auth.uid(),
    'students_promoted',
    'section',
    _target_section_id::text,
    jsonb_build_object(
      'promoted_count', moved,
      'target_section_id', _target_section_id,
      'target_grade', target_grade,
      'target_section_name', target_section_name,
      'academic_year', _academic_year,
      'sources', source_summary
    )
  );

  RETURN moved;
END;
$$;

-- 5. Allow up to grade 12 on new sections (raise ceiling for higher grades that promotion could target)
ALTER TABLE public.sections DROP CONSTRAINT IF EXISTS sections_grade_check;
ALTER TABLE public.sections ADD CONSTRAINT sections_grade_check CHECK (grade >= 1 AND grade <= 12);