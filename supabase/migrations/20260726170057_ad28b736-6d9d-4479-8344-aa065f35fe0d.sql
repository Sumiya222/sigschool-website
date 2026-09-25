CREATE TYPE public.affiliation_scope AS ENUM ('national','international');

CREATE TABLE public.affiliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  scope public.affiliation_scope NOT NULL DEFAULT 'national',
  note text,
  logo_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  "order" integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.affiliations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliations TO authenticated;
GRANT ALL ON public.affiliations TO service_role;
ALTER TABLE public.affiliations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "affiliations public read" ON public.affiliations FOR SELECT TO anon USING (true);
CREATE POLICY "affiliations auth read" ON public.affiliations FOR SELECT TO authenticated USING (true);
CREATE POLICY "affiliations admin write" ON public.affiliations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER affiliations_touch BEFORE UPDATE ON public.affiliations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER affiliations_audit AFTER INSERT OR UPDATE OR DELETE ON public.affiliations
  FOR EACH ROW EXECUTE FUNCTION public.audit_site_content('affiliation');

CREATE TABLE public.leadership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  title text NOT NULL DEFAULT '',
  bio text,
  bio_confirmed boolean NOT NULL DEFAULT false,
  media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  "order" integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.leadership TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leadership TO authenticated;
GRANT ALL ON public.leadership TO service_role;
ALTER TABLE public.leadership ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leadership public read" ON public.leadership FOR SELECT TO anon USING (true);
CREATE POLICY "leadership auth read" ON public.leadership FOR SELECT TO authenticated USING (true);
CREATE POLICY "leadership admin write" ON public.leadership FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER leadership_touch BEFORE UPDATE ON public.leadership
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER leadership_audit AFTER INSERT OR UPDATE OR DELETE ON public.leadership
  FOR EACH ROW EXECUTE FUNCTION public.audit_site_content('leadership');