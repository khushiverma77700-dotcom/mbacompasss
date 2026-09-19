REVOKE ALL ON public.colleges_listing_cache FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.refresh_colleges_listing_cache()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.role() <> 'service_role' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can refresh the college listing cache';
  END IF;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.colleges_listing_cache;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.refresh_colleges_listing_cache() FROM anon;
GRANT EXECUTE ON FUNCTION public.refresh_colleges_listing_cache() TO authenticated, service_role;