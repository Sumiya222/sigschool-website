import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toSafeErrorMessage } from "@/lib/db-error-message";

export const Route = createFileRoute("/dashboard/admin/promotion")({
  head: () => ({
    meta: [{ title: "Grade promotion — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: PromotionPage,
});

interface School {
  id: string;
  name: string;
  is_active: boolean;
}
interface Section {
  id: string;
  school_id: string;
  grade: number;
  section_name: string;
}
interface Student {
  id: string;
  full_name: string;
  roll_number: string | null;
  is_active: boolean;
}

function defaultAcademicYear(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  return m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

function PromotionPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [schoolId, setSchoolId] = useState("");
  const [sourceSectionId, setSourceSectionId] = useState("");
  const [targetSectionId, setTargetSectionId] = useState("");
  const [manualTarget, setManualTarget] = useState(false);

  const [roster, setRoster] = useState<Student[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const [academicYear, setAcademicYear] = useState(defaultAcademicYear());
  const [busy, setBusy] = useState(false);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  // Create-section (fallback)
  const [showCreate, setShowCreate] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [creatingSection, setCreatingSection] = useState(false);

  async function refreshTop() {
    setLoading(true);
    const [schRes, secRes] = await Promise.all([
      supabase.from("schools").select("id, name, is_active").order("name"),
      supabase
        .from("sections")
        .select("id, school_id, grade, section_name")
        .order("grade")
        .order("section_name"),
    ]);
    if (schRes.error)
      setErr(toSafeErrorMessage(schRes.error, "Could not load schools and sections."));
    setSchools((schRes.data as School[]) ?? []);
    setSections((secRes.data as Section[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    refreshTop();
  }, []);

  const sourceSection = useMemo(
    () => sections.find((s) => s.id === sourceSectionId) ?? null,
    [sections, sourceSectionId],
  );

  const autoTarget = useMemo(() => {
    if (!sourceSection) return null;
    return (
      sections.find(
        (s) =>
          s.school_id === sourceSection.school_id &&
          s.grade === sourceSection.grade + 1 &&
          s.section_name === sourceSection.section_name,
      ) ?? null
    );
  }, [sections, sourceSection]);

  // When source changes, reset downstream state
  useEffect(() => {
    setTargetSectionId("");
    setManualTarget(false);
    setShowCreate(false);
    setDoneMsg(null);
    if (!sourceSectionId) {
      setRoster([]);
      setSelected({});
      return;
    }
    (async () => {
      setRosterLoading(true);
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, roll_number, is_active")
        .eq("section_id", sourceSectionId)
        .eq("is_active", true)
        .order("roll_number", { ascending: true, nullsFirst: false });
      if (error) setErr(toSafeErrorMessage(error, "Could not load the roster."));
      const rows = (data as Student[]) ?? [];
      setRoster(rows);
      const sel: Record<string, boolean> = {};
      rows.forEach((r) => (sel[r.id] = true));
      setSelected(sel);
      setRosterLoading(false);
    })();
  }, [sourceSectionId]);

  // Auto-set target once we have one
  useEffect(() => {
    if (autoTarget && !manualTarget) setTargetSectionId(autoTarget.id);
  }, [autoTarget, manualTarget]);

  const schoolSections = useMemo(
    () => sections.filter((s) => s.school_id === schoolId),
    [sections, schoolId],
  );
  const eligibleManualTargets = useMemo(() => {
    if (!sourceSection) return [] as Section[];
    return sections.filter(
      (s) => s.school_id === sourceSection.school_id && s.id !== sourceSection.id,
    );
  }, [sections, sourceSection]);

  const selectedIds = useMemo(
    () =>
      Object.entries(selected)
        .filter(([, v]) => v)
        .map(([k]) => k),
    [selected],
  );
  const heldBack = roster.length - selectedIds.length;

  async function createTargetSection() {
    if (!sourceSection || !newSectionName.trim()) return;
    setCreatingSection(true);
    setErr(null);
    const { data, error } = await supabase
      .from("sections")
      .insert({
        school_id: sourceSection.school_id,
        grade: sourceSection.grade + 1,
        section_name: newSectionName.trim(),
      })
      .select("id, school_id, grade, section_name")
      .single();
    setCreatingSection(false);
    if (error) {
      setErr(toSafeErrorMessage(error, "Could not create that section."));
      return;
    }
    const created = data as Section;
    setSections((prev) => [...prev, created]);
    setTargetSectionId(created.id);
    setManualTarget(true);
    setShowCreate(false);
    setNewSectionName("");
  }

  async function executePromotion() {
    if (!sourceSection || !targetSectionId) return;
    const target = sections.find((s) => s.id === targetSectionId);
    if (!target) return;
    if (selectedIds.length === 0) {
      setErr("Select at least one student to promote.");
      return;
    }
    if (!academicYear.trim()) {
      setErr("Academic year is required.");
      return;
    }
    const msg =
      `This will move ${selectedIds.length} student(s) from Grade ${sourceSection.grade}-${sourceSection.section_name} ` +
      `to Grade ${target.grade}-${target.section_name} for academic year ${academicYear.trim()}.\n\n` +
      `${heldBack} student(s) will be held back in the current section.\n\n` +
      `This cannot be easily undone. Continue?`;
    if (!confirm(msg)) return;

    setBusy(true);
    setErr(null);
    const { data, error } = await supabase.rpc("promote_students", {
      _student_ids: selectedIds,
      _target_section_id: targetSectionId,
      _academic_year: academicYear.trim(),
    });
    setBusy(false);
    if (error) {
      setErr(toSafeErrorMessage(error, "Could not promote those students."));
      return;
    }
    setDoneMsg(
      `Promoted ${data ?? selectedIds.length} student(s) to Grade ${target.grade}-${target.section_name}. Held back: ${heldBack}.`,
    );
    // Reset flow but keep school selection for convenience
    setSourceSectionId("");
    setTargetSectionId("");
    setRoster([]);
    setSelected({});
  }

  const target = sections.find((s) => s.id === targetSectionId) ?? null;

  return (
    <div className="mx-auto max-w-5xl p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">Grade Promotion</h1>
        <p className="mt-1 text-sm text-slate-400">
          Move students up a grade at the academic year boundary. Historical attendance, marks, and
          remarks stay attributed to whichever section was active at the time — only current
          enrollment and roster change here.
        </p>
      </header>

      {err && (
        <div className="mb-4 rounded-md border border-red-900/60 bg-red-950/40 px-4 py-2 text-sm text-red-300">
          {err}
        </div>
      )}
      {doneMsg && (
        <div className="mb-4 rounded-md border border-emerald-900/60 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-300">
          {doneMsg}
        </div>
      )}

      {/* STEP 1: Source */}
      <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Step 1 — Select source section</h2>
          <span className="text-xs text-slate-500">Only active students will be listed.</span>
        </div>
        {loading ? (
          <div className="text-sm text-slate-500">Loading…</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
                School
              </label>
              <select
                value={schoolId}
                onChange={(e) => {
                  setSchoolId(e.target.value);
                  setSourceSectionId("");
                }}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">Select a school…</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {!s.is_active ? "(inactive)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
                Source section
              </label>
              <select
                value={sourceSectionId}
                onChange={(e) => setSourceSectionId(e.target.value)}
                disabled={!schoolId}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 disabled:opacity-40"
              >
                <option value="">Select a section…</option>
                {schoolSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    Grade {s.grade} — Section {s.section_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </section>

      {/* STEP 2: Target resolution */}
      {sourceSection && (
        <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-200">Step 2 — Target section</h2>
          {autoTarget && !manualTarget ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-indigo-900/60 bg-indigo-950/30 p-3 text-sm">
              <div className="text-slate-100">
                Auto-matched:{" "}
                <span className="font-semibold text-indigo-200">
                  Grade {autoTarget.grade} — Section {autoTarget.section_name}
                </span>
                <div className="mt-1 text-xs text-slate-400">
                  Grade {sourceSection.grade}-{sourceSection.section_name} → Grade{" "}
                  {autoTarget.grade}-{autoTarget.section_name}
                </div>
              </div>
              <button
                onClick={() => setManualTarget(true)}
                className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-indigo-500 hover:text-indigo-200"
              >
                Change target
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {!autoTarget && (
                <div className="rounded-md border border-amber-900/60 bg-amber-950/30 p-3 text-sm text-amber-200">
                  No section named "{sourceSection.section_name}" exists at Grade{" "}
                  {sourceSection.grade + 1} in this school yet. Create it below, or pick a different
                  existing section as the target.
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
                  Target section
                </label>
                <select
                  value={targetSectionId}
                  onChange={(e) => setTargetSectionId(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="">Select a target section…</option>
                  {eligibleManualTargets.map((s) => (
                    <option key={s.id} value={s.id}>
                      Grade {s.grade} — Section {s.section_name}
                    </option>
                  ))}
                </select>
              </div>
              {!showCreate ? (
                <button
                  onClick={() => setShowCreate(true)}
                  className="text-xs font-semibold text-indigo-300 hover:text-indigo-200"
                >
                  + Create new Grade {sourceSection.grade + 1} section instead
                </button>
              ) : (
                <div className="rounded-md border border-slate-800 bg-slate-950/40 p-3">
                  <div className="mb-2 text-xs text-slate-400">
                    New section in {schools.find((x) => x.id === sourceSection.school_id)?.name},
                    Grade {sourceSection.grade + 1}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      placeholder="Section name (e.g. A)"
                      className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                    />
                    <button
                      disabled={creatingSection || !newSectionName.trim()}
                      onClick={createTargetSection}
                      className="rounded-md bg-indigo-500 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
                    >
                      {creatingSection ? "Creating…" : "Create & use"}
                    </button>
                    <button
                      onClick={() => {
                        setShowCreate(false);
                        setNewSectionName("");
                      }}
                      className="rounded-md border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {autoTarget && (
                <button
                  onClick={() => {
                    setManualTarget(false);
                    setTargetSectionId(autoTarget.id);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  ← Use auto-matched target (Grade {autoTarget.grade}-{autoTarget.section_name})
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* STEP 3: Roster review */}
      {sourceSection && targetSectionId && target && (
        <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 px-5 py-3">
            <h2 className="text-sm font-semibold text-slate-200">Step 3 — Review roster</h2>
            <div className="text-xs text-slate-300">
              <span className="font-semibold text-emerald-300">{selectedIds.length}</span> of{" "}
              {roster.length} will move to Grade {target.grade}-{target.section_name} •{" "}
              <span className="font-semibold text-amber-300">{heldBack}</span> held back in Grade{" "}
              {sourceSection.grade}-{sourceSection.section_name}
            </div>
          </div>
          <div className="flex items-center gap-3 border-b border-slate-800 px-5 py-2 text-xs">
            <button
              onClick={() => {
                const sel: Record<string, boolean> = {};
                roster.forEach((r) => (sel[r.id] = true));
                setSelected(sel);
              }}
              className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:border-indigo-500"
            >
              Select all
            </button>
            <button
              onClick={() => setSelected({})}
              className="rounded border border-slate-700 px-2 py-1 text-slate-300 hover:border-indigo-500"
            >
              Hold all back
            </button>
          </div>
          {rosterLoading ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading roster…</div>
          ) : roster.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No active students in this section.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3 w-12"></th>
                    <th className="px-5 py-3 w-24">Roll #</th>
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3 w-32">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {roster.map((s) => {
                    const on = !!selected[s.id];
                    return (
                      <tr key={s.id} className={"text-slate-200 " + (on ? "" : "opacity-60")}>
                        <td className="px-5 py-2">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={(e) =>
                              setSelected((prev) => ({ ...prev, [s.id]: e.target.checked }))
                            }
                            className="size-4 accent-indigo-500"
                          />
                        </td>
                        <td className="px-5 py-2 text-slate-400">{s.roll_number ?? "—"}</td>
                        <td className="px-5 py-2">{s.full_name}</td>
                        <td className="px-5 py-2 text-xs">
                          {on ? (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 font-semibold text-emerald-300">
                              Promote
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-semibold text-amber-300">
                              Hold back
                            </span>
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
      )}

      {/* STEP 4: Confirm */}
      {sourceSection && targetSectionId && target && roster.length > 0 && (
        <section className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-200">Step 4 — Confirm & execute</h2>
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-wider text-slate-400">
                Academic year
              </label>
              <input
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g. 2025-2026"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
              />
              <div className="mt-1 text-[11px] text-slate-500">
                Label recorded on each promoted student's new enrollment history row.
              </div>
            </div>
            <button
              onClick={executePromotion}
              disabled={busy || selectedIds.length === 0}
              className="h-fit rounded-md bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
            >
              {busy ? "Promoting…" : `Promote ${selectedIds.length} student(s)`}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
