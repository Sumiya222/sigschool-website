import { Fragment as FragmentRow } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fromCaught, toSafeErrorMessage } from "@/lib/db-error-message";
import { verifyRowsAffected } from "@/lib/db-write-verify";
import { formatDate, formatDateTime } from "@/lib/format-date";

export const Route = createFileRoute("/dashboard/admin/instructors/$instructorEmail")({
  component: InstructorDetailPage,
});

type WhitelistStatus = "pending" | "approved" | "revoked";

interface Header {
  email: string;
  user_id: string | null;
  full_name: string | null;
  status: WhitelistStatus;
  created_at: string;
  whitelisted_by: string | null;
  assignments_count: number;
}
interface Assignment {
  id: string;
  section_id: string;
  section_name: string;
  grade: number;
  school_id: string;
  school_name: string;
}
interface School {
  id: string;
  name: string;
}
interface Section {
  id: string;
  school_id: string;
  grade: number;
  section_name: string;
}
interface SessionSummary {
  id: string;
  session_date: string;
}
interface ActivityRow {
  section_id: string;
  school_id: string;
  school_name: string;
  grade: number;
  section_name: string;
  sessions_count: number;
  last_session_date: string | null;
  sessions: SessionSummary[];
}

function statusPill(s: WhitelistStatus) {
  const c =
    s === "approved"
      ? "bg-emerald-500/10 text-emerald-300"
      : s === "revoked"
        ? "bg-red-500/10 text-red-300"
        : "bg-amber-500/10 text-amber-300";
  return (
    <span
      className={"rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " + c}
    >
      {s}
    </span>
  );
}

function InstructorDetailPage() {
  const { instructorEmail } = Route.useParams();
  const email = decodeURIComponent(instructorEmail);

  const [header, setHeader] = useState<Header | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // assign form — bulk: pick a school to filter by, check off any number of
  // its sections, repeat across schools if needed, then assign everything
  // checked in one go. Selection persists across school switches so you can
  // build up a cross-school set before submitting.
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSchoolId, setAssignSchoolId] = useState("");
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(new Set());
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignErr, setAssignErr] = useState<string | null>(null);

  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    setErr(null);
    try {
      const [listRes, byRes, schRes, secRes] = await Promise.all([
        supabase.rpc("admin_list_instructors"),
        supabase.rpc("admin_instructor_whitelisted_by", { _email: email }),
        supabase.from("schools").select("id, name").eq("is_active", true).order("name"),
        supabase
          .from("sections")
          .select("id, school_id, grade, section_name")
          .order("grade")
          .order("section_name"),
      ]);
      if (listRes.error) throw listRes.error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const row = (listRes.data as any[])?.find(
        (r) => r.email.toLowerCase() === email.toLowerCase(),
      );
      if (!row) {
        setErr("Instructor not found.");
        setLoading(false);
        return;
      }
      const hdr: Header = {
        email: row.email,
        user_id: row.user_id,
        full_name: (row.full_name as string | null) ?? null,
        status: row.whitelist_status,
        created_at: row.created_at,
        whitelisted_by: (byRes.data as string | null) ?? null,
        assignments_count: row.assignments_count,
      };
      setHeader(hdr);
      const schoolList = (schRes.data as School[]) ?? [];
      const sectionList = (secRes.data as Section[]) ?? [];
      setSchools(schoolList);
      setSections(sectionList);

      if (hdr.user_id) {
        const [aRes, sRes] = await Promise.all([
          supabase
            .from("instructor_assignments")
            .select("id, section_id")
            .eq("instructor_user_id", hdr.user_id)
            .is("revoked_at", null),
          supabase
            .from("class_sessions")
            .select("id, section_id, session_date")
            .eq("instructor_user_id", hdr.user_id),
        ]);
        const secById: Record<string, Section> = {};
        sectionList.forEach((s) => (secById[s.id] = s));
        const schById: Record<string, School> = {};
        schoolList.forEach((s) => (schById[s.id] = s));

        const asg: Assignment[] = ((aRes.data as { id: string; section_id: string }[]) ?? [])
          .map((a) => {
            const sec = secById[a.section_id];
            if (!sec) return null;
            return {
              id: a.id,
              section_id: a.section_id,
              section_name: sec.section_name,
              grade: sec.grade,
              school_id: sec.school_id,
              school_name: schById[sec.school_id]?.name ?? "—",
            };
          })
          .filter((x): x is Assignment => x !== null);
        setAssignments(asg);

        // aggregate sessions per section
        const bySec: Record<
          string,
          { count: number; last: string | null; sessions: SessionSummary[] }
        > = {};
        ((sRes.data as { id: string; section_id: string; session_date: string }[]) ?? []).forEach(
          (r) => {
            const cur = bySec[r.section_id] ?? { count: 0, last: null, sessions: [] };
            cur.count += 1;
            if (!cur.last || r.session_date > cur.last) cur.last = r.session_date;
            cur.sessions.push({ id: r.id, session_date: r.session_date });
            bySec[r.section_id] = cur;
          },
        );
        // union of assigned sections and sections that have sessions
        const sectionIds = new Set<string>([
          ...asg.map((a) => a.section_id),
          ...Object.keys(bySec),
        ]);
        const act: ActivityRow[] = Array.from(sectionIds).map((sid) => {
          const sec = secById[sid];
          const info = bySec[sid] ?? { count: 0, last: null, sessions: [] };
          return {
            section_id: sid,
            school_id: sec?.school_id ?? "",
            school_name: sec ? (schById[sec.school_id]?.name ?? "—") : "Removed section",
            grade: sec?.grade ?? 0,
            section_name: sec?.section_name ?? "—",
            sessions_count: info.count,
            last_session_date: info.last,
            sessions: info.sessions.sort((a, b) => (a.session_date < b.session_date ? 1 : -1)),
          };
        });
        act.sort(
          (a, b) =>
            b.sessions_count - a.sessions_count || a.school_name.localeCompare(b.school_name),
        );
        setActivity(act);
      } else {
        setAssignments([]);
        setActivity([]);
      }
    } catch (e) {
      setErr(toSafeErrorMessage(fromCaught(e), "Could not load that instructor."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const assignedSectionIds = useMemo(
    () => new Set(assignments.map((a) => a.section_id)),
    [assignments],
  );
  const sectionsForSchool = useMemo(
    () => sections.filter((s) => s.school_id === assignSchoolId && !assignedSectionIds.has(s.id)),
    [sections, assignSchoolId, assignedSectionIds],
  );
  const totalSessions = useMemo(
    () => activity.reduce((n, r) => n + r.sessions_count, 0),
    [activity],
  );

  function toggleSection(sectionId: string) {
    setSelectedSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  async function submitAssignBulk() {
    const instructorUserId = header?.user_id;
    if (!instructorUserId || selectedSectionIds.size === 0) {
      setAssignErr("Pick at least one section.");
      return;
    }
    setAssignBusy(true);
    setAssignErr(null);
    const { data: sessionRes } = await supabase.auth.getSession();
    const assignedBy = sessionRes.session?.user.id ?? null;
    const { error } = await supabase.from("instructor_assignments").insert(
      Array.from(selectedSectionIds).map((sectionId) => ({
        instructor_user_id: instructorUserId,
        section_id: sectionId,
        assigned_by: assignedBy,
      })),
    );
    setAssignBusy(false);
    if (error) {
      setAssignErr(
        error.code === "23505"
          ? "One of the selected sections is already assigned to this instructor — refresh and try again."
          : toSafeErrorMessage(error, "Could not assign those sections."),
      );
      return;
    }
    setAssignOpen(false);
    setAssignSchoolId("");
    setSelectedSectionIds(new Set());
    loadAll();
  }

  async function unassign(a: Assignment) {
    if (!confirm(`Unassign ${email} from Grade ${a.grade} — ${a.section_name} (${a.school_name})?`))
      return;
    // Soft-deactivate rather than delete — recoverable, and keeps the
    // instructor_assignment audit trail meaningful.
    const { error } = await verifyRowsAffected(
      supabase
        .from("instructor_assignments")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", a.id),
    );
    if (error) alert(toSafeErrorMessage(error, "Could not unassign that instructor."));
    else loadAll();
  }

  async function deleteSession(s: SessionSummary) {
    if (
      !confirm(
        `Delete the ${formatDate(s.session_date)} session? This permanently deletes all attendance, marks, and remarks recorded for it — this can't be undone.`,
      )
    )
      return;
    const { error } = await verifyRowsAffected(
      supabase.from("class_sessions").delete().eq("id", s.id),
    );
    if (error) alert(toSafeErrorMessage(error, "Could not delete that session."));
    else loadAll();
  }

  async function changeStatus(next: WhitelistStatus) {
    if (!header) return;
    if (next === "revoked") {
      if (!confirm(`This will immediately block ${header.email}'s access. Are you sure?`)) return;
    }
    setBusy(true);
    try {
      const { adminSetInstructorStatus } = await import("@/lib/admin-revocation.functions");
      await adminSetInstructorStatus({ data: { email: header.email, status: next } });
      loadAll();
    } catch (e) {
      alert(toSafeErrorMessage(fromCaught(e), "Could not update that instructor's status."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="mb-4 text-xs text-slate-400">
        <Link to="/dashboard/admin/instructors" className="hover:text-slate-200">
          ← Back to instructors
        </Link>
      </div>

      {err && (
        <div className="mb-4 rounded-md border border-red-900/60 bg-red-950/40 px-4 py-2 text-sm text-red-300">
          {err}
        </div>
      )}
      {loading || !header ? (
        <div className="p-10 text-center text-sm text-slate-500">Loading…</div>
      ) : (
        <>
          {/* Header */}
          <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-slate-100">
                    {header.full_name?.trim() ? header.full_name : header.email}
                  </h1>
                  {statusPill(header.status)}
                  {!header.user_id && (
                    <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Not signed up yet
                    </span>
                  )}
                </div>
                {header.full_name?.trim() && (
                  <div className="mt-1 text-xs text-slate-400">{header.email}</div>
                )}
                <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1 text-sm text-slate-300 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-slate-500">
                      Date whitelisted
                    </dt>
                    <dd>{formatDateTime(header.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-slate-500">
                      Whitelisted by
                    </dt>
                    <dd>{header.whitelisted_by ?? <span className="text-slate-500">—</span>}</dd>
                  </div>
                </dl>
              </div>
              <div className="flex flex-wrap gap-2">
                {header.status === "approved" && (
                  <button
                    onClick={() => changeStatus("revoked")}
                    disabled={busy}
                    className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    Revoke access
                  </button>
                )}
                {header.status === "revoked" && (
                  <button
                    onClick={() => changeStatus("approved")}
                    disabled={busy}
                    className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    Re-approve
                  </button>
                )}
                {header.status === "pending" && (
                  <button
                    onClick={() => changeStatus("approved")}
                    disabled={busy}
                    className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                  >
                    Approve
                  </button>
                )}
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Whitelist entries cannot be deleted while class sessions or grades are attributed to
              this instructor — revoke access instead to preserve historical result cards.
            </p>
          </section>

          {/* Assignments */}
          <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h2 className="text-sm font-semibold text-slate-200">
                Current assignments ({assignments.length})
              </h2>
              {header.user_id && (
                <button
                  onClick={() => setAssignOpen((o) => !o)}
                  className="rounded-md bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400"
                >
                  {assignOpen ? "Cancel" : "+ Assign to sections"}
                </button>
              )}
            </div>

            {assignOpen && header.user_id && (
              <div className="border-b border-slate-800 bg-slate-950/50 p-4">
                <p className="mb-3 text-xs text-slate-400">
                  Pick a school to browse its sections, check off any number, switch schools if
                  needed — your selections carry over — then assign everything checked at once.
                </p>
                <select
                  value={assignSchoolId}
                  onChange={(e) => setAssignSchoolId(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 md:w-64"
                >
                  <option value="">— school —</option>
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>

                {assignSchoolId && (
                  <div className="mt-3 max-h-56 overflow-y-auto rounded-md border border-slate-800">
                    {sectionsForSchool.length === 0 ? (
                      <div className="p-3 text-xs text-slate-500">
                        No unassigned sections at this school.
                      </div>
                    ) : (
                      <ul className="divide-y divide-slate-800">
                        {sectionsForSchool.map((s) => (
                          <li key={s.id}>
                            <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm text-slate-200 hover:bg-slate-900/60">
                              <input
                                type="checkbox"
                                checked={selectedSectionIds.has(s.id)}
                                onChange={() => toggleSection(s.id)}
                                className="size-3.5"
                              />
                              Grade {s.grade} — {s.section_name}
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className="mt-4 flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {selectedSectionIds.size} section{selectedSectionIds.size === 1 ? "" : "s"}{" "}
                    selected
                  </span>
                  <button
                    onClick={submitAssignBulk}
                    disabled={assignBusy || selectedSectionIds.size === 0}
                    className="rounded-md bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {assignBusy
                      ? "Assigning…"
                      : `Assign ${selectedSectionIds.size || ""} section${selectedSectionIds.size === 1 ? "" : "s"}`}
                  </button>
                </div>
                {assignErr && (
                  <div className="mt-3 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs text-red-300">
                    {assignErr}
                  </div>
                )}
              </div>
            )}

            {!header.user_id ? (
              <div className="p-6 text-sm text-slate-500">
                Assignments unlock after the instructor signs up with this email.
              </div>
            ) : assignments.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">No sections assigned yet.</div>
            ) : (
              <ul className="divide-y divide-slate-800">
                {assignments.map((a) => (
                  <li key={a.id} className="flex items-center justify-between px-6 py-3">
                    <div className="text-sm text-slate-200">
                      {a.school_name} · Grade {a.grade} — {a.section_name}
                    </div>
                    <button
                      onClick={() => unassign(a)}
                      className="rounded-md border border-slate-700 px-3 py-1 text-xs text-red-300 hover:border-red-500/60"
                    >
                      Unassign
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Activity */}
          <section className="rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
              <h2 className="text-sm font-semibold text-slate-200">Activity</h2>
              <span className="text-xs text-slate-400">
                {totalSessions} total session{totalSessions === 1 ? "" : "s"} recorded
              </span>
            </div>
            {!header.user_id ? (
              <div className="p-6 text-sm text-slate-500">
                No activity yet — account not created.
              </div>
            ) : activity.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">
                No class sessions recorded for this instructor yet.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-950/60 text-left text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Section</th>
                    <th className="px-6 py-3 font-semibold">Sessions</th>
                    <th className="px-6 py-3 font-semibold">Most recent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {activity.map((r) => {
                    const isExpanded = expandedSectionId === r.section_id;
                    return (
                      <FragmentRow key={r.section_id}>
                        <tr
                          className={
                            r.sessions_count > 0 ? "cursor-pointer hover:bg-slate-800/40" : ""
                          }
                          onClick={() =>
                            r.sessions_count > 0 &&
                            setExpandedSectionId(isExpanded ? null : r.section_id)
                          }
                        >
                          <td className="px-6 py-3 text-slate-200">
                            {r.sessions_count > 0 && (
                              <span className="mr-1.5 inline-block text-slate-500">
                                {isExpanded ? "▾" : "▸"}
                              </span>
                            )}
                            {r.school_name} · Grade {r.grade} — {r.section_name}
                          </td>
                          <td className="px-6 py-3 text-slate-200">{r.sessions_count}</td>
                          <td className="px-6 py-3 text-xs text-slate-400">
                            {r.last_session_date ? (
                              formatDate(r.last_session_date)
                            ) : (
                              <span className="text-slate-500">Never</span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-slate-950/40">
                            <td colSpan={3} className="px-6 py-3">
                              <Link
                                to="/dashboard/admin/schools/$schoolId/sections/$sectionId/sessions"
                                params={{ schoolId: r.school_id, sectionId: r.section_id }}
                                className="mb-2 inline-block text-xs font-semibold text-indigo-300 hover:text-indigo-200"
                              >
                                Open full sessions page for this section →
                              </Link>
                              <ul className="divide-y divide-slate-800">
                                {r.sessions.map((s) => (
                                  <li key={s.id} className="flex items-center justify-between py-2">
                                    <span className="text-sm text-slate-200">
                                      {formatDate(s.session_date)}
                                    </span>
                                    <button
                                      onClick={() => deleteSession(s)}
                                      className="rounded-md border border-red-900 px-3 py-1 text-xs text-red-300 hover:bg-red-950/40"
                                    >
                                      Delete
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </FragmentRow>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </div>
  );
}
