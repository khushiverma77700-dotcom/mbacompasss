CREATE OR REPLACE FUNCTION public.cta_analytics_export(
  p_since timestamptz,
  p_outcome text DEFAULT NULL,
  p_section text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50000
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 50000), 1), 200000);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  WITH base AS (
    SELECT e.cta_key,
           e.outcome,
           e.created_at,
           e.page_path,
           e.user_id,
           s.label,
           COALESCE(s.category, 'Unknown') AS category,
           CASE
             WHEN e.page_path IS NULL THEN 'Unknown'
             WHEN split_part(split_part(e.page_path, '?', 1), '#', 1) IN ('/', '') THEN 'Home'
             ELSE initcap(replace(split_part(trim(both '/' from split_part(split_part(e.page_path, '?', 1), '#', 1)), '/', 1), '-', ' '))
           END AS section
      FROM public.cta_events e
      LEFT JOIN public.cta_settings s ON s.cta_key = e.cta_key
     WHERE e.created_at >= p_since
  ), filtered AS (
    SELECT * FROM base
     WHERE (p_outcome IS NULL OR p_outcome = 'all' OR outcome = p_outcome)
       AND (p_section IS NULL OR p_section = 'all' OR section = p_section)
       AND (p_category IS NULL OR p_category = 'all' OR category = p_category)
       AND (
         COALESCE(p_search, '') = ''
         OR cta_key ILIKE '%' || p_search || '%'
         OR COALESCE(label, '') ILIKE '%' || p_search || '%'
         OR COALESCE(page_path, '') ILIKE '%' || p_search || '%'
         OR category ILIKE '%' || p_search || '%'
       )
  )
  SELECT COALESCE(jsonb_agg(r), '[]'::jsonb) INTO v_result
    FROM (
      SELECT jsonb_build_object(
               'created_at', created_at,
               'cta_key', cta_key,
               'label', COALESCE(label, cta_key),
               'category', category,
               'outcome', outcome,
               'page_path', page_path,
               'section', section,
               'user_id', user_id
             ) AS r
        FROM filtered
       ORDER BY created_at DESC
       LIMIT v_limit
    ) x;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cta_analytics_export(timestamptz,text,text,text,text,integer) TO authenticated;