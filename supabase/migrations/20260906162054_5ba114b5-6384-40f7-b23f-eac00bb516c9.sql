-- AI SEO Intelligence Center: real implementation engine
ALTER TABLE public.seo_intel_keywords
  ADD COLUMN IF NOT EXISTS keyword_kind text,
  ADD COLUMN IF NOT EXISTS research_reason text,
  ADD COLUMN IF NOT EXISTS research_source_path text,
  ADD COLUMN IF NOT EXISTS research_round int,
  ADD COLUMN IF NOT EXISTS researched_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_model text,
  ADD COLUMN IF NOT EXISTS injected_at timestamptz;

CREATE INDEX IF NOT EXISTS seo_intel_keywords_research_idx
  ON public.seo_intel_keywords (researched_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.seo_intel_health_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at timestamptz NOT NULL DEFAULT now(),
  avg_health numeric,
  avg_aeo numeric,
  pages_scored int,
  pages_below_70 int,
  issues_open int,
  applied_total int,
  pending_total int,
  applied_24h int,
  delta_health numeric,
  reason text,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS seo_intel_health_history_at_idx
  ON public.seo_intel_health_history (captured_at DESC);

CREATE TABLE IF NOT EXISTS public.seo_intel_page_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  recommendation_id uuid,
  change_type text,
  health_before numeric,
  health_after numeric,
  aeo_before numeric,
  aeo_after numeric,
  issues_before int,
  issues_after int,
  fixes_applied int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  detail text,
  measured_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS seo_intel_page_scores_path_idx ON public.seo_intel_page_scores (path);
CREATE INDEX IF NOT EXISTS seo_intel_page_scores_created_idx ON public.seo_intel_page_scores (created_at DESC);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['seo_intel_health_history','seo_intel_page_scores']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    BEGIN
      EXECUTE format(
        'CREATE POLICY "Admins manage %1$s" ON public.%1$I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))',
        t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;