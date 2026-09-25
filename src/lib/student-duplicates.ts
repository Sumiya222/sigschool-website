/**
 * Shared duplicate-detection logic for adding students, used by both the
 * bulk importer (StudentImportPanel.tsx) and the instructor's one-at-a-time
 * add form (RosterTab in dashboard.instructor.section.$sectionId.tsx) so
 * the matching rules only exist in one place.
 *
 * Two match types, deliberately not treated the same way:
 * - Roll number match is strong: two real students never legitimately
 *   share one within an active section (enforced at the database level by
 *   students_section_rollnumber_active_uq). Catching it here is purely
 *   about surfacing a clear reason before the insert fails, not a softer
 *   version of the same rule.
 * - Name match is weak and only ever advisory: "Muhammad Ahmed" in ASAS
 *   International F-8 proved two genuinely different real students can
 *   share a name, distinguished only by roll number and father's name.
 *   This must never block on its own.
 */

export interface ExistingStudentLite {
  id: string;
  full_name: string;
  roll_number: string | null;
  notes: string | null;
}

export type DuplicateMatchType = "roll_number" | "name";

export interface DuplicateMatch {
  type: DuplicateMatchType;
  against: ExistingStudentLite;
}

function normalizeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeRoll(s: string | null | undefined): string | null {
  const t = s?.trim();
  return t ? t.toLowerCase() : null;
}

/**
 * Finds the single strongest match for a candidate against a pool of
 * existing students (roll number beats name). Returns null if nothing
 * matches. Only one match is ever returned per candidate -- enough to show
 * the person what collided and why, without piling on every coincidental
 * name match once a roll number match already explains the row.
 */
export function findDuplicateMatch(
  candidate: { full_name: string; roll_number?: string | null },
  pool: ExistingStudentLite[],
): DuplicateMatch | null {
  const name = normalizeName(candidate.full_name);
  const roll = normalizeRoll(candidate.roll_number);
  let nameMatch: ExistingStudentLite | null = null;

  for (const existing of pool) {
    if (roll && normalizeRoll(existing.roll_number) === roll) {
      return { type: "roll_number", against: existing };
    }
    if (!nameMatch && normalizeName(existing.full_name) === name) {
      nameMatch = existing;
    }
  }

  return nameMatch ? { type: "name", against: nameMatch } : null;
}

/**
 * One line describing what matched, for showing next to a flagged row --
 * enough detail (name, roll number, father's name) to judge on, not just a
 * red flag.
 */
export function describeDuplicateMatch(match: DuplicateMatch): string {
  const s = match.against;
  const detail = [
    s.roll_number ? `roll #${s.roll_number}` : null,
    s.notes ? `father: ${s.notes}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const label =
    match.type === "roll_number"
      ? `Same roll number as existing student "${s.full_name}"`
      : `Same name as existing student "${s.full_name}"`;
  return detail ? `${label} (${detail})` : label;
}

/**
 * Runs findDuplicateMatch for every row in a batch, checking each one
 * against both the existing roster and every OTHER row in the same batch
 * (by index, since batch rows have no id yet) -- catches a roster file
 * that lists the same student twice, in either direction.
 */
export function findBatchDuplicates<
  T extends { full_name: string; roll_number?: string | null; notes?: string | null },
>(rows: T[], existing: ExistingStudentLite[]): (DuplicateMatch | null)[] {
  const batchAsLite: ExistingStudentLite[] = rows.map((r, i) => ({
    id: `batch-${i}`,
    full_name: r.full_name,
    roll_number: r.roll_number ?? null,
    notes: r.notes ?? null,
  }));

  return rows.map((row, i) => {
    const otherRows = batchAsLite.filter((_, j) => j !== i);
    return findDuplicateMatch(row, [...existing, ...otherRows]);
  });
}
