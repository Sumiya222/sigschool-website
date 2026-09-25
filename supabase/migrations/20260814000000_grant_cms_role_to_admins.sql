-- Fixes the CMS access gap found during the end-to-end functional audit:
-- can_edit_site() (the RLS gate on ~20 CMS-content tables) only recognizes
-- the 'cms' role or the hardcoded super admin -- it deliberately does NOT
-- recognize 'admin', since CMS/content access and student-data access are
-- meant to be separable (a content editor shouldn't need student records
-- access, and vice versa). That separation is correct and is being kept;
-- widening can_edit_site() to include 'admin' would collapse it.
--
-- The actual gap: real admin accounts had no way to also hold the 'cms'
-- role, so the two admins who need to edit site content were silently
-- unable to (see the sibling "silent success" fix for why this went
-- unnoticed). The schema already supports one account holding multiple
-- roles (user_roles has UNIQUE(user_id, role), not UNIQUE(user_id); same
-- shape on whitelist) -- this migration uses that, rather than changing
-- the schema or the RLS gate itself.
--
-- shameerzeeshan@gmail.com is the hardcoded super admin (is_super_admin =
-- true), so it already bypasses can_edit_site() via that path regardless
-- of role -- granting 'cms' here is for consistency/explicitness, not
-- because it was actually blocked. rabiarohail315@gmail.com had no such
-- bypass and was genuinely unable to save any CMS edit.
--
-- Uses this codebase's own established pattern (see earlier whitelist
-- migrations) for a legitimate administrative grant that the privilege-
-- escalation triggers would otherwise correctly block from a raw
-- top-level statement: disable only the two specific enforcement
-- triggers by name (not ALL triggers), so the audit-log triggers stay
-- active and this grant is recorded like any other.

ALTER TABLE public.whitelist DISABLE TRIGGER enforce_super_admin_rules_trg;
ALTER TABLE public.user_roles DISABLE TRIGGER enforce_user_roles_privilege_rules_trg;

INSERT INTO public.whitelist (email, role, status)
VALUES
  ('shameerzeeshan@gmail.com', 'cms', 'approved'),
  ('rabiarohail315@gmail.com', 'cms', 'approved')
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'cms'::public.app_role
FROM auth.users u
WHERE lower(u.email) IN ('shameerzeeshan@gmail.com', 'rabiarohail315@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

ALTER TABLE public.whitelist ENABLE TRIGGER enforce_super_admin_rules_trg;
ALTER TABLE public.user_roles ENABLE TRIGGER enforce_user_roles_privilege_rules_trg;
