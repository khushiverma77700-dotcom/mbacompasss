
-- 1) cat_score_submissions: explicitly restrict SELECT to authenticated owner/admin only
DROP POLICY IF EXISTS "Users can view own submissions" ON public.cat_score_submissions;
CREATE POLICY "Authenticated users can view own submissions"
ON public.cat_score_submissions
FOR SELECT
TO authenticated
USING (user_id IS NOT NULL AND auth.uid() = user_id);

-- 2) mock_coupons: only authenticated users can read active coupons (validation still done server-side via service role)
DROP POLICY IF EXISTS "Active coupons readable" ON public.mock_coupons;
CREATE POLICY "Authenticated users can read active coupons"
ON public.mock_coupons
FOR SELECT
TO authenticated
USING (active = true);

-- 3) profile_analyses: require auth on insert + ensure user_id matches auth.uid()
DROP POLICY IF EXISTS "Anyone can create profile analysis" ON public.profile_analyses;
CREATE POLICY "Authenticated users can create own profile analysis"
ON public.profile_analyses
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4) roi_analyses: require auth on insert
DROP POLICY IF EXISTS "Anyone can create roi analysis" ON public.roi_analyses;
-- "Authenticated users can create own roi_analyses" already exists and enforces auth.uid() = user_id
