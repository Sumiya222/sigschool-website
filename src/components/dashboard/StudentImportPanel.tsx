import { useState, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { toSafeErrorMessage } from "@/lib/db-error-message";
import {
  findBatchDuplicates,
  describeDuplicateMatch,
  type DuplicateMatch,
  type ExistingStudentLite,
} from "@/lib/student-duplicates";

/**
 * The one student-roster bulk importer in the codebase. Used by the
 * instructor section page, the admin students page, and the "Add School"
 * wizard — previously each had its own copy with a different security
 * posture (caps, formula defusal, error handling); this is the merged,
 * strictest version of all three.
 */

const EXPECTED_HEADERS = ["full_name", "roll_number", "father_name"];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — well beyond any realistic roster
const MAX_ROWS = 2000;
const PREVIEW_LIMIT = 50;
const INSERT_BATCH_SIZE = 500;
const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

interface ParsedRow {
  rowNumber: number;
  full_name: string;
  roll_number: string;
  notes: string;
  error: string | null;
  duplicate: DuplicateMatch | null;
}

interface Props {
  sectionId: string;
  sectionLabel: string;
  onImported?: (count: number) => void;
  compact?: boolean;
}

/** Defuses spreadsheet-formula injection: a cell starting with = + - @ tab or
 * CR is coerced to plain text by dropping the leading sigil, before it's
 * ever stored or re-exported. */
function defuse(s: string): string {
  return /^[=+\-@\t\r]/.test(s) ? s.replace(/^[=+\-@\t\r]+/, "") : s;
}

export function StudentImportPanel({ sectionId, sectionLabel, onImported, compact }: Props) {
  const [parsed, setParsed] = useState<ParsedRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  // rowNumbers the admin has chosen to leave out of the import, after
  // reviewing the duplicate warnings below.
  const [skippedRows, setSkippedRows] = useState<Set<number>>(new Set());

  function downloadTemplate() {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      EXPECTED_HEADERS,
      ["Ayesha Khan", "R-001", "Tariq Khan"],
      ["Bilal Ahmed", "R-002", ""],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "students-import-template.xlsx");
  }

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    setMsg(null);
    setErr(null);
    setParsed(null);
    setSkippedRows(new Set());
    if (!file) return;
    if (file.size > MAX_BYTES) {
      return setErr(
        `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 5 MB.`,
      );
    }
    const nameLower = file.name.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.some((ext) => nameLower.endsWith(ext))) {
      return setErr("Only .csv, .xlsx or .xls files are accepted.");
    }
    try {
      const buf = await file.arrayBuffer();
      let wb;
      try {
        wb = XLSX.read(buf, { type: "array" });
      } catch {
        return setErr("This file isn't a valid spreadsheet. Use the template above.");
      }
      const sheet = wb.Sheets[wb.SheetNames[0]];
      if (!sheet) return setErr("No sheet in file.");
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      if (rows.length === 0) return setErr("Sheet is empty.");
      if (rows.length > MAX_ROWS) {
        return setErr(`Too many rows (${rows.length}). Split into files of ≤ ${MAX_ROWS}.`);
      }
      const parsedRows: ParsedRow[] = rows.map((raw, i) => {
        const rec: Record<string, string> = {};
        Object.entries(raw).forEach(([k, v]) => {
          rec[k.toString().trim().toLowerCase()] = v == null ? "" : defuse(String(v).trim());
        });
        const full_name = rec["full_name"] ?? "";
        return {
          rowNumber: i + 2,
          full_name,
          roll_number: rec["roll_number"] ?? "",
          notes: rec["father_name"] ?? "",
          error: full_name ? null : "Missing full_name",
          duplicate: null,
        };
      });

      // Duplicate check against the target section's existing roster, and
      // against every other row in this same file -- catches a roster that
      // lists the same student twice, not just a re-import of an old one.
      setCheckingDuplicates(true);
      const { data: existingData } = await supabase
        .from("students")
        .select("id, full_name, roll_number, notes")
        .eq("section_id", sectionId);
      const existing = (existingData as ExistingStudentLite[]) ?? [];
      const validRows = parsedRows.filter((p) => !p.error);
      const matches = findBatchDuplicates(validRows, existing);
      const matchByRowNumber = new Map(validRows.map((p, i) => [p.rowNumber, matches[i]]));
      setCheckingDuplicates(false);

      setParsed(
        parsedRows.map((p) => ({ ...p, duplicate: matchByRowNumber.get(p.rowNumber) ?? null })),
      );
    } catch (ex: unknown) {
      setCheckingDuplicates(false);
      setErr(ex instanceof Error ? ex.message : "Failed to parse file.");
    }
  }

  async function commit() {
    if (!parsed) return;
    const valid = parsed.filter((p) => !p.error && !skippedRows.has(p.rowNumber));
    if (valid.length === 0) return setErr("No valid rows.");
    setImporting(true);
    setErr(null);
    setMsg(null);
    const { data: sessionRes } = await supabase.auth.getSession();
    const createdBy = sessionRes.session?.user.id ?? null;
    const rows = valid.map((p) => {
      // roll_number is required (NOT NULL) -- a row with none (the school
      // hasn't issued one yet, same reason 9 students needed backfilling)
      // gets the same obviously-synthetic placeholder the migration used,
      // never a plausible-looking value. The id is generated client-side
      // so the placeholder can be derived from it before the insert.
      const id = p.roll_number.trim() ? undefined : crypto.randomUUID();
      const roll_number =
        p.roll_number.trim() || `TEMP-${id!.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
      return {
        ...(id ? { id } : {}),
        section_id: sectionId,
        full_name: p.full_name,
        roll_number,
        notes: p.notes || null,
        created_by: createdBy,
      };
    });

    // Batched rather than one unbounded insert — keeps any single request
    // small regardless of how close to MAX_ROWS the file was.
    let imported = 0;
    for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
      const batch = rows.slice(i, i + INSERT_BATCH_SIZE);
      const { error, data } = await supabase.from("students").insert(batch).select("id");
      if (error) {
        setImporting(false);
        const safe = toSafeErrorMessage(error, "Could not import those students.");
        setErr(
          imported > 0
            ? `${safe} (${imported} student(s) were already imported before this failed.)`
            : safe,
        );
        return;
      }
      imported += data?.length ?? batch.length;
    }

    setImporting(false);
    const invalid = parsed.filter((p) => p.error);
    const skippedForDuplicate = parsed.filter(
      (p) => !p.error && skippedRows.has(p.rowNumber),
    ).length;
    setMsg(
      `Imported ${imported} student(s).` +
        (invalid.length > 0 ? ` Skipped ${invalid.length} with errors.` : "") +
        (skippedForDuplicate > 0
          ? ` Skipped ${skippedForDuplicate} flagged as possible duplicate(s).`
          : ""),
    );
    setParsed(null);
    setSkippedRows(new Set());
    onImported?.(imported);
  }

  function toggleSkip(rowNumber: number) {
    setSkippedRows((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });
  }

  const validCount = parsed?.filter((p) => !p.error).length ?? 0;
  const errorCount = parsed?.filter((p) => p.error).length ?? 0;
  const duplicateCount = parsed?.filter((p) => p.duplicate).length ?? 0;
  const willImportCount =
    parsed?.filter((p) => !p.error && !skippedRows.has(p.rowNumber)).length ?? 0;
  const previewRows = parsed?.slice(0, PREVIEW_LIMIT) ?? [];

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-slate-400">
          Import roster into <span className="text-slate-200">{sectionLabel}</span>. Columns:{" "}
          <code className="text-indigo-300">full_name</code>,{" "}
          <code className="text-indigo-300">roll_number</code>,{" "}
          <code className="text-indigo-300">father_name</code>.
        </div>
        <button
          onClick={downloadTemplate}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600 hover:text-slate-100"
        >
          ⬇ Template
        </button>
      </div>

      <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed border-slate-700 bg-slate-950/60 px-3 py-3 text-sm text-slate-300 hover:border-indigo-500 hover:text-slate-100">
        <input
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={onFileChange}
          className="hidden"
        />
        Upload .csv or .xlsx file for {sectionLabel}…
      </label>

      {err && (
        <div className="rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {err}
        </div>
      )}
      {msg && (
        <div className="rounded-md border border-emerald-900/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">
          {msg}
        </div>
      )}

      {parsed && (
        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
            <span>
              Preview
              {parsed.length > PREVIEW_LIMIT
                ? ` — showing ${PREVIEW_LIMIT} of ${parsed.length} rows`
                : ""}
              {checkingDuplicates ? " — checking for duplicates…" : ""}
            </span>
            <span>
              <span className="text-emerald-300">{validCount} valid</span>
              {duplicateCount > 0 && (
                <>
                  {" "}
                  · <span className="text-amber-300">{duplicateCount} possible duplicate(s)</span>
                </>
              )}
              {errorCount > 0 && (
                <>
                  {" "}
                  · <span className="text-red-300">{errorCount} errors</span>
                </>
              )}
            </span>
          </div>
          <div className="max-h-60 overflow-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-900/90 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Roll</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 w-16 text-center">Skip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {previewRows.map((p) => (
                  <tr
                    key={p.rowNumber}
                    className={
                      p.error
                        ? "bg-red-950/20 text-red-200"
                        : p.duplicate
                          ? "bg-amber-950/20 text-slate-200"
                          : "text-slate-200"
                    }
                  >
                    <td className="px-3 py-1.5 text-slate-500">{p.rowNumber}</td>
                    <td className="px-3 py-1.5">{p.full_name || "—"}</td>
                    <td className="px-3 py-1.5 text-slate-400">{p.roll_number || "—"}</td>
                    <td className="px-3 py-1.5 text-xs">
                      {p.error ? (
                        <span className="text-red-300">✕ {p.error}</span>
                      ) : p.duplicate ? (
                        <span className="text-amber-300">
                          ⚠ {describeDuplicateMatch(p.duplicate)}
                        </span>
                      ) : (
                        <span className="text-emerald-300">✓</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      {!p.error && p.duplicate && (
                        <input
                          type="checkbox"
                          checked={skippedRows.has(p.rowNumber)}
                          onChange={() => toggleSkip(p.rowNumber)}
                          title="Skip this row"
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={commit}
              disabled={importing || checkingDuplicates || willImportCount === 0}
              className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-40"
            >
              {importing ? "Importing…" : `Import ${willImportCount} student(s)`}
            </button>
            <button
              onClick={() => {
                setParsed(null);
                setSkippedRows(new Set());
              }}
              className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
