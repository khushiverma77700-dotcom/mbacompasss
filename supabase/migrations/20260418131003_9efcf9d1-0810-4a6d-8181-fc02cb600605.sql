-- Topic clusters table
CREATE TABLE public.topic_clusters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  pillar_page_type TEXT,
  pillar_record_id UUID,
  primary_keyword TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.topic_clusters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Topic clusters viewable by everyone"
  ON public.topic_clusters FOR SELECT USING (true);

CREATE POLICY "Admins can manage topic_clusters"
  ON public.topic_clusters FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_topic_clusters_updated_at
  BEFORE UPDATE ON public.topic_clusters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add SEO columns to content tables
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS primary_keyword TEXT,
  ADD COLUMN IF NOT EXISTS funnel_stage TEXT,
  ADD COLUMN IF NOT EXISTS cluster_id UUID REFERENCES public.topic_clusters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_seo_refresh TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS content_score INTEGER;

ALTER TABLE public.colleges
  ADD COLUMN IF NOT EXISTS primary_keyword TEXT,
  ADD COLUMN IF NOT EXISTS funnel_stage TEXT,
  ADD COLUMN IF NOT EXISTS cluster_id UUID REFERENCES public.topic_clusters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_seo_refresh TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS content_score INTEGER;

ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS primary_keyword TEXT,
  ADD COLUMN IF NOT EXISTS funnel_stage TEXT,
  ADD COLUMN IF NOT EXISTS cluster_id UUID REFERENCES public.topic_clusters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_seo_refresh TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS content_score INTEGER;

ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS primary_keyword TEXT,
  ADD COLUMN IF NOT EXISTS funnel_stage TEXT,
  ADD COLUMN IF NOT EXISTS cluster_id UUID REFERENCES public.topic_clusters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_seo_refresh TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS content_score INTEGER;

ALTER TABLE public.city_pages
  ADD COLUMN IF NOT EXISTS primary_keyword TEXT,
  ADD COLUMN IF NOT EXISTS funnel_stage TEXT,
  ADD COLUMN IF NOT EXISTS cluster_id UUID REFERENCES public.topic_clusters(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_seo_refresh TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS content_score INTEGER;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_articles_cluster_id ON public.articles(cluster_id);
CREATE INDEX IF NOT EXISTS idx_articles_last_seo_refresh ON public.articles(last_seo_refresh);
CREATE INDEX IF NOT EXISTS idx_colleges_cluster_id ON public.colleges(cluster_id);
CREATE INDEX IF NOT EXISTS idx_colleges_last_seo_refresh ON public.colleges(last_seo_refresh);
CREATE INDEX IF NOT EXISTS idx_institutes_cluster_id ON public.institutes(cluster_id);
CREATE INDEX IF NOT EXISTS idx_institutes_last_seo_refresh ON public.institutes(last_seo_refresh);
CREATE INDEX IF NOT EXISTS idx_exams_cluster_id ON public.exams(cluster_id);
CREATE INDEX IF NOT EXISTS idx_city_pages_cluster_id ON public.city_pages(cluster_id);