import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BRAND } from "@/lib/brand";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import { verifyRowsAffected } from "@/lib/db-write-verify";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { drawInstitutionalFooter, drawLogoHeader } from "@/lib/school-export";
import { ExportButtons } from "@/components/dashboard/ExportButtons";
import type { ExportPayload } from "@/lib/school-export";
import { formatDate } from "@/lib/format-date";
import { DateField } from "@/components/ui/date-field";
import { StudentImportPanel } from "@/components/dashboard/StudentImportPanel";
import { sanitizeForPdf } from "@/lib/sanitize-pdf-text";
import {
  findDuplicateMatch,
  describeDuplicateMatch,
  type DuplicateMatch,
} from "@/lib/student-duplicates";

export const Route = createFileRoute("/dashboard/instructor/section/$sectionId")({
  component: SectionWorkspace,
});

interface Section {
  id: string;
  section_name: string;
  grade: number;
  school_id: string;
  schools: { name: string } | null;
}
interface Student {
  id: string;
  full_name: string;
  roll_number: string | null;
  notes: string | null;
  is_active: boolean;
}
interface Term {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}
interface ClassSession {
  id: string;
  session_date: string;
  week_number: number | null;
  term_id: string;
}
type AttStatus = "present" | "absent" | "late";
interface AttendanceRow {
  session_id: string;
  student_id: string;
  status: AttStatus;
}
interface MarksRow {
  session_id: string;
  student_id: string;
  score: number | null;
  max_score: number;
}
interface RemarksRow {
  session_id: string;
  student_id: string;
  remark_text: string | null;
}
interface ResultCardRow {
  student_id: string | null;
  full_name: string | null;
  section_id: string | null;
  term_id: string | null;
  term_name: string | null;
  average_percent: number | null;
  present_count: number | null;
  total_sessions: number | null;
  attendance_percent: number | null;
  remarks_concatenated: string | null;
}

type Tab = "roster" | "sessions" | "result";

function SectionWorkspace() {
  const { sectionId } = Route.useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("sessions");
  const [section, setSection] = useState<Section | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("sections")
        .select("id, section_name, grade, school_id, schools:school_id(name)")
        .eq("id", sectionId)
        .maybeSingle();
      if (error) {
        setAccessDenied(true);
      } else if (!data) {
        // RLS filtered it out → not assigned or doesn't exist
        setAccessDenied(true);
      } else {
        setSection(data as unknown as Section);
      }
      setLoading(false);
    })();
  }, [sectionId]);

  if (loading) return <div className="p-8 text-sm text-slate-500">Loading…</div>;

  if (accessDenied || !section) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-6">
          <h1 className="text-lg font-semibold text-red-200">Access denied</h1>
          <p className="mt-2 text-sm text-red-300/80">
            You are not assigned to this section, or it does not exist.
          </p>
          <button
            onClick={() => navigate({ to: "/dashboard/instructor" })}
            className="mt-4 rounded-md border border-red-500/40 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/10"
          >
            Back to my classes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="mb-2 text-xs">
        <Link to="/dashboard/instructor" className="text-slate-500 hover:text-slate-300">
          ← My classes
        </Link>
      </div>
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">
            {section.section_name} <span className="text-slate-500">· Grade {section.grade}</span>
          </h1>
          <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
            {section.schools?.name}
          </div>
        </div>
      </header>

      <div className="mb-6 flex gap-1 border-b border-slate-800">
        {(["roster", "sessions", "result"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "border-b-2 px-4 py-2 text-sm font-medium transition " +
              (tab === t
                ? "border-indigo-400 text-indigo-200"
                : "border-transparent text-slate-400 hover:text-slate-200")
            }
          >
            {t === "roster" ? "Roster" : t === "sessions" ? "Sessions" : "Result card"}
          </button>
        ))}
      </div>

      {tab === "roster" && <RosterTab sectionId={sectionId} section={section} />}
      {tab === "sessions" && <SessionsTab sectionId={sectionId} section={section} />}
      {tab === "result" && <ResultCardTab sectionId={sectionId} section={section} />}
    </div>
  );
}

/* ---------------- Roster ---------------- */

function RosterTab({ sectionId, section }: { sectionId: string; section: Section }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [roll, setRoll] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  // Set when onAdd finds a possible duplicate against the roster already in
  // state -- holds the form values so "Add anyway" can insert them without
  // re-reading form state, and blanks so "Cancel" leaves the form as-is.
  const [pendingAdd, setPendingAdd] = useState<{
    full_name: string;
    roll_number: string;
    notes: string;
    match: DuplicateMatch;
  } | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("id, full_name, roll_number, notes, is_active")
      .eq("section_id", sectionId)
      .order("roll_number", { ascending: true, nullsFirst: false });
    if (error) setErr(toSafeErrorMessage(error, "Could not load students."));
    setStudents((data as Student[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  async function insertStudent(full_name: string, roll_number: string, notes: string) {
    setSubmitting(true);
    const { data: sessionRes } = await supabase.auth.getSession();
    // roll_number is required (NOT NULL) -- an instructor leaving it blank
    // (school hasn't issued one yet) gets the same obviously-synthetic
    // placeholder the migration used, never a plausible-looking value.
    const id = roll_number ? undefined : crypto.randomUUID();
    const finalRoll = roll_number || `TEMP-${id!.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    const { error } = await supabase.from("students").insert({
      ...(id ? { id } : {}),
      section_id: sectionId,
      full_name,
      roll_number: finalRoll,
      notes: notes || null,
      created_by: sessionRes.session?.user.id ?? null,
    });
    setSubmitting(false);
    if (error) {
      setErr(toSafeErrorMessage(error, "Could not add that student."));
      return;
    }
    setFullName("");
    setRoll("");
    setNotes("");
    setPendingAdd(null);
    load();
  }

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const full_name = fullName.trim();
    const roll_number = roll.trim();
    const trimmedNotes = notes.trim();

    const match = findDuplicateMatch({ full_name, roll_number }, students);
    if (match) {
      setPendingAdd({ full_name, roll_number, notes: trimmedNotes, match });
      return;
    }
    await insertStudent(full_name, roll_number, trimmedNotes);
  }

  async function onUpdate(s: Student, patch: Partial<Student>) {
    const { error } = await verifyRowsAffected(
      supabase.from("students").update(patch).eq("id", s.id),
    );
    if (error) alert(toSafeErrorMessage(error, "Could not save that student."));
    else load();
  }

  async function onToggleActive(s: Student) {
    if (s.is_active) {
      if (
        !confirm(
          `Deactivate "${s.full_name}"?\n\nThey will be hidden from the active roster and new session entry, but all their existing attendance, marks, and remarks remain intact in term result cards. You can reactivate them later.`,
        )
      )
        return;
    }
    const { error } = await verifyRowsAffected(
      supabase.from("students").update({ is_active: !s.is_active }).eq("id", s.id),
    );
    if (error) alert(toSafeErrorMessage(error, "Could not update that student."));
    else load();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Add student</h2>
        <form onSubmit={onAdd} className="grid grid-cols-1 gap-2 md:grid-cols-[2fr_1fr_2fr_auto]">
          <input
            required
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
          />
          <input
            placeholder="Roll #"
            value={roll}
            onChange={(e) => setRoll(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
          />
          <input
            placeholder="Father Name (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {submitting ? "Adding…" : "Add"}
          </button>
        </form>
        {pendingAdd && (
          <div className="mt-3 rounded-md border border-amber-800/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
            <p>⚠ {describeDuplicateMatch(pendingAdd.match)}.</p>
            <p className="mt-1 text-amber-200/80">Add "{pendingAdd.full_name}" anyway?</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() =>
                  insertStudent(pendingAdd.full_name, pendingAdd.roll_number, pendingAdd.notes)
                }
                className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-400 disabled:opacity-50"
              >
                {submitting ? "Adding…" : "Add anyway"}
              </button>
              <button
                type="button"
                onClick={() => setPendingAdd(null)}
                className="rounded-md border border-amber-800/60 px-3 py-1.5 text-xs text-amber-200 hover:border-amber-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Bulk upload roster</h2>
        <StudentImportPanel
          sectionId={sectionId}
          sectionLabel={`Grade ${section.grade} — ${section.section_name}`}
          onImported={load}
        />
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
          <div className="text-sm font-semibold text-slate-200">
            Roster ({students.filter((s) => showInactive || s.is_active).length}
            {showInactive ? ` of ${students.length}` : ""})
          </div>
          <label className="inline-flex items-center gap-1.5 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="size-3 accent-indigo-500"
            />
            Show inactive
          </label>
        </div>
        {err && (
          <div className="border-b border-red-900/60 bg-red-950/40 px-5 py-2 text-sm text-red-300">
            {err}
          </div>
        )}
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No students yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 w-24">Roll #</th>
                  <th className="px-5 py-3">Full name</th>
                  <th className="px-5 py-3">Father Name</th>
                  <th className="px-5 py-3 text-right w-32">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {students
                  .filter((s) => showInactive || s.is_active)
                  .map((s) => (
                    <tr
                      key={s.id}
                      className={"text-slate-200 " + (!s.is_active ? "opacity-60" : "")}
                    >
                      <td className="px-5 py-2">
                        <input
                          defaultValue={s.roll_number ?? ""}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (!v) {
                              // roll_number is required (NOT NULL) -- clearing it
                              // to blank can't be saved, so revert instead of
                              // sending an update that will fail.
                              e.target.value = s.roll_number ?? "";
                              return;
                            }
                            if (v !== s.roll_number) onUpdate(s, { roll_number: v });
                          }}
                          className="w-20 rounded border border-transparent bg-transparent px-2 py-1 focus:border-slate-700 focus:bg-slate-950"
                        />
                        {s.roll_number?.startsWith("TEMP-") && (
                          <div
                            title="School hasn't issued a real roll number yet"
                            className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500"
                          >
                            Placeholder
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-2">
                        <div className="flex items-center gap-2">
                          <Link
                            to="/dashboard/instructor/student/$studentId"
                            params={{ studentId: s.id }}
                            className="text-slate-100 hover:text-indigo-200 hover:underline"
                          >
                            {s.full_name}
                          </Link>
                          {!s.is_active && (
                            <span className="rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                              Inactive
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-2">
                        <input
                          defaultValue={s.notes ?? ""}
                          onBlur={(e) => {
                            const v = e.target.value.trim() || null;
                            if (v !== s.notes) onUpdate(s, { notes: v });
                          }}
                          className="w-full rounded border border-transparent bg-transparent px-2 py-1 focus:border-slate-700 focus:bg-slate-950"
                        />
                      </td>
                      <td className="px-5 py-2 text-right">
                        {s.is_active ? (
                          <button
                            onClick={() => onToggleActive(s)}
                            className="rounded border border-amber-500/40 px-2 py-1 text-xs text-amber-300 hover:bg-amber-500/10"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            onClick={() => onToggleActive(s)}
                            className="rounded border border-emerald-500/40 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10"
                          >
                            Reactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------------- Sessions ---------------- */

function weekNumberFromTerm(termStart: string, sessionDate: string): number {
  const s = new Date(termStart + "T00:00:00Z").getTime();
  const d = new Date(sessionDate + "T00:00:00Z").getTime();
  const diffDays = Math.floor((d - s) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.floor(diffDays / 7) + 1);
}

function SessionsTab({ sectionId, section }: { sectionId: string; section: Section }) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newTermId, setNewTermId] = useState<string>("");
  const [newDate, setNewDate] = useState<string>(new Date().toISOString().slice(0, 10));

  async function loadAll() {
    setLoading(true);
    const [t, sess, st] = await Promise.all([
      supabase
        .from("terms")
        .select("id, name, start_date, end_date, is_active")
        .order("start_date", { ascending: false }),
      supabase
        .from("class_sessions")
        .select("id, session_date, week_number, term_id")
        .eq("section_id", sectionId)
        .order("session_date", { ascending: false }),
      supabase
        .from("students")
        .select("id, full_name, roll_number, notes, is_active")
        .eq("section_id", sectionId)
        .eq("is_active", true)
        .order("roll_number", { ascending: true, nullsFirst: false }),
    ]);
    if (t.error) setErr(toSafeErrorMessage(t.error, "Could not load terms."));
    if (sess.error) setErr(toSafeErrorMessage(sess.error, "Could not load sessions."));
    if (st.error) setErr(toSafeErrorMessage(st.error, "Could not load students."));
    const termsData = (t.data as Term[]) ?? [];
    setTerms(termsData);
    setSessions((sess.data as ClassSession[]) ?? []);
    setStudents((st.data as Student[]) ?? []);
    const activeT = termsData.find((x) => x.is_active) ?? termsData[0];
    setNewTermId((cur) => cur || activeT?.id || "");
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionId]);

  async function createSession(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    const term = terms.find((t) => t.id === newTermId);
    if (!term) {
      setErr("Pick a term.");
      return;
    }
    const { data: sessionRes } = await supabase.auth.getSession();
    const week = weekNumberFromTerm(term.start_date, newDate);
    const { data, error } = await supabase
      .from("class_sessions")
      .insert({
        section_id: sectionId,
        term_id: term.id,
        session_date: newDate,
        week_number: week,
        instructor_user_id: sessionRes.session?.user.id ?? "",
      })
      .select("id, session_date, week_number, term_id")
      .single();
    if (error) {
      setErr(toSafeErrorMessage(error, "Could not create that session."));
      return;
    }
    setShowNew(false);
    setActiveSessionId((data as ClassSession).id);
    loadAll();
  }

  async function deleteSession(s: ClassSession) {
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
      setErr(toSafeErrorMessage(error, "Could not delete that session."));
      return;
    }
    if (activeSessionId === s.id) setActiveSessionId(null);
    loadAll();
  }

  return (
    <div className="space-y-6">
      {err && (
        <div className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {err}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">Weekly sessions</h2>
        <button
          onClick={() => setShowNew((v) => !v)}
          className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
        >
          {showNew ? "Cancel" : "Start new class session"}
        </button>
      </div>

      {showNew && (
        <form
          onSubmit={createSession}
          className="grid grid-cols-1 gap-2 rounded-xl border border-slate-800 bg-slate-900/60 p-4 md:grid-cols-[2fr_1fr_auto]"
        >
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Term
            </label>
            <select
              value={newTermId}
              onChange={(e) => setNewTermId(e.target.value)}
              required
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
            >
              <option value="">— select term —</option>
              {terms.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} {t.is_active ? "(active)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
              Date
            </label>
            <DateField value={newDate} onChange={setNewDate} required />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
            >
              Create session
            </button>
          </div>
        </form>
      )}

      {activeSessionId ? (
        <SessionEditor
          key={activeSessionId}
          sessionId={activeSessionId}
          students={students}
          onClose={() => setActiveSessionId(null)}
        />
      ) : (
        <section className="rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="border-b border-slate-800 px-5 py-3 text-sm font-semibold text-slate-200">
            Past sessions
          </div>
          {loading ? (
            <div className="p-6 text-center text-sm text-slate-500">Loading…</div>
          ) : sessions.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              No sessions yet — start one above.
            </div>
          ) : (
            <ul className="divide-y divide-slate-800">
              {sessions.map((s) => {
                const term = terms.find((t) => t.id === s.term_id);
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between px-5 py-3 text-sm hover:bg-slate-800/40"
                  >
                    <button onClick={() => setActiveSessionId(s.id)} className="flex-1 text-left">
                      <div className="text-slate-100">{formatDate(s.session_date)}</div>
                      <div className="text-xs text-slate-500">
                        Week {s.week_number ?? "?"} · {term?.name ?? "—"}
                      </div>
                    </button>
                    <div className="ml-3 flex items-center gap-2">
                      <button
                        onClick={() =>
                          downloadSessionSheet(s, "pdf", section, term ?? null, students)
                        }
                        className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-indigo-500/60 hover:text-indigo-200"
                        title="Download session sheet (attendance + marks) as PDF"
                      >
                        PDF
                      </button>
                      <button
                        onClick={() =>
                          downloadSessionSheet(s, "xlsx", section, term ?? null, students)
                        }
                        className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-emerald-500/60 hover:text-emerald-200"
                        title="Download session sheet (attendance + marks) as Excel"
                      >
                        Excel
                      </button>
                      <button
                        onClick={() => setActiveSessionId(s.id)}
                        className="rounded px-2 py-1 text-xs text-indigo-300 hover:text-indigo-200"
                      >
                        Open →
                      </button>
                      <button
                        onClick={() => deleteSession(s)}
                        className="rounded border border-red-900 px-2 py-1 text-xs text-red-300 hover:bg-red-950/40"
                        title="Delete this session and all its attendance/marks/remarks"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {students.length === 0 && !loading && (
        <div className="rounded-md border border-amber-900/60 bg-amber-950/30 px-3 py-2 text-sm text-amber-300">
          No students in the roster yet. Add them under the Roster tab before recording sessions.
        </div>
      )}
    </div>
  );
}

/* ---------------- Session Editor (spreadsheet) ---------------- */

interface RowState {
  attendance: AttStatus;
  score: string; // string for controlled input; parse on save
  remark: string;
}

function SessionEditor({
  sessionId,
  students,
  onClose,
}: {
  sessionId: string;
  students: Student[];
  onClose: () => void;
}) {
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [maxScore, setMaxScore] = useState<string>("20");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const loadedAtRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setStale(false);
      const [a, m, r, cs] = await Promise.all([
        supabase
          .from("attendance")
          .select("session_id, student_id, status")
          .eq("session_id", sessionId),
        supabase
          .from("marks")
          .select("session_id, student_id, score, max_score")
          .eq("session_id", sessionId),
        supabase
          .from("remarks")
          .select("session_id, student_id, remark_text")
          .eq("session_id", sessionId),
        supabase.from("class_sessions").select("data_updated_at").eq("id", sessionId).maybeSingle(),
      ]);
      loadedAtRef.current =
        (cs.data as { data_updated_at?: string } | null)?.data_updated_at ??
        new Date().toISOString();
      const att = (a.data as AttendanceRow[]) ?? [];
      const mk = (m.data as MarksRow[]) ?? [];
      const rm = (r.data as RemarksRow[]) ?? [];
      const init: Record<string, RowState> = {};
      for (const s of students) {
        init[s.id] = { attendance: "present", score: "", remark: "" };
      }
      for (const x of att) if (init[x.student_id]) init[x.student_id].attendance = x.status;
      for (const x of mk) {
        if (init[x.student_id]) init[x.student_id].score = x.score == null ? "" : String(x.score);
      }
      if (mk[0]) setMaxScore(String(mk[0].max_score));
      for (const x of rm) if (init[x.student_id]) init[x.student_id].remark = x.remark_text ?? "";
      setRows(init);
      dirtyRef.current = false;
      setLoading(false);
    })();
  }, [sessionId, students, reloadTick]);

  useEffect(() => {
    function beforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  function update(studentId: string, patch: Partial<RowState>) {
    dirtyRef.current = true;
    setSaveMsg(null);
    setRows((prev) => ({ ...prev, [studentId]: { ...prev[studentId], ...patch } }));
  }

  async function onSave() {
    setSaving(true);
    setErr(null);
    setSaveMsg(null);
    setStale(false);
    const max = Number(maxScore);
    if (!Number.isFinite(max) || max <= 0) {
      setErr("Max score must be a positive number.");
      setSaving(false);
      return;
    }

    const payload: Array<{
      student_id: string;
      attendance: AttStatus;
      score: string | null;
      max_score: number;
      remark: string;
    }> = [];
    for (const s of students) {
      const r = rows[s.id];
      if (!r) continue;
      const raw = r.score.trim();
      let scoreStr: string | null = null;
      if (raw !== "") {
        const sc = Number(raw);
        if (!Number.isFinite(sc) || sc < 0 || sc > max) {
          setErr(`Invalid score for ${s.full_name}: must be between 0 and ${max}.`);
          setSaving(false);
          return;
        }
        scoreStr = String(sc);
      }
      payload.push({
        student_id: s.id,
        attendance: r.attendance,
        score: scoreStr,
        max_score: max,
        remark: r.remark.trim(),
      });
    }

    // Atomic transaction + optimistic concurrency in one RPC call.
    const { data, error } = await supabase.rpc("save_session", {
      _session_id: sessionId,
      _rows: payload,
      _loaded_at: loadedAtRef.current ?? new Date().toISOString(),
    });
    if (error) {
      setSaving(false);
      if (error.message?.startsWith("STALE_SESSION")) {
        setStale(true);
        setErr(
          "This session was updated by someone else while you were editing. Please reload before saving again.",
        );
      } else {
        setErr(toSafeErrorMessage(error, "Could not save."));
      }
      return;
    }
    // Adopt the server's new data_updated_at so a subsequent save from
    // this same tab isn't wrongly flagged as stale.
    if (typeof data === "string") loadedAtRef.current = data;
    dirtyRef.current = false;
    setSaving(false);
    setSaveMsg("Session saved.");
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/60 pb-20 sm:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-3">
        <div className="text-sm font-semibold text-slate-200">
          Session entry{" "}
          {dirtyRef.current && (
            <span className="ml-2 text-xs text-amber-300">· unsaved changes</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs text-slate-400">
            Max score
            <input
              type="number"
              inputMode="numeric"
              min="1"
              value={maxScore}
              onChange={(e) => {
                dirtyRef.current = true;
                setMaxScore(e.target.value);
              }}
              className="ml-2 w-20 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100 outline-none focus:border-indigo-500"
            />
          </label>
          <button
            onClick={onClose}
            className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600 hover:text-slate-100"
          >
            Back to list
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="hidden sm:inline-flex rounded-md bg-indigo-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save session"}
          </button>
        </div>
      </div>

      {stale && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-900/60 bg-amber-950/40 px-5 py-2 text-sm text-amber-200">
          <span>
            This session was updated by someone else while you were editing. Reload to see the
            latest data.
          </span>
          <button
            onClick={() => {
              setStale(false);
              setErr(null);
              setReloadTick((t) => t + 1);
            }}
            className="rounded-md border border-amber-500/40 px-3 py-1 text-xs text-amber-100 hover:bg-amber-500/10"
          >
            Reload
          </button>
        </div>
      )}
      {err && !stale && (
        <div className="border-b border-red-900/60 bg-red-950/40 px-5 py-2 text-sm text-red-300">
          {err}
        </div>
      )}
      {saveMsg && (
        <div className="border-b border-emerald-900/60 bg-emerald-950/30 px-5 py-2 text-sm text-emerald-300">
          {saveMsg}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-500">Loading…</div>
      ) : students.length === 0 ? (
        <div className="p-8 text-center text-sm text-slate-500">No students in this section.</div>
      ) : (
        <div className="overflow-x-clip">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="hidden sm:table-cell px-3 py-3 w-14">Roll</th>
                <th className="px-3 py-3">Student</th>
                <th className="px-3 py-3">Attendance</th>
                <th className="px-3 py-3">Marks / {maxScore || "—"}</th>
                <th className="hidden md:table-cell px-3 py-3">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {students.map((s) => {
                const r = rows[s.id];
                if (!r) return null;
                return (
                  <tr key={s.id} className="text-slate-200 align-top">
                    <td className="hidden sm:table-cell px-3 py-2 text-slate-400">
                      {s.roll_number ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-slate-100">{s.full_name}</div>
                      <div className="text-[10px] font-mono text-slate-500 sm:hidden">
                        Roll {s.roll_number ?? "—"}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="inline-flex overflow-hidden rounded-md border border-slate-700">
                        {(["present", "late", "absent"] as AttStatus[]).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => update(s.id, { attendance: st })}
                            className={
                              "min-h-11 min-w-11 px-3 py-2 text-xs font-medium capitalize " +
                              (r.attendance === st
                                ? st === "present"
                                  ? "bg-emerald-500/20 text-emerald-200"
                                  : st === "late"
                                    ? "bg-amber-500/20 text-amber-200"
                                    : "bg-red-500/20 text-red-200"
                                : "text-slate-400 hover:bg-slate-800")
                            }
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      {(() => {
                        const maxNum = Number(maxScore) || 0;
                        const raw = r.score.trim();
                        let scoreErr: string | null = null;
                        if (raw !== "") {
                          const n = Number(raw);
                          if (!Number.isFinite(n)) scoreErr = "Number only";
                          else if (n < 0) scoreErr = "No negatives";
                          else if (maxNum > 0 && n > maxNum) scoreErr = `Max ${maxNum}`;
                        }
                        return (
                          <div>
                            <input
                              type="number"
                              inputMode="decimal"
                              pattern="[0-9]*"
                              min="0"
                              max={maxScore || undefined}
                              value={r.score}
                              onChange={(e) => update(s.id, { score: e.target.value })}
                              aria-invalid={scoreErr ? true : undefined}
                              className={
                                "w-24 min-h-11 rounded-md border bg-slate-950 px-3 py-2 text-base sm:text-sm text-slate-100 outline-none " +
                                (scoreErr
                                  ? "border-red-500 focus:border-red-400"
                                  : "border-slate-700 focus:border-indigo-500")
                              }
                            />
                            {scoreErr && (
                              <div className="mt-1 text-[10px] font-semibold text-red-300">
                                {scoreErr}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        value={r.remark}
                        onChange={(e) => update(s.id, { remark: e.target.value })}
                        placeholder="Optional"
                        className="w-full min-w-[10rem] min-h-11 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-base sm:text-sm text-slate-100 outline-none focus:border-indigo-500"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile sticky save bar */}
      <div className="sm:hidden fixed inset-x-0 bottom-0 z-30 border-t border-slate-800 bg-slate-950/95 backdrop-blur px-4 py-3">
        <button
          onClick={onSave}
          disabled={saving}
          className="w-full rounded-md bg-indigo-500 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save session"}
        </button>
      </div>
    </section>
  );
}

/* ---------------- Result Card ---------------- */

function ResultCardTab({ sectionId, section }: { sectionId: string; section: Section }) {
  const [terms, setTerms] = useState<Term[]>([]);
  const [termId, setTermId] = useState<string>("");
  const [rows, setRows] = useState<ResultCardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("terms")
        .select("id, name, start_date, end_date, is_active")
        .order("start_date", { ascending: false });
      const t = (data as Term[]) ?? [];
      setTerms(t);
      const active = t.find((x) => x.is_active) ?? t[0];
      if (active) setTermId(active.id);
    })();
  }, []);

  useEffect(() => {
    if (!termId) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("result_cards")
        .select("*")
        .eq("section_id", sectionId)
        .eq("term_id", termId);
      if (error) setErr(toSafeErrorMessage(error, "Could not load result cards."));
      const sorted = ((data as ResultCardRow[]) ?? [])
        .slice()
        .sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
      setRows(sorted);
      setLoading(false);
    })();
  }, [sectionId, termId]);

  const activeTerm = useMemo(() => terms.find((t) => t.id === termId), [terms, termId]);

  const buildPayload = (): ExportPayload => {
    const subtitle = [
      section.schools?.name,
      `Grade ${section.grade} · Section ${section.section_name}`,
      `Term: ${activeTerm?.name ?? ""}`,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      title: `${BRAND.shortName} — Section Result Card`,
      subtitle,
      filename:
        `result-card_${section.schools?.name ?? "school"}_G${section.grade}${section.section_name}_${activeTerm?.name ?? "term"}`.replace(
          /\s+/g,
          "_",
        ),
      columns: [
        { header: "Student", key: "full_name", width: 30 },
        { header: "Attendance %", key: "att", width: 14 },
        { header: "Sessions (P/T)", key: "sessions", width: 16 },
        { header: "Average %", key: "avg", width: 14 },
        { header: "Remarks", key: "remarks", width: 60 },
      ],
      rows: rows.map((r) => ({
        full_name: r.full_name ?? "",
        att: r.attendance_percent != null ? r.attendance_percent.toFixed(0) : "—",
        sessions: `${r.present_count ?? 0} / ${r.total_sessions ?? 0}`,
        avg: r.average_percent != null ? r.average_percent.toFixed(1) : "—",
        remarks: r.remarks_concatenated || "—",
      })),
    };
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-xs uppercase tracking-wide text-slate-400">Term</label>
          <select
            value={termId}
            onChange={(e) => setTermId(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
          >
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.is_active ? "(active)" : ""}
              </option>
            ))}
          </select>
        </div>
        <ExportButtons payload={buildPayload} disabled={loading || rows.length === 0} />
      </div>

      {err && (
        <div className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {err}
        </div>
      )}

      <section className="rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 px-5 py-3 text-sm font-semibold text-slate-200">
          Result card {activeTerm && <span className="text-slate-500">· {activeTerm.name}</span>}
        </div>
        {loading ? (
          <div className="p-6 text-center text-sm text-slate-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">No data for this term yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3 w-32">Attendance</th>
                  <th className="px-5 py-3 w-32">Average</th>
                  <th className="px-5 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((r) => (
                  <tr key={r.student_id ?? Math.random()} className="text-slate-200 align-top">
                    <td className="px-5 py-3">{r.full_name}</td>
                    <td className="px-5 py-3">
                      <span className="text-slate-100">
                        {r.attendance_percent?.toFixed(0) ?? "—"}%
                      </span>
                      <div className="text-xs text-slate-500">
                        {r.present_count ?? 0} / {r.total_sessions ?? 0}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-slate-100">
                        {r.average_percent?.toFixed(1) ?? "—"}%
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400 whitespace-pre-wrap">
                      {r.remarks_concatenated || <span className="text-slate-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ---------------- Session Sheet Download (attendance + marks) ---------------- */

function attendanceSymbol(status: AttStatus | undefined): string {
  if (status === "present") return "P";
  if (status === "absent") return "A";
  if (status === "late") return "L";
  return "";
}

async function downloadSessionSheet(
  session: ClassSession,
  format: "pdf" | "xlsx",
  section: Section,
  term: Term | null,
  students: Student[],
) {
  const [attRes, marksRes, remarksRes] = await Promise.all([
    supabase.from("attendance").select("student_id, status").eq("session_id", session.id),
    supabase.from("marks").select("student_id, score, max_score").eq("session_id", session.id),
    supabase.from("remarks").select("student_id, remark_text").eq("session_id", session.id),
  ]);
  if (attRes.error || marksRes.error || remarksRes.error) {
    alert(
      toSafeErrorMessage(
        attRes.error ?? marksRes.error ?? remarksRes.error,
        "Could not download that session sheet.",
      ),
    );
    return;
  }

  const attMap = new Map<string, AttStatus>();
  for (const a of (attRes.data as { student_id: string; status: AttStatus }[]) ?? []) {
    attMap.set(a.student_id, a.status);
  }
  const marksMap = new Map<string, { score: number | null; max_score: number }>();
  for (const m of (marksRes.data as {
    student_id: string;
    score: number | null;
    max_score: number;
  }[]) ?? []) {
    marksMap.set(m.student_id, { score: m.score, max_score: m.max_score });
  }
  const remarksMap = new Map<string, string>();
  for (const r of (remarksRes.data as { student_id: string; remark_text: string | null }[]) ?? []) {
    if (r.remark_text) remarksMap.set(r.student_id, r.remark_text);
  }

  // Per-session total (max_score set once per session). Fall back to any row that has it.
  const sessionMax =
    marksMap.size > 0 ? Math.max(...Array.from(marksMap.values()).map((m) => m.max_score || 0)) : 0;

  const schoolName = section.schools?.name ?? "—";
  const sectionLabel = `Grade ${section.grade} — ${section.section_name}`;
  const weekLabel = session.week_number != null ? `Week ${session.week_number}` : "Week —";
  const termLabel = term?.name ?? "—";
  const dateStr = formatDate(session.session_date);
  const safeName = `session_${session.session_date}_${sectionLabel}`.replace(/[^a-z0-9-_]+/gi, "_");

  // Sort by roll number (numeric-aware), then name
  const sorted = [...students].sort((a, b) => {
    const ar = a.roll_number ?? "";
    const br = b.roll_number ?? "";
    const an = Number(ar);
    const bn = Number(br);
    if (Number.isFinite(an) && Number.isFinite(bn) && ar !== "" && br !== "") return an - bn;
    return ar.localeCompare(br) || a.full_name.localeCompare(b.full_name);
  });

  if (format === "pdf") {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    await drawLogoHeader(doc);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Session Sheet", 40, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(sanitizeForPdf(schoolName), 40, 58);
    doc.text(sanitizeForPdf(sectionLabel), 40, 72);
    doc.text(`Date: ${dateStr}    ${weekLabel}    Term: ${termLabel}`, 40, 86);
    const present = sorted.filter((s) => attMap.get(s.id) === "present").length;
    const absent = sorted.filter((s) => attMap.get(s.id) === "absent").length;
    const late = sorted.filter((s) => attMap.get(s.id) === "late").length;
    doc.text(
      `Present: ${present}    Absent: ${absent}    Late: ${late}    Total students: ${sorted.length}    Total marks: ${sessionMax || "—"}`,
      40,
      100,
    );

    const body = sorted.map((s) => {
      const att = attMap.get(s.id);
      const m = marksMap.get(s.id);
      const obtained = m && m.score != null ? String(m.score) : "—";
      const total = m?.max_score ?? sessionMax;
      return [
        s.roll_number ?? "",
        sanitizeForPdf(s.full_name),
        attendanceSymbol(att),
        obtained,
        total ? String(total) : "—",
        sanitizeForPdf(remarksMap.get(s.id) ?? ""),
      ];
    });

    autoTable(doc, {
      startY: 116,
      head: [["Roll #", "Student Name", "Attendance", "Marks Obtained", "Total Marks", "Remarks"]],
      body,
      styles: { fontSize: 10, cellPadding: 5, overflow: "linebreak" },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 150 },
        2: { cellWidth: 65, halign: "center", fontStyle: "bold" },
        3: { cellWidth: 75, halign: "center" },
        4: { cellWidth: 65, halign: "center" },
        5: { cellWidth: "auto" },
      },
    });
    drawInstitutionalFooter(doc);
    doc.save(`${safeName}.pdf`);
    return;
  }

  // Excel: real numeric cells for Marks Obtained + Total Marks
  const header = [
    "Roll #",
    "Student Name",
    "Attendance",
    "Marks Obtained",
    "Total Marks",
    "Remarks",
  ];
  const aoa: (string | number)[][] = [
    ["Session Sheet"],
    [schoolName],
    [sectionLabel],
    [`Date: ${dateStr}`, weekLabel, `Term: ${termLabel}`],
    [],
    header,
  ];
  const headerRowIndex = aoa.length - 1; // 0-based
  for (const s of sorted) {
    const att = attMap.get(s.id);
    const m = marksMap.get(s.id);
    const obtained: string | number = m && m.score != null ? m.score : "—";
    const total: string | number = m?.max_score ?? sessionMax ?? "—";
    aoa.push([
      s.roll_number ?? "",
      s.full_name,
      attendanceSymbol(att),
      obtained,
      total,
      remarksMap.get(s.id) ?? "",
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  // Ensure numeric cell types for Marks Obtained (col D) and Total Marks (col E)
  for (let i = 0; i < sorted.length; i++) {
    const rowIdx = headerRowIndex + 1 + i;
    const dAddr = XLSX.utils.encode_cell({ r: rowIdx, c: 3 });
    const eAddr = XLSX.utils.encode_cell({ r: rowIdx, c: 4 });
    const dCell = ws[dAddr];
    const eCell = ws[eAddr];
    if (dCell && typeof dCell.v === "number") dCell.t = "n";
    if (eCell && typeof eCell.v === "number") eCell.t = "n";
  }
  ws["!cols"] = [{ wch: 8 }, { wch: 28 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 32 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Session");
  XLSX.writeFile(wb, `${safeName}.xlsx`);
}
