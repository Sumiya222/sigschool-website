/**
 * Formula-injection defense for spreadsheet exports and syncs.
 *
 * Cells starting with = + - @, a tab, or a carriage return are treated as
 * formulas by Excel, Google Sheets, and Numbers when the file/sheet is
 * opened. Prefixing a literal single quote forces the cell to render as
 * text instead. This is the ONLY cell-sanitizing implementation in the
 * codebase — every CSV/XLSX export and every external spreadsheet sync
 * (Google Sheets) must call this before writing a user-supplied value into
 * a cell. Isomorphic (no DOM/Node-only APIs) so both client export code and
 * server-side sync code can share it.
 */
export function sanitizeCell(v: unknown): string | number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  const s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) return `'${s}`;
  return s;
}
