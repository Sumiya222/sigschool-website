import { getRequestHeader } from "@tanstack/react-start/server";

/**
 * Best-effort caller IP for per-IP rate limiting on public forms.
 *
 * CF-Connecting-IP is set by Cloudflare from the actual TCP connection at
 * their edge — a client cannot forge it, so it's checked first. X-Forwarded-For
 * is only a fallback for requests that somehow arrive without it (e.g. local
 * dev with no Cloudflare in front): a client can prepend arbitrary values to
 * that header, but can't remove what a trusted proxy appends after it, so the
 * LAST entry is used rather than the first.
 *
 * Previously this checked X-Forwarded-For's first entry ahead of
 * CF-Connecting-IP, which let any caller defeat the rate limit outright by
 * sending their own X-Forwarded-For header — confirmed live: rotating that
 * header on every request let an unlimited number of submissions through.
 */
export function getClientIp(): string {
  const cfIp = getRequestHeader("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  // Cloudflare sets CF-Connecting-IP on every request that reaches the
  // origin, so this should never fire in production unless the deployment
  // topology has changed (e.g. Cloudflare no longer sits in front of every
  // request). Quiet in local dev — there's no Cloudflare edge there at all,
  // so this is the expected, harmless path every request takes locally.
  if (!import.meta.env.DEV) {
    console.warn(
      "[get-client-ip] CF-Connecting-IP header missing on a production request — falling back to X-Forwarded-For, which a client can set arbitrarily. The IP used for rate limiting on this request is untrusted. Check that Cloudflare is still in front of every request reaching the origin.",
    );
  }

  const forwarded = getRequestHeader("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }

  return "unknown";
}

/**
 * True when this production request has no CF-Connecting-IP header at all —
 * i.e. it didn't come through Cloudflare, most likely a direct request to
 * the origin's IP. Always false in local dev, where there's no Cloudflare
 * edge in front to begin with.
 *
 * Best-effort, not a strong guarantee: it only catches requests that don't
 * bother sending the header. A determined attacker who already knows the
 * origin IP could still fake this header on a direct request — genuine
 * origin-IP restriction has to happen at the server/LiteSpeed level, which
 * this shared cPanel host doesn't expose to the app itself. This is a cheap
 * stopgap against casual/automated bypass while that's pending.
 */
export function isOriginUnverified(): boolean {
  if (import.meta.env.DEV) return false;
  return !getRequestHeader("cf-connecting-ip");
}

export const ORIGIN_UNVERIFIED_MESSAGE = "Could not verify this request. Please try again.";
