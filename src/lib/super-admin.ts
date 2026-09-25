// Super Admin identity.
//
// The database is the real boundary — a row in `public.whitelist` with
// is_super_admin = true (see supabase/bootstrap/01_super_admin.sql). This
// constant only tells the client which dashboards to offer, and MUST match
// that row's email.
//
// On a new deployment, set VITE_SUPER_ADMIN_EMAIL rather than editing code.
const FALLBACK_SUPER_ADMIN_EMAIL = "shameerzeeshan@gmail.com";

export const HARDCODED_SUPER_ADMIN_EMAIL = (
  import.meta.env.VITE_SUPER_ADMIN_EMAIL || FALLBACK_SUPER_ADMIN_EMAIL
)
  .trim()
  .toLowerCase();

export function isHardcodedSuperAdmin(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase() === HARDCODED_SUPER_ADMIN_EMAIL;
}
