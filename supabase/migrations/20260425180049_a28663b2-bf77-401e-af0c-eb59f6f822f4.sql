CREATE TABLE IF NOT EXISTS public.safe_browsing_flagged_urls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  category text NOT NULL DEFAULT 'uncategorized',
  status text NOT NULL DEFAULT 'pending',
  notes text,
  flagged_reason text,
  reported_at timestamptz NOT NULL DEFAULT now(),
  audited_at timestamptz,
  resolved_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT safe_browsing_url_unique UNIQUE (url),
  CONSTRAINT safe_browsing_status_chk CHECK (status IN ('pending','auditing','fixed','false_positive','resolved')),
  CONSTRAINT safe_browsing_category_chk CHECK (category IN (
    'login_auth','user_forms','public_assets','third_party_scripts',
    'redirects_iframes','user_generated_content','admin_pages','uncategorized'
  ))
);

CREATE INDEX IF NOT EXISTS sb_flagged_status_idx ON public.safe_browsing_flagged_urls(status);
CREATE INDEX IF NOT EXISTS sb_flagged_category_idx ON public.safe_browsing_flagged_urls(category);

ALTER TABLE public.safe_browsing_flagged_urls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage safe_browsing_flagged_urls"
  ON public.safe_browsing_flagged_urls
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_safe_browsing_flagged_urls_updated_at
  BEFORE UPDATE ON public.safe_browsing_flagged_urls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();