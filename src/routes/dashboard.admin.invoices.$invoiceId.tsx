import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import { verifyRowsAffected } from "@/lib/db-write-verify";
import { formatPKR, generateInvoicePdf } from "@/lib/invoice-pdf";
import { formatDate, formatBillingMonth } from "@/lib/format-date";
import { DateField } from "@/components/ui/date-field";

export const Route = createFileRoute("/dashboard/admin/invoices/$invoiceId")({
  component: InvoiceDetailPage,
});

interface Invoice {
  id: string;
  invoice_number: string;
  school_id: string;
  billing_month: string;
  active_student_count: number;
  rate_per_student: number;
  total_amount: number;
  arrears_amount: number;
  arrears_note: string | null;
  amount_paid: number;
  due_date: string;
  generated_at: string;
  notes: string | null;
}

interface Payment {
  id: string;
  amount: number;
  paid_at: string;
  notes: string | null;
  created_at: string;
}

interface School {
  id: string;
  name: string;
  address: string | null;
  project_start_date: string | null;
}

interface Company {
  bank_name: string | null;
  account_title: string | null;
  account_number: string | null;
  iban: string | null;
}

function InvoiceDetailPage() {
  const { invoiceId } = Route.useParams();
  const navigate = useNavigate();
  const [inv, setInv] = useState<Invoice | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(today);
  const [payNotes, setPayNotes] = useState("");
  const [payBusy, setPayBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    setErr(null);
    const { data: iData, error: iErr } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", invoiceId)
      .maybeSingle();
    if (iErr || !iData) {
      setErr(iErr ? toSafeErrorMessage(iErr, "Invoice not found") : "Invoice not found");
      setLoading(false);
      return;
    }
    const [{ data: sData }, { data: pData }, { data: cData }] = await Promise.all([
      supabase
        .from("schools")
        .select("id, name, address, project_start_date")
        .eq("id", iData.school_id)
        .maybeSingle(),
      supabase
        .from("payments")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("paid_at", { ascending: false }),
      supabase
        .from("company_settings")
        .select("bank_name, account_title, account_number, iban")
        .limit(1)
        .maybeSingle(),
    ]);
    setInv({
      ...iData,
      active_student_count: Number(iData.active_student_count),
      rate_per_student: Number(iData.rate_per_student),
      total_amount: Number(iData.total_amount ?? 0),
      arrears_amount: Number(iData.arrears_amount ?? 0),
      amount_paid: Number(iData.amount_paid ?? 0),
    } as Invoice);
    setSchool((sData ?? null) as School | null);
    setPayments(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((pData ?? []) as any[]).map((p) => ({ ...p, amount: Number(p.amount) })) as Payment[],
    );
    setCompany((cData ?? null) as Company | null);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  async function recordPayment() {
    if (!inv) return;
    const amount = Number(payAmount);
    if (!(amount > 0)) {
      alert("Enter a positive amount");
      return;
    }
    setPayBusy(true);
    // Use record_payment RPC — it takes a FOR UPDATE lock on the invoice row
    // and re-checks the running balance under the lock, so concurrent
    // payments can never jointly overpay.
    const { error } = await supabase.rpc("record_payment", {
      _invoice_id: inv.id,
      _amount: amount,
      _paid_at: payDate,
      _notes: payNotes || undefined,
    });
    setPayBusy(false);
    if (error) {
      alert(toSafeErrorMessage(error, "Could not record that payment."));
      return;
    }
    setPayAmount("");
    setPayNotes("");
    refresh();
  }

  async function deletePayment(id: string) {
    if (!confirm("Delete this payment?")) return;
    const { error } = await verifyRowsAffected(supabase.from("payments").delete().eq("id", id));
    if (error) alert(toSafeErrorMessage(error, "Could not delete that payment."));
    else refresh();
  }

  async function downloadPdf() {
    if (!inv || !school) return;
    await generateInvoicePdf({
      invoice_number: inv.invoice_number,
      generated_at: inv.generated_at,
      due_date: inv.due_date,
      billing_month: inv.billing_month,
      school_name: school.name,
      school_address: school.address,
      project_start_date: school.project_start_date,
      active_student_count: inv.active_student_count,
      rate_per_student: inv.rate_per_student,
      total_amount: inv.total_amount,
      arrears_amount: inv.arrears_amount,
      arrears_note: inv.arrears_note,
      amount_paid: inv.amount_paid,
      remaining_balance: inv.total_amount - inv.amount_paid,
      notes: inv.notes,
      company: {
        bank_name: company?.bank_name ?? null,
        account_title: company?.account_title ?? null,
        account_number: company?.account_number ?? null,
        iban: company?.iban ?? null,
      },
    });
  }

  async function deleteInvoice() {
    if (!inv) return;
    const msg =
      payments.length > 0
        ? `Delete invoice ${inv.invoice_number}? This will also remove ${payments.length} recorded payment${payments.length === 1 ? "" : "s"}. This cannot be undone.`
        : `Delete invoice ${inv.invoice_number}? This cannot be undone.`;
    if (!confirm(msg)) return;
    setDeleting(true);
    if (payments.length > 0) {
      const { error: pErr } = await verifyRowsAffected(
        supabase.from("payments").delete().eq("invoice_id", inv.id),
      );
      if (pErr) {
        setDeleting(false);
        alert(toSafeErrorMessage(pErr, "Could not delete the payments on that invoice."));
        return;
      }
    }
    const { error } = await verifyRowsAffected(supabase.from("invoices").delete().eq("id", inv.id));
    setDeleting(false);
    if (error) {
      // Payments were just cleared above, so this shouldn't normally fire —
      // but if a payment landed between those two deletes, give a specific
      // message rather than the generic fallback.
      if (error.code === "23503") {
        alert(
          "Cannot delete that invoice — it still has a payment recorded against it. Reload and try again.",
        );
      } else {
        alert(toSafeErrorMessage(error, "Could not delete that invoice."));
      }
      return;
    }
    navigate({ to: "/dashboard/admin/invoices" });
  }

  if (loading) return <div className="p-8 text-slate-400">Loading…</div>;
  if (err || !inv) return <div className="p-8 text-red-300">{err ?? "Not found"}</div>;

  const balance = inv.total_amount - inv.amount_paid;
  const overdue = balance > 0 && new Date(inv.due_date) < new Date(today);
  let statusLabel = "Unpaid";
  let statusCls = "bg-red-500/15 text-red-300";
  if (inv.amount_paid >= inv.total_amount) {
    statusLabel = "Paid";
    statusCls = "bg-emerald-500/15 text-emerald-300";
  } else if (inv.amount_paid > 0) {
    statusLabel = "Partially Paid";
    statusCls = "bg-amber-500/15 text-amber-300";
  }

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-4 text-xs">
        <Link to="/dashboard/admin/invoices" className="text-slate-400 hover:text-slate-200">
          ← Back to invoices
        </Link>
      </div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl font-semibold text-slate-100">{inv.invoice_number}</h1>
          <p className="mt-1 text-sm text-slate-400">
            {school?.name} · Billing month {formatBillingMonth(inv.billing_month)} · Due{" "}
            {formatDate(inv.due_date)}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className={"rounded-full px-2 py-0.5 text-[11px] " + statusCls}>
              {statusLabel}
            </span>
            {overdue && (
              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[11px] text-red-300">
                Overdue
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={downloadPdf}
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
          >
            Download PDF
          </button>
          <button
            onClick={deleteInvoice}
            disabled={deleting}
            className="rounded-md border border-red-900 bg-red-950/40 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-950/60 disabled:opacity-60"
          >
            {deleting ? "Deleting…" : "Delete invoice"}
          </button>
        </div>
      </header>

      <section className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">Grand total</div>
          <div className="mt-1 text-lg font-semibold text-slate-100">
            {formatPKR(inv.total_amount)}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {inv.active_student_count} active students × {formatPKR(inv.rate_per_student)}
            {inv.arrears_amount > 0 && (
              <>
                {" "}
                + {formatPKR(inv.arrears_amount)} arrears
                {inv.arrears_note ? ` (${inv.arrears_note})` : ""}
              </>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">Amount paid</div>
          <div className="mt-1 text-lg font-semibold text-emerald-300">
            {formatPKR(inv.amount_paid)}
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">Balance due</div>
          <div className="mt-1 text-lg font-semibold text-indigo-300">{formatPKR(balance)}</div>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-sm font-semibold text-slate-200">Record payment</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="text-xs text-slate-300">
            Amount (PKR)
            <input
              type="number"
              min="0"
              step="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            />
          </label>
          <label className="text-xs text-slate-300">
            Date
            <div className="mt-1">
              <DateField value={payDate} onChange={setPayDate} />
            </div>
          </label>
          <label className="md:col-span-2 text-xs text-slate-300">
            Notes (optional)
            <input
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            />
          </label>
        </div>
        <div className="mt-4">
          <button
            onClick={recordPayment}
            disabled={payBusy}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-60"
          >
            {payBusy ? "Saving…" : "Record payment"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-200">Payment history</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Notes</th>
                <th className="px-6 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No payments recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="text-slate-200">
                    <td className="px-6 py-3">{formatDate(p.paid_at)}</td>
                    <td className="px-6 py-3">{formatPKR(Number(p.amount))}</td>
                    <td className="px-6 py-3 text-slate-400">{p.notes ?? "—"}</td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => deletePayment(p.id)}
                        className="rounded-md border border-red-900 px-3 py-1 text-xs text-red-300 hover:bg-red-950/40"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
