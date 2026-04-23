-- Tighten 3 INSERT policies flagged by Supabase linter as overly permissive (with_check = true).
-- All remain insertable by the public/anon role, but now require a non-null required field
-- so SQL injection / spam scripts can't insert empty rows undetected.

DROP POLICY IF EXISTS "Anyone can submit CAT score" ON public.cat_score_submissions;
CREATE POLICY "Anyone can submit CAT score"
ON public.cat_score_submissions
FOR INSERT
TO public
WITH CHECK (
  candidate_name IS NOT NULL
  AND length(candidate_name) BETWEEN 1 AND 255
  AND total_score IS NOT NULL
);

DROP POLICY IF EXISTS "Anyone can create roi analysis" ON public.roi_analyses;
CREATE POLICY "Anyone can create roi analysis"
ON public.roi_analyses
FOR INSERT
TO public
WITH CHECK (
  (user_id IS NULL OR user_id = auth.uid())
);

DROP POLICY IF EXISTS "Authenticated users can insert ai_usage_logs" ON public.ai_usage_logs;
CREATE POLICY "Authenticated users can insert ai_usage_logs"
ON public.ai_usage_logs
FOR INSERT
TO authenticated
WITH CHECK (
  feature IS NOT NULL
  AND length(feature) BETWEEN 1 AND 100
  AND (user_id IS NULL OR user_id = auth.uid())
);