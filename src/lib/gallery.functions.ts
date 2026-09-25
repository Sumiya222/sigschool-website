import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Public classroom gallery.
 *
 * Two safeguards live here, deliberately:
 *  1. Rows are read through the publishable (anon) key, so the row-level
 *     policy — visible AND consent_confirmed — decides what exists at all.
 *     The extra filters below are belt-and-braces, not the guard itself.
 *  2. The `site-media` bucket stays private. Only the rows that survive the
 *     policy get a short-lived, resized signed URL, so an un-consented
 *     photograph has no reachable address anywhere in the markup or network
 *     traffic — and no original full-resolution file is ever exposed.
 */

export type GalleryImage = {
  id: string;
  caption: string;
  description: string | null;
  location: string | null;
  taken_on: string | null;
  alt: string;
  width: number | null;
  height: number | null;
  /** Grid-sized source. */
  src: string;
  /** Responsive candidates so phones never pull a desktop-sized file. */
  srcSet: string;
  /** Larger source used only by the lightbox. */
  full: string;
};

const WIDTHS = [480, 960, 1600] as const;
const EXPIRY = 60 * 60 * 6;

export const getGalleryImages = createServerFn({ method: "GET" }).handler(
  async (): Promise<GalleryImage[]> => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return [];

    try {
      const supabase = createClient<Database>(url, key, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });

      const { data } = await supabase
        .from("gallery_images")
        .select(
          "id, media_id, caption, description, location, taken_on, order, visible, consent_confirmed",
        )
        .eq("visible", true)
        .eq("consent_confirmed", true)
        .order("order")
        .order("id");

      const rows = (data ?? []).filter((r) => r.visible && r.consent_confirmed && r.media_id);
      if (rows.length === 0) return [];

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { getCachedSignedUrl } = await import("@/lib/signed-image-url-cache.server");

      const { data: media } = await supabaseAdmin
        .from("media")
        .select("id, storage_path, alt_text, width, height")
        .in(
          "id",
          rows.map((r) => r.media_id as string),
        );

      const byId = new Map((media ?? []).map((m) => [m.id, m]));

      const out = await Promise.all(
        rows.map(async (row) => {
          const m = byId.get(row.media_id as string);
          if (!m || m.storage_path.startsWith("asset:")) return null;

          const urls = await Promise.all(
            WIDTHS.map((w) =>
              getCachedSignedUrl(supabaseAdmin, "site-media", m.storage_path, EXPIRY, {
                width: w,
                resize: "contain",
                quality: 78,
              }),
            ),
          );
          if (!urls[1] && !urls[0]) return null;

          const srcSet = urls
            .map((u, i) => (u ? `${u} ${WIDTHS[i]}w` : null))
            .filter(Boolean)
            .join(", ");

          return {
            id: row.id,
            caption: row.caption ?? "",
            description: row.description,
            location: row.location,
            taken_on: row.taken_on,
            alt: m.alt_text || row.caption || "Classroom photograph",
            width: m.width,
            height: m.height,
            src: (urls[1] ?? urls[0]) as string,
            srcSet,
            full: (urls[2] ?? urls[1] ?? urls[0]) as string,
          } satisfies GalleryImage;
        }),
      );

      return out.filter((x): x is GalleryImage => x !== null);
    } catch {
      return [];
    }
  },
);
