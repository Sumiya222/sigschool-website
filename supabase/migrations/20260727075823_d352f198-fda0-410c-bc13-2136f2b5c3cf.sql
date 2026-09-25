CREATE TYPE public.employment_type AS ENUM ('Full-time','Part-time','Contract','Internship');
CREATE TYPE public.job_status AS ENUM ('open','closed');
CREATE TYPE public.application_status AS ENUM ('new','reviewing','interviewed','rejected','hired');

CREATE TABLE public.job_openings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  department text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  employment_type public.employment_type NOT NULL DEFAULT 'Full-time',
  description text NOT NULL DEFAULT '',
  responsibilities text NOT NULL DEFAULT '',
  requirements text NOT NULL DEFAULT '',
  posted_at date NOT NULL DEFAULT (now()::date),
  closes_at date,
  status public.job_status NOT NULL DEFAULT 'open',
  "order" integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.job_openings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_openings TO authenticated;
GRANT ALL ON public.job_openings TO service_role;

ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read live job openings"
  ON public.job_openings FOR SELECT TO anon
  USING (visible = true AND status = 'open');

CREATE POLICY "Admins can read all job openings"
  ON public.job_openings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage job openings"
  ON public.job_openings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER job_openings_touch
  BEFORE UPDATE ON public.job_openings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER job_openings_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.job_openings
  FOR EACH ROW EXECUTE FUNCTION public.audit_site_content('job_opening');

CREATE TABLE public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_opening_id uuid REFERENCES public.job_openings(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  cv_storage_path text NOT NULL,
  cv_file_name text,
  cover_note text,
  linkedin_url text,
  status public.application_status NOT NULL DEFAULT 'new',
  notes text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX job_applications_created_idx ON public.job_applications (created_at DESC);

GRANT SELECT, UPDATE, DELETE ON public.job_applications TO authenticated;
GRANT ALL ON public.job_applications TO service_role;

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage job applications"
  ON public.job_applications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER job_applications_touch
  BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();