import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { toSafeErrorMessage, type DbErrorLike } from "@/lib/db-error-message";
import { verifyRowsAffected } from "@/lib/db-write-verify";
import { formatDate } from "@/lib/format-date";
import { StudentImportPanel } from "@/components/dashboard/StudentImportPanel";
import {
  exportCsv as exportCsvRows,
  exportXlsx as exportXlsxRows,
  drawLogoHeader,
  drawInstitutionalFooter,
} from "@/lib/school-export";
import { sanitizeForPdf } from "@/lib/sanitize-pdf-text";

type StudentsSearch = { schoolId?: string; sectionId?: string };

// True server-side pagination: each page is fetched with .range() and an
// exact count, so payload size never grows with the total student body
// across every school — unlike a single capped fetch, older/earlier records
// stay reachable by paging back instead of falling off a hard ceiling.
const PAGE_SIZE = 25;

// Export fetches the full filtered set in bounded chunks, independent of
// the on-screen page size — same pattern as RegistrationsPanel.tsx.
const EXPORT_CHUNK = 1000;

/** Escapes a value embedded in a PostgREST `.or()` filter string — commas and
 * parentheses are clause delimiters there, so unescaped ones in free-typed
 * search text could be parsed as extra filter clauses rather than literal
 * characters to search for. */
function escapeOrValue(v: string): string {
  return v.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

export const Route = createFileRoute("/dashboard/admin/students")({
  component: StudentsPage,
  validateSearch: (s: Record<string, unknown>): StudentsSearch => ({
    schoolId: typeof s.schoolId === "string" ? s.schoolId : undefined,
    sectionId: typeof s.sectionId === "string" ? s.sectionId : undefined,
  }),
});

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
interface Student {
  id: string;
  section_id: string;
  full_name: string;
  roll_number: string | null;
  notes: string | null;
  is_active: boolean;
}
interface EnrollmentHistoryRow {
  id: string;
  academic_year: string;
  grade: number;
  section_id: string;
  start_date: string;
  end_date: string | null;
  section_name: string | null;
  school_name: string | null;
}

function StudentsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [sectionCount, setSectionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Import flow — the actual parse/validate/insert logic lives in the
  // shared StudentImportPanel; this page only owns which section it targets.
  const [targetSchoolId, setTargetSchoolId] = useState("");
  const [targetSectionId, setTargetSectionId] = useState("");

  // Browse filters (seedable from URL search params)
  const search_params = Route.useSearch();
  const [filterSchoolId, setFilterSchoolId] = useState(search_params.schoolId ?? "");
  const [filterSectionId, setFilterSectionId] = useState(search_params.sectionId ?? "");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [historyOpenId, setHistoryOpenId] = useState<string | null>(null);
  const [historyCache, setHistoryCache] = useState<
    Record<string, EnrollmentHistoryRow[] | "loading" | { error: string }>
  >({});
  const [pageIndex, setPageIndex] = useState(0);

  // Debounce the free-text search so every keystroke doesn't fire a query.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadReference = useCallback(async () => {
    const [schRes, secRes] = await Promise.all([
      supabase.from("schools").select("id, name").order("name"),
      supabase
        .from("sections")
        .select("id, school_id, grade, section_name")
        .order("grade")
        .order("section_name"),
    ]);
    if (schRes.error) setErr(toSafeErrorMessage(schRes.error, "Could not load schools."));
    setSchools((schRes.data as School[]) ?? []);
    setSections((secRes.data as Section[]) ?? []);
  }, []);

  const loadStudentsPage = useCallback(async () => {
    setRefreshing(true);
    const from = pageIndex * PAGE_SIZE;
    const columns = "id, section_id, full_name, roll_number, notes, is_active";
    let query = filterSchoolId
      ? supabase
          .from("students")
          .select(`${columns}, sections!inner(school_id)`, { count: "exact" })
          .eq("sections.school_id", filterSchoolId)
      : supabase.from("students").select(columns, { count: "exact" });
    if (!showInactive) query = query.eq("is_active", true);
    if (filterSectionId) query = query.eq("section_id", filterSectionId);
    if (search) {
      const esc = escapeOrValue(search);
      query = query.or(`full_name.ilike.%${esc}%,roll_number.ilike.%${esc}%`);
    }
    const { data, error, count } = await query.order("full_name").range(from, from + PAGE_SIZE - 1);
    if (error) setErr(toSafeErrorMessage(error, "Could not load students."));
    else {
      setErr(null);
      setStudents((data as unknown as Student[]) ?? []);
      setTotalStudents(count ?? 0);
    }
    setLoading(false);
    setRefreshing(false);
  }, [filterSchoolId, filterSectionId, search, showInactive, pageIndex]);

  const refreshSectionCount = useCallback(async () => {
    if (!filterSectionId) {
      setSectionCount(0);
      return;
    }
    const { count } = await supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("section_id", filterSectionId)
      .eq("is_active", true);
    setSectionCount(count ?? 0);
  }, [filterSectionId]);

  const reloadAll = useCallback(async () => {
    await Promise.all([loadReference(), loadStudentsPage(), refreshSectionCount()]);
  }, [loadReference, loadStudentsPage, refreshSectionCount]);

  useEffect(() => {
    void loadReference();
  }, [loadReference]);

  useEffect(() => {
    void loadStudentsPage();
  }, [loadStudentsPage]);

  useEffect(() => {
    void refreshSectionCount();
  }, [refreshSectionCount]);

  useEffect(() => {
    setPageIndex(0);
  }, [filterSchoolId, filterSectionId, search, showInactive]);

  const sectionsForTarget = useMemo(
    () => sections.filter((s) => s.school_id === targetSchoolId),
    [sections, targetSchoolId],
  );
  const sectionsForFilter = useMemo(
    () => sections.filter((s) => s.school_id === filterSchoolId),
    [sections, filterSchoolId],
  );
  const sectionById = useMemo(() => {
    const m: Record<string, Section> = {};
    sections.forEach((s) => (m[s.id] = s));
    return m;
  }, [sections]);
  const schoolById = useMemo(() => {
    const m: Record<string, School> = {};
    schools.forEach((s) => (m[s.id] = s));
    return m;
  }, [schools]);

  const totalPages = Math.max(1, Math.ceil(totalStudents / PAGE_SIZE));
  const currentPage = Math.min(pageIndex + 1, totalPages);
  const rangeStart = totalStudents === 0 ? 0 : pageIndex * PAGE_SIZE + 1;
  const rangeEnd = Math.min((pageIndex + 1) * PAGE_SIZE, totalStudents);
  const filtersActive = Boolean(filterSchoolId || filterSectionId || search || showInactive);

  /**
   * Fetches every student matching the active filters (not just the
   * current on-screen page) in bounded chunks, then resolves each row's
   * "Enrolled" date from enrollment_history.start_date for their current
   * section, falling back to created_at only where no enrollment_history
   * row exists -- created_at is when the row was entered, which can be
   * months after the student actually joined.
   */
  async function fetchAllFilteredStudents(): Promise<
    Array<Student & { created_at: string; enrolled: string | null }>
  > {
    const columns = "id, section_id, full_name, roll_number, notes, is_active, created_at";
    let all: Array<Student & { created_at: string }> = [];
    let offset = 0;
    while (true) {
      let query = filterSchoolId
        ? supabase
            .from("students")
            .select(`${columns}, sections!inner(school_id)`)
            .eq("sections.school_id", filterSchoolId)
        : supabase.from("students").select(columns);
      if (!showInactive) query = query.eq("is_active", true);
      if (filterSectionId) query = query.eq("section_id", filterSectionId);
      if (search) {
        const esc = escapeOrValue(search);
        query = query.or(`full_name.ilike.%${esc}%,roll_number.ilike.%${esc}%`);
      }
      const { data, error } = await query
        .order("full_name")
        .range(offset, offset + EXPORT_CHUNK - 1);
      if (error) throw error;
      const chunk = (data as unknown as Array<Student & { created_at: string }>) ?? [];
      all = all.concat(chunk);
      if (chunk.length < EXPORT_CHUNK) break;
      offset += EXPORT_CHUNK;
    }

    if (all.length === 0) return [];

    const { data: historyData, error: historyError } = await supabase
      .from("enrollment_history")
      .select("student_id, section_id, start_date")
      .in(
        "student_id",
        all.map((s) => s.id),
      );
    if (historyError) throw historyError;
    const earliestStart = new Map<string, string>();
    for (const h of (historyData as Array<{
      student_id: string;
      section_id: string;
      start_date: string;
    }>) ?? []) {
      const key = `${h.student_id}:${h.section_id}`;
      const existing = earliestStart.get(key);
      if (!existing || h.start_date < existing) earliestStart.set(key, h.start_date);
    }

    return all.map((s) => ({
      ...s,
      enrolled: earliestStart.get(`${s.id}:${s.section_id}`) ?? null,
    }));
  }

  async function runExport(format: "csv" | "xlsx") {
    setExporting(true);
    try {
      const rows = await fetchAllFilteredStudents();
      const payload = {
        title: filtersActive ? "Students (filtered)" : "Students",
        filename: `students-${new Date().toISOString().slice(0, 10)}`,
        columns: [
          { header: "School", key: "school" },
          { header: "Grade", key: "grade" },
          { header: "Section", key: "section" },
          { header: "Roll #", key: "roll" },
          { header: "Full Name", key: "name" },
          { header: "Notes (Father's Name)", key: "notes" },
          { header: "Active", key: "active" },
          { header: "Enrolled", key: "enrolled" },
        ],
        rows: rows.map((s) => {
          const sec = sectionById[s.section_id];
          const sch = sec ? schoolById[sec.school_id] : null;
          return {
            school: sch?.name ?? "",
            grade: sec?.grade ?? "",
            section: sec?.section_name ?? "",
            roll: s.roll_number ?? "",
            name: s.full_name,
            notes: s.notes ?? "",
            active: s.is_active ? "Yes" : "No",
            enrolled: formatDate(s.enrolled ?? s.created_at),
          };
        }),
      };
      if (format === "csv") exportCsvRows(payload);
      else exportXlsxRows(payload);
    } catch (ex: unknown) {
      setErr(toSafeErrorMessage(ex as DbErrorLike, "Could not export students."));
    } finally {
      setExporting(false);
    }
  }

  /**
   * A purpose-built, single-section roster PDF -- deliberately not the
   * same 8-column payload as CSV/Excel. CSV/Excel can span every school
   * with no cap; a PDF meant to be printed or handed to someone needs to
   * stay to one classroom's worth of rows, so this is only enabled once
   * both a school and section are picked, and it only carries what a
   * printed class list actually needs: roll number, name, and whether
   * the student is currently active. Follows the same layout convention
   * as the existing Session Sheet PDFs (branded header/footer, plain
   * autoTable), not the generic multi-purpose exportPdf() table dump.
   */
  async function runRosterPdf() {
    if (!filterSchoolId || !filterSectionId) return;
    setExporting(true);
    try {
      const rows = await fetchAllFilteredStudents();
      const sec = sectionById[filterSectionId];
      const sch = schoolById[filterSchoolId];
      const sectionLabel = sec ? `Grade ${sec.grade} — Section ${sec.section_name}` : "";

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      await drawLogoHeader(doc);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("Class Roster", 40, 40);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(sanitizeForPdf(sch?.name ?? ""), 40, 58);
      doc.text(sanitizeForPdf(sectionLabel), 40, 72);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(`Generated ${formatDate(new Date().toISOString())}`, 40, 86);
      doc.setTextColor(0);

      autoTable(doc, {
        startY: 100,
        head: [["Roll #", "Full Name", "Active"]],
        body: rows
          .slice()
          .sort((a, b) => (a.roll_number ?? "").localeCompare(b.roll_number ?? ""))
          .map((s) => [
            s.roll_number ?? "",
            sanitizeForPdf(s.full_name),
            s.is_active ? "Yes" : "No",
          ]),
        styles: { fontSize: 10, cellPadding: 6 },
        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
        columnStyles: {
          // Wide enough for a full TEMP-XXXXXXXX placeholder on one line —
          // those are an expected, common value here, not an edge case.
          0: { cellWidth: 120 },
          2: { cellWidth: 60, halign: "center" },
        },
      });

      drawInstitutionalFooter(doc);
      const safeName = `${sch?.name ?? "school"}_${sectionLabel}`.replace(/\s+/g, "_");
      doc.save(`roster_${safeName}.pdf`);
    } catch (ex: unknown) {
      setErr(toSafeErrorMessage(ex as DbErrorLike, "Could not export the roster PDF."));
    } finally {
      setExporting(false);
    }
  }

  async function deleteStudent(s: Student) {
    if (
      !confirm(
        `Permanently delete "${s.full_name}"?\n\nThis also removes their attendance, marks, remarks and enrollment history — it cannot be undone. To keep their history, use Deactivate instead.`,
      )
    )
      return;
    const { error } = await verifyRowsAffected(supabase.from("students").delete().eq("id", s.id));
    if (error) alert(toSafeErrorMessage(error, "Could not delete that student."));
    else void reloadAll();
  }

  async function deactivateAllInSection() {
    if (!filterSectionId || sectionCount === 0) return;
    const sec = sectionById[filterSectionId];
    const label = sec ? `Grade ${sec.grade} - ${sec.section_name}` : "this section";
    if (
      !confirm(
        `Deactivate all ${sectionCount} active student(s) in ${label}?\n\nThey will be hidden from active rosters and new session entry, but their existing attendance, marks, and remarks are preserved in term result cards. You can reactivate them individually later.`,
      )
    )
      return;
    const { error } = await verifyRowsAffected(
      supabase
        .from("students")
        .update({ is_active: false })
        .eq("section_id", filterSectionId)
        .eq("is_active", true),
    );
    if (error) alert(toSafeErrorMessage(error, "Could not deactivate those students."));
    else void reloadAll();
  }

  async function toggleActive(s: Student) {
    if (s.is_active) {
      if (
        !confirm(
          `Deactivate "${s.full_name}"?\n\nThey will be hidden from active rosters and new session entry, but their existing attendance, marks, and remarks are preserved in term result cards. You can reactivate them later.`,
        )
      )
        return;
    }
    const { error } = await verifyRowsAffected(
      supabase.from("students").update({ is_active: !s.is_active }).eq("id", s.id),
    );
    if (error) alert(toSafeErrorMessage(error, "Could not update that student."));
    else void loadStudentsPage();
  }

  async function toggleHistory(studentId: string) {
    if (historyOpenId === studentId) {
      setHistoryOpenId(null);
      return;
    }
    setHistoryOpenId(studentId);
    if (historyCache[studentId] && historyCache[studentId] !== "loading") return;
    setHistoryCache((prev) => ({ ...prev, [studentId]: "loading" }));
    const { data, error } = await supabase
      .from("enrollment_history")
      .select(
        "id, academic_year, grade, section_id, start_date, end_date, sections(section_name, schools(name))",
      )
      .eq("student_id", studentId)
      .order("start_date", { ascending: true });
    if (error) {
      setHistoryCache((prev) => ({
        ...prev,
        [studentId]: { error: toSafeErrorMessage(error, "Could not load enrollment history.") },
      }));
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: EnrollmentHistoryRow[] = (data ?? []).map((r: any) => ({
      id: r.id,
      academic_year: r.academic_year,
      grade: r.grade,
      section_id: r.section_id,
      start_date: r.start_date,
      end_date: r.end_date,
      section_name: r.sections?.section_name ?? null,
      school_name: r.sections?.schools?.name ?? null,
    }));
    setHistoryCache((prev) => ({ ...prev, [studentId]: rows }));
  }

  const targetSectionRow = targetSectionId ? sectionById[targetSectionId] : null;

  return (
    <div className="mx-auto max-w-6xl p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">Students</h1>
        <p className="mt-1 text-sm text-slate-400">
          Bulk import rosters from Excel into a specific section, and browse all students in the
          system.
        </p>
      </header>

      {/* IMPORT */}
      <section className="mb-8 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-200">Import roster</h2>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <select
            value={targetSchoolId}
            onChange={(e) => {
              setTargetSchoolId(e.target.value);
              setTargetSectionId("");
            }}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            <option value="">— target school —</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={targetSectionId}
            onChange={(e) => setTargetSectionId(e.target.value)}
            disabled={!targetSchoolId}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-40"
          >
            <option value="">— target section —</option>
            {sectionsForTarget.map((s) => (
              <option key={s.id} value={s.id}>
                Grade {s.grade} — {s.section_name}
              </option>
            ))}
          </select>
        </div>

        {targetSectionRow ? (
          <StudentImportPanel
            key={targetSectionId}
            sectionId={targetSectionId}
            sectionLabel={`Grade ${targetSectionRow.grade} — ${targetSectionRow.section_name}`}
            onImported={() => void reloadAll()}
          />
        ) : (
          <p className="text-sm text-slate-400">Pick a target school and section to import into.</p>
        )}
      </section>

      {/* BROWSE */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
          <h2 className="text-sm font-semibold text-slate-200">All students</h2>
          <div className="filter-bar sm:w-auto">
            <select
              value={filterSchoolId}
              onChange={(e) => {
                setFilterSchoolId(e.target.value);
                setFilterSectionId("");
              }}
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
              value={filterSectionId}
              onChange={(e) => setFilterSectionId(e.target.value)}
              disabled={!filterSchoolId}
              className="rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-100 disabled:opacity-40 sm:py-1"
            >
              <option value="">All sections</option>
              {sectionsForFilter.map((s) => (
                <option key={s.id} value={s.id}>
                  Grade {s.grade} — {s.section_name}
                </option>
              ))}
            </select>
            <input
              placeholder="Search name/roll"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-100 sm:py-1"
            />
            <label className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-xs text-slate-300 sm:py-1">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="size-3 accent-indigo-500"
              />
              Show inactive
            </label>
            {filterSectionId && sectionCount > 0 && (
              <button
                onClick={deactivateAllInSection}
                className="rounded-md border border-amber-900 px-3 py-2 text-xs text-amber-300 hover:bg-amber-950/40 sm:py-1"
              >
                Deactivate all in section ({sectionCount})
              </button>
            )}
            <button
              onClick={() => void runExport("csv")}
              disabled={exporting}
              className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-indigo-500/50 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-40 sm:py-1"
            >
              {exporting
                ? "Exporting…"
                : filtersActive
                  ? "Export filtered results (CSV)"
                  : "Export CSV"}
            </button>
            <button
              onClick={() => void runExport("xlsx")}
              disabled={exporting}
              className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-indigo-500/50 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-40 sm:py-1"
            >
              {exporting
                ? "Exporting…"
                : filtersActive
                  ? "Export filtered results (Excel)"
                  : "Export Excel"}
            </button>
            <button
              onClick={() => void runRosterPdf()}
              disabled={exporting || !filterSchoolId || !filterSectionId}
              title={
                !filterSchoolId || !filterSectionId
                  ? "Pick a school and section to export a roster PDF"
                  : undefined
              }
              className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-indigo-500/50 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-40 sm:py-1"
            >
              {exporting ? "Exporting…" : "Export PDF (this section)"}
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
                <th className="px-6 py-3">Roll #</th>
                <th className="px-6 py-3">School</th>
                <th className="px-6 py-3">Section</th>
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
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    No students match.
                  </td>
                </tr>
              ) : (
                students.flatMap((s) => {
                  const sec = sectionById[s.section_id];
                  const sch = sec ? schoolById[sec.school_id] : null;
                  const isOpen = historyOpenId === s.id;
                  const hist = historyCache[s.id];
                  return [
                    <tr
                      key={s.id}
                      className={"text-slate-200 " + (!s.is_active ? "opacity-60" : "")}
                    >
                      <td className="px-6 py-3">
                        <Link
                          to="/dashboard/admin/student/$studentId"
                          params={{ studentId: s.id }}
                          className="text-slate-100 hover:text-indigo-200 hover:underline"
                        >
                          {s.full_name}
                        </Link>
                        {!s.is_active && (
                          <span className="ml-2 rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-slate-400">
                        {s.roll_number}
                        {s.roll_number?.startsWith("TEMP-") && (
                          <span
                            title="School hasn't issued a real roll number yet"
                            className="ml-2 rounded-full bg-slate-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400"
                          >
                            Placeholder
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-slate-400">{sch?.name ?? "—"}</td>
                      <td className="px-6 py-3 text-slate-400">
                        {sec ? `Grade ${sec.grade} - ${sec.section_name}` : "—"}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => toggleHistory(s.id)}
                            className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-indigo-500 hover:text-indigo-200"
                          >
                            {isOpen ? "Hide history" : "History"}
                          </button>
                          {s.is_active ? (
                            <button
                              onClick={() => toggleActive(s)}
                              className="rounded-md border border-amber-900 px-3 py-1 text-xs text-amber-300 hover:bg-amber-950/40"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleActive(s)}
                              className="rounded-md border border-emerald-800 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-950/40"
                            >
                              Reactivate
                            </button>
                          )}
                          <button
                            onClick={() => deleteStudent(s)}
                            className="rounded-md border border-red-900 px-3 py-1 text-xs text-red-300 hover:bg-red-950/40"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>,
                    isOpen ? (
                      <tr key={s.id + ":history"} className="bg-slate-950/40">
                        <td colSpan={5} className="px-6 py-4">
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                            Enrollment history
                          </div>
                          {hist === "loading" || hist === undefined ? (
                            <div className="text-xs text-slate-500">Loading…</div>
                          ) : !Array.isArray(hist) ? (
                            <div className="text-xs text-red-300">Failed to load: {hist.error}</div>
                          ) : hist.length === 0 ? (
                            <div className="text-xs text-slate-500">
                              No enrollment history recorded.
                            </div>
                          ) : (
                            <ol className="space-y-1 text-xs text-slate-300">
                              {hist.map((h) => (
                                <li key={h.id} className="flex flex-wrap items-center gap-2">
                                  <span className="font-mono text-slate-400">
                                    {h.academic_year}
                                  </span>
                                  <span>·</span>
                                  <span className="text-slate-200">
                                    Grade {h.grade}
                                    {h.section_name ? ` - ${h.section_name}` : ""}
                                  </span>
                                  {h.school_name && (
                                    <span className="text-slate-500">({h.school_name})</span>
                                  )}
                                  <span className="text-slate-500">
                                    · {formatDate(h.start_date)} →{" "}
                                    {h.end_date ? formatDate(h.end_date) : "present"}
                                  </span>
                                  {!h.end_date && (
                                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-300">
                                      Active
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ol>
                          )}
                        </td>
                      </tr>
                    ) : null,
                  ];
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && totalStudents > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-6 py-3 text-xs text-slate-400">
            <div>
              Showing <span className="text-slate-200">{rangeStart}</span>–
              <span className="text-slate-200">{rangeEnd}</span> of{" "}
              <span className="text-slate-200">{totalStudents}</span> students
              {refreshing ? " · loading…" : ""}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                disabled={currentPage <= 1 || refreshing}
                className="rounded-md border border-slate-700 px-3 py-1 text-slate-200 hover:border-indigo-500 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="px-1">
                Page <span className="text-slate-200">{currentPage}</span> of{" "}
                <span className="text-slate-200">{totalPages}</span>
              </span>
              <button
                onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages || refreshing}
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
