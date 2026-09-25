CREATE TABLE public.camp_window (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true,
  is_open boolean NOT NULL DEFAULT false,
  camp_name text NOT NULL DEFAULT 'Summer Boot Camp 2026',
  dates_label text NOT NULL DEFAULT '',
  venue text NOT NULL DEFAULT '',
  age_tracks text NOT NULL DEFAULT '',
  register_label text NOT NULL DEFAULT 'Register Now',
  register_url text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  show_closed_strip boolean NOT NULL DEFAULT true,
  closed_message text NOT NULL DEFAULT 'Next camp announced soon — inquire to be notified',
  closed_target text NOT NULL DEFAULT '/contact',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT camp_window_singleton_key UNIQUE (singleton),
  CONSTRAINT camp_window_singleton_true CHECK (singleton = true)
);

GRANT SELECT ON public.camp_window TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.camp_window TO authenticated;
GRANT ALL ON public.camp_window TO service_role;

ALTER TABLE public.camp_window ENABLE ROW LEVEL SECURITY;

CREATE POLICY "camp_window public read" ON public.camp_window FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "camp_window admin write" ON public.camp_window FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER camp_window_touch BEFORE UPDATE ON public.camp_window
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER camp_window_audit AFTER INSERT OR UPDATE OR DELETE ON public.camp_window
  FOR EACH ROW EXECUTE FUNCTION public.audit_site_content('camp_window');

INSERT INTO public.camp_window (is_open, camp_name, dates_label, venue, age_tracks, register_label, register_url, note, show_closed_strip, closed_message, closed_target)
VALUES (false, 'Summer Boot Camp 2026', 'June – July 2026', 'AstroBot Academy, Lahore', 'Ages 5–7 · Ages 8–12 · Ages 13–17', 'Register Now', '/contact', 'Seats are limited and allocated by age track.', true, 'Next camp announced soon — inquire to be notified', '/contact');