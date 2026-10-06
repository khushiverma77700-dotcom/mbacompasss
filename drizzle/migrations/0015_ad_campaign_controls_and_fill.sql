ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS impression_budget int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_impression_budget int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pacing text NOT NULL DEFAULT 'asap',
  ADD COLUMN IF NOT EXISTS schedule_days int[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS schedule_start_hour int,
  ADD COLUMN IF NOT EXISTS schedule_end_hour int,
  ADD COLUMN IF NOT EXISTS is_exclusive boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_house boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ab_test text;

CREATE TABLE public.ad_slot_requests (
  id bigserial PRIMARY KEY,
  placement text NOT NULL,
  device text,
  filled boolean NOT NULL,
  page_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ad_slot_requests_time ON public.ad_slot_requests(created_at);
GRANT INSERT ON public.ad_slot_requests TO anon, authenticated;
GRANT SELECT ON public.ad_slot_requests TO authenticated;
GRANT USAGE ON SEQUENCE public.ad_slot_requests_id_seq TO anon, authenticated;
GRANT ALL ON public.ad_slot_requests TO service_role;
ALTER TABLE public.ad_slot_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone logs slot requests" ON public.ad_slot_requests FOR INSERT TO anon, authenticated
  WITH CHECK (length(placement) < 40 AND length(coalesce(page_path,'')) < 500);
CREATE POLICY "admins read slot requests" ON public.ad_slot_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.ad_delivery()
RETURNS TABLE(campaign_id uuid, total bigint, today bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.campaign_id, count(*),
    count(*) FILTER (WHERE (e.created_at AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date)
  FROM public.ad_events e JOIN public.ad_campaigns c ON c.id = e.campaign_id
  WHERE e.event_type = 'impression' AND c.status = 'active' AND (c.impression_budget > 0 OR c.daily_impression_budget > 0)
  GROUP BY 1;
$$;
GRANT EXECUTE ON FUNCTION public.ad_delivery() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.ad_fill_stats(_from timestamptz, _to timestamptz)
RETURNS TABLE(placement text, device text, requests bigint, filled bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.placement, coalesce(r.device,'unknown'), count(*), count(*) FILTER (WHERE r.filled)
  FROM public.ad_slot_requests r
  WHERE public.has_role(auth.uid(),'admin') AND r.created_at >= _from AND r.created_at < _to
  GROUP BY 1,2;
$$;
REVOKE EXECUTE ON FUNCTION public.ad_fill_stats(timestamptz,timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ad_fill_stats(timestamptz,timestamptz) TO authenticated;