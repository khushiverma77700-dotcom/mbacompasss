-- 1) Keyword research store (per record)
CREATE TABLE IF NOT EXISTS public.seo_keyword_research (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL CHECK (content_type IN ('college','institute','article','category','exam','city_page','static')),
  record_id uuid NOT NULL,
  primary_keyword text,
  keywords jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_count integer NOT NULL DEFAULT 0,
  mode text DEFAULT 'comprehensive',
  generated_by uuid,
  generated_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_type, record_id)
);

CREATE INDEX IF NOT EXISTS idx_seo_keyword_research_record
  ON public.seo_keyword_research (content_type, record_id);

ALTER TABLE public.seo_keyword_research ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage seo_keyword_research"
  ON public.seo_keyword_research
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Public can read seo_keyword_research"
  ON public.seo_keyword_research
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE TRIGGER trg_seo_keyword_research_updated_at
  BEFORE UPDATE ON public.seo_keyword_research
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Validation reports
CREATE TABLE IF NOT EXISTS public.seo_validation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  record_id uuid NOT NULL,
  url text,
  passed boolean NOT NULL,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_count integer NOT NULL DEFAULT 0,
  warning_count integer NOT NULL DEFAULT 0,
  validated_by uuid,
  validated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seo_validation_reports_record
  ON public.seo_validation_reports (content_type, record_id);
CREATE INDEX IF NOT EXISTS idx_seo_validation_reports_passed
  ON public.seo_validation_reports (passed, validated_at DESC);

ALTER TABLE public.seo_validation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage seo_validation_reports"
  ON public.seo_validation_reports
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));