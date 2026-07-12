CREATE POLICY "Public can read freebies files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'freebies');

CREATE POLICY "Admins can upload freebies files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'freebies' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update freebies files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'freebies' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete freebies files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'freebies' AND public.has_role(auth.uid(), 'admin'));