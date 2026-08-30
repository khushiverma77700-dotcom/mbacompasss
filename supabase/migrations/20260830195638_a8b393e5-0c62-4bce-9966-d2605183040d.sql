ALTER TABLE public.colleges
  ADD COLUMN IF NOT EXISTS description_short text
  GENERATED ALWAYS AS (left(regexp_replace(coalesce(description, ''), '<[^>]+>', '', 'g'), 250)) STORED;

CREATE INDEX IF NOT EXISTS idx_colleges_listing_order
  ON public.colleges (listing_sort_order NULLS LAST, ranking NULLS LAST);

CREATE OR REPLACE FUNCTION public.colleges_listing()
 RETURNS TABLE(id uuid, name text, slug text, city text, state text, logo_url text, description text, fees text, fees_lakhs numeric, placement_avg text, placement_highest text, placement_median text, ranking integer, type text, tier text, college_category text, listing_sort_order integer, established integer, total_students integer, campus_size text, exams_accepted text[], specializations text[], top_recruiters text[], accreditations text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT
    c.id, c.name, c.slug, c.city, c.state, c.logo_url,
    c.description_short AS description,
    c.fees, c.fees_lakhs, c.placement_avg, c.placement_highest, c.placement_median,
    c.ranking, c.type, c.tier, c.college_category, c.listing_sort_order,
    c.established, c.total_students, c.campus_size,
    c.exams_accepted, c.specializations, c.top_recruiters, c.accreditations
  FROM public.colleges c
  WHERE c.name IS NOT NULL AND trim(c.name) <> ''
    AND c.slug IS NOT NULL AND trim(c.slug) <> ''
  ORDER BY c.listing_sort_order NULLS LAST, c.ranking NULLS LAST;
$function$;

GRANT EXECUTE ON FUNCTION public.colleges_listing() TO anon, authenticated, service_role;