CREATE TABLE public.bulk_section_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  total_rows INTEGER NOT NULL DEFAULT 0,
  total_steps INTEGER NOT NULL DEFAULT 0,
  steps_done INTEGER NOT NULL DEFAULT 0,
  not_found INTEGER NOT NULL DEFAULT 0,
  succeeded INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_activity TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bulk_section_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bulk_section_jobs"
ON public.bulk_section_jobs FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_bulk_section_jobs_updated_at
BEFORE UPDATE ON public.bulk_section_jobs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();