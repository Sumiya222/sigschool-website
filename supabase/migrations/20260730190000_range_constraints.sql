-- Range constraints missing at the DB layer (client-only checks were the
-- only guard). Verified against live data before applying: 0 negative rates,
-- 0 negative student counts, 0 inverted terms across all rows.

ALTER TABLE public.schools
  ADD CONSTRAINT schools_monthly_rate_nonneg
  CHECK (monthly_rate_per_student IS NULL OR monthly_rate_per_student >= 0);

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_rate_per_student_nonneg
  CHECK (rate_per_student >= 0);

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_active_student_count_nonneg
  CHECK (active_student_count >= 0);

ALTER TABLE public.terms
  ADD CONSTRAINT terms_end_after_start
  CHECK (end_date > start_date);
