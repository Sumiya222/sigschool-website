-- ============ SITE CONTROL PANEL SCHEMA ============
-- NOTE: no pricing/rate/currency columns anywhere by design.

CREATE TYPE public.section_mode AS ENUM ('rich_text', 'list', 'cards', 'gallery', 'custom');

CREATE TABLE public.site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_settings public read" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "site_settings admin write" ON public.site_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.site_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  value text NOT NULL DEFAULT '',
  suffix text,
  is_placeholder boolean NOT NULL DEFAULT true,
  "order" integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_stats TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_stats TO authenticated;
GRANT ALL ON public.site_stats TO service_role;
ALTER TABLE public.site_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_stats public read" ON public.site_stats FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "site_stats admin write" ON public.site_stats FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  seo_title text,
  seo_description text,
  published boolean NOT NULL DEFAULT false,
  "order" integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pages TO authenticated;
GRANT ALL ON public.pages TO service_role;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pages public read published" ON public.pages FOR SELECT TO anon USING (published = true);
CREATE POLICY "pages auth read" ON public.pages FOR SELECT TO authenticated USING (true);
CREATE POLICY "pages admin write" ON public.pages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug text NOT NULL REFERENCES public.pages(slug) ON UPDATE CASCADE ON DELETE CASCADE,
  section_key text NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  mode public.section_mode NOT NULL DEFAULT 'rich_text',
  visible boolean NOT NULL DEFAULT true,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (page_slug, section_key)
);
CREATE INDEX page_sections_page_order_idx ON public.page_sections(page_slug, "order");
GRANT SELECT ON public.page_sections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_sections TO authenticated;
GRANT ALL ON public.page_sections TO service_role;
ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "page_sections public read" ON public.page_sections FOR SELECT TO anon
  USING (visible = true AND EXISTS (SELECT 1 FROM public.pages p WHERE p.slug = page_slug AND p.published));
CREATE POLICY "page_sections auth read" ON public.page_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "page_sections admin write" ON public.page_sections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL UNIQUE,
  alt_text text NOT NULL CHECK (length(btrim(alt_text)) > 0),
  tag text,
  width integer,
  height integer,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX media_tag_idx ON public.media(tag);
GRANT SELECT ON public.media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media TO authenticated;
GRANT ALL ON public.media TO service_role;
ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media public read" ON public.media FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "media admin write" ON public.media FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER site_settings_touch BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER site_stats_touch BEFORE UPDATE ON public.site_stats FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER pages_touch BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER page_sections_touch BEFORE UPDATE ON public.page_sections FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.prevent_media_delete_in_use()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.page_sections s WHERE s.content::text LIKE '%' || OLD.storage_path || '%')
     OR EXISTS (SELECT 1 FROM public.site_settings st WHERE st.value::text LIKE '%' || OLD.storage_path || '%') THEN
    RAISE EXCEPTION 'This image is in use on the site and cannot be deleted.';
  END IF;
  RETURN OLD;
END; $$;
CREATE TRIGGER media_prevent_delete_in_use BEFORE DELETE ON public.media FOR EACH ROW EXECUTE FUNCTION public.prevent_media_delete_in_use();

CREATE OR REPLACE FUNCTION public.audit_site_content()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE act text; tgt text; det jsonb; ttype text; rowj jsonb;
BEGIN
  ttype := TG_ARGV[0];
  IF TG_OP = 'INSERT' THEN act := ttype || '_created'; rowj := to_jsonb(NEW); det := rowj;
  ELSIF TG_OP = 'UPDATE' THEN act := ttype || '_updated'; rowj := to_jsonb(NEW); det := jsonb_build_object('before', to_jsonb(OLD), 'after', rowj);
  ELSE act := ttype || '_deleted'; rowj := to_jsonb(OLD); det := rowj;
  END IF;

  tgt := COALESCE(rowj ->> 'id', rowj ->> 'key');

  INSERT INTO public.audit_log(actor_user_id, action_type, target_type, target_id, details)
  VALUES (auth.uid(), act, ttype, tgt, det);

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END; $$;

CREATE TRIGGER audit_site_settings_trg AFTER INSERT OR UPDATE OR DELETE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_site_content('site_setting');
CREATE TRIGGER audit_site_stats_trg AFTER INSERT OR UPDATE OR DELETE ON public.site_stats
  FOR EACH ROW EXECUTE FUNCTION public.audit_site_content('site_stat');
CREATE TRIGGER audit_pages_trg AFTER INSERT OR UPDATE OR DELETE ON public.pages
  FOR EACH ROW EXECUTE FUNCTION public.audit_site_content('page');
CREATE TRIGGER audit_page_sections_trg AFTER INSERT OR UPDATE OR DELETE ON public.page_sections
  FOR EACH ROW EXECUTE FUNCTION public.audit_site_content('page_section');
CREATE TRIGGER audit_media_trg AFTER INSERT OR UPDATE OR DELETE ON public.media
  FOR EACH ROW EXECUTE FUNCTION public.audit_site_content('media');

INSERT INTO public.site_settings(key, value) VALUES
  ('contact_email', '"hello@astrobot.academy"'::jsonb),
  ('whatsapp', '"+92 300 0000000"'::jsonb),
  ('phone', '"+92 21 0000000"'::jsonb),
  ('address', '"Karachi, Pakistan"'::jsonb),
  ('social_instagram', '""'::jsonb),
  ('social_linkedin', '""'::jsonb),
  ('site_tagline', '"Robotics & AI education for schools"'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.site_stats(key, label, value, suffix, is_placeholder, "order") VALUES
  ('students_engaged', 'Students engaged', '1000', '+', true, 1),
  ('learning_tracks', 'Learning tracks', '6', '', true, 2),
  ('partner_schools', 'Partner schools', '12', '+', true, 3),
  ('workshop_hours', 'Workshop hours delivered', '500', '+', true, 4)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.pages(slug, title, seo_title, seo_description, published, "order") VALUES
  ('home', 'Home', 'AstroBot Academy — Robotics & AI for Schools', 'Hands-on robotics and AI programs that bring STEM to life in classrooms.', true, 1),
  ('about', 'About', 'About AstroBot Academy', 'Who we are and why we teach robotics and AI to young learners.', true, 2),
  ('programs', 'Programs', 'Programs — AstroBot Academy', 'Explore our robotics, coding, and AI learning tracks for grades 1-8.', true, 3),
  ('contact', 'Contact', 'Contact AstroBot Academy', 'Get in touch to bring AstroBot Academy to your school.', true, 4)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.page_sections(page_slug, section_key, "order", mode, visible, content) VALUES
  ('home', 'hero', 1, 'rich_text', true, '{"heading":"Mission Control for Young Innovators","subheading":"Robotics and AI programs built for classrooms.","cta_label":"Explore programs","cta_href":"/programs"}'::jsonb),
  ('home', 'stats', 2, 'list', true, '{"heading":"By the numbers"}'::jsonb),
  ('home', 'programs_preview', 3, 'cards', true, '{"heading":"Learning tracks","items":[]}'::jsonb),
  ('about', 'intro', 1, 'rich_text', true, '{"heading":"About AstroBot Academy","body":"We bring hands-on robotics and AI education to schools."}'::jsonb),
  ('programs', 'tracks', 1, 'cards', true, '{"heading":"Our tracks","items":[]}'::jsonb),
  ('contact', 'details', 1, 'rich_text', true, '{"heading":"Talk to us","body":"Reach out and we will get back within two working days."}'::jsonb)
ON CONFLICT (page_slug, section_key) DO NOTHING;

DROP FUNCTION IF EXISTS public._restore_exec(text);