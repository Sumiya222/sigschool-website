-- Narrows several ON DELETE CASCADE relationships to RESTRICT, each for a
-- specific, checked reason -- not a blanket conversion. Diagnostic checks
-- run before this migration found: every invoice's amount_paid reconciles
-- exactly with the sum of its payments (no drift), and every section's
-- current_students count matches its enrollment_history row count 1:1 (no
-- orphans). Both clean. One practical consequence: every one of the 34
-- existing sections currently has students in it, so this RESTRICT blocks
-- deleting any of them until emptied out -- intended, not a bug.

-- 1) A section can now only be deleted once it has never had a student,
--    session, or enrollment record -- not just "currently empty". Matches
--    the existing class_sessions.term_id -> terms RESTRICT precedent.
--    (Postgres checks RESTRICT at every row a cascade touches, so this also
--    transitively protects `schools`: deleting a school whose sections have
--    any real history will now fail too, with no separate change needed
--    there.)
ALTER TABLE public.students
  DROP CONSTRAINT students_section_id_fkey,
  ADD CONSTRAINT students_section_id_fkey
    FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE RESTRICT;

ALTER TABLE public.class_sessions
  DROP CONSTRAINT class_sessions_section_id_fkey,
  ADD CONSTRAINT class_sessions_section_id_fkey
    FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE RESTRICT;

ALTER TABLE public.enrollment_history
  DROP CONSTRAINT enrollment_history_section_id_fkey,
  ADD CONSTRAINT enrollment_history_section_id_fkey
    FOREIGN KEY (section_id) REFERENCES public.sections(id) ON DELETE RESTRICT;

-- instructor_assignments.section_id stays CASCADE deliberately: once a
-- section has no students/sessions left (the above guarantees that before
-- it's deletable), any leftover assignment rows are administrative-only,
-- nothing historical is lost by letting them go with it.

-- 2) Payments are financial audit records. The admin UI already deletes
--    payments before deleting an invoice (dashboard.admin.invoices.$invoiceId.tsx)
--    -- this makes that the only path, closing the direct-API/accidental one.
ALTER TABLE public.payments
  DROP CONSTRAINT payments_invoice_id_fkey,
  ADD CONSTRAINT payments_invoice_id_fkey
    FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE RESTRICT;

-- 3) class_sessions.instructor_user_id is NOT NULL but was declared
--    ON DELETE SET NULL -- a contradiction that already blocked the delete
--    by accident (hitting the NOT NULL constraint and raising a raw,
--    confusing error) rather than on purpose. RESTRICT makes the same
--    protection intentional, with a clean rejection instead.
ALTER TABLE public.class_sessions
  DROP CONSTRAINT class_sessions_instructor_user_id_fkey,
  ADD CONSTRAINT class_sessions_instructor_user_id_fkey
    FOREIGN KEY (instructor_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
