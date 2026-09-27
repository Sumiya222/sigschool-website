import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BRAND } from "@/lib/brand";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import { verifyRowsAffected } from "@/lib/db-write-verify";
import { formatPKR } from "@/lib/invoice-pdf";
import { formatDate, formatBillingMonth } from "@/lib/format-date";
import { Badge, type BadgeTone } from "@/components/dashboard/Badge";
import { DateField } from "@/components/ui/date-field";

export const Route = createFileRoute("/dashboard/admin/invoices/")({
  component: InvoicesPage,
});

interface InvoiceRow {
  id: string;
  invoice_number: string;
  school_id: string;
  school_name: string;
  billing_month: string;
  total_amount: number;
  amount_paid: number;
  due_date: string;
}

interface CompanySettings {
  id?: string;
  bank_name: string | null;
  account_title: string | null;
  account_number: string | null;
  iban: string | null;
}

function statusOf(inv: InvoiceRow): {
  key: string;
  label: string;
  tone: BadgeTone;
  overdue: boolean;
} {
  const remaining = Number(inv.total_amount) - Number(inv.amount_paid);
  const overdue =
    remaining > 0 && new Date(inv.due_date) < new Date(new Date().toISOString().slice(0, 10));
  if (Number(inv.amount_paid) <= 0) {
    return { key: "unpaid", label: "Unpaid", tone: "danger", overdue };
  }
  if (Number(inv.amount_paid) < Number(inv.total_amount)) {
    return { key: "partially_paid", label: "Partially paid", tone: "warning", overdue };
  }
  return { key: "paid", label: "Paid", tone: "success", overdue: false };
}

function InvoicesPage() {
  const [rows, setRows] = useState<InvoiceRow[]>([]);
  const [schools, setSchools] = useState<
    { id: string; name: string; monthly_rate_per_student: number | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [filterSchool, setFilterSchool] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");

  // generate form
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const defaultDue = new Date(today.getTime() + 15 * 86400000).toISOString().slice(0, 10);
  const [genSchool, setGenSchool] = useState("");
  const [genMonth, setGenMonth] = useState(defaultMonth);
  const [genDue, setGenDue] = useState(defaultDue);
  const [genRate, setGenRate] = useState<string>("");
  const [genNotes, setGenNotes] = useState("");
  const [genArrearsAmount, setGenArrearsAmount] = useState<string>("");
  const [genArrearsNote, setGenArrearsNote] = useState("");
  const [genBusy, setGenBusy] = useState(false);
  const [activeCount, setActiveCount] = useState<number | null>(null);

  // company settings
  const [company, setCompany] = useState<CompanySettings>({
    bank_name: "",
    account_title: "",
    account_number: "",
    iban: "",
  });
  const [companyOpen, setCompanyOpen] = useState(false);
  const [companyBusy, setCompanyBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    setErr(null);
    const [{ data: invs, error: e1 }, { data: sch }, { data: cs }] = await Promise.all([
      supabase
        .from("invoices")
        .select(
          "id, invoice_number, school_id, billing_month, total_amount, amount_paid, due_date, schools(name)",
        )
        .order("generated_at", { ascending: false }),
      supabase
        .from("schools")
        .select("id, name, monthly_rate_per_student")
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("company_settings")
        .select("id, bank_name, account_title, account_number, iban")
        .limit(1)
        .maybeSingle(),
    ]);
    if (e1) {
      setErr(toSafeErrorMessage(e1, "Could not load invoices."));
      setLoading(false);
      return;
    }
    setRows(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (invs ?? []).map((r: any) => {
        const s = Array.isArray(r.schools) ? r.schools[0] : r.schools;
        return {
          id: r.id,
          invoice_number: r.invoice_number,
          school_id: r.school_id,
          school_name: s?.name ?? "—",
          billing_month: r.billing_month,
          total_amount: Number(r.total_amount ?? 0),
          amount_paid: Number(r.amount_paid ?? 0),
          due_date: r.due_date,
        };
      }),
    );
    setSchools(
      (sch ?? []) as { id: string; name: string; monthly_rate_per_student: number | null }[],
    );
    if (cs) setCompany(cs as CompanySettings);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterSchool && r.school_id !== filterSchool) return false;
      if (filterStatus) {
        const s = statusOf(r).key;
        if (filterStatus === "overdue") {
          if (!statusOf(r).overdue) return false;
        } else if (s !== filterStatus) return false;
      }
      if (filterFrom && r.billing_month < filterFrom) return false;
      if (filterTo && r.billing_month > filterTo) return false;
      return true;
    });
  }, [rows, filterSchool, filterStatus, filterFrom, filterTo]);

  // Pagination — 15 per page
  const PAGE_SIZE = 15;
  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [filterSchool, filterStatus, filterFrom, filterTo]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedInvoices = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage],
  );
  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length);

  // Prefill rate + active student count when school is chosen
  useEffect(() => {
    if (!genSchool) {
      setActiveCount(null);
      return;
    }
    const s = schools.find((x) => x.id === genSchool);
    if (s?.monthly_rate_per_student != null && genRate === "") {
      setGenRate(String(Number(s.monthly_rate_per_student)));
    }
    (async () => {
      const { data: secs } = await supabase
        .from("sections")
        .select("id")
        .eq("school_id", genSchool);
      const secIds = (secs ?? []).map((r) => r.id);
      if (secIds.length === 0) {
        setActiveCount(0);
        return;
      }
      const { count } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .in("section_id", secIds)
        .eq("is_active", true);
      setActiveCount(count ?? 0);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genSchool, schools]);

  async function onGenerate() {
    if (!genSchool) {
      alert("Select a school");
      return;
    }
    const rate = Number(genRate);
    if (!(rate > 0)) {
      alert("Enter a per-student rate greater than zero");
      return;
    }
    const arrears = genArrearsAmount.trim() === "" ? 0 : Number(genArrearsAmount);
    if (!(arrears >= 0)) {
      alert("Arrears amount cannot be negative");
      return;
    }
    if (arrears > 0 && genArrearsNote.trim() === "") {
      alert(
        "Enter a note explaining the arrears amount — an unexplained charge needs an explanation.",
      );
      return;
    }
    setGenBusy(true);
    const { data, error } = await supabase.rpc("generate_invoice", {
      _school_id: genSchool,
      _billing_month: genMonth,
      _due_date: genDue,
      _notes: genNotes || undefined,
      _rate_override: rate,
      _arrears_amount: arrears,
      _arrears_note: arrears > 0 ? genArrearsNote.trim() : undefined,
    });
    setGenBusy(false);
    if (error) {
      const msg = error.message || "";
      const dup = msg.match(/DUPLICATE:([0-9a-f-]+)/i);
      if (dup) {
        if (confirm("An invoice for this school and billing month already exists. Open it?")) {
          window.location.href = `/dashboard/admin/invoices/${dup[1]}`;
        }
        return;
      }
      alert(toSafeErrorMessage(error, "Could not generate that invoice."));
      return;
    }
    setGenNotes("");
    setGenArrearsAmount("");
    setGenArrearsNote("");
    refresh();
    if (data) window.location.href = `/dashboard/admin/invoices/${data}`;
  }

  async function saveCompany() {
    setCompanyBusy(true);
    const payload = {
      singleton: true,
      bank_name: company.bank_name,
      account_title: company.account_title,
      account_number: company.account_number,
      iban: company.iban,
    };
    const { error } = company.id
      ? await verifyRowsAffected(
          supabase.from("company_settings").update(payload).eq("id", company.id),
        )
      : await supabase.from("company_settings").upsert(payload, { onConflict: "singleton" });
    setCompanyBusy(false);
    if (error) {
      alert(toSafeErrorMessage(error, "Could not save those company details."));
      return;
    }
    refresh();
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Invoices</h1>
          <p className="mt-1 text-sm text-slate-400">
            Generate monthly invoices per school, track partial payments, and download branded PDFs.
          </p>
        </div>
        <button
          onClick={() => setCompanyOpen((v) => !v)}
          className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-600 hover:text-slate-100"
        >
          {companyOpen ? "Hide" : "Edit"} bank details
        </button>
      </header>

      {companyOpen && (
        <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-sm font-semibold text-slate-200">{BRAND.name} bank details</h2>
          <p className="mt-1 text-xs text-slate-400">
            Shown on every generated invoice PDF. Editable — no code change required.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-300">
              Bank name
              <input
                value={company.bank_name ?? ""}
                onChange={(e) => setCompany({ ...company, bank_name: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
              />
            </label>
            <label className="text-xs text-slate-300">
              Account title
              <input
                value={company.account_title ?? ""}
                onChange={(e) => setCompany({ ...company, account_title: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
              />
            </label>
            <label className="text-xs text-slate-300">
              Account number
              <input
                value={company.account_number ?? ""}
                onChange={(e) => setCompany({ ...company, account_number: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
              />
            </label>
            <label className="text-xs text-slate-300">
              IBAN
              <input
                value={company.iban ?? ""}
                onChange={(e) => setCompany({ ...company, iban: e.target.value })}
                className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
              />
            </label>
          </div>
          <div className="mt-4">
            <button
              onClick={saveCompany}
              disabled={companyBusy}
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-60"
            >
              {companyBusy ? "Saving…" : "Save"}
            </button>
          </div>
        </section>
      )}

      <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-sm font-semibold text-slate-200">Generate invoice</h2>
        <p className="mt-1 text-xs text-slate-400">
          Snapshots the school's currently active student count. Enter the per-student rate for this
          invoice — it defaults to the school's saved rate but can be overridden here.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="text-xs text-slate-300 md:col-span-2">
            School
            <select
              value={genSchool}
              onChange={(e) => setGenSchool(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            >
              <option value="">Select…</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.monthly_rate_per_student
                    ? ` — default ${formatPKR(Number(s.monthly_rate_per_student))}/student`
                    : " — no default rate"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-slate-300">
            Rate per student (PKR)
            <input
              type="number"
              min="0"
              step="1"
              value={genRate}
              onChange={(e) => setGenRate(e.target.value)}
              placeholder="e.g. 3500"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            />
          </label>
          <label className="text-xs text-slate-300">
            Billing month
            <input
              type="month"
              value={genMonth}
              onChange={(e) => setGenMonth(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            />
          </label>
          <label className="text-xs text-slate-300">
            Due date
            <div className="mt-1">
              <DateField value={genDue} onChange={setGenDue} />
            </div>
          </label>
          <label className="text-xs text-slate-300">
            Notes (optional)
            <input
              value={genNotes}
              onChange={(e) => setGenNotes(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            />
          </label>
          <label className="text-xs text-slate-300">
            Arrears amount (optional)
            <input
              type="number"
              min="0"
              step="1"
              value={genArrearsAmount}
              onChange={(e) => setGenArrearsAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            />
          </label>
          <label className="text-xs text-slate-300 md:col-span-2">
            Arrears note{" "}
            {Number(genArrearsAmount) > 0 ? (
              <span className="text-amber-400">— required</span>
            ) : (
              "(optional)"
            )}
            <input
              value={genArrearsNote}
              onChange={(e) => setGenArrearsNote(e.target.value)}
              placeholder="Why this school owes a carried-forward amount"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
            />
          </label>
        </div>
        {genSchool && (
          <div className="mt-4 rounded-lg border border-indigo-900/60 bg-indigo-950/30 px-4 py-3 text-xs text-indigo-200">
            {activeCount === null ? (
              "Counting active students…"
            ) : (
              <>
                <span className="text-slate-300">Preview: </span>
                <span className="font-semibold">{activeCount}</span> active students
                {Number(genRate) > 0 && (
                  <>
                    {" "}
                    × <span className="font-semibold">{formatPKR(Number(genRate))}</span>
                    {Number(genArrearsAmount) > 0 && (
                      <>
                        {" "}
                        +{" "}
                        <span className="font-semibold">
                          {formatPKR(Number(genArrearsAmount))}
                        </span>{" "}
                        arrears
                      </>
                    )}{" "}
                    ={" "}
                    <span className="font-semibold text-indigo-100">
                      {formatPKR(
                        activeCount * Number(genRate) +
                          (Number(genArrearsAmount) > 0 ? Number(genArrearsAmount) : 0),
                      )}
                    </span>
                  </>
                )}
              </>
            )}
          </div>
        )}
        <div className="mt-4">
          <button
            onClick={onGenerate}
            disabled={genBusy}
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-60"
          >
            {genBusy ? "Generating…" : "Generate invoice"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:px-6">
          <h2 className="text-sm font-semibold text-slate-200">All invoices</h2>
          <div className="filter-bar sm:ml-auto sm:w-auto">
            <select
              value={filterSchool}
              onChange={(e) => setFilterSchool(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-100 sm:py-1"
            >
              <option value="">All schools</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-100 sm:py-1"
            >
              <option value="">All statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
            <input
              type="month"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-100 sm:py-1"
              placeholder="From"
            />
            <input
              type="month"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-100 sm:py-1"
              placeholder="To"
            />
          </div>
        </div>
        {err && (
          <div className="border-b border-red-900/60 bg-red-950/40 px-6 py-2 text-sm text-red-300">
            {err}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3">Invoice #</th>
                <th className="px-6 py-3">School</th>
                <th className="hidden md:table-cell px-6 py-3">Billing month</th>
                <th className="px-6 py-3">Total</th>
                <th className="hidden lg:table-cell px-6 py-3">Paid</th>
                <th className="hidden sm:table-cell px-6 py-3">Balance</th>
                <th className="hidden lg:table-cell px-6 py-3">Due</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-slate-500">
                    No invoices match.
                  </td>
                </tr>
              ) : (
                pagedInvoices.map((r) => {
                  const s = statusOf(r);
                  const balance = Number(r.total_amount) - Number(r.amount_paid);
                  return (
                    <tr key={r.id} className="text-slate-200">
                      <td className="px-6 py-3 font-mono text-indigo-300">
                        <Link
                          to="/dashboard/admin/invoices/$invoiceId"
                          params={{ invoiceId: r.id }}
                          className="hover:underline"
                        >
                          {r.invoice_number}
                        </Link>
                      </td>
                      <td className="px-6 py-3">{r.school_name}</td>
                      <td className="hidden md:table-cell px-6 py-3">
                        {formatBillingMonth(r.billing_month)}
                      </td>
                      <td className="px-6 py-3">{formatPKR(r.total_amount)}</td>
                      <td className="hidden lg:table-cell px-6 py-3">{formatPKR(r.amount_paid)}</td>
                      <td className="hidden sm:table-cell px-6 py-3 font-medium">
                        {formatPKR(balance)}
                      </td>
                      <td className="hidden lg:table-cell px-6 py-3 text-slate-400">
                        {formatDate(r.due_date)}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone={s.tone}>{s.label}</Badge>
                          {s.overdue && <Badge tone="danger">Overdue</Badge>}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link
                          to="/dashboard/admin/invoices/$invoiceId"
                          params={{ invoiceId: r.id }}
                          className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-slate-600 hover:text-slate-100"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-6 py-3 text-xs text-slate-400">
            <div>
              Showing <span className="text-slate-200">{rangeStart}</span>–
              <span className="text-slate-200">{rangeEnd}</span> of{" "}
              <span className="text-slate-200">{filtered.length}</span> invoices
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="rounded-md border border-slate-700 px-3 py-1 text-slate-200 hover:border-indigo-500 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="px-1">
                Page <span className="text-slate-200">{currentPage}</span> of{" "}
                <span className="text-slate-200">{totalPages}</span>
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="rounded-md border border-slate-700 px-3 py-1 text-slate-200 hover:border-indigo-500 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
