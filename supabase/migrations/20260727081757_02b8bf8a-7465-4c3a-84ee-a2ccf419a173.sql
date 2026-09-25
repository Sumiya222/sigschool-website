-- Who may edit website content: Super Admin, or an approved CMS account.
CREATE OR REPLACE FUNCTION public.can_edit_site()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.is_current_user_super_admin()
      OR (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'cms'::public.app_role)
        AND public.is_whitelist_approved(auth.uid())
      );
$$;

REVOKE EXECUTE ON FUNCTION public.can_edit_site() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_edit_site() TO authenticated, service_role;

-- ---------------------------------------------------------------
-- CMS content tables: write access moves from admin -> can_edit_site()
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "site_settings admin write" ON public.site_settings;
CREATE POLICY "site_settings cms write" ON public.site_settings FOR ALL TO authenticated
  USING (public.can_edit_site()) WITH CHECK (public.can_edit_site());

DROP POLICY IF EXISTS "site_stats admin write" ON public.site_stats;
CREATE POLICY "site_stats cms write" ON public.site_stats FOR ALL TO authenticated
  USING (public.can_edit_site()) WITH CHECK (public.can_edit_site());

DROP POLICY IF EXISTS "pages admin write" ON public.pages;
CREATE POLICY "pages cms write" ON public.pages FOR ALL TO authenticated
  USING (public.can_edit_site()) WITH CHECK (public.can_edit_site());

DROP POLICY IF EXISTS "page_sections admin write" ON public.page_sections;
CREATE POLICY "page_sections cms write" ON public.page_sections FOR ALL TO authenticated
  USING (public.can_edit_site()) WITH CHECK (public.can_edit_site());

DROP POLICY IF EXISTS "media admin write" ON public.media;
CREATE POLICY "media cms write" ON public.media FOR ALL TO authenticated
  USING (public.can_edit_site()) WITH CHECK (public.can_edit_site());

DROP POLICY IF EXISTS "programs admin write" ON public.programs;
CREATE POLICY "programs cms write" ON public.programs FOR ALL TO authenticated
  USING (public.can_edit_site()) WITH CHECK (public.can_edit_site());

DROP POLICY IF EXISTS "projects admin write" ON public.projects;
CREATE POLICY "projects cms write" ON public.projects FOR ALL TO authenticated
  USING (public.can_edit_site()) WITH CHECK (public.can_edit_site());

DROP POLICY IF EXISTS "partners_schools admin write" ON public.partners_schools;
CREATE POLICY "partners_schools cms write" ON public.partners_schools FOR ALL TO authenticated
  USING (public.can_edit_site()) WITH CHECK (public.can_edit_site());

DROP POLICY IF EXISTS "affiliations admin write" ON public.affiliations;
CREATE POLICY "affiliations cms write" ON public.affiliations FOR ALL TO authenticated
  USING (public.can_edit_site()) WITH CHECK (public.can_edit_site());

DROP POLICY IF EXISTS "leadership admin write" ON public.leadership;
CREATE POLICY "leadership cms write" ON public.leadership FOR ALL TO authenticated
  USING (public.can_edit_site()) WITH CHECK (public.can_edit_site());

DROP POLICY IF EXISTS "testimonials admin write" ON public.testimonials;
CREATE POLICY "testimonials cms write" ON public.testimonials FOR ALL TO authenticated
  USING (public.can_edit_site()) WITH CHECK (public.can_edit_site());

DROP POLICY IF EXISTS "faculty_claims admin write" ON public.faculty_claims;
CREATE POLICY "faculty_claims cms write" ON public.faculty_claims FOR ALL TO authenticated
  USING (public.can_edit_site()) WITH CHECK (public.can_edit_site());

DROP POLICY IF EXISTS "nav_items admin write" ON public.nav_items;
CREATE POLICY "nav_items cms write" ON public.nav_items FOR ALL TO authenticated
  USING (public.can_edit_site()) WITH CHECK (public.can_edit_site());

DROP POLICY IF EXISTS "hero_carousel admin write" ON public.hero_carousel;
CREATE POLICY "hero_carousel cms write" ON public.hero_carousel FOR ALL TO authenticated
  USING (public.can_edit_site()) WITH CHECK (public.can_edit_site());

DROP POLICY IF EXISTS "camp_window admin write" ON public.camp_window;
CREATE POLICY "camp_window cms write" ON public.camp_window FOR ALL TO authenticated
  USING (public.can_edit_site()) WITH CHECK (public.can_edit_site());

DROP POLICY IF EXISTS "Admins can manage gallery images" ON public.gallery_images;
DROP POLICY IF EXISTS "Admins can read all gallery images" ON public.gallery_images;
CREATE POLICY "gallery_images cms write" ON public.gallery_images FOR ALL TO authenticated
  USING (public.can_edit_site()) WITH CHECK (public.can_edit_site());
CREATE POLICY "gallery_images auth read" ON public.gallery_images FOR SELECT TO authenticated
  USING (public.can_edit_site() OR (visible = true AND consent_confirmed = true));

DROP POLICY IF EXISTS "Admins can manage featured students" ON public.featured_students;
DROP POLICY IF EXISTS "Admins can read all featured students" ON public.featured_students;
CREATE POLICY "featured_students cms write" ON public.featured_students FOR ALL TO authenticated
  USING (public.can_edit_site()) WITH CHECK (public.can_edit_site());
CREATE POLICY "featured_students cms read all" ON public.featured_students FOR SELECT TO authenticated
  USING (public.can_edit_site());

DROP POLICY IF EXISTS "Admins manage job openings" ON public.job_openings;
DROP POLICY IF EXISTS "Admins can read all job openings" ON public.job_openings;
CREATE POLICY "job_openings cms write" ON public.job_openings FOR ALL TO authenticated
  USING (public.can_edit_site()) WITH CHECK (public.can_edit_site());
CREATE POLICY "job_openings cms read all" ON public.job_openings FOR SELECT TO authenticated
  USING (public.can_edit_site() OR (visible = true AND status = 'open'::public.job_status));

-- ---------------------------------------------------------------
-- Website image storage follows the same rule
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "site-media admin read" ON storage.objects;
DROP POLICY IF EXISTS "site-media admin insert" ON storage.objects;
DROP POLICY IF EXISTS "site-media admin update" ON storage.objects;
DROP POLICY IF EXISTS "site-media admin delete" ON storage.objects;
CREATE POLICY "site-media cms read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'site-media' AND (public.can_edit_site() OR public.has_role(auth.uid(), 'admin'::public.app_role)));
CREATE POLICY "site-media cms insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-media' AND public.can_edit_site());
CREATE POLICY "site-media cms update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'site-media' AND public.can_edit_site());
CREATE POLICY "site-media cms delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'site-media' AND public.can_edit_site());

-- ---------------------------------------------------------------
-- Only the Super Admin may whitelist / modify CMS accounts
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_super_admin_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  is_super boolean := public.is_current_user_super_admin();
  privileged_old boolean;
  privileged_new boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_super_admin = true THEN
      RAISE EXCEPTION 'The Super Admin account cannot be removed through the dashboard';
    END IF;
    IF OLD.role IN ('admin'::public.app_role, 'cms'::public.app_role) AND NOT is_super THEN
      RAISE EXCEPTION 'Only the Super Admin can remove Admin or CMS whitelist entries';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.is_super_admin IS DISTINCT FROM OLD.is_super_admin THEN
      RAISE EXCEPTION 'Super Admin status cannot be changed through the dashboard';
    END IF;
    IF OLD.is_super_admin = true THEN
      IF NEW.status IS DISTINCT FROM OLD.status
         OR NEW.role IS DISTINCT FROM OLD.role
         OR lower(NEW.email) IS DISTINCT FROM lower(OLD.email)
         OR NEW.assigned_school_id IS DISTINCT FROM OLD.assigned_school_id
      THEN
        RAISE EXCEPTION 'The Super Admin account cannot be modified through the dashboard';
      END IF;
    END IF;
    privileged_old := OLD.role IN ('admin'::public.app_role, 'cms'::public.app_role);
    privileged_new := NEW.role IN ('admin'::public.app_role, 'cms'::public.app_role);
    IF privileged_old AND NEW.status IS DISTINCT FROM OLD.status AND NOT is_super THEN
      RAISE EXCEPTION 'Only the Super Admin can change the status of an Admin or CMS account';
    END IF;
    IF (privileged_old OR privileged_new) AND NEW.role IS DISTINCT FROM OLD.role AND NOT is_super THEN
      RAISE EXCEPTION 'Only the Super Admin can modify Admin or CMS whitelist entries';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role IN ('admin'::public.app_role, 'cms'::public.app_role) AND NOT is_super THEN
      RAISE EXCEPTION 'Only the Super Admin can add new Admin or CMS whitelist entries';
    END IF;
    IF NEW.is_super_admin = true AND NOT is_super THEN
      RAISE EXCEPTION 'Super Admin status cannot be granted through the dashboard';
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;