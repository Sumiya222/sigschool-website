import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import { useSchoolSession } from "@/lib/school-context";
import { formatPKR, generateInvoicePdf } from "@/lib/invoice-pdf";
import { formatDate, formatBillingMonth } from "@/lib/format-date";
import { Badge, type BadgeTone } from "@/components/dashboard/Badge";

export const Route = createFileRoute("/dashboard/school/invoices")({
  head: () => ({
    meta: [{ title: "Invoices — School dashboard" }, { name: "robots", content: "noindex" }],
  }),
  component: SchoolInvoicesPage,
});

interface InvoiceRow {
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

function statusOf(inv: InvoiceRow): { label: string; tone: BadgeTone; overdue: boolean } {
  const remaining = Number(inv.total_amount) - Number(inv.amount_paid);
  const overdue =
    remaining > 0 && new Date(inv.due_date) < new Date(new Date().toISOString().slice(0, 10));
  if (Number(inv.amount_paid) <= 0) return { label: "Unpaid", tone: "danger", overdue };
  if (Number(inv.amount_paid) < Number(inv.total_amount))
    return { label: "Partially paid", tone: "warning", overdue };
  return { label: "Paid", tone: "success", overdue: false };
}

const PAGE_SIZE = 15;

function SchoolInvoicesPage() {
  const { schoolId } = useSchoolSession();
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [schoolName, setSchoolName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      let q = supabase
        .from("invoices")
        .select(
          "id, invoice_number, school_id, billing_month, active_student_count, rate_per_student, total_amount, arrears_amount, arrears_note, amount_paid, due_date, generated_at, notes",
        )
        .order("generated_at", { ascending: false });
      if (schoolId) q = q.eq("school_id", schoolId);
      const [{ data, error }, { data: sc }] = await Promise.all([
        q,
        schoolId
          ? supabase.from("schools").select("name").eq("id", schoolId).maybeSingle()
          : Promise.resolve({ data: null as { name: string } | null }),
      ]);
      if (error) setErr(toSafeErrorMessage(error, "Could not load invoices."));
      setRows(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((data ?? []) as any[]).map((r) => ({
          ...r,
          active_student_count: Number(r.active_student_count),
          rate_per_student: Number(r.rate_per_student),
          total_amount: Number(r.total_amount ?? 0),
          arrears_amount: Number(r.arrears_amount ?? 0),
          amount_paid: Number(r.amount_paid ?? 0),
        })) as InvoiceRow[],
      );
      setSchoolName((sc?.name as string | undefined) ?? "");
      setLoading(false);
    })();
  }, [schoolId]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [rows, page],
  );

  async function downloadPdf(inv: InvoiceRow) {
    setDownloadingId(inv.id);
    try {
      const [{ data: sc }, { data: cs }] = await Promise.all([
        supabase
          .from("schools")
          .select("name, address, project_start_date")
          .eq("id", inv.school_id)
          .maybeSingle(),
        supabase
          .from("company_settings")
          .select("bank_name, account_title, account_number, iban")
          .limit(1)
          .maybeSingle(),
      ]);
      const remaining = Math.max(0, Number(inv.total_amount) - Number(inv.amount_paid));
      await generateInvoicePdf({
        invoice_number: inv.invoice_number,
        generated_at: inv.generated_at,
        due_date: inv.due_date,
        billing_month: inv.billing_month,
        school_name: (sc?.name as string) ?? schoolName ?? "School",
        school_address: (sc?.address as string | null) ?? null,
        project_start_date: (sc?.project_start_date as string | null) ?? null,
        active_student_count: inv.active_student_count,
        rate_per_student: inv.rate_per_student,
        total_amount: Number(inv.total_amount),
        arrears_amount: Number(inv.arrears_amount),
        arrears_note: inv.arrears_note,
        amount_paid: Number(inv.amount_paid),
        remaining_balance: remaining,
        notes: inv.notes,
        company: {
          bank_name: (cs?.bank_name as string | null) ?? null,
          account_title: (cs?.account_title as string | null) ?? null,
          account_number: (cs?.account_number as string | null) ?? null,
          iban: (cs?.iban as string | null) ?? null,
        },
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to generate PDF");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="bp-panel p-5">
        <span className="bp-tick-tl" />
        <span className="bp-tick-tr" />
        <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--bp-muted)]">
          School / Invoices
        </div>
        <h1 className="mt-1 font-display text-2xl font-semibold text-[color:var(--bp-ink)]">
          Invoices
        </h1>
        <p className="mt-1 text-sm text-[color:var(--bp-ink-2)]">
          Read-only view of invoices issued to {schoolName || "your school"}. Click an invoice to
          download the PDF.
        </p>
      </header>

      {err && (
        <div className="bp-panel border-[color:var(--bp-danger)] p-3 text-sm text-[color:var(--bp-danger)]">
          {err}
        </div>
      )}

      <section className="bp-panel p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--bp-paper)] text-left font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--bp-muted)]">
              <tr>
                <th className="px-4 py-3">Invoice #</th>
                <th className="px-4 py-3">Billing month</th>
                <th className="px-4 py-3">Students</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Remaining</th>
                <th className="px-4 py-3">Due date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-[color:var(--bp-muted)]">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-[color:var(--bp-muted)]">
                    No invoices yet.
                  </td>
                </tr>
              )}
              {!loading &&
                pageRows.map((inv) => {
                  const remaining = Math.max(0, Number(inv.total_amount) - Number(inv.amount_paid));
                  const st = statusOf(inv);
                  return (
                    <tr
                      key={inv.id}
                      className="border-t border-dashed border-[color:var(--bp-line)]"
                    >
                      <td className="px-4 py-3 font-mono">{inv.invoice_number}</td>
                      <td className="px-4 py-3">{formatBillingMonth(inv.billing_month)}</td>
                      <td className="px-4 py-3">{inv.active_student_count}</td>
                      <td className="px-4 py-3">{formatPKR(Number(inv.total_amount))}</td>
                      <td className="px-4 py-3">{formatPKR(Number(inv.amount_paid))}</td>
                      <td className="px-4 py-3">{formatPKR(remaining)}</td>
                      <td className="px-4 py-3">{formatDate(inv.due_date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge tone={st.tone}>{st.label}</Badge>
                          {st.overdue && <Badge tone="danger">Overdue</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => downloadPdf(inv)}
                          disabled={downloadingId === inv.id}
                          className="rounded-full border border-[color:var(--bp-line-strong)] px-3 py-1 text-xs font-semibold text-[color:var(--bp-ink)] hover:bg-[color:var(--bp-paper)] disabled:opacity-50"
                        >
                          {downloadingId === inv.id ? "Preparing…" : "Download PDF"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {!loading && rows.length > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-dashed border-[color:var(--bp-line)] px-4 py-3 text-xs text-[color:var(--bp-muted)]">
            <div>
              Page {page} of {totalPages} — {rows.length} invoices
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-full border border-[color:var(--bp-line-strong)] px-3 py-1 font-semibold text-[color:var(--bp-ink)] disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-full border border-[color:var(--bp-line-strong)] px-3 py-1 font-semibold text-[color:var(--bp-ink)] disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
