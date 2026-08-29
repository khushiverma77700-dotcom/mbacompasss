-- ============================================================
-- AI SEO Intelligence Center — data spine
-- ============================================================

-- 1. Settings (singleton)
CREATE TABLE public.seo_intel_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  engine_enabled boolean NOT NULL DEFAULT false,
  schedule_mode text NOT NULL DEFAULT 'always' CHECK (schedule_mode IN ('always','window')),
  window_start time NOT NULL DEFAULT '18:00',
  window_end time NOT NULL DEFAULT '23:00',
  active_days int[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  timezone text NOT NULL DEFAULT 'Asia/Kolkata',
  freq_monitor_min int NOT NULL DEFAULT 360,
  freq_rank_min int NOT NULL DEFAULT 1440,
  freq_competitor_min int NOT NULL DEFAULT 1440,
  freq_crawl_min int NOT NULL DEFAULT 1440,
  freq_report_min int NOT NULL DEFAULT 1440,
  auto_apply_safe boolean NOT NULL DEFAULT false,
  gsc_site_url text,
  semrush_database text NOT NULL DEFAULT 'in',
  semrush_campaign_id text,
  max_pages_per_run int NOT NULL DEFAULT 25,
  cron_token text NOT NULL DEFAULT encode(gen_random_bytes(24),'hex'),
  paused_reason text,
  last_full_scan_at timestamptz,
  last_report_at timestamptz,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Data sources
CREATE TABLE public.seo_intel_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE,
  label text NOT NULL,
  kind text NOT NULL DEFAULT 'api',
  configured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'not_connected' CHECK (status IN ('connected','not_connected','error')),
  last_sync_at timestamptz,
  next_sync_at timestamptz,
  last_tested_at timestamptz,
  last_error text,
  usage jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Job queue
CREATE TABLE public.seo_intel_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed','parked','cancelled')),
  priority int NOT NULL DEFAULT 5,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_source text,
  dedupe_key text,
  records_processed int NOT NULL DEFAULT 0,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text,
  retry_count int NOT NULL DEFAULT 0,
  max_retries int NOT NULL DEFAULT 3,
  lease_until timestamptz,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  triggered_by text NOT NULL DEFAULT 'scheduler',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX seo_intel_jobs_pick_idx ON public.seo_intel_jobs (status, scheduled_for, priority);
CREATE UNIQUE INDEX seo_intel_jobs_dedupe_idx ON public.seo_intel_jobs (dedupe_key)
  WHERE dedupe_key IS NOT NULL AND status IN ('queued','running');

-- 4. Activity log
CREATE TABLE public.seo_intel_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid,
  job_type text,
  level text NOT NULL DEFAULT 'info' CHECK (level IN ('info','success','warn','error')),
  event text NOT NULL,
  detail text,
  data_source text,
  records int,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX seo_intel_activity_created_idx ON public.seo_intel_activity (created_at DESC);

-- 5. Pages
CREATE TABLE public.seo_intel_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL UNIQUE,
  page_type text,
  entity_slug text,
  entity_name text,
  category text,
  title text,
  meta_description text,
  h1 text,
  heading_count int,
  word_count int,
  has_schema boolean,
  schema_types text[],
  internal_links_out int,
  internal_links_in int,
  indexed_status text,
  indexed_checked_at timestamptz,
  health_score numeric,
  health_issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  clicks int,
  impressions int,
  ctr numeric,
  avg_position numeric,
  prev_clicks int,
  prev_impressions int,
  prev_avg_position numeric,
  position_change numeric,
  perf_window text,
  perf_start_date date,
  perf_end_date date,
  primary_keyword text,
  target_keywords text[],
  top_competitor_domain text,
  top_competitor_position numeric,
  priority text,
  status text,
  data_sources jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_crawl_at timestamptz,
  perf_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX seo_intel_pages_type_idx ON public.seo_intel_pages (page_type);

CREATE TABLE public.seo_intel_page_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  captured_on date NOT NULL DEFAULT (now())::date,
  clicks int,
  impressions int,
  ctr numeric,
  avg_position numeric,
  indexed_status text,
  health_score numeric,
  data_source text NOT NULL DEFAULT 'gsc',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX seo_intel_page_history_uniq ON public.seo_intel_page_history (path, captured_on, data_source);

-- 6. Keywords
CREATE TABLE public.seo_intel_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  locale text NOT NULL DEFAULT 'in',
  target_path text,
  search_volume int,
  volume_source text,
  difficulty numeric,
  difficulty_source text,
  competition numeric,
  cpc numeric,
  monthly_trend jsonb,
  clicks int,
  impressions int,
  ctr numeric,
  current_position numeric,
  previous_position numeric,
  position_change numeric,
  position_source text,
  best_position numeric,
  first_seen_on date,
  is_tracked boolean NOT NULL DEFAULT true,
  intent text,
  opportunity_score numeric,
  top_competitor_domain text,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX seo_intel_keywords_uniq ON public.seo_intel_keywords (keyword, locale);

CREATE TABLE public.seo_intel_rank_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword text NOT NULL,
  locale text NOT NULL DEFAULT 'in',
  captured_on date NOT NULL DEFAULT (now())::date,
  position numeric,
  clicks int,
  impressions int,
  ctr numeric,
  path text,
  data_source text NOT NULL DEFAULT 'gsc',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX seo_intel_rank_history_uniq ON public.seo_intel_rank_history (keyword, locale, captured_on, data_source);

-- 7. Competitors
CREATE TABLE public.seo_intel_competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  keyword text,
  our_path text,
  their_url text,
  their_position numeric,
  our_position numeric,
  title text,
  meta_description text,
  headings jsonb,
  schema_types text[],
  faq_count int,
  word_count int,
  last_updated_on date,
  serp_features text[],
  content_gaps jsonb,
  why_outranking text,
  what_to_change text,
  data_source text,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX seo_intel_competitors_uniq ON public.seo_intel_competitors (domain, coalesce(keyword,''));

CREATE TABLE public.seo_intel_competitor_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text NOT NULL,
  keyword text,
  captured_on date NOT NULL DEFAULT (now())::date,
  position numeric,
  our_position numeric,
  data_source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX seo_intel_competitor_history_uniq
  ON public.seo_intel_competitor_history (domain, coalesce(keyword,''), captured_on);

-- 8. Recommendations
CREATE TABLE public.seo_intel_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text,
  page_type text,
  keyword text,
  category text NOT NULL DEFAULT 'general',
  change_type text,
  problem text NOT NULL,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  why_it_matters text,
  recommended_change text,
  before_value text,
  after_value text,
  expected_impact text,
  confidence numeric,
  priority text NOT NULL DEFAULT 'medium',
  data_source text,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','review','approved','rejected','applied','failed','superseded','verified','no_change')),
  auto_appliable boolean NOT NULL DEFAULT false,
  reviewed_by uuid,
  reviewed_at timestamptz,
  applied_at timestamptz,
  applied_by uuid,
  verification jsonb,
  verified_at timestamptz,
  ai_model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX seo_intel_recs_status_idx ON public.seo_intel_recommendations (status, priority, created_at DESC);

-- 9. Tasks
CREATE TABLE public.seo_intel_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_no bigserial,
  path text,
  entity_name text,
  keyword text,
  task_type text NOT NULL DEFAULT 'seo_change',
  issue text NOT NULL,
  recommendation text,
  recommendation_id uuid,
  priority text NOT NULL DEFAULT 'medium',
  due_date date,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','review','approved','in_progress','applied','submitted','waiting_verification','completed','rejected','failed','reopened')),
  requires_human boolean NOT NULL DEFAULT false,
  assignee text,
  data_source text,
  before_value text,
  after_value text,
  verification_result text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX seo_intel_tasks_status_idx ON public.seo_intel_tasks (status, priority);

CREATE TABLE public.seo_intel_console_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  action text NOT NULL DEFAULT 'request_indexing',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','submitted','waiting_verification','verified','completed','failed')),
  reason text,
  coverage_state text,
  last_inspected_at timestamptz,
  inspection jsonb,
  submitted_at timestamptz,
  submitted_by uuid,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX seo_intel_console_tasks_uniq ON public.seo_intel_console_tasks (url, action)
  WHERE status <> 'completed';

-- 10. Experiments
CREATE TABLE public.seo_intel_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text,
  keyword text,
  recommendation_id uuid,
  change_type text,
  change_summary text,
  before_value text,
  after_value text,
  baseline_position numeric,
  baseline_clicks int,
  baseline_impressions int,
  baseline_captured_on date,
  result_position numeric,
  result_clicks int,
  result_impressions int,
  result_captured_on date,
  position_delta numeric,
  clicks_delta int,
  outcome text CHECK (outcome IS NULL OR outcome IN ('improved','no_change','declined','pending')),
  changed_on date NOT NULL DEFAULT (now())::date,
  measure_after date,
  data_source text,
  ai_analysis text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 11. Reports
CREATE TABLE public.seo_intel_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL CHECK (report_type IN ('daily','weekly','full_scan')),
  period_start date,
  period_end date,
  summary text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_sources jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX seo_intel_reports_idx ON public.seo_intel_reports (report_type, created_at DESC);

-- 12. Notifications
CREATE TABLE public.seo_intel_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warn','critical')),
  title text NOT NULL,
  body text,
  path text,
  keyword text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX seo_intel_notifications_idx ON public.seo_intel_notifications (is_read, created_at DESC);

-- 13. Audit log
CREATE TABLE public.seo_intel_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid,
  actor_label text,
  action text NOT NULL,
  entity text,
  entity_id text,
  path text,
  before_value jsonb,
  after_value jsonb,
  data_source text,
  recommendation_id uuid,
  verification_result text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX seo_intel_audit_idx ON public.seo_intel_audit (created_at DESC);

-- ============================================================
-- Grants + RLS (admin-only; workers use the service role)
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'seo_intel_settings','seo_intel_sources','seo_intel_jobs','seo_intel_activity',
    'seo_intel_pages','seo_intel_page_history','seo_intel_keywords','seo_intel_rank_history',
    'seo_intel_competitors','seo_intel_competitor_history','seo_intel_recommendations',
    'seo_intel_tasks','seo_intel_console_tasks','seo_intel_experiments',
    'seo_intel_reports','seo_intel_notifications','seo_intel_audit'
  ]
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY "Admins manage %1$s" ON public.%1$I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))',
      t);
  END LOOP;
END $$;

GRANT USAGE, SELECT ON SEQUENCE public.seo_intel_tasks_task_no_seq TO authenticated, service_role;

-- updated_at triggers
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'seo_intel_settings','seo_intel_sources','seo_intel_jobs','seo_intel_pages',
    'seo_intel_keywords','seo_intel_competitors','seo_intel_recommendations',
    'seo_intel_tasks','seo_intel_console_tasks','seo_intel_experiments'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %1$s_set_updated_at BEFORE UPDATE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()',
      t);
  END LOOP;
END $$;

-- Seed the singleton settings row and the known data sources
INSERT INTO public.seo_intel_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.seo_intel_sources (source_key, label, kind, notes) VALUES
  ('search_console','Google Search Console','api','Actual clicks, impressions, CTR and average position per page and query.'),
  ('gsc_url_inspection','Search Console URL Inspection','api','Actual indexing / coverage state per URL.'),
  ('semrush','Semrush','api','Search volume, difficulty, SERP competitors and keyword gaps.'),
  ('semrush_tracking','Semrush Position Tracking','api','Daily per-keyword ranking from your Semrush campaigns.'),
  ('firecrawl','Firecrawl','api','Live page and competitor page crawling.'),
  ('pagespeed','PageSpeed Insights','api','Core Web Vitals and performance signals.'),
  ('openai','OpenAI (Vaibhav / Suyash)','ai','Recommendation and analysis generation.')
ON CONFLICT (source_key) DO NOTHING;