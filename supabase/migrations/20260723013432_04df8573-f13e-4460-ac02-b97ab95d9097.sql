
-- Re-SEO queue tables
CREATE TABLE IF NOT EXISTS public.seo_reoptimization_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT,
  scope TEXT NOT NULL DEFAULT 'selected',
  total_items INT NOT NULL DEFAULT 0,
  processed INT NOT NULL DEFAULT 0,
  succeeded INT NOT NULL DEFAULT 0,
  failed INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued',
  started_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  options JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_reoptimization_runs TO authenticated;
GRANT ALL ON public.seo_reoptimization_runs TO service_role;
ALTER TABLE public.seo_reoptimization_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage reseo runs" ON public.seo_reoptimization_runs
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.seo_reoptimization_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.seo_reoptimization_runs(id) ON DELETE CASCADE,
  page_type TEXT NOT NULL,
  page_id TEXT,
  slug TEXT NOT NULL,
  url TEXT NOT NULL,
  page_name TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  stage TEXT,
  old_primary_keyword TEXT,
  new_primary_keyword TEXT,
  secondary_keyword TEXT,
  search_intent TEXT,
  rewrite_applied BOOLEAN DEFAULT false,
  before_snapshot JSONB,
  after_snapshot JSONB,
  competitors JSONB,
  score_before INT,
  score_after INT,
  error TEXT,
  attempts INT NOT NULL DEFAULT 0,
  locked_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seo_reoptimization_items TO authenticated;
GRANT ALL ON public.seo_reoptimization_items TO service_role;
ALTER TABLE public.seo_reoptimization_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage reseo items" ON public.seo_reoptimization_items
  FOR ALL TO authenticated USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_reseo_items_run ON public.seo_reoptimization_items(run_id);
CREATE INDEX IF NOT EXISTS idx_reseo_items_status ON public.seo_reoptimization_items(status);

-- Extend page_seo_overrides with primary/secondary keyword + intent tracking
ALTER TABLE public.page_seo_overrides
  ADD COLUMN IF NOT EXISTS primary_keyword TEXT,
  ADD COLUMN IF NOT EXISTS secondary_keyword TEXT,
  ADD COLUMN IF NOT EXISTS search_intent TEXT,
  ADD COLUMN IF NOT EXISTS last_reoptimized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reoptimization_run_id UUID;
