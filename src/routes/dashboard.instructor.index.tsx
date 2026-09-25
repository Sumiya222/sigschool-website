import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toSafeErrorMessage } from "@/lib/db-error-message";

export const Route = createFileRoute("/dashboard/instructor/")({
  component: InstructorLanding,
});

interface AssignedSection {
  section_id: string;
  section_name: string;
  grade: number;
  school_id: string;
  school_name: string;
}

function InstructorLanding() {
  const [rows, setRows] = useState<AssignedSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("instructor_assignments")
        .select(
          "section_id, sections:section_id(id, section_name, grade, school_id, schools:school_id(id, name))",
        )
        .is("revoked_at", null);
      if (error) {
        setErr(toSafeErrorMessage(error, "Could not load your classes."));
        setLoading(false);
        return;
      }
      const mapped: AssignedSection[] = (
        (data as unknown as Array<{
          section_id: string;
          sections: {
            id: string;
            section_name: string;
            grade: number;
            school_id: string;
            schools: { id: string; name: string; is_active: boolean } | null;
          } | null;
        }>) ?? []
      )
        .filter((r) => r.sections && r.sections.schools && r.sections.schools.is_active !== false)
        .map((r) => ({
          section_id: r.section_id,
          section_name: r.sections!.section_name,
          grade: r.sections!.grade,
          school_id: r.sections!.school_id,
          school_name: r.sections!.schools?.name ?? "—",
        }));
      // Sort: school → grade → section_name
      mapped.sort(
        (a, b) =>
          a.school_name.localeCompare(b.school_name) ||
          a.grade - b.grade ||
          a.section_name.localeCompare(b.section_name),
      );
      setRows(mapped);
      setLoading(false);
    })();
  }, []);

  // Group by school
  const bySchool = new Map<string, AssignedSection[]>();
  for (const r of rows) {
    const list = bySchool.get(r.school_name) ?? [];
    list.push(r);
    bySchool.set(r.school_name, list);
  }

  return (
    <div className="mx-auto max-w-5xl p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">My classes</h1>
        <p className="mt-1 text-sm text-slate-400">
          Pick a section to take attendance, enter marks, and review results.
        </p>
      </header>

      {err && (
        <div className="mb-4 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {err}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-10 text-center text-sm text-slate-500">
          Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-10 text-center">
          <div className="text-sm font-semibold text-slate-200">No classes yet</div>
          <p className="mt-2 text-sm text-slate-400">
            You haven't been assigned to any classes yet — contact your administrator.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(bySchool.entries()).map(([school, list]) => (
            <section key={school}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {school}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((s) => (
                  <Link
                    key={s.section_id}
                    to="/dashboard/instructor/section/$sectionId"
                    params={{ sectionId: s.section_id }}
                    className="group rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-indigo-500/50 hover:bg-slate-900"
                  >
                    <div className="text-xs uppercase tracking-wider text-slate-500">
                      Grade {s.grade}
                    </div>
                    <div className="mt-1 text-lg font-semibold text-slate-100 group-hover:text-indigo-200">
                      {s.section_name}
                    </div>
                    <div className="mt-4 text-xs text-slate-500 group-hover:text-slate-400">
                      Open workspace →
                    </div>
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
