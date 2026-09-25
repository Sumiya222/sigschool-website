import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import { formatDate } from "@/lib/format-date";

export const Route = createFileRoute("/dashboard/admin/instructors/")({
  component: InstructorsPage,
});

interface InstructorRow {
  email: string;
  user_id: string | null;
  full_name: string | null;
  whitelist_status: "pending" | "approved" | "revoked";
  created_at: string;
  assignments_count: number;
}

function statusPillClass(s: InstructorRow["whitelist_status"]) {
  if (s === "approved") return "bg-emerald-500/10 text-emerald-300";
  if (s === "revoked") return "bg-red-500/10 text-red-300";
  return "bg-amber-500/10 text-amber-300";
}

const PAGE_SIZE = 10;

function InstructorsPage() {
  const [rows, setRows] = useState<InstructorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  async function refresh() {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase.rpc("admin_list_instructors");
    if (error) setErr(toSafeErrorMessage(error, "Could not load instructors."));
    setRows((data as InstructorRow[]) ?? []);
    setPage(1);
    setLoading(false);
  }
  useEffect(() => {
    refresh();
  }, []);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="mx-auto max-w-6xl p-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Instructors</h1>
          <p className="mt-1 text-sm text-slate-400">
            All whitelisted instructor accounts. Click a row to manage assignments, view activity,
            or change status. Add new instructors on the Whitelist screen.
          </p>
        </div>
        <button
          onClick={refresh}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600 hover:text-slate-100"
        >
          Refresh
        </button>
      </header>

      <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60">
        {err && (
          <div className="border-b border-red-900/60 bg-red-950/40 px-6 py-2 text-sm text-red-300">
            {err}
          </div>
        )}
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No whitelisted instructors yet. Add one on the Whitelist screen.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-950/60 text-left text-[11px] uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-6 py-3 font-semibold">Name</th>
                  <th className="px-6 py-3 font-semibold">Email</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Account</th>
                  <th className="px-6 py-3 font-semibold">Assignments</th>
                  <th className="px-6 py-3 font-semibold">Date added</th>
                  <th className="px-6 py-3 font-semibold text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {pageRows.map((r) => {
                  const hasAccount = !!r.user_id;
                  return (
                    <tr key={r.email} className="hover:bg-slate-800/40">
                      <td className="px-6 py-3 text-slate-100">
                        {r.full_name?.trim() ? (
                          <Link
                            to="/dashboard/admin/instructors/$instructorEmail"
                            params={{ instructorEmail: r.email }}
                            className="text-slate-100 hover:text-indigo-300"
                          >
                            {r.full_name}
                          </Link>
                        ) : (
                          <span className="text-slate-500 italic">Not set yet</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-slate-300">
                        <Link
                          to="/dashboard/admin/instructors/$instructorEmail"
                          params={{ instructorEmail: r.email }}
                          className="hover:text-indigo-300"
                        >
                          {r.email}
                        </Link>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " +
                            statusPillClass(r.whitelist_status)
                          }
                        >
                          {r.whitelist_status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-400">
                        {hasAccount ? (
                          <span className="text-indigo-300">Signed up</span>
                        ) : (
                          <span className="text-slate-500">Awaiting signup</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-slate-200">{r.assignments_count}</td>
                      <td className="px-6 py-3 text-xs text-slate-400">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <Link
                          to="/dashboard/admin/instructors/$instructorEmail"
                          params={{ instructorEmail: r.email }}
                          className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-indigo-500 hover:text-indigo-200"
                        >
                          Open →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
