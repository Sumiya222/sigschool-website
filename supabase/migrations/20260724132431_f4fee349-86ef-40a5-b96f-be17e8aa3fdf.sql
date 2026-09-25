REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.verify_dashboard_access(public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_dashboard_access(public.app_role) TO authenticated;