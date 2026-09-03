CREATE OR REPLACE FUNCTION public.first_distinct_texts(arr text[], n integer)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT array_agg(v ORDER BY ord)
  FROM (
    SELECT v, ord
    FROM (
      SELECT DISTINCT ON (btrim(u.v)) btrim(u.v) AS v, u.ord
      FROM unnest(arr) WITH ORDINALITY AS u(v, ord)
      WHERE u.v IS NOT NULL AND btrim(u.v) <> ''
      ORDER BY btrim(u.v), u.ord
    ) distinct_values
    ORDER BY ord
    LIMIT n
  ) capped;
$$;

CREATE OR REPLACE FUNCTION public.distinct_text_count(arr text[])
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(count(DISTINCT btrim(u.v)), 0)::integer
  FROM unnest(arr) AS u(v)
  WHERE u.v IS NOT NULL AND btrim(u.v) <> '';
$$;

GRANT EXECUTE ON FUNCTION public.first_distinct_texts(text[], integer) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.distinct_text_count(text[]) TO anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.colleges_listing();

CREATE FUNCTION public.colleges_listing()
RETURNS TABLE (
  id uuid, name text, slug text, city text, state text, logo_url text,
  description text, fees text, fees_lakhs numeric,
  placement_avg text, placement_highest text, placement_median text,
  ranking integer, type text, tier text, college_category text,
  listing_sort_order integer,
  established integer, total_students integer, campus_size text,
  exams_accepted text[], specializations text[],
  top_recruiters text[], top_recruiters_total integer,
  accreditations text[]
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
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
    AND c.slug IS NOT NULL AND trim(c.slug) <> ''
  ORDER BY c.listing_sort_order NULLS LAST, c.ranking NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.colleges_listing() TO anon, authenticated, service_role;