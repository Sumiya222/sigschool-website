CREATE TABLE public.featured_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  age integer,
  school text NOT NULL DEFAULT '',
  grade text,
  photo_media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  achievement text NOT NULL DEFAULT '',
  quote text,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  "order" integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT false,
  consent_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.featured_students TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.featured_students TO authenticated;
GRANT ALL ON public.featured_students TO service_role;

ALTER TABLE public.featured_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read consented, visible students"
  ON public.featured_students FOR SELECT
  TO anon, authenticated
  USING (visible = true AND consent_confirmed = true);

CREATE POLICY "Admins can read all featured students"
  ON public.featured_students FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage featured students"
  ON public.featured_students FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER featured_students_touch_updated_at
  BEFORE UPDATE ON public.featured_students
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER featured_students_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.featured_students
  FOR EACH ROW EXECUTE FUNCTION public.audit_site_content('featured_student');