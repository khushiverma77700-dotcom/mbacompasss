
-- ============ Image SEO Automation System ============

-- 1. image_assets — one row per canonical image URL seen on the site
CREATE TABLE public.image_assets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_url text NOT NULL UNIQUE,
  content_hash text,
  width integer,
  height integer,
  bytes bigint,
  format text,
  alt text,
  title text,
  caption text,
  seo_filename text,
  page_context jsonb NOT NULL DEFAULT '[]'::jsonb,
  variants jsonb NOT NULL DEFAULT '{}'::jsonb,
  lcp_candidate boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'discovered', -- discovered | optimizing | optimized | failed | broken
  status_reason text,
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_optimized_at timestamptz,
  last_audited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_image_assets_status ON public.image_assets (status);
CREATE INDEX idx_image_assets_hash ON public.image_assets (content_hash);
CREATE INDEX idx_image_assets_updated ON public.image_assets (updated_at DESC);

GRANT SELECT ON public.image_assets TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.image_assets TO authenticated;
GRANT ALL ON public.image_assets TO service_role;

ALTER TABLE public.image_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read image_assets"
  ON public.image_assets FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage image_assets"
  ON public.image_assets FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_image_assets_updated_at
  BEFORE UPDATE ON public.image_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 2. image_optimization_jobs — per-upload progress checklist
CREATE TABLE public.image_optimization_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id uuid REFERENCES public.image_assets(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  triggered_by uuid,
  trigger_source text NOT NULL DEFAULT 'upload', -- upload | audit | manual
  status text NOT NULL DEFAULT 'pending', -- pending | running | completed | failed
  steps jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{key,label,status,detail}]
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_image_opt_jobs_status ON public.image_optimization_jobs (status, created_at DESC);
CREATE INDEX idx_image_opt_jobs_asset ON public.image_optimization_jobs (asset_id);

GRANT SELECT, INSERT, UPDATE ON public.image_optimization_jobs TO authenticated;
GRANT ALL ON public.image_optimization_jobs TO service_role;

ALTER TABLE public.image_optimization_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read image_optimization_jobs"
  ON public.image_optimization_jobs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR triggered_by = auth.uid());

CREATE POLICY "Authenticated users insert own image_optimization_jobs"
  ON public.image_optimization_jobs FOR INSERT
  TO authenticated
  WITH CHECK (triggered_by = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update image_optimization_jobs"
  ON public.image_optimization_jobs FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_image_opt_jobs_updated_at
  BEFORE UPDATE ON public.image_optimization_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 3. Storage policies for image-derivatives bucket
-- Public read (URLs are unguessable UUIDs), admin write via service role
CREATE POLICY "Public can read image-derivatives"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'image-derivatives');
