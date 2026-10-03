CREATE TABLE public.email_sender_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  from_name text NOT NULL,
  local_part text NOT NULL CHECK (local_part ~ '^[a-z0-9][a-z0-9._-]{0,40}$'),
  purpose text,
  match_keywords text[] NOT NULL DEFAULT '{}',
  daily_cap integer NOT NULL DEFAULT 500 CHECK (daily_cap BETWEEN 1 AND 100000),
  max_bounce_pct numeric NOT NULL DEFAULT 5,
  max_complaint_pct numeric NOT NULL DEFAULT 0.3,
  min_sample integer NOT NULL DEFAULT 50,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused')),
  paused_reason text,
  paused_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_sender_identities TO authenticated;
GRANT ALL ON public.email_sender_identities TO service_role;
ALTER TABLE public.email_sender_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage sender identities" ON public.email_sender_identities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS sender_identity_id uuid REFERENCES public.email_sender_identities(id) ON DELETE SET NULL;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS sender_label text;
CREATE INDEX IF NOT EXISTS email_campaigns_sender_idx ON public.email_campaigns(sender_identity_id);

INSERT INTO public.email_sender_identities (key,label,from_name,local_part,purpose,match_keywords,daily_cap) VALUES
 ('exams','Exams','MBA Compass Exams','exams','Exam dates, mock tests, results and preparation updates', ARRAY['exam','cat','xat','mock','nmat','snap','result'], 500),
 ('admissions','Admissions','MBA Compass Admissions','admissions','College applications, deadlines, interviews and shortlists', ARRAY['admission','application','deadline','college','interview','shortlist'], 500),
 ('alerts','Alerts','MBA Compass Alerts','alerts','Short time-sensitive notices and reminders', ARRAY['alert','reminder','urgent','notice','last date'], 300)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.email_sender_health_check(_sid uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $$
DECLARE s record; tot int; bad int; comp int;
BEGIN
  SELECT * INTO s FROM public.email_sender_identities WHERE id = _sid;
  IF s IS NULL THEN RETURN true; END IF;
  IF s.status = 'paused' THEN RETURN false; END IF;
  SELECT count(*), count(*) FILTER (WHERE l.status = 'bounced'), count(*) FILTER (WHERE l.status = 'complained')
    INTO tot, bad, comp
  FROM public.email_campaign_recipients r
  JOIN public.email_campaigns c ON c.id = r.campaign_id
  JOIN LATERAL (SELECT status FROM public.email_send_log WHERE message_id = r.message_id ORDER BY created_at DESC LIMIT 1) l ON true
  WHERE c.sender_identity_id = _sid AND r.queued_at > now() - interval '7 days';
  IF tot >= s.min_sample AND (bad * 100.0 / tot > s.max_bounce_pct OR comp * 100.0 / tot > s.max_complaint_pct) THEN
    UPDATE public.email_sender_identities SET status = 'paused', paused_at = now(),
      paused_reason = format('Auto-paused: %s%% bounced, %s%% complaints in the last 7 days (%s emails)', round(bad*100.0/tot,1), round(comp*100.0/tot,2), tot)
      WHERE id = _sid;
    RETURN false;
  END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.email_sender_health_check(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.email_campaign_tick()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE c record; r record; n integer; total integer := 0; lim integer; used integer; s record;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(7700000000000002);
  FOR c IN SELECT id, batch_size, interval_seconds, sender_identity_id FROM public.email_campaigns
           WHERE status = 'running' AND coalesce(next_send_at, now()) <= now() LOOP
    n := 0;
    lim := greatest(least(c.batch_size, 2000), 1);
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
          AND r2.queued_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') AT TIME ZONE 'Asia/Kolkata')
          AND r2.status = 'queued' AND NOT r2.is_test_inbox;
      IF used >= s.daily_cap THEN
        UPDATE public.email_campaigns SET
          next_send_at = (date_trunc('day', now() AT TIME ZONE 'Asia/Kolkata') + interval '1 day') AT TIME ZONE 'Asia/Kolkata',
          last_error = left('Daily cap of ' || s.daily_cap || ' reached for sender "' || s.label || '". Continues tomorrow.', 500)
          WHERE id = c.id;
        CONTINUE;
      END IF;
      lim := least(lim, s.daily_cap - used);
    END IF;
    FOR r IN SELECT id, email, payload FROM public.email_campaign_recipients
             WHERE campaign_id = c.id AND status = 'waiting'
             ORDER BY is_test_inbox DESC, email LIMIT lim LOOP
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
END $function$;