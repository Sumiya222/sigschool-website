-- The Storage RLS policy for site-media grants any can_edit_site() account
-- direct INSERT, so the app's own upload validation (uploadSiteMedia server
-- function) can be bypassed entirely by a direct Storage API call. These
-- bucket-level settings are enforced by Supabase's storage engine on every
-- upload regardless of how it arrives — the only control that holds against
-- that bypass. allowed_mime_types checks the declared Content-Type (not a
-- content sniff), so it's a real but partial backstop: it stops an honestly-
-- declared SVG/HTML/etc., not a file that lies about its type. The real
-- content-sniffing enforcement lives in the app layer (uploadSiteMedia).
UPDATE storage.buckets
SET file_size_limit = 10485760, -- 10MB, matches the app-level cap
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'site-media';
