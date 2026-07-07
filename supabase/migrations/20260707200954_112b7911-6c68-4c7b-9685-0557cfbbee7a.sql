
CREATE TABLE public.page_seo_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL,
  target_keyword text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  checklist jsonb,
  competitors jsonb,
  keyword_gap jsonb,
  proposal jsonb,
  error text,
  approved boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.page_seo_audits TO authenticated;
GRANT ALL ON public.page_seo_audits TO service_role;

ALTER TABLE public.page_seo_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all audits"
  ON public.page_seo_audits FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audits"
  ON public.page_seo_audits FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update audits"
  ON public.page_seo_audits FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.page_seo_overrides (
  slug text PRIMARY KEY,
  title text,
  description text,
  h1 text,
  intro_html text,
  keywords text[],
  faq jsonb,
  json_ld jsonb,
  og_image text,
  source_audit_id uuid REFERENCES public.page_seo_audits(id) ON DELETE SET NULL,
  applied_by uuid,
  applied_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.page_seo_overrides TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.page_seo_overrides TO authenticated;
GRANT ALL ON public.page_seo_overrides TO service_role;

ALTER TABLE public.page_seo_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read overrides"
  ON public.page_seo_overrides FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can insert overrides"
  ON public.page_seo_overrides FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update overrides"
  ON public.page_seo_overrides FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete overrides"
  ON public.page_seo_overrides FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.tg_page_seo_audits_touch()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER page_seo_audits_touch
  BEFORE UPDATE ON public.page_seo_audits
  FOR EACH ROW EXECUTE FUNCTION public.tg_page_seo_audits_touch();

CREATE TRIGGER page_seo_overrides_touch
  BEFORE UPDATE ON public.page_seo_overrides
  FOR EACH ROW EXECUTE FUNCTION public.tg_page_seo_audits_touch();

CREATE INDEX page_seo_audits_slug_created_idx ON public.page_seo_audits (slug, created_at DESC);
