GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_assigned_to_section(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.section_school_id(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.session_section_id(uuid) TO authenticated;

-- Ensure users can always read their own role row (needed for login/role routing)
DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
CREATE POLICY "Users can read own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());