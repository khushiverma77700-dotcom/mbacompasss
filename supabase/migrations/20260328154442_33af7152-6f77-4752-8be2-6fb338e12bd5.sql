
-- Create storage buckets for uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true);

-- RLS: Anyone can view files
CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'uploads');

-- RLS: Admins can upload files
CREATE POLICY "Admin upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'uploads' AND public.has_role(auth.uid(), 'admin')
);

-- RLS: Admins can delete files
CREATE POLICY "Admin delete" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'uploads' AND public.has_role(auth.uid(), 'admin')
);
