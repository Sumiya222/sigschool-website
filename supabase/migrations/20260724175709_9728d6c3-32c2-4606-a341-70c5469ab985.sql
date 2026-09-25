
-- 1) Whitelist-approval helper
CREATE OR REPLACE FUNCTION public.is_whitelist_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN public.whitelist w ON lower(w.email) = lower(u.email)
    WHERE u.id = _user_id
      AND w.status = 'approved'::public.whitelist_status
  );
$$;

-- 2) School-active helper
CREATE OR REPLACE FUNCTION public.is_school_active(_school_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.schools WHERE id = _school_id AND is_active = true);
$$;

-- 3) Harden assignment-check helper: require approved whitelist
CREATE OR REPLACE FUNCTION public.is_assigned_to_section(_section_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.instructor_assignments ia
    WHERE ia.instructor_user_id = auth.uid()
      AND ia.section_id = _section_id
      AND public.is_whitelist_approved(auth.uid())
  );
$$;

-- 4) Harden school-scope helper: require approved whitelist AND active school
CREATE OR REPLACE FUNCTION public.current_user_school_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.school_id
  FROM public.user_roles ur
  JOIN public.schools s ON s.id = ur.school_id
  WHERE ur.user_id = auth.uid()
    AND ur.role = 'school'
    AND s.is_active = true
    AND public.is_whitelist_approved(auth.uid())
  LIMIT 1;
$$;

-- 5) Extend whitelist sync trigger to also purge instructor_assignments on revoke
CREATE OR REPLACE FUNCTION public.sync_whitelist_to_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT id INTO uid FROM auth.users WHERE lower(email) = lower(OLD.email) LIMIT 1;
    IF uid IS NOT NULL THEN
      DELETE FROM public.user_roles WHERE user_id = uid AND role = OLD.role;
      IF OLD.role = 'instructor' THEN
        DELETE FROM public.instructor_assignments WHERE instructor_user_id = uid;
      END IF;
    END IF;
    RETURN OLD;
  END IF;

  SELECT id INTO uid FROM auth.users WHERE lower(email) = lower(NEW.email) LIMIT 1;
  IF uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' THEN
    INSERT INTO public.user_roles (user_id, role, school_id)
    VALUES (uid, NEW.role, NEW.assigned_school_id)
    ON CONFLICT (user_id, role) DO UPDATE SET school_id = EXCLUDED.school_id;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = uid AND role = NEW.role;
    IF NEW.role = 'instructor' THEN
      DELETE FROM public.instructor_assignments WHERE instructor_user_id = uid;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Same for the admin_set_instructor_status RPC path (already deletes user_role; add assignment cleanup)
CREATE OR REPLACE FUNCTION public.admin_set_instructor_status(_email text, _status whitelist_status)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      DELETE FROM public.instructor_assignments WHERE instructor_user_id = uid;
    END IF;
  END IF;
END;
$function$;

-- 6) Cleanup any existing stale assignments for currently non-approved instructors
DELETE FROM public.instructor_assignments ia
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u
  JOIN public.whitelist w ON lower(w.email) = lower(u.email)
  WHERE u.id = ia.instructor_user_id
    AND w.role = 'instructor'
    AND w.status = 'approved'
);

-- 7) School read-only SELECT policy on invoices (scoped to own active school)
DROP POLICY IF EXISTS "invoices school read own" ON public.invoices;
CREATE POLICY "invoices school read own"
ON public.invoices
FOR SELECT
TO authenticated
USING (school_id = public.current_user_school_id());

-- Payments: allow schools to read payments for their own invoices (for balance display)
DROP POLICY IF EXISTS "payments school read own" ON public.payments;
CREATE POLICY "payments school read own"
ON public.payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = payments.invoice_id
      AND i.school_id = public.current_user_school_id()
  )
);
