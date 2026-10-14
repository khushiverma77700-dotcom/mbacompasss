DROP POLICY IF EXISTS "Anyone can view daily assignments" ON public.daily_test_assignments;
CREATE POLICY "Signed-in users view daily assignments" ON public.daily_test_assignments FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE SELECT ON public.daily_test_assignments FROM anon;