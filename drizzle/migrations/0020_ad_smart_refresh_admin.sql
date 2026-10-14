CREATE OR REPLACE FUNCTION public.ad_smart_refresh_now()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN public.ad_smart_refresh();
END $$;
REVOKE ALL ON FUNCTION public.ad_smart_refresh_now() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ad_smart_refresh_now() TO authenticated;