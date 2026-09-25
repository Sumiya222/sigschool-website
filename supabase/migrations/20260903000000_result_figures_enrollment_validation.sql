-- An attendance or marks row now only counts toward a student's figures if
-- enrollment_history shows them enrolled in that specific session's section
-- on that specific session's date. Same reasoning already applied to blank
-- marks (FILTER (WHERE m.score IS NOT NULL)) and to sessions with no
-- attendance recorded (count(a.id), not count(cs.id)) -- a record that
-- isn't meaningful shouldn't be counted, rather than counted as a zero.
--
-- Trigger: the 12 ASAS International F-10 grade corrections left 33
-- attendance rows marked absent, from sessions in a grade those students
-- were never actually enrolled in -- they'd been misfiled into the wrong
-- section from day one, attending the correct grade the whole time. Kept
-- as historical fact (never deleted), but they shouldn't drag down the
-- attendance percentage a school or parent sees.
--
-- Fixed in compute_result_figures -- the one shared calculation both
-- result_cards (per-term) and section_cumulative_result_cards inherit --
-- rather than in either caller, so both modes get this for free.
CREATE OR REPLACE FUNCTION public.compute_result_figures(_student_id uuid, _session_ids uuid[])
 RETURNS TABLE(present_count integer, total_sessions integer, attendance_percent numeric, average_percent numeric, marks_obtained numeric, marks_total numeric)
 LANGUAGE sql
 STABLE
AS $function$
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
  FROM unnest(_session_ids) AS sid(id)
  JOIN public.class_sessions cs ON cs.id = sid.id
  LEFT JOIN public.attendance a ON a.session_id = cs.id AND a.student_id = _student_id
  LEFT JOIN public.marks m     ON m.session_id = cs.id AND m.student_id = _student_id
  -- Row-level filter, not a FILTER(WHERE ...) on the aggregates: a session
  -- that fails this check is excluded from every figure above (attendance
  -- AND marks alike), the same as if no record existed for it at all.
  WHERE EXISTS (
    SELECT 1 FROM public.enrollment_history eh
    WHERE eh.student_id = _student_id
      AND eh.section_id = cs.section_id
      AND eh.start_date <= cs.session_date
      AND (eh.end_date IS NULL OR eh.end_date >= cs.session_date)
  );
$function$;

-- result_cards previously restricted the candidate session list to the ONE
-- section enrollment_history "best matches" the term's start date -- for a
-- student whose enrollment moved mid-term (a legitimate change or a
-- correction like the 12 above), that silently excluded every session from
-- whichever section lost that resolution, INCLUDING their genuine ongoing
-- attendance in the section they're actually in now. Concretely: the 12
-- corrected students' entire post-correction Grade 7/8/etc attendance was
-- invisible in their term result card, not just their old Grade 6/7 absences.
--
-- Fix: gather every session in the term where the student has ANY
-- attendance or marks row, across every section, and let
-- compute_result_figures's new enrollment check above decide what counts.
-- hist.section_id -- which section is DISPLAYED as "the" section for this
-- term's card -- is deliberately left untouched; only what feeds the
-- calculation changes.
CREATE OR REPLACE VIEW public.result_cards AS
SELECT
  s.id                                     AS student_id,
  s.full_name,
  hist.section_id                          AS section_id,
  t.id                                     AS term_id,
  t.name                                   AS term_name,
  figures.average_percent::numeric(6,2)    AS average_percent,
  figures.present_count,
  figures.total_sessions,
  figures.attendance_percent,
  COALESCE((
    SELECT string_agg(r.remark_text, E'\n' ORDER BY r.created_at)
    FROM public.remarks r
    JOIN public.class_sessions cs2 ON cs2.id = r.session_id
    WHERE r.student_id = s.id AND cs2.term_id = t.id AND r.remark_text IS NOT NULL
  ), '')                                   AS remarks_concatenated,
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
CROSS JOIN LATERAL compute_result_figures(
  s.id,
  COALESCE((
    SELECT array_agg(DISTINCT cs.id)
    FROM public.class_sessions cs
    WHERE cs.term_id = t.id
      AND (
        EXISTS (SELECT 1 FROM public.attendance a WHERE a.session_id = cs.id AND a.student_id = s.id)
        OR EXISTS (SELECT 1 FROM public.marks m WHERE m.session_id = cs.id AND m.student_id = s.id)
      )
  ), ARRAY[]::uuid[])
) figures(present_count, total_sessions, attendance_percent, average_percent, marks_obtained, marks_total);

-- section_cumulative_result_cards needs no change: it already gathers a
-- whole section's sessions independent of any single-section resolution,
-- so it inherits the enrollment check above for free -- the entire point
-- of fixing this in compute_result_figures rather than in either caller.
