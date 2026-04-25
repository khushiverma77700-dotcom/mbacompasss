CREATE TABLE IF NOT EXISTS public.bulk_college_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  total_rows INTEGER NOT NULL DEFAULT 0,
  duplicates_skipped INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  succeeded INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  current_activity TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bulk_college_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bulk_college_jobs"
ON public.bulk_college_jobs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_bulk_college_jobs_updated_at
BEFORE UPDATE ON public.bulk_college_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_bulk_college_jobs_created ON public.bulk_college_jobs(created_at DESC);