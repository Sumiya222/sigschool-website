CREATE TYPE public.inquiry_type AS ENUM ('parent', 'school', 'other');
CREATE TYPE public.inquiry_status AS ENUM ('new', 'handled');

CREATE TABLE public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  type public.inquiry_type NOT NULL DEFAULT 'other',
  school_name text,
  role text,
  message text NOT NULL,
  status public.inquiry_status NOT NULL DEFAULT 'new',
  ip_hash text,
  user_agent text,
  handled_at timestamptz,
  handled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE, DELETE ON public.inquiries TO authenticated;
GRANT ALL ON public.inquiries TO service_role;

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read inquiries" ON public.inquiries
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update inquiries" ON public.inquiries
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete inquiries" ON public.inquiries
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER inquiries_touch_updated_at
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX inquiries_created_at_idx ON public.inquiries (created_at DESC);
CREATE INDEX inquiries_ip_hash_idx ON public.inquiries (ip_hash, created_at DESC);

-- Contact page + sections
INSERT INTO public.pages (slug, title, seo_title, seo_description, published, "order")
VALUES ('contact', 'Contact', 'Contact AstroBot Academy — Inquire',
  'Talk to AstroBot Academy about camps, workshops and year-round school robotics, AI and space science programmes. Typical response time: 24 hours.',
  true, 90)
ON CONFLICT (slug) DO UPDATE SET published = true;

INSERT INTO public.page_sections (page_slug, section_key, "order", mode, visible, content) VALUES
('contact', 'hero', 1, 'custom', true, jsonb_build_object(
  'theme', 'dark',
  'doc_ref', 'Inquiry Desk · AB / CNT',
  'doc_rev', 'Rev. 2026.1',
  'eyebrow', 'Contact',
  'headline', 'Inquire.',
  'subhead', 'Tell us a little about what you''re looking for and we''ll come back to you — usually within a day.',
  'form_title', 'Send an inquiry',
  'form_note', 'Required fields are marked. We only use these details to reply to you.',
  'submit_label', 'Send Inquiry',
  'success_title', 'Inquiry received.',
  'success_body', 'Thank you — your message is with our team. We''ll reply to the email and number you gave us.',
  'error_title', 'That didn''t send.',
  'error_body', 'Something went wrong on our side. Your message is still here — try again, or reach us directly on WhatsApp or email.'
)),
('contact', 'channels', 2, 'cards', true, jsonb_build_object(
  'theme', 'light',
  'eyebrow', 'Direct channels',
  'headline', 'Or Reach Us Directly.',
  'subhead', 'Three ways through, whichever suits you.',
  'whatsapp_label', 'WhatsApp',
  'whatsapp_note', 'Fastest route — message us and we''ll reply the same day.',
  'whatsapp_badge', 'Fastest',
  'email_label', 'Email',
  'email_note', 'Best for detailed school inquiries and documents.',
  'visit_label', 'Visit',
  'visit_note', 'By appointment — tell us before you come.'
)),
('contact', 'paths', 3, 'cards', true, jsonb_build_object(
  'theme', 'light',
  'eyebrow', 'Choose your route',
  'headline', 'Not Sure Where to Start?',
  'subhead', 'Two short signposts so you land in the right place.',
  'parent_title', 'I''m a parent',
  'parent_body', 'Camps, workshops, and how to hear about the next registration window.',
  'parent_cta_label', 'See the programs',
  'parent_cta_target', '/programs',
  'school_title', 'I''m a school',
  'school_body', 'The year-round curriculum, what we supply, and what we need from your campus.',
  'school_cta_label', 'See the delivery spec',
  'school_cta_target', '/for-schools'
)),
('contact', 'response', 4, 'rich_text', true, jsonb_build_object(
  'theme', 'dark'
))
ON CONFLICT DO NOTHING;