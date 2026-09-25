import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fromCaught, toSafeErrorMessage } from "@/lib/db-error-message";
import { verifyRowsAffected } from "@/lib/db-write-verify";
import { AddSchoolWizard } from "@/components/dashboard/AddSchoolWizard";
import { Badge } from "@/components/dashboard/Badge";
import { formatDate } from "@/lib/format-date";
import { DateField } from "@/components/ui/date-field";

export const Route = createFileRoute("/dashboard/admin/schools/")({
  component: SchoolsPage,
});

interface SchoolRow {
  id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  monthly_rate_per_student: number | null;
  project_start_date: string | null;
  sections_count: number;
  students_count: number;
}

function SchoolsPage() {
  const [rows, setRows] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editRate, setEditRate] = useState<string>("");
  const [editStart, setEditStart] = useState<string>("");

  async function refresh() {
    setLoading(true);
    setErr(null);
    let q = supabase
      .from("schools")
      .select("id, name, address, is_active, monthly_rate_per_student, project_start_date")
      .order("name");
    if (!includeInactive) q = q.eq("is_active", true);
    const { data: schools, error: e1 } = await q;
    if (e1) {
      setErr(toSafeErrorMessage(e1, "Could not load schools."));
      setLoading(false);
      return;
    }
    const ids = (schools ?? []).map((s) => s.id);
    const sectionCounts: Record<string, number> = {};
    const studentCounts: Record<string, number> = {};
    if (ids.length > 0) {
      const { data: secs } = await supabase
        .from("sections")
        .select("id, school_id")
        .in("school_id", ids);
      (secs ?? []).forEach((s: { id: string; school_id: string }) => {
        sectionCounts[s.school_id] = (sectionCounts[s.school_id] ?? 0) + 1;
      });
      const secIds = (secs ?? []).map((s: { id: string }) => s.id);
      if (secIds.length > 0) {
        // is_active: true -- must match generate_invoice's own count, or
        // this "Students" column disagrees with what the school is billed.
        const { data: studs } = await supabase
          .from("students")
          .select("section_id")
          .in("section_id", secIds)
          .eq("is_active", true);
        const secToSchool: Record<string, string> = {};
        (secs ?? []).forEach((s: { id: string; school_id: string }) => {
          secToSchool[s.id] = s.school_id;
        });
        (studs ?? []).forEach((st: { section_id: string }) => {
          const schoolId = secToSchool[st.section_id];
          if (schoolId) studentCounts[schoolId] = (studentCounts[schoolId] ?? 0) + 1;
        });
      }
    }
    setRows(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (schools ?? []).map((s: any) => ({
        id: s.id,
        name: s.name,
        address: s.address,
        is_active: s.is_active ?? true,
        monthly_rate_per_student:
          s.monthly_rate_per_student != null ? Number(s.monthly_rate_per_student) : null,
        project_start_date: s.project_start_date ?? null,
        sections_count: sectionCounts[s.id] ?? 0,
        students_count: studentCounts[s.id] ?? 0,
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includeInactive]);

  function startEdit(r: SchoolRow) {
    setEditingId(r.id);
    setEditName(r.name);
    setEditAddress(r.address ?? "");
    setEditRate(r.monthly_rate_per_student != null ? String(r.monthly_rate_per_student) : "");
    setEditStart(r.project_start_date ?? "");
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) {
      alert("School name is required.");
      return;
    }
    const rateNum = editRate.trim() === "" ? null : Number(editRate);
    if (rateNum != null && (Number.isNaN(rateNum) || rateNum < 0)) {
      alert("Monthly rate must be a non-negative number");
      return;
    }
    const { error } = await verifyRowsAffected(
      supabase
        .from("schools")
        .update({
          name: editName.trim(),
          address: editAddress.trim() || null,
          monthly_rate_per_student: rateNum,
          project_start_date: editStart || null,
        })
        .eq("id", id),
    );
    if (error) {
      alert(toSafeErrorMessage(error, "Could not save that school."));
      return;
    }
    setEditingId(null);
    refresh();
  }

  async function toggleActive(r: SchoolRow) {
    const next = !r.is_active;
    const msg = next
      ? `Reactivate "${r.name}"? It will reappear in instructor and school views.`
      : `Deactivate "${r.name}"? It will be hidden from instructor and school views and new-assignment dropdowns. All historical data (sections, students, sessions) is preserved and can be reactivated later.`;
    if (!confirm(msg)) return;
    try {
      const { adminSetSchoolActive } = await import("@/lib/admin-revocation.functions");
      const result = await adminSetSchoolActive({ data: { schoolId: r.id, isActive: next } });
      if (result.usersFailed.length > 0) {
        alert(
          `"${r.name}" is now ${next ? "active" : "inactive"}, but ${result.usersFailed.length} of ${
            result.usersFailed.length + result.usersUpdated
          } linked user(s) could not be updated and may still be able to sign in under the old status. Try again shortly — if it keeps happening, check the server logs for the affected user ids.`,
        );
      }
      refresh();
    } catch (e) {
      alert(toSafeErrorMessage(fromCaught(e), "Could not change that school's status."));
    }
  }

  async function onDelete(r: SchoolRow) {
    if (r.sections_count > 0 || r.students_count > 0) {
      alert(
        `Cannot delete "${r.name}" — it has ${r.sections_count} section(s) and ${r.students_count} student(s) attached. Deactivate it instead to preserve historical data.`,
      );
      return;
    }
    if (
      !confirm(
        `Delete school "${r.name}"? This cannot be undone. To preserve historical data, use Deactivate instead.`,
      )
    )
      return;
    const { error } = await verifyRowsAffected(supabase.from("schools").delete().eq("id", r.id));
    if (error) alert(toSafeErrorMessage(error, "Could not delete that school."));
    else refresh();
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">Schools</h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage partner schools, their sections, and rosters.
        </p>
      </header>

      <section className="mb-8 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Add a new school</h2>
          <p className="mt-1 text-xs text-slate-400">
            Launch the guided wizard: school → grades &amp; sections → student rosters.
          </p>
        </div>
        <button
          onClick={() => setWizardOpen(true)}
          className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
        >
          + Add New School
        </button>
      </section>

      {wizardOpen && <AddSchoolWizard onClose={() => setWizardOpen(false)} onFinished={refresh} />}

      <section className="rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-200">
            {includeInactive ? "All schools" : "Active schools"}
          </h2>
          <div className="flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="h-3.5 w-3.5 accent-indigo-500"
              />
              Include inactive
            </label>
            <button
              onClick={refresh}
              className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-slate-600 hover:text-slate-100"
            >
              Refresh
            </button>
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
                <th className="px-6 py-3">Name</th>
                <th className="hidden lg:table-cell px-6 py-3">Address</th>
                <th className="hidden md:table-cell px-6 py-3">Billing</th>
                <th className="hidden sm:table-cell px-6 py-3">Sections</th>
                <th className="hidden sm:table-cell px-6 py-3">Students</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                    No schools yet.
                  </td>
                </tr>
              ) : (
                rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((r) => (
                  <tr key={r.id} className={"text-slate-200 " + (r.is_active ? "" : "opacity-60")}>
                    <td className="px-6 py-3">
                      {editingId === r.id ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                        />
                      ) : (
                        <Link
                          to="/dashboard/admin/schools/$schoolId/sections"
                          params={{ schoolId: r.id }}
                          className="font-medium text-indigo-300 hover:text-indigo-200 hover:underline"
                        >
                          {r.name}
                        </Link>
                      )}
                    </td>
                    <td className="hidden lg:table-cell px-6 py-3 text-slate-400">
                      {editingId === r.id ? (
                        <input
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                        />
                      ) : (
                        (r.address ?? "—")
                      )}
                    </td>
                    <td className="hidden md:table-cell px-6 py-3 text-slate-400">
                      {editingId === r.id ? (
                        <div className="space-y-1">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Rate/student"
                            value={editRate}
                            onChange={(e) => setEditRate(e.target.value)}
                            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
                          />
                          <DateField
                            value={editStart}
                            onChange={setEditStart}
                            className="text-xs h-8"
                          />
                        </div>
                      ) : (
                        <div className="text-xs">
                          <div>
                            {r.monthly_rate_per_student != null
                              ? `PKR ${r.monthly_rate_per_student.toLocaleString("en-PK")}/student`
                              : "No rate set"}
                          </div>
                          <div className="text-slate-500">
                            {r.project_start_date
                              ? `Start ${formatDate(r.project_start_date)}`
                              : "No start date"}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="hidden sm:table-cell px-6 py-3 text-slate-300">
                      {r.sections_count}
                    </td>
                    <td className="hidden sm:table-cell px-6 py-3 text-slate-300">
                      {r.students_count}
                    </td>
                    <td className="px-6 py-3">
                      <Badge tone={r.is_active ? "success" : "neutral"}>
                        {r.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="inline-flex gap-2">
                        {editingId === r.id ? (
                          <>
                            <button
                              onClick={() => saveEdit(r.id)}
                              className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-400"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-slate-600"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <Link
                              to="/dashboard/admin/schools/$schoolId/sections"
                              params={{ schoolId: r.id }}
                              className="rounded-md bg-indigo-500 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-400"
                            >
                              Grades & Sections
                            </Link>
                            <button
                              onClick={() => startEdit(r)}
                              className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-slate-600 hover:text-slate-100"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleActive(r)}
                              className={
                                "rounded-md border px-3 py-1 text-xs " +
                                (r.is_active
                                  ? "border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                                  : "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10")
                              }
                            >
                              {r.is_active ? "Deactivate" : "Reactivate"}
                            </button>
                            <button
                              onClick={() => onDelete(r)}
                              className="rounded-md border border-red-900 px-3 py-1 text-xs text-red-300 hover:bg-red-950/40"
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-6 py-3 text-xs text-slate-400">
            <span>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, rows.length)} of{" "}
              {rows.length}
            </span>
            <div className="inline-flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-slate-700 px-3 py-1 text-slate-300 hover:border-slate-600 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Prev
              </button>
              <span className="px-2 py-1 text-slate-500">
                Page {page} of {Math.max(1, Math.ceil(rows.length / PAGE_SIZE))}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(Math.ceil(rows.length / PAGE_SIZE), p + 1))}
                disabled={page >= Math.ceil(rows.length / PAGE_SIZE)}
                className="rounded-md border border-slate-700 px-3 py-1 text-slate-300 hover:border-slate-600 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
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
