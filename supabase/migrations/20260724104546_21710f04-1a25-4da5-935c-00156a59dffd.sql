CREATE OR REPLACE FUNCTION public.generate_invoice(_school_id uuid, _billing_month text, _due_date date, _notes text DEFAULT NULL::text, _rate_override numeric DEFAULT NULL)
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

  v_next := nextval('public.invoice_number_seq');
  v_year := to_char(now(), 'YYYY');
  v_number := 'INV-' || v_year || '-' || lpad(v_next::text, 4, '0');

  INSERT INTO public.invoices (invoice_number, school_id, billing_month, active_student_count, rate_per_student, due_date, generated_by, notes)
    VALUES (v_number, _school_id, _billing_month, v_count, v_rate, _due_date, auth.uid(), _notes)
    RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;