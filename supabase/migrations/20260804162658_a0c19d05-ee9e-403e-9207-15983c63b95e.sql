-- ============================================================================
-- SEO Automation Suite: signals, page health, intent, decay, entities, pipeline
-- ============================================================================

/* --------------------------- shared settings ---------------------------- */
CREATE TABLE public.seo_engine_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  intent_enabled boolean NOT NULL DEFAULT true,
  decay_enabled boolean NOT NULL DEFAULT true,
  entity_enabled boolean NOT NULL DEFAULT true,
  postpublish_enabled boolean NOT NULL DEFAULT true,
  auto_apply_safe_actions boolean NOT NULL DEFAULT false,
  decay_click_drop_pct numeric NOT NULL DEFAULT 25,
  decay_min_impressions integer NOT NULL DEFAULT 50,
  cannibalization_min_overlap numeric NOT NULL DEFAULT 0.6,
  max_actions_per_run integer NOT NULL DEFAULT 100,
  gsc_site_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.seo_engine_settings TO authenticated;
GRANT ALL ON public.seo_engine_settings TO service_role;
ALTER TABLE public.seo_engine_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage seo engine settings" ON public.seo_engine_settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.seo_engine_settings (id) VALUES (true);

/* ------------------------- search console signals ----------------------- */
CREATE TABLE public.gsc_page_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  window_label text NOT NULL CHECK (window_label IN ('current','previous','prior90')),
  start_date date,
  end_date date,
  clicks integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  ctr numeric NOT NULL DEFAULT 0,
  avg_position numeric,
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (path, window_label)
);
CREATE INDEX idx_gsc_page_metrics_path ON public.gsc_page_metrics (path);
GRANT SELECT ON public.gsc_page_metrics TO authenticated;
GRANT ALL ON public.gsc_page_metrics TO service_role;
ALTER TABLE public.gsc_page_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read gsc page metrics" ON public.gsc_page_metrics
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.gsc_query_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  query text NOT NULL,
  window_label text NOT NULL DEFAULT 'current',
  clicks integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  ctr numeric NOT NULL DEFAULT 0,
  avg_position numeric,
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (path, query, window_label)
);
CREATE INDEX idx_gsc_query_metrics_query ON public.gsc_query_metrics (query);
CREATE INDEX idx_gsc_query_metrics_path ON public.gsc_query_metrics (path);
GRANT SELECT ON public.gsc_query_metrics TO authenticated;
GRANT ALL ON public.gsc_query_metrics TO service_role;
ALTER TABLE public.gsc_query_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read gsc query metrics" ON public.gsc_query_metrics
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.gsc_ingest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running',
  stage text,
  site_url text,
  pages_ingested integer NOT NULL DEFAULT 0,
  queries_ingested integer NOT NULL DEFAULT 0,
  notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gsc_ingest_runs TO authenticated;
GRANT ALL ON public.gsc_ingest_runs TO service_role;
ALTER TABLE public.gsc_ingest_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read gsc ingest runs" ON public.gsc_ingest_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

/* ------------------------------ page health ----------------------------- */
CREATE TABLE public.seo_page_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL UNIQUE,
  url text,
  page_type text,
  page_name text,
  source_table text,
  source_id uuid,
  health_score numeric NOT NULL DEFAULT 0,
  content_score numeric NOT NULL DEFAULT 0,
  schema_score numeric NOT NULL DEFAULT 0,
  duplication_score numeric NOT NULL DEFAULT 0,
  entity_score numeric NOT NULL DEFAULT 0,
  intent_score numeric NOT NULL DEFAULT 0,
  word_count integer NOT NULL DEFAULT 0,
  schema_valid boolean,
  schema_issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  duplicate_of text,
  duplicate_similarity numeric,
  detected_intent text,
  primary_keyword text,
  entity_coverage numeric,
  missing_entities jsonb NOT NULL DEFAULT '[]'::jsonb,
  decay_state text NOT NULL DEFAULT 'unknown',
  clicks integer NOT NULL DEFAULT 0,
  impressions integer NOT NULL DEFAULT 0,
  ctr numeric NOT NULL DEFAULT 0,
  avg_position numeric,
  index_state text,
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_seo_page_health_type ON public.seo_page_health (page_type);
CREATE INDEX idx_seo_page_health_score ON public.seo_page_health (health_score);
GRANT SELECT ON public.seo_page_health TO authenticated;
GRANT ALL ON public.seo_page_health TO service_role;
ALTER TABLE public.seo_page_health ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read page health" ON public.seo_page_health
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

/* -------------------------- search intent engine ------------------------ */
CREATE TABLE public.intent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running',
  stage text,
  keywords_analyzed integer NOT NULL DEFAULT 0,
  clusters_found integer NOT NULL DEFAULT 0,
  conflicts_found integer NOT NULL DEFAULT 0,
  recommendations integer NOT NULL DEFAULT 0,
  applied integer NOT NULL DEFAULT 0,
  notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.intent_runs TO authenticated;
GRANT ALL ON public.intent_runs TO service_role;
ALTER TABLE public.intent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read intent runs" ON public.intent_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.intent_clusters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.intent_runs(id) ON DELETE CASCADE,
  cluster_key text NOT NULL,
  primary_keyword text NOT NULL,
  intent_type text NOT NULL DEFAULT 'informational',
  sub_intents jsonb NOT NULL DEFAULT '[]'::jsonb,
  keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_impressions integer NOT NULL DEFAULT 0,
  total_clicks integer NOT NULL DEFAULT 0,
  best_position numeric,
  competing_paths jsonb NOT NULL DEFAULT '[]'::jsonb,
  page_count integer NOT NULL DEFAULT 0,
  is_cannibalized boolean NOT NULL DEFAULT false,
  severity text NOT NULL DEFAULT 'low',
  winner_path text,
  winner_reason text,
  needs_new_page boolean NOT NULL DEFAULT false,
  ai_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_intent_clusters_run ON public.intent_clusters (run_id);
GRANT SELECT ON public.intent_clusters TO authenticated;
GRANT ALL ON public.intent_clusters TO service_role;
ALTER TABLE public.intent_clusters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read intent clusters" ON public.intent_clusters
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.intent_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.intent_runs(id) ON DELETE CASCADE,
  cluster_id uuid REFERENCES public.intent_clusters(id) ON DELETE CASCADE,
  action text NOT NULL,
  source_path text,
  source_table text,
  source_id uuid,
  source_field text,
  target_path text,
  anchor_text text,
  keyword text,
  intent_type text,
  title text,
  brief jsonb,
  problem text,
  rationale text,
  seo_impact text,
  expected_impact text,
  priority text NOT NULL DEFAULT 'medium',
  confidence numeric,
  score numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  auto_applied boolean NOT NULL DEFAULT false,
  applied_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_intent_recs_run ON public.intent_recommendations (run_id, status);
GRANT SELECT, UPDATE ON public.intent_recommendations TO authenticated;
GRANT ALL ON public.intent_recommendations TO service_role;
ALTER TABLE public.intent_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage intent recommendations" ON public.intent_recommendations
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.intent_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid,
  recommendation_id uuid,
  action text NOT NULL,
  source_table text,
  source_id uuid,
  source_field text,
  from_path text,
  to_path text,
  status text NOT NULL DEFAULT 'success',
  revert_payload jsonb,
  notes text,
  reverted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.intent_actions TO authenticated;
GRANT ALL ON public.intent_actions TO service_role;
ALTER TABLE public.intent_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read intent actions" ON public.intent_actions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

/* --------------------------- content decay engine ----------------------- */
CREATE TABLE public.decay_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running',
  stage text,
  pages_checked integer NOT NULL DEFAULT 0,
  declining integer NOT NULL DEFAULT 0,
  recommendations integer NOT NULL DEFAULT 0,
  approved integer NOT NULL DEFAULT 0,
  queued_refreshes integer NOT NULL DEFAULT 0,
  notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.decay_runs TO authenticated;
GRANT ALL ON public.decay_runs TO service_role;
ALTER TABLE public.decay_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read decay runs" ON public.decay_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.decay_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.decay_runs(id) ON DELETE CASCADE,
  path text NOT NULL,
  page_type text,
  page_name text,
  source_table text,
  source_id uuid,
  source_field text,
  clicks_current integer NOT NULL DEFAULT 0,
  clicks_previous integer NOT NULL DEFAULT 0,
  impressions_current integer NOT NULL DEFAULT 0,
  impressions_previous integer NOT NULL DEFAULT 0,
  ctr_current numeric NOT NULL DEFAULT 0,
  ctr_previous numeric NOT NULL DEFAULT 0,
  position_current numeric,
  position_previous numeric,
  click_change_pct numeric,
  impression_change_pct numeric,
  position_change numeric,
  decay_type text,
  decay_state text NOT NULL DEFAULT 'stable',
  severity text NOT NULL DEFAULT 'low',
  days_since_update integer,
  stale_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  recovery_potential numeric NOT NULL DEFAULT 0,
  monitoring boolean NOT NULL DEFAULT true,
  first_detected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, path)
);
CREATE INDEX idx_decay_pages_state ON public.decay_pages (decay_state);
GRANT SELECT ON public.decay_pages TO authenticated;
GRANT ALL ON public.decay_pages TO service_role;
ALTER TABLE public.decay_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read decay pages" ON public.decay_pages
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.decay_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.decay_runs(id) ON DELETE CASCADE,
  decay_page_id uuid REFERENCES public.decay_pages(id) ON DELETE CASCADE,
  path text NOT NULL,
  page_name text,
  source_table text,
  source_id uuid,
  source_field text,
  action text NOT NULL DEFAULT 'refresh',
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  refresh_brief text,
  outdated_facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  keyword_gaps jsonb NOT NULL DEFAULT '[]'::jsonb,
  problem text,
  rationale text,
  seo_impact text,
  expected_impact text,
  priority text NOT NULL DEFAULT 'medium',
  confidence numeric,
  score numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  refresh_id uuid,
  approved_at timestamptz,
  applied_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_decay_recs_run ON public.decay_recommendations (run_id, status);
GRANT SELECT, UPDATE ON public.decay_recommendations TO authenticated;
GRANT ALL ON public.decay_recommendations TO service_role;
ALTER TABLE public.decay_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage decay recommendations" ON public.decay_recommendations
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

/* -------------------------- entity stacking engine ---------------------- */
CREATE TABLE public.seo_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  normalized_name text NOT NULL UNIQUE,
  entity_type text NOT NULL DEFAULT 'other',
  aliases jsonb NOT NULL DEFAULT '[]'::jsonb,
  description text,
  official_url text,
  same_as jsonb NOT NULL DEFAULT '[]'::jsonb,
  importance numeric NOT NULL DEFAULT 50,
  page_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_seo_entities_type ON public.seo_entities (entity_type);
GRANT SELECT, INSERT, UPDATE ON public.seo_entities TO authenticated;
GRANT ALL ON public.seo_entities TO service_role;
ALTER TABLE public.seo_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage seo entities" ON public.seo_entities
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.page_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  entity_id uuid NOT NULL REFERENCES public.seo_entities(id) ON DELETE CASCADE,
  mentions integer NOT NULL DEFAULT 0,
  in_schema boolean NOT NULL DEFAULT false,
  in_faq boolean NOT NULL DEFAULT false,
  in_meta boolean NOT NULL DEFAULT false,
  prominence numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (path, entity_id)
);
CREATE INDEX idx_page_entities_path ON public.page_entities (path);
GRANT SELECT ON public.page_entities TO authenticated;
GRANT ALL ON public.page_entities TO service_role;
ALTER TABLE public.page_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read page entities" ON public.page_entities
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.entity_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'running',
  stage text,
  pages_scanned integer NOT NULL DEFAULT 0,
  entities_total integer NOT NULL DEFAULT 0,
  recommendations integer NOT NULL DEFAULT 0,
  applied integer NOT NULL DEFAULT 0,
  notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.entity_runs TO authenticated;
GRANT ALL ON public.entity_runs TO service_role;
ALTER TABLE public.entity_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read entity runs" ON public.entity_runs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.entity_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.entity_runs(id) ON DELETE CASCADE,
  path text NOT NULL,
  page_name text,
  page_type text,
  source_table text,
  source_id uuid,
  source_field text,
  action text NOT NULL,
  entity_id uuid REFERENCES public.seo_entities(id) ON DELETE SET NULL,
  entity_name text,
  entity_type text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  problem text,
  rationale text,
  seo_impact text,
  expected_impact text,
  priority text NOT NULL DEFAULT 'medium',
  confidence numeric,
  score numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  auto_applied boolean NOT NULL DEFAULT false,
  applied_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_entity_recs_run ON public.entity_recommendations (run_id, status);
GRANT SELECT, UPDATE ON public.entity_recommendations TO authenticated;
GRANT ALL ON public.entity_recommendations TO service_role;
ALTER TABLE public.entity_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage entity recommendations" ON public.entity_recommendations
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.entity_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid,
  recommendation_id uuid,
  action text NOT NULL,
  path text,
  source_table text,
  source_id uuid,
  source_field text,
  status text NOT NULL DEFAULT 'success',
  revert_payload jsonb,
  notes text,
  reverted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.entity_actions TO authenticated;
GRANT ALL ON public.entity_actions TO service_role;
ALTER TABLE public.entity_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read entity actions" ON public.entity_actions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

/* -------------------------- post-publish pipeline ----------------------- */
CREATE TABLE public.seo_pipeline_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  path text,
  page_type text,
  page_name text,
  event text NOT NULL DEFAULT 'created',
  status text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  stages_done jsonb NOT NULL DEFAULT '[]'::jsonb,
  health_score numeric,
  duplication_found boolean,
  schema_valid boolean,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  claimed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_seo_pipeline_queue_status ON public.seo_pipeline_queue (status, created_at);
CREATE UNIQUE INDEX idx_seo_pipeline_queue_pending
  ON public.seo_pipeline_queue (source_table, source_id)
  WHERE status IN ('queued','processing');
GRANT SELECT ON public.seo_pipeline_queue TO authenticated;
GRANT ALL ON public.seo_pipeline_queue TO service_role;
ALTER TABLE public.seo_pipeline_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read seo pipeline queue" ON public.seo_pipeline_queue
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

/* ---------------------- updated_at maintenance triggers ----------------- */
CREATE TRIGGER trg_seo_engine_settings_updated BEFORE UPDATE ON public.seo_engine_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_seo_page_health_updated BEFORE UPDATE ON public.seo_page_health
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_intent_recs_updated BEFORE UPDATE ON public.intent_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_decay_recs_updated BEFORE UPDATE ON public.decay_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_entity_recs_updated BEFORE UPDATE ON public.entity_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_seo_pipeline_queue_updated BEFORE UPDATE ON public.seo_pipeline_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_seo_entities_updated BEFORE UPDATE ON public.seo_entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_page_entities_updated BEFORE UPDATE ON public.page_entities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_decay_pages_updated BEFORE UPDATE ON public.decay_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_intent_clusters_updated BEFORE UPDATE ON public.intent_clusters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_gsc_page_metrics_updated BEFORE UPDATE ON public.gsc_page_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

/* ------------------- auto-enqueue newly published pages ---------------- */
CREATE OR REPLACE FUNCTION public.seo_pipeline_enqueue()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_path text;
  v_slug text;
  v_name text;
  v_enabled boolean;
BEGIN
  SELECT postpublish_enabled INTO v_enabled FROM public.seo_engine_settings WHERE id = true;
  IF v_enabled IS DISTINCT FROM true THEN
    RETURN NEW;
  END IF;

  v_slug := to_jsonb(NEW) ->> 'slug';
  IF v_slug IS NULL OR v_slug = '' THEN
    RETURN NEW;
  END IF;

  v_name := COALESCE(to_jsonb(NEW) ->> 'name', to_jsonb(NEW) ->> 'title');
  v_path := CASE TG_TABLE_NAME
    WHEN 'colleges'   THEN '/college/'   || v_slug
    WHEN 'institutes' THEN '/institute/' || v_slug
    WHEN 'articles'   THEN '/article/'   || v_slug
    WHEN 'exams'      THEN '/exam/'      || v_slug
    WHEN 'city_pages' THEN '/colleges/'  || v_slug
    WHEN 'mock_bundles' THEN '/courses/' || v_slug
    WHEN 'mba_compass_courses' THEN '/mba-compass/' || v_slug
    ELSE NULL
  END;

  IF v_path IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.seo_pipeline_queue (source_table, source_id, path, page_type, page_name, event)
  VALUES (
    TG_TABLE_NAME, NEW.id, v_path, TG_TABLE_NAME, v_name,
    CASE WHEN TG_OP = 'INSERT' THEN 'created' ELSE 'updated' END
  )
  ON CONFLICT (source_table, source_id) WHERE status IN ('queued','processing')
  DO UPDATE SET path = EXCLUDED.path, page_name = EXCLUDED.page_name, updated_at = now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seo_pipeline_colleges
  AFTER INSERT ON public.colleges
  FOR EACH ROW EXECUTE FUNCTION public.seo_pipeline_enqueue();
CREATE TRIGGER trg_seo_pipeline_institutes
  AFTER INSERT ON public.institutes
  FOR EACH ROW EXECUTE FUNCTION public.seo_pipeline_enqueue();
CREATE TRIGGER trg_seo_pipeline_articles
  AFTER INSERT ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.seo_pipeline_enqueue();
CREATE TRIGGER trg_seo_pipeline_exams
  AFTER INSERT ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.seo_pipeline_enqueue();
CREATE TRIGGER trg_seo_pipeline_city_pages
  AFTER INSERT ON public.city_pages
  FOR EACH ROW EXECUTE FUNCTION public.seo_pipeline_enqueue();
CREATE TRIGGER trg_seo_pipeline_mock_bundles
  AFTER INSERT ON public.mock_bundles
  FOR EACH ROW EXECUTE FUNCTION public.seo_pipeline_enqueue();
CREATE TRIGGER trg_seo_pipeline_compass_courses
  AFTER INSERT ON public.mba_compass_courses
  FOR EACH ROW EXECUTE FUNCTION public.seo_pipeline_enqueue();

/* --------------------- queue claim helper for the worker --------------- */
CREATE OR REPLACE FUNCTION public.claim_seo_pipeline_items(p_limit integer DEFAULT 5)
RETURNS SETOF public.seo_pipeline_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.seo_pipeline_queue q
  SET status = 'processing', attempts = q.attempts + 1, claimed_at = now()
  WHERE q.id IN (
    SELECT id FROM public.seo_pipeline_queue
    WHERE status = 'queued' AND attempts < 3
    ORDER BY created_at
    LIMIT GREATEST(1, p_limit)
    FOR UPDATE SKIP LOCKED
  )
  RETURNING q.*;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_seo_pipeline_items(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_seo_pipeline_items(integer) TO service_role;