-- 1. Admin permissions: full-access flag
ALTER TABLE public.admin_permissions
  ADD COLUMN IF NOT EXISTS is_full_access boolean NOT NULL DEFAULT false;

-- 2a. Strip trailing " — AI" / " - AI" suffixes from existing mock names
UPDATE public.mock_tests
SET name = regexp_replace(name, '\s*[—-]\s*AI\s*$', '')
WHERE name ~ '\s*[—-]\s*AI\s*$';

-- 2b. Deduplicate existing mock_tests names BEFORE adding unique index.
WITH ranked AS (
  SELECT id, name,
         ROW_NUMBER() OVER (PARTITION BY lower(name) ORDER BY created_at) AS rn
  FROM public.mock_tests
)
UPDATE public.mock_tests m
SET name = m.name || ' (' || substr(m.id::text, 1, 6) || ')'
FROM ranked r
WHERE m.id = r.id AND r.rn > 1;

-- 2c. Mock test name uniqueness (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS mock_tests_unique_name_idx
  ON public.mock_tests (lower(name));

-- 3. Per-section job tracking for AI mock generation
CREATE TABLE IF NOT EXISTS public.mock_section_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id uuid REFERENCES public.ai_mock_generations(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  section_id uuid NOT NULL REFERENCES public.mock_sections(id) ON DELETE CASCADE,
  exam_code text NOT NULL,
  category text NOT NULL,
  level text NOT NULL DEFAULT 'mixed',
  section_code text NOT NULL,
  section_name text NOT NULL,
  total_questions int NOT NULL DEFAULT 0,
  mcq_count int NOT NULL DEFAULT 0,
  tita_count int NOT NULL DEFAULT 0,
  topic text,
  strict_topic text,
  positive_marks numeric NOT NULL DEFAULT 3,
  negative_marks numeric NOT NULL DEFAULT 1,
  verify_internet boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  attempts int NOT NULL DEFAULT 0,
  questions_done int NOT NULL DEFAULT 0,
  current_step text,
  worker_lock_until timestamptz,
  error_message text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mock_section_jobs_status_idx
  ON public.mock_section_jobs (status, worker_lock_until);
CREATE INDEX IF NOT EXISTS mock_section_jobs_generation_idx
  ON public.mock_section_jobs (generation_id);
CREATE INDEX IF NOT EXISTS mock_section_jobs_test_idx
  ON public.mock_section_jobs (test_id);

ALTER TABLE public.mock_section_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage mock section jobs" ON public.mock_section_jobs;
CREATE POLICY "Admins manage mock section jobs"
  ON public.mock_section_jobs
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS mock_section_jobs_updated_at ON public.mock_section_jobs;
CREATE TRIGGER mock_section_jobs_updated_at
  BEFORE UPDATE ON public.mock_section_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Helper: rollup ai_mock_generations status from section jobs
CREATE OR REPLACE FUNCTION public.rollup_mock_generation(_generation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _produced int := 0;
  _pending int := 0;
  _failed int := 0;
BEGIN
  SELECT
    COALESCE(SUM(questions_done), 0),
    COUNT(*) FILTER (WHERE status IN ('pending','processing')),
    COUNT(*) FILTER (WHERE status = 'failed')
  INTO _produced, _pending, _failed
  FROM public.mock_section_jobs
  WHERE generation_id = _generation_id;

  UPDATE public.ai_mock_generations
  SET total_generated = _produced,
      status = CASE
        WHEN _pending > 0 THEN 'running'
        WHEN _failed > 0 THEN 'failed'
        ELSE 'completed'
      END,
      finished_at = CASE WHEN _pending = 0 THEN COALESCE(finished_at, now()) ELSE finished_at END
  WHERE id = _generation_id;
END;
$$;

-- 5. Helper: claim next pending section job (atomic)
CREATE OR REPLACE FUNCTION public.claim_mock_section_job(_lock_minutes int DEFAULT 8)
RETURNS public.mock_section_jobs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.mock_section_jobs;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.mock_section_jobs
  SET status = 'processing',
      attempts = attempts + 1,
      worker_lock_until = now() + make_interval(mins => GREATEST(_lock_minutes, 1)),
      current_step = 'claimed by worker',
      updated_at = now()
  WHERE id = (
    SELECT id FROM public.mock_section_jobs
    WHERE status = 'pending'
       OR (status = 'processing' AND worker_lock_until < now())
    ORDER BY created_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  )
  RETURNING * INTO r;

  RETURN r;
END;
$$;

-- 6. Watchdog: requeue stuck section jobs older than threshold
CREATE OR REPLACE FUNCTION public.recover_stale_mock_section_jobs(_threshold_minutes int DEFAULT 5)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _n int;
BEGIN
  UPDATE public.mock_section_jobs
  SET status = 'pending',
      worker_lock_until = NULL,
      current_step = 'watchdog: requeued after stuck worker',
      updated_at = now()
  WHERE status = 'processing'
    AND attempts < 4
    AND (worker_lock_until IS NULL OR worker_lock_until < now() - make_interval(mins => GREATEST(_threshold_minutes,1)));
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;