import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Featured students — named, identifiable children.
 *
 * Consent is enforced twice over, and neither guard lives in the UI:
 *  1. The row is read with the publishable (anon) key, so the row-level
 *     policy — visible AND consent_confirmed — decides whether the record
 *     exists at all for the public site.
 *  2. The `site-media` bucket stays private; only rows that survive the
 *     policy are ever handed a short-lived signed URL, so an unconsented
 *     child's photograph has no reachable address anywhere.
 */

export type FeaturedStudent = {
  id: string;
  fullName: string;
  age: number | null;
  school: string;
  grade: string | null;
  achievement: string;
  quote: string | null;
  projectId: string | null;
  alt: string;
  /** Card-sized source, or null when no photograph exists yet. */
  src: string | null;
  srcSet: string | null;
  /** Larger source used by the detail lightbox. */
  full: string | null;
  /** CSS object-position honouring the saved focal point. */
  position: string;
};

const WIDTHS = [480, 960, 1600] as const;
const EXPIRY = 60 * 60 * 6;

export const getFeaturedStudents = createServerFn({ method: "GET" }).handler(
  async (): Promise<FeaturedStudent[]> => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return [];

    try {
      const supabase = createClient<Database>(url, key, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });

      const { data } = await supabase
        .from("featured_students")
        .select(
          "id, full_name, age, school, grade, achievement, quote, project_id, photo_media_id, order, visible, consent_confirmed",
        )
        .eq("visible", true)
        .eq("consent_confirmed", true)
        .order("order")
        .order("id");

      const rows = (data ?? []).filter((r) => r.visible && r.consent_confirmed);
      if (rows.length === 0) return [];

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { getCachedSignedUrl } = await import("@/lib/signed-image-url-cache.server");

      const mediaIds = rows.map((r) => r.photo_media_id).filter((x): x is string => !!x);

      const [{ data: media }, { data: focalRow }] = await Promise.all([
        mediaIds.length
          ? supabaseAdmin.from("media").select("id, storage_path, alt_text").in("id", mediaIds)
          : Promise.resolve({
              data: [] as { id: string; storage_path: string; alt_text: string }[],
            }),
        supabaseAdmin
          .from("site_settings")
          .select("value")
          .eq("key", "_media_focal_points")
          .maybeSingle(),
      ]);

      const focal = (focalRow?.value ?? {}) as Record<string, { x: number; y: number }>;
      const byId = new Map((media ?? []).map((m) => [m.id, m]));

      const out = await Promise.all(
        rows.map(async (row) => {
          const m = row.photo_media_id ? byId.get(row.photo_media_id) : undefined;
          let urls: (string | null)[] = [null, null, null];

          if (m && !m.storage_path.startsWith("asset:")) {
            urls = await Promise.all(
              WIDTHS.map((w) =>
                getCachedSignedUrl(supabaseAdmin, "site-media", m.storage_path, EXPIRY, {
                  width: w,
                  resize: "contain",
                  quality: 78,
                }),
              ),
            );
          }

          const p = row.photo_media_id ? focal[row.photo_media_id] : undefined;
          const srcSet = urls
            .map((u, i) => (u ? `${u} ${WIDTHS[i]}w` : null))
            .filter(Boolean)
            .join(", ");

          return {
            id: row.id,
            fullName: row.full_name,
            age: row.age,
            school: row.school ?? "",
            grade: row.grade,
            achievement: row.achievement ?? "",
            quote: row.quote,
            projectId: row.project_id,
            alt: m?.alt_text || `${row.full_name}, student`,
            src: urls[1] ?? urls[0],
            srcSet: srcSet || null,
            full: urls[2] ?? urls[1] ?? urls[0],
            position: p ? `${(p.x * 100).toFixed(1)}% ${(p.y * 100).toFixed(1)}%` : "50% 30%",
          } satisfies FeaturedStudent;
        }),
      );

      return out;
    } catch {
      return [];
    }
  },
);
