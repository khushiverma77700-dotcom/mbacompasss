
-- 1) SEO columns on courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS h1_tag text,
  ADD COLUMN IF NOT EXISTS primary_keyword text,
  ADD COLUMN IF NOT EXISTS keywords text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS long_tail_keywords text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS og_title text,
  ADD COLUMN IF NOT EXISTS og_description text,
  ADD COLUMN IF NOT EXISTS og_image text,
  ADD COLUMN IF NOT EXISTS twitter_title text,
  ADD COLUMN IF NOT EXISTS twitter_description text,
  ADD COLUMN IF NOT EXISTS twitter_image text,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS schema_jsonld jsonb,
  ADD COLUMN IF NOT EXISTS faqs jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS seo_score integer,
  ADD COLUMN IF NOT EXISTS last_seo_refresh timestamptz;

-- Institutes already have meta_title/meta_description/keywords/h1_tag/primary_keyword.
-- Add the rest for symmetry.
ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS long_tail_keywords text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS og_title text,
  ADD COLUMN IF NOT EXISTS og_description text,
  ADD COLUMN IF NOT EXISTS og_image text,
  ADD COLUMN IF NOT EXISTS twitter_title text,
  ADD COLUMN IF NOT EXISTS twitter_description text,
  ADD COLUMN IF NOT EXISTS twitter_image text,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS schema_jsonld jsonb,
  ADD COLUMN IF NOT EXISTS seo_score integer;

-- 2) Jobs table
CREATE TABLE IF NOT EXISTS public.bulk_seo_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid,
  target_type text NOT NULL CHECK (target_type IN ('institute','course')),
  label text,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_items int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulk_seo_jobs TO authenticated;
GRANT ALL ON public.bulk_seo_jobs TO service_role;
ALTER TABLE public.bulk_seo_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage seo jobs" ON public.bulk_seo_jobs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_bulk_seo_jobs_uat BEFORE UPDATE ON public.bulk_seo_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Items table
CREATE TABLE IF NOT EXISTS public.bulk_seo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.bulk_seo_jobs(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('institute','course')),
  target_id uuid NOT NULL,
  target_name text,
  status text NOT NULL DEFAULT 'pending',
  progress_step text,
  error_message text,
  retry_count int NOT NULL DEFAULT 0,
  worker_lock_until timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  seo_score int,
  tokens_used int DEFAULT 0,
  cost_credits numeric(10,4) DEFAULT 0,
  fields_filled int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulk_seo_items TO authenticated;
GRANT ALL ON public.bulk_seo_items TO service_role;
ALTER TABLE public.bulk_seo_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage seo items" ON public.bulk_seo_items FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER trg_bulk_seo_items_uat BEFORE UPDATE ON public.bulk_seo_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_bulk_seo_items_job ON public.bulk_seo_items(job_id);
CREATE INDEX IF NOT EXISTS idx_bulk_seo_items_status ON public.bulk_seo_items(status);
