
CREATE OR REPLACE FUNCTION public.sync_whitelist_to_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT id INTO uid FROM auth.users WHERE lower(email) = lower(OLD.email) LIMIT 1;
    IF uid IS NOT NULL THEN
      DELETE FROM public.user_roles WHERE user_id = uid AND role = OLD.role;
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
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_whitelist_to_user_roles ON public.whitelist;
CREATE TRIGGER trg_sync_whitelist_to_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.whitelist
FOR EACH ROW EXECUTE FUNCTION public.sync_whitelist_to_user_roles();

-- Backfill existing approved whitelist rows
INSERT INTO public.user_roles (user_id, role, school_id)
SELECT u.id, w.role, w.assigned_school_id
FROM public.whitelist w
JOIN auth.users u ON lower(u.email) = lower(w.email)
WHERE w.status = 'approved'
ON CONFLICT (user_id, role) DO UPDATE SET school_id = EXCLUDED.school_id;
