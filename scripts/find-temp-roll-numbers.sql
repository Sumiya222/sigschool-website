-- Lists every student still on a placeholder roll_number (assigned by
-- migration 20260831000000_students_roll_number_and_updated_at.sql for
-- students the school hadn't issued a real number for yet), grouped by
-- school and section so each school can be chased for just their own
-- students. Re-run any time -- once a school provides real numbers and
-- the roster is updated, those rows drop out on their own.
--
-- Run via the Supabase SQL editor, or the Management API query endpoint
-- used elsewhere in this project's tooling.
SELECT
  sch.name AS school,
  sec.grade,
  sec.section_name AS section,
  st.full_name,
  st.roll_number AS placeholder_value,
  st.is_active,
  st.created_at AS record_created
FROM public.students st
JOIN public.sections sec ON sec.id = st.section_id
JOIN public.schools sch ON sch.id = sec.school_id
WHERE st.roll_number LIKE 'TEMP-%'
ORDER BY sch.name, sec.grade, sec.section_name, st.full_name;
