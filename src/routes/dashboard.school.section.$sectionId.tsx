import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExportButtons } from "@/components/dashboard/ExportButtons";
import type { ExportPayload } from "@/lib/school-export";

export const Route = createFileRoute("/dashboard/school/section/$sectionId")({
  component: SectionResultView,
});

interface Section {
  id: string;
  section_name: string;
  grade: number;
  school_id: string;
  schools: { name: string } | null;
}
interface Term {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}
interface DisplayRow {
  student_id: string;
  full_name: string;
  roll_number: string | null;
  attendance_percent: number | null;
  marks_obtained: number | null;
  marks_total: number | null;
  average_percent: number | null;
  present_count: number;
  total_sessions: number;
  remarks: string;
}

/** Shared shape between result_cards (term mode) and the
 * section_cumulative_result_cards RPC (cumulative mode) — both are
 * pre-computed server-side by the same compute_result_figures() SQL
 * function, so this page never recomputes a percentage itself. See
 * supabase/migrations/20260803010000_shared_result_figures.sql. */
interface ResultCardRow {
  student_id: string;
  full_name: string;
  roll_number: string | null;
  attendance_percent: number | null;
  average_percent: number | null;
  present_count: number;
  total_sessions: number;
  marks_obtained: number | null;
  marks_total: number | null;
  remarks_concatenated: string;
}

function toDisplayRow(r: ResultCardRow): DisplayRow {
  return {
    student_id: r.student_id,
    full_name: r.full_name,
    roll_number: r.roll_number,
    attendance_percent: r.attendance_percent,
    marks_obtained: r.marks_obtained,
    marks_total: r.marks_total,
    average_percent: r.average_percent,
    present_count: r.present_count,
    total_sessions: r.total_sessions,
    remarks: r.remarks_concatenated,
  };
}

type Mode = "term" | "cumulative";

function SectionResultView() {
  const { sectionId } = Route.useParams();
  const [section, setSection] = useState<Section | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [terms, setTerms] = useState<Term[]>([]);
  const [termId, setTermId] = useState<string>("");
  const [mode, setMode] = useState<Mode>("term");
  const [rows, setRows] = useState<DisplayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRemarks, setExpandedRemarks] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("sections")
        .select("id, section_name, grade, school_id, schools:school_id(name)")
        .eq("id", sectionId)
        .maybeSingle();
      if (!data) setAccessDenied(true);
      else setSection(data as unknown as Section);

      const { data: t } = await supabase
        .from("terms")
        .select("id, name, start_date, end_date, is_active")
        .order("start_date", { ascending: false });
      const tt = (t as Term[]) ?? [];
      setTerms(tt);
      const active = tt.find((x) => x.is_active) ?? tt[0];
      if (active) setTermId(active.id);
    })();
  }, [sectionId]);

  useEffect(() => {
    if (accessDenied) return;
    if (mode === "term" && !termId) return;
    setLoading(true);
    (async () => {
      // Both modes are one pre-computed query each — no client-side
      // aggregation. Term mode reads result_cards directly (per-session
      // average, historically-resolved section membership handles a
      // promoted student's past terms correctly on its own). Cumulative
      // mode calls the matching RPC — same underlying formula, scoped to
      // every session this section has ever had for its current roster.
      // See supabase/migrations/20260803010000_shared_result_figures.sql.
      const columns =
        "student_id, full_name, roll_number, attendance_percent, average_percent, present_count, total_sessions, marks_obtained, marks_total, remarks_concatenated";
      const { data } =
        mode === "term"
          ? await supabase
              .from("result_cards")
              .select(columns)
              .eq("section_id", sectionId)
              .eq("term_id", termId)
          : await supabase.rpc("section_cumulative_result_cards", { _section_id: sectionId });

      const display = ((data as ResultCardRow[]) ?? []).map(toDisplayRow).sort(sortByRoll);
      setRows(display);
      setLoading(false);
    })();
  }, [sectionId, termId, mode, accessDenied]);

  const activeTerm = useMemo(() => terms.find((t) => t.id === termId), [terms, termId]);

  const buildPayload = (): ExportPayload => {
    const subtitle = [
      section?.schools?.name,
      section ? `Grade ${section.grade} · Section ${section.section_name}` : null,
      mode === "term" ? `Term: ${activeTerm?.name ?? ""}` : "Cumulative across all terms",
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      title: "AstroBot — Section Result Card",
      subtitle,
      filename:
        `result-card_${section?.schools?.name ?? "school"}_G${section?.grade ?? ""}${section?.section_name ?? ""}_${
          mode === "term" ? (activeTerm?.name ?? "term") : "cumulative"
        }`.replace(/\s+/g, "_"),
      columns: [
        { header: "Roll #", key: "roll_number", width: 10 },
        { header: "Student", key: "full_name", width: 30 },
        { header: "Attendance %", key: "att", width: 14 },
        { header: "Sessions (P/T)", key: "sessions", width: 16 },
        { header: "Marks Obtained", key: "marks_obtained", width: 16 },
        { header: "Total Marks", key: "marks_total", width: 14 },
        { header: "Average Marks %", key: "avg", width: 16 },
        { header: "Remarks", key: "remarks", width: 60 },
      ],
      rows: rows.map((r) => ({
        roll_number: r.roll_number ?? "",
        full_name: r.full_name,
        att: r.attendance_percent != null ? r.attendance_percent.toFixed(0) : "—",
        sessions: `${r.present_count} / ${r.total_sessions}`,
        marks_obtained: r.marks_obtained != null ? Math.round(r.marks_obtained * 100) / 100 : "—",
        marks_total: r.marks_total != null ? Math.round(r.marks_total * 100) / 100 : "—",
        avg: r.average_percent != null ? r.average_percent.toFixed(1) : "—",
        remarks: r.remarks || "—",
      })),
    };
  };

  if (accessDenied) {
    return (
      <div className="mx-auto max-w-2xl p-8">
        <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-6">
          <h1 className="text-lg font-semibold text-red-200">Access denied</h1>
          <p className="mt-2 text-sm text-red-300/80">
            This section is not part of your school, or it does not exist.
          </p>
          <Link
            to="/dashboard/school"
            className="mt-4 inline-block rounded-md border border-red-500/40 px-3 py-1.5 text-xs text-red-200 hover:bg-red-500/10"
          >
            Back to overview
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-8">
      <div className="mb-2 text-xs">
        <Link to="/dashboard/school" className="text-slate-500 hover:text-slate-300">
          ← Overview
        </Link>
      </div>
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">
            {section ? `Section ${section.section_name}` : "…"}{" "}
            {section && <span className="text-slate-500">· Grade {section.grade}</span>}
          </h1>
          <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
            {section?.schools?.name}
          </div>
        </div>
        <ExportButtons payload={buildPayload} disabled={loading || rows.length === 0} />
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border border-slate-800 bg-slate-900/60 p-1 text-xs">
          <button
            onClick={() => setMode("term")}
            className={
              "rounded px-3 py-1.5 font-medium transition " +
              (mode === "term"
                ? "bg-indigo-500/20 text-indigo-200"
                : "text-slate-400 hover:text-slate-200")
            }
          >
            Current term
          </button>
          <button
            onClick={() => setMode("cumulative")}
            className={
              "rounded px-3 py-1.5 font-medium transition " +
              (mode === "cumulative"
                ? "bg-indigo-500/20 text-indigo-200"
                : "text-slate-400 hover:text-slate-200")
            }
          >
            Cumulative history
          </button>
        </div>
        {mode === "term" && (
          <>
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
          </>
        )}
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60">
        <div className="border-b border-slate-800 px-5 py-3 text-sm font-semibold text-slate-200">
          {mode === "term"
            ? `Result card${activeTerm ? " · " + activeTerm.name : ""}`
            : "Cumulative history · averaged across every session"}
        </div>
        {loading ? (
          <div className="p-6 text-center text-sm text-slate-500">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">No students in this section.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3 w-20">Roll #</th>
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3 w-32">Attendance</th>
                  <th className="px-5 py-3 w-36">Marks obtained</th>
                  <th className="px-5 py-3 w-32">Average marks</th>
                  <th className="px-5 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {rows.map((r) => {
                  const open = expandedRemarks.has(r.student_id);
                  return (
                    <tr key={r.student_id} className="text-slate-200 align-top">
                      <td className="px-5 py-3 text-slate-400">{r.roll_number ?? "—"}</td>
                      <td className="px-5 py-3">
                        <Link
                          to="/dashboard/school/student/$studentId"
                          params={{ studentId: r.student_id }}
                          className="text-slate-100 hover:text-indigo-200 hover:underline"
                        >
                          {r.full_name}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-slate-100">
                          {r.attendance_percent != null
                            ? `${r.attendance_percent.toFixed(0)}%`
                            : "—"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {r.present_count} / {r.total_sessions}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-slate-100">
                          {r.marks_obtained != null && r.marks_total != null
                            ? `${Math.round(r.marks_obtained * 100) / 100} / ${Math.round(r.marks_total * 100) / 100}`
                            : "—"}
                        </div>
                        <div className="text-xs text-slate-500">obtained / total</div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="text-slate-100">
                          {r.average_percent != null ? `${r.average_percent.toFixed(1)}%` : "—"}
                        </div>
                        <div className="text-xs text-slate-500">percentage</div>
                      </td>
                      <td className="px-5 py-3">
                        {r.remarks ? (
                          <button
                            onClick={() => {
                              setExpandedRemarks((prev) => {
                                const s = new Set(prev);
                                if (s.has(r.student_id)) s.delete(r.student_id);
                                else s.add(r.student_id);
                                return s;
                              });
                            }}
                            className="text-left text-xs text-slate-400 hover:text-indigo-200"
                          >
                            {open ? (
                              <span className="whitespace-pre-wrap">{r.remarks}</span>
                            ) : (
                              <span>
                                {r.remarks.length > 60 ? r.remarks.slice(0, 60) + "…" : r.remarks}{" "}
                                <span className="text-indigo-300">[expand]</span>
                              </span>
                            )}
                          </button>
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
        )}
      </section>
    </div>
  );
}

function sortByRoll(
  a: { roll_number: string | null; full_name: string },
  b: { roll_number: string | null; full_name: string },
) {
  const ra = a.roll_number ?? "";
  const rb = b.roll_number ?? "";
  const na = parseInt(ra, 10);
  const nb = parseInt(rb, 10);
  if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
  if (ra !== rb) return ra.localeCompare(rb);
  return a.full_name.localeCompare(b.full_name);
}
