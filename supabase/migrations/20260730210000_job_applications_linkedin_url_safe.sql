-- job_applications is RLS-gated to (authenticated + has_role(admin)) for all
-- commands, which is real write access, not just service-role. Confirmed
-- live: an authenticated admin session can insert directly via PostgREST,
-- bypassing the Zod .refine() in careers.server.ts entirely — both a
-- javascript: and a data: linkedin_url went through unblocked. Anon has no
-- matching RLS policy, so the public form's own credential is not
-- exploitable this way; the admin-role path is.
--
-- Verified against live data first: 0 existing rows fail this check.
ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_linkedin_url_safe
  CHECK (linkedin_url IS NULL OR public.is_safe_link_target(linkedin_url));
