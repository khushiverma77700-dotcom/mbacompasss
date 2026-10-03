CREATE OR REPLACE FUNCTION public.email_campaign_tick()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE c record; r record; n integer; total integer := 0;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(7700000000000002);
  FOR c IN SELECT id, batch_size, interval_seconds FROM public.email_campaigns
           WHERE status = 'running' AND coalesce(next_send_at, now()) <= now() LOOP
    n := 0;
    FOR r IN SELECT id, email, payload FROM public.email_campaign_recipients
             WHERE campaign_id = c.id AND status = 'waiting'
             ORDER BY is_test_inbox DESC, email LIMIT greatest(least(c.batch_size, 2000), 1) LOOP
      BEGIN
        PERFORM public.enqueue_email('transactional_emails', r.payload);
        UPDATE public.email_campaign_recipients SET status = 'queued', queued_at = now(), payload = NULL WHERE id = r.id;
        n := n + 1;
      EXCEPTION WHEN OTHERS THEN
        UPDATE public.email_campaign_recipients SET status = 'failed', error = left(SQLERRM, 300), queued_at = now(), payload = NULL WHERE id = r.id;
        UPDATE public.email_campaigns SET last_error = left('Queueing failed for ' || r.email || ': ' || SQLERRM, 500) WHERE id = c.id;
      END;
    END LOOP;
    total := total + n;
    IF EXISTS (SELECT 1 FROM public.email_campaign_recipients WHERE campaign_id = c.id AND status = 'waiting') THEN
      UPDATE public.email_campaigns SET sent_count = sent_count + n,
        next_send_at = now() + make_interval(secs => greatest(c.interval_seconds, 5)) WHERE id = c.id;
    ELSE
      UPDATE public.email_campaigns SET sent_count = sent_count + n, status = 'completed', completed_at = now(), next_send_at = NULL WHERE id = c.id;
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM public.email_campaigns WHERE status = 'running')
     AND EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'email-campaign-tick') THEN
    PERFORM cron.unschedule('email-campaign-tick');
  END IF;
  RETURN total;
END $$;
REVOKE ALL ON FUNCTION public.email_campaign_tick() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_campaign_tick() TO service_role;