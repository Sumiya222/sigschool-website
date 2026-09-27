import { Fragment as FragmentRow } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { BRAND } from "@/lib/brand";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import { verifyRowsAffected } from "@/lib/db-write-verify";
import { formatDate } from "@/lib/format-date";
import { formatMarks } from "@/lib/format-marks";
import { ExportButtons } from "@/components/dashboard/ExportButtons";
import { drawInstitutionalFooter, drawLogoHeader } from "@/lib/school-export";
import type { ExportPayload } from "@/lib/school-export";
import { sanitizeForPdf } from "@/lib/sanitize-pdf-text";

export const Route = createFileRoute("/dashboard/admin/sessions")({
  component: SessionCalendarPage,
});

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8];
const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface School {
  id: string;
  name: string;
}
interface InstructorOption {
  user_id: string;
  email: string;
  full_name: string | null;
}
interface SessionRow {
  id: string;
  session_date: string;
  section_id: string;
  instructor_user_id: string | null;
  grade: number;
  section_name: string;
  school_id: string;
  school_name: string;
  week_number: number | null;
  term_id: string;
}
interface RosterStudent {
  id: string;
  full_name: string;
  roll_number: string | null;
}
type AttStatus = "present" | "absent" | "late";
interface SessionDetailRow {
  student_id: string;
  status: AttStatus | null;
  score: number | null;
  max_score: number | null;
  remark: string | null;
}

function attendanceSymbol(status: AttStatus | undefined | null): string {
  if (status === "present") return "P";
  if (status === "absent") return "A";
  if (status === "late") return "L";
  return "";
}

/** Mirrors the instructor portal's per-session download (attendance + marks
 * + remarks sheet) so admins can pull the same document for any section. */
async function downloadAdminSessionSheet(
  session: SessionRow,
  format: "pdf" | "xlsx",
  termName: string,
) {
  const [rosterRes, attRes, marksRes, remarksRes] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, roll_number")
      .eq("section_id", session.section_id)
      .eq("is_active", true),
    supabase.from("attendance").select("student_id, status").eq("session_id", session.id),
    supabase.from("marks").select("student_id, score, max_score").eq("session_id", session.id),
    supabase.from("remarks").select("student_id, remark_text").eq("session_id", session.id),
  ]);
  if (rosterRes.error || attRes.error || marksRes.error || remarksRes.error) {
    alert(
      toSafeErrorMessage(
        rosterRes.error ?? attRes.error ?? marksRes.error ?? remarksRes.error,
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

  const sessionMax =
    marksMap.size > 0 ? Math.max(...Array.from(marksMap.values()).map((m) => m.max_score || 0)) : 0;

  const sectionLabel = `Grade ${session.grade} — ${session.section_name}`;
  const weekLabel = session.week_number != null ? `Week ${session.week_number}` : "Week —";
  const dateStr = formatDate(session.session_date);
  const safeName = `session_${session.session_date}_${sectionLabel}`.replace(/[^a-z0-9-_]+/gi, "_");

  const sorted = ((rosterRes.data as RosterStudent[]) ?? []).sort((a, b) => {
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
    doc.text(sanitizeForPdf(session.school_name), 40, 58);
    doc.text(sanitizeForPdf(sectionLabel), 40, 72);
    doc.text(`Date: ${dateStr}    ${weekLabel}    Term: ${termName}`, 40, 86);
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
    [session.school_name],
    [sectionLabel],
    [`Date: ${dateStr}`, weekLabel, `Term: ${termName}`],
    [],
    header,
  ];
  const headerRowIndex = aoa.length - 1;
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

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function SessionCalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [monthCursor, setMonthCursor] = useState<Date>(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<string>(toDateKey(today));

  const [schools, setSchools] = useState<School[]>([]);
  const [instructors, setInstructors] = useState<InstructorOption[]>([]);
  const [terms, setTerms] = useState<Record<string, string>>({});
  const [filterSchoolId, setFilterSchoolId] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterInstructorId, setFilterInstructorId] = useState("");

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [schRes, instRes, termsRes] = await Promise.all([
        supabase.from("schools").select("id, name").order("name"),
        supabase.rpc("admin_list_instructors"),
        supabase.from("terms").select("id, name"),
      ]);
      setSchools((schRes.data as School[]) ?? []);
      setInstructors(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ((instRes.data as any[]) ?? [])
          .filter((r) => r.whitelist_status === "approved" && r.user_id)
          .map((r) => ({ user_id: r.user_id, email: r.email, full_name: r.full_name })),
      );
      const termMap: Record<string, string> = {};
      for (const t of (termsRes.data as { id: string; name: string }[]) ?? [])
        termMap[t.id] = t.name;
      setTerms(termMap);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      const monthStart = toDateKey(monthCursor);
      const monthEnd = toDateKey(
        new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0),
      );

      let query = supabase
        .from("class_sessions")
        .select(
          "id, session_date, section_id, instructor_user_id, week_number, term_id, sections!inner(grade, section_name, school_id, schools(name))",
        )
        .gte("session_date", monthStart)
        .lte("session_date", monthEnd);
      if (filterSchoolId) query = query.eq("sections.school_id", filterSchoolId);
      if (filterGrade) query = query.eq("sections.grade", Number(filterGrade));
      if (filterInstructorId) query = query.eq("instructor_user_id", filterInstructorId);

      const { data, error } = await query.order("session_date");
      if (error) {
        setErr(toSafeErrorMessage(error, "Could not load sessions."));
        setSessions([]);
        setLoading(false);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = ((data as any[]) ?? []).map((s) => ({
        id: s.id,
        session_date: s.session_date,
        section_id: s.section_id,
        instructor_user_id: s.instructor_user_id,
        week_number: s.week_number,
        term_id: s.term_id,
        grade: s.sections?.grade,
        section_name: s.sections?.section_name,
        school_id: s.sections?.school_id,
        school_name: s.sections?.schools?.name ?? "—",
      })) as SessionRow[];
      setSessions(rows);
      setLoading(false);
    })();
  }, [monthCursor, filterSchoolId, filterGrade, filterInstructorId]);

  const countsByDay = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of sessions) counts[s.session_date] = (counts[s.session_date] ?? 0) + 1;
    return counts;
  }, [sessions]);

  const instructorLabel = (userId: string | null): string => {
    if (!userId) return "—";
    const inst = instructors.find((i) => i.user_id === userId);
    if (!inst) return "Instructor";
    return inst.full_name?.trim() ? inst.full_name : inst.email;
  };

  const selectedDaySessions = sessions
    .filter((s) => s.session_date === selectedDate)
    .sort((a, b) => a.school_name.localeCompare(b.school_name) || a.grade - b.grade);

  const calendarCells = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstWeekday = startOfMonth(monthCursor).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const cells: { date: Date; key: string; inMonth: boolean }[] = [];
    for (let i = firstWeekday - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, daysInPrevMonth - i);
      cells.push({ date, key: toDateKey(date), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      cells.push({ date, key: toDateKey(date), inMonth: true });
    }
    let trailing = 1;
    while (cells.length % 7 !== 0) {
      const date = new Date(year, month + 1, trailing++);
      cells.push({ date, key: toDateKey(date), inMonth: false });
    }
    return cells;
  }, [monthCursor]);

  const monthLabel = monthCursor.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const todayKey = toDateKey(today);

  async function deleteSession(s: SessionRow) {
    if (
      !confirm(
        `Delete the ${formatDate(s.session_date)} session for Grade ${s.grade} - ${s.section_name}? This permanently deletes all attendance, marks, and remarks recorded for it — this can't be undone.`,
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
    setSessions((prev) => prev.filter((x) => x.id !== s.id));
  }

  function buildExportPayload(): ExportPayload {
    const activeFilters = [
      filterSchoolId ? schools.find((s) => s.id === filterSchoolId)?.name : null,
      filterGrade ? `Grade ${filterGrade}` : null,
      filterInstructorId ? instructorLabel(filterInstructorId) : null,
    ].filter(Boolean);
    return {
      title: `${BRAND.shortName} — Session Calendar`,
      subtitle: `${formatDate(selectedDate)}${activeFilters.length ? ` · ${activeFilters.join(" · ")}` : ""}`,
      filename: `sessions-${selectedDate}`,
      columns: [
        { header: "School", key: "school" },
        { header: "Grade", key: "grade" },
        { header: "Section", key: "section" },
        { header: "Instructor", key: "instructor" },
      ],
      rows: selectedDaySessions.map((s) => ({
        school: s.school_name,
        grade: s.grade,
        section: s.section_name,
        instructor: instructorLabel(s.instructor_user_id),
      })),
    };
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">Session calendar</h1>
        <p className="mt-1 text-sm text-slate-400">
          Every class session across all schools, by day. Filter and click a day to drill in.
        </p>
      </header>

      <section className="mb-6 flex flex-wrap items-end gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            School
          </label>
          <select
            value={filterSchoolId}
            onChange={(e) => setFilterSchoolId(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">All schools</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Grade
          </label>
          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">All grades</option>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Instructor
          </label>
          <select
            value={filterInstructorId}
            onChange={(e) => setFilterInstructorId(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">All instructors</option>
            {instructors.map((i) => (
              <option key={i.user_id} value={i.user_id}>
                {i.full_name?.trim() ? i.full_name : i.email}
              </option>
            ))}
          </select>
        </div>
        {(filterSchoolId || filterGrade || filterInstructorId) && (
          <button
            onClick={() => {
              setFilterSchoolId("");
              setFilterGrade("");
              setFilterInstructorId("");
            }}
            className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-600 hover:text-slate-100"
          >
            Clear filters
          </button>
        )}
      </section>

      {err && (
        <div className="mb-4 rounded-md border border-red-900/60 bg-red-950/40 px-4 py-2 text-sm text-red-300">
          {err}
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <section className="w-full shrink-0 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/60 lg:w-[300px]">
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-3 py-2.5">
            <button
              onClick={() =>
                setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))
              }
              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-tight text-slate-100">{monthLabel}</h2>
              <button
                onClick={() => {
                  setMonthCursor(startOfMonth(today));
                  setSelectedDate(todayKey);
                }}
                className="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 transition-colors hover:border-indigo-500/60 hover:text-indigo-300"
              >
                Today
              </button>
            </div>
            <button
              onClick={() =>
                setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))
              }
              className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
              aria-label="Next month"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="p-2.5">
            <div className="grid grid-cols-7">
              {WEEKDAY_LABELS.map((w, i) => (
                <div
                  key={w}
                  className={
                    "pb-1 text-center text-[9px] font-semibold uppercase tracking-wider " +
                    (i === 0 || i === 6 ? "text-slate-600" : "text-slate-500")
                  }
                >
                  {w.slice(0, 2)}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((cell) => {
                const count = countsByDay[cell.key] ?? 0;
                const isSelected = cell.key === selectedDate;
                const isToday = cell.key === todayKey;
                const dotOpacity =
                  count <= 2 ? "opacity-40" : count <= 5 ? "opacity-70" : "opacity-100";
                return (
                  <button
                    key={cell.key}
                    onClick={() => cell.inMonth && setSelectedDate(cell.key)}
                    disabled={!cell.inMonth}
                    className={
                      "flex h-9 w-9 flex-col items-center justify-center gap-0.5 rounded-md text-[11px] transition-colors duration-150 " +
                      (!cell.inMonth
                        ? "cursor-default text-slate-700"
                        : isSelected
                          ? "bg-indigo-500 font-semibold text-white shadow-sm"
                          : isToday
                            ? "font-semibold text-indigo-300 ring-1 ring-inset ring-indigo-400/70"
                            : "text-slate-300 hover:bg-slate-800/70")
                    }
                  >
                    <span>{cell.date.getDate()}</span>
                    {cell.inMonth && count > 0 && (
                      <span
                        className={
                          "h-1 w-1 rounded-full " +
                          (isSelected ? "bg-white" : "bg-emerald-400 " + dotOpacity)
                        }
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="inline-block h-1 w-1 rounded-full bg-emerald-400" />
              Has sessions
            </div>
          </div>
        </section>

        <section className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-6 py-4">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-slate-200">
                Sessions on <span className="text-indigo-300">{formatDate(selectedDate)}</span>
              </h2>
              <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300">
                {selectedDaySessions.length}
              </span>
            </div>
            <ExportButtons
              payload={buildExportPayload}
              disabled={selectedDaySessions.length === 0}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">School</th>
                  <th className="px-6 py-3">Grade / Section</th>
                  <th className="px-6 py-3">Instructor</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                      Loading…
                    </td>
                  </tr>
                ) : selectedDaySessions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-slate-500">
                      No sessions recorded for this day.
                    </td>
                  </tr>
                ) : (
                  selectedDaySessions.map((s) => {
                    const isOpen = openSessionId === s.id;
                    return (
                      <FragmentRow key={s.id}>
                        <tr className="text-slate-200">
                          <td className="px-6 py-3">{s.school_name}</td>
                          <td className="px-6 py-3">
                            Grade {s.grade} - {s.section_name}
                          </td>
                          <td className="px-6 py-3 text-slate-300">
                            {instructorLabel(s.instructor_user_id)}
                          </td>
                          <td className="px-6 py-3 text-right">
                            <div className="inline-flex flex-wrap justify-end gap-2">
                              <button
                                onClick={() => setOpenSessionId(isOpen ? null : s.id)}
                                className="rounded-md bg-cyan-600 px-3 py-1 text-xs font-semibold text-white hover:bg-cyan-500"
                              >
                                {isOpen ? "Close" : "View"}
                              </button>
                              <Link
                                to="/dashboard/admin/schools/$schoolId/sections/$sectionId/sessions"
                                params={{ schoolId: s.school_id, sectionId: s.section_id }}
                                className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-slate-600 hover:text-slate-100"
                              >
                                Full section history
                              </Link>
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
                            <td colSpan={4} className="px-6 py-4">
                              <SessionWindow session={s} termName={terms[s.term_id] ?? "—"} />
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
    </div>
  );
}

/** Expandable read-only window showing one session's per-student
 * attendance/marks/remarks — opens in place under the clicked row rather
 * than navigating away, so browsing several sessions in a row stays fast. */
function SessionWindow({ session, termName }: { session: SessionRow; termName: string }) {
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [rows, setRows] = useState<Record<string, SessionDetailRow>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const sectionId = session.section_id;
  const sessionId = session.id;

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

  const downloadToolbar = (
    <div className="mb-2 flex justify-end gap-2">
      <button
        onClick={() => downloadAdminSessionSheet(session, "pdf", termName)}
        className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-indigo-500/60 hover:text-indigo-200"
        title="Download this session's attendance + marks sheet as PDF"
      >
        Download PDF
      </button>
      <button
        onClick={() => downloadAdminSessionSheet(session, "xlsx", termName)}
        className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-emerald-500/60 hover:text-emerald-200"
        title="Download this session's attendance + marks sheet as Excel"
      >
        Download Excel
      </button>
    </div>
  );

  if (loading)
    return (
      <div>
        {downloadToolbar}
        <div className="py-6 text-center text-sm text-slate-500">Loading…</div>
      </div>
    );
  if (err)
    return (
      <div>
        {downloadToolbar}
        <div className="text-sm text-red-300">{err}</div>
      </div>
    );
  if (students.length === 0)
    return (
      <div>
        {downloadToolbar}
        <div className="py-6 text-center text-sm text-slate-500">No students in this section.</div>
      </div>
    );

  return (
    <div>
      {downloadToolbar}
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
    </div>
  );
}
