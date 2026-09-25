DROP INDEX IF EXISTS public.whitelist_email_key;
ALTER TABLE public.whitelist DROP CONSTRAINT IF EXISTS whitelist_email_role_key;
DROP INDEX IF EXISTS public.whitelist_email_role_key;
CREATE UNIQUE INDEX IF NOT EXISTS whitelist_email_role_key
ON public.whitelist (lower(email), role);