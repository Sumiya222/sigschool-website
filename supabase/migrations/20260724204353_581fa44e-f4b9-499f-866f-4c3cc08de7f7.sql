
ALTER TABLE public.schools
  ADD CONSTRAINT schools_name_length_chk CHECK (length(name) <= 200),
  ADD CONSTRAINT schools_address_length_chk CHECK (address IS NULL OR length(address) <= 500);

ALTER TABLE public.sections
  ADD CONSTRAINT sections_section_name_length_chk CHECK (length(section_name) <= 50);

ALTER TABLE public.terms
  ADD CONSTRAINT terms_name_length_chk CHECK (length(name) <= 100);

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_invoice_number_length_chk CHECK (length(invoice_number) <= 50);
