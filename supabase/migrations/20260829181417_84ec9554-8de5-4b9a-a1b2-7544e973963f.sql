CREATE TABLE IF NOT EXISTS public.keyword_metrics_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  locale text NOT NULL DEFAULT 'in',
  search_volume integer,
  cpc numeric,
  competition numeric,
  difficulty numeric,
  results_count bigint,
  monthly_trend jsonb,
  gsc_clicks integer,
  gsc_impressions integer,
  gsc_position numeric,
  gsc_ctr numeric,
  intent text,
  volume_source text,
  difficulty_source text,
  raw jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  gsc_fetched_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS keyword_metrics_cache_key_locale_idx
  ON public.keyword_metrics_cache (lower(keyword), locale);
CREATE INDEX IF NOT EXISTS keyword_metrics_cache_fetched_idx
  ON public.keyword_metrics_cache (fetched_at DESC);

GRANT SELECT ON public.keyword_metrics_cache TO authenticated;
GRANT ALL ON public.keyword_metrics_cache TO service_role;

ALTER TABLE public.keyword_metrics_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read keyword metrics cache" ON public.keyword_metrics_cache;
CREATE POLICY "Admins can read keyword metrics cache"
  ON public.keyword_metrics_cache FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS keyword_metrics_cache_updated_at ON public.keyword_metrics_cache;
CREATE TRIGGER keyword_metrics_cache_updated_at
  BEFORE UPDATE ON public.keyword_metrics_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();