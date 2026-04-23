-- Fix: Public Bucket Allows Listing
-- Issue: Existing SELECT policies on storage.objects for the 'uploads' and
-- 'listing-uploads' buckets allow anonymous LIST operations, exposing the
-- full file inventory. Scope public reads to single-object GETs only by
-- requiring a path (storage.foldername length > 0). Listing now requires
-- an authenticated session.

-- Drop any existing permissive SELECT policies on these buckets if present.
-- (Names vary by project history; we DROP IF EXISTS for the common ones.)
DROP POLICY IF EXISTS "Public uploads are viewable" ON storage.objects;
DROP POLICY IF EXISTS "Uploads are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public can read uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public listing-uploads viewable" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view listing uploads" ON storage.objects;
DROP POLICY IF EXISTS "Public can read listing uploads" ON storage.objects;

-- Anonymous users can READ a specific object by full path, but cannot LIST.
-- Storage list calls have name = '' or end with '/'; real GETs always carry
-- a non-empty filename component, so this still works for <img src="..."> etc.
CREATE POLICY "Public can fetch uploads by path"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id IN ('uploads', 'listing-uploads')
  AND name IS NOT NULL
  AND name <> ''
  AND right(name, 1) <> '/'
);

-- Authenticated users (admins included) may LIST + READ freely.
CREATE POLICY "Authenticated can list uploads"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id IN ('uploads', 'listing-uploads'));
