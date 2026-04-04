
DROP POLICY "Anyone can create results" ON public.analysis_results;
DROP POLICY "Admins can manage results" ON public.analysis_results;

CREATE POLICY "Admins can manage all results"
ON public.analysis_results FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow insert for authenticated users if they own the parent analysis
CREATE POLICY "Users can insert own results"
ON public.analysis_results FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profile_analyses pa
    WHERE pa.id = profile_analysis_id
  )
);
