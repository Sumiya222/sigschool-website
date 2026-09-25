DROP POLICY IF EXISTS "terms read all" ON public.terms;
CREATE POLICY "terms ops read" ON public.terms FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'school'::public.app_role)
  OR public.has_role(auth.uid(), 'instructor'::public.app_role)
);