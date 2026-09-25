DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', r.sig);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.check_whitelist(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_site() TO anon, authenticated;