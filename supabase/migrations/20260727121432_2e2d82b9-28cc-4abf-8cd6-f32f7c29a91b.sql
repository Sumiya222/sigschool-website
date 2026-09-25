DELETE FROM public.nav_items WHERE target = '/admissions';
DELETE FROM public.nav_items WHERE location = 'footer' AND footer_column IN ('Programs','For Schools');
INSERT INTO public.nav_items (label, target, location, footer_column, "order", visible)
VALUES ('Partners','/partners','footer','Explore',6,true),
       ('Contact','/contact','footer','Explore',7,true);
UPDATE public.page_sections
SET content = jsonb_set(jsonb_set(content,'{primary_cta_target}','"/contact"'),'{primary_cta_label}','"Inquire"')
WHERE page_slug = 'home' AND section_key = 'final_cta';