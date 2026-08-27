ALTER TABLE public.exams
  ADD COLUMN IF NOT EXISTS exam_year integer,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS official_website text,
  ADD COLUMN IF NOT EXISTS exam_category text,
  ADD COLUMN IF NOT EXISTS exam_level text,
  ADD COLUMN IF NOT EXISTS exam_mode text,
  ADD COLUMN IF NOT EXISTS duration text,
  ADD COLUMN IF NOT EXISTS exam_status text,
  ADD COLUMN IF NOT EXISTS registration_status text,
  ADD COLUMN IF NOT EXISTS reviewed_by text,
  ADD COLUMN IF NOT EXISTS sources jsonb,
  ADD COLUMN IF NOT EXISTS sections jsonb;

CREATE TABLE IF NOT EXISTS public.exam_generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_name text NOT NULL,
  exam_year integer,
  official_website text,
  exam_category text,
  notes text,
  exam_id uuid,
  mode text NOT NULL DEFAULT 'create',
  status text NOT NULL DEFAULT 'queued',
  step text,
  steps_total integer NOT NULL DEFAULT 4,
  steps_done integer NOT NULL DEFAULT 0,
  log jsonb NOT NULL DEFAULT '[]'::jsonb,
  result jsonb,
  sources jsonb,
  error text,
  tokens_used integer NOT NULL DEFAULT 0,
  worker_lock_until timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_generation_jobs TO authenticated;
GRANT ALL ON public.exam_generation_jobs TO service_role;

ALTER TABLE public.exam_generation_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage exam generation jobs" ON public.exam_generation_jobs;
CREATE POLICY "Admins manage exam generation jobs"
  ON public.exam_generation_jobs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_exam_generation_jobs_updated_at ON public.exam_generation_jobs;
CREATE TRIGGER trg_exam_generation_jobs_updated_at
  BEFORE UPDATE ON public.exam_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_exam_generation_jobs_status ON public.exam_generation_jobs(status, created_at DESC);