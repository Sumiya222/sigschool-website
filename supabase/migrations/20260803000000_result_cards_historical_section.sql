-- result_cards previously joined class_sessions on students.section_id — the
-- student's CURRENT section. promote_students() overwrites that column
-- directly, so after a promotion, a student's result card for any PAST term
-- silently resolves against their new section instead of the one they were
-- actually in, producing zero matching sessions: their real, already-recorded
-- attendance/marks for that term appear as "no data" even though the rows are
-- untouched in the attendance/marks tables. The same bug drops promoted-away
-- students from a section's past-term roster entirely, since the section's
-- own result-card listing is filtered on this same column.
--
-- Fix: resolve each (student, term) pair's section via enrollment_history —
-- the same overlap logic dashboard.school.section.$sectionId.tsx already
-- uses client-side for exactly this reason. Prefer the enrollment row active
-- on the term's start_date (the normal case); if none covers the term start
-- (e.g. the student joined mid-term), fall back to the most recently-started
-- overlapping row. A student with no enrollment_history row overlapping a
-- given term (e.g. a term before they ever enrolled) correctly resolves to
-- no section and therefore NULL/0-session figures, rather than the previous
-- behavior of misattributing a current section's sessions to them.
CREATE OR REPLACE VIEW public.result_cards AS
SELECT
  s.id                                     AS student_id,
  s.full_name,
  hist.section_id                          AS section_id,
  t.id                                     AS term_id,
  t.name                                   AS term_name,
  (avg(m.score / NULLIF(m.max_score, 0)) FILTER (WHERE m.score IS NOT NULL) * 100)::numeric(6,2) AS average_percent,
  count(DISTINCT cs.id) FILTER (WHERE a.status = 'present'::attendance_status)::integer         AS present_count,
  count(DISTINCT cs.id)::integer                                                                AS total_sessions,
  CASE
    WHEN count(DISTINCT cs.id) = 0 THEN NULL
    ELSE (count(DISTINCT cs.id) FILTER (WHERE a.status = 'present'::attendance_status)::numeric
          / count(DISTINCT cs.id)::numeric * 100)::numeric(6,2)
  END                                      AS attendance_percent,
  COALESCE((
    SELECT string_agg(r.remark_text, E'\n' ORDER BY r.created_at)
    FROM public.remarks r
    JOIN public.class_sessions cs2 ON cs2.id = r.session_id
    WHERE r.student_id = s.id AND cs2.term_id = t.id AND r.remark_text IS NOT NULL
  ), '')                                   AS remarks_concatenated
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
LEFT JOIN public.class_sessions cs ON cs.section_id = hist.section_id AND cs.term_id = t.id
LEFT JOIN public.attendance a     ON a.session_id  = cs.id           AND a.student_id  = s.id
LEFT JOIN public.marks m          ON m.session_id  = cs.id           AND m.student_id  = s.id
GROUP BY s.id, s.full_name, hist.section_id, t.id, t.name;
