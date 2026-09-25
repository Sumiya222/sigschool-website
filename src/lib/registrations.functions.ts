/**
 * Camp registration intake.
 *
 * Runs with the service-role client: the `registrations` table is admin-read
 * only and visitors never touch the Data API. Guards mirror the inquiry form —
 * a honeypot no human fills, plus a per-IP window.
 *
 * Capacity: when the camp window sets a capacity and confirmed/new
 * registrations have reached it, the row is still saved but with
 * status = 'waitlisted'. A null capacity means no limit.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { getClientIp, isOriginUnverified, ORIGIN_UNVERIFIED_MESSAGE } from "@/lib/get-client-ip";
import {
  MAX_UPLOAD_BYTES,
  trackForAge,
  trackLabel,
  type CustomAnswer,
} from "@/lib/registrations.shared";
import { sniffUpload } from "@/lib/file-sniff";
import {
  GLOBAL_CEILING_MESSAGE,
  isGlobalSubmissionCeilingHit,
} from "@/lib/global-submission-ceiling.server";
import {
  isBucketOverQuota,
  STORAGE_QUOTA_REJECTION_MESSAGE,
} from "@/lib/storage-quota-guard.server";

const schema = z.object({
  student_first_name: z.string().trim().min(1, "Please enter a first name").max(80),
  student_last_name: z.string().trim().min(1, "Please enter a last name").max(80),
  student_age: z.coerce.number().int().min(3, "Please enter an age").max(19, "Please enter an age"),
  student_school: z.string().trim().max(160).optional().nullable(),
  parent_name: z.string().trim().min(2, "Please enter your name").max(120),
  parent_email: z.string().trim().email("Please enter a valid email address").max(255),
  parent_phone: z.string().trim().min(6, "Please enter a phone or WhatsApp number").max(40),
  medical_notes: z.string().trim().max(2000).optional().nullable(),
  consent_media: z.boolean().default(false),
  /** Custom field answers keyed by registration_fields.id. */
  answers: z.record(z.string().uuid(), z.string().trim().max(2000)).optional(),
  /** Attachments for `file` questions, keyed by registration_fields.id. */
  uploads: z
    .record(
      z.string().uuid(),
      z.object({ name: z.string().trim().min(1).max(200), base64: z.string().min(16) }),
    )
    .optional(),
  /** Honeypot — must stay empty. */
  company: z.string().max(200).optional().nullable(),
});

export type RegistrationInput = z.input<typeof schema>;

export type RegistrationResult =
  | { ok: true; waitlisted: boolean }
  | { ok: false; reason: string; fieldErrors?: Record<string, string> };

const WINDOW_MINUTES = 10;
const MAX_PER_WINDOW = 5;

async function hashIp(ip: string): Promise<string> {
  const bytes = new TextEncoder().encode(`astrobot-registration:${ip}`);
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

/**
 * Validates one custom-field answer against its declared field_type. Runs
 * only at submission time, against the field's configuration as it exists
 * right now — it never re-checks or touches previously stored answers, so a
 * field_type/options change made after a registration was submitted can't
 * retroactively invalidate or alter that older answer.
 */
function validateAnswerType(
  field: { label: string; field_type: string; options: unknown },
  value: string,
): string | null {
  switch (field.field_type) {
    case "number": {
      const n = Number(value);
      if (!Number.isFinite(n)) return `${field.label} must be a number`;
      return null;
    }
    case "date": {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (!m) return `${field.label} must be a valid date`;
      const y = Number(m[1]);
      const mo = Number(m[2]);
      const d = Number(m[3]);
      const parsed = new Date(Date.UTC(y, mo - 1, d));
      const valid =
        parsed.getUTCFullYear() === y &&
        parsed.getUTCMonth() === mo - 1 &&
        parsed.getUTCDate() === d;
      return valid ? null : `${field.label} must be a valid date`;
    }
    case "dropdown":
    case "radio": {
      const options = Array.isArray(field.options) ? (field.options as unknown[]) : [];
      return options.includes(value) ? null : `${field.label} must be one of the listed options`;
    }
    case "checkbox": {
      const boolish = ["yes", "no", "true", "false", "on", "off", "1", "0"];
      return boolish.includes(value.toLowerCase()) ? null : `${field.label} must be a valid choice`;
    }
    default:
      // text / textarea — already length-bounded by the outer schema (.max(2000)).
      return null;
  }
}

export const submitRegistration = createServerFn({ method: "POST" })
  .inputValidator((data: RegistrationInput) => schema.parse(data))
  .handler(async ({ data }): Promise<RegistrationResult> => {
    // Origin-lock stopgap: reject requests that bypassed Cloudflare entirely
    // (no CF-Connecting-IP) — see get-client-ip.ts for why this is only a
    // partial mitigation, not a substitute for the real server-level fix.
    if (isOriginUnverified()) {
      return { ok: false, reason: ORIGIN_UNVERIFIED_MESSAGE };
    }

    // Honeypot: silently accept so the bot believes it worked.
    if (data.company && data.company.trim().length > 0) return { ok: true, waitlisted: false };

    // Global, source-independent ceiling — stops a flood spread across many
    // IPs, which the per-IP window below can't. Checked before it so the
    // whole-form gate short-circuits before doing per-IP work.
    if (await isGlobalSubmissionCeilingHit("registrations")) {
      return { ok: false, reason: GLOBAL_CEILING_MESSAGE };
    }

    const ip = getClientIp();
    const ipHash = await hashIp(ip);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
    const { count: recent } = await supabaseAdmin
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);

    if ((recent ?? 0) >= MAX_PER_WINDOW) {
      return {
        ok: false,
        reason:
          "Several registrations have just come from this device. Please give us a few minutes, or send us the details on WhatsApp.",
      };
    }

    const { data: camp } = await supabaseAdmin
      .from("camp_window")
      .select("camp_name, is_open, registration_mode, capacity")
      .limit(1)
      .maybeSingle();

    if (!camp || !camp.is_open || camp.registration_mode !== "built_in") {
      return { ok: false, reason: "Registration for this camp is not open at the moment." };
    }

    // Storage circuit breaker — only relevant if this submission actually
    // needs to write a file. A registration with no attachments should
    // never be blocked by a bucket it doesn't touch.
    const hasFileUploads = Object.keys(data.uploads ?? {}).length > 0;
    if (hasFileUploads && (await isBucketOverQuota("registration-uploads"))) {
      return { ok: false, reason: STORAGE_QUOTA_REJECTION_MESSAGE };
    }

    // Validate custom answers server-side against the live field list.
    const { data: fields } = await supabaseAdmin
      .from("registration_fields")
      .select("id, label, field_type, options, required, active")
      .eq("active", true)
      .order("order")
      .order("id");

    const fieldErrors: Record<string, string> = {};
    const customAnswers: CustomAnswer[] = [];
    const uploadedPaths: string[] = [];

    for (const f of fields ?? []) {
      if (f.field_type === "file") {
        const upload = (data.uploads ?? {})[f.id];
        if (!upload) {
          if (f.required) fieldErrors[f.id] = `${f.label} is required`;
          continue;
        }
        const bytes = decodeBase64(upload.base64);
        if (!bytes || bytes.length === 0) {
          fieldErrors[f.id] = "We couldn't read that file. Please attach it again.";
          continue;
        }
        if (bytes.length > MAX_UPLOAD_BYTES) {
          fieldErrors[f.id] = "That file is larger than 10MB.";
          continue;
        }
        const kind = sniffUpload(bytes);
        if (!kind) {
          fieldErrors[f.id] =
            "Only PDF, JPG, PNG and WEBP files are accepted. Documents, archives and programs are blocked.";
          continue;
        }
        const safe = upload.name
          .replace(/[^\w.-]/g, "_")
          .slice(-60)
          .replace(/\.[^.]+$/, "");
        const path = `registrations/${new Date().getFullYear()}/${crypto.randomUUID()}-${safe || "upload"}.${kind.ext}`;
        const up = await supabaseAdmin.storage
          .from("registration-uploads")
          .upload(path, bytes, { contentType: kind.mime, upsert: false });
        if (up.error) {
          console.error("registration upload failed", up.error.message);
          fieldErrors[f.id] = "We couldn't store that file just now.";
          continue;
        }
        uploadedPaths.push(path);
        customAnswers.push({
          field_id: f.id,
          label: f.label,
          value: upload.name,
          storage_path: path,
        });
        continue;
      }

      const raw = (data.answers ?? {})[f.id] ?? "";
      const value = raw.trim();
      if (f.required && value.length === 0) {
        fieldErrors[f.id] = `${f.label} is required`;
        continue;
      }
      if (value.length === 0) continue;

      const typeError = validateAnswerType(f, value);
      if (typeError) {
        fieldErrors[f.id] = typeError;
        continue;
      }

      customAnswers.push({ field_id: f.id, label: f.label, value });
    }

    if (Object.keys(fieldErrors).length > 0) {
      // Don't leave orphaned files behind when the form comes back with errors.
      if (uploadedPaths.length > 0) {
        await supabaseAdmin.storage.from("registration-uploads").remove(uploadedPaths);
      }
      return { ok: false, reason: "Please complete the highlighted questions.", fieldErrors };
    }

    // Capacity → waitlist. Cancelled rows free a seat again.
    let waitlisted = false;
    let takenBeforeThisOne = 0;
    if (camp.capacity != null) {
      const { count: taken } = await supabaseAdmin
        .from("registrations")
        .select("id", { count: "exact", head: true })
        .eq("camp_name", camp.camp_name)
        .in("status", ["new", "confirmed"]);
      takenBeforeThisOne = taken ?? 0;
      waitlisted = takenBeforeThisOne >= camp.capacity;
    }

    const track = trackForAge(data.student_age);

    const { data: inserted, error } = await supabaseAdmin
      .from("registrations")
      .insert({
        camp_name: camp.camp_name,
        student_first_name: data.student_first_name,
        student_last_name: data.student_last_name,
        student_age: data.student_age,
        age_track: track ? trackLabel(track) : "Outside listed tracks",
        student_school: data.student_school?.trim() || null,
        parent_name: data.parent_name,
        parent_email: data.parent_email,
        parent_phone: data.parent_phone,
        medical_notes: data.medical_notes?.trim() || null,
        consent_media: data.consent_media,
        custom_answers: customAnswers,
        status: waitlisted ? "waitlisted" : "new",
        ip_hash: ipHash,
      })
      .select("id, created_at")
      .single();

    if (error || !inserted) {
      console.error("registration insert failed", error?.message);
      return { ok: false, reason: "We couldn't save this registration just now." };
    }

    // Append-only Google Sheet archive. Best effort: never fails the parent's
    // registration, and file answers are recorded by filename only. Fired
    // without awaiting — mirrorToSheet already queues to sheet_sync_queue
    // and retries there on failure (see sheet-sync.server.ts), so there's
    // nothing for the parent's response to gain by waiting on it. The
    // .catch() here only guards the dynamic import / call itself; the sync
    // logic's own errors are already caught and logged inside mirrorToSheet.
    import("@/lib/sheet-sync.server")
      .then(({ mirrorToSheet, registrationRow }) =>
        mirrorToSheet(
          "registrations",
          inserted.id,
          registrationRow({
            id: inserted.id,
            created_at: inserted.created_at,
            camp_name: camp.camp_name,
            student_name: `${data.student_first_name} ${data.student_last_name}`,
            student_age: data.student_age,
            age_track: track ? trackLabel(track) : "Outside listed tracks",
            student_school: data.student_school?.trim() || null,
            parent_name: data.parent_name,
            parent_email: data.parent_email,
            parent_phone: data.parent_phone,
            status: waitlisted ? "Waitlisted" : "New",
            consent_media: data.consent_media,
            medical_notes: data.medical_notes?.trim() || null,
            custom_answers: customAnswers.map((a) => ({ label: a.label, value: a.value })),
          }),
        ),
      )
      .catch((err) => console.error("registration sheet mirror failed", err));

    // Parent confirmation — best effort, fired without awaiting. The
    // registration is already saved at this point, so a slow or hung
    // Resend call shouldn't hold the parent's success screen open.
    import("@/lib/registration-notify.server")
      .then(({ sendRegistrationConfirmation }) =>
        sendRegistrationConfirmation({
          id: inserted.id,
          campName: camp.camp_name,
          studentName: `${data.student_first_name} ${data.student_last_name}`,
          age: data.student_age,
          track: track ? trackLabel(track) : "Outside listed tracks",
          parentName: data.parent_name,
          parentEmail: data.parent_email,
          parentPhone: data.parent_phone,
          waitlisted,
        }),
      )
      .catch((err) => console.error("registration confirmation email failed", err));

    // Admin-facing notification is no longer sent per-submission — it goes
    // through the daily digest instead (see admin-digest.server.ts), except
    // for this one urgent case: a camp nearing or at capacity, which is
    // worth knowing about the same day rather than in tomorrow's digest.
    if (camp.capacity != null) {
      try {
        const { maybeSendCapacityAlert } = await import("@/lib/urgent-admin-alerts.server");
        await maybeSendCapacityAlert({
          campName: camp.camp_name,
          capacity: camp.capacity,
          takenAfterThisOne: waitlisted ? takenBeforeThisOne : takenBeforeThisOne + 1,
          studentName: `${data.student_first_name} ${data.student_last_name}`,
          waitlisted,
        });
      } catch (err) {
        console.error("capacity alert failed", err);
      }
    }

    return { ok: true, waitlisted };
  });

/**
 * Short-lived signed URL for one registration attachment (e.g. a payment
 * receipt). Admin-only: the bucket is private and never publicly readable.
 * The path is checked against a real registration row so an arbitrary
 * bucket path can't be signed.
 */
export const getRegistrationFileUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { registrationId: string; path: string }) =>
    z.object({ registrationId: z.string().uuid(), path: z.string().min(1).max(400) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<{ url: string } | { error: string }> => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) return { error: "Not authorised." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("registrations")
      .select("custom_answers")
      .eq("id", data.registrationId)
      .maybeSingle();

    const answers = Array.isArray(row?.custom_answers)
      ? (row!.custom_answers as CustomAnswer[])
      : [];
    const match = answers.find((a) => a?.storage_path === data.path);
    if (!match) return { error: "That file could not be found." };

    const { data: signed, error } = await supabaseAdmin.storage
      .from("registration-uploads")
      .createSignedUrl(data.path, 120, { download: match.value || true });

    if (error || !signed?.signedUrl) return { error: "That file could not be opened." };
    return { url: signed.signedUrl };
  });
