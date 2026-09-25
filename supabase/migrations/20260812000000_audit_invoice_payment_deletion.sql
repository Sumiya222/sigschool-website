-- Step 4 of the cascades/unscoped-deletes audit: adds audit_log coverage for
-- invoice and payment deletion. The instructor-assignment revoke path
-- already got equivalent coverage in 20260806000000 (extending its trigger
-- to fire on UPDATE too, for the soft-deactivate conversion) -- this is the
-- other half of the same request: financial records are the other place
-- where a silent, list-free removal would leave an admin with no way to
-- reconstruct what was destroyed.
--
-- Both call sites that delete these rows (dashboard.admin.invoices.$invoiceId.tsx:
-- deletePayment() for a single payment, and deleteInvoice() which clears all
-- of an invoice's payments before deleting the invoice itself) go through
-- plain DELETEs, so a row-level trigger catches both paths uniformly,
-- including the multi-row case (deleteInvoice's `.eq("invoice_id", ...)`
-- bulk delete fires this once per row, producing one log entry per payment).

CREATE OR REPLACE FUNCTION public.audit_payments()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv_number text;
BEGIN
  SELECT invoice_number INTO inv_number FROM public.invoices WHERE id = OLD.invoice_id;
  INSERT INTO public.audit_log(actor_user_id, action_type, target_type, target_id, details)
  VALUES (
    auth.uid(), 'payment_deleted', 'payment', OLD.id::text,
    jsonb_build_object(
      'invoice_id', OLD.invoice_id, 'invoice_number', inv_number,
      'amount', OLD.amount, 'paid_at', OLD.paid_at, 'notes', OLD.notes
    )
  );
  RETURN OLD;
END;
$$;
CREATE TRIGGER audit_payments_trg
AFTER DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.audit_payments();

CREATE OR REPLACE FUNCTION public.audit_invoices()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sch_name text;
BEGIN
  SELECT name INTO sch_name FROM public.schools WHERE id = OLD.school_id;
  INSERT INTO public.audit_log(actor_user_id, action_type, target_type, target_id, details)
  VALUES (
    auth.uid(), 'invoice_deleted', 'invoice', OLD.id::text,
    jsonb_build_object(
      'invoice_number', OLD.invoice_number, 'school_id', OLD.school_id, 'school_name', sch_name,
      'billing_month', OLD.billing_month, 'total_amount', OLD.total_amount, 'amount_paid', OLD.amount_paid
    )
  );
  RETURN OLD;
END;
$$;
CREATE TRIGGER audit_invoices_trg
AFTER DELETE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.audit_invoices();
