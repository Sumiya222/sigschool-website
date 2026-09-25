import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Fragment } from "react";
import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/integrations/supabase/client";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import { drawInstitutionalFooter, drawLogoHeader } from "@/lib/school-export";
import { sanitizeForPdf } from "@/lib/sanitize-pdf-text";

export const Route = createFileRoute("/dashboard/admin/overview")({
  component: OverviewPage,
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
interface StudentLite {
  id: string;
  section_id: string;
}

function OverviewPage() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<School[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [students, setStudents] = useState<StudentLite[]>([]);
  const [instructorCount, setInstructorCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // Filters (multi-select)
  const [schoolIds, setSchoolIds] = useState<string[]>([]);
  const [grades, setGrades] = useState<number[]>([]);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [schoolPage, setSchoolPage] = useState(1);
  const [sectionIds, setSectionIds] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [schRes, secRes, stuRes, insRes] = await Promise.all([
        supabase.from("schools").select("id, name").order("name"),
        supabase
          .from("sections")
          .select("id, school_id, grade, section_name")
          .order("grade")
          .order("section_name"),
        // is_active: true — this feeds the headline "Students" figure, the
        // per-row breakdown, and the CSV/Excel/PDF exports below. It must
        // match what a school is actually billed for (generate_invoice
        // counts the same way), or the exported total silently disagrees
        // with the invoice a school received.
        supabase.from("students").select("id, section_id").eq("is_active", true),
        supabase.from("instructor_assignments").select("instructor_user_id").is("revoked_at", null),
      ]);
      if (schRes.error) setErr(toSafeErrorMessage(schRes.error, "Could not load the overview."));
      setSchools((schRes.data as School[]) ?? []);
      setSections((secRes.data as Section[]) ?? []);
      setStudents((stuRes.data as StudentLite[]) ?? []);
      const uniq = new Set(
        ((insRes.data ?? []) as { instructor_user_id: string }[]).map((r) => r.instructor_user_id),
      );
      setInstructorCount(uniq.size);
      setLoading(false);
    })();
  }, []);

  // Grade options are whatever grades actually exist across current sections —
  // never a fixed 1-8/1-12 list, since schools can introduce any grade.
  const availableGrades = useMemo(() => {
    return [...new Set(sections.map((s) => s.grade))].sort((a, b) => a - b);
  }, [sections]);

  const schoolById = useMemo(() => new Map(schools.map((s) => [s.id, s])), [schools]);
  const sectionById = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);
  const countBySection = useMemo(() => {
    const m = new Map<string, number>();
    for (const st of students) m.set(st.section_id, (m.get(st.section_id) ?? 0) + 1);
    return m;
  }, [students]);

  // Dynamically-scoped section options for the section filter
  const eligibleSections = useMemo(() => {
    return sections.filter((s) => {
      if (schoolIds.length && !schoolIds.includes(s.school_id)) return false;
      if (grades.length && !grades.includes(s.grade)) return false;
      return true;
    });
  }, [sections, schoolIds, grades]);

  // Drop any picked section that's no longer eligible
  useEffect(() => {
    if (!sectionIds.length) return;
    const ok = new Set(eligibleSections.map((s) => s.id));
    const filtered = sectionIds.filter((id) => ok.has(id));
    if (filtered.length !== sectionIds.length) setSectionIds(filtered);
  }, [eligibleSections, sectionIds]);

  // Filtered sections that make up the current view
  const viewSections = useMemo(() => {
    return eligibleSections.filter((s) => (sectionIds.length ? sectionIds.includes(s.id) : true));
  }, [eligibleSections, sectionIds]);

  const viewSectionIds = useMemo(() => new Set(viewSections.map((s) => s.id)), [viewSections]);
  const viewStudentTotal = useMemo(
    () => viewSections.reduce((sum, s) => sum + (countBySection.get(s.id) ?? 0), 0),
    [viewSections, countBySection],
  );

  // Auto-expand when a specific school is chosen so admin sees breakdown directly
  useEffect(() => {
    if (schoolIds.length) {
      const e: Record<string, boolean> = {};
      for (const sid of schoolIds) {
        e[`school:${sid}`] = true;
        for (const g of availableGrades) e[`school:${sid}:grade:${g}`] = true;
      }
      setExpanded(e);
    }
  }, [schoolIds, availableGrades]);

  // Hierarchical view: School -> Grade -> Section
  const tree = useMemo(() => {
    const bySchool = new Map<string, Map<number, Section[]>>();
    for (const sec of viewSections) {
      if (!bySchool.has(sec.school_id)) bySchool.set(sec.school_id, new Map());
      const g = bySchool.get(sec.school_id)!;
      if (!g.has(sec.grade)) g.set(sec.grade, []);
      g.get(sec.grade)!.push(sec);
    }
    const rows: {
      school: School;
      total: number;
      grades: { grade: number; total: number; sections: Section[] }[];
    }[] = [];
    for (const [schoolId, gradeMap] of bySchool) {
      const school = schoolById.get(schoolId);
      if (!school) continue;
      const gradesArr = [...gradeMap.entries()]
        .sort(([a], [b]) => a - b)
        .map(([grade, secs]) => ({
          grade,
          sections: secs,
          total: secs.reduce((s, x) => s + (countBySection.get(x.id) ?? 0), 0),
        }));
      const total = gradesArr.reduce((s, g) => s + g.total, 0);
      rows.push({ school, grades: gradesArr, total });
    }
    rows.sort((a, b) => a.school.name.localeCompare(b.school.name));
    return rows;
  }, [viewSections, schoolById, countBySection]);

  const clearFilters = () => {
    setSchoolIds([]);
    setGrades([]);
    setSectionIds([]);
    setExpanded({});
  };

  const toggle = (k: string) => setExpanded((e) => ({ ...e, [k]: !e[k] }));

  // ------- Exports -------
  const buildExportRows = () => {
    const rows: Array<{
      School: string;
      Grade: number | string;
      Section: string;
      Students: number;
    }> = [];
    for (const r of tree) {
      for (const g of r.grades) {
        for (const sec of g.sections) {
          rows.push({
            School: r.school.name,
            Grade: sec.grade,
            Section: sec.section_name,
            Students: countBySection.get(sec.id) ?? 0,
          });
        }
      }
    }
    return rows;
  };

  const exportCSV = () => {
    const rows = buildExportRows();
    const header = ["School", "Grade", "Section", "Students"];
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        [r.School, r.Grade, r.Section, r.Students]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      ),
      `"TOTAL","","",${viewStudentTotal}`,
    ].join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv" }), "student-overview.csv");
  };

  const exportXLSX = () => {
    const rows = buildExportRows();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.sheet_add_aoa(ws, [["TOTAL", "", "", viewStudentTotal]], { origin: -1 });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Overview");
    XLSX.writeFile(wb, "student-overview.xlsx");
  };

  const exportPDF = async () => {
    const rows = buildExportRows();
    const doc = new jsPDF();
    await drawLogoHeader(doc);
    doc.setFontSize(14);
    doc.text("Student Overview", 14, 16);
    doc.setFontSize(10);
    doc.text(`Total students: ${viewStudentTotal}`, 14, 24);
    autoTable(doc, {
      startY: 30,
      head: [["School", "Grade", "Section", "Students"]],
      body: rows.map((r) => [
        sanitizeForPdf(r.School),
        r.Grade,
        sanitizeForPdf(r.Section),
        r.Students,
      ]),
      foot: [["TOTAL", "", "", viewStudentTotal]],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [79, 70, 229] },
    });
    drawInstitutionalFooter(doc);
    doc.save("student-overview.pdf");
  };

  if (loading) return <div className="p-6 text-slate-400">Loading overview…</div>;

  return (
    <div className="p-6">
      <header className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Admin overview</h1>
          <p className="mt-1 text-sm text-slate-400">
            Live student counts across every school, grade, and section.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportCSV}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
          >
            Export CSV
          </button>
          <button
            onClick={exportXLSX}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
          >
            Export Excel
          </button>
          <button
            onClick={exportPDF}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
          >
            Export PDF
          </button>
        </div>
      </header>

      {err && (
        <div className="mb-4 rounded-md border border-red-800 bg-red-950/60 px-3 py-2 text-sm text-red-200">
          {err}
        </div>
      )}

      {/* Summary */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Students (filtered)" value={viewStudentTotal} highlight />
        <StatCard label="Schools" value={schools.length} />
        <StatCard label="Sections" value={sections.length} />
        <StatCard label="Active instructors" value={instructorCount} />
      </section>

      {/* Filters */}
      <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <MultiSelect
            label="Schools"
            options={schools.map((s) => ({ value: s.id, label: s.name }))}
            selected={schoolIds}
            onChange={setSchoolIds}
            allLabel="All Schools"
          />
          <MultiSelect
            label="Grades"
            options={availableGrades.map((g) => ({ value: String(g), label: `Grade ${g}` }))}
            selected={grades.map(String)}
            onChange={(vals) => setGrades(vals.map(Number))}
            allLabel="All Grades"
          />
          <MultiSelect
            label="Sections"
            options={eligibleSections.map((s) => ({
              value: s.id,
              label: `${schoolById.get(s.school_id)?.name ?? "?"} · G${s.grade} · ${s.section_name}`,
            }))}
            selected={sectionIds}
            onChange={setSectionIds}
            allLabel="All Sections"
            emptyHint="No sections match the current school/grade selection."
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Filters combine. Section options are scoped to the current school/grade.
          </p>
          <button
            onClick={clearFilters}
            className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
          >
            Clear filters
          </button>
        </div>
      </section>

      {/* Drill-down table */}
      {(() => {
        const PAGE_SIZE = 10;
        const q = schoolSearch.trim().toLowerCase();
        const filteredTree = q ? tree.filter((r) => r.school.name.toLowerCase().includes(q)) : tree;
        const totalPages = Math.max(1, Math.ceil(filteredTree.length / PAGE_SIZE));
        const currentPage = Math.min(schoolPage, totalPages);
        const pageStart = (currentPage - 1) * PAGE_SIZE;
        const pagedTree = filteredTree.slice(pageStart, pageStart + PAGE_SIZE);
        return (
          <section className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-950/40 px-4 py-3">
              <input
                type="search"
                value={schoolSearch}
                onChange={(e) => {
                  setSchoolSearch(e.target.value);
                  setSchoolPage(1);
                }}
                placeholder="Search schools…"
                className="w-full max-w-xs rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              />
              <span className="ml-auto text-xs text-slate-500">
                {filteredTree.length === 0
                  ? "0 schools"
                  : `Showing ${pageStart + 1}–${Math.min(pageStart + PAGE_SIZE, filteredTree.length)} of ${filteredTree.length}`}
              </span>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-950/60 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">School / Grade / Section</th>
                  <th className="px-4 py-3 text-right">Students</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {pagedTree.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-sm text-slate-500">
                      {tree.length === 0
                        ? "No sections match the current filters."
                        : "No schools match your search."}
                    </td>
                  </tr>
                )}
                {pagedTree.map((r) => {
                  const sKey = `school:${r.school.id}`;
                  const sOpen = !!expanded[sKey];
                  return (
                    <Fragment key={sKey}>
                      <tr className="bg-slate-900/40">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggle(sKey)}
                            className="flex items-center gap-2 font-semibold text-slate-100"
                          >
                            <span className="inline-block w-4 text-slate-500">
                              {sOpen ? "▾" : "▸"}
                            </span>
                            {r.school.name}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-200">{r.total}</td>
                      </tr>
                      {sOpen &&
                        r.grades.map((g) => {
                          const gKey = `${sKey}:grade:${g.grade}`;
                          const gOpen = !!expanded[gKey];
                          return (
                            <Fragment key={gKey}>
                              <tr>
                                <td className="px-4 py-2 pl-10">
                                  <button
                                    onClick={() => toggle(gKey)}
                                    className="flex items-center gap-2 text-slate-200"
                                  >
                                    <span className="inline-block w-4 text-slate-500">
                                      {gOpen ? "▾" : "▸"}
                                    </span>
                                    Grade {g.grade}
                                  </button>
                                </td>
                                <td className="px-4 py-2 text-right font-mono text-slate-300">
                                  {g.total}
                                </td>
                              </tr>
                              {gOpen &&
                                g.sections.map((sec) => {
                                  const count = countBySection.get(sec.id) ?? 0;
                                  return (
                                    <tr key={sec.id}>
                                      <td className="px-4 py-2 pl-16 text-slate-300">
                                        Section {sec.section_name}
                                      </td>
                                      <td className="px-4 py-2 text-right">
                                        <button
                                          onClick={() =>
                                            navigate({
                                              to: "/dashboard/admin/students",
                                              search: {
                                                schoolId: sec.school_id,
                                                sectionId: sec.id,
                                              },
                                            })
                                          }
                                          className="font-mono text-indigo-300 hover:text-indigo-200 hover:underline"
                                        >
                                          {count}
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </Fragment>
                          );
                        })}
                    </Fragment>
                  );
                })}
                {filteredTree.length > 0 && (
                  <tr className="bg-slate-950/60">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-200">
                      Total (filtered)
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-100">
                      {viewStudentTotal}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {filteredTree.length > PAGE_SIZE && (
              <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/40 px-4 py-3 text-xs text-slate-400">
                <button
                  onClick={() => setSchoolPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Prev
                </button>
                <span className="font-mono">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setSchoolPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            )}
          </section>
        );
      })()}

      <p className="mt-4 text-xs text-slate-500">
        Tip: click a section's count to jump to that section's student list.{" "}
        <Link to="/dashboard/admin/students" className="text-indigo-400 hover:underline">
          Browse all students →
        </Link>
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        highlight ? "border-indigo-700/60 bg-indigo-950/40" : "border-slate-800 bg-slate-900/60"
      }`}
    >
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div
        className={`mt-1 text-2xl font-semibold ${highlight ? "text-indigo-200" : "text-slate-100"}`}
      >
        {value}
      </div>
    </div>
  );
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  allLabel,
  emptyHint,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
  allLabel: string;
  emptyHint?: string;
}) {
  const [query, setQuery] = useState("");
  const toggle = (v: string) => {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };
  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </label>
        {selected.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="text-[11px] text-indigo-300 hover:underline"
          >
            Reset
          </button>
        )}
      </div>
      <div className="rounded-md border border-slate-700 bg-slate-950/60">
        {options.length > 0 && (
          <div className="border-b border-slate-800 p-1.5">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="w-full rounded bg-transparent px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
        )}
        <div className="max-h-40 overflow-y-auto p-2">
          {options.length === 0 ? (
            <p className="px-1 py-2 text-xs text-slate-500">{emptyHint ?? "No options."}</p>
          ) : (
            <>
              <div className="px-1 pb-1 text-[11px] text-slate-500">
                {selected.length === 0 ? allLabel : `${selected.length} selected`}
              </div>
              {filtered.length === 0 ? (
                <p className="px-1 py-2 text-xs text-slate-500">No matches.</p>
              ) : (
                filtered.map((o) => (
                  <label
                    key={o.value}
                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs text-slate-200 hover:bg-slate-800/60"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(o.value)}
                      onChange={() => toggle(o.value)}
                      className="h-3.5 w-3.5 accent-indigo-500"
                    />
                    <span className="truncate">{o.label}</span>
                  </label>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
