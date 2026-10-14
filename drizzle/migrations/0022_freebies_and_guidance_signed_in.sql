DROP POLICY IF EXISTS "Public can read freebies files" ON storage.objects;
CREATE POLICY "Signed-in users can read freebies files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'freebies' AND auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Anyone can submit a guidance request" ON public.guidance_requests;
CREATE POLICY "Signed-in users submit own guidance request" ON public.guidance_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
REVOKE INSERT ON public.guidance_requests FROM anon;