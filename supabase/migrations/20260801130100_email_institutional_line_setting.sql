-- `institutional_line` was already declared as an editable setting in the
-- CMS schema (cms-schema.ts) but never actually seeded as a row, so it never
-- appeared in the Contact Details admin panel. The new email footer reuses
-- it (rather than a separate email-only field, since there's no reason for
-- the legal/affiliation line to differ between the website and emails), so
-- it needs to actually exist for admins to edit it.
INSERT INTO public.site_settings (key, value)
VALUES (
  'institutional_line',
  '"Stellar Scholar Space Education Initiative · Stelalliance (SMC-Private) Ltd"'::jsonb
)
ON CONFLICT (key) DO NOTHING;
