CREATE OR REPLACE FUNCTION public._strip_item_reviewed(node jsonb, depth int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  result jsonb;
  k text;
  v jsonb;
  t jsonb;
  type_text text;
  is_aggregate boolean := false;
  is_nested_review boolean := false;
  strip_here boolean := false;
BEGIN
  IF node IS NULL THEN RETURN node; END IF;

  IF jsonb_typeof(node) = 'array' THEN
    SELECT jsonb_agg(public._strip_item_reviewed(elem, depth)) INTO result
    FROM jsonb_array_elements(node) elem;
    RETURN COALESCE(result, '[]'::jsonb);
  END IF;

  IF jsonb_typeof(node) <> 'object' THEN RETURN node; END IF;

  t := node -> '@type';
  IF t IS NOT NULL THEN
    IF jsonb_typeof(t) = 'array' THEN
      SELECT bool_or(elem #>> '{}' = 'AggregateRating') INTO is_aggregate FROM jsonb_array_elements(t) elem;
      SELECT bool_or(elem #>> '{}' IN ('Review','Rating')) INTO is_nested_review FROM jsonb_array_elements(t) elem;
    ELSE
      type_text := t #>> '{}';
      is_aggregate := type_text = 'AggregateRating';
      is_nested_review := type_text IN ('Review','Rating');
    END IF;
  END IF;

  strip_here := is_aggregate OR (is_nested_review AND depth > 0);

  result := '{}'::jsonb;
  FOR k, v IN SELECT * FROM jsonb_each(node) LOOP
    IF strip_here AND k = 'itemReviewed' THEN
      CONTINUE;
    END IF;
    result := result || jsonb_build_object(k, public._strip_item_reviewed(v, depth + 1));
  END LOOP;
  RETURN result;
END;
$$;

UPDATE site_settings
SET value = jsonb_set(value, '{schemaMarkup}', public._strip_item_reviewed(value -> 'schemaMarkup', 0))
WHERE key LIKE 'seo_page__%'
  AND value ? 'schemaMarkup'
  AND value::text ILIKE '%itemReviewed%';

DROP FUNCTION public._strip_item_reviewed(jsonb, int);