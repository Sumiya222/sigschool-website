-- is_safe_link_target(NULL) previously returned SQL NULL (not a real
-- boolean), relying on every call site prefixing "url IS NULL OR ...".
-- That's still true at every current call site, but it makes the function
-- partial rather than total, and it's the kind of asymmetry a cross-
-- implementation parity test (see tests/link-target-parity.test.mjs) will
-- catch against the TS port, which treats null as "no target set" -> safe.
-- Making it explicit here is additive and non-breaking: existing
-- "IS NULL OR ..." constraints keep working unchanged.
CREATE OR REPLACE FUNCTION public.is_safe_link_target(url text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT url IS NULL
      OR url = ''
      OR url = '/'
      OR url ~ '^/[^/]'
      OR url ~ '^#'
      OR url ~ '^\?'
      OR url ~* '^https://'
      OR url ~* '^http://'
      OR url ~* '^mailto:'
      OR url ~* '^tel:';
$$;
