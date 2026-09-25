import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { MAX_CV_BYTES, type EmploymentType, type JobOpening } from "@/lib/careers.shared";
import {
  GLOBAL_CEILING_MESSAGE,
  isGlobalSubmissionCeilingHit,
} from "@/lib/global-submission-ceiling.server";
import {
  isBucketOverQuota,
  STORAGE_QUOTA_REJECTION_MESSAGE,
} from "@/lib/storage-quota-guard.server";

/** Server-only careers helpers: public role reads, CV validation and storage. */

export const applicationSchema = z.object({
  job_opening_id: z.string().uuid().nullable().optional(),
  full_name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.string().trim().email("Please enter a valid email address").max(255),
  phone: z.string().trim().min(6, "Please enter a phone number").max(40),
  // The admin dashboard renders this as a clickable link — only a real
  // http(s) URL is accepted, so a javascript:/data: scheme can never reach
  // an admin's browser via this field.
  linkedin_url: z
    .string()
    .trim()
    .max(300)
    .refine(
      (v) => v === "" || /^https?:\/\//i.test(v),
      "Please enter a link starting with https://",
    )
    .optional()
    .nullable(),
  cover_note: z.string().trim().max(4000).optional().nullable(),
  cv_file_name: z.string().trim().min(1).max(200),
  /** Base64 payload of the CV, without a data: prefix. */
  cv_base64: z.string().min(16),
  /** Honeypot — must stay empty. */
  company: z.string().max(200).optional().nullable(),
});

export type ApplicationInput = z.input<typeof applicationSchema>;

export const cvUrlSchema = z.object({ applicationId: z.string().uuid() });

const WINDOW_MINUTES = 15;
const MAX_PER_WINDOW = 3;

export async function listOpenRoles(): Promise<JobOpening[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return [];
  try {
    const supabase = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data } = await supabase
      .from("job_openings")
      .select(
        "id, title, department, location, employment_type, description, responsibilities, requirements, posted_at, closes_at, status, visible, order",
      )
      .eq("visible", true)
      .eq("status", "open")
      .order("order")
      .order("id");

    const today = new Date().toISOString().slice(0, 10);
    return (data ?? [])
      .filter((r) => r.visible && r.status === "open" && (!r.closes_at || r.closes_at >= today))
      .map((r) => ({
        id: r.id,
        title: r.title,
        department: r.department,
        location: r.location,
        employment_type: r.employment_type as EmploymentType,
        description: r.description,
        responsibilities: r.responsibilities,
        requirements: r.requirements,
        posted_at: r.posted_at,
        closes_at: r.closes_at,
      }));
  } catch {
    return [];
  }
}

async function hashIp(ip: string): Promise<string> {
  const bytes = new TextEncoder().encode(`astrobot-careers:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 40);
}

function decodeBase64(input: string): Uint8Array | null {
  try {
    const clean = input.includes(",") ? input.slice(input.indexOf(",") + 1) : input;
    const binary = atob(clean);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/** Sniff the real container from its magic bytes — the extension is never trusted. */
function sniffDocument(bytes: Uint8Array): { ext: "pdf" | "docx"; mime: string } | null {
  const startsWith = (sig: number[]) => sig.every((b, i) => bytes[i] === b);

  if (startsWith([0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { ext: "pdf", mime: "application/pdf" };
  }
  // Legacy .doc (OLE compound files) is rejected: it can carry executable macros.
  if (startsWith([0x50, 0x4b, 0x03, 0x04]) || startsWith([0x50, 0x4b, 0x05, 0x06])) {
    const head = new TextDecoder("latin1").decode(bytes.subarray(0, Math.min(bytes.length, 8192)));
    if (head.includes("[Content_Types].xml") || head.includes("word/")) {
      return {
        ext: "docx",
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      };
    }
    return null;
  }
  return null;
}

export type SubmitResult = { ok: true } | { ok: false; reason: string };

export async function storeApplication(
  data: z.output<typeof applicationSchema>,
  ip: string,
): Promise<SubmitResult> {
  // Honeypot: silently accept so the bot believes it succeeded.
  if (data.company && data.company.trim().length > 0) return { ok: true };

  // Global, source-independent ceiling — stops a flood spread across many
  // IPs, which the per-IP window below can't.
  if (await isGlobalSubmissionCeilingHit("job_applications")) {
    return { ok: false, reason: GLOBAL_CEILING_MESSAGE };
  }

  // Storage circuit breaker — every application requires a CV, so this
  // matters for every submission that reaches this point.
  if (await isBucketOverQuota("applications")) {
    return { ok: false, reason: STORAGE_QUOTA_REJECTION_MESSAGE };
  }

  const bytes = decodeBase64(data.cv_base64);
  if (!bytes || bytes.length === 0) {
    return { ok: false, reason: "We couldn't read that file. Please attach it again." };
  }
  if (bytes.length > MAX_CV_BYTES) {
    return { ok: false, reason: "That CV is larger than 10MB. Please attach a smaller file." };
  }
  const kind = sniffDocument(bytes);
  if (!kind) {
    return {
      ok: false,
      reason: "Only PDF and DOCX files are accepted. That file isn't one of them.",
    };
  }

  const ipHash = await hashIp(ip);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { count } = await supabaseAdmin
    .from("job_applications")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);

  if ((count ?? 0) >= MAX_PER_WINDOW) {
    return {
      ok: false,
      reason:
        "You've sent several applications just now. Please give us a little time to read them.",
    };
  }

  // Only record a role reference if that role is genuinely live.
  let jobId: string | null = data.job_opening_id ?? null;
  let jobTitle: string | null = null;
  let jobDepartment: string | null = null;
  let jobClosesAt: string | null = null;
  if (jobId) {
    const { data: job } = await supabaseAdmin
      .from("job_openings")
      .select("id, status, visible, title, department, closes_at")
      .eq("id", jobId)
      .maybeSingle();
    if (!job || job.status !== "open" || !job.visible) {
      jobId = null;
    } else {
      jobTitle = job.title;
      jobDepartment = job.department;
      jobClosesAt = job.closes_at;
    }
  }

  const safeName = data.cv_file_name
    .replace(/[^\w.-]/g, "_")
    .slice(-80)
    .replace(/\.[^.]+$/, "");
  const path = `cv/${new Date().getFullYear()}/${crypto.randomUUID()}-${safeName || "cv"}.${kind.ext}`;

  const up = await supabaseAdmin.storage
    .from("applications")
    .upload(path, bytes, { contentType: kind.mime, upsert: false });

  if (up.error) {
    console.error("cv upload failed", up.error.message);
    return { ok: false, reason: "We couldn't store your CV just now." };
  }

  const { data: inserted, error } = await supabaseAdmin
    .from("job_applications")
    .insert({
      job_opening_id: jobId,
      full_name: data.full_name,
      email: data.email,
      phone: data.phone,
      cv_storage_path: path,
      cv_file_name: data.cv_file_name.slice(0, 200),
      cover_note: data.cover_note?.trim() || null,
      linkedin_url: data.linkedin_url?.trim() || null,
      ip_hash: ipHash,
    })
    .select("id, created_at")
    .single();

  if (error || !inserted) {
    console.error("application insert failed", error?.message);
    await supabaseAdmin.storage.from("applications").remove([path]);
    return { ok: false, reason: "We couldn't save your application just now." };
  }

  // Archive mirror — best effort, fired without awaiting. mirrorToSheet
  // already queues to sheet_sync_queue and retries there on failure, so
  // there's nothing for the applicant's response to gain by waiting on it.
  const position = jobTitle ? `${jobTitle} — ${jobDepartment}` : "General application";

  import("@/lib/sheet-sync.server")
    .then(({ mirrorToSheet, applicationRow }) =>
      mirrorToSheet(
        "job_applications",
        inserted.id,
        applicationRow({
          id: inserted.id,
          created_at: inserted.created_at,
          full_name: data.full_name,
          email: data.email,
          phone: data.phone,
          position,
          linkedin_url: data.linkedin_url?.trim() || null,
          cover_note: data.cover_note?.trim() || null,
          cv_file_name: data.cv_file_name.slice(0, 200),
        }),
      ),
    )
    .catch((err) => console.error("application sheet mirror failed", err));

  // Confirmation reply — best effort, fired without awaiting.
  import("@/lib/careers-notify.server")
    .then(({ sendApplicationConfirmation }) =>
      sendApplicationConfirmation({
        fullName: data.full_name,
        email: data.email,
        position,
        cvFileName: data.cv_file_name,
        submissionId: inserted.id,
      }),
    )
    .catch((err) => console.error("application confirmation email failed", err));

  // Urgent, out-of-band alert — best effort, never blocks or fails the
  // submission. Everything else about an application waits for the daily
  // digest; a role closing imminently is the one case worth interrupting
  // that, since the admin may want to act before it closes.
  if (jobTitle && jobClosesAt) {
    try {
      const { maybeSendClosingSoonAlert } = await import("@/lib/urgent-admin-alerts.server");
      await maybeSendClosingSoonAlert({
        applicantName: data.full_name,
        roleTitle: jobTitle,
        closesAt: jobClosesAt,
      });
    } catch (err) {
      console.error("closing-soon alert failed", err);
    }
  }

  return { ok: true };
}

/** Short-lived signed URL for one CV. Callers must have verified admin first. */
export async function signCv(applicationId: string): Promise<{ url: string } | { error: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("job_applications")
    .select("cv_storage_path, cv_file_name")
    .eq("id", applicationId)
    .maybeSingle();

  if (!row?.cv_storage_path) return { error: "That CV could not be found." };

  const { data: signed, error } = await supabaseAdmin.storage
    .from("applications")
    .createSignedUrl(row.cv_storage_path, 120, { download: row.cv_file_name ?? true });

  if (error || !signed?.signedUrl) return { error: "That CV could not be opened." };
  return { url: signed.signedUrl };
}
