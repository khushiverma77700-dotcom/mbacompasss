ALTER TABLE public.vocab_generation_jobs
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS exam text,
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rejected integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS batch_size integer,
  ADD COLUMN IF NOT EXISTS estimated_input_tokens integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_output_tokens integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS finished_at timestamptz,
  ADD COLUMN IF NOT EXISTS progress_details jsonb NOT NULL DEFAULT '{}'::jsonb;