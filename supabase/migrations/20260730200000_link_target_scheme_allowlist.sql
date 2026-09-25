-- CMS-editable link targets (page_sections.content, camp_window.register_url
-- / closed_target) are free text set by CMS-editor/admin accounts and later
-- rendered as a clickable href on the public site and in the dashboard.
-- A stored javascript:/data:/vbscript: URL would execute in whoever clicks
-- it later, including an Admin — crossing the CMS/Admin privilege boundary.
-- This enforces a scheme allowlist at the database layer so a direct API
-- call (bypassing the editor UI entirely) can't store anything else.
--
-- Allowed: https:, http:, mailto:, tel:, and same-origin relative paths
-- (/path, #anchor, ?query). Empty string is allowed (field left unset).
CREATE OR REPLACE FUNCTION public.is_safe_link_target(url text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT url = ''
      OR url = '/'
      OR url ~ '^/[^/]'
      OR url ~ '^#'
      OR url ~ '^\?'
      OR url ~* '^https://'
      OR url ~* '^http://'
      OR url ~* '^mailto:'
      OR url ~* '^tel:';
$$;

-- Recursively walks a JSONB value (objects and arrays, so repeating list
-- items like footer social links are covered too) and returns the dotted
-- path of the first unsafe link-shaped key found, or NULL if none. A key is
-- treated as a link target using the same heuristic the CMS editor itself
-- uses to decide whether to render a LinkField: name ends in "_target" or is
-- exactly "href".
CREATE OR REPLACE FUNCTION public.find_unsafe_link_target(node jsonb, path text DEFAULT '')
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  k text;
  v jsonb;
  i int;
  result text;
BEGIN
  IF jsonb_typeof(node) = 'object' THEN
    FOR k, v IN SELECT * FROM jsonb_each(node) LOOP
      IF (k ~ '_target$' OR k = 'href') AND jsonb_typeof(v) = 'string' THEN
        IF NOT public.is_safe_link_target(v #>> '{}') THEN
          RETURN path || '.' || k;
        END IF;
      ELSIF jsonb_typeof(v) IN ('object', 'array') THEN
        result := public.find_unsafe_link_target(v, path || '.' || k);
        IF result IS NOT NULL THEN RETURN result; END IF;
      END IF;
    END LOOP;
  ELSIF jsonb_typeof(node) = 'array' THEN
    FOR i IN 0 .. jsonb_array_length(node) - 1 LOOP
      result := public.find_unsafe_link_target(node -> i, path || '[' || i || ']');
      IF result IS NOT NULL THEN RETURN result; END IF;
    END LOOP;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_safe_link_targets()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  bad_path text;
BEGIN
  bad_path := public.find_unsafe_link_target(NEW.content);
  IF bad_path IS NOT NULL THEN
    RAISE EXCEPTION 'Unsafe link target at "%": only https:, http:, mailto:, tel: and same-origin paths are allowed', bad_path;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS page_sections_safe_links ON public.page_sections;
CREATE TRIGGER page_sections_safe_links
  BEFORE INSERT OR UPDATE ON public.page_sections
  FOR EACH ROW EXECUTE FUNCTION public.enforce_safe_link_targets();

-- Same allowlist for the two plain-column link fields outside page_sections.
-- Verified against live data first: both currently hold "/contact" (safe).
ALTER TABLE public.camp_window
  ADD CONSTRAINT camp_window_register_url_safe
  CHECK (register_url IS NULL OR public.is_safe_link_target(register_url));

ALTER TABLE public.camp_window
  ADD CONSTRAINT camp_window_closed_target_safe
  CHECK (closed_target IS NULL OR public.is_safe_link_target(closed_target));
