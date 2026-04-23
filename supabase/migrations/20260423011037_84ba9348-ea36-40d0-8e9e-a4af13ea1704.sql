-- Fix 1: Restrict ai_usage_logs INSERT to authenticated users / service role
DROP POLICY IF EXISTS "Edge functions can insert logs" ON public.ai_usage_logs;

CREATE POLICY "Authenticated users can insert ai_usage_logs"
ON public.ai_usage_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Note: Edge functions using SUPABASE_SERVICE_ROLE_KEY bypass RLS and can still insert.

-- Fix 2: Require authentication for roi_analyses inserts to prevent orphaned PII
DROP POLICY IF EXISTS "Anyone can create ROI analysis" ON public.roi_analyses;
DROP POLICY IF EXISTS "Public can create roi_analyses" ON public.roi_analyses;
DROP POLICY IF EXISTS "Anyone can insert roi_analyses" ON public.roi_analyses;
DROP POLICY IF EXISTS "Allow public insert" ON public.roi_analyses;

CREATE POLICY "Authenticated users can create own roi_analyses"
ON public.roi_analyses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
