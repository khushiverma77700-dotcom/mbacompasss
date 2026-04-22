
CREATE TABLE public.audit_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone,
  status text NOT NULL DEFAULT 'running',
  mode text NOT NULL DEFAULT 'audit',
  triggered_by uuid,
  pages_scanned integer NOT NULL DEFAULT 0,
  issues_found integer NOT NULL DEFAULT 0,
  fixes_applied integer NOT NULL DEFAULT 0,
  pending_issues integer NOT NULL DEFAULT 0,
  overall_score integer,
  report jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_step_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id uuid NOT NULL REFERENCES public.audit_runs(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  step_key text NOT NULL,
  step_label text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  pages_affected integer NOT NULL DEFAULT 0,
  summary text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration_ms integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_runs_started_at ON public.audit_runs (started_at DESC);
CREATE INDEX idx_audit_step_logs_run_id ON public.audit_step_logs (run_id, step_number);

ALTER TABLE public.audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_step_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage audit_runs" ON public.audit_runs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage audit_step_logs" ON public.audit_step_logs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
