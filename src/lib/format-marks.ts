// Round a marks value to at most 2 decimals, trimming trailing zeros.
// Fixes float accumulation display like 48.49999999999999 → "48.5".
export function formatMarks(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const rounded = Math.round(n * 100) / 100;
  // Trim trailing zeros: 48.5 → "48.5", 48 → "48", 48.50 → "48.5"
  return rounded.toString();
}
