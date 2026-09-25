import { Fragment as FragmentRow } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import { verifyRowsAffected } from "@/lib/db-write-verify";
import { SectionsBatchEditor } from "@/components/dashboard/SectionsBatchEditor";
import { StudentImportPanel } from "@/components/dashboard/StudentImportPanel";

export const Route = createFileRoute("/dashboard/admin/schools/$schoolId/sections/")({
  component: SchoolSectionsPage,
});

interface SectionRow {
  id: string;
  grade: number;
  section_name: string;
  student_count: number;
}

interface Instructor {
  user_id: string;
  email: string;
  full_name: string | null;
}

interface InstructorAssignment {
  id: string;
  section_id: string;
  instructor_user_id: string;
}

function SchoolSectionsPage() {
  const { schoolId } = Route.useParams();
  const [schoolName, setSchoolName] = useState<string>("");
  const [rows, setRows] = useState<SectionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [enrollSectionId, setEnrollSectionId] = useState<string | null>(null);
  const [manageInstructorsSectionId, setManageInstructorsSectionId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editGrade, setEditGrade] = useState<number>(1);
  const [editName, setEditName] = useState("");

  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [assignmentsBySection, setAssignmentsBySection] = useState<
    Record<string, InstructorAssignment[]>
  >({});
  const [assignInstructorUserId, setAssignInstructorUserId] = useState("");
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignErr, setAssignErr] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setErr(null);
    const [{ data: school }, { data: secs, error: e1 }] = await Promise.all([
      supabase.from("schools").select("name").eq("id", schoolId).maybeSingle(),
      supabase
        .from("sections")
        .select("id, grade, section_name")
        .eq("school_id", schoolId)
        .order("grade")
        .order("section_name"),
    ]);
    setSchoolName(school?.name ?? "");
    if (e1) {
      setErr(toSafeErrorMessage(e1, "Could not load sections."));
      setLoading(false);
      return;
    }
    const ids = (secs ?? []).map((s: { id: string }) => s.id);
    const counts: Record<string, number> = {};
    if (ids.length > 0) {
      // is_active: true -- must match generate_invoice's own count, or
      // this "Students" column disagrees with what the school is billed.
      const { data: studs } = await supabase
        .from("students")
        .select("section_id")
        .in("section_id", ids)
        .eq("is_active", true);
      (studs ?? []).forEach((st: { section_id: string }) => {
        counts[st.section_id] = (counts[st.section_id] ?? 0) + 1;
      });
    }
    setRows(
      (secs ?? []).map((s: { id: string; grade: number; section_name: string }) => ({
        id: s.id,
        grade: s.grade,
        section_name: s.section_name,
        student_count: counts[s.id] ?? 0,
      })),
    );

    const { data: instructorRows } = await supabase.rpc("admin_list_instructors");
    setInstructors(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((instructorRows as any[]) ?? [])
        .filter((r) => r.whitelist_status === "approved" && r.user_id)
        .map((r) => ({ user_id: r.user_id, email: r.email, full_name: r.full_name })),
    );

    if (ids.length > 0) {
      const { data: asg } = await supabase
        .from("instructor_assignments")
        .select("id, section_id, instructor_user_id")
        .in("section_id", ids)
        .is("revoked_at", null);
      const bySection: Record<string, InstructorAssignment[]> = {};
      ((asg as InstructorAssignment[]) ?? []).forEach((a) => {
        (bySection[a.section_id] ??= []).push(a);
      });
      setAssignmentsBySection(bySection);
    } else {
      setAssignmentsBySection({});
    }

    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  function startEdit(r: SectionRow) {
    setEditingId(r.id);
    setEditGrade(r.grade);
    setEditName(r.section_name);
  }

  async function saveEdit(id: string) {
    if (!editName.trim()) {
      alert("Section name is required.");
      return;
    }
    const { error } = await verifyRowsAffected(
      supabase
        .from("sections")
        .update({ grade: editGrade, section_name: editName.trim() })
        .eq("id", id),
    );
    if (error) {
      alert(toSafeErrorMessage(error, "Could not save that section."));
      return;
    }
    setEditingId(null);
    refresh();
  }

  async function onDelete(r: SectionRow) {
    if (r.student_count > 0) {
      alert(
        `Cannot delete Grade ${r.grade} - ${r.section_name} — it has ${r.student_count} student(s) attached. Remove students first.`,
      );
      return;
    }
    if (
      !confirm(
        `Delete Grade ${r.grade} - ${r.section_name}? This will also remove any sessions/attendance/marks for this section.`,
      )
    )
      return;
    const { error } = await verifyRowsAffected(supabase.from("sections").delete().eq("id", r.id));
    if (error) {
      // The student_count check above only catches CURRENTLY-enrolled
      // students. A section with 0 current students can still have real
      // history (past students who transferred out, recorded sessions) that
      // the DB now correctly refuses to delete — give a specific message
      // for that case rather than the generic fallback.
      if (error.code === "23503") {
        alert(
          `Cannot delete Grade ${r.grade} - ${r.section_name} — it still has session or enrollment history attached, even though it has no current students. Historical records can't be deleted this way.`,
        );
      } else {
        alert(toSafeErrorMessage(error, "Could not delete that section."));
      }
    } else refresh();
  }

  function instructorLabel(userId: string): string {
    const inst = instructors.find((i) => i.user_id === userId);
    if (!inst) return "—";
    return inst.full_name?.trim() ? inst.full_name : inst.email;
  }

  async function submitAssignInstructor(sectionId: string) {
    if (!assignInstructorUserId) {
      setAssignErr("Pick an instructor.");
      return;
    }
    setAssignBusy(true);
    setAssignErr(null);
    const { data: sessionRes } = await supabase.auth.getSession();
    const { error } = await supabase.from("instructor_assignments").insert({
      instructor_user_id: assignInstructorUserId,
      section_id: sectionId,
      assigned_by: sessionRes.session?.user.id ?? null,
    });
    setAssignBusy(false);
    if (error) {
      setAssignErr(
        error.code === "23505"
          ? "That instructor is already assigned to this section."
          : toSafeErrorMessage(error, "Could not assign that instructor."),
      );
      return;
    }
    setAssignInstructorUserId("");
    refresh();
  }

  async function unassignInstructor(a: InstructorAssignment, sectionLabel: string) {
    if (!confirm(`Unassign ${instructorLabel(a.instructor_user_id)} from ${sectionLabel}?`)) return;
    // Soft-deactivate rather than delete — recoverable, and keeps the
    // instructor_assignment audit trail meaningful.
    const { error } = await verifyRowsAffected(
      supabase
        .from("instructor_assignments")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", a.id),
    );
    if (error) alert(toSafeErrorMessage(error, "Could not unassign that instructor."));
    else refresh();
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="mb-2 text-xs text-slate-500">
        <Link to="/dashboard/admin/schools" className="hover:text-slate-300">
          ← Back to schools
        </Link>
      </div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">
          {schoolName || "School"} — Sections
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Manage grades and section names within this school.
        </p>
      </header>

      <section className="mb-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Add grades &amp; sections</h2>
            <p className="mt-1 text-xs text-slate-400">
              Add one or many at once. Same duplicate rules as the wizard.
            </p>
          </div>
          {!showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
            >
              + Add Grade/Section
            </button>
          )}
        </div>
        {showAdd && (
          <SectionsBatchEditor
            schoolId={schoolId}
            submitLabel="Save sections"
            onCancel={() => setShowAdd(false)}
            onSaved={() => {
              setShowAdd(false);
              refresh();
            }}
          />
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-200">Current sections</h2>
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
                <th className="px-6 py-3">Grade</th>
                <th className="px-6 py-3">Section</th>
                <th className="px-6 py-3">Students</th>
                <th className="px-6 py-3">Instructor(s)</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    No sections yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <FragmentRow key={r.id}>
                    <tr className="text-slate-200">
                      <td className="px-6 py-3">
                        {editingId === r.id ? (
                          <select
                            value={editGrade}
                            onChange={(e) => setEditGrade(Number(e.target.value))}
                            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((g) => (
                              <option key={g} value={g}>
                                Grade {g}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <>Grade {r.grade}</>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        {editingId === r.id ? (
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
                          />
                        ) : (
                          r.section_name
                        )}
                      </td>
                      <td className="px-6 py-3 text-slate-300">{r.student_count}</td>
                      <td className="px-6 py-3 text-slate-300">
                        {(assignmentsBySection[r.id] ?? []).length === 0 ? (
                          <span className="text-slate-500">— none —</span>
                        ) : (
                          (assignmentsBySection[r.id] ?? [])
                            .map((a) => instructorLabel(a.instructor_user_id))
                            .join(", ")
                        )}
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
                                to="/dashboard/admin/schools/$schoolId/sections/$sectionId/sessions"
                                params={{ schoolId, sectionId: r.id }}
                                className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                              >
                                Sessions
                              </Link>
                              <button
                                onClick={() => {
                                  setManageInstructorsSectionId(
                                    manageInstructorsSectionId === r.id ? null : r.id,
                                  );
                                  setAssignErr(null);
                                  setAssignInstructorUserId("");
                                }}
                                className="rounded-md bg-cyan-600 px-3 py-1 text-xs font-semibold text-white hover:bg-cyan-500"
                              >
                                {manageInstructorsSectionId === r.id ? "Close" : "Instructors"}
                              </button>
                              <button
                                onClick={() =>
                                  setEnrollSectionId(enrollSectionId === r.id ? null : r.id)
                                }
                                className="rounded-md bg-indigo-500 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-400"
                              >
                                {enrollSectionId === r.id ? "Close" : "Enroll students"}
                              </button>
                              <button
                                onClick={() => startEdit(r)}
                                className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-slate-600 hover:text-slate-100"
                              >
                                Edit
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
                    {manageInstructorsSectionId === r.id && (
                      <tr className="bg-slate-950/40">
                        <td colSpan={5} className="px-6 py-4">
                          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Assigned instructors
                          </div>
                          {(assignmentsBySection[r.id] ?? []).length === 0 ? (
                            <div className="mt-2 text-sm text-slate-500">None assigned yet.</div>
                          ) : (
                            <ul className="mt-2 divide-y divide-slate-800">
                              {(assignmentsBySection[r.id] ?? []).map((a) => (
                                <li key={a.id} className="flex items-center justify-between py-2">
                                  <span className="text-sm text-slate-200">
                                    {instructorLabel(a.instructor_user_id)}
                                  </span>
                                  <button
                                    onClick={() =>
                                      unassignInstructor(a, `Grade ${r.grade} - ${r.section_name}`)
                                    }
                                    className="rounded-md border border-slate-700 px-3 py-1 text-xs text-red-300 hover:border-red-500/60"
                                  >
                                    Unassign
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
                            <select
                              value={assignInstructorUserId}
                              onChange={(e) => setAssignInstructorUserId(e.target.value)}
                              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                            >
                              <option value="">— select instructor —</option>
                              {instructors.map((i) => (
                                <option key={i.user_id} value={i.user_id}>
                                  {i.full_name?.trim() ? i.full_name : i.email}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => submitAssignInstructor(r.id)}
                              disabled={assignBusy}
                              className="rounded-md bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-50"
                            >
                              {assignBusy ? "Assigning…" : "Assign"}
                            </button>
                          </div>
                          {assignErr && (
                            <div className="mt-3 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-300">
                              {assignErr}
                            </div>
                          )}
                          {instructors.length === 0 && (
                            <div className="mt-3 text-xs text-slate-500">
                              No approved instructors yet — add one on the Whitelist screen.
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                    {enrollSectionId === r.id && (
                      <tr className="bg-slate-950/40">
                        <td colSpan={5} className="px-6 py-4">
                          <StudentImportPanel
                            sectionId={r.id}
                            sectionLabel={`Grade ${r.grade} - ${r.section_name}`}
                            compact
                            onImported={() => refresh()}
                          />
                        </td>
                      </tr>
                    )}
                  </FragmentRow>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
