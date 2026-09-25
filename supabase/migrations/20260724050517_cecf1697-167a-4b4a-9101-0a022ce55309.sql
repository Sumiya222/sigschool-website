
-- ==========================================================
-- Dashboard schema: roles, whitelist, schools, sections,
-- instructor assignments, students, terms, sessions,
-- attendance, marks, remarks, result_cards view, RLS.
-- ==========================================================

-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'school', 'instructor');
CREATE TYPE public.whitelist_status AS ENUM ('pending', 'approved', 'revoked');
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late');

-- Schools
CREATE TABLE public.schools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schools TO authenticated;
GRANT ALL ON public.schools TO service_role;
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;

-- Whitelist (case-insensitive email uniqueness)
CREATE TABLE public.whitelist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role public.app_role NOT NULL,
  status public.whitelist_status NOT NULL DEFAULT 'approved',
  assigned_school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX whitelist_email_key ON public.whitelist (lower(email));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whitelist TO authenticated;
GRANT ALL ON public.whitelist TO service_role;
ALTER TABLE public.whitelist ENABLE ROW LEVEL SECURITY;

-- User roles (separate table — never store role on profile)
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Sections
CREATE TABLE public.sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  grade INTEGER NOT NULL CHECK (grade BETWEEN 1 AND 8),
  section_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, grade, section_name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sections TO authenticated;
GRANT ALL ON public.sections TO service_role;
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

-- Instructor assignments
CREATE TABLE public.instructor_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  instructor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (instructor_user_id, section_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instructor_assignments TO authenticated;
GRANT ALL ON public.instructor_assignments TO service_role;
ALTER TABLE public.instructor_assignments ENABLE ROW LEVEL SECURITY;

-- Students
CREATE TABLE public.students (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  roll_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Terms
CREATE TABLE public.terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.terms TO authenticated;
GRANT ALL ON public.terms TO service_role;
ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;

-- Class sessions
CREATE TABLE public.class_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  instructor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE RESTRICT,
  session_date DATE NOT NULL,
  week_number INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_sessions TO authenticated;
GRANT ALL ON public.class_sessions TO service_role;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;

-- Attendance
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status public.attendance_status NOT NULL,
  UNIQUE (session_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Marks
CREATE TABLE public.marks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL,
  max_score NUMERIC NOT NULL CHECK (max_score > 0)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marks TO authenticated;
GRANT ALL ON public.marks TO service_role;
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

-- Remarks
CREATE TABLE public.remarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  remark_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.remarks TO authenticated;
GRANT ALL ON public.remarks TO service_role;
ALTER TABLE public.remarks ENABLE ROW LEVEL SECURITY;

-- =========================
-- Security definer helpers
-- =========================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_user_school_id()
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT school_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'school' LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_assigned_to_section(_section_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.instructor_assignments
    WHERE instructor_user_id = auth.uid() AND section_id = _section_id
  );
$$;

-- Given a session id, returns the section's school (used by SCHOOL RLS through joins)
CREATE OR REPLACE FUNCTION public.section_school_id(_section_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT school_id FROM public.sections WHERE id = _section_id;
$$;

CREATE OR REPLACE FUNCTION public.session_section_id(_session_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT section_id FROM public.class_sessions WHERE id = _session_id;
$$;

-- =========================
-- Signup: whitelist check RPC (callable by anon before signup)
-- =========================
CREATE OR REPLACE FUNCTION public.check_whitelist(_email TEXT)
RETURNS TABLE (approved BOOLEAN, role public.app_role)
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (w.status = 'approved') AS approved,
    w.role
  FROM public.whitelist w
  WHERE lower(w.email) = lower(_email)
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.check_whitelist(TEXT) TO anon, authenticated;

-- =========================
-- Auto-provision user_roles from whitelist on signup
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  wl RECORD;
BEGIN
  SELECT role, assigned_school_id, status INTO wl
  FROM public.whitelist
  WHERE lower(email) = lower(NEW.email)
  LIMIT 1;

  IF wl IS NULL OR wl.status <> 'approved' THEN
    -- No whitelist row or not approved → reject signup
    RAISE EXCEPTION 'This email has not been approved for dashboard access. Contact your administrator.';
  END IF;

  INSERT INTO public.user_roles (user_id, role, school_id)
  VALUES (NEW.id, wl.role, wl.assigned_school_id)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- RLS POLICIES
-- =========================

-- SCHOOLS
CREATE POLICY "schools admin all" ON public.schools FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "schools school read own" ON public.schools FOR SELECT TO authenticated
  USING (id = public.current_user_school_id());
CREATE POLICY "schools instructor read assigned" ON public.schools FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.instructor_assignments ia
    JOIN public.sections s ON s.id = ia.section_id
    WHERE ia.instructor_user_id = auth.uid() AND s.school_id = schools.id
  ));

-- WHITELIST — admin only
CREATE POLICY "whitelist admin all" ON public.whitelist FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- USER_ROLES — read own; admin can read/write all
CREATE POLICY "user_roles read own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles admin write" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles admin update" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user_roles admin delete" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- SECTIONS
CREATE POLICY "sections admin all" ON public.sections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sections school read own" ON public.sections FOR SELECT TO authenticated
  USING (school_id = public.current_user_school_id());
CREATE POLICY "sections instructor read assigned" ON public.sections FOR SELECT TO authenticated
  USING (public.is_assigned_to_section(id));

-- INSTRUCTOR_ASSIGNMENTS
CREATE POLICY "ia admin all" ON public.instructor_assignments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ia read own" ON public.instructor_assignments FOR SELECT TO authenticated
  USING (instructor_user_id = auth.uid());

-- STUDENTS
CREATE POLICY "students admin all" ON public.students FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "students instructor rw assigned" ON public.students FOR ALL TO authenticated
  USING (public.is_assigned_to_section(section_id))
  WITH CHECK (public.is_assigned_to_section(section_id));
CREATE POLICY "students school read own" ON public.students FOR SELECT TO authenticated
  USING (public.section_school_id(section_id) = public.current_user_school_id());

-- TERMS — admin write, everyone authenticated reads
CREATE POLICY "terms admin all" ON public.terms FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "terms read all" ON public.terms FOR SELECT TO authenticated USING (true);

-- CLASS_SESSIONS
CREATE POLICY "cs admin all" ON public.class_sessions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "cs instructor rw assigned" ON public.class_sessions FOR ALL TO authenticated
  USING (public.is_assigned_to_section(section_id))
  WITH CHECK (public.is_assigned_to_section(section_id) AND instructor_user_id = auth.uid());
CREATE POLICY "cs school read own" ON public.class_sessions FOR SELECT TO authenticated
  USING (public.section_school_id(section_id) = public.current_user_school_id());

-- ATTENDANCE
CREATE POLICY "att admin all" ON public.attendance FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "att instructor rw assigned" ON public.attendance FOR ALL TO authenticated
  USING (public.is_assigned_to_section(public.session_section_id(session_id)))
  WITH CHECK (public.is_assigned_to_section(public.session_section_id(session_id)));
CREATE POLICY "att school read own" ON public.attendance FOR SELECT TO authenticated
  USING (public.section_school_id(public.session_section_id(session_id)) = public.current_user_school_id());

-- MARKS
CREATE POLICY "marks admin all" ON public.marks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "marks instructor rw assigned" ON public.marks FOR ALL TO authenticated
  USING (public.is_assigned_to_section(public.session_section_id(session_id)))
  WITH CHECK (public.is_assigned_to_section(public.session_section_id(session_id)));
CREATE POLICY "marks school read own" ON public.marks FOR SELECT TO authenticated
  USING (public.section_school_id(public.session_section_id(session_id)) = public.current_user_school_id());

-- REMARKS
CREATE POLICY "rem admin all" ON public.remarks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "rem instructor rw assigned" ON public.remarks FOR ALL TO authenticated
  USING (public.is_assigned_to_section(public.session_section_id(session_id)))
  WITH CHECK (public.is_assigned_to_section(public.session_section_id(session_id)));
CREATE POLICY "rem school read own" ON public.remarks FOR SELECT TO authenticated
  USING (public.section_school_id(public.session_section_id(session_id)) = public.current_user_school_id());

-- =========================
-- RESULT CARDS VIEW (live aggregate; inherits caller's RLS via underlying tables)
-- =========================
CREATE OR REPLACE VIEW public.result_cards
WITH (security_invoker = true)
AS
SELECT
  s.id AS student_id,
  s.full_name,
  s.section_id,
  t.id AS term_id,
  t.name AS term_name,
  COALESCE(AVG(m.score / NULLIF(m.max_score, 0)) * 100, 0)::NUMERIC(6,2) AS average_percent,
  COUNT(DISTINCT cs.id) FILTER (WHERE a.status = 'present')::INTEGER AS present_count,
  COUNT(DISTINCT cs.id)::INTEGER AS total_sessions,
  CASE WHEN COUNT(DISTINCT cs.id) = 0 THEN 0
       ELSE (COUNT(DISTINCT cs.id) FILTER (WHERE a.status = 'present')::NUMERIC
             / COUNT(DISTINCT cs.id) * 100)::NUMERIC(6,2)
  END AS attendance_percent,
  COALESCE(
    (SELECT string_agg(r.remark_text, E'\n' ORDER BY r.created_at)
     FROM public.remarks r
     JOIN public.class_sessions cs2 ON cs2.id = r.session_id
     WHERE r.student_id = s.id AND cs2.term_id = t.id AND r.remark_text IS NOT NULL),
    ''
  ) AS remarks_concatenated
FROM public.students s
CROSS JOIN public.terms t
LEFT JOIN public.class_sessions cs ON cs.section_id = s.section_id AND cs.term_id = t.id
LEFT JOIN public.attendance a ON a.session_id = cs.id AND a.student_id = s.id
LEFT JOIN public.marks m ON m.session_id = cs.id AND m.student_id = s.id
GROUP BY s.id, s.full_name, s.section_id, t.id, t.name;

GRANT SELECT ON public.result_cards TO authenticated;
