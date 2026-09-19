CREATE OR REPLACE FUNCTION public.colleges_location_counts()
 RETURNS TABLE(city text, state text, total bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(c.city, '') AS city, COALESCE(c.state, '') AS state, count(*) AS total
  FROM public.colleges c
  WHERE c.name IS NOT NULL AND trim(c.name) <> ''
    AND c.slug IS NOT NULL AND trim(c.slug) <> ''
  GROUP BY 1, 2;
$function$;

GRANT EXECUTE ON FUNCTION public.colleges_location_counts() TO anon, authenticated, service_role;