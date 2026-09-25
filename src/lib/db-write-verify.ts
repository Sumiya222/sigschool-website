/**
 * Verifies an UPDATE or DELETE actually affected a row, not just that no
 * error was returned. This is the ONLY place in the codebase that should
 * make this check — every UPDATE/DELETE whose visibility depends on RLS
 * (i.e. almost all of them) should route through this instead of checking
 * `error` alone.
 *
 * Why this matters: Postgres row-level security filters non-visible rows
 * out of an UPDATE/DELETE's WHERE clause silently, via the policy's USING
 * expression — it doesn't raise an error. A write that matches zero rows
 * (wrong permissions, someone else deleted the record first, a stale id)
 * returns the exact same success shape — `{ error: null }` — as one that
 * matched real rows. Found via a real case: an admin-role account editing
 * CMS content (gated on the 'cms' role, not 'admin') got a green "saved"
 * toast on every attempt while nothing ever persisted, because the save
 * handler only checked `error`.
 *
 * Requires the query to return the affected rows (`.select()`), which this
 * wraps for the caller so it can't be forgotten — pass the builder BEFORE
 * `.select()`/await, not the already-awaited result.
 */

export type DbErrorLike = {
  message: string;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
} | null;

export const NOOP_WRITE_CODE = "0_ROWS_AFFECTED";

const NOOP_WRITE_ERROR: DbErrorLike = {
  message:
    "That change didn't save — you may not have permission to edit this, or it may have changed elsewhere. Refresh and try again.",
  code: NOOP_WRITE_CODE,
};

type SelectableBuilder<T> = {
  select: (columns?: string) => PromiseLike<{ data: T[] | null; error: DbErrorLike }>;
};

/**
 * @param builder A Supabase `.update(...)`/`.delete()` query builder
 *   (already filtered with `.eq(...)`/etc.), NOT YET awaited and NOT YET
 *   given `.select()` — this appends a minimal `.select("id")` itself.
 */
export async function verifyRowsAffected<T = { id: string }>(
  builder: SelectableBuilder<T>,
): Promise<{ data: T[] | null; error: DbErrorLike; noopBlocked: boolean }> {
  const { data, error } = await builder.select("id");
  if (error) return { data: null, error, noopBlocked: false };
  if (!data || data.length === 0) {
    return { data: null, error: NOOP_WRITE_ERROR, noopBlocked: true };
  }
  return { data, error: null, noopBlocked: false };
}
