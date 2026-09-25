
DROP FUNCTION IF EXISTS public.admin_list_instructors();

CREATE OR REPLACE FUNCTION public.admin_list_instructors()
 RETURNS TABLE(email text, user_id uuid, whitelist_status whitelist_status, created_at timestamptz, assignments_count int)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    w.email,
    u.id AS user_id,
    w.status AS whitelist_status,
    w.created_at,
    COALESCE((SELECT count(*)::int FROM public.instructor_assignments ia WHERE ia.instructor_user_id = u.id), 0) AS assignments_count
  FROM public.whitelist w
  LEFT JOIN auth.users u ON lower(u.email) = lower(w.email)
  WHERE w.role = 'instructor'
    AND public.has_role(auth.uid(), 'admin')
  ORDER BY w.email;
$$;

CREATE OR REPLACE FUNCTION public.admin_instructor_whitelisted_by(_email text)
 RETURNS text
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT u.email::text
  FROM public.whitelist w
  LEFT JOIN auth.users u ON u.id = w.created_by
  WHERE lower(w.email) = lower(_email)
    AND public.has_role(auth.uid(), 'admin')
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_instructor_status(_email text, _status whitelist_status)
 RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change instructor status';
  END IF;

  UPDATE public.whitelist
    SET status = _status
    WHERE lower(email) = lower(_email) AND role = 'instructor';

  SELECT id INTO uid FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF uid IS NOT NULL THEN
    IF _status = 'approved' THEN
      INSERT INTO public.user_roles(user_id, role)
        VALUES (uid, 'instructor')
        ON CONFLICT (user_id, role) DO NOTHING;
    ELSE
      DELETE FROM public.user_roles WHERE user_id = uid AND role = 'instructor';
    END IF;
  END IF;
END;
$$;
