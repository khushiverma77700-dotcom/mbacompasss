ALTER TABLE public.exam_generation_jobs
  ADD COLUMN IF NOT EXISTS batch_id uuid,
  ADD COLUMN IF NOT EXISTS batch_label text,
  ADD COLUMN IF NOT EXISTS auto_publish boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_slug text;

CREATE INDEX IF NOT EXISTS exam_generation_jobs_batch_id_idx ON public.exam_generation_jobs (batch_id);