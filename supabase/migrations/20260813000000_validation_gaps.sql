-- Closes the 3 remaining low-severity items from the 2026-07-30 input-
-- validation audit's secondary list.

-- 1) Whitelist email format. Deliberately permissive -- a basic shape
--    check (local@domain.tld, no whitespace), not a strict RFC pattern.
--    The failure mode this guards against is a typo'd address that
--    silently never matches a real signup, not blocking an unusual but
--    valid one. Client already has <input type="email"> for immediate
--    feedback; this closes the direct-PostgREST bypass the app-layer
--    check can't reach, matching every other constraint added in this
--    audit. Named with the _format_chk suffix so the shared error
--    sanitizer (db-error-message.ts) already renders it as "That value
--    isn't in the expected format." with no extra call-site work.
ALTER TABLE public.whitelist
  ADD CONSTRAINT whitelist_email_format_chk
  CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- 2) Featured-student age. No prior constraint existed at all. Bounds are
--    generous on purpose -- this is a school-outreach program covering a
--    wide age range, not a strict grade-level product -- wide enough to
--    never reject a real submission, narrow enough to catch a fat-
--    fingered entry (e.g. typing the birth year instead of the age).
ALTER TABLE public.featured_students
  ADD CONSTRAINT featured_students_age_range_chk
  CHECK (age IS NULL OR (age >= 3 AND age <= 25));
