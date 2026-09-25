CREATE OR REPLACE FUNCTION public._restore_exec(sql text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $fn$ BEGIN EXECUTE sql; END $fn$;
REVOKE ALL ON FUNCTION public._restore_exec(text) FROM PUBLIC, anon, authenticated;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    GRANT EXECUTE ON FUNCTION public._restore_exec(text) TO sandbox_exec;
  END IF;
END $$;