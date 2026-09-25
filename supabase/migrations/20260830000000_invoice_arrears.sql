-- Arrears on invoices: a manual, admin-entered outstanding-balance carry-
-- forward, added at generation time alongside the tuition line. Deliberately
-- NOT calculated from unpaid invoices -- payments sometimes arrive outside
-- the system (bank transfer noticed late, cash handed to an instructor),
-- and an automatic figure could bill a school for money it already sent.
--
-- arrears_amount is positive-only (CHECK >= 0, no credits here -- a
-- discount is a different feature) and snapshots at generation time exactly
-- like active_student_count and rate_per_student: it's a plain column, not
-- itself computed from anything, so nothing recomputes it later.
--
-- A note is required whenever an amount is entered, enforced at the
-- database level (not just in the form) -- an unexplained charge on a
-- school's invoice generates a phone call, and this project has already
-- been burned once by a client-only check that a direct API call or a
-- future code path could bypass.
ALTER TABLE public.invoices
  ADD COLUMN arrears_amount numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN arrears_note text;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_arrears_amount_nonneg CHECK (arrears_amount >= 0);

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_arrears_note_required_if_amount
  CHECK (arrears_amount = 0 OR (arrears_note IS NOT NULL AND btrim(arrears_note) <> ''));

-- total_amount is a GENERATED ALWAYS ... STORED column, which Postgres has
-- no ALTER syntax for changing the expression of -- drop and re-add is the
-- only path. Existing rows all have arrears_amount = 0 (the column default
-- above applies retroactively), so every historical invoice's total_amount
-- recomputes to exactly its previous value; only future invoices with a
-- nonzero arrears_amount actually change.
--
-- This is the ONE place arrears enters the total. Every reader of
-- total_amount -- the payment-exceeds-balance guard, record_payment,
-- the invoice list, the detail view, both PDF paths, the audit-log
-- trigger -- already reads this column rather than recomputing
-- count * rate, so all of them pick up arrears with no code change and
-- can never silently disagree with what the school was actually billed.
ALTER TABLE public.invoices DROP COLUMN total_amount;
ALTER TABLE public.invoices
  ADD COLUMN total_amount numeric(14,2)
  GENERATED ALWAYS AS (active_student_count::numeric * rate_per_student + arrears_amount) STORED;

-- generate_invoice: add arrears params to the overload the app actually
-- calls (the one with _rate_override). The 4-arg overload has no rate
-- override either and isn't called anywhere in the app -- left alone
-- rather than extended for a path nothing uses.
--
-- CREATE OR REPLACE does not replace a function whose parameter list
-- differs in arity -- it creates a third overload alongside it. The old
-- 5-arg (_rate_override, no arrears) signature must be dropped explicitly,
-- or PostgREST's function resolution becomes ambiguous the moment a call
-- supplies the new arrears parameters (confirmed live: PGRST203, "Could
-- not choose the best candidate function").
DROP FUNCTION IF EXISTS public.generate_invoice(uuid, text, date, text, numeric);

CREATE OR REPLACE FUNCTION public.generate_invoice(
  _school_id uuid,
  _billing_month text,
  _due_date date,
  _notes text DEFAULT NULL::text,
  _rate_override numeric DEFAULT NULL::numeric,
  _arrears_amount numeric DEFAULT 0,
  _arrears_note text DEFAULT NULL::text
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_rate numeric(12,2);
  v_count int;
  v_next bigint;
  v_year text;
  v_number text;
  v_id uuid;
  v_existing uuid;
  v_arrears numeric(12,2);
  v_arrears_note text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can generate invoices';
  END IF;
  IF _billing_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
    RAISE EXCEPTION 'billing_month must be YYYY-MM';
  END IF;

  v_arrears := COALESCE(_arrears_amount, 0);
  v_arrears_note := NULLIF(btrim(COALESCE(_arrears_note, '')), '');
  IF v_arrears < 0 THEN
    RAISE EXCEPTION 'Arrears amount cannot be negative';
  END IF;
  IF v_arrears > 0 AND v_arrears_note IS NULL THEN
    RAISE EXCEPTION 'Arrears note is required when an arrears amount is entered';
  END IF;

  SELECT id INTO v_existing FROM public.invoices
    WHERE school_id = _school_id AND billing_month = _billing_month;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'DUPLICATE:%', v_existing;
  END IF;

  IF _rate_override IS NOT NULL THEN
    IF _rate_override <= 0 THEN
      RAISE EXCEPTION 'Rate must be greater than zero';
    END IF;
    v_rate := _rate_override;
  ELSE
    SELECT monthly_rate_per_student INTO v_rate FROM public.schools WHERE id = _school_id;
    IF v_rate IS NULL THEN
      RAISE EXCEPTION 'No rate provided and school has no Monthly Rate Per Student set';
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_count
    FROM public.students st
    JOIN public.sections s ON s.id = st.section_id
    WHERE s.school_id = _school_id AND st.is_active = true;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Cannot generate invoice for a school with 0 active students';
  END IF;

  v_next := nextval('public.invoice_number_seq');
  v_year := to_char(now(), 'YYYY');
  v_number := 'INV-' || v_year || '-' || lpad(v_next::text, 4, '0');

  INSERT INTO public.invoices (
    invoice_number, school_id, billing_month, active_student_count, rate_per_student,
    due_date, generated_by, notes, arrears_amount, arrears_note
  )
    VALUES (
      v_number, _school_id, _billing_month, v_count, v_rate,
      _due_date, auth.uid(), _notes, v_arrears, v_arrears_note
    )
    RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;
