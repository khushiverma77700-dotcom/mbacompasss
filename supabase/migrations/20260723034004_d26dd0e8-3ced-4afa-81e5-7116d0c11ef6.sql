
ALTER TABLE public.seo_reoptimization_runs
  ADD COLUMN IF NOT EXISTS run_at timestamptz,
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS cancel_requested boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS seo_reoptimization_runs_queue_idx
  ON public.seo_reoptimization_runs (status, run_at, priority, created_at)
  WHERE status = 'queued';
