-- ============ Content Pruning engine ============

CREATE TABLE public.pruning_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'queued',
  phase TEXT NOT NULL DEFAULT 'inventory',
  scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  triggered_by UUID,
  total_pages INTEGER NOT NULL DEFAULT 0,
  inventoried_count INTEGER NOT NULL DEFAULT 0,
  signals_count INTEGER NOT NULL DEFAULT 0,
  analyzed_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  executed_count INTEGER NOT NULL DEFAULT 0,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  impact_report JSONB,
  error TEXT,
  logs JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pruning_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID REFERENCES public.pruning_runs(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  path TEXT NOT NULL,
  page_type TEXT NOT NULL DEFAULT 'other',
  source_table TEXT,
  source_id TEXT,
  slug TEXT,
  page_name TEXT,
  state TEXT,
  city TEXT,
  author TEXT,
  meta_title TEXT,
  meta_description TEXT,
  h1 TEXT,
  word_count INTEGER NOT NULL DEFAULT 0,
  heading_count INTEGER NOT NULL DEFAULT 0,
  faq_count INTEGER NOT NULL DEFAULT 0,
  has_schema BOOLEAN NOT NULL DEFAULT false,
  thin_content BOOLEAN NOT NULL DEFAULT false,
  readability NUMERIC,
  repetition_score NUMERIC,
  stale_facts JSONB NOT NULL DEFAULT '[]'::jsonb,
  published_at TIMESTAMPTZ,
  content_updated_at TIMESTAMPTZ,
  days_since_update INTEGER,
  primary_keyword TEXT,
  secondary_keyword TEXT,
  canonical_url TEXT,
  robots TEXT,
  in_sitemap BOOLEAN NOT NULL DEFAULT true,
  index_state TEXT,
  clicks INTEGER NOT NULL DEFAULT 0,
  impressions INTEGER NOT NULL DEFAULT 0,
  ctr NUMERIC NOT NULL DEFAULT 0,
  avg_position NUMERIC,
  clicks_prev INTEGER NOT NULL DEFAULT 0,
  impressions_prev INTEGER NOT NULL DEFAULT 0,
  sessions INTEGER NOT NULL DEFAULT 0,
  engagement_rate NUMERIC,
  internal_links_in INTEGER NOT NULL DEFAULT 0,
  internal_links_out INTEGER NOT NULL DEFAULT 0,
  broken_links INTEGER NOT NULL DEFAULT 0,
  is_orphan BOOLEAN NOT NULL DEFAULT false,
  backlinks INTEGER NOT NULL DEFAULT 0,
  psi_score NUMERIC,
  content_hash TEXT,
  shingles TEXT[],
  duplicate_cluster_id UUID,
  seo_score NUMERIC,
  content_score NUMERIC,
  freshness_score NUMERIC,
  authority_score NUMERIC,
  opportunity_score NUMERIC,
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  signals_at TIMESTAMPTZ,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pruning_pages_url_key UNIQUE (url)
);

CREATE INDEX pruning_pages_type_idx ON public.pruning_pages(page_type);
CREATE INDEX pruning_pages_run_idx ON public.pruning_pages(run_id);
CREATE INDEX pruning_pages_cluster_idx ON public.pruning_pages(duplicate_cluster_id);
CREATE INDEX pruning_pages_hash_idx ON public.pruning_pages(content_hash);

CREATE TABLE public.pruning_duplicate_clusters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID REFERENCES public.pruning_runs(id) ON DELETE CASCADE,
  cluster_type TEXT NOT NULL DEFAULT 'near_duplicate',
  signature TEXT,
  member_urls TEXT[] NOT NULL DEFAULT '{}',
  survivor_url TEXT,
  similarity NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.pruning_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID REFERENCES public.pruning_runs(id) ON DELETE CASCADE,
  page_id UUID REFERENCES public.pruning_pages(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  page_type TEXT,
  recommendation TEXT NOT NULL,
  target_url TEXT,
  problem TEXT,
  reason TEXT,
  seo_impact TEXT,
  solution TEXT,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  priority TEXT NOT NULL DEFAULT 'medium',
  expected_improvement TEXT,
  difficulty TEXT,
  confidence NUMERIC,
  competing_urls TEXT[] NOT NULL DEFAULT '{}',
  ai_summary TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX pruning_recs_run_idx ON public.pruning_recommendations(run_id);
CREATE INDEX pruning_recs_status_idx ON public.pruning_recommendations(status);
CREATE INDEX pruning_recs_rec_idx ON public.pruning_recommendations(recommendation);

CREATE TABLE public.pruning_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID REFERENCES public.pruning_runs(id) ON DELETE SET NULL,
  recommendation_id UUID REFERENCES public.pruning_recommendations(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  actor_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  revert_payload JSONB,
  reverted_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX pruning_actions_run_idx ON public.pruning_actions(run_id);

CREATE TABLE public.seo_redirects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_path TEXT NOT NULL,
  to_path TEXT NOT NULL,
  status_code INTEGER NOT NULL DEFAULT 301,
  reason TEXT,
  source TEXT NOT NULL DEFAULT 'content_pruning',
  is_active BOOLEAN NOT NULL DEFAULT true,
  hit_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT seo_redirects_from_key UNIQUE (from_path)
);

CREATE INDEX seo_redirects_active_idx ON public.seo_redirects(is_active);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pruning_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pruning_pages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pruning_recommendations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pruning_duplicate_clusters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pruning_actions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_redirects TO authenticated;
GRANT SELECT ON public.seo_redirects TO anon;
GRANT ALL ON public.pruning_runs TO service_role;
GRANT ALL ON public.pruning_pages TO service_role;
GRANT ALL ON public.pruning_recommendations TO service_role;
GRANT ALL ON public.pruning_duplicate_clusters TO service_role;
GRANT ALL ON public.pruning_actions TO service_role;
GRANT ALL ON public.seo_redirects TO service_role;

-- RLS
ALTER TABLE public.pruning_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pruning_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pruning_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pruning_duplicate_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pruning_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_redirects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage pruning runs" ON public.pruning_runs
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage pruning pages" ON public.pruning_pages
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage pruning recommendations" ON public.pruning_recommendations
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage pruning clusters" ON public.pruning_duplicate_clusters
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage pruning actions" ON public.pruning_actions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage seo redirects" ON public.seo_redirects
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read active redirects" ON public.seo_redirects
  FOR SELECT TO anon, authenticated USING (is_active = true);

-- updated_at triggers
CREATE TRIGGER pruning_runs_touch BEFORE UPDATE ON public.pruning_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER pruning_pages_touch BEFORE UPDATE ON public.pruning_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER pruning_recs_touch BEFORE UPDATE ON public.pruning_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER pruning_clusters_touch BEFORE UPDATE ON public.pruning_duplicate_clusters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER seo_redirects_touch BEFORE UPDATE ON public.seo_redirects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();