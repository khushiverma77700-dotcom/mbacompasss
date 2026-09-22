CREATE TABLE public.whatsapp_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  message_type text NOT NULL DEFAULT 'template' CHECK (message_type IN ('text','template')),
  template_name text,
  template_language text NOT NULL DEFAULT 'en',
  template_params jsonb NOT NULL DEFAULT '[]'::jsonb,
  message_body text,
  daily_limit integer NOT NULL DEFAULT 50 CHECK (daily_limit > 0 AND daily_limit <= 10000),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  total_target integer,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','running','paused','completed','stopped')),
  notes text,
  last_run_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.whatsapp_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  phone text NOT NULL,
  name text,
  variables jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','retry','max_retry_failed','skipped')),
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  next_retry_at timestamptz,
  last_error text,
  last_error_code text,
  provider_message_id text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, phone)
);

CREATE INDEX idx_whatsapp_recipients_queue ON public.whatsapp_recipients (campaign_id, status, next_retry_at);

CREATE TABLE public.whatsapp_send_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.whatsapp_recipients(id) ON DELETE SET NULL,
  phone text NOT NULL,
  attempt integer NOT NULL DEFAULT 1,
  status text NOT NULL CHECK (status IN ('sent','failed')),
  error_code text,
  error_message text,
  provider_message_id text,
  next_retry_at timestamptz,
  response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_whatsapp_send_logs_campaign ON public.whatsapp_send_logs (campaign_id, created_at DESC);

CREATE TABLE public.whatsapp_daily_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  send_date date NOT NULL DEFAULT CURRENT_DATE,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  processed_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, send_date)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_campaigns TO authenticated;
GRANT ALL ON public.whatsapp_campaigns TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_recipients TO authenticated;
GRANT ALL ON public.whatsapp_recipients TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_send_logs TO authenticated;
GRANT ALL ON public.whatsapp_send_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_daily_stats TO authenticated;
GRANT ALL ON public.whatsapp_daily_stats TO service_role;

ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_send_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_daily_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage whatsapp campaigns" ON public.whatsapp_campaigns
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage whatsapp recipients" ON public.whatsapp_recipients
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read whatsapp send logs" ON public.whatsapp_send_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins read whatsapp daily stats" ON public.whatsapp_daily_stats
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_whatsapp_campaigns_updated_at BEFORE UPDATE ON public.whatsapp_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_recipients_updated_at BEFORE UPDATE ON public.whatsapp_recipients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_whatsapp_daily_stats_updated_at BEFORE UPDATE ON public.whatsapp_daily_stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.whatsapp_bump_daily(p_campaign uuid, p_date date, p_sent integer, p_failed integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.whatsapp_daily_stats (campaign_id, send_date, sent_count, failed_count, processed_count)
  VALUES (p_campaign, p_date, GREATEST(p_sent, 0), GREATEST(p_failed, 0), GREATEST(p_sent, 0) + GREATEST(p_failed, 0))
  ON CONFLICT (campaign_id, send_date) DO UPDATE
    SET sent_count = public.whatsapp_daily_stats.sent_count + GREATEST(p_sent, 0),
        failed_count = public.whatsapp_daily_stats.failed_count + GREATEST(p_failed, 0),
        processed_count = public.whatsapp_daily_stats.processed_count + GREATEST(p_sent, 0) + GREATEST(p_failed, 0),
        updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.whatsapp_bump_daily(uuid, date, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.whatsapp_bump_daily(uuid, date, integer, integer) TO service_role;