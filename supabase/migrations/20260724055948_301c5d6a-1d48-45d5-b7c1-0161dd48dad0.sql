CREATE OR REPLACE FUNCTION public.set_active_term(_term_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can change the active term';
  END IF;
  UPDATE public.terms SET is_active = false WHERE is_active = true AND id <> _term_id;
  UPDATE public.terms SET is_active = true WHERE id = _term_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_active_term(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_active_term(uuid) TO authenticated;