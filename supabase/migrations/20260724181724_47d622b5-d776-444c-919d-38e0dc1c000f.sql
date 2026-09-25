
-- Add (SELECT has_role(uid,'instructor')) initPlan gate to instructor policies
-- so non-instructor users (e.g. school role) short-circuit before per-row lookup.

DROP POLICY IF EXISTS "students instructor rw assigned" ON public.students;
CREATE POLICY "students instructor rw assigned" ON public.students
  FOR ALL TO authenticated
  USING (
    (SELECT public.has_role(auth.uid(), 'instructor'::public.app_role))
    AND (SELECT public.is_whitelist_approved(auth.uid()))
    AND public.is_assigned_to_section(section_id)
  )
  WITH CHECK (
    (SELECT public.has_role(auth.uid(), 'instructor'::public.app_role))
    AND (SELECT public.is_whitelist_approved(auth.uid()))
    AND public.is_assigned_to_section(section_id)
  );

DROP POLICY IF EXISTS "att instructor rw assigned" ON public.attendance;
CREATE POLICY "att instructor rw assigned" ON public.attendance
  FOR ALL TO authenticated
  USING (
    (SELECT public.has_role(auth.uid(), 'instructor'::public.app_role))
    AND (SELECT public.is_whitelist_approved(auth.uid()))
    AND public.is_assigned_to_section(public.session_section_id(session_id))
  )
  WITH CHECK (
    (SELECT public.has_role(auth.uid(), 'instructor'::public.app_role))
    AND (SELECT public.is_whitelist_approved(auth.uid()))
    AND public.is_assigned_to_section(public.session_section_id(session_id))
  );

DROP POLICY IF EXISTS "marks instructor rw assigned" ON public.marks;
CREATE POLICY "marks instructor rw assigned" ON public.marks
  FOR ALL TO authenticated
  USING (
    (SELECT public.has_role(auth.uid(), 'instructor'::public.app_role))
    AND (SELECT public.is_whitelist_approved(auth.uid()))
    AND public.is_assigned_to_section(public.session_section_id(session_id))
  )
  WITH CHECK (
    (SELECT public.has_role(auth.uid(), 'instructor'::public.app_role))
    AND (SELECT public.is_whitelist_approved(auth.uid()))
    AND public.is_assigned_to_section(public.session_section_id(session_id))
  );

DROP POLICY IF EXISTS "rem instructor rw assigned" ON public.remarks;
CREATE POLICY "rem instructor rw assigned" ON public.remarks
  FOR ALL TO authenticated
  USING (
    (SELECT public.has_role(auth.uid(), 'instructor'::public.app_role))
    AND (SELECT public.is_whitelist_approved(auth.uid()))
    AND public.is_assigned_to_section(public.session_section_id(session_id))
  )
  WITH CHECK (
    (SELECT public.has_role(auth.uid(), 'instructor'::public.app_role))
    AND (SELECT public.is_whitelist_approved(auth.uid()))
    AND public.is_assigned_to_section(public.session_section_id(session_id))
  );

DROP POLICY IF EXISTS "sections instructor read assigned" ON public.sections;
CREATE POLICY "sections instructor read assigned" ON public.sections
  FOR SELECT TO authenticated
  USING (
    (SELECT public.has_role(auth.uid(), 'instructor'::public.app_role))
    AND (SELECT public.is_whitelist_approved(auth.uid()))
    AND public.is_assigned_to_section(id)
  );
