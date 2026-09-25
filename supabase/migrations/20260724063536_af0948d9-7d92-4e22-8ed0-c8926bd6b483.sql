
CREATE OR REPLACE FUNCTION public.verify_dashboard_access(_selected app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = _selected
  );
$$;

GRANT EXECUTE ON FUNCTION public.verify_dashboard_access(app_role) TO authenticated;
