import { Fragment as FragmentRow } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import { verifyRowsAffected } from "@/lib/db-write-verify";
import { formatDate } from "@/lib/format-date";
import { formatMarks } from "@/lib/format-marks";

export const Route = createFileRoute(
  "/dashboard/admin/schools/$schoolId/sections/$sectionId/sessions",
)({
  component: SectionSessionsPage,
});

interface SectionHeader {
  grade: number;
  section_name: string;
  school_name: string;
}
interface Term {
  id: string;
  name: string;
}
interface SessionRow {
  id: string;
  session_date: string;
  week_number: number | null;
  term_id: string;
  instructor_user_id: string | null;
  present_count: number;
  recorded_count: number;
  roster_count: number;
}
interface RosterStudent {
  id: string;
  full_name: string;
  roll_number: string | null;
}
interface SessionDetailRow {
  student_id: string;
  status: "present" | "absent" | "late" | null;
  score: number | null;
  max_score: number | null;
  remark: string | null;
}

function SectionSessionsPage() {
  const { schoolId, sectionId } = Route.useParams();

  const [header, setHeader] = useState<SectionHeader | null>(null);
  const [terms, setTerms] = useState<Record<string, string>>({});
  const [instructorNames, setInstructorNames] = useState<Record<string, string>>({});
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setErr(null);

    const [secRes, sessRes, termsRes] = await Promise.all([
      supabase
        .from("sections")
        .select("grade, section_name, schools(name)")
        .eq("id", sectionId)
        .maybeSingle(),
      supabase
        .from("class_sessions")
        .select("id, session_date, week_number, term_id, instructor_user_id")
        .eq("section_id", sectionId)
        .order("session_date", { ascending: false }),
      supabase.from("terms").select("id, name"),
    ]);

    if (secRes.error) {
      setErr(toSafeErrorMessage(secRes.error, "Could not load this section."));
      setLoading(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sec = secRes.data as any;
    setHeader(
      sec
        ? {
            grade: sec.grade,
            section_name: sec.section_name,
            school_name: sec.schools?.name ?? "—",
          }
        : null,
    );

    const termMap: Record<string, string> = {};
    for (const t of (termsRes.data as Term[]) ?? []) termMap[t.id] = t.name;
    setTerms(termMap);

    if (sessRes.error) {
      setErr(toSafeErrorMessage(sessRes.error, "Could not load sessions."));
      setLoading(false);
      return;
    }
    const sessList =
      (sessRes.data as {
        id: string;
        session_date: string;
        week_number: number | null;
        term_id: string;
        instructor_user_id: string | null;
      }[]) ?? [];

    const [rosterRes, attRes] = await Promise.all([
      supabase.from("students").select("id").eq("section_id", sectionId).eq("is_active", true),
      sessList.length > 0
        ? supabase
            .from("attendance")
            .select("session_id, status")
            .in(
              "session_id",
              sessList.map((s) => s.id),
            )
        : Promise.resolve({ data: [] as { session_id: string; status: string }[] }),
    ]);
    const rosterCount = (rosterRes.data as { id: string }[] | null)?.length ?? 0;
    const bySession: Record<string, { present: number; recorded: number }> = {};
    for (const a of (attRes.data as { session_id: string; status: string }[] | null) ?? []) {
      const cur = (bySession[a.session_id] ??= { present: 0, recorded: 0 });
      cur.recorded += 1;
      if (a.status === "present") cur.present += 1;
    }

    setSessions(
      sessList.map((s) => ({
        ...s,
        present_count: bySession[s.id]?.present ?? 0,
        recorded_count: bySession[s.id]?.recorded ?? 0,
        roster_count: rosterCount,
      })),
    );

    const instructorIds = Array.from(
      new Set(sessList.map((s) => s.instructor_user_id).filter((x): x is string => !!x)),
    );
    if (instructorIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", instructorIds);
      const nameMap: Record<string, string> = {};
      for (const p of (profs as { user_id: string; full_name: string | null }[]) ?? []) {
        if (p.full_name) nameMap[p.user_id] = p.full_name;
      }
      setInstructorNames(nameMap);
    } else {
      setInstructorNames({});
    }

    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  async function deleteSession(s: SessionRow) {
    if (
      !confirm(
        `Delete the ${formatDate(s.session_date)} session? This permanently deletes all attendance, marks, and remarks recorded for it — this can't be undone.`,
      )
    )
      return;
    const { error } = await verifyRowsAffected(
      supabase.from("class_sessions").delete().eq("id", s.id),
    );
    if (error) {
      alert(toSafeErrorMessage(error, "Could not delete that session."));
      return;
    }
    if (openSessionId === s.id) setOpenSessionId(null);
    refresh();
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="mb-2 text-xs text-slate-500">
        <Link
          to="/dashboard/admin/schools/$schoolId/sections"
          params={{ schoolId }}
          className="hover:text-slate-300"
        >
          ← Back to sections
        </Link>
      </div>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">
          {header ? `Grade ${header.grade} — ${header.section_name}` : "Section"}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {header?.school_name ?? "—"} · every class session recorded for this section
        </p>
      </header>

      {err && (
        <div className="mb-4 rounded-md border border-red-900/60 bg-red-950/40 px-4 py-2 text-sm text-red-300">
          {err}
        </div>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-200">Sessions ({sessions.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Week / Term</th>
                <th className="px-6 py-3">Instructor</th>
                <th className="px-6 py-3">Attendance</th>
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
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    No sessions recorded for this section yet.
                  </td>
                </tr>
              ) : (
                sessions.map((s) => {
                  const isOpen = openSessionId === s.id;
                  return (
                    <FragmentRow key={s.id}>
                      <tr className="text-slate-200">
                        <td className="px-6 py-3">{formatDate(s.session_date)}</td>
                        <td className="px-6 py-3 text-slate-400">
                          Week {s.week_number ?? "?"} · {terms[s.term_id] ?? "—"}
                        </td>
                        <td className="px-6 py-3 text-slate-300">
                          {s.instructor_user_id
                            ? (instructorNames[s.instructor_user_id] ?? "Instructor")
                            : "—"}
                        </td>
                        <td className="px-6 py-3 text-slate-300">
                          {s.recorded_count}/{s.roster_count} recorded
                          {s.recorded_count > 0 && ` · ${s.present_count} present`}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => setOpenSessionId(isOpen ? null : s.id)}
                              className="rounded-md bg-cyan-600 px-3 py-1 text-xs font-semibold text-white hover:bg-cyan-500"
                            >
                              {isOpen ? "Close" : "View"}
                            </button>
                            <button
                              onClick={() => deleteSession(s)}
                              className="rounded-md border border-red-900 px-3 py-1 text-xs text-red-300 hover:bg-red-950/40"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-slate-950/40">
                          <td colSpan={5} className="px-6 py-4">
                            <SessionWindow sectionId={sectionId} sessionId={s.id} />
                          </td>
                        </tr>
                      )}
                    </FragmentRow>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/** Expandable read-only window showing one session's per-student
 * attendance/marks/remarks — opens in place under the clicked row rather
 * than navigating away, so browsing several sessions in a row stays fast. */
function SessionWindow({ sectionId, sessionId }: { sectionId: string; sessionId: string }) {
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [rows, setRows] = useState<Record<string, SessionDetailRow>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      // No is_active filter, deliberately: this is a read-only historical
      // record of a specific past session. A student later deactivated
      // still attended it and still has real attendance/marks/remarks rows
      // pointing at their id -- filtering them out here would make their
      // own recorded history disappear from view.
      const [stRes, aRes, mRes, rRes] = await Promise.all([
        supabase
          .from("students")
          .select("id, full_name, roll_number")
          .eq("section_id", sectionId)
          .order("roll_number", { ascending: true, nullsFirst: false }),
        supabase.from("attendance").select("student_id, status").eq("session_id", sessionId),
        supabase.from("marks").select("student_id, score, max_score").eq("session_id", sessionId),
        supabase.from("remarks").select("student_id, remark_text").eq("session_id", sessionId),
      ]);
      if (stRes.error) {
        setErr(toSafeErrorMessage(stRes.error, "Could not load the roster for this session."));
        setLoading(false);
        return;
      }
      const byStudent: Record<string, SessionDetailRow> = {};
      for (const a of (aRes.data as { student_id: string; status: SessionDetailRow["status"] }[]) ??
        []) {
        byStudent[a.student_id] = {
          student_id: a.student_id,
          status: a.status,
          score: null,
          max_score: null,
          remark: null,
        };
      }
      for (const m of (mRes.data as {
        student_id: string;
        score: number | null;
        max_score: number | null;
      }[]) ?? []) {
        byStudent[m.student_id] = {
          student_id: m.student_id,
          status: byStudent[m.student_id]?.status ?? null,
          score: m.score,
          max_score: m.max_score,
          remark: byStudent[m.student_id]?.remark ?? null,
        };
      }
      for (const r of (rRes.data as { student_id: string; remark_text: string | null }[]) ?? []) {
        byStudent[r.student_id] = {
          student_id: r.student_id,
          status: byStudent[r.student_id]?.status ?? null,
          score: byStudent[r.student_id]?.score ?? null,
          max_score: byStudent[r.student_id]?.max_score ?? null,
          remark: r.remark_text,
        };
      }
      setStudents((stRes.data as RosterStudent[]) ?? []);
      setRows(byStudent);
      setLoading(false);
    })();
  }, [sectionId, sessionId]);

  if (loading) return <div className="py-6 text-center text-sm text-slate-500">Loading…</div>;
  if (err) return <div className="text-sm text-red-300">{err}</div>;
  if (students.length === 0)
    return (
      <div className="py-6 text-center text-sm text-slate-500">No students in this section.</div>
    );

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-2 w-16">Roll</th>
            <th className="px-4 py-2">Student</th>
            <th className="px-4 py-2 w-32">Attendance</th>
            <th className="px-4 py-2 w-32">Mark</th>
            <th className="px-4 py-2">Remark</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {students.map((st) => {
            const r = rows[st.id];
            return (
              <tr key={st.id} className="text-slate-200">
                <td className="px-4 py-2 text-slate-400">{st.roll_number ?? "—"}</td>
                <td className="px-4 py-2">{st.full_name}</td>
                <td className="px-4 py-2">
                  {r?.status ? (
                    <span
                      className={
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " +
                        (r.status === "present"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : r.status === "late"
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-red-500/15 text-red-300")
                      }
                    >
                      {r.status}
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-slate-300">
                  {r?.score != null && r.max_score
                    ? `${formatMarks(r.score)} / ${formatMarks(r.max_score)}`
                    : "—"}
                </td>
                <td className="px-4 py-2 text-slate-300">
                  {r?.remark ? (
                    <span className="whitespace-pre-wrap">{r.remark}</span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
