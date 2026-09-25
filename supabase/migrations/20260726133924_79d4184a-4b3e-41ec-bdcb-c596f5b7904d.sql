-- enums
CREATE TYPE public.project_domain AS ENUM ('robotics','ai','space');
CREATE TYPE public.nav_location AS ENUM ('nav','footer');

-- programs
CREATE TABLE public.programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mod_code text NOT NULL,
  badge_label text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  "order" integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.programs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.programs TO authenticated;
GRANT ALL ON public.programs TO service_role;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "programs public read" ON public.programs FOR SELECT TO anon USING (visible = true);
CREATE POLICY "programs auth read" ON public.programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "programs admin write" ON public.programs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- projects
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  domain public.project_domain NOT NULL,
  age_range text NOT NULL DEFAULT '',
  media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  description text,
  description_confirmed boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  "order" integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projects public read" ON public.projects FOR SELECT TO anon USING (visible = true);
CREATE POLICY "projects auth read" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects admin write" ON public.projects FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- partners_schools
CREATE TABLE public.partners_schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  blurb text,
  logo_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  "order" integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.partners_schools TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners_schools TO authenticated;
GRANT ALL ON public.partners_schools TO service_role;
ALTER TABLE public.partners_schools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partners_schools public read" ON public.partners_schools FOR SELECT TO anon USING (visible = true);
CREATE POLICY "partners_schools auth read" ON public.partners_schools FOR SELECT TO authenticated USING (true);
CREATE POLICY "partners_schools admin write" ON public.partners_schools FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- testimonials
CREATE TABLE public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote text NOT NULL,
  attribution text,
  is_placeholder boolean NOT NULL DEFAULT false,
  visible boolean NOT NULL DEFAULT true,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.testimonials TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.testimonials TO authenticated;
GRANT ALL ON public.testimonials TO service_role;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "testimonials public read" ON public.testimonials FOR SELECT TO anon USING (visible = true);
CREATE POLICY "testimonials auth read" ON public.testimonials FOR SELECT TO authenticated USING (true);
CREATE POLICY "testimonials admin write" ON public.testimonials FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- faculty_claims
CREATE TABLE public.faculty_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_group text NOT NULL DEFAULT 'timeline',
  claim_key text NOT NULL,
  label text NOT NULL,
  value text NOT NULL,
  description text,
  is_placeholder boolean NOT NULL DEFAULT true,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (claim_group, claim_key)
);
GRANT SELECT ON public.faculty_claims TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faculty_claims TO authenticated;
GRANT ALL ON public.faculty_claims TO service_role;
ALTER TABLE public.faculty_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faculty_claims public read" ON public.faculty_claims FOR SELECT TO anon USING (true);
CREATE POLICY "faculty_claims auth read" ON public.faculty_claims FOR SELECT TO authenticated USING (true);
CREATE POLICY "faculty_claims admin write" ON public.faculty_claims FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- nav_items
CREATE TABLE public.nav_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  target text NOT NULL,
  location public.nav_location NOT NULL DEFAULT 'nav',
  footer_column text,
  "order" integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.nav_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nav_items TO authenticated;
GRANT ALL ON public.nav_items TO service_role;
ALTER TABLE public.nav_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nav_items public read" ON public.nav_items FOR SELECT TO anon USING (visible = true);
CREATE POLICY "nav_items auth read" ON public.nav_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "nav_items admin write" ON public.nav_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- hero_carousel
CREATE TABLE public.hero_carousel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid REFERENCES public.media(id) ON DELETE CASCADE,
  "order" integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hero_carousel TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hero_carousel TO authenticated;
GRANT ALL ON public.hero_carousel TO service_role;
ALTER TABLE public.hero_carousel ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hero_carousel public read" ON public.hero_carousel FOR SELECT TO anon USING (visible = true);
CREATE POLICY "hero_carousel auth read" ON public.hero_carousel FOR SELECT TO authenticated USING (true);
CREATE POLICY "hero_carousel admin write" ON public.hero_carousel FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- updated_at + audit triggers
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['programs','projects','partners_schools','testimonials','faculty_claims','nav_items','hero_carousel']
  LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()', 'touch_'||t, t);
    EXECUTE format('CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_site_content(%L)', 'audit_'||t, t, t);
  END LOOP;
END $$;