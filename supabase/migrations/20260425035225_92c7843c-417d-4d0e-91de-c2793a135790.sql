
-- Add category + AI fields to mock_tests
ALTER TABLE public.mock_tests
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'full_length',
  ADD COLUMN IF NOT EXISTS exam_code text NOT NULL DEFAULT 'CAT',
  ADD COLUMN IF NOT EXISTS launch_date date,
  ADD COLUMN IF NOT EXISTS generated_by_ai boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS generation_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.mock_tests
  DROP CONSTRAINT IF EXISTS mock_tests_category_check;
ALTER TABLE public.mock_tests
  ADD CONSTRAINT mock_tests_category_check
  CHECK (category IN ('full_length','sectional','topic','daily','practice'));

CREATE INDEX IF NOT EXISTS idx_mock_tests_category ON public.mock_tests(category);
CREATE INDEX IF NOT EXISTS idx_mock_tests_exam_code ON public.mock_tests(exam_code);
CREATE INDEX IF NOT EXISTS idx_mock_tests_launch_date ON public.mock_tests(launch_date);

-- Add hash column to questions for fast duplicate detection
ALTER TABLE public.mock_questions
  ADD COLUMN IF NOT EXISTS content_hash text;
CREATE INDEX IF NOT EXISTS idx_mock_questions_content_hash ON public.mock_questions(content_hash);

-- AI generation jobs log
CREATE TABLE IF NOT EXISTS public.ai_mock_generations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id uuid REFERENCES public.mock_tests(id) ON DELETE SET NULL,
  exam_code text NOT NULL,
  category text NOT NULL,
  level text NOT NULL,
  request jsonb NOT NULL DEFAULT '{}'::jsonb,
  result_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  total_requested integer NOT NULL DEFAULT 0,
  total_generated integer NOT NULL DEFAULT 0,
  total_rejected_duplicate integer NOT NULL DEFAULT 0,
  total_rejected_web_match integer NOT NULL DEFAULT 0,
  ai_model text,
  error_message text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

ALTER TABLE public.ai_mock_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage ai_mock_generations" ON public.ai_mock_generations;
CREATE POLICY "Admins manage ai_mock_generations"
  ON public.ai_mock_generations
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
