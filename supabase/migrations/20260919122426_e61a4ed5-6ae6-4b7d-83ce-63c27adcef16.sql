DROP MATERIALIZED VIEW IF EXISTS public.colleges_listing_cache CASCADE;

CREATE MATERIALIZED VIEW public.colleges_listing_cache AS
  SELECT
    c.id, c.name, c.slug, c.city, c.state, c.logo_url,
    LEFT(regexp_replace(COALESCE(c.description, ''), '<[^>]+>', '', 'g'), 180) AS description,
    c.fees, c.fees_lakhs, c.placement_avg, c.placement_highest, c.placement_median,
    c.ranking, c.type, c.tier, c.college_category, c.listing_sort_order,
    c.established, c.total_students, c.campus_size,
    c.exams_accepted, c.specializations,
    public.first_distinct_texts(c.top_recruiters, 5) AS top_recruiters,
    public.distinct_text_count(c.top_recruiters) AS top_recruiters_total,
    public.first_distinct_texts(c.accreditations, 4) AS accreditations
  FROM public.colleges c
  WHERE c.name IS NOT NULL AND trim(c.name) <> ''
    AND c.slug IS NOT NULL AND trim(c.slug) <> '';

CREATE UNIQUE INDEX colleges_listing_cache_id_idx ON public.colleges_listing_cache (id);
CREATE INDEX colleges_listing_cache_order_idx
  ON public.colleges_listing_cache (listing_sort_order NULLS LAST, ranking NULLS LAST);

CREATE OR REPLACE FUNCTION public.colleges_listing()
 RETURNS TABLE(id uuid, name text, slug text, city text, state text, logo_url text, description text, fees text, fees_lakhs numeric, placement_avg text, placement_highest text, placement_median text, ranking integer, type text, tier text, college_category text, listing_sort_order integer, established integer, total_students integer, campus_size text, exams_accepted text[], specializations text[], top_recruiters text[], top_recruiters_total integer, accreditations text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    m.id, m.name, m.slug, m.city, m.state, m.logo_url, m.description,
    m.fees, m.fees_lakhs, m.placement_avg, m.placement_highest, m.placement_median,
    m.ranking, m.type, m.tier, m.college_category, m.listing_sort_order,
    m.established, m.total_students, m.campus_size,
    m.exams_accepted, m.specializations,
    m.top_recruiters, m.top_recruiters_total, m.accreditations
  FROM public.colleges_listing_cache m
  ORDER BY m.listing_sort_order NULLS LAST, m.ranking NULLS LAST;
$function$;

GRANT EXECUTE ON FUNCTION public.colleges_listing() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.refresh_colleges_listing_cache()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.colleges_listing_cache;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.refresh_colleges_listing_cache() TO authenticated, service_role;

SELECT cron.schedule(
  'refresh-colleges-listing-cache',
  '7 * * * *',
  $$SELECT public.refresh_colleges_listing_cache();$$
);