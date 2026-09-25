-- CMS-editable sender identity for outgoing confirmation emails (Resend
-- "From" header). Deliberately separate from email_contact_address: this
-- one is conventionally a no-reply address, while email_contact_address is
-- the real, monitored mailbox shown in the footer for replies.
INSERT INTO public.site_settings (key, value)
VALUES ('email_from_address', '"noreply@astrobotacademy.com"'::jsonb)
ON CONFLICT (key) DO NOTHING;
