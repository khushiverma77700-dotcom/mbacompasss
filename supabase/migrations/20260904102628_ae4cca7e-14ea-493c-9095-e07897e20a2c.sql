ALTER TABLE public.application_trackers
  ADD COLUMN IF NOT EXISTS short_name TEXT,
  ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recommendation_label TEXT,
  ADD COLUMN IF NOT EXISTS recommendation_note TEXT,
  ADD COLUMN IF NOT EXISTS recommendation_priority INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_package NUMERIC,
  ADD COLUMN IF NOT EXISTS highest_package NUMERIC,
  ADD COLUMN IF NOT EXISTS median_package NUMERIC,
  ADD COLUMN IF NOT EXISTS eligibility TEXT,
  ADD COLUMN IF NOT EXISTS selection_process TEXT,
  ADD COLUMN IF NOT EXISTS cutoff_note TEXT,
  ADD COLUMN IF NOT EXISTS college_website TEXT,
  ADD COLUMN IF NOT EXISTS seo_title TEXT,
  ADD COLUMN IF NOT EXISTS seo_description TEXT,
  ADD COLUMN IF NOT EXISTS seo_h1 TEXT,
  ADD COLUMN IF NOT EXISTS seo_intro TEXT,
  ADD COLUMN IF NOT EXISTS seo_keywords TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS seo_faqs JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS seo_image_alt TEXT;

CREATE INDEX IF NOT EXISTS application_trackers_recommended_idx
  ON public.application_trackers (is_recommended, recommendation_priority DESC);

CREATE TABLE IF NOT EXISTS public.application_filter_prefs (
  user_id UUID NOT NULL PRIMARY KEY,
  deadline_filter TEXT,
  category TEXT,
  exam TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_filter_prefs TO authenticated;
GRANT ALL ON public.application_filter_prefs TO service_role;

ALTER TABLE public.application_filter_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage their own filter preferences"
  ON public.application_filter_prefs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_application_filter_prefs_updated_at
  BEFORE UPDATE ON public.application_filter_prefs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();