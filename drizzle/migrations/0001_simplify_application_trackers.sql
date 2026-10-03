ALTER TABLE public.application_trackers ADD COLUMN IF NOT EXISTS programs text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.application_trackers ADD COLUMN IF NOT EXISTS details_html text;
UPDATE public.application_trackers SET programs = ARRAY[program] WHERE program IS NOT NULL AND btrim(program) <> '' AND programs = '{}';
UPDATE public.application_trackers SET details_html = concat_ws('',
  CASE WHEN coalesce(btrim(short_description),'')<>'' THEN '<p>'||short_description||'</p>' END,
  CASE WHEN coalesce(btrim(eligibility),'')<>'' THEN '<h3>Eligibility</h3><p>'||eligibility||'</p>' END,
  CASE WHEN coalesce(btrim(selection_process),'')<>'' THEN '<h3>Selection process</h3><p>'||selection_process||'</p>' END)
WHERE details_html IS NULL;
COMMENT ON COLUMN public.application_trackers.program IS 'DEPRECATED: replaced by programs';
COMMENT ON COLUMN public.application_trackers.eligibility IS 'DEPRECATED: merged into details_html';
COMMENT ON COLUMN public.application_trackers.selection_process IS 'DEPRECATED: merged into details_html';
COMMENT ON COLUMN public.application_trackers.cutoff_note IS 'DEPRECATED: retired from simplified module';
COMMENT ON COLUMN public.application_trackers.average_package IS 'DEPRECATED: retired from simplified module';
COMMENT ON COLUMN public.application_trackers.highest_package IS 'DEPRECATED: retired from simplified module';
COMMENT ON COLUMN public.application_trackers.median_package IS 'DEPRECATED: retired from simplified module';
COMMENT ON COLUMN public.application_trackers.inside_info_notes IS 'DEPRECATED: retired from simplified module';