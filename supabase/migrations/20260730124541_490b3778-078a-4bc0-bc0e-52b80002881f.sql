-- OPERATIONAL FIX: `registrations` had SELECT and UPDATE policies for admins
-- but no DELETE policy at all, so the admin dashboard's "Delete registration"
-- button silently failed (RLS blocked it, 0 rows affected) for real admin
-- users. Public submissions are unaffected — they go through the service-role
-- client, which bypasses RLS entirely. This mirrors the DELETE policy already
-- in place on `inquiries` and `job_applications`.
CREATE POLICY "Admins delete registrations"
ON public.registrations
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));
