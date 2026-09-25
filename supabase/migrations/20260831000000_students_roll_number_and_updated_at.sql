-- Duplicate-prevention backstop for students.
--
-- Two real incidents drove this: (1) students.roll_number had no
-- uniqueness constraint at all, so a bulk re-import or a second manual
-- add could silently double a section; a real duplicate ("Ayesha" x2 in
-- ASAS International F-10 Grade 6 Section A) already reached production,
-- caught only by a person manually deactivating one row, not by the
-- system -- it missed being billed only because invoice generation had
-- already run four hours earlier. (2) students had no updated_at, so
-- there was no way to tell when or by whom that deactivation happened.
--
-- 9 students currently have no roll_number -- the schools haven't issued
-- them yet. Rather than block the constraint on that, backfill with an
-- obviously-synthetic placeholder: TEMP- followed by the first 8 hex
-- characters of the student's own id, uppercased. Deriving it from the
-- row's own uuid guarantees every placeholder is unique on its own, with
-- no separate sequence to manage, which matters because the very next
-- statement adds a uniqueness constraint these values must satisfy too.
-- Never a plausible-looking number -- nothing here could be mistaken for
-- a real roll number on an export or a result card.
UPDATE public.students
SET roll_number = 'TEMP-' || upper(substring(id::text, 1, 8))
WHERE roll_number IS NULL;

ALTER TABLE public.students ALTER COLUMN roll_number SET NOT NULL;

-- Partial index, not a table-wide unique constraint: scoped to active
-- students because a roll number can legitimately be reassigned to a new
-- student after the previous holder leaves (deactivated, not deleted --
-- students are never hard-deleted). A plain unique index would forever
-- block that legitimate reuse; this makes the guarantee exactly what it
-- needs to be -- "identical roll numbers in a *live* section become
-- impossible" -- without also constraining historical/inactive rows.
CREATE UNIQUE INDEX students_section_rollnumber_active_uq
  ON public.students (section_id, roll_number) WHERE is_active = true;

-- updated_at, reusing the touch_updated_at() trigger already applied to
-- 20+ other tables -- no new trigger function needed.
ALTER TABLE public.students ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE TRIGGER students_touch_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
