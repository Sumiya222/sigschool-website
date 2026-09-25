import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import { verifyRowsAffected } from "@/lib/db-write-verify";
import { downloadStudentProfilePdf, type ProfileSessionRow } from "@/lib/student-profile-pdf";
import { formatDate } from "@/lib/format-date";
import { formatMarks } from "@/lib/format-marks";

type Role = "admin" | "instructor" | "school";

interface Student {
  id: string;
  full_name: string;
  roll_number: string | null;
  notes: string | null;
  is_active: boolean;
  section_id: string;
  section: {
    id: string;
    grade: number;
    section_name: string;
    school: { id: string; name: string } | null;
  } | null;
}
interface Term {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}
interface EnrollmentRow {
  id: string;
  academic_year: string;
  grade: number;
  start_date: string;
  end_date: string | null;
  section_id: string | null;
  section_name: string | null;
  school_name: string | null;
}
interface SessionRow {
  id: string;
  session_date: string;
  week_number: number | null;
  term_id: string;
  section_id: string;
}
interface AttRow {
  session_id: string;
  status: "present" | "absent" | "late";
}
interface MarkRow {
  session_id: string;
  score: number | null;
  max_score: number | null;
}
interface RemarkRow {
  session_id: string;
  remark_text: string | null;
  created_at: string;
}

interface Props {
  studentId: string;
  role: Role;
  backTo: string;
  backLabel: string;
}

export function StudentProfile({ studentId, role, backTo, backLabel }: Props) {
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [history, setHistory] = useState<EnrollmentRow[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [termId, setTermId] = useState<string>("");
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [att, setAtt] = useState<AttRow[]>([]);
  const [marks, setMarks] = useState<MarkRow[]>([]);
  const [remarks, setRemarks] = useState<RemarkRow[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // edit state (instructor)
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editRoll, setEditRoll] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  async function loadStudent() {
    setLoading(true);
    // No is_active filter, deliberately: this profile IS how an admin views
    // and toggles a student's active state, so it must load regardless of
    // the current value.
    const { data } = await supabase
      .from("students")
      .select(
        "id, full_name, roll_number, notes, is_active, section_id, section:section_id(id, grade, section_name, school:school_id(id, name))",
      )
      .eq("id", studentId)
      .maybeSingle();
    if (!data) {
      setDenied(true);
      setLoading(false);
      return;
    }
    setStudent(data as unknown as Student);
    const [histRes, termsRes] = await Promise.all([
      supabase
        .from("enrollment_history")
        .select(
          "id, academic_year, grade, section_id, start_date, end_date, sections(section_name, schools(name))",
        )
        .eq("student_id", studentId)
        .order("start_date", { ascending: true }),
      supabase
        .from("terms")
        .select("id, name, start_date, end_date, is_active")
        .order("start_date", { ascending: false }),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hist: EnrollmentRow[] = ((histRes.data as any[]) ?? []).map((r) => ({
      id: r.id,
      academic_year: r.academic_year,
      grade: r.grade,
      start_date: r.start_date,
      end_date: r.end_date,
      section_id: r.section_id ?? null,
      section_name: r.sections?.section_name ?? null,
      school_name: r.sections?.schools?.name ?? null,
    }));
    setHistory(hist);
    const tt = (termsRes.data as Term[]) ?? [];
    setTerms(tt);
    const active = tt.find((t) => t.is_active) ?? tt[0];
    if (active) setTermId(active.id);
    setLoading(false);
  }

  useEffect(() => {
    loadStudent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  useEffect(() => {
    if (!student || !termId) return;
    setDetailLoading(true);
    (async () => {
      // For "All Terms" mode, collect every section the student has been in
      // (from enrollment_history), plus their current section.
      let sessionQuery = supabase
        .from("class_sessions")
        .select("id, session_date, week_number, term_id, section_id")
        .order("session_date", { ascending: true });

      if (termId === "all") {
        const historySectionIds = Array.from(
          new Set(
            [
              student.section_id,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ...(history.map((h: any) => h.section_id).filter(Boolean) as string[]),
            ].filter(Boolean),
          ),
        );
        // Fallback: if history didn't include section_id, at least include current.
        sessionQuery = sessionQuery.in(
          "section_id",
          historySectionIds.length > 0 ? historySectionIds : [student.section_id],
        );
      } else {
        // Term-scoped view: use enrollment_history to find which section(s)
        // the student was actually in during this term (handles promotions).
        const term = terms.find((t) => t.id === termId);
        let sectionIdsForTerm: string[] = [];
        if (term) {
          sectionIdsForTerm = Array.from(
            new Set(
              history
                .filter((h) => {
                  if (!h.section_id) return false;
                  // overlap: enrollment.start <= term.end AND (enrollment.end IS NULL OR enrollment.end >= term.start)
                  if (h.start_date > term.end_date) return false;
                  if (h.end_date && h.end_date < term.start_date) return false;
                  return true;
                })
                .map((h) => h.section_id as string),
            ),
          );
        }
        // Fallback to current section if no enrollment_history row overlaps
        // (e.g. legacy data where history was never seeded).
        if (sectionIdsForTerm.length === 0) sectionIdsForTerm = [student.section_id];
        sessionQuery = sessionQuery.in("section_id", sectionIdsForTerm).eq("term_id", termId);
      }

      const { data: sess } = await sessionQuery;
      const s = (sess as SessionRow[]) ?? [];
      setSessions(s);
      const ids = s.map((x) => x.id);
      if (ids.length === 0) {
        setAtt([]);
        setMarks([]);
        setRemarks([]);
        setDetailLoading(false);
        return;
      }
      const [a, m, r] = await Promise.all([
        supabase
          .from("attendance")
          .select("session_id, status")
          .eq("student_id", studentId)
          .in("session_id", ids),
        supabase
          .from("marks")
          .select("session_id, score, max_score")
          .eq("student_id", studentId)
          .in("session_id", ids),
        supabase
          .from("remarks")
          .select("session_id, remark_text, created_at")
          .eq("student_id", studentId)
          .in("session_id", ids)
          .order("created_at", { ascending: true }),
      ]);
      setAtt((a.data as AttRow[]) ?? []);
      setMarks((m.data as MarkRow[]) ?? []);
      setRemarks((r.data as RemarkRow[]) ?? []);
      setDetailLoading(false);
    })();
  }, [student, termId, studentId, history]);

  const summary = useMemo(() => {
    const totalSessions = sessions.length;
    const attBySession = new Map(att.map((a) => [a.session_id, a.status]));
    const marksBySession = new Map(marks.map((m) => [m.session_id, m]));
    const remarksBySession = new Map<string, string>();
    for (const r of remarks) {
      if (!r.remark_text) continue;
      const prev = remarksBySession.get(r.session_id);
      remarksBySession.set(r.session_id, prev ? `${prev} • ${r.remark_text}` : r.remark_text);
    }
    let present = 0;
    let attCount = 0;
    for (const s of sessions) {
      const st = attBySession.get(s.id);
      if (!st) continue;
      attCount++;
      if (st === "present") present++;
    }
    let obtained = 0;
    let totalMax = 0;
    for (const m of marks) {
      if (m.score == null || !m.max_score) continue;
      obtained += m.score;
      totalMax += m.max_score;
    }
    return {
      totalSessions,
      attCount,
      present,
      attPercent: attCount > 0 ? (present / attCount) * 100 : null,
      obtained,
      totalMax,
      avgPercent: totalMax > 0 ? (obtained / totalMax) * 100 : null,
      attBySession,
      marksBySession,
      remarksBySession,
    };
  }, [sessions, att, marks, remarks]);

  async function onDeactivateToggle() {
    if (!student) return;
    if (student.is_active) {
      if (
        !confirm(
          `Deactivate "${student.full_name}"?\n\nThey will be hidden from active rosters but historical records remain intact.`,
        )
      )
        return;
    }
    const { error } = await verifyRowsAffected(
      supabase.from("students").update({ is_active: !student.is_active }).eq("id", student.id),
    );
    if (error) alert(toSafeErrorMessage(error, "Could not update that student."));
    else loadStudent();
  }

  function beginEdit() {
    if (!student) return;
    setEditName(student.full_name);
    setEditRoll(student.roll_number ?? "");
    setEditNotes(student.notes ?? "");
    setSaveErr(null);
    setEditing(true);
  }

  async function saveEdit() {
    if (!student) return;
    if (!editName.trim()) {
      setSaveErr("Name is required.");
      return;
    }
    setSaving(true);
    setSaveErr(null);
    const { error } = await verifyRowsAffected(
      supabase
        .from("students")
        .update({
          full_name: editName.trim(),
          roll_number: editRoll.trim() || null,
          notes: editNotes.trim() || null,
        })
        .eq("id", student.id),
    );
    setSaving(false);
    if (error) {
      setSaveErr(toSafeErrorMessage(error, "Could not save that student."));
      return;
    }
    setEditing(false);
    loadStudent();
  }

  const [downloading, setDownloading] = useState(false);
  async function onDownloadPdf() {
    if (!student) return;
    setDownloading(true);
    try {
      const activeTerm = terms.find((t) => t.id === termId);
      const isAll = termId === "all";
      const termNameById = new Map(terms.map((t) => [t.id, t.name]));

      const toRow = (s: SessionRow): ProfileSessionRow => {
        const m = summary.marksBySession.get(s.id);
        return {
          date: s.session_date,
          week: s.week_number,
          status: (summary.attBySession.get(s.id) ?? null) as "present" | "absent" | "late" | null,
          mark:
            m && m.score != null && m.max_score
              ? `${formatMarks(m.score)} / ${formatMarks(m.max_score)}`
              : "—",
          remark: summary.remarksBySession.get(s.id) ?? "—",
        };
      };

      let sessionRows: ProfileSessionRow[] | undefined;
      let groupedSessions: Array<{ termName: string; rows: ProfileSessionRow[] }> | undefined;

      if (isAll) {
        const byTerm = new Map<string, SessionRow[]>();
        for (const s of sessions) {
          const arr = byTerm.get(s.term_id) ?? [];
          arr.push(s);
          byTerm.set(s.term_id, arr);
        }
        // Order groups by the term's start_date desc (matches terms list order)
        const orderedTermIds = terms
          .map((t) => t.id)
          .filter((id) => byTerm.has(id))
          .concat(Array.from(byTerm.keys()).filter((id) => !terms.some((t) => t.id === id)));
        groupedSessions = orderedTermIds.map((id) => ({
          termName: termNameById.get(id) ?? "Unknown term",
          rows: (byTerm.get(id) ?? []).map(toRow),
        }));
      } else {
        sessionRows = sessions.map(toRow);
      }

      const remarkRows = remarks
        .filter((r) => r.remark_text)
        .map((r) => {
          const sess = sessions.find((s) => s.id === r.session_id);
          return {
            date: sess?.session_date ?? new Date(r.created_at).toISOString().slice(0, 10),
            week: sess?.week_number ?? null,
            text: r.remark_text ?? "",
            termName: isAll && sess ? (termNameById.get(sess.term_id) ?? null) : null,
          };
        });
      await downloadStudentProfilePdf({
        student: {
          full_name: student.full_name,
          roll_number: student.roll_number,
          notes: student.notes,
          is_active: student.is_active,
          section: student.section
            ? {
                grade: student.section.grade,
                section_name: student.section.section_name,
                school: student.section.school ? { name: student.section.school.name } : null,
              }
            : null,
        },
        termName: isAll ? "All terms · cumulative" : (activeTerm?.name ?? ""),
        history: history.map((h) => ({
          academic_year: h.academic_year,
          grade: h.grade,
          section_name: h.section_name,
          school_name: h.school_name,
          start_date: h.start_date,
          end_date: h.end_date,
        })),
        summary: {
          totalSessions: summary.totalSessions,
          attCount: summary.attCount,
          present: summary.present,
          attPercent: summary.attPercent,
          obtained: summary.obtained,
          totalMax: summary.totalMax,
          avgPercent: summary.avgPercent,
        },
        sessions: sessionRows,
        groupedSessions,
        remarks: remarkRows,
      });
    } finally {
      setDownloading(false);
    }
  }

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading…</div>;

  if (denied || !student) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-6">
          <h1 className="text-lg font-semibold text-red-200">Access denied</h1>
          <p className="mt-2 text-sm text-red-300/80">
            You do not have access to this student, or they do not exist.
          </p>
          <Link
            to={backTo}
            className="mt-4 inline-block rounded-md border border-red-500/40 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/10"
          >
            ← {backLabel}
          </Link>
        </div>
      </div>
    );
  }

  const canDeactivate = role === "admin";
  const canEdit = role === "instructor";
  const activeTerm = terms.find((t) => t.id === termId);

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="mb-2 text-xs">
        <Link to={backTo} className="text-slate-500 hover:text-slate-300">
          ← {backLabel}
        </Link>
      </div>

      {/* HEADER */}
      <header className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-100">{student.full_name}</h1>
              {student.is_active ? (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                  Active
                </span>
              ) : (
                <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Inactive
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-400">
              <div>
                Roll <span className="text-slate-200">{student.roll_number ?? "—"}</span>
              </div>
              <div>
                Grade{" "}
                <span className="text-slate-200">
                  {student.section?.grade ?? "—"}
                  {student.section ? ` · ${student.section.section_name}` : ""}
                </span>
              </div>
              <div>
                School{" "}
                <span className="text-slate-200">{student.section?.school?.name ?? "—"}</span>
              </div>
            </div>
            {student.notes && (
              <div className="mt-3 text-xs text-slate-500">
                <span className="uppercase tracking-wider">Father Name:</span>{" "}
                <span className="text-slate-300">{student.notes}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onDownloadPdf}
              disabled={downloading || detailLoading}
              className="rounded-md border border-indigo-500/50 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/20 disabled:opacity-50"
              title="Download the full student profile as a PDF"
            >
              {downloading ? "Preparing…" : "Download PDF"}
            </button>
            {canEdit && (
              <button
                onClick={beginEdit}
                className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-indigo-500 hover:text-indigo-200"
              >
                Edit
              </button>
            )}
            {canDeactivate && (
              <button
                onClick={onDeactivateToggle}
                className={
                  student.is_active
                    ? "rounded-md border border-amber-500/40 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/10"
                    : "rounded-md border border-emerald-500/40 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/10"
                }
              >
                {student.is_active ? "Deactivate" : "Reactivate"}
              </button>
            )}
          </div>
        </div>

        {editing && canEdit && (
          <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Edit student
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[2fr_1fr_2fr]">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Full name"
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
              />
              <input
                value={editRoll}
                onChange={(e) => setEditRoll(e.target.value)}
                placeholder="Roll #"
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
              />
              <input
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Father Name"
                className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
              />
            </div>
            {saveErr && <div className="mt-2 text-xs text-red-300">{saveErr}</div>}
            <div className="mt-3 flex gap-2">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="rounded-md bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-md border border-slate-700 px-4 py-1.5 text-xs text-slate-300 hover:border-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </header>

      {/* ENROLLMENT HISTORY */}
      <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 px-5 py-3 text-sm font-semibold text-slate-200">
          Enrollment history
        </div>
        <div className="p-5">
          {history.length === 0 ? (
            <div className="text-xs text-slate-500">No enrollment history recorded.</div>
          ) : (
            <ol className="space-y-1 text-sm text-slate-300">
              {history.map((h) => (
                <li key={h.id} className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-slate-400">{h.academic_year}</span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-100">
                    Grade {h.grade}
                    {h.section_name ? ` · ${h.section_name}` : ""}
                  </span>
                  {h.school_name && <span className="text-slate-500">({h.school_name})</span>}
                  <span className="text-slate-500">
                    · {formatDate(h.start_date)} → {h.end_date ? formatDate(h.end_date) : "present"}
                  </span>
                  {!h.end_date && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                      Active
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>

      {/* TERM SELECTOR + SUMMARY */}
      <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-3">
          <div className="text-sm font-semibold text-slate-200">Term summary</div>
          <div className="flex items-center gap-2">
            <label className="text-xs uppercase tracking-wide text-slate-400">Term</label>
            <select
              value={termId}
              onChange={(e) => setTermId(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-950 px-3 py-1.5 text-sm text-slate-100 outline-none focus:border-indigo-500"
            >
              <option value="all">All terms · cumulative</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.is_active ? "(active)" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-3">
          <SummaryCard
            label="Attendance"
            value={summary.attPercent != null ? `${summary.attPercent.toFixed(0)}%` : "—"}
            sub={`${summary.present} present · ${summary.attCount} recorded · ${summary.totalSessions} sessions`}
          />
          <SummaryCard
            label="Marks obtained"
            value={
              summary.totalMax > 0
                ? `${formatMarks(summary.obtained)} / ${formatMarks(summary.totalMax)}`
                : marks.length > 0
                  ? "No marks recorded"
                  : "—"
            }
            sub="Blank marks excluded"
          />
          <SummaryCard
            label="Average marks"
            value={
              summary.avgPercent != null
                ? `${summary.avgPercent.toFixed(1)}%`
                : marks.length > 0 || sessions.length > 0
                  ? "No marks recorded"
                  : "—"
            }
            sub={termId === "all" ? "All terms · cumulative" : (activeTerm?.name ?? "")}
          />
        </div>
      </section>

      {/* SESSION BREAKDOWN */}
      <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 px-5 py-3 text-sm font-semibold text-slate-200">
          Session-by-session · {termId === "all" ? "All terms" : (activeTerm?.name ?? "")}
        </div>
        {detailLoading ? (
          <div className="p-6 text-center text-sm text-slate-500">Loading…</div>
        ) : sessions.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">No sessions recorded.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 w-32">Date</th>
                  <th className="px-5 py-3 w-16">Week</th>
                  <th className="px-5 py-3 w-32">Attendance</th>
                  <th className="px-5 py-3 w-32">Mark</th>
                  <th className="px-5 py-3">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(() => {
                  const nameById = new Map(terms.map((t) => [t.id, t.name]));
                  const isAll = termId === "all";
                  let lastTermId = "";
                  const items: ReactNode[] = [];
                  for (const s of sessions) {
                    if (isAll && s.term_id !== lastTermId) {
                      lastTermId = s.term_id;
                      items.push(
                        <tr key={`hdr-${s.term_id}`} className="bg-slate-900/60">
                          <td
                            colSpan={5}
                            className="px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-indigo-300"
                          >
                            Term: {nameById.get(s.term_id) ?? "Unknown"}
                          </td>
                        </tr>,
                      );
                    }
                    const st = summary.attBySession.get(s.id);
                    const m = summary.marksBySession.get(s.id);
                    const rk = summary.remarksBySession.get(s.id);
                    items.push(
                      <tr key={s.id} className="text-slate-200">
                        <td className="px-5 py-2 text-slate-400">{formatDate(s.session_date)}</td>
                        <td className="px-5 py-2 text-slate-400">{s.week_number ?? "—"}</td>
                        <td className="px-5 py-2">
                          {st ? (
                            <span
                              className={
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " +
                                (st === "present"
                                  ? "bg-emerald-500/15 text-emerald-300"
                                  : st === "late"
                                    ? "bg-amber-500/15 text-amber-300"
                                    : "bg-red-500/15 text-red-300")
                              }
                            >
                              {st}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-5 py-2 text-slate-300">
                          {m && m.score != null && m.max_score
                            ? `${formatMarks(m.score)} / ${formatMarks(m.max_score)}`
                            : "—"}
                        </td>
                        <td className="px-5 py-2 text-slate-300">
                          {rk ? (
                            <span className="whitespace-pre-wrap">{rk}</span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                      </tr>,
                    );
                  }
                  return items;
                })()}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* REMARKS TIMELINE */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 px-5 py-3 text-sm font-semibold text-slate-200">
          Remarks timeline ·{" "}
          {termId === "all" ? "All terms" : (activeTerm?.name ?? "selected term")}
        </div>
        <div className="p-5">
          {remarks.filter((r) => r.remark_text).length === 0 ? (
            <div className="text-xs text-slate-500">No remarks recorded in this term.</div>
          ) : (
            <ol className="space-y-3">
              {remarks
                .filter((r) => r.remark_text)
                .map((r, i) => {
                  const sess = sessions.find((s) => s.id === r.session_id);
                  return (
                    <li key={i} className="border-l-2 border-indigo-500/40 pl-3">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500">
                        {formatDate(
                          sess?.session_date ?? new Date(r.created_at).toISOString().slice(0, 10),
                        )}
                        {sess?.week_number ? ` · Week ${sess.week_number}` : ""}
                      </div>
                      <div className="text-sm text-slate-200">{r.remark_text}</div>
                    </li>
                  );
                })}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-slate-100">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
