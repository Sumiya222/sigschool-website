-- Rebrand CMS-seeded content from "AstroBot Academy" (STEM/robotics vendor)
-- to the placeholder "Northbridge Preparatory School" K-12 brand.
--
-- This is a CONTENT update only — no schema/table/column changes. It exists
-- because the code-level rebrand (component fallback copy, meta tags, email
-- templates, etc.) has no effect on rows already sitting in these CMS
-- tables; whatever text was seeded/edited into them still overrides the new
-- code fallbacks at runtime. This migration brings the stored content in
-- line with the new placeholder brand so the live site actually reflects it.
--
-- Review before applying to a database you care about — it rewrites text
-- broadly via substring replacement across every CMS content table. It is
-- safe to re-run (idempotent: replace() on already-clean text is a no-op).
-- Real user-submitted data (inquiries, registrations, job_applications,
-- students, invoices, etc.) is deliberately NOT touched.

CREATE OR REPLACE FUNCTION public._rebrand_replace(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  -- Longest/most-specific strings first so a later shorter replacement
  -- (e.g. "AstroBot") never clobbers a piece of an already-replaced phrase.
  SELECT
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
    replace(
      txt,
      'Stellar Scholar Space Education Initiative', 'Northbridge Preparatory School'),
      'Stelalliance (SMC-Private) Ltd', 'Northbridge Preparatory School'),
      'Stelalliance', 'Northbridge Preparatory School'),
      'NICAT–NASTP Alpha, Rawalpindi', '100 Founders Way, Springfield'),
      'NICAT-NASTP Alpha, Rawalpindi', '100 Founders Way, Springfield'),
      'AstroBot Academy, Lahore', '100 Founders Way, Springfield'),
      'Karachi, Pakistan', '100 Founders Way, Springfield'),
      'Rawalpindi, Pakistan', 'Springfield'),
      'AstroBot Academy', 'Northbridge Preparatory School'),
      'astrobotacademy.com', 'northbridgeprep.edu'),
      'astrobot.academy', 'northbridgeprep.edu'),
      'AstroBot', 'Northbridge Prep'),
      '+92 314 5978068', '+1 (555) 010-2040'),
      '+92 300 0000000', '+1 (555) 010-2040'),
      '+92 21 0000000', '+1 (555) 010-2040')
$$;

-- ── Site-wide settings & page copy (jsonb) ─────────────────────────────
UPDATE public.site_settings
  SET value = public._rebrand_replace(value::text)::jsonb
  WHERE value::text ~* 'astrobot|stelalliance|stellar scholar|rawalpindi|karachi|nicat';

UPDATE public.pages
  SET title = public._rebrand_replace(title),
      seo_title = public._rebrand_replace(seo_title),
      seo_description = public._rebrand_replace(seo_description)
  WHERE coalesce(title,'') || coalesce(seo_title,'') || coalesce(seo_description,'')
        ~* 'astrobot|stelalliance|stellar scholar|rawalpindi|karachi|nicat';

UPDATE public.page_sections
  SET content = public._rebrand_replace(content::text)::jsonb
  WHERE content::text ~* 'astrobot|stelalliance|stellar scholar|rawalpindi|karachi|nicat';

-- ── Figures / stats ─────────────────────────────────────────────────────
UPDATE public.site_stats
  SET label = public._rebrand_replace(label),
      value = public._rebrand_replace(value),
      suffix = public._rebrand_replace(suffix)
  WHERE label || value || coalesce(suffix,'') ~* 'astrobot|stelalliance|stellar scholar|rawalpindi|karachi|nicat';

-- ── Academics / projects / partners / testimonials / faculty claims ────
UPDATE public.programs
  SET name = public._rebrand_replace(name),
      badge_label = public._rebrand_replace(badge_label),
      description = public._rebrand_replace(description)
  WHERE name || badge_label || description ~* 'astrobot|stelalliance|stellar scholar|rawalpindi|karachi|nicat';

UPDATE public.projects
  SET title = public._rebrand_replace(title),
      age_range = public._rebrand_replace(age_range),
      description = public._rebrand_replace(description)
  WHERE title || age_range || coalesce(description,'') ~* 'astrobot|stelalliance|stellar scholar|rawalpindi|karachi|nicat';

UPDATE public.partners_schools
  SET name = public._rebrand_replace(name),
      blurb = public._rebrand_replace(blurb)
  WHERE name || coalesce(blurb,'') ~* 'astrobot|stelalliance|stellar scholar|rawalpindi|karachi|nicat';

UPDATE public.testimonials
  SET quote = public._rebrand_replace(quote),
      attribution = public._rebrand_replace(attribution)
  WHERE quote || coalesce(attribution,'') ~* 'astrobot|stelalliance|stellar scholar|rawalpindi|karachi|nicat';

UPDATE public.faculty_claims
  SET label = public._rebrand_replace(label),
      value = public._rebrand_replace(value),
      description = public._rebrand_replace(description)
  WHERE label || value || coalesce(description,'') ~* 'astrobot|stelalliance|stellar scholar|rawalpindi|karachi|nicat';

UPDATE public.affiliations
  SET name = public._rebrand_replace(name),
      note = public._rebrand_replace(note)
  WHERE name || coalesce(note,'') ~* 'astrobot|stelalliance|stellar scholar|rawalpindi|karachi|nicat';

UPDATE public.leadership
  SET title = public._rebrand_replace(title),
      bio = public._rebrand_replace(bio)
  WHERE title || coalesce(bio,'') ~* 'astrobot|stelalliance|stellar scholar|rawalpindi|karachi|nicat';

UPDATE public.featured_students
  SET school = public._rebrand_replace(school),
      achievement = public._rebrand_replace(achievement),
      quote = public._rebrand_replace(quote)
  WHERE school || achievement || coalesce(quote,'') ~* 'astrobot|stelalliance|stellar scholar|rawalpindi|karachi|nicat';

UPDATE public.gallery_images
  SET caption = public._rebrand_replace(caption),
      description = public._rebrand_replace(description),
      location = public._rebrand_replace(location)
  WHERE caption || coalesce(description,'') || coalesce(location,'') ~* 'astrobot|stelalliance|stellar scholar|rawalpindi|karachi|nicat';

UPDATE public.job_openings
  SET title = public._rebrand_replace(title),
      department = public._rebrand_replace(department),
      location = public._rebrand_replace(location),
      description = public._rebrand_replace(description),
      responsibilities = public._rebrand_replace(responsibilities),
      requirements = public._rebrand_replace(requirements)
  WHERE title || department || location || description || responsibilities || requirements
        ~* 'astrobot|stelalliance|stellar scholar|rawalpindi|karachi|nicat';

UPDATE public.media
  SET alt_text = public._rebrand_replace(alt_text)
  WHERE alt_text ~* 'astrobot|stelalliance|stellar scholar|rawalpindi|karachi|nicat';

-- ── Nav items: the top navbar has never had any 'nav'-location rows in ──
-- this database (only 2 stray 'footer' rows existed — Partners/Contact —
-- from a pre-rebrand migration). That's not a rebrand regression, but it
-- does mean the navbar renders empty and the footer's "Explore" column
-- only shows those 2 links instead of the full site map, since neither
-- Nav.tsx nor Footer.tsx has a code fallback once ANY rows exist for that
-- location. Replace both wholesale with the current page structure.
DELETE FROM public.nav_items WHERE location = 'nav';
DELETE FROM public.nav_items WHERE location = 'footer';

INSERT INTO public.nav_items (label, target, location, footer_column, "order", visible) VALUES
  ('About', '/about', 'nav', NULL, 1, true),
  ('Academics', '/programs', 'nav', NULL, 2, true),
  ('Admissions', '/admissions', 'nav', NULL, 3, true),
  ('Campus Life', '/schools', 'nav', NULL, 4, true),
  ('Student Life', '/students', 'nav', NULL, 5, true),
  ('Careers', '/careers', 'nav', NULL, 6, true),
  ('Contact', '/contact', 'nav', NULL, 7, true),
  ('About', '/about', 'footer', 'Explore', 1, true),
  ('Academics', '/programs', 'footer', 'Explore', 2, true),
  ('Admissions', '/admissions', 'footer', 'Explore', 3, true),
  ('Campus Life', '/schools', 'footer', 'Explore', 4, true),
  ('Student Life', '/students', 'footer', 'Explore', 5, true),
  ('Careers', '/careers', 'footer', 'Explore', 6, true),
  ('Contact', '/contact', 'footer', 'Explore', 7, true);

-- ── Camp window → generic enrollment window (conceptual, not just brand) ─
UPDATE public.camp_window
  SET camp_name = 'Fall Enrollment 2026',
      age_tracks = 'Lower School · Middle School · Upper School',
      venue = public._rebrand_replace(venue),
      note = public._rebrand_replace(note),
      closed_message = public._rebrand_replace(closed_message),
      register_label = CASE WHEN register_label = 'Register Now' THEN 'Apply Now' ELSE public._rebrand_replace(register_label) END
  WHERE singleton = true;

DROP FUNCTION public._rebrand_replace(text);
