// Shared date/time formatters. Use everywhere dates are displayed to the user.
// Format is always day-month-year (e.g. "05 Nov 2026"), never month-first.
// All real timestamps are shown in Pakistan Standard Time (Asia/Karachi, UTC+5,
// no DST) with a 12-hour clock, regardless of the visitor's or server's own
// local timezone — this is a Pakistan-based operation, so "now"/"today" must
// always mean Pakistan's now/today, not the server's.

export const PAKISTAN_TIME_ZONE = "Asia/Karachi";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function parseISODateOnly(iso: string): Date | null {
  // Accept "YYYY-MM-DD" as a plain calendar date with no time-of-day — there is
  // nothing to convert between timezones, so read the digits literally.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

function partsOf(d: Date, opts: Intl.DateTimeFormatOptions): Record<string, string> {
  const parts = new Intl.DateTimeFormat("en-US", {
    ...opts,
    timeZone: PAKISTAN_TIME_ZONE,
  }).formatToParts(d);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return map;
}

/** "05 Nov 2026" — day month year. Accepts a bare "YYYY-MM-DD" (read literally,
 * no timezone conversion needed) or a full timestamp (converted to its
 * Pakistan-time calendar date first). */
export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return "";
  const isBareDate = typeof input === "string" && /^(\d{4})-(\d{2})-(\d{2})$/.test(input);
  if (isBareDate) {
    const d = parseISODateOnly(input as string);
    if (!d) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mmm = MONTHS_SHORT[d.getMonth()];
    const yyyy = d.getFullYear();
    return `${dd} ${mmm} ${yyyy}`;
  }
  const d = typeof input === "string" ? new Date(input) : input;
  if (!d || isNaN(d.getTime())) return "";
  const p = partsOf(d, { day: "2-digit", month: "short", year: "numeric" });
  return `${p.day} ${p.month} ${p.year}`;
}

/** "05 Nov 2026, 02:32 PM" — day month year, 12-hour Pakistan time. */
export function formatDateTime(input: string | Date | null | undefined): string {
  if (!input) return "";
  const d = typeof input === "string" ? new Date(input) : input;
  if (!d || isNaN(d.getTime())) return "";
  const p = partsOf(d, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute} ${p.dayPeriod.toUpperCase()}`;
}

/** "Nov 2026" — for billing-month "YYYY-MM" strings. */
export function formatBillingMonth(ym: string): string {
  const [y, m] = ym.split("-").map((v) => parseInt(v, 10));
  if (!y || !m) return ym;
  return `${MONTHS_SHORT[m - 1]} ${y}`;
}
