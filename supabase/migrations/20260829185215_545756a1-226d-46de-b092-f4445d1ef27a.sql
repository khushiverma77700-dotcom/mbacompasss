CREATE OR REPLACE FUNCTION public.seo_intel_tick()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_token text; v_enabled boolean;
BEGIN
  SELECT cron_token, engine_enabled INTO v_token, v_enabled
  FROM public.seo_intel_settings WHERE id = true;

  IF v_token IS NULL OR v_enabled IS NOT TRUE THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := 'https://mttoiqruzzxooveooldo.supabase.co/functions/v1/seo-intel-scheduler',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object('cron_token', v_token)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.seo_intel_tick() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.seo_intel_tick() TO service_role;

SELECT cron.unschedule('seo-intel-heartbeat')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'seo-intel-heartbeat');

SELECT cron.schedule('seo-intel-heartbeat', '*/5 * * * *', $$SELECT public.seo_intel_tick();$$);