ALTER TABLE public.mock_section_jobs
  ADD COLUMN IF NOT EXISTS duplicates_rejected integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dup_hash integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dup_similarity integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dup_paraphrase integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dup_db_conflict integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejected_invalid integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_reason text;

CREATE INDEX IF NOT EXISTS mock_section_jobs_status_updated_idx
  ON public.mock_section_jobs (status, updated_at DESC);