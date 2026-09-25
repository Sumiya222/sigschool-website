
-- ============================================================
-- 1) PAYMENT RECORDING — record_payment(_invoice_id, _amount, _paid_at, _notes)
--    Locks the invoice row (FOR UPDATE) before re-computing SUM(payments),
--    so two concurrent inserts on the same invoice cannot both pass the
--    overpayment check. Existing trigger stays as defense-in-depth.
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_payment(
  _invoice_id uuid,
  _amount numeric,
  _paid_at date,
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total numeric(12,2);
  v_existing numeric(12,2);
  v_remaining numeric(12,2);
  v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can record payments';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;

  -- Serialize concurrent payments for this invoice.
  SELECT total_amount INTO v_total
    FROM public.invoices
    WHERE id = _invoice_id
    FOR UPDATE;
  IF v_total IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_existing
    FROM public.payments
    WHERE invoice_id = _invoice_id;

  v_remaining := v_total - v_existing;
  IF _amount > v_remaining THEN
    RAISE EXCEPTION 'Payment amount exceeds the remaining balance of PKR %',
      to_char(v_remaining, 'FM999999990.00');
  END IF;

  INSERT INTO public.payments (invoice_id, amount, paid_at, notes, recorded_by)
    VALUES (_invoice_id, _amount, _paid_at, _notes, auth.uid())
    RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_payment(uuid, numeric, date, text) TO authenticated;

-- ============================================================
-- 2) SESSION SAVE — optimistic concurrency + atomic transaction
--    Add class_sessions.data_updated_at, bump it whenever any child row
--    (attendance/marks/remarks) changes, and expose save_session RPC.
-- ============================================================
ALTER TABLE public.class_sessions
  ADD COLUMN IF NOT EXISTS data_updated_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.bump_session_data_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    sid := OLD.session_id;
  ELSE
    sid := NEW.session_id;
  END IF;
  UPDATE public.class_sessions
    SET data_updated_at = now()
    WHERE id = sid;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_bump_session_att ON public.attendance;
CREATE TRIGGER trg_bump_session_att
AFTER INSERT OR UPDATE OR DELETE ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.bump_session_data_updated_at();

DROP TRIGGER IF EXISTS trg_bump_session_marks ON public.marks;
CREATE TRIGGER trg_bump_session_marks
AFTER INSERT OR UPDATE OR DELETE ON public.marks
FOR EACH ROW EXECUTE FUNCTION public.bump_session_data_updated_at();

DROP TRIGGER IF EXISTS trg_bump_session_remarks ON public.remarks;
CREATE TRIGGER trg_bump_session_remarks
AFTER INSERT OR UPDATE OR DELETE ON public.remarks
FOR EACH ROW EXECUTE FUNCTION public.bump_session_data_updated_at();

-- save_session: atomic write of all three tables with optimistic-concurrency check.
-- _rows shape: [{student_id, attendance, score|null, max_score, remark|null}, ...]
CREATE OR REPLACE FUNCTION public.save_session(
  _session_id uuid,
  _rows jsonb,
  _loaded_at timestamptz
)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_section_id uuid;
  v_current_updated timestamptz;
  v_new_updated timestamptz;
  r jsonb;
  v_student_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF _session_id IS NULL OR _rows IS NULL THEN
    RAISE EXCEPTION 'session_id and rows are required';
  END IF;

  -- Lock the session row and read section_id + current data_updated_at.
  SELECT section_id, data_updated_at
    INTO v_section_id, v_current_updated
    FROM public.class_sessions
    WHERE id = _session_id
    FOR UPDATE;
  IF v_section_id IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Authorization: must be admin OR assigned instructor for this section.
  IF NOT (
    public.has_role(auth.uid(), 'admin')
    OR public.is_assigned_to_section(v_section_id)
  ) THEN
    RAISE EXCEPTION 'Not authorized to save this session';
  END IF;

  -- Optimistic concurrency: reject if someone else wrote after the editor loaded.
  IF _loaded_at IS NOT NULL AND v_current_updated > _loaded_at THEN
    RAISE EXCEPTION 'STALE_SESSION: This session was updated by someone else while you were editing. Please reload before saving again.';
  END IF;

  -- Apply each row: attendance + marks (upsert), remarks (upsert or delete when blank).
  FOR r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    v_student_ids := v_student_ids || (r->>'student_id')::uuid;

    INSERT INTO public.attendance (session_id, student_id, status, marked_by)
      VALUES (_session_id, (r->>'student_id')::uuid, (r->>'attendance')::attendance_status, auth.uid())
      ON CONFLICT (session_id, student_id)
      DO UPDATE SET status = EXCLUDED.status, marked_by = EXCLUDED.marked_by;

    INSERT INTO public.marks (session_id, student_id, score, max_score)
      VALUES (
        _session_id,
        (r->>'student_id')::uuid,
        NULLIF(r->>'score','')::numeric,
        (r->>'max_score')::numeric
      )
      ON CONFLICT (session_id, student_id)
      DO UPDATE SET score = EXCLUDED.score, max_score = EXCLUDED.max_score;

    IF COALESCE(btrim(r->>'remark'), '') = '' THEN
      DELETE FROM public.remarks
        WHERE session_id = _session_id AND student_id = (r->>'student_id')::uuid;
    ELSE
      INSERT INTO public.remarks (session_id, student_id, remark_text, created_by)
        VALUES (_session_id, (r->>'student_id')::uuid, btrim(r->>'remark'), auth.uid())
        ON CONFLICT (session_id, student_id)
        DO UPDATE SET remark_text = EXCLUDED.remark_text;
    END IF;
  END LOOP;

  -- Return the new data_updated_at so the client can adopt it as its next loaded_at.
  SELECT data_updated_at INTO v_new_updated
    FROM public.class_sessions WHERE id = _session_id;
  RETURN v_new_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_session(uuid, jsonb, timestamptz) TO authenticated;

-- ============================================================
-- 3) GRADE PROMOTION — lock affected students up front.
-- ============================================================
CREATE OR REPLACE FUNCTION public.promote_students(_student_ids uuid[], _target_section_id uuid, _academic_year text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Lock the affected student rows up front to serialize against any
  -- concurrent write touching those students (deactivation, edits, other promotions).
  PERFORM 1 FROM public.students
    WHERE id = ANY(_student_ids)
    ORDER BY id
    FOR UPDATE;

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
$function$;
