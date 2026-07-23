CREATE TABLE public.seo_reoptimization_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid REFERENCES public.seo_reoptimization_runs(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.seo_reoptimization_items(id) ON DELETE CASCADE,
  url text NOT NULL,
  slug text,
  page_type text,
  page_name text,
  action text NOT NULL,
  actor_id uuid,
  actor_role text,
  primary_keyword text,
  secondary_keyword text,
  score_before integer,
  score_after integer,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  before_snapshot jsonb,
  after_snapshot jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.seo_reoptimization_audit_log TO authenticated;
GRANT ALL ON public.seo_reoptimization_audit_log TO service_role;

ALTER TABLE public.seo_reoptimization_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read reseo audit log"
  ON public.seo_reoptimization_audit_log FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role writes reseo audit log"
  ON public.seo_reoptimization_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_reseo_audit_run ON public.seo_reoptimization_audit_log(run_id, created_at DESC);
CREATE INDEX idx_reseo_audit_slug ON public.seo_reoptimization_audit_log(slug, created_at DESC);
CREATE INDEX idx_reseo_audit_action ON public.seo_reoptimization_audit_log(action, created_at DESC);