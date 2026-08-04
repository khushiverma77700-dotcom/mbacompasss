-- ============================ Reverse Siloing Engine ============================

CREATE TABLE public.silo_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'running',
  stage TEXT,
  scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  pages_scanned INTEGER NOT NULL DEFAULT 0,
  edges_found INTEGER NOT NULL DEFAULT 0,
  orphans INTEGER NOT NULL DEFAULT 0,
  weak_hubs INTEGER NOT NULL DEFAULT 0,
  recommendations INTEGER NOT NULL DEFAULT 0,
  applied INTEGER NOT NULL DEFAULT 0,
  triggered_by TEXT,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.silo_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.silo_runs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  page_type TEXT NOT NULL DEFAULT 'other',
  source_table TEXT,
  source_id TEXT,
  slug TEXT,
  page_name TEXT,
  topic TEXT,
  primary_keyword TEXT,
  word_count INTEGER NOT NULL DEFAULT 0,
  is_commercial BOOLEAN NOT NULL DEFAULT false,
  links_in INTEGER NOT NULL DEFAULT 0,
  links_out INTEGER NOT NULL DEFAULT 0,
  unique_sources INTEGER NOT NULL DEFAULT 0,
  pagerank NUMERIC NOT NULL DEFAULT 0,
  authority_score NUMERIC NOT NULL DEFAULT 0,
  anchor_diversity NUMERIC,
  is_orphan BOOLEAN NOT NULL DEFAULT false,
  is_hub BOOLEAN NOT NULL DEFAULT false,
  hub_score NUMERIC NOT NULL DEFAULT 0,
  opportunity_score NUMERIC NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  avg_position NUMERIC,
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (run_id, path)
);
CREATE INDEX silo_pages_run_idx ON public.silo_pages (run_id);
CREATE INDEX silo_pages_authority_idx ON public.silo_pages (run_id, authority_score DESC);
CREATE INDEX silo_pages_orphan_idx ON public.silo_pages (run_id, is_orphan);

CREATE TABLE public.silo_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.silo_runs(id) ON DELETE CASCADE,
  from_path TEXT NOT NULL,
  to_path TEXT NOT NULL,
  anchor_text TEXT,
  source_table TEXT,
  source_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX silo_links_run_from_idx ON public.silo_links (run_id, from_path);
CREATE INDEX silo_links_run_to_idx ON public.silo_links (run_id, to_path);

CREATE TABLE public.silo_link_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.silo_runs(id) ON DELETE CASCADE,
  source_path TEXT NOT NULL,
  source_name TEXT,
  source_table TEXT,
  source_id TEXT,
  source_field TEXT,
  target_path TEXT NOT NULL,
  target_name TEXT,
  target_type TEXT,
  anchor_text TEXT NOT NULL,
  context_snippet TEXT,
  rationale TEXT,
  problem TEXT,
  seo_impact TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  opportunity_score NUMERIC NOT NULL DEFAULT 0,
  authority_before NUMERIC,
  authority_after NUMERIC,
  expected_impact TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  auto_applied BOOLEAN NOT NULL DEFAULT false,
  applied_at TIMESTAMPTZ,
  reviewed_by UUID,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (run_id, source_path, target_path, anchor_text)
);
CREATE INDEX silo_recs_run_status_idx ON public.silo_link_recommendations (run_id, status);
CREATE INDEX silo_recs_score_idx ON public.silo_link_recommendations (run_id, opportunity_score DESC);

CREATE TABLE public.silo_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.silo_runs(id) ON DELETE SET NULL,
  recommendation_id UUID REFERENCES public.silo_link_recommendations(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  source_table TEXT,
  source_id TEXT,
  source_field TEXT,
  from_path TEXT,
  to_path TEXT,
  anchor_text TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  revert_payload JSONB,
  reverted_at TIMESTAMPTZ,
  performed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX silo_actions_run_idx ON public.silo_actions (run_id, created_at DESC);

CREATE TABLE public.silo_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true,
  automation_enabled BOOLEAN NOT NULL DEFAULT true,
  auto_apply_links BOOLEAN NOT NULL DEFAULT false,
  max_links_per_run INTEGER NOT NULL DEFAULT 50,
  max_links_per_page INTEGER NOT NULL DEFAULT 3,
  min_opportunity_score NUMERIC NOT NULL DEFAULT 60,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT silo_settings_singleton CHECK (id)
);
INSERT INTO public.silo_settings (id) VALUES (true) ON CONFLICT DO NOTHING;

-- ---------------------------------- grants ----------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.silo_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.silo_pages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.silo_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.silo_link_recommendations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.silo_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.silo_settings TO authenticated;
GRANT ALL ON public.silo_runs TO service_role;
GRANT ALL ON public.silo_pages TO service_role;
GRANT ALL ON public.silo_links TO service_role;
GRANT ALL ON public.silo_link_recommendations TO service_role;
GRANT ALL ON public.silo_actions TO service_role;
GRANT ALL ON public.silo_settings TO service_role;

-- ------------------------------------ RLS -----------------------------------
ALTER TABLE public.silo_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.silo_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.silo_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.silo_link_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.silo_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.silo_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage silo runs" ON public.silo_runs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage silo pages" ON public.silo_pages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage silo links" ON public.silo_links
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage silo recommendations" ON public.silo_link_recommendations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage silo actions" ON public.silo_actions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage silo settings" ON public.silo_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- --------------------------------- triggers ---------------------------------
CREATE TRIGGER silo_runs_touch BEFORE UPDATE ON public.silo_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER silo_pages_touch BEFORE UPDATE ON public.silo_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER silo_recs_touch BEFORE UPDATE ON public.silo_link_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER silo_settings_touch BEFORE UPDATE ON public.silo_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();