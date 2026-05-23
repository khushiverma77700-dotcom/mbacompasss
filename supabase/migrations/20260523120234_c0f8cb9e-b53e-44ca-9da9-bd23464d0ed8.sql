
-- 1. cta_events: validate cta_key against catalog + cap context size
DROP POLICY IF EXISTS "anyone can insert cta event" ON public.cta_events;
CREATE POLICY "anyone can insert valid cta event"
ON public.cta_events
FOR INSERT
WITH CHECK (
  cta_key IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.cta_settings s WHERE s.cta_key = cta_events.cta_key)
  AND (context IS NULL OR octet_length(context::text) <= 2048)
  AND (page_path IS NULL OR length(page_path) <= 512)
);

-- 2. mock_purchase_orders: block all client-side INSERTs (service role bypasses RLS)
DROP POLICY IF EXISTS "Anyone can create mock purchase orders" ON public.mock_purchase_orders;
DROP POLICY IF EXISTS "Anyone can insert mock purchase orders" ON public.mock_purchase_orders;
DROP POLICY IF EXISTS "Users can create mock purchase orders" ON public.mock_purchase_orders;
CREATE POLICY "Block client inserts on mock purchase orders"
ON public.mock_purchase_orders
FOR INSERT
WITH CHECK (false);

-- 3. Storage: restrict listing of uploads/listing-uploads buckets
DROP POLICY IF EXISTS "Authenticated can list uploads" ON storage.objects;

CREATE POLICY "Admins can list all uploads"
ON storage.objects
FOR SELECT
USING (
  bucket_id = ANY (ARRAY['uploads'::text, 'listing-uploads'::text])
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can list own listing-uploads folder"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'listing-uploads'
  AND auth.uid() IS NOT NULL
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
