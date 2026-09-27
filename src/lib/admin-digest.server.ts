/**
 * Daily admin digest (server-only).
 *
 * Replaces per-submission admin notification emails for inquiries,
 * registrations, and job applications with one batched email covering
 * everything since the last run. Parent/applicant confirmations are a
 * separate, untouched, immediate path — this only affects the admin side.
 *
 * Triggered by a daily Supabase pg_cron job calling POST /api/send-digest
 * (see src/routes/api/send-digest.ts). Also directly callable, which is how
 * this is verified without waiting for the schedule.
 */
import { sendBrandedEmail, type EmailRow } from "@/lib/email.server";
import { BRAND } from "@/lib/brand";

const DASHBOARD_URL = `https://${BRAND.domain}/dashboard/admin/submissions`;

const INQUIRY_TYPE_LABEL: Record<string, string> = {
  parent: "Parent",
  school: "School",
  other: "Other",
};

type InquiryRow = { id: string; full_name: string; type: string; created_at: string };
type RegistrationRow = {
  id: string;
  student_first_name: string;
  student_last_name: string;
  camp_name: string;
  age_track: string;
  status: string;
  created_at: string;
};
type ApplicationRow = {
  id: string;
  full_name: string;
  created_at: string;
  job_openings: { title: string } | null;
};

export type DigestResult = {
  sent: boolean;
  counts: { inquiries: number; registrations: number; applications: number };
  total: number;
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function inquiryLine(r: InquiryRow): string {
  return `${formatWhen(r.created_at)} — ${r.full_name} (${INQUIRY_TYPE_LABEL[r.type] ?? r.type})`;
}

function registrationLine(r: RegistrationRow): string {
  const status = r.status === "waitlisted" ? " — Waitlisted" : "";
  return `${formatWhen(r.created_at)} — ${r.student_first_name} ${r.student_last_name}, ${r.camp_name} (${r.age_track})${status}`;
}

function applicationLine(a: ApplicationRow): string {
  return `${formatWhen(a.created_at)} — ${a.full_name} (${a.job_openings?.title ?? "General application"})`;
}

/**
 * Generates and sends the digest for everything recorded since the last
 * run, then advances the watermark regardless of whether anything was
 * found — it marks "reviewed up to", not "last time an email went out", so
 * a skipped or delayed run never causes a gap or a double-count next time.
 * Sends nothing on an empty day.
 */
export async function runDailyDigest(): Promise<DigestResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: state } = await supabaseAdmin
    .from("digest_state")
    .select("last_sent_at")
    .eq("singleton", true)
    .maybeSingle();

  const since = state?.last_sent_at ?? new Date(0).toISOString();
  const runStart = new Date().toISOString();

  const [inquiriesRes, registrationsRes, applicationsRes] = await Promise.all([
    supabaseAdmin
      .from("inquiries")
      .select("id, full_name, type, created_at")
      .gt("created_at", since)
      .lte("created_at", runStart)
      .order("created_at", { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabaseAdmin.from("registrations" as any) as any)
      .select("id, student_first_name, student_last_name, camp_name, age_track, status, created_at")
      .gt("created_at", since)
      .lte("created_at", runStart)
      .order("created_at", { ascending: true }),
    supabaseAdmin
      .from("job_applications")
      .select("id, full_name, created_at, job_openings(title)")
      .gt("created_at", since)
      .lte("created_at", runStart)
      .order("created_at", { ascending: true }),
  ]);

  const inquiries = (inquiriesRes.data ?? []) as InquiryRow[];
  const registrations = (registrationsRes.data ?? []) as RegistrationRow[];
  const applications = (applicationsRes.data ?? []) as unknown as ApplicationRow[];

  const counts = {
    inquiries: inquiries.length,
    registrations: registrations.length,
    applications: applications.length,
  };
  const total = counts.inquiries + counts.registrations + counts.applications;

  await supabaseAdmin.from("digest_state").update({ last_sent_at: runStart }).eq("singleton", true);

  if (total === 0) {
    return { sent: false, counts, total };
  }

  const rows: EmailRow[] = [];
  if (inquiries.length > 0) {
    rows.push({
      label: `Inquiries (${inquiries.length})`,
      value: inquiries.map(inquiryLine).join("\n"),
      preserveLineBreaks: true,
    });
  }
  if (registrations.length > 0) {
    rows.push({
      label: `Registrations (${registrations.length})`,
      value: registrations.map(registrationLine).join("\n"),
      preserveLineBreaks: true,
    });
  }
  if (applications.length > 0) {
    rows.push({
      label: `Applications (${applications.length})`,
      value: applications.map(applicationLine).join("\n"),
      preserveLineBreaks: true,
    });
  }

  const parts = [
    counts.inquiries > 0
      ? `${counts.inquiries} inquir${counts.inquiries === 1 ? "y" : "ies"}`
      : null,
    counts.registrations > 0
      ? `${counts.registrations} registration${counts.registrations === 1 ? "" : "s"}`
      : null,
    counts.applications > 0
      ? `${counts.applications} application${counts.applications === 1 ? "" : "s"}`
      : null,
  ].filter((p): p is string => p !== null);
  const summary = `${total} new submission${total === 1 ? "" : "s"}: ${parts.join(", ")}.`;

  await sendBrandedEmail({
    to: process.env.NOTIFY_EMAIL_TO || BRAND.contactEmail,
    subject: `Daily digest: ${total} new submission${total === 1 ? "" : "s"}`,
    statusLabel: "DAILY DIGEST",
    heading: "Since the last digest",
    intro: summary,
    panelTitle: "What came in",
    rows,
    ctaLabel: "Open in Dashboard",
    ctaUrl: DASHBOARD_URL,
    footerNote: "Automated daily digest — no reply needed.",
    text: [summary, "", `Open the dashboard for full details: ${DASHBOARD_URL}`].join("\n"),
  });

  return { sent: true, counts, total };
}
