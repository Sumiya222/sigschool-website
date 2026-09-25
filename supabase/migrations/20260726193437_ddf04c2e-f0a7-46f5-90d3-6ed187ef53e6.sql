CREATE TABLE public.gallery_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  caption text NOT NULL DEFAULT '',
  description text,
  location text,
  taken_on date,
  "order" integer NOT NULL DEFAULT 0,
  visible boolean NOT NULL DEFAULT false,
  consent_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gallery_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_images TO authenticated;
GRANT ALL ON public.gallery_images TO service_role;

ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read consented visible gallery images"
  ON public.gallery_images FOR SELECT
  TO anon
  USING (visible = true AND consent_confirmed = true);

CREATE POLICY "Admins can read all gallery images"
  ON public.gallery_images FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR (visible = true AND consent_confirmed = true));

CREATE POLICY "Admins can manage gallery images"
  ON public.gallery_images FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER gallery_images_touch_updated_at
  BEFORE UPDATE ON public.gallery_images
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER audit_gallery_images
  AFTER INSERT OR UPDATE OR DELETE ON public.gallery_images
  FOR EACH ROW EXECUTE FUNCTION public.audit_site_content('gallery_image');