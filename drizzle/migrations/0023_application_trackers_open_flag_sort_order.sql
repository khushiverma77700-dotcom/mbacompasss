ALTER TABLE public.application_trackers
  ADD COLUMN IF NOT EXISTS deadline_tbd boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.application_trackers.deadline_tbd IS 'When true, applications are open but the deadline is not disclosed; frontend shows "Application Open".';
COMMENT ON COLUMN public.application_trackers.sort_order IS 'Admin-controlled visibility order; lower numbers appear first.';

CREATE INDEX IF NOT EXISTS application_trackers_sort_order_idx ON public.application_trackers (sort_order);