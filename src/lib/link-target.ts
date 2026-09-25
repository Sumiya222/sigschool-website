/**
 * Scheme allowlist for stored link targets that get rendered as a clickable
 * href — CMS CTA targets, camp_window register/closed links, and the
 * job-application linkedin_url field. Mirrors is_safe_link_target() (added
 * in migration 20260730200000) exactly; keep both in sync if the rule ever
 * changes. Rejects javascript:, data:, vbscript: and any other scheme.
 */
export function isSafeLinkTarget(url: string | null): boolean {
  if (url == null || url === "" || url === "/") return true;
  if (/^\/[^/]/.test(url)) return true;
  if (/^#/.test(url)) return true;
  if (/^\?/.test(url)) return true;
  if (/^https?:\/\//i.test(url)) return true;
  if (/^mailto:/i.test(url)) return true;
  if (/^tel:/i.test(url)) return true;
  return false;
}
