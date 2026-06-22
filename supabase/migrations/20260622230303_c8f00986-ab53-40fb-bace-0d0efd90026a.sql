
-- For any seo_page__* row whose schemaMarkup array contains a top-level
-- AggregateRating node without itemReviewed, attach a WebPage itemReviewed
-- using the snapshot's canonicalUrl + meta_title.
WITH targets AS (
  SELECT s.key,
         s.value,
         COALESCE(s.value ->> 'canonicalUrl', (s.value -> 'technicalSEO') ->> 'canonicalUrl') AS page_url,
         s.value ->> 'meta_title' AS page_name,
         elem,
         ord
  FROM public.site_settings s
  CROSS JOIN LATERAL jsonb_array_elements(s.value -> 'schemaMarkup') WITH ORDINALITY AS e(elem, ord)
  WHERE s.key LIKE 'seo_page__%'
    AND s.value ? 'schemaMarkup'
    AND jsonb_typeof(s.value -> 'schemaMarkup') = 'array'
    AND elem ->> '@type' = 'AggregateRating'
    AND NOT (elem ? 'itemReviewed')
), patched AS (
  SELECT t.key,
         jsonb_agg(
           CASE
             WHEN (e2.elem ->> '@type') = 'AggregateRating' AND NOT (e2.elem ? 'itemReviewed')
             THEN e2.elem || jsonb_build_object(
                    'itemReviewed',
                    jsonb_strip_nulls(jsonb_build_object(
                      '@type', 'WebPage',
                      'name', NULLIF(t.page_name, ''),
                      'url',  NULLIF(t.page_url, '')
                    ))
                  )
             ELSE e2.elem
           END
           ORDER BY e2.ord
         ) AS new_sm
  FROM (SELECT DISTINCT key, page_url, page_name, value FROM targets) t
  CROSS JOIN LATERAL jsonb_array_elements(t.value -> 'schemaMarkup') WITH ORDINALITY AS e2(elem, ord)
  GROUP BY t.key
)
UPDATE public.site_settings s
SET value = jsonb_set(s.value, '{schemaMarkup}', p.new_sm)
FROM patched p
WHERE s.key = p.key;
