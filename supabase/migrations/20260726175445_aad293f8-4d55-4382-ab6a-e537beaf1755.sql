UPDATE public.media SET storage_path = 'asset:' || storage_path
WHERE storage_path IN ('team/p1.jpg','team/p2.jpg','team/p3.jpg','team/p4.jpg');