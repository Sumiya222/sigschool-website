-- Storage quota guard: a circuit breaker (not a real quota) against unbounded
-- growth of the public-upload buckets (CVs, registration attachments) from
-- abuse rather than legitimate volume. storage.objects isn't exposed to
-- PostgREST directly, so this SECURITY DEFINER function is the RPC surface
-- server code checks before accepting an upload.
CREATE OR REPLACE FUNCTION public.get_bucket_total_bytes(_bucket_id text)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(SUM((metadata->>'size')::bigint), 0)::bigint
  FROM storage.objects
  WHERE bucket_id = _bucket_id;
$$;

REVOKE ALL ON FUNCTION public.get_bucket_total_bytes(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_bucket_total_bytes(text) TO service_role;
