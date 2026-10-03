-- lovable-cron-fallback-reviewed: armed only when a campaign starts/resumes, unscheduled by the tick itself once no campaign is running; 5s granularity needed for 10s user-chosen intervals
ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS interval_seconds integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS batch_size integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS next_send_at timestamptz,
  ADD COLUMN IF NOT EXISTS sent_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

ALTER TABLE public.email_campaign_recipients
  ADD COLUMN IF NOT EXISTS payload jsonb,
  ALTER COLUMN queued_at DROP NOT NULL;

CREATE INDEX IF NOT EXISTS email_campaign_recipients_waiting_idx
  ON public.email_campaign_recipients (campaign_id) WHERE status = 'waiting';

CREATE OR REPLACE FUNCTION public.email_campaign_tick()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
DECLARE c record; r record; n integer; total integer := 0;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(7700000000000002);
  FOR c IN SELECT id, batch_size, interval_seconds FROM public.email_campaigns
           WHERE status = 'running' AND coalesce(next_send_at, now()) <= now() LOOP
    n := 0;
    FOR r IN SELECT id, payload FROM public.email_campaign_recipients
             WHERE campaign_id = c.id AND status = 'waiting'
             ORDER BY email LIMIT greatest(least(c.batch_size, 2000), 1) LOOP
      BEGIN
        PERFORM public.enqueue_email('transactional_emails', r.payload);
        UPDATE public.email_campaign_recipients SET status = 'queued', queued_at = now(), payload = NULL WHERE id = r.id;
        n := n + 1;
      EXCEPTION WHEN OTHERS THEN
        UPDATE public.email_campaign_recipients SET status = 'failed', error = left(SQLERRM, 300), queued_at = now(), payload = NULL WHERE id = r.id;
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

CREATE OR REPLACE FUNCTION public.email_campaign_wake()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(7700000000000002);
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'email-campaign-tick') THEN
    PERFORM cron.schedule('email-campaign-tick', '5 seconds', $c$ SELECT public.email_campaign_tick(); $c$);
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.email_campaign_tick() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_campaign_wake() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_campaign_tick() TO service_role;
GRANT EXECUTE ON FUNCTION public.email_campaign_wake() TO service_role;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.email_campaigns;
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.email_tracking_events;
EXCEPTION WHEN OTHERS THEN NULL; END $$;