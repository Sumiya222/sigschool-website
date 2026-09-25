/**
 * Immediate (non-digest) admin alerts — server-only.
 *
 * Admin notifications for inquiries, registrations, and job applications
 * batch into the daily digest (see admin-digest.server.ts) instead of
 * sending per-submission. These two cases are the exception: genuinely
 * time-sensitive situations worth interrupting that batching for, since
 * waiting until the next digest could mean acting too late.
 *
 * Nothing else qualifies. Inquiries in particular have no urgent case —
 * there's nothing inherently time-bound about a contact-form message, so
 * every inquiry goes through the digest with no immediate path at all.
 */
import { sendBrandedEmail } from "@/lib/email.server";

const NEAR_CAPACITY_FRACTION = 0.9;
const CLOSING_SOON_DAYS = 1; // "imminently" = closes today or tomorrow

function adminTo(): string {
  return process.env.NOTIFY_EMAIL_TO || "contact@astrobotacademy.com";
}

/**
 * Fires once per camp_name, the first time it crosses 90% of capacity
 * (counting registrations the same way the waitlist decision itself does:
 * status in new/confirmed). Re-checked on every registration but only ever
 * sends once per camp — recorded in digest_state.capacity_alert_camp.
 *
 * Known simplification: raising a camp's capacity after this has fired
 * won't re-arm the alert for that same camp_name even if usage later climbs
 * back above 90% of the new, higher number. Renaming the camp (a real new
 * camp_window.camp_name) does re-arm it.
 */
export async function maybeSendCapacityAlert(params: {
  campName: string;
  capacity: number;
  takenAfterThisOne: number;
  studentName: string;
  waitlisted: boolean;
}): Promise<void> {
  const fraction = params.takenAfterThisOne / params.capacity;
  if (fraction < NEAR_CAPACITY_FRACTION) return;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: state } = await supabaseAdmin
    .from("digest_state")
    .select("capacity_alert_camp")
    .eq("singleton", true)
    .maybeSingle();
  if (state?.capacity_alert_camp === params.campName) return;

  await supabaseAdmin
    .from("digest_state")
    .update({ capacity_alert_camp: params.campName })
    .eq("singleton", true);

  const pct = Math.round(fraction * 100);
  const statusLabel = params.waitlisted ? "AT CAPACITY" : "NEARING CAPACITY";
  const summary = `${params.takenAfterThisOne} of ${params.capacity} seats are taken (${pct}%) after ${params.studentName}'s registration${
    params.waitlisted ? ", who has been waitlisted" : ""
  }. Worth checking whether to raise capacity.`;

  await sendBrandedEmail({
    to: adminTo(),
    subject: `${params.campName} is at ${pct}% capacity`,
    statusLabel,
    statusColor: params.waitlisted ? "#dc2626" : "#d97706",
    statusBg: params.waitlisted ? "#fef2f2" : "#fffbeb",
    heading: `${params.campName} is ${params.waitlisted ? "full" : "nearly full"}`,
    intro: summary,
    ctaLabel: "Open in Dashboard",
    ctaUrl: "https://astrobotacademy.com/dashboard/admin/submissions?tab=registrations",
    footerNote: "Automated capacity alert — no reply needed.",
    text: summary,
  });
}

/**
 * Fires for every application to a role closing within CLOSING_SOON_DAYS —
 * deliberately NOT deduplicated like the capacity alert, since each such
 * application is individually time-sensitive to whoever reviews it, not a
 * single recurring signal.
 */
export async function maybeSendClosingSoonAlert(params: {
  applicantName: string;
  roleTitle: string;
  closesAt: string; // YYYY-MM-DD
}): Promise<void> {
  const closesDate = new Date(`${params.closesAt}T00:00:00Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const daysUntilClose = Math.round((closesDate.getTime() - today.getTime()) / 86_400_000);
  if (daysUntilClose > CLOSING_SOON_DAYS || daysUntilClose < 0) return;

  const when = daysUntilClose === 0 ? "today" : "tomorrow";
  const summary = `${params.applicantName} just applied for ${params.roleTitle}, which closes ${when}.`;

  await sendBrandedEmail({
    to: adminTo(),
    subject: `Application for ${params.roleTitle} — closes ${when}`,
    statusLabel: "CLOSING SOON",
    statusColor: "#dc2626",
    statusBg: "#fef2f2",
    heading: `${params.roleTitle} closes ${when}`,
    intro: summary,
    ctaLabel: "Open in Dashboard",
    ctaUrl: "https://astrobotacademy.com/dashboard/admin/submissions?tab=applications",
    footerNote: "Automated closing-soon alert — no reply needed.",
    text: summary,
  });
}
