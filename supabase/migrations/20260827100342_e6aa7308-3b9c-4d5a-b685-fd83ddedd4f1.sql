-- Backend-only view of the schedule for the System Check report.
CREATE OR REPLACE FUNCTION public.system_check_cron_jobs()
RETURNS TABLE (jobname TEXT, schedule TEXT, active BOOLEAN)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, cron
AS $$
  SELECT j.jobname::text, j.schedule::text, j.active
  FROM cron.job j
  ORDER BY j.jobname
$$;

REVOKE ALL ON FUNCTION public.system_check_cron_jobs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.system_check_cron_jobs() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.system_check_cron_jobs() TO service_role;

-- Daily automated run at 07:00 IST (01:30 UTC).
SELECT cron.unschedule('daily-system-check')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-system-check');

SELECT cron.schedule(
  'daily-system-check',
  '0 2 * * *',
  format($cmd$
    SELECT net.http_post(
      url := 'https://mttoiqruzzxooveooldo.supabase.co/functions/v1/system-check',
      headers := '{"Content-Type":"application/json"}'::jsonb,
      body := jsonb_build_object('cron', true, 'wait', false, 'token', %L)
    );
  $cmd$, (SELECT cron_token FROM public.system_check_config WHERE id))
);