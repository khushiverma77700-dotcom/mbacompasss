GRANT INSERT ON public.guidance_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guidance_requests TO authenticated;
GRANT ALL ON public.guidance_requests TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guidance_request_notes TO authenticated;
GRANT ALL ON public.guidance_request_notes TO service_role;