
-- Backfill itemReviewed on top-level Review/AggregateRating inside
-- site_settings.seo_page__* schemaMarkup arrays. Also defensively strips
-- itemReviewed from nested AggregateRating/Review/Rating where it does not
-- belong. Idempotent.
CREATE OR REPLACE FUNCTION public._normalize_review_schema(node jsonb, depth int DEFAULT 0, page_url text DEFAULT NULL, page_name text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $fn$
DECLARE
  result jsonb;
  k text;
  v jsonb;
  t jsonb;
  ttext text;
  is_ar boolean := false;
  is_rv boolean := false;
  is_rt boolean := false;
  rating_value numeric;
  review_count numeric;
  item_reviewed jsonb;
BEGIN
  IF node IS NULL THEN RETURN node; END IF;

  IF jsonb_typeof(node) = 'array' THEN
    SELECT jsonb_agg(public._normalize_review_schema(elem, depth, page_url, page_name))
      INTO result FROM jsonb_array_elements(node) elem;
    RETURN COALESCE(result, '[]'::jsonb);
  END IF;

  IF jsonb_typeof(node) <> 'object' THEN RETURN node; END IF;

  t := node -> '@type';
  IF t IS NOT NULL THEN
    IF jsonb_typeof(t) = 'array' THEN
      SELECT bool_or(elem #>> '{}' = 'AggregateRating') INTO is_ar FROM jsonb_array_elements(t) elem;
      SELECT bool_or(elem #>> '{}' = 'Review')          INTO is_rv FROM jsonb_array_elements(t) elem;
      SELECT bool_or(elem #>> '{}' = 'Rating')          INTO is_rt FROM jsonb_array_elements(t) elem;
    ELSE
      ttext := t #>> '{}';
      is_ar := ttext = 'AggregateRating';
      is_rv := ttext = 'Review';
      is_rt := ttext = 'Rating';
    END IF;
  END IF;

  result := '{}'::jsonb;
  FOR k, v IN SELECT * FROM jsonb_each(node) LOOP
    -- Strip itemReviewed when nested (depth > 0) in AggregateRating/Review/Rating.
    IF depth > 0 AND (is_ar OR is_rv OR is_rt) AND k = 'itemReviewed' THEN
      CONTINUE;
    END IF;
    result := result || jsonb_build_object(k, public._normalize_review_schema(v, depth + 1, page_url, page_name));
  END LOOP;

  -- For TOP-LEVEL AggregateRating/Review with no itemReviewed, inject one
  -- pointing at the page so Google Rich Results validates.
  IF depth = 0 AND (is_ar OR is_rv) AND (result -> 'itemReviewed') IS NULL THEN
    -- Validate required rating fields; if missing, return node unchanged
    -- (the runtime normalizer will drop it).
    IF is_ar THEN
      BEGIN rating_value := (result ->> 'ratingValue')::numeric; EXCEPTION WHEN OTHERS THEN rating_value := NULL; END;
      BEGIN review_count := COALESCE((result ->> 'reviewCount')::numeric, (result ->> 'ratingCount')::numeric); EXCEPTION WHEN OTHERS THEN review_count := NULL; END;
      IF rating_value IS NULL OR review_count IS NULL THEN RETURN result; END IF;
    END IF;

    item_reviewed := jsonb_build_object('@type', 'WebPage');
    IF page_name IS NOT NULL AND length(page_name) > 0 THEN
      item_reviewed := item_reviewed || jsonb_build_object('name', page_name);
    END IF;
    IF page_url IS NOT NULL AND length(page_url) > 0 THEN
      item_reviewed := item_reviewed || jsonb_build_object('url', page_url);
    END IF;
    result := result || jsonb_build_object('itemReviewed', item_reviewed);
    -- Ensure @context on standalone block
    IF (result -> '@context') IS NULL THEN
      result := result || jsonb_build_object('@context', 'https://schema.org');
    END IF;
  END IF;

  RETURN result;
END;
$fn$;

-- Apply to every stored SEO snapshot in one pass.
UPDATE public.site_settings AS s
SET value = jsonb_set(
  s.value,
  '{schemaMarkup}',
  public._normalize_review_schema(
    s.value -> 'schemaMarkup',
    0,
    COALESCE(s.value ->> 'canonicalUrl', (s.value -> 'technicalSEO') ->> 'canonicalUrl'),
    s.value ->> 'meta_title'
  )
)
WHERE s.key LIKE 'seo_page__%'
  AND s.value ? 'schemaMarkup'
  AND (
    s.value::text ILIKE '%"AggregateRating"%'
    OR s.value::text ILIKE '%"Review"%'
  );

DROP FUNCTION public._normalize_review_schema(jsonb, int, text, text);
