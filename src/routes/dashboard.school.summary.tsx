import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSchoolSession } from "@/lib/school-context";
import { ExportButtons } from "@/components/dashboard/ExportButtons";
import type { ExportPayload } from "@/lib/school-export";

export const Route = createFileRoute("/dashboard/school/summary")({
  component: SchoolSummary,
});

interface SectionRow {
  id: string;
  section_name: string;
  grade: number;
}
interface Term {
  id: string;
  name: string;
  start_date: string;
  is_active: boolean;
}
interface Row {
  section_id: string;
  grade: number;
  section_name: string;
  student_count: number;
  avg_attendance: number | null;
  avg_marks: number | null;
}

function SchoolSummary() {
  const { schoolId } = useSchoolSession();
  const [schoolName, setSchoolName] = useState<string>("");
  const [terms, setTerms] = useState<Term[]>([]);
  const [termId, setTermId] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [schoolRes, termsRes] = await Promise.all([
        schoolId
          ? supabase.from("schools").select("name").eq("id", schoolId).maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from("terms")
          .select("id, name, start_date, is_active")
          .order("start_date", { ascending: false }),
      ]);
      setSchoolName((schoolRes.data as { name?: string } | null)?.name ?? "");
      const tt = (termsRes.data as Term[]) ?? [];
      setTerms(tt);
      const active = tt.find((t) => t.is_active) ?? tt[0];
      if (active) setTermId(active.id);
    })();
  }, [schoolId]);

  useEffect(() => {
    if (!termId) return;
    setLoading(true);
    (async () => {
      const sectionsQ = schoolId
        ? supabase.from("sections").select("id, section_name, grade").eq("school_id", schoolId)
        : supabase.from("sections").select("id, section_name, grade");
      const { data: secs } = await sectionsQ;
      const sections = (secs as SectionRow[]) ?? [];
      if (sections.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }
      const sectionIds = sections.map((s) => s.id);

      // Get result_cards for the selected term (per-student) so we can average.
      // Also get student counts per section.
      const [rcRes, studentsRes] = await Promise.all([
        supabase
          .from("result_cards")
          .select("section_id, average_percent, attendance_percent, student_id")
          .eq("term_id", termId)
          .in("section_id", sectionIds),
        // is_active: true -- must match generate_invoice's own count, or
        // this "Students" column disagrees with what the school is billed.
        supabase
          .from("students")
          .select("id, section_id")
          .in("section_id", sectionIds)
          .eq("is_active", true),
      ]);
      const rcRows =
        (rcRes.data as Array<{
          section_id: string;
          average_percent: number | null;
          attendance_percent: number | null;
          student_id: string | null;
        }>) ?? [];
      const students = (studentsRes.data as Array<{ id: string; section_id: string }>) ?? [];
      const studentCounts = new Map<string, number>();
      for (const s of students)
        studentCounts.set(s.section_id, (studentCounts.get(s.section_id) ?? 0) + 1);

      const agg = new Map<string, { attSum: number; attN: number; mkSum: number; mkN: number }>();
      for (const r of rcRows) {
        const a = agg.get(r.section_id) ?? { attSum: 0, attN: 0, mkSum: 0, mkN: 0 };
        if (r.attendance_percent != null) {
          a.attSum += r.attendance_percent;
          a.attN += 1;
        }
        if (r.average_percent != null) {
          a.mkSum += r.average_percent;
          a.mkN += 1;
        }
        agg.set(r.section_id, a);
      }

      const out: Row[] = sections
        .map((s) => {
          const a = agg.get(s.id);
          return {
            section_id: s.id,
            grade: s.grade,
            section_name: s.section_name,
            student_count: studentCounts.get(s.id) ?? 0,
            avg_attendance: a && a.attN > 0 ? a.attSum / a.attN : null,
            avg_marks: a && a.mkN > 0 ? a.mkSum / a.mkN : null,
          };
        })
        .sort((x, y) => x.grade - y.grade || x.section_name.localeCompare(y.section_name));
      setRows(out);
      setLoading(false);
    })();
  }, [schoolId, termId]);

  const activeTerm = useMemo(() => terms.find((t) => t.id === termId), [terms, termId]);

  const buildPayload = (): ExportPayload => ({
    title: "AstroBot — School-Wide Summary",
    subtitle: `${schoolName || "School"} · Term: ${activeTerm?.name ?? ""}`,
    filename: `school-summary_${schoolName || "school"}_${activeTerm?.name ?? "term"}`.replace(
      /\s+/g,
      "_",
    ),
    columns: [
      { header: "Grade", key: "grade", width: 8 },
      { header: "Section", key: "section", width: 12 },
      { header: "Students", key: "students", width: 10 },
      { header: "Avg Attendance %", key: "att", width: 16 },
      { header: "Avg Mark %", key: "mk", width: 14 },
    ],
    rows: rows.map((r) => ({
      grade: r.grade,
      section: r.section_name,
      students: r.student_count,
      att: r.avg_attendance != null ? r.avg_attendance.toFixed(0) : "—",
      mk: r.avg_marks != null ? r.avg_marks.toFixed(1) : "—",
    })),
  });

  return (
    <div className="mx-auto max-w-6xl p-8">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
            {schoolName || "School"}
          </div>
          <h1 className="mt-1 text-2xl font-semibold text-slate-100">School-wide summary</h1>
          <p className="mt-1 text-sm text-slate-400">
            Section-level averages for the selected term.
          </p>
        </div>
        <ExportButtons payload={buildPayload} disabled={loading || rows.length === 0} />
      </header>

      <div className="mb-4 flex items-center gap-3">
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

      <section className="rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 px-5 py-3 text-sm font-semibold text-slate-200">
          Sections {activeTerm && <span className="text-slate-500">· {activeTerm.name}</span>}
        </div>
        {loading ? (
          <div className="p-6 text-center text-sm text-slate-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">No sections found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 w-24">Grade</th>
                  <th className="px-5 py-3">Section</th>
                  <th className="px-5 py-3 w-28">Students</th>
                  <th className="px-5 py-3 w-40">Avg attendance</th>
                  <th className="px-5 py-3 w-32">Avg mark</th>
                  <th className="px-5 py-3 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((r) => (
                  <tr key={r.section_id} className="text-slate-200">
                    <td className="px-5 py-3 text-slate-400">Grade {r.grade}</td>
                    <td className="px-5 py-3">Section {r.section_name}</td>
                    <td className="px-5 py-3">{r.student_count}</td>
                    <td className="px-5 py-3">
                      {r.avg_attendance != null ? `${r.avg_attendance.toFixed(0)}%` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      {r.avg_marks != null ? `${r.avg_marks.toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        to="/dashboard/school/section/$sectionId"
                        params={{ sectionId: r.section_id }}
                        className="text-xs text-indigo-300 hover:text-indigo-200"
                      >
                        View →
                      </Link>
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
