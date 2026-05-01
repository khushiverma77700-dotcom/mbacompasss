
CREATE TABLE public.seo_audit_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'running',
  scope text NOT NULL DEFAULT 'full',
  total_urls integer NOT NULL DEFAULT 0,
  total_issues integer NOT NULL DEFAULT 0,
  critical_issues integer NOT NULL DEFAULT 0,
  warning_issues integer NOT NULL DEFAULT 0,
  info_issues integer NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_audit_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage audit runs"
ON public.seo_audit_runs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.seo_audit_findings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES public.seo_audit_runs(id) ON DELETE CASCADE,
  category text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  url text,
  page_type text,
  record_id uuid,
  issue_code text NOT NULL,
  message text NOT NULL,
  fix_suggestion text,
  fix_action text,
  auto_fixed boolean NOT NULL DEFAULT false,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_seo_audit_findings_run ON public.seo_audit_findings(run_id);
CREATE INDEX idx_seo_audit_findings_category ON public.seo_audit_findings(category);
CREATE INDEX idx_seo_audit_findings_severity ON public.seo_audit_findings(severity);

ALTER TABLE public.seo_audit_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage audit findings"
ON public.seo_audit_findings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
