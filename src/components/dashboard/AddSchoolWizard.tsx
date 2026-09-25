import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import { SectionsBatchEditor, type SavedSection } from "./SectionsBatchEditor";
import { StudentImportPanel } from "./StudentImportPanel";

interface Props {
  onClose: () => void;
  onFinished: () => void;
}

type Step = 1 | 2 | 3;

export function AddSchoolWizard({ onClose, onFinished }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState("");
  const [address, setAddress] = useState("");
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [sections, setSections] = useState<SavedSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [importedCounts, setImportedCounts] = useState<Record<string, number>>({});
  const [skipped, setSkipped] = useState<Record<string, boolean>>({});

  async function onCreateSchool(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setCreating(true);
    const { data, error } = await supabase
      .from("schools")
      .insert({ name: schoolName.trim(), address: address.trim() || null })
      .select("id")
      .single();
    setCreating(false);
    if (error) return setErr(toSafeErrorMessage(error, "Could not create that school."));
    setSchoolId(data.id);
    setStep(2);
  }

  function finish() {
    onFinished();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
        {/* Header + stepper */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Add New School</h2>
            <p className="text-xs text-slate-400">Guided setup — school, sections, then rosters.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-slate-600"
          >
            Close
          </button>
        </div>

        <div className="flex gap-2 border-b border-slate-800 px-6 py-3 text-xs">
          {[
            { n: 1, label: "School" },
            { n: 2, label: "Grades & Sections" },
            { n: 3, label: "Enroll Students" },
          ].map(({ n, label }) => (
            <div
              key={n}
              className={`flex items-center gap-2 rounded-full px-3 py-1 ${
                step === n
                  ? "bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/40"
                  : step > n
                    ? "text-emerald-300"
                    : "text-slate-500"
              }`}
            >
              <span className="font-mono">{step > n ? "✓" : n}</span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="px-6 py-6">
          {step === 1 && (
            <form onSubmit={onCreateSchool} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-slate-400">School name</label>
                <input
                  required
                  autoFocus
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-400">Address (optional)</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-indigo-500"
                />
              </div>
              {err && (
                <div className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
                  {err}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
                >
                  {creating ? "Creating…" : "Continue →"}
                </button>
              </div>
            </form>
          )}

          {step === 2 && schoolId && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Add one or more grade + section combinations for this school. You can add more
                later.
              </p>
              <SectionsBatchEditor
                schoolId={schoolId}
                submitLabel="Save & continue →"
                onSaved={(saved) => {
                  setSections(saved);
                  setActiveSectionId(saved[0]?.id ?? null);
                  setStep(3);
                }}
              />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Import a roster for each section, or skip any section to add students later.
              </p>
              <div className="flex flex-wrap gap-2">
                {sections.map((s) => {
                  const count = importedCounts[s.id] ?? 0;
                  const isSkipped = skipped[s.id];
                  const isActive = activeSectionId === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveSectionId(s.id)}
                      className={`rounded-md border px-3 py-1.5 text-xs ${
                        isActive
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-200"
                          : "border-slate-700 text-slate-300 hover:border-slate-600"
                      }`}
                    >
                      Grade {s.grade} - {s.section_name}
                      {count > 0 && <span className="ml-1 text-emerald-300">✓ {count}</span>}
                      {isSkipped && count === 0 && (
                        <span className="ml-1 text-slate-500">· skipped</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {activeSectionId &&
                (() => {
                  const s = sections.find((x) => x.id === activeSectionId);
                  if (!s) return null;
                  const label = `Grade ${s.grade} - ${s.section_name}`;
                  return (
                    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
                      <StudentImportPanel
                        sectionId={s.id}
                        sectionLabel={label}
                        compact
                        onImported={(n) =>
                          setImportedCounts((prev) => ({ ...prev, [s.id]: (prev[s.id] ?? 0) + n }))
                        }
                      />
                      <div className="mt-3 border-t border-slate-800 pt-3">
                        <button
                          onClick={() => setSkipped((prev) => ({ ...prev, [s.id]: true }))}
                          className="text-xs text-slate-400 hover:text-slate-200"
                        >
                          Skip for now, I'll add students later →
                        </button>
                      </div>
                    </div>
                  );
                })()}

              <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                <span className="text-xs text-slate-500">
                  {sections.length} section(s) created ·{" "}
                  {Object.values(importedCounts).reduce((a, b) => a + b, 0)} student(s) imported
                </span>
                <button
                  onClick={finish}
                  className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400"
                >
                  Finish
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
