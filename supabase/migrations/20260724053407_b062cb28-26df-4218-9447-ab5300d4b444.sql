
CREATE OR REPLACE FUNCTION public.admin_list_instructors()
RETURNS TABLE(email text, user_id uuid, whitelist_status whitelist_status)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    w.email,
    u.id AS user_id,
    w.status AS whitelist_status
  FROM public.whitelist w
  LEFT JOIN auth.users u ON lower(u.email) = lower(w.email)
  WHERE w.role = 'instructor'
    AND public.has_role(auth.uid(), 'admin')
  ORDER BY w.email;
$$;

REVOKE ALL ON FUNCTION public.admin_list_instructors() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_list_instructors() TO authenticated;
