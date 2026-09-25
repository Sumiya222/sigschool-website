import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toSafeErrorMessage } from "@/lib/db-error-message";

export interface DraftRow {
  key: string;
  grade: number;
  section_name: string;
  error: string | null;
}

export interface SavedSection {
  id: string;
  grade: number;
  section_name: string;
}

interface Props {
  schoolId: string;
  onSaved: (sections: SavedSection[]) => void;
  submitLabel?: string;
  onCancel?: () => void;
}

function newRow(): DraftRow {
  return { key: Math.random().toString(36).slice(2), grade: 1, section_name: "", error: null };
}

export function SectionsBatchEditor({
  schoolId,
  onSaved,
  submitLabel = "Save sections",
  onCancel,
}: Props) {
  const [rows, setRows] = useState<DraftRow[]>([newRow()]);
  const [existing, setExisting] = useState<{ grade: number; section_name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [globalErr, setGlobalErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("sections")
      .select("grade, section_name")
      .eq("school_id", schoolId)
      .then(({ data }) => {
        if (mounted) setExisting((data as { grade: number; section_name: string }[]) ?? []);
      });
    return () => {
      mounted = false;
    };
  }, [schoolId]);

  function update(key: string, patch: Partial<DraftRow>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch, error: null } : r)));
  }
  function remove(key: string) {
    setRows((rs) => (rs.length === 1 ? rs : rs.filter((r) => r.key !== key)));
  }
  function add() {
    setRows((rs) => [...rs, newRow()]);
  }

  function validate(): DraftRow[] {
    const seen = new Set<string>();
    const existingKeys = new Set(
      existing.map((e) => `${e.grade}::${e.section_name.trim().toLowerCase()}`),
    );
    return rows.map((r) => {
      const name = r.section_name.trim();
      if (!name) return { ...r, error: "Section name is required" };
      const k = `${r.grade}::${name.toLowerCase()}`;
      if (existingKeys.has(k))
        return { ...r, error: `Grade ${r.grade} - ${name} already exists in this school` };
      if (seen.has(k)) return { ...r, error: `Duplicate of another row in this batch` };
      seen.add(k);
      return { ...r, error: null };
    });
  }

  async function onSave() {
    setGlobalErr(null);
    const validated = validate();
    setRows(validated);
    if (validated.some((r) => r.error)) return;
    setSaving(true);
    const payload = validated.map((r) => ({
      school_id: schoolId,
      grade: r.grade,
      section_name: r.section_name.trim(),
    }));
    const { data, error } = await supabase
      .from("sections")
      .insert(payload)
      .select("id, grade, section_name");
    setSaving(false);
    if (error) {
      setGlobalErr(toSafeErrorMessage(error, "Could not save those sections."));
      return;
    }
    onSaved((data as SavedSection[]) ?? []);
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.key} className="grid grid-cols-[1fr_2fr_auto] gap-2">
          <select
            value={r.grade}
            onChange={(e) => update(r.key, { grade: Number(e.target.value) })}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((g) => (
              <option key={g} value={g}>
                Grade {g}
              </option>
            ))}
          </select>
          <input
            placeholder='Section (e.g. "A")'
            value={r.section_name}
            onChange={(e) => update(r.key, { section_name: e.target.value })}
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
          />
          <button
            type="button"
            onClick={() => remove(r.key)}
            disabled={rows.length === 1}
            className="rounded-md border border-slate-700 px-3 text-xs text-slate-400 hover:border-red-800 hover:text-red-300 disabled:opacity-30"
          >
            Remove
          </button>
          {r.error && (
            <div className="col-span-3 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-1.5 text-xs text-red-300">
              {r.error}
            </div>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="rounded-md border border-dashed border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-indigo-500 hover:text-slate-100"
      >
        + Add another section
      </button>

      {globalErr && (
        <div className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {globalErr}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button
          onClick={onSave}
          disabled={saving}
          className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-600"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
