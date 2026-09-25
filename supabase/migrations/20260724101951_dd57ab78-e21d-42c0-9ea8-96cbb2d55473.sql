
-- Schools: billing config columns
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS monthly_rate_per_student numeric(12,2),
  ADD COLUMN IF NOT EXISTS project_start_date date;

-- Sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START 1;

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE RESTRICT,
  billing_month text NOT NULL, -- 'YYYY-MM'
  active_student_count integer NOT NULL,
  rate_per_student numeric(12,2) NOT NULL,
  total_amount numeric(14,2) GENERATED ALWAYS AS (active_student_count * rate_per_student) STORED,
  amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoices_billing_month_fmt CHECK (billing_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT invoices_amount_paid_nonneg CHECK (amount_paid >= 0),
  CONSTRAINT invoices_unique_school_month UNIQUE (school_id, billing_month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.invoice_number_seq TO authenticated;
GRANT ALL ON SEQUENCE public.invoice_number_seq TO service_role;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoices admin all" ON public.invoices
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  paid_at date NOT NULL DEFAULT (now())::date,
  recorded_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments admin all" ON public.payments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Keep invoices.amount_paid in sync with sum of its payments
CREATE OR REPLACE FUNCTION public.recompute_invoice_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    inv := OLD.invoice_id;
  ELSE
    inv := NEW.invoice_id;
  END IF;
  UPDATE public.invoices
    SET amount_paid = COALESCE((SELECT SUM(amount) FROM public.payments WHERE invoice_id = inv), 0),
        updated_at = now()
    WHERE id = inv;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS payments_sync_invoice_paid ON public.payments;
CREATE TRIGGER payments_sync_invoice_paid
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.recompute_invoice_paid();

-- Company settings (single-row config)
CREATE TABLE IF NOT EXISTS public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  bank_name text,
  account_title text,
  account_number text,
  iban text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_settings_singleton_true CHECK (singleton = true)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_settings TO authenticated;
GRANT ALL ON public.company_settings TO service_role;

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_settings admin all" ON public.company_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Seed default company settings row with the reference-image values
INSERT INTO public.company_settings (singleton, bank_name, account_title, account_number, iban)
VALUES (true, 'MCB Islamic Bank Limited', 'Astrobot Academy', '2601007502520001', 'PK34 MCIB 2601 0075 0252 0001')
ON CONFLICT (singleton) DO NOTHING;

-- Generate invoice RPC: snapshots active students + rate, blocks duplicates, allocates next number.
CREATE OR REPLACE FUNCTION public.generate_invoice(
  _school_id uuid,
  _billing_month text,
  _due_date date,
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric(12,2);
  v_count int;
  v_next bigint;
  v_year text;
  v_number text;
  v_id uuid;
  v_existing uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can generate invoices';
  END IF;
  IF _billing_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'billing_month must be YYYY-MM';
  END IF;

  SELECT id INTO v_existing FROM public.invoices
    WHERE school_id = _school_id AND billing_month = _billing_month;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'DUPLICATE:%', v_existing;
  END IF;

  SELECT monthly_rate_per_student INTO v_rate FROM public.schools WHERE id = _school_id;
  IF v_rate IS NULL THEN
    RAISE EXCEPTION 'School has no Monthly Rate Per Student set';
  END IF;

  SELECT COUNT(*) INTO v_count
    FROM public.students st
    JOIN public.sections s ON s.id = st.section_id
    WHERE s.school_id = _school_id AND st.is_active = true;

  v_next := nextval('public.invoice_number_seq');
  v_year := to_char(now(), 'YYYY');
  v_number := 'INV-' || v_year || '-' || lpad(v_next::text, 4, '0');

  INSERT INTO public.invoices (invoice_number, school_id, billing_month, active_student_count, rate_per_student, due_date, generated_by, notes)
    VALUES (v_number, _school_id, _billing_month, v_count, v_rate, _due_date, auth.uid(), _notes)
    RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
