-- Makes the generic (non-personalized) copy in transactional emails editable
-- from the CMS: the shared footer notice, each template's "steps" section,
-- CTA button labels, and subject lines. Personalized content (heading, intro,
-- the submission-record panel, waitlisted/confirmed branching) stays in code
-- — a text-field CMS has no safe way to represent that.
--
-- Reuses the existing page_sections/site_settings tables and the generic
-- admin editor already built for website page content, under a new
-- (unpublished — never shown on the public site) "emails" page.

INSERT INTO public.pages (slug, title, published, "order")
VALUES ('emails', 'Emails', false, 999)
ON CONFLICT (slug) DO NOTHING;

-- Separate from the website's `contact_email` setting on purpose: the
-- contact@ mailbox hit a hosting-side deliverability problem this session,
-- so submitter-facing emails point at info@ instead while the website
-- footer keeps showing whatever `contact_email` is set to.
INSERT INTO public.site_settings (key, value)
VALUES ('email_contact_address', '"info@astrobotacademy.com"'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.page_sections (page_slug, section_key, "order", mode, visible, content) VALUES
('emails', 'footer', 1, 'rich_text', true, '{
  "notice": "This inbox isn''t monitored, so replies here won''t reach us."
}'::jsonb),

('emails', 'parent_inquiry', 2, 'rich_text', true, '{
  "subject": "We''ve got your question — AstroBot Academy",
  "steps_heading": "While you wait",
  "steps": [
    {"n": "01", "title": "See what your child would actually build", "body": "Our students design, wire and program real hardware — rovers, satellites and sensor rigs. The Students page is the honest build log, not a brochure."},
    {"n": "02", "title": "Check the age track", "body": "Junior Tinkers (5–7), Young Innovators (8–12) and Future Engineers (13–17). Each track has its own pace, tools and safety rules."},
    {"n": "03", "title": "Watch for the next intake", "body": "Camp and workshop windows open a few times a year with limited seats. We will tell you directly when the next one opens."}
  ],
  "cta_label": "Explore the programs"
}'::jsonb),

('emails', 'school_inquiry', 3, 'rich_text', true, '{
  "subject": "Your school partnership inquiry — AstroBot Academy",
  "steps_heading": "How the engagement runs",
  "steps": [
    {"n": "01", "title": "Scoping call", "body": "Grade bands, section sizes, weekly slot length and your available room. Twenty minutes is usually enough."},
    {"n": "02", "title": "Delivery specification", "body": "We send a written spec: what the academy supplies (instructors, kits, curriculum, assessment) and the short list your campus provides."},
    {"n": "03", "title": "Pilot term, then scale", "body": "Most partners begin with one or two sections for a term, with reporting per student, before extending across grades."}
  ],
  "cta_label": "Read the delivery specification"
}'::jsonb),

('emails', 'general_inquiry', 4, 'rich_text', true, '{
  "subject": "Your message to AstroBot Academy",
  "hint_text": "In the meantime, the clearest picture of what we do is the student build log — real projects, documented as they were made.",
  "primary_cta_label": "See student work",
  "secondary_cta_label": "About the academy →"
}'::jsonb),

('emails', 'job_application', 5, 'rich_text', true, '{
  "subject": "Your application to AstroBot Academy",
  "steps_heading": "Our process",
  "steps": [
    {"n": "01", "title": "Review — within one week", "body": "We look for evidence you have built and taught real things, not only studied them."},
    {"n": "02", "title": "Conversation", "body": "A relaxed call about your background, the age group you would teach and how you explain hard ideas simply."},
    {"n": "03", "title": "Teaching demo", "body": "Shortlisted candidates run a short session with a real group. We pay for your time on the day."}
  ],
  "closing_line": "You will hear from us either way. If the answer is no, we will tell you plainly rather than leave you waiting.",
  "cta_label": "View all open roles"
}'::jsonb),

('emails', 'camp_registration', 6, 'rich_text', true, '{
  "subject": "Camp registration confirmed — AstroBot Academy",
  "steps_heading_confirmed": "Before day one",
  "steps_confirmed": [
    {"n": "01", "title": "Check the details above", "body": "Let us know on WhatsApp right away if anything needs correcting — especially your child''s age, which sets the track and the tools they are allowed to use."},
    {"n": "02", "title": "Joining instructions", "body": "Timings, the venue map, the drop-off and pick-up procedure and the kit list arrive closer to the start date."},
    {"n": "03", "title": "What to bring", "body": "Just a water bottle and curiosity. Every component, tool and laptop is provided by the academy."}
  ],
  "steps_heading_waitlisted": "What happens now",
  "steps_waitlisted": [
    {"n": "01", "title": "You keep your position", "body": "Places move often as plans change. Your position is fixed by the time you registered."},
    {"n": "02", "title": "We call before we email", "body": "If a seat opens close to the start date, we phone the number you gave us first."}
  ],
  "cta_label": "View the program"
}'::jsonb)

ON CONFLICT (page_slug, section_key) DO NOTHING;
