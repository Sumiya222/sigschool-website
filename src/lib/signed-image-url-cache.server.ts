import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * In-memory cache for the resized signed Storage URLs served by the public
 * gallery and featured-students pages. Both pages sign ~3 URLs (one per
 * responsive width) per item on every page view, unauthenticated — without
 * caching, every visitor re-triggers the full signing fan-out even though
 * the underlying files haven't changed.
 *
 * Keyed by bucket + storage path + width. A storage path is unique per
 * upload (site-media.functions.ts always mints a fresh UUID-based path for
 * every upload, never reusing one), so an added or replaced photo always
 * produces a brand-new key and gets signed fresh on its own — no explicit
 * invalidation is needed for those cases. A removed photo's old entry
 * simply ages out with the rest of the cache; nothing looks it up again
 * once its row is gone.
 */

type Entry = { url: string; expiresAt: number };

const cache = new Map<string, Entry>();
let hits = 0;
let misses = 0;

// Supabase signs these for SIGN_TTL_SECONDS (6h, matching the existing
// EXPIRY constants in gallery.functions.ts / featured-students.functions.ts).
// Serving a cached URL right up to that real expiry risks handing a visitor
// a URL that dies moments after their page loads, so entries are treated as
// stale MARGIN_SECONDS before that — a cached URL always has at least an
// hour of life left when served, which comfortably outlasts a page view
// even on a slow connection.
const MARGIN_SECONDS = 60 * 60;

export async function getCachedSignedUrl(
  supabaseAdmin: SupabaseClient<Database>,
  bucket: string,
  storagePath: string,
  signTtlSeconds: number,
  transform: { width: number; resize: "contain"; quality: number },
): Promise<string | null> {
  const key = `${bucket}::${storagePath}::${transform.width}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt - now > MARGIN_SECONDS * 1000) {
    hits++;
    return hit.url;
  }

  misses++;
  const { data } = await supabaseAdmin.storage
    .from(bucket)
    .createSignedUrl(storagePath, signTtlSeconds, { transform });
  const url = data?.signedUrl ?? null;
  if (url) cache.set(key, { url, expiresAt: now + signTtlSeconds * 1000 });
  else cache.delete(key);
  return url;
}

/** Cache size and hit/miss counters, for observability only. */
export function getSignedUrlCacheStats(): { size: number; hits: number; misses: number } {
  return { size: cache.size, hits, misses };
}
