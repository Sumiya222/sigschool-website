import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import { formatDateTime } from "@/lib/format-date";
import { DateField } from "@/components/ui/date-field";
import { formatPKR } from "@/lib/invoice-pdf";

export const Route = createFileRoute("/dashboard/admin/audit-log")({
  component: AuditLogPage,
});

interface LogRow {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action_type: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, string> = {
  whitelist_added: "Whitelist — added",
  whitelist_revoked: "Whitelist — revoked",
  whitelist_reapproved: "Whitelist — re-approved",
  whitelist_approved: "Whitelist — approved",
  whitelist_status_changed: "Whitelist — status changed",
  whitelist_deleted: "Whitelist — deleted",
  instructor_assigned: "Instructor — assigned",
  instructor_unassigned: "Instructor — unassigned",
  school_created: "School — created",
  school_edited: "School — edited",
  school_activated: "School — activated",
  school_deactivated: "School — deactivated",
  school_deleted: "School — deleted",
  term_created: "Term — created",
  term_activated: "Term — activated",
  term_deleted: "Term — deleted",
  invoice_deleted: "Invoice — deleted",
  payment_deleted: "Payment — deleted",
};

function describeTarget(row: LogRow): string {
  const d = row.details ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyD = d as Record<string, any>;
  switch (row.target_type) {
    case "whitelist":
      return `${anyD.email ?? "—"} (${anyD.role ?? "?"})`;
    case "school":
      return String(anyD.name ?? row.target_id ?? "—");
    case "term":
      return String(anyD.name ?? row.target_id ?? "—");
    case "instructor_assignment":
      return `${anyD.instructor_email ?? "?"} → ${anyD.school_name ?? "?"} · G${anyD.grade ?? "?"} ${anyD.section_name ?? ""}`;
    case "invoice":
      return `${anyD.invoice_number ?? "?"} — ${anyD.school_name ?? "?"} (${formatPKR(Number(anyD.total_amount ?? 0))} total, ${formatPKR(Number(anyD.amount_paid ?? 0))} paid)`;
    case "payment":
      return `${formatPKR(Number(anyD.amount ?? 0))} on ${anyD.invoice_number ?? "?"}`;
    default:
      return row.target_id ?? "—";
  }
}

const PAGE_SIZE = 10;

function AuditLogPage() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [actionType, setActionType] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  async function refresh() {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase.rpc("admin_list_audit_log", {
      _action_type: (actionType || null) as unknown as string,
      _from: (fromDate
        ? new Date(fromDate + "T00:00:00").toISOString()
        : null) as unknown as string,
      _to: (toDate ? new Date(toDate + "T23:59:59").toISOString() : null) as unknown as string,
      _limit: 500,
    });
    if (error) setErr(toSafeErrorMessage(error, "Could not load the audit log."));
    setRows((data as LogRow[]) ?? []);
    setPage(1);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actionOptions = useMemo(() => Object.keys(ACTION_LABELS).sort(), []);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-6xl p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">Audit log</h1>
        <p className="mt-1 text-sm text-slate-400">
          Read-only history of admin actions. Log entries cannot be edited or deleted.
        </p>
      </header>

      <section className="mb-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <select
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">All actions</option>
            {actionOptions.map((a) => (
              <option key={a} value={a}>
                {ACTION_LABELS[a] ?? a}
              </option>
            ))}
          </select>
          <DateField
            value={fromDate}
            onChange={setFromDate}
            placeholder="From date"
            className="w-[180px]"
          />
          <DateField
            value={toDate}
            onChange={setToDate}
            placeholder="To date"
            className="w-[180px]"
          />
          <button
            onClick={refresh}
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
          >
            Apply
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60">
        {err && (
          <div className="border-b border-red-900/60 bg-red-950/40 px-6 py-2 text-sm text-red-300">
            {err}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Admin</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                    No log entries.
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr key={r.id} className="text-slate-200">
                    <td className="px-6 py-3 whitespace-nowrap text-xs text-slate-400">
                      {formatDateTime(r.created_at)}
                    </td>
                    <td className="px-6 py-3 text-slate-300">
                      {r.actor_email ?? <span className="text-slate-500">system</span>}
                    </td>
                    <td className="px-6 py-3">
                      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-200">
                        {ACTION_LABELS[r.action_type] ?? r.action_type}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-300">{describeTarget(r)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 bg-slate-950/40 px-6 py-3 text-xs text-slate-400">
            <div>
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, rows.length)} of {rows.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-md border border-slate-700 px-3 py-1 text-slate-300 hover:border-slate-600 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="text-slate-500">
                Page {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-md border border-slate-700 px-3 py-1 text-slate-300 hover:border-slate-600 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
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
