
ALTER TABLE public.students
  ADD CONSTRAINT students_full_name_length_chk CHECK (length(full_name) <= 200),
  ADD CONSTRAINT students_notes_length_chk CHECK (notes IS NULL OR length(notes) <= 2000);

ALTER TABLE public.remarks
  ADD CONSTRAINT remarks_remark_text_length_chk CHECK (length(remark_text) <= 2000);

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_notes_length_chk CHECK (notes IS NULL OR length(notes) <= 2000);

ALTER TABLE public.payments
  ADD CONSTRAINT payments_notes_length_chk CHECK (notes IS NULL OR length(notes) <= 2000);
