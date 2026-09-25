-- Camp window extensions
DO $$ BEGIN
  CREATE TYPE public.registration_mode AS ENUM ('built_in', 'external', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.registration_status AS ENUM ('new', 'confirmed', 'waitlisted', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.registration_field_type AS ENUM ('text', 'textarea', 'number', 'dropdown', 'checkbox', 'radio', 'date');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.camp_window
  ADD COLUMN IF NOT EXISTS registration_mode public.registration_mode NOT NULL DEFAULT 'built_in',
  ADD COLUMN IF NOT EXISTS capacity integer;

ALTER TABLE public.camp_window
  ADD CONSTRAINT camp_window_capacity_positive CHECK (capacity IS NULL OR capacity > 0);

-- Registration form field definitions
CREATE TABLE public.registration_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  field_type public.registration_field_type NOT NULL DEFAULT 'text',
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  required boolean NOT NULL DEFAULT false,
  help_text text,
  "order" integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.registration_fields TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registration_fields TO authenticated;
GRANT ALL ON public.registration_fields TO service_role;

ALTER TABLE public.registration_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active fields are publicly readable"
  ON public.registration_fields FOR SELECT TO anon, authenticated
  USING (active = true OR public.can_edit_site());

CREATE POLICY "Site editors manage registration fields"
  ON public.registration_fields FOR ALL TO authenticated
  USING (public.can_edit_site()) WITH CHECK (public.can_edit_site());

CREATE TRIGGER registration_fields_touch
  BEFORE UPDATE ON public.registration_fields
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER audit_registration_fields
  AFTER INSERT OR UPDATE OR DELETE ON public.registration_fields
  FOR EACH ROW EXECUTE FUNCTION public.audit_site_content('registration_field');

-- Registrations (children's personal data — admin only, never CMS)
CREATE TABLE public.registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_name text NOT NULL,
  student_first_name text NOT NULL,
  student_last_name text NOT NULL,
  student_age integer NOT NULL,
  age_track text NOT NULL,
  student_school text,
  parent_name text NOT NULL,
  parent_email text NOT NULL,
  parent_phone text NOT NULL,
  medical_notes text,
  consent_media boolean NOT NULL DEFAULT false,
  custom_answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  status public.registration_status NOT NULL DEFAULT 'new',
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX registrations_created_at_idx ON public.registrations (created_at DESC);

-- No anon grant: visitors never touch this table directly, the server writes it.
GRANT SELECT, UPDATE ON public.registrations TO authenticated;
GRANT ALL ON public.registrations TO service_role;

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read registrations"
  ON public.registrations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update registrations"
  ON public.registrations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER registrations_touch
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
