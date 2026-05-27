DO $$
DECLARE
  j RECORD;
BEGIN
  FOR j IN
    SELECT jobid, jobname
    FROM cron.job
    WHERE jobname ILIKE '%google-indexing%'
       OR jobname ILIKE '%google_indexing%'
       OR jobname ILIKE '%indexing-audit%'
       OR jobname ILIKE '%indexing_audit%'
       OR jobname ILIKE '%indexing-requeue%'
       OR jobname ILIKE '%seo-indexing%'
       OR jobname ILIKE '%page-speed%'
       OR jobname ILIKE '%pagespeed%'
       OR jobname ILIKE '%page_speed%'
       OR jobname ILIKE '%citation%'
       OR jobname ILIKE '%domain-audit%'
       OR jobname ILIKE '%domain_audit%'
       OR jobname ILIKE '%dns-status%'
       OR jobname ILIKE '%dns_status%'
       OR jobname ILIKE '%dns-propagation%'
  LOOP
    PERFORM cron.unschedule(j.jobid);
    RAISE NOTICE 'Unscheduled cron job: %', j.jobname;
  END LOOP;
END $$;