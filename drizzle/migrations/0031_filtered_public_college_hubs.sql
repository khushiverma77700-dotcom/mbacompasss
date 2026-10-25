CREATE OR REPLACE FUNCTION public.colleges_hub_listing(hub_kind text, hub_slug text)
RETURNS TABLE(id uuid, name text, slug text, city text, state text, logo_url text, description text, fees text, fees_lakhs numeric, placement_avg text, placement_highest text, placement_median text, ranking integer, type text, tier text, college_category text, listing_sort_order integer, established integer, total_students integer, campus_size text, exams_accepted text[], specializations text[], top_recruiters text[], top_recruiters_total integer, accreditations text[])
LANGUAGE sql STABLE SECURITY INVOKER SET search_path TO public
AS $function$
SELECT c.* FROM public.colleges_listing() c
WHERE CASE
 WHEN hub_kind = 'type' THEN CASE hub_slug
  WHEN 'iim' THEN coalesce(c.name,'') ~* 'iim' OR c.type = 'IIM'
  WHEN 'private' THEN coalesce(c.college_category,'') ~* 'private' OR coalesce(c.type,'') ~* 'private'
  WHEN 'top-mba' THEN c.tier IN ('Tier 1','Tier 2') AND coalesce(c.ranking,9999) <= 100
  WHEN 'pgdm' THEN coalesce(c.type,'') ~* 'pgdm' OR coalesce(c.college_category,'') ~* 'pgdm'
  WHEN 'university' THEN coalesce(c.type,'') ~* 'university' OR coalesce(c.name,'') ~* 'university'
  WHEN 'government' THEN coalesce(c.college_category,'') ~* 'government|public|state|central' OR coalesce(c.name,'') ~* 'iim|nit|iit|ji?ii?t|fms'
  ELSE false END
 WHEN hub_kind = 'exam' AND hub_slug IN ('cat','xat','cmat','mat','nmat','snap','iift','gmat','atma') THEN EXISTS (
  SELECT 1 FROM unnest(c.exams_accepted) accepted WHERE strpos(upper(accepted),upper(hub_slug)) > 0
 )
 ELSE false END;
$function$;
REVOKE ALL ON FUNCTION public.colleges_hub_listing(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.colleges_hub_listing(text,text) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.colleges_hub_listing(text,text) IS 'Public directory projection only; preserves established type and case-insensitive substring exam predicates before caller pagination.';