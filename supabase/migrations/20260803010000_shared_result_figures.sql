-- Formula drift fix: the school portal's cumulative-history view
-- re-implemented the average as sum(obtained)/sum(possible) client-side,
-- which disagrees with result_cards' avg(score/max_score) whenever
-- max_score varies between sessions (a 100-point test would dominate a
-- 10-point quiz). Standardizing on result_cards' formula — a per-session
-- average, where every recorded assessment counts equally regardless of
-- its point value — since that's the one every other consumer (instructor
-- portal, daily digest) already uses.
--
-- The actual per-session-average math is factored into one function,
-- compute_result_figures(), called by both result_cards (per-term) and
-- section_cumulative_result_cards() (all sessions a section has ever had,
-- for its current roster) with different session-id sets. Neither caller
-- repeats the expression — this is the single place the formula lives.
CREATE OR REPLACE FUNCTION public.compute_result_figures(_student_id uuid, _session_ids uuid[])
RETURNS TABLE (
  present_count integer,
  total_sessions integer,
  attendance_percent numeric(6,2),
  average_percent numeric(6,2),
  marks_obtained numeric(12,2),
  marks_total numeric(12,2)
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    count(DISTINCT cs.id) FILTER (WHERE a.status = 'present'::attendance_status)::integer AS present_count,
    count(DISTINCT cs.id)::integer AS total_sessions,
    CASE
      WHEN count(DISTINCT cs.id) = 0 THEN NULL
      ELSE (count(DISTINCT cs.id) FILTER (WHERE a.status = 'present'::attendance_status)::numeric
            / count(DISTINCT cs.id)::numeric * 100)::numeric(6,2)
    END AS attendance_percent,
    (avg(m.score / NULLIF(m.max_score, 0)) FILTER (WHERE m.score IS NOT NULL) * 100)::numeric(6,2) AS average_percent,
    sum(m.score) FILTER (WHERE m.score IS NOT NULL)::numeric(12,2) AS marks_obtained,
    sum(m.max_score) FILTER (WHERE m.score IS NOT NULL)::numeric(12,2) AS marks_total
  FROM unnest(_session_ids) AS cs(id)
  LEFT JOIN public.attendance a ON a.session_id = cs.id AND a.student_id = _student_id
  LEFT JOIN public.marks m     ON m.session_id = cs.id AND m.student_id = _student_id;
$$;

-- result_cards: same historical-section resolution as before (20260803000000),
-- but the aggregate math now delegates to compute_result_figures() instead
-- of computing avg()/count() inline.
CREATE OR REPLACE VIEW public.result_cards AS
SELECT
  s.id                   AS student_id,
  s.full_name,
  hist.section_id        AS section_id,
  t.id                   AS term_id,
  t.name                 AS term_name,
  figures.average_percent::numeric(6,2) AS average_percent,
  figures.present_count,
  figures.total_sessions,
  figures.attendance_percent,
  COALESCE((
    SELECT string_agg(r.remark_text, E'\n' ORDER BY r.created_at)
    FROM public.remarks r
    JOIN public.class_sessions cs2 ON cs2.id = r.session_id
    WHERE r.student_id = s.id AND cs2.term_id = t.id AND r.remark_text IS NOT NULL
  ), '')                  AS remarks_concatenated,
  s.roll_number,
  figures.marks_obtained,
  figures.marks_total
FROM public.students s
CROSS JOIN public.terms t
LEFT JOIN LATERAL (
  SELECT eh.section_id
  FROM public.enrollment_history eh
  WHERE eh.student_id = s.id
    AND eh.start_date <= t.end_date
    AND (eh.end_date IS NULL OR eh.end_date >= t.start_date)
  ORDER BY
    (eh.start_date <= t.start_date AND (eh.end_date IS NULL OR eh.end_date >= t.start_date)) DESC,
    eh.start_date DESC
  LIMIT 1
) hist ON true
CROSS JOIN LATERAL public.compute_result_figures(
  s.id,
  COALESCE(
    (SELECT array_agg(cs.id) FROM public.class_sessions cs
      WHERE cs.section_id = hist.section_id AND cs.term_id = t.id),
    ARRAY[]::uuid[]
  )
) AS figures;

-- Cumulative counterpart: every session a section has ever had, across all
-- terms, for its currently-enrolled roster — matching the school portal's
-- existing "cumulative history" scope (current students, not historically
-- resolved, since cumulative mode was never term-bounded to begin with).
-- Same compute_result_figures() call as result_cards, just a different
-- session-id set.
CREATE OR REPLACE FUNCTION public.section_cumulative_result_cards(_section_id uuid)
RETURNS TABLE (
  student_id uuid,
  full_name text,
  roll_number text,
  present_count integer,
  total_sessions integer,
  attendance_percent numeric(6,2),
  average_percent numeric(6,2),
  marks_obtained numeric(12,2),
  marks_total numeric(12,2),
  remarks_concatenated text
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    st.id,
    st.full_name,
    st.roll_number,
    figures.present_count,
    figures.total_sessions,
    figures.attendance_percent,
    figures.average_percent,
    figures.marks_obtained,
    figures.marks_total,
    COALESCE((
      SELECT string_agg(r.remark_text, E'\n' ORDER BY r.created_at)
      FROM public.remarks r
      JOIN public.class_sessions cs2 ON cs2.id = r.session_id
      WHERE r.student_id = st.id AND cs2.section_id = _section_id AND r.remark_text IS NOT NULL
    ), '') AS remarks_concatenated
  FROM public.students st
  CROSS JOIN LATERAL public.compute_result_figures(
    st.id,
    COALESCE(
      (SELECT array_agg(cs.id) FROM public.class_sessions cs WHERE cs.section_id = _section_id),
      ARRAY[]::uuid[]
    )
  ) AS figures
  WHERE st.section_id = _section_id;
$$;

GRANT EXECUTE ON FUNCTION public.compute_result_figures(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.section_cumulative_result_cards(uuid) TO authenticated;
