DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    GRANT SELECT, REFERENCES, TRIGGER ON TABLE auth.users TO sandbox_exec;
    GRANT USAGE ON SCHEMA auth TO sandbox_exec;
  END IF;
END $$;