INSERT INTO public.media (storage_path, alt_text, tag, width, height) VALUES
  ('team/p1.jpg', 'Placeholder team portrait', 'people', 640, 640),
  ('team/p2.jpg', 'Placeholder team portrait', 'people', 640, 640),
  ('team/p3.jpg', 'Placeholder team portrait', 'people', 640, 640),
  ('team/p4.jpg', 'Placeholder team portrait', 'people', 640, 640);

WITH m AS (
  SELECT id, row_number() OVER (ORDER BY storage_path) AS rn
  FROM public.media WHERE storage_path IN ('team/p1.jpg','team/p2.jpg','team/p3.jpg','team/p4.jpg')
), p AS (
  SELECT id, row_number() OVER (ORDER BY tier, "order") AS rn FROM public.leadership
)
UPDATE public.leadership l
SET media_id = m.id
FROM p JOIN m ON m.rn = ((p.rn - 1) % 4) + 1
WHERE l.id = p.id;