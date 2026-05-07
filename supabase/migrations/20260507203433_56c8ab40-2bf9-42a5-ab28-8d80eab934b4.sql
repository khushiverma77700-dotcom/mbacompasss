
ALTER TABLE public.cta_events 
  ADD COLUMN IF NOT EXISTS page_path text,
  ADD COLUMN IF NOT EXISTS context jsonb;

CREATE INDEX IF NOT EXISTS cta_events_page_path_idx ON public.cta_events (page_path);
