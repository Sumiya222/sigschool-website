import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSchoolSession } from "@/lib/school-context";

export const Route = createFileRoute("/dashboard/school/")({
  component: SchoolLanding,
});

interface SectionRow {
  id: string;
  section_name: string;
  grade: number;
  school_id: string;
}
interface SchoolRow {
  id: string;
  name: string;
}
interface TermRow {
  id: string;
  name: string;
  is_active: boolean;
}

function SchoolLanding() {
  const { schoolId } = useSchoolSession();
  const [school, setSchool] = useState<SchoolRow | null>(null);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [studentCount, setStudentCount] = useState<number>(0);
  const [activeTerm, setActiveTerm] = useState<TermRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const schoolQ = schoolId
        ? supabase.from("schools").select("id, name").eq("id", schoolId).maybeSingle()
        : supabase.from("schools").select("id, name").limit(1).maybeSingle();
      const sectionsQ = schoolId
        ? supabase
            .from("sections")
            .select("id, section_name, grade, school_id")
            .eq("school_id", schoolId)
            .order("grade")
            .order("section_name")
        : supabase
            .from("sections")
            .select("id, section_name, grade, school_id")
            .order("grade")
            .order("section_name");
      // is_active: true on both branches -- must match generate_invoice's
      // own count, or this stat disagrees with what the school is billed.
      const studentsQ = schoolId
        ? supabase
            .from("students")
            .select("id", { count: "exact", head: true })
            .in(
              "section_id",
              (await supabase.from("sections").select("id").eq("school_id", schoolId)).data?.map(
                (r) => r.id,
              ) ?? [],
            )
            .eq("is_active", true)
        : supabase
            .from("students")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true);
      const termQ = supabase
        .from("terms")
        .select("id, name, is_active")
        .eq("is_active", true)
        .maybeSingle();

      const [schoolRes, sectionsRes, studentsRes, termRes] = await Promise.all([
        schoolQ,
        sectionsQ,
        studentsQ,
        termQ,
      ]);
      setSchool((schoolRes.data as SchoolRow) ?? null);
      setSections((sectionsRes.data as SectionRow[]) ?? []);
      setStudentCount(studentsRes.count ?? 0);
      setActiveTerm((termRes.data as TermRow) ?? null);
      setLoading(false);
    })();
  }, [schoolId]);

  const byGrade = new Map<number, SectionRow[]>();
  for (const s of sections) {
    if (!byGrade.has(s.grade)) byGrade.set(s.grade, []);
    byGrade.get(s.grade)!.push(s);
  }
  const grades = [...byGrade.keys()].sort((a, b) => a - b);

  return (
    <div className="mx-auto max-w-6xl p-8">
      <header className="mb-6">
        <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
          {school?.name ?? "School"}
        </div>
        <h1 className="mt-1 text-2xl font-semibold text-slate-100">Overview</h1>
        <p className="mt-1 text-sm text-slate-400">
          Read-only view of your school's sections and result cards.
        </p>
      </header>

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Stat label="Total students" value={loading ? "…" : String(studentCount)} />
        <Stat label="Sections" value={loading ? "…" : String(sections.length)} />
        <Stat label="Active term" value={activeTerm?.name ?? (loading ? "…" : "—")} />
      </div>

      {loading ? (
        <div className="text-sm text-slate-500">Loading…</div>
      ) : grades.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-500">
          No sections found for your school yet.
        </div>
      ) : (
        <div className="space-y-6">
          {grades.map((g) => (
            <section key={g} className="rounded-xl border border-slate-800 bg-slate-900/60">
              <div className="border-b border-slate-800 px-5 py-3 text-sm font-semibold text-slate-200">
                Grade {g}
              </div>
              <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {byGrade
                  .get(g)!
                  .sort((a, b) => a.section_name.localeCompare(b.section_name))
                  .map((s) => (
                    <Link
                      key={s.id}
                      to="/dashboard/school/section/$sectionId"
                      params={{ sectionId: s.id }}
                      className="group rounded-lg border border-slate-800 bg-slate-950/60 p-4 transition hover:border-indigo-500/50 hover:bg-slate-900"
                    >
                      <div className="text-sm font-medium text-slate-100 group-hover:text-indigo-200">
                        Section {s.section_name}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">View result cards →</div>
                    </Link>
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-100">{value}</div>
    </div>
  );
}
