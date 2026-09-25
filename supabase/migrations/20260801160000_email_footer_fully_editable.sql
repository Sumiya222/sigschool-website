-- Makes every line of the confirmation-email footer genuinely CMS-editable.
-- Previously only the "notice" line was a free-text field — the contact
-- line ("For anything else, message us on WhatsApp..."), the address line,
-- and each template's "why you received this" attribution line were all
-- hardcoded sentence structure in theme.tsx/the template files, with only
-- isolated values (address, institutional_line) swappable via a different,
-- unrelated CMS panel. This closes that gap: every footer line now lives as
-- its own free-text field, independently editable and independently
-- removable (clearing a field drops that line entirely).
UPDATE public.page_sections
SET content = content || '{
  "contact_line": "For anything else, message us on WhatsApp or write to info@astrobotacademy.com.",
  "address_line": "AstroBot Academy · NICAT–NASTP Alpha, Rawalpindi · astrobotacademy.com",
  "legal_line": "Stellar Scholar Space Education Initiative · Stelalliance (SMC-Private) Ltd"
}'::jsonb
WHERE page_slug = 'emails' AND section_key = 'footer';

UPDATE public.page_sections
SET content = content || '{"footer_note": "You are receiving this because you sent an inquiry through our Contact page."}'::jsonb
WHERE page_slug = 'emails' AND section_key = 'parent_inquiry';

UPDATE public.page_sections
SET content = content || '{"footer_note": "You are receiving this because your school submitted a partnership inquiry."}'::jsonb
WHERE page_slug = 'emails' AND section_key = 'school_inquiry';

UPDATE public.page_sections
SET content = content || '{"footer_note": "You are receiving this because you sent a message through our Contact page."}'::jsonb
WHERE page_slug = 'emails' AND section_key = 'general_inquiry';

UPDATE public.page_sections
SET content = content || '{"footer_note": "You are receiving this because you applied through the AstroBot Academy careers page."}'::jsonb
WHERE page_slug = 'emails' AND section_key = 'job_application';

UPDATE public.page_sections
SET content = content || '{"footer_note": "You are receiving this because you registered a child for an AstroBot Academy camp."}'::jsonb
WHERE page_slug = 'emails' AND section_key = 'camp_registration';
