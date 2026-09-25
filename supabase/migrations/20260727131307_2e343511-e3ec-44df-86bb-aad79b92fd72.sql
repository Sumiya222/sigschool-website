-- 1) Result view runs with the querying user's permissions/RLS
ALTER VIEW public.result_cards SET (security_invoker = on);
GRANT SELECT ON public.result_cards TO authenticated;

-- 2) Pin search_path on the remaining helper
ALTER FUNCTION public.compute_academic_year(date) SET search_path = public;

-- 3) CMS tables: authenticated read must not bypass visibility flags
DROP POLICY IF EXISTS "pages auth read" ON public.pages;
CREATE POLICY "pages auth read" ON public.pages FOR SELECT TO authenticated
  USING (public.can_edit_site() OR published = true);

DROP POLICY IF EXISTS "page_sections auth read" ON public.page_sections;
CREATE POLICY "page_sections auth read" ON public.page_sections FOR SELECT TO authenticated
  USING (
    public.can_edit_site()
    OR (visible = true AND EXISTS (
      SELECT 1 FROM public.pages p WHERE p.slug = page_sections.page_slug AND p.published
    ))
  );

DROP POLICY IF EXISTS "programs auth read" ON public.programs;
CREATE POLICY "programs auth read" ON public.programs FOR SELECT TO authenticated
  USING (public.can_edit_site() OR visible = true);

DROP POLICY IF EXISTS "projects auth read" ON public.projects;
CREATE POLICY "projects auth read" ON public.projects FOR SELECT TO authenticated
  USING (public.can_edit_site() OR visible = true);

DROP POLICY IF EXISTS "partners_schools auth read" ON public.partners_schools;
CREATE POLICY "partners_schools auth read" ON public.partners_schools FOR SELECT TO authenticated
  USING (public.can_edit_site() OR visible = true);

DROP POLICY IF EXISTS "testimonials auth read" ON public.testimonials;
CREATE POLICY "testimonials auth read" ON public.testimonials FOR SELECT TO authenticated
  USING (public.can_edit_site() OR visible = true);

DROP POLICY IF EXISTS "nav_items auth read" ON public.nav_items;
CREATE POLICY "nav_items auth read" ON public.nav_items FOR SELECT TO authenticated
  USING (public.can_edit_site() OR visible = true);

DROP POLICY IF EXISTS "hero_carousel auth read" ON public.hero_carousel;
CREATE POLICY "hero_carousel auth read" ON public.hero_carousel FOR SELECT TO authenticated
  USING (public.can_edit_site() OR visible = true);

DROP POLICY IF EXISTS "leadership auth read" ON public.leadership;
CREATE POLICY "leadership auth read" ON public.leadership FOR SELECT TO authenticated
  USING (public.can_edit_site() OR visible = true);
DROP POLICY IF EXISTS "leadership public read" ON public.leadership;
CREATE POLICY "leadership public read" ON public.leadership FOR SELECT TO anon
  USING (visible = true);

DROP POLICY IF EXISTS "affiliations auth read" ON public.affiliations;
CREATE POLICY "affiliations auth read" ON public.affiliations FOR SELECT TO authenticated
  USING (public.can_edit_site() OR visible = true);
DROP POLICY IF EXISTS "affiliations public read" ON public.affiliations;
CREATE POLICY "affiliations public read" ON public.affiliations FOR SELECT TO anon
  USING (visible = true);

DROP POLICY IF EXISTS "faculty_claims auth read" ON public.faculty_claims;
CREATE POLICY "faculty_claims auth read" ON public.faculty_claims FOR SELECT TO authenticated
  USING (true);