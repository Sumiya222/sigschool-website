
-- Rewrite RLS policies on students/attendance/marks/remarks/sections to use
-- (SELECT ...) initPlan wrappers. This lets Postgres evaluate the per-user
-- gate (whitelist approval / school active / admin role) ONCE per statement
-- and short-circuit before invoking per-row helpers on 14K+ rows.

-- students
DROP POLICY IF EXISTS "students admin all" ON public.students;
DROP POLICY IF EXISTS "students instructor rw assigned" ON public.students;
DROP POLICY IF EXISTS "students school read own" ON public.students;

CREATE POLICY "students admin all" ON public.students
  FOR ALL TO authenticated
  USING ((SELECT public.has_role(auth.uid(), 'admin'::public.app_role)))
  WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "students instructor rw assigned" ON public.students
  FOR ALL TO authenticated
  USING ((SELECT public.is_whitelist_approved(auth.uid())) AND public.is_assigned_to_section(section_id))
  WITH CHECK ((SELECT public.is_whitelist_approved(auth.uid())) AND public.is_assigned_to_section(section_id));

CREATE POLICY "students school read own" ON public.students
  FOR SELECT TO authenticated
  USING (
    (SELECT public.current_user_school_id()) IS NOT NULL
    AND public.section_school_id(section_id) = (SELECT public.current_user_school_id())
  );

-- attendance
DROP POLICY IF EXISTS "att admin all" ON public.attendance;
DROP POLICY IF EXISTS "att instructor rw assigned" ON public.attendance;
DROP POLICY IF EXISTS "att school read own" ON public.attendance;

CREATE POLICY "att admin all" ON public.attendance
  FOR ALL TO authenticated
  USING ((SELECT public.has_role(auth.uid(), 'admin'::public.app_role)))
  WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "att instructor rw assigned" ON public.attendance
  FOR ALL TO authenticated
  USING ((SELECT public.is_whitelist_approved(auth.uid())) AND public.is_assigned_to_section(public.session_section_id(session_id)))
  WITH CHECK ((SELECT public.is_whitelist_approved(auth.uid())) AND public.is_assigned_to_section(public.session_section_id(session_id)));

CREATE POLICY "att school read own" ON public.attendance
  FOR SELECT TO authenticated
  USING (
    (SELECT public.current_user_school_id()) IS NOT NULL
    AND public.section_school_id(public.session_section_id(session_id)) = (SELECT public.current_user_school_id())
  );

-- marks
DROP POLICY IF EXISTS "marks admin all" ON public.marks;
DROP POLICY IF EXISTS "marks instructor rw assigned" ON public.marks;
DROP POLICY IF EXISTS "marks school read own" ON public.marks;

CREATE POLICY "marks admin all" ON public.marks
  FOR ALL TO authenticated
  USING ((SELECT public.has_role(auth.uid(), 'admin'::public.app_role)))
  WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "marks instructor rw assigned" ON public.marks
  FOR ALL TO authenticated
  USING ((SELECT public.is_whitelist_approved(auth.uid())) AND public.is_assigned_to_section(public.session_section_id(session_id)))
  WITH CHECK ((SELECT public.is_whitelist_approved(auth.uid())) AND public.is_assigned_to_section(public.session_section_id(session_id)));

CREATE POLICY "marks school read own" ON public.marks
  FOR SELECT TO authenticated
  USING (
    (SELECT public.current_user_school_id()) IS NOT NULL
    AND public.section_school_id(public.session_section_id(session_id)) = (SELECT public.current_user_school_id())
  );

-- remarks
DROP POLICY IF EXISTS "rem admin all" ON public.remarks;
DROP POLICY IF EXISTS "rem instructor rw assigned" ON public.remarks;
DROP POLICY IF EXISTS "rem school read own" ON public.remarks;

CREATE POLICY "rem admin all" ON public.remarks
  FOR ALL TO authenticated
  USING ((SELECT public.has_role(auth.uid(), 'admin'::public.app_role)))
  WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "rem instructor rw assigned" ON public.remarks
  FOR ALL TO authenticated
  USING ((SELECT public.is_whitelist_approved(auth.uid())) AND public.is_assigned_to_section(public.session_section_id(session_id)))
  WITH CHECK ((SELECT public.is_whitelist_approved(auth.uid())) AND public.is_assigned_to_section(public.session_section_id(session_id)));

CREATE POLICY "rem school read own" ON public.remarks
  FOR SELECT TO authenticated
  USING (
    (SELECT public.current_user_school_id()) IS NOT NULL
    AND public.section_school_id(public.session_section_id(session_id)) = (SELECT public.current_user_school_id())
  );

-- sections
DROP POLICY IF EXISTS "sections admin all" ON public.sections;
DROP POLICY IF EXISTS "sections instructor read assigned" ON public.sections;
DROP POLICY IF EXISTS "sections school read own" ON public.sections;

CREATE POLICY "sections admin all" ON public.sections
  FOR ALL TO authenticated
  USING ((SELECT public.has_role(auth.uid(), 'admin'::public.app_role)))
  WITH CHECK ((SELECT public.has_role(auth.uid(), 'admin'::public.app_role)));

CREATE POLICY "sections instructor read assigned" ON public.sections
  FOR SELECT TO authenticated
  USING ((SELECT public.is_whitelist_approved(auth.uid())) AND public.is_assigned_to_section(id));

CREATE POLICY "sections school read own" ON public.sections
  FOR SELECT TO authenticated
  USING (
    (SELECT public.current_user_school_id()) IS NOT NULL
    AND school_id = (SELECT public.current_user_school_id())
  );
