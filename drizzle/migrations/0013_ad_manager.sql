CREATE TABLE public.ad_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_code text NOT NULL UNIQUE DEFAULT ('AD-' || upper(substr(md5(random()::text),1,6))),
  name text NOT NULL,
  ad_type text NOT NULL DEFAULT 'image',
  status text NOT NULL DEFAULT 'draft',
  headline text, body text, cta_text text DEFAULT 'Learn more',
  desktop_image_url text, mobile_image_url text, html_content text, alt_text text,
  destination_url text NOT NULL,
  start_at timestamptz, end_at timestamptz,
  priority int NOT NULL DEFAULT 5, weight int NOT NULL DEFAULT 1,
  page_types text[] NOT NULL DEFAULT '{}',
  include_paths text[] NOT NULL DEFAULT '{}',
  exclude_paths text[] NOT NULL DEFAULT '{}',
  keywords text[] NOT NULL DEFAULT '{}',
  devices text NOT NULL DEFAULT 'all',
  placements text[] NOT NULL DEFAULT '{end}',
  max_per_page int NOT NULL DEFAULT 2,
  min_paragraph_gap int NOT NULL DEFAULT 4,
  cap_per_day int NOT NULL DEFAULT 0,
  cap_per_session int NOT NULL DEFAULT 0,
  is_fallback boolean NOT NULL DEFAULT false,
  conversion_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ad_campaigns TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ad_campaigns TO authenticated;
GRANT ALL ON public.ad_campaigns TO service_role;
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public reads active ads" ON public.ad_campaigns FOR SELECT TO anon, authenticated USING (status = 'active');
CREATE POLICY "admins manage ads" ON public.ad_campaigns FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.ad_events (
  id bigserial PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('impression','click','conversion')),
  placement text, page_path text, device text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ad_events_campaign_time ON public.ad_events(campaign_id, created_at);
GRANT INSERT ON public.ad_events TO anon, authenticated;
GRANT SELECT, DELETE ON public.ad_events TO authenticated;
GRANT USAGE ON SEQUENCE public.ad_events_id_seq TO anon, authenticated;
GRANT ALL ON public.ad_events TO service_role;
ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone logs ad views" ON public.ad_events FOR INSERT TO anon, authenticated
  WITH CHECK (event_type IN ('impression','conversion') AND length(coalesce(page_path,'')) < 500
    AND EXISTS (SELECT 1 FROM public.ad_campaigns c WHERE c.id = campaign_id AND c.status='active'));
CREATE POLICY "admins read ad events" ON public.ad_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins delete ad events" ON public.ad_events FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.ad_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  max_ads_per_page int NOT NULL DEFAULT 3,
  excluded_paths text[] NOT NULL DEFAULT '{/admin*,/auth*,/student*,/mocks/*/attempt*,/checkout*,/magic-edit*}',
  allow_popup boolean NOT NULL DEFAULT false,
  label_text text NOT NULL DEFAULT 'Sponsored',
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.ad_settings (id) VALUES (1);
GRANT SELECT ON public.ad_settings TO anon, authenticated;
GRANT UPDATE ON public.ad_settings TO authenticated;
GRANT ALL ON public.ad_settings TO service_role;
ALTER TABLE public.ad_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public reads ad settings" ON public.ad_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admins update ad settings" ON public.ad_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.ad_stats(_from timestamptz, _to timestamptz)
RETURNS TABLE(campaign_id uuid, day date, event_type text, device text, placement text, n bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.campaign_id, (e.created_at AT TIME ZONE 'Asia/Kolkata')::date, e.event_type, coalesce(e.device,'unknown'), coalesce(e.placement,'unknown'), count(*)
  FROM public.ad_events e
  WHERE public.has_role(auth.uid(),'admin') AND e.created_at >= _from AND e.created_at < _to
  GROUP BY 1,2,3,4,5;
$$;
REVOKE EXECUTE ON FUNCTION public.ad_stats(timestamptz,timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ad_stats(timestamptz,timestamptz) TO authenticated;