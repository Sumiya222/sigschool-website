
-- 1. Column
ALTER TABLE public.whitelist
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

-- 2. Seed the one and only Super Admin (idempotent)
DO $seed$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.whitelist
    WHERE lower(email) = 'shameerzeeshan@gmail.com' AND role = 'admin'
  ) THEN
    UPDATE public.whitelist
      SET is_super_admin = true, status = 'approved'
      WHERE lower(email) = 'shameerzeeshan@gmail.com' AND role = 'admin';
  ELSE
    INSERT INTO public.whitelist (email, role, status, is_super_admin)
    VALUES ('shameerzeeshan@gmail.com', 'admin', 'approved', true);
  END IF;
END
$seed$;

-- 3. Constraint: only shameerzeeshan@gmail.com may have is_super_admin = true.
--    Enforced in-database so a regular admin editing rows directly can't
--    grant super admin to anyone else.
ALTER TABLE public.whitelist
  DROP CONSTRAINT IF EXISTS whitelist_super_admin_hardcoded;
ALTER TABLE public.whitelist
  ADD CONSTRAINT whitelist_super_admin_hardcoded
  CHECK (
    is_super_admin = false
    OR (role = 'admin' AND lower(email) = 'shameerzeeshan@gmail.com')
  );

-- 4. Helper: is the current auth user the Super Admin?
CREATE OR REPLACE FUNCTION public.is_current_user_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.whitelist w
    JOIN auth.users u ON lower(u.email) = lower(w.email)
    WHERE u.id = auth.uid()
      AND w.role = 'admin'
      AND w.is_super_admin = true
      AND w.status = 'approved'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_current_user_super_admin() TO authenticated;

-- 5. Enforce admin-tier gating on whitelist mutations via trigger.
CREATE OR REPLACE FUNCTION public.enforce_super_admin_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_super boolean := public.is_current_user_super_admin();
BEGIN
  -- Absolutely protect the seeded Super Admin row from any mutation
  -- through normal DB access from the app roles.
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_super_admin = true THEN
      RAISE EXCEPTION 'The Super Admin account cannot be removed through the dashboard';
    END IF;
    -- Only super admin can delete admin-role rows
    IF OLD.role = 'admin' AND NOT is_super THEN
      RAISE EXCEPTION 'Only the Super Admin can remove Admin whitelist entries';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- No one can flip is_super_admin via the app (either direction)
    IF NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin THEN
      RAISE EXCEPTION 'Super Admin status cannot be changed through the dashboard';
    END IF;
    -- The Super Admin row is fully locked: no status/role/email/school changes.
    IF OLD.is_super_admin = true THEN
      IF NEW.status IS DISTINCT FROM OLD.status
         OR NEW.role IS DISTINCT FROM OLD.role
         OR lower(NEW.email) IS DISTINCT FROM lower(OLD.email)
         OR NEW.assigned_school_id IS DISTINCT FROM OLD.assigned_school_id
      THEN
        RAISE EXCEPTION 'The Super Admin account cannot be modified through the dashboard';
      END IF;
    END IF;
    -- Any status change on an admin-role row requires super admin
    IF OLD.role = 'admin' AND NEW.status IS DISTINCT FROM OLD.status AND NOT is_super THEN
      RAISE EXCEPTION 'Only the Super Admin can change the status of an Admin account';
    END IF;
    -- Also prevent a regular admin from converting an admin row to something else
    IF OLD.role = 'admin' AND NEW.role IS DISTINCT FROM OLD.role AND NOT is_super THEN
      RAISE EXCEPTION 'Only the Super Admin can modify Admin whitelist entries';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Only super admin can create new admin entries
    IF NEW.role = 'admin' AND NOT is_super THEN
      RAISE EXCEPTION 'Only the Super Admin can add new Admin whitelist entries';
    END IF;
    -- is_super_admin can only be true for the hardcoded email; the CHECK
    -- constraint already enforces that. Belt-and-suspenders: block anyone
    -- other than the existing super admin from inserting a super-admin row.
    IF NEW.is_super_admin = true AND NOT is_super THEN
      RAISE EXCEPTION 'Super Admin status cannot be granted through the dashboard';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_super_admin_rules_trg ON public.whitelist;
CREATE TRIGGER enforce_super_admin_rules_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.whitelist
FOR EACH ROW EXECUTE FUNCTION public.enforce_super_admin_rules();

-- 6. Update the "last admin" protection so the Super Admin row is fully
--    locked regardless of remaining-admin count.
CREATE OR REPLACE FUNCTION public.protect_last_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  losing_admin boolean := false;
  remaining int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_super_admin = true THEN
      RAISE EXCEPTION 'The Super Admin account cannot be removed';
    END IF;
    losing_admin := (OLD.role = 'admin' AND OLD.status = 'approved');
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_super_admin = true AND NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'The Super Admin account status cannot be changed';
    END IF;
    losing_admin := (OLD.role = 'admin' AND OLD.status = 'approved' AND NEW.status <> 'approved');
  END IF;

  IF losing_admin THEN
    SELECT count(*) INTO remaining FROM public.whitelist
      WHERE role='admin' AND status='approved' AND id <> OLD.id;
    IF remaining = 0 THEN
      RAISE EXCEPTION 'You cannot revoke the last active admin account — approve another admin first';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
