ALTER TABLE public.email_send_state ADD COLUMN IF NOT EXISTS campaign_global_daily_cap integer NOT NULL DEFAULT 1000;

CREATE OR REPLACE FUNCTION public.email_campaign_tick()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE c record; r record; n integer; total integer := 0; lim integer; used integer; s record;
  gcap integer; gused integer; day_start timestamptz;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(7700000000000002);
  day_start := (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata');
  SELECT coalesce(campaign_global_daily_cap, 1000) INTO gcap FROM public.email_send_state WHERE id = 1;
  gcap := coalesce(gcap, 1000);
  SELECT count(*) INTO gused FROM public.email_campaign_recipients
    WHERE queued_at >= day_start AND status = 'queued' AND NOT is_test_inbox;
  FOR c IN SELECT id, batch_size, interval_seconds, sender_identity_id FROM public.email_campaigns
           WHERE status = 'running' AND coalesce(next_send_at, now()) <= now() LOOP
    n := 0;
    lim := greatest(least(c.batch_size, 2000), 1);
    IF gused >= gcap AND NOT EXISTS (SELECT 1 FROM public.email_campaign_recipients WHERE campaign_id = c.id AND status = 'waiting' AND is_test_inbox) THEN
      UPDATE public.email_campaigns SET
        next_send_at = day_start + interval '1 day',
        last_error = left('Daily total cap of ' || gcap || ' emails (all senders) reached. Continues tomorrow.', 500)
        WHERE id = c.id;
      CONTINUE;
    END IF;
    IF c.sender_identity_id IS NOT NULL THEN
      IF NOT public.email_sender_health_check(c.sender_identity_id) THEN
        SELECT * INTO s FROM public.email_sender_identities WHERE id = c.sender_identity_id;
        UPDATE public.email_campaigns SET status = 'paused', next_send_at = NULL,
          last_error = left('Paused because sender "' || coalesce(s.label,'?') || '" is paused. ' || coalesce(s.paused_reason,''), 500)
          WHERE id = c.id;
        CONTINUE;
      END IF;
      SELECT * INTO s FROM public.email_sender_identities WHERE id = c.sender_identity_id;
      SELECT count(*) INTO used FROM public.email_campaign_recipients r2 JOIN public.email_campaigns c2 ON c2.id = r2.campaign_id
        WHERE c2.sender_identity_id = c.sender_identity_id
          AND r2.queued_at >= day_start AND r2.status = 'queued' AND NOT r2.is_test_inbox;
      IF used >= s.daily_cap THEN
        UPDATE public.email_campaigns SET
          next_send_at = day_start + interval '1 day',
          last_error = left('Daily cap of ' || s.daily_cap || ' reached for sender "' || s.label || '". Continues tomorrow.', 500)
          WHERE id = c.id;
        CONTINUE;
      END IF;
      lim := least(lim, s.daily_cap - used);
    END IF;
    FOR r IN SELECT id, email, payload, is_test_inbox FROM public.email_campaign_recipients
             WHERE campaign_id = c.id AND status = 'waiting'
             ORDER BY is_test_inbox DESC, email LIMIT lim LOOP
      IF NOT r.is_test_inbox AND gused >= gcap THEN EXIT; END IF;
      BEGIN
        PERFORM public.enqueue_email('transactional_emails', r.payload);
        UPDATE public.email_campaign_recipients SET status = 'queued', queued_at = now(), payload = NULL WHERE id = r.id;
        n := n + 1;
        IF NOT r.is_test_inbox THEN gused := gused + 1; END IF;
      EXCEPTION WHEN OTHERS THEN
        UPDATE public.email_campaign_recipients SET status = 'failed', error = left(SQLERRM, 300), queued_at = now(), payload = NULL WHERE id = r.id;
        UPDATE public.email_campaigns SET last_error = left('Queueing failed for ' || r.email || ': ' || SQLERRM, 500) WHERE id = c.id;
      END;
    END LOOP;
    total := total + n;
    IF EXISTS (SELECT 1 FROM public.email_campaign_recipients WHERE campaign_id = c.id AND status = 'waiting') THEN
      UPDATE public.email_campaigns SET sent_count = sent_count + n,
        next_send_at = CASE WHEN gused >= gcap THEN day_start + interval '1 day'
                            ELSE now() + make_interval(secs => greatest(c.interval_seconds, 5)) END,
        last_error = CASE WHEN gused >= gcap THEN left('Daily total cap of ' || gcap || ' emails (all senders) reached. Continues tomorrow.', 500) ELSE last_error END
        WHERE id = c.id;
    ELSE
      UPDATE public.email_campaigns SET sent_count = sent_count + n, status = 'completed', completed_at = now(), next_send_at = NULL WHERE id = c.id;
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM public.email_campaigns WHERE status = 'running')
     AND EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'email-campaign-tick') THEN
    PERFORM cron.unschedule('email-campaign-tick');
  END IF;
  RETURN total;
END $function$;