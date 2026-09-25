-- Unrecorded-sessions fix: attendance_percent/total_sessions previously
-- counted every session id passed in (from unnest(_session_ids)),
-- regardless of whether an attendance row was ever actually written for
-- this student. A session created but never saved has zero attendance
-- rows for anyone, yet still silently counted in the denominator as if
-- the student had been marked absent — "nobody took attendance" and
-- "everyone was absent" were indistinguishable.
--
-- Fix: count from the attendance table's own matched rows (count(a.id))
-- instead of the input session-id list (count(cs.id)). A session only
-- counts toward THIS student's denominator if they have a real
-- attendance row for it. This mirrors average_percent's existing
-- FILTER (WHERE m.score IS NOT NULL) — a missing record is excluded, not
-- treated as a value. It also correctly handles a student who joined
-- after an earlier session was saved: that session never got them a row,
-- so it correctly doesn't count against them either way.
--
-- "Everyone genuinely marked absent" is unaffected: if a session was
-- actually saved, every roster student at save-time gets a real row
-- (status='absent' included), so it still counts, correctly, as 0% —
-- real data, not a gap.
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
    count(a.id) FILTER (WHERE a.status = 'present'::attendance_status)::integer AS present_count,
    count(a.id)::integer AS total_sessions,
    CASE
      WHEN count(a.id) = 0 THEN NULL
      ELSE (count(a.id) FILTER (WHERE a.status = 'present'::attendance_status)::numeric
            / count(a.id)::numeric * 100)::numeric(6,2)
    END AS attendance_percent,
    (avg(m.score / NULLIF(m.max_score, 0)) FILTER (WHERE m.score IS NOT NULL) * 100)::numeric(6,2) AS average_percent,
    sum(m.score) FILTER (WHERE m.score IS NOT NULL)::numeric(12,2) AS marks_obtained,
    sum(m.max_score) FILTER (WHERE m.score IS NOT NULL)::numeric(12,2) AS marks_total
  FROM unnest(_session_ids) AS cs(id)
  LEFT JOIN public.attendance a ON a.session_id = cs.id AND a.student_id = _student_id
  LEFT JOIN public.marks m     ON m.session_id = cs.id AND m.student_id = _student_id;
$$;
