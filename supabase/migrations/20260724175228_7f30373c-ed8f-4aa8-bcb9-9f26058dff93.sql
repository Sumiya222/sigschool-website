CREATE INDEX attendance_student_idx ON public.attendance(student_id);
CREATE INDEX marks_student_idx      ON public.marks(student_id);
CREATE INDEX remarks_student_idx    ON public.remarks(student_id);
CREATE INDEX class_sessions_section_idx ON public.class_sessions(section_id, session_date);
CREATE INDEX class_sessions_term_idx    ON public.class_sessions(term_id);
CREATE INDEX payments_invoice_idx ON public.payments(invoice_id);
CREATE INDEX invoices_school_idx ON public.invoices(school_id);
CREATE INDEX instructor_assignments_section_idx ON public.instructor_assignments(section_id);