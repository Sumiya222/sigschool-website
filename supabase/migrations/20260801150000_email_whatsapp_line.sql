-- Adds the closing WhatsApp line to the CMS-editable email content — this
-- was promised during scoping but missed in the initial email-CMS build.
-- Kept as a single free-text field with an auto-linked "WhatsApp" (see
-- WhatsAppText in theme.tsx) rather than a token system, since these
-- sentences only ever need the one embedded link.
UPDATE public.page_sections
SET content = content || '{"whatsapp_line": "Prefer to talk it through instead? You''re welcome to reach our team directly on WhatsApp."}'::jsonb
WHERE page_slug = 'emails' AND section_key = 'parent_inquiry';

UPDATE public.page_sections
SET content = content || '{"whatsapp_line": "If your academic calendar has a fixed decision date, let us know on WhatsApp and we will work backwards from it."}'::jsonb
WHERE page_slug = 'emails' AND section_key = 'school_inquiry';

UPDATE public.page_sections
SET content = content || '{"whatsapp_line": "Any questions before the camp? Our team is just a WhatsApp message away."}'::jsonb
WHERE page_slug = 'emails' AND section_key = 'camp_registration';
