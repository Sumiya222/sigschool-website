
-- 1) allow blank score
ALTER TABLE public.marks ALTER COLUMN score DROP NOT NULL;

-- 2) uniqueness for idempotent upsert
ALTER TABLE public.marks   ADD CONSTRAINT marks_session_student_key   UNIQUE (session_id, student_id);
ALTER TABLE public.remarks ADD CONSTRAINT remarks_session_student_key UNIQUE (session_id, student_id);

-- 3) rebuild result_cards view to exclude null scores explicitly and return NULL (not 0) when no scores
CREATE OR REPLACE VIEW public.result_cards AS
SELECT
  s.id                                     AS student_id,
  s.full_name,
  s.section_id,
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
LEFT JOIN public.class_sessions cs ON cs.section_id = s.section_id AND cs.term_id = t.id
LEFT JOIN public.attendance a     ON a.session_id  = cs.id       AND a.student_id  = s.id
LEFT JOIN public.marks m          ON m.session_id  = cs.id       AND m.student_id  = s.id
GROUP BY s.id, s.full_name, s.section_id, t.id, t.name;
