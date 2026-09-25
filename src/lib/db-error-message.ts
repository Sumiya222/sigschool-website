/**
 * Converts a raw Supabase/PostgREST error into a message safe to show an
 * admin or instructor. This is the ONLY place in the codebase that should
 * translate a database error into UI text — every dashboard screen that
 * does `alert(error.message)` / `toast(error.message)` / `setErr(error.message)`
 * must route through this instead of inlining its own judgment call.
 *
 * Postgres's own generated messages routinely name real tables, columns,
 * and constraints (e.g. `new row for relation "students" violates check
 * constraint "students_full_name_length_chk"`, sometimes with the actual
 * failing row echoed in the detail) — none of that is meant for an end
 * user, however trusted. RAISE EXCEPTION text is the one exception: it's
 * hand-written for a human reader (e.g. "Payment amount exceeds the
 * remaining balance of PKR %") and Postgres reports it under the SQLSTATE
 * "P0" family (P0001 for a plain RAISE EXCEPTION, P0002-P0004 for
 * PL/pgSQL's own procedural exceptions) — a reliable, code-based signal
 * distinct from real constraint-violation codes, so that family passes
 * through as-is.
 *
 * Everything else falls back to a generic message, refined by constraint
 * name where the naming is predictable (e.g. every `*_length_chk`
 * constraint in this codebase means the same thing: too long). The raw
 * error is always logged to the console first, so nothing is lost for
 * debugging — Supabase's own request logs retain the same detail
 * server-side regardless.
 */

export type DbErrorLike = {
  message: string;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
} | null;

const DEFAULT_FALLBACK = "Something went wrong. Please try again.";

const CONSTRAINT_NAME_RE = /constraint "([^"]+)"/;

const CONSTRAINT_NAME_HINTS: [RegExp, string][] = [
  [/_length_chk$|_length_check$/, "That value is too long."],
  [/_fmt$|_format_chk$|_format_check$|_safe$/, "That value isn't in the expected format."],
  [/_nonneg$|_non_negative$/, "That number must be zero or greater."],
  [/_positive$/, "That number must be greater than zero."],
  [/_range_chk$|_range_check$/, "That value is outside the allowed range."],
];

/** SQLSTATE-based fallback, used when the constraint name (if any) doesn't
 * match a known pattern above. */
const GENERIC_BY_CODE: Record<string, string> = {
  "23505": "A record with that value already exists.",
  "23503": "That record is linked to something else and can't be changed this way.",
  "23502": "A required field is missing.",
  "23514": "That value isn't valid.",
  "22001": "That value is too long.",
  "22003": "That number is out of range.",
};

function isHandWrittenException(code: string | null | undefined): boolean {
  return !!code && /^P0\d{3}$/.test(code);
}

/** Only meaningful for 23514 (check_violation) — a unique/foreign-key
 * constraint's name could coincidentally match one of these suffixes, so
 * this is deliberately not applied to any other code. */
function messageForCheckConstraintName(rawMessage: string): string | null {
  const match = CONSTRAINT_NAME_RE.exec(rawMessage);
  if (!match) return null;
  const name = match[1];
  for (const [pattern, message] of CONSTRAINT_NAME_HINTS) {
    if (pattern.test(name)) return message;
  }
  return null;
}

/**
 * @param error The error object returned by a Supabase call (`{ error }`
 *   from `.select()`/`.insert()`/`.update()`/`.delete()`/`.rpc()`), or any
 *   thrown value with a similar shape.
 * @param fallback Shown for anything that isn't a hand-written RAISE
 *   EXCEPTION and isn't a check-constraint violation with a recognizable
 *   name — customize per call site for better wording (e.g. "Could not
 *   delete that student.", or something specific to a known unique
 *   constraint like "This instructor is already assigned to that
 *   section."). Takes priority over this module's own generic per-code
 *   text, since the caller usually has context this function can't. Never
 *   substitute `error.message` here.
 */
export function toSafeErrorMessage(error: DbErrorLike, fallback?: string): string {
  const effectiveFallback = fallback ?? DEFAULT_FALLBACK;
  if (!error) return effectiveFallback;

  console.error("[db-error]", error);

  if (isHandWrittenException(error.code)) {
    return error.message;
  }

  if (error.code === "23514") {
    const byConstraintName = messageForCheckConstraintName(error.message);
    if (byConstraintName) return byConstraintName;
  }

  if (fallback) return fallback;

  if (error.code && GENERIC_BY_CODE[error.code]) {
    return GENERIC_BY_CODE[error.code];
  }

  return effectiveFallback;
}

/**
 * Normalizes a `catch (e)` value into something `toSafeErrorMessage` can
 * use. What lands in a catch block varies across this codebase: a re-thrown
 * Postgrest error is a plain object with `code`/`message`; a server
 * function's thrown failure is a real `Error` with `message` only; either
 * way this extracts what's usable and drops anything that isn't, rather
 * than every call site duck-typing it separately.
 */
export function fromCaught(e: unknown): DbErrorLike {
  if (e && typeof e === "object" && "message" in e) {
    const obj = e as { message: unknown; code?: unknown };
    if (typeof obj.message === "string") {
      return { message: obj.message, code: typeof obj.code === "string" ? obj.code : null };
    }
  }
  return null;
}
