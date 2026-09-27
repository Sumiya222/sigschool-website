/**
 * Global submission ceiling (server-only).
 *
 * The per-IP window on each public form stops one machine from flooding it,
 * but not a botnet spreading the same volume across many addresses. With no
 * WAF in front of this site, that's otherwise unbounded. This is a second,
 * source-independent backstop: a maximum number of submissions per form,
 * across every submitter combined, per hour.
 *
 * Thresholds are sized well above the busiest plausible real event for each
 * form — a camp registration launch is the realistic spike, so that one
 * carries the most headroom — not everyday traffic. Tripping this means
 * genuine abuse, not a good day.
 */
import { BRAND } from "@/lib/brand";

const WINDOW_MINUTES = 60;

export const GLOBAL_CEILINGS = {
  inquiries: 300,
  job_applications: 200,
  registrations: 500,
} as const;

export type CeilingedTable = keyof typeof GLOBAL_CEILINGS;

export const GLOBAL_CEILING_MESSAGE =
  "We're seeing unusually high demand right now and can't accept new submissions this moment. " +
  `Please email us at ${BRAND.contactEmail} or call ${BRAND.phone} — ` +
  "our team will take it from there.";

/**
 * True once a form's submissions in the last hour (from every source
 * combined) reach its ceiling. Fails open (returns false) if the count
 * can't be read — a broken check must never become a new way to block a
 * real submission — but logs loudly either way, since both a broken guard
 * and a tripped one need to be visible, not silent.
 */
export async function isGlobalSubmissionCeilingHit(table: CeilingedTable): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { count, error } = await supabaseAdmin
    .from(table)
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);

  if (error) {
    console.error(
      `[global-submission-ceiling] Could not read recent volume for "${table}" — allowing the submission through:`,
      error.message,
    );
    return false;
  }

  const limit = GLOBAL_CEILINGS[table];
  const hit = (count ?? 0) >= limit;
  if (hit) {
    console.warn(
      `[global-submission-ceiling] "${table}" hit its global ceiling: ${count} submissions in the last ${WINDOW_MINUTES} minutes (limit ${limit}).`,
    );
  }
  return hit;
}
