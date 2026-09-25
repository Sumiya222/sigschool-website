/**
 * Server-side upload validation for the CMS media library / gallery /
 * image editor.
 *
 * Storage RLS grants any authenticated `can_edit_site()` account direct
 * INSERT on the site-media bucket (by design, so the dashboard's own
 * Supabase client can write there) — which means a direct Storage API call
 * bypasses any purely client-side check entirely. This server function is
 * the actual enforcement point: every upload from the dashboard now goes
 * through it, mirroring the same magic-byte sniff, size cap and filename
 * cap already used for CVs and registration attachments. The bucket's own
 * file_size_limit / allowed_mime_types (set at the Supabase level) are the
 * backstop for someone who skips this function and hits the Storage API
 * directly.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { sniffUpload } from "@/lib/file-sniff";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // matches the CV / registration-attachment cap
const MAX_NAME_LEN = 80; // matches the CV path's filename cap

const schema = z.object({
  base64: z.string().min(16),
  // Raw input is only loosely bounded here — an overlong name isn't
  // rejected outright, it's truncated below (matching the CV path's
  // behavior: .slice(-80) is the real, unconditional enforcement).
  filename: z.string().trim().min(1).max(2000),
  /** Optional storage-path grouping, e.g. "gallery". Sanitised the same way
   * as the filename — never taken as a full path. */
  folder: z.string().trim().max(40).optional(),
});

export type UploadSiteMediaInput = z.input<typeof schema>;
export type UploadSiteMediaResult = { ok: true; path: string } | { ok: false; reason: string };

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

export const uploadSiteMedia = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: UploadSiteMediaInput) => schema.parse(data))
  .handler(async ({ data, context }): Promise<UploadSiteMediaResult> => {
    const { data: allowed } = await context.supabase.rpc("can_edit_site");
    if (!allowed) return { ok: false, reason: "Not authorised." };

    const bytes = decodeBase64(data.base64);
    if (!bytes || bytes.length === 0) {
      return { ok: false, reason: "We couldn't read that file. Please try again." };
    }
    if (bytes.length > MAX_UPLOAD_BYTES) {
      return { ok: false, reason: "That file is larger than 10MB." };
    }

    // Raster images only — SVG is rejected outright regardless of how it's
    // declared, since it's a browser-executable format, not a picture format.
    const kind = sniffUpload(bytes);
    if (!kind || kind.ext === "pdf") {
      return {
        ok: false,
        reason: "Only JPG, PNG and WEBP images are accepted.",
      };
    }

    const safeName = data.filename
      .replace(/[^\w.-]/g, "_")
      .slice(-MAX_NAME_LEN)
      .replace(/\.[^.]+$/, "");
    const safeFolder = data.folder?.replace(/[^\w-]/g, "_").slice(0, 40);
    const prefix = safeFolder ? `${safeFolder}/` : "";
    const path = `${prefix}${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName || "image"}.${kind.ext}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const up = await supabaseAdmin.storage
      .from("site-media")
      .upload(path, bytes, { contentType: kind.mime, upsert: false });

    if (up.error) {
      console.error("site-media upload failed", up.error.message);
      return { ok: false, reason: "We couldn't store that file just now." };
    }

    return { ok: true, path };
  });
