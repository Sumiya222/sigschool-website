import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { getClientIp, isOriginUnverified, ORIGIN_UNVERIFIED_MESSAGE } from "@/lib/get-client-ip";
import {
  GLOBAL_CEILING_MESSAGE,
  isGlobalSubmissionCeilingHit,
} from "@/lib/global-submission-ceiling.server";

/**
 * Public inquiry submission.
 *
 * Runs with the service-role client because the `inquiries` table is
 * admin-read-only: visitors never touch the Data API directly. Two cheap
 * abuse guards live here — a honeypot field no human ever fills, and a
 * per-IP window so the same address cannot flood the inbox.
 */

export const INQUIRY_TYPES = ["parent", "school", "other"] as const;
export type InquiryType = (typeof INQUIRY_TYPES)[number];

const schema = z
  .object({
    full_name: z.string().trim().min(2, "Please enter your name").max(120),
    email: z.string().trim().email("Please enter a valid email address").max(255),
    phone: z.string().trim().min(6, "Please enter a phone or WhatsApp number").max(40),
    type: z.enum(INQUIRY_TYPES),
    school_name: z.string().trim().max(160).optional().nullable(),
    role: z.string().trim().max(120).optional().nullable(),
    message: z.string().trim().min(10, "Please tell us a little more").max(4000),
    /** Track-specific answers, label → value. */
    details: z.record(z.string().max(80), z.string().trim().max(400)).optional(),
    /** Honeypot — must stay empty. */
    company: z.string().max(200).optional().nullable(),
  })
  .refine((v) => v.type !== "school" || !!v.school_name?.trim(), {
    message: "Please tell us which school",
    path: ["school_name"],
  });

export type InquiryInput = z.input<typeof schema>;

const WINDOW_MINUTES = 10;
const MAX_PER_WINDOW = 3;

async function hashIp(ip: string): Promise<string> {
  const bytes = new TextEncoder().encode(`astrobot-inquiry:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 40);
}

export const submitInquiry = createServerFn({ method: "POST" })
  .inputValidator((data: InquiryInput) => schema.parse(data))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; reason: string }> => {
    // Origin-lock stopgap: reject requests that bypassed Cloudflare entirely
    // (no CF-Connecting-IP) — see get-client-ip.ts for why this is only a
    // partial mitigation, not a substitute for the real server-level fix.
    if (isOriginUnverified()) {
      return { ok: false, reason: ORIGIN_UNVERIFIED_MESSAGE };
    }

    // Honeypot: silently accept so the bot believes it succeeded.
    if (data.company && data.company.trim().length > 0) return { ok: true };

    // Global, source-independent ceiling — stops a flood spread across many
    // IPs, which the per-IP window below can't. Checked before it so the
    // whole-form gate short-circuits before doing per-IP work.
    if (await isGlobalSubmissionCeilingHit("inquiries")) {
      return { ok: false, reason: GLOBAL_CEILING_MESSAGE };
    }

    const ip = getClientIp();
    const userAgent = (getRequestHeader("user-agent") ?? "").slice(0, 300);
    const ipHash = await hashIp(ip);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
    const { count } = await supabaseAdmin
      .from("inquiries")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);

    if ((count ?? 0) >= MAX_PER_WINDOW) {
      return {
        ok: false,
        reason: "You've sent several inquiries just now. Please give us a few minutes to reply.",
      };
    }

    const isSchool = data.type === "school";
    const { data: inserted, error } = await supabaseAdmin
      .from("inquiries")
      .insert({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone,
        type: data.type,
        school_name: isSchool ? data.school_name?.trim() || null : null,
        role: isSchool ? data.role?.trim() || null : null,
        message: data.message,
        details: Object.fromEntries(
          Object.entries(data.details ?? {}).filter(([, v]) => v && v.trim().length > 0),
        ),
        ip_hash: ipHash,
        user_agent: userAgent,
      })
      .select("id, created_at")
      .single();

    if (error || !inserted) {
      console.error("inquiry insert failed", error?.message);
      return { ok: false, reason: "We couldn't save your message just now." };
    }

    // Archive mirror — best effort, fired without awaiting. mirrorToSheet
    // already queues to sheet_sync_queue and retries there on failure, so
    // there's nothing for the visitor's response to gain by waiting on it.
    import("@/lib/sheet-sync.server")
      .then(({ mirrorToSheet, inquiryRow }) =>
        mirrorToSheet(
          "inquiries",
          inserted.id,
          inquiryRow({
            id: inserted.id,
            created_at: inserted.created_at,
            full_name: data.full_name,
            email: data.email,
            phone: data.phone,
            type: data.type,
            school_name: isSchool ? data.school_name?.trim() || null : null,
            role: isSchool ? data.role?.trim() || null : null,
            message: data.message,
          }),
        ),
      )
      .catch((err) => console.error("inquiry sheet mirror failed", err));

    // Confirmation reply — best effort, fired without awaiting.
    import("@/lib/inquiry-notify.server")
      .then(({ sendInquiryConfirmation }) =>
        sendInquiryConfirmation({
          fullName: data.full_name,
          email: data.email,
          type: data.type,
          schoolName: isSchool ? data.school_name?.trim() || null : null,
          role: isSchool ? data.role?.trim() || null : null,
          message: data.message,
          submissionId: inserted.id,
        }),
      )
      .catch((err) => console.error("inquiry confirmation email failed", err));

    return { ok: true };
  });
