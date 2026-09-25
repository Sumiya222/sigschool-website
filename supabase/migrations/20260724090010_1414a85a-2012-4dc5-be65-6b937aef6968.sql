
-- 1. Students soft-delete
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS students_section_active_idx ON public.students(section_id, is_active);

-- 2. Marks server-side validation (0 <= score <= max_score, NULL allowed)
ALTER TABLE public.marks DROP CONSTRAINT IF EXISTS marks_score_range_check;
ALTER TABLE public.marks
  ADD CONSTRAINT marks_score_range_check
  CHECK (score IS NULL OR (score >= 0 AND score <= max_score));

-- 3. Profiles table for greetings + admin display
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles self read" ON public.profiles;
DROP POLICY IF EXISTS "profiles self upsert" ON public.profiles;
DROP POLICY IF EXISTS "profiles self update" ON public.profiles;
DROP POLICY IF EXISTS "profiles admin all" ON public.profiles;

CREATE POLICY "profiles self read" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "profiles self upsert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "profiles self update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.profiles_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS profiles_touch_updated_at ON public.profiles;
CREATE TRIGGER profiles_touch_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_touch_updated_at();

-- 4. Extend admin_list_instructors to include full_name
DROP FUNCTION IF EXISTS public.admin_list_instructors();
CREATE OR REPLACE FUNCTION public.admin_list_instructors()
RETURNS TABLE(
  email text,
  user_id uuid,
  full_name text,
  whitelist_status whitelist_status,
  created_at timestamp with time zone,
  assignments_count integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    w.email,
    u.id AS user_id,
    p.full_name,
    w.status AS whitelist_status,
    w.created_at,
    COALESCE((SELECT count(*)::int FROM public.instructor_assignments ia WHERE ia.instructor_user_id = u.id), 0) AS assignments_count
  FROM public.whitelist w
  LEFT JOIN auth.users u ON lower(u.email) = lower(w.email)
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE w.role = 'instructor'
    AND public.has_role(auth.uid(), 'admin')
  ORDER BY w.email;
$$;
