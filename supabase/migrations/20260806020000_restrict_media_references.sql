-- The existing "media in use" trigger (prevent_media_delete_in_use) only
-- checks whether a media's storage_path string appears in page_sections
-- content or site_settings values. It doesn't know about these 7 other
-- tables that also reference media -- deleting a media row currently used
-- as a homepage hero-carousel slide silently cascade-deletes that slide
-- (hero_carousel is CASCADE); deleting one used as a partner logo, staff
-- photo, gallery image, etc. silently nulls out the reference with no
-- warning (the other 6 are SET NULL).
--
-- Fixing this via FK RESTRICT rather than extending the trigger: a trigger
-- has to be remembered every time a new table starts referencing media --
-- it can silently drift out of sync, which is exactly how this gap
-- happened. An FK constraint can't drift; it's automatic by construction.
-- Diagnostic check before applying: 28 media rows exist, 23 of the 7
-- tables' references are currently non-null (6 hero_carousel, 4
-- partners_schools, 11 leadership, 1 gallery_images, 1 featured_students;
-- 0 in projects/affiliations right now) -- all genuinely in active use,
-- nothing anomalous.
ALTER TABLE public.hero_carousel
  DROP CONSTRAINT hero_carousel_media_id_fkey,
  ADD CONSTRAINT hero_carousel_media_id_fkey
    FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE RESTRICT;

ALTER TABLE public.projects
  DROP CONSTRAINT projects_media_id_fkey,
  ADD CONSTRAINT projects_media_id_fkey
    FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE RESTRICT;

ALTER TABLE public.partners_schools
  DROP CONSTRAINT partners_schools_logo_media_id_fkey,
  ADD CONSTRAINT partners_schools_logo_media_id_fkey
    FOREIGN KEY (logo_media_id) REFERENCES public.media(id) ON DELETE RESTRICT;

ALTER TABLE public.affiliations
  DROP CONSTRAINT affiliations_logo_media_id_fkey,
  ADD CONSTRAINT affiliations_logo_media_id_fkey
    FOREIGN KEY (logo_media_id) REFERENCES public.media(id) ON DELETE RESTRICT;

ALTER TABLE public.leadership
  DROP CONSTRAINT leadership_media_id_fkey,
  ADD CONSTRAINT leadership_media_id_fkey
    FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE RESTRICT;

ALTER TABLE public.gallery_images
  DROP CONSTRAINT gallery_images_media_id_fkey,
  ADD CONSTRAINT gallery_images_media_id_fkey
    FOREIGN KEY (media_id) REFERENCES public.media(id) ON DELETE RESTRICT;

ALTER TABLE public.featured_students
  DROP CONSTRAINT featured_students_photo_media_id_fkey,
  ADD CONSTRAINT featured_students_photo_media_id_fkey
    FOREIGN KEY (photo_media_id) REFERENCES public.media(id) ON DELETE RESTRICT;
