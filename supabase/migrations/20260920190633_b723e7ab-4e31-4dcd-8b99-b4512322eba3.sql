-- cta_events: keep existing validation, add owner check
DROP POLICY IF EXISTS "anyone can insert valid cta event" ON public.cta_events;
CREATE POLICY "anyone can insert valid cta event"
ON public.cta_events
FOR INSERT
WITH CHECK (
  (cta_key IS NOT NULL)
  AND (EXISTS (SELECT 1 FROM public.cta_settings s WHERE s.cta_key = cta_events.cta_key))
  AND ((context IS NULL) OR (octet_length((context)::text) <= 2048))
  AND ((page_path IS NULL) OR (length(page_path) <= 512))
  AND ((user_id IS NULL) OR (user_id = auth.uid()))
);

DROP POLICY IF EXISTS "Public can insert demo leads" ON public.demo_leads;
CREATE POLICY "Public can insert demo leads"
ON public.demo_leads
FOR INSERT
WITH CHECK ((user_id IS NULL) OR (user_id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can log a freebie download" ON public.freebie_downloads;
CREATE POLICY "Anyone can log a freebie download"
ON public.freebie_downloads
FOR INSERT
WITH CHECK ((user_id IS NULL) OR (user_id = auth.uid()));

DROP POLICY IF EXISTS "Anyone can create a shortlister submission" ON public.shortlister_submissions;
CREATE POLICY "Anyone can create a shortlister submission"
ON public.shortlister_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK ((user_id IS NULL) OR (user_id = auth.uid()));