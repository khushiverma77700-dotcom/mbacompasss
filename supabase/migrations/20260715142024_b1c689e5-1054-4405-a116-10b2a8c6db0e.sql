-- Restrict public read on listing-uploads: only owners (and admins via existing policy) can read.
DROP POLICY IF EXISTS "Public can fetch uploads by path" ON storage.objects;

CREATE POLICY "Public can fetch uploads by path"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'uploads'
  AND name IS NOT NULL
  AND name <> ''
  AND right(name, 1) <> '/'
);

-- Owner read policy for listing-uploads (folder = auth.uid())
DROP POLICY IF EXISTS "Users can read own listing-uploads files" ON storage.objects;
CREATE POLICY "Users can read own listing-uploads files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'listing-uploads'
  AND auth.uid() IS NOT NULL
  AND (auth.uid())::text = (storage.foldername(name))[1]
);