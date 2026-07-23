
CREATE TABLE public.seo_health_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'running',
  scope TEXT NOT NULL DEFAULT 'weekly',
  triggered_by UUID,
  pages_total INT NOT NULL DEFAULT 0,
  pages_checked INT NOT NULL DEFAULT 0,
  pages_passing INT NOT NULL DEFAULT 0,
  pages_warning INT NOT NULL DEFAULT 0,
  pages_failing INT NOT NULL DEFAULT 0,
  avg_response_ms INT,
  avg_html_kb INT,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.seo_health_runs TO authenticated;
GRANT ALL ON public.seo_health_runs TO service_role;
ALTER TABLE public.seo_health_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read seo_health_runs" ON public.seo_health_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.seo_health_page_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.seo_health_runs(id) ON DELETE CASCADE,
  page_type TEXT NOT NULL, -- 'category' | 'institute' | 'college' | 'exam' | 'other'
  url TEXT NOT NULL,
  slug TEXT,
  http_status INT,
  response_ms INT,
  html_kb INT,
  is_indexable BOOLEAN,
  has_canonical BOOLEAN,
  canonical_url TEXT,
  title TEXT,
  title_length INT,
  description TEXT,
  description_length INT,
  h1_count INT,
  images_missing_alt INT,
  robots_meta TEXT,
  x_robots_tag TEXT,
  speed_score INT, -- 0-100 derived
  seo_score INT,   -- 0-100 derived
  status TEXT NOT NULL DEFAULT 'unknown', -- 'pass' | 'warn' | 'fail'
  issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX seo_health_page_results_run_idx ON public.seo_health_page_results(run_id);
CREATE INDEX seo_health_page_results_status_idx ON public.seo_health_page_results(status);
CREATE INDEX seo_health_page_results_type_idx ON public.seo_health_page_results(page_type);

GRANT SELECT ON public.seo_health_page_results TO authenticated;
GRANT ALL ON public.seo_health_page_results TO service_role;
ALTER TABLE public.seo_health_page_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read seo_health_page_results" ON public.seo_health_page_results FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
