-- ═══ Advanced SEO Intelligence layer (Phase 2) ═══

CREATE TABLE IF NOT EXISTS public.seo_intel_kw_sources (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  locale text not null default 'in',
  metric text not null,                -- volume | trend | impressions | position | difficulty | cpc
  source text not null,                -- gsc | semrush | google_trends | serp | internal
  value numeric,
  value_text text,
  label text,                          -- actual | estimated | calculated | ai | unavailable
  confidence text,                     -- high | medium | low | insufficient
  raw jsonb not null default '{}'::jsonb,
  observed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS seo_kw_sources_kw ON public.seo_intel_kw_sources(keyword, locale, metric, observed_at desc);

CREATE TABLE IF NOT EXISTS public.seo_intel_demand (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  locale text not null default 'in',
  final_volume integer,
  final_volume_source text,
  volume_confidence text not null default 'insufficient',
  sources jsonb not null default '[]'::jsonb,
  discrepancy jsonb,
  trend_direction text,                -- rising | falling | flat | unknown
  acceleration_30d numeric,
  impressions_change_pct numeric,
  seasonality jsonb,
  historical jsonb,
  emerging boolean not null default false,
  verdict text,
  evidence jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  unique (keyword, locale)
);

CREATE TABLE IF NOT EXISTS public.seo_intel_intent (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  locale text not null default 'in',
  intent text,
  secondary_intents text[] default '{}',
  intent_confidence text not null default 'medium',
  serp_intent text,
  previous_intent text,
  shift_detected boolean not null default false,
  shift_evidence jsonb,
  recommended_target_path text,
  computed_at timestamptz not null default now(),
  unique (keyword, locale)
);

CREATE TABLE IF NOT EXISTS public.seo_intel_serp (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  locale text not null default 'in',
  captured_on date not null default current_date,
  features jsonb not null default '{}'::jsonb,
  top_results jsonb not null default '[]'::jsonb,
  our_position numeric,
  our_url text,
  rewarded_format text,
  alignment jsonb,
  data_source text,
  created_at timestamptz not null default now(),
  unique (keyword, locale, captured_on)
);

CREATE TABLE IF NOT EXISTS public.seo_intel_volatility (
  id uuid primary key default gen_random_uuid(),
  detected_on date not null default current_date,
  window_hours integer not null default 48,
  scope text not null default 'site',         -- site | keyword | competitor | serp_wide
  keyword text,
  path text,
  keywords_moved integer,
  keywords_tracked integer,
  avg_abs_change numeric,
  classification text,                        -- site_specific | keyword_specific | competitor_specific | serp_wide | possible_algo | data_anomaly | normal
  confidence text not null default 'low',
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS seo_volatility_day ON public.seo_intel_volatility(detected_on desc);

CREATE TABLE IF NOT EXISTS public.seo_intel_forecasts (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  locale text not null default 'in',
  path text,
  current_position numeric,
  momentum_30d numeric,
  demand_direction text,
  competition numeric,
  forecast_direction text,               -- improving | stable | declining | insufficient_data
  target_threshold text,
  probability numeric,
  horizon_days integer not null default 30,
  risk text,
  opportunity text,
  confidence text not null default 'low',
  factors jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  unique (keyword, locale)
);

CREATE TABLE IF NOT EXISTS public.seo_intel_cannibalization (
  id uuid primary key default gen_random_uuid(),
  cluster_key text not null,
  keyword text,
  locale text not null default 'in',
  paths text[] not null default '{}',
  shared_keywords text[] default '{}',
  stronger_path text,
  weaker_paths text[] default '{}',
  overlap_score numeric,
  recommended_action text,               -- merge | redirect | canonical | differentiate | keep
  recommendation text,
  confidence text not null default 'low',
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'open',
  computed_at timestamptz not null default now(),
  unique (cluster_key)
);

CREATE TABLE IF NOT EXISTS public.seo_intel_content_gaps (
  id uuid primary key default gen_random_uuid(),
  path text,
  keyword text,
  gap_type text not null,                -- topic | entity | question | comparison | data | evidence | faq | internal_link | structured
  title text not null,
  description text,
  competitor_domain text,
  competitor_url text,
  value_score numeric,
  priority text not null default 'medium',
  confidence text not null default 'medium',
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'open',
  computed_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS seo_gaps_path ON public.seo_intel_content_gaps(path, gap_type);

CREATE TABLE IF NOT EXISTS public.seo_intel_entities (
  id uuid primary key default gen_random_uuid(),
  entity text not null,
  entity_type text,                      -- college | exam | program | specialization | fees | placement | admission | location | ranking | other
  cluster text,
  coverage_state text not null default 'missing',   -- covered | weak | missing
  page_count integer not null default 0,
  pages text[] default '{}',
  keyword_count integer not null default 0,
  clicks integer,
  impressions integer,
  score numeric,
  recommendation text,
  evidence jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  unique (entity)
);

CREATE TABLE IF NOT EXISTS public.seo_intel_link_opportunities (
  id uuid primary key default gen_random_uuid(),
  source_path text not null,
  target_path text not null,
  anchor_suggestion text,
  context_hint text,
  relationship text,
  target_importance numeric,
  score numeric,
  confidence text not null default 'medium',
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'open',
  computed_at timestamptz not null default now(),
  unique (source_path, target_path, anchor_suggestion)
);

CREATE TABLE IF NOT EXISTS public.seo_intel_ctr_intel (
  id uuid primary key default gen_random_uuid(),
  path text,
  query text,
  position numeric,
  ctr numeric,
  benchmark_ctr numeric,
  benchmark_source text,                 -- own_history | position_cohort
  ctr_delta_pct numeric,
  impressions integer,
  device text,
  country text,
  diagnosis text,                        -- title | meta_description | intent_mismatch | serp_competition | rich_result | none
  detail text,
  confidence text not null default 'medium',
  evidence jsonb not null default '{}'::jsonb,
  computed_at timestamptz not null default now(),
  unique (path, query)
);

CREATE TABLE IF NOT EXISTS public.seo_intel_anomalies (
  id uuid primary key default gen_random_uuid(),
  detected_on date not null default current_date,
  metric text not null,                  -- rankings | impressions | clicks | ctr | indexed | crawl | visibility
  scope text not null default 'site',
  path text,
  keyword text,
  observed numeric,
  expected numeric,
  deviation_sigma numeric,
  severity text not null default 'normal',  -- normal | watch | anomaly
  classification text,
  confidence text not null default 'low',
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
CREATE INDEX IF NOT EXISTS seo_anom_day ON public.seo_intel_anomalies(detected_on desc, severity);

CREATE TABLE IF NOT EXISTS public.seo_intel_opportunities (
  id uuid primary key default gen_random_uuid(),
  kind text not null,                    -- ranking | ctr | content_gap | technical | competitive | new_keyword
  path text,
  keyword text,
  title text not null,
  score numeric,
  factors jsonb not null default '{}'::jsonb,
  rationale text,
  next_action text,
  priority_rank integer,
  confidence text not null default 'medium',
  status text not null default 'open',
  computed_at timestamptz not null default now(),
  unique (kind, path, keyword)
);

CREATE TABLE IF NOT EXISTS public.seo_intel_page_profiles (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  profile jsonb not null default '{}'::jsonb,
  competitive_gap_score numeric,
  gap_factors jsonb not null default '{}'::jsonb,
  confidence text not null default 'low',
  summary text,
  updated_at timestamptz not null default now()
);

CREATE TABLE IF NOT EXISTS public.seo_intel_rec_outcomes (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  change_type text not null default 'any',
  implemented integer not null default 0,
  succeeded integer not null default 0,
  failed integer not null default 0,
  inconclusive integer not null default 0,
  avg_position_delta numeric,
  avg_ctr_delta numeric,
  avg_days_to_impact numeric,
  samples jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  unique (category, change_type)
);

CREATE TABLE IF NOT EXISTS public.seo_intel_graph_edges (
  id uuid primary key default gen_random_uuid(),
  from_type text not null,
  from_id text not null,
  edge text not null,
  to_type text not null,
  to_id text not null,
  weight numeric,
  evidence jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (from_type, from_id, edge, to_type, to_id)
);

CREATE TABLE IF NOT EXISTS public.seo_intel_strategy (
  id uuid primary key default gen_random_uuid(),
  generated_at timestamptz not null default now(),
  horizon text not null default '30d',
  summary text,
  priorities jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  confidence text not null default 'medium',
  data_coverage jsonb not null default '{}'::jsonb
);

-- recommendation lifecycle + dedup + attribution
ALTER TABLE public.seo_intel_recommendations
  ADD COLUMN IF NOT EXISTS state text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS dedupe_hash text,
  ADD COLUMN IF NOT EXISTS occurrences integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS validation jsonb,
  ADD COLUMN IF NOT EXISTS evidence_score numeric,
  ADD COLUMN IF NOT EXISTS impact_confidence text,
  ADD COLUMN IF NOT EXISTS opportunity_score numeric;
CREATE UNIQUE INDEX IF NOT EXISTS seo_recs_dedupe ON public.seo_intel_recommendations(dedupe_hash) WHERE dedupe_hash IS NOT NULL;

ALTER TABLE public.seo_intel_experiments
  ADD COLUMN IF NOT EXISTS impact_confidence text,
  ADD COLUMN IF NOT EXISTS attribution jsonb;

-- grants + RLS (admin-only, same pattern as the rest of the engine)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'seo_intel_kw_sources','seo_intel_demand','seo_intel_intent','seo_intel_serp',
    'seo_intel_volatility','seo_intel_forecasts','seo_intel_cannibalization',
    'seo_intel_content_gaps','seo_intel_entities','seo_intel_link_opportunities',
    'seo_intel_ctr_intel','seo_intel_anomalies','seo_intel_opportunities',
    'seo_intel_page_profiles','seo_intel_rec_outcomes','seo_intel_graph_edges','seo_intel_strategy'
  ]
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = t AND policyname = 'Admins manage ' || t) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (has_role(auth.uid(), ''admin''::app_role)) WITH CHECK (has_role(auth.uid(), ''admin''::app_role))',
        'Admins manage ' || t, t);
    END IF;
  END LOOP;
END $$;