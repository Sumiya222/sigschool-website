-- save_session: validate score bounds before writing, so a bad direct API
-- call gets a clear error instead of a raw marks_score_range_check violation.
-- The DB constraint (added 20260724090010) remains the real backstop; this
-- just makes the failure legible at the call site.
--
-- Also drops the `marked_by` column reference from the attendance
-- upsert: that column was never added to public.attendance in any
-- migration, so every call to save_session has been failing at this step
-- since the function was first created (20260724195254) — a pre-existing,
-- unrelated bug surfaced while verifying this fix, not a security issue.
CREATE OR REPLACE FUNCTION public.save_session(_session_id uuid, _rows jsonb, _loaded_at timestamp with time zone)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_section_id uuid;
  v_current_updated timestamptz;
  v_new_updated timestamptz;
  r jsonb;
  v_student_ids uuid[] := ARRAY[]::uuid[];
  v_score numeric;
  v_max_score numeric;
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

    v_score := NULLIF(r->>'score', '')::numeric;
    v_max_score := (r->>'max_score')::numeric;

    IF v_max_score IS NULL OR v_max_score <= 0 THEN
      RAISE EXCEPTION 'Max score must be greater than 0';
    END IF;
    IF v_score IS NOT NULL AND (v_score < 0 OR v_score > v_max_score) THEN
      RAISE EXCEPTION 'Score must be between 0 and % (got %)', v_max_score, v_score;
    END IF;

    INSERT INTO public.attendance (session_id, student_id, status)
      VALUES (_session_id, (r->>'student_id')::uuid, (r->>'attendance')::attendance_status)
      ON CONFLICT (session_id, student_id)
      DO UPDATE SET status = EXCLUDED.status;

    INSERT INTO public.marks (session_id, student_id, score, max_score)
      VALUES (_session_id, (r->>'student_id')::uuid, v_score, v_max_score)
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
$function$;
