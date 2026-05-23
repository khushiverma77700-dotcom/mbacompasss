
-- Restrict seo_keyword_research to admins only
DROP POLICY IF EXISTS "Public can read seo_keyword_research" ON public.seo_keyword_research;

-- Restrict ticket attachments to ticket owners (and admins via existing policy)
DROP POLICY IF EXISTS "Ticket attachments are publicly readable" ON storage.objects;

CREATE POLICY "Ticket owners can read their attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.user_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = st.id::text
  )
);
