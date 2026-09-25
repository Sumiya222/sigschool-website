
-- 1) generate_invoice: reject zero active students (both overloads)
CREATE OR REPLACE FUNCTION public.generate_invoice(_school_id uuid, _billing_month text, _due_date date, _notes text DEFAULT NULL::text)
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

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Cannot generate invoice for a school with 0 active students';
  END IF;

  v_next := nextval('public.invoice_number_seq');
  v_year := to_char(now(), 'YYYY');
  v_number := 'INV-' || v_year || '-' || lpad(v_next::text, 4, '0');

  INSERT INTO public.invoices (invoice_number, school_id, billing_month, active_student_count, rate_per_student, due_date, generated_by, notes)
    VALUES (v_number, _school_id, _billing_month, v_count, v_rate, _due_date, auth.uid(), _notes)
    RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_invoice(_school_id uuid, _billing_month text, _due_date date, _notes text DEFAULT NULL::text, _rate_override numeric DEFAULT NULL::numeric)
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

  INSERT INTO public.invoices (invoice_number, school_id, billing_month, active_student_count, rate_per_student, due_date, generated_by, notes)
    VALUES (v_number, _school_id, _billing_month, v_count, v_rate, _due_date, auth.uid(), _notes)
    RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

-- 2) Reject overpayment on payments insert/update
CREATE OR REPLACE FUNCTION public.enforce_payment_not_exceed_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric(12,2);
  v_existing numeric(12,2);
  v_remaining numeric(12,2);
BEGIN
  SELECT total_amount INTO v_total FROM public.invoices WHERE id = NEW.invoice_id;
  IF v_total IS NULL THEN
    RAISE EXCEPTION 'Invoice not found';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_existing
    FROM public.payments
    WHERE invoice_id = NEW.invoice_id
      AND (TG_OP = 'INSERT' OR id <> NEW.id);

  v_remaining := v_total - v_existing;

  IF NEW.amount > v_remaining THEN
    RAISE EXCEPTION 'Payment amount exceeds the remaining balance of PKR %', to_char(v_remaining, 'FM999999990.00');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS payments_enforce_not_exceed_total ON public.payments;
CREATE TRIGGER payments_enforce_not_exceed_total
BEFORE INSERT OR UPDATE OF amount, invoice_id ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.enforce_payment_not_exceed_total();

-- 3) Enforce class_sessions.session_date within its term
CREATE OR REPLACE FUNCTION public.enforce_session_within_term()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start date;
  v_end date;
  v_name text;
BEGIN
  SELECT start_date, end_date, name INTO v_start, v_end, v_name
    FROM public.terms WHERE id = NEW.term_id;
  IF v_start IS NULL THEN
    RAISE EXCEPTION 'Term not found';
  END IF;
  IF NEW.session_date < v_start OR NEW.session_date > v_end THEN
    RAISE EXCEPTION 'Session date must fall within %''s range: % - %',
      v_name,
      to_char(v_start, 'DD Mon YYYY'),
      to_char(v_end, 'DD Mon YYYY');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS class_sessions_enforce_within_term ON public.class_sessions;
CREATE TRIGGER class_sessions_enforce_within_term
BEFORE INSERT OR UPDATE OF session_date, term_id ON public.class_sessions
FOR EACH ROW EXECUTE FUNCTION public.enforce_session_within_term();
