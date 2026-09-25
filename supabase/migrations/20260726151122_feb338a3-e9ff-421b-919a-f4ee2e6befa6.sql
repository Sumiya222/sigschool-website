UPDATE public.page_sections
SET content = content || jsonb_build_object(
  'doc_ref', 'Institutional Program Brief · AB / SCH',
  'doc_rev', 'Rev. 2026.1',
  'secondary_cta_label', 'Read the delivery spec',
  'secondary_cta_target', '#delivery-spec',
  'facts', jsonb_build_array(
    jsonb_build_object('label','Format','value','Timetabled weekly subject'),
    jsonb_build_object('label','Session','value','40 minutes'),
    jsonb_build_object('label','Grades','value','4 – 10'),
    jsonb_build_object('label','Supplied','value','Curriculum · Kits · Reporting')
  )
)
WHERE page_slug = 'for-schools' AND section_key = 'hero';