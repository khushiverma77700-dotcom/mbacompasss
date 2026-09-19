ALTER TABLE public.application_trackers
  ADD COLUMN IF NOT EXISTS is_homepage_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS homepage_order integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS application_trackers_homepage_featured_idx
  ON public.application_trackers (is_homepage_featured, homepage_order, application_deadline)
  WHERE is_homepage_featured = true AND is_active = true AND is_archived = false;

UPDATE public.application_trackers
SET
  is_homepage_featured = true,
  homepage_order = CASE slug
    WHEN 'iim-ahmedabad-pgp' THEN 1
    WHEN 'iim-bangalore-pgp' THEN 2
    WHEN 'iim-calcutta-mba' THEN 3
    WHEN 'spjimr-mumbai-pgdm' THEN 4
    WHEN 'mdi-gurgaon-pgpm' THEN 5
    WHEN 'nmims-mumbai-mba' THEN 6
    ELSE homepage_order
  END,
  application_deadline = CASE slug
    WHEN 'iim-ahmedabad-pgp' THEN '2026-10-08T18:29:00+05:30'::timestamptz
    WHEN 'iim-bangalore-pgp' THEN '2026-10-15T18:29:00+05:30'::timestamptz
    WHEN 'iim-calcutta-mba' THEN '2026-10-22T18:29:00+05:30'::timestamptz
    WHEN 'spjimr-mumbai-pgdm' THEN '2026-11-05T18:29:00+05:30'::timestamptz
    WHEN 'mdi-gurgaon-pgpm' THEN '2026-11-12T18:29:00+05:30'::timestamptz
    WHEN 'nmims-mumbai-mba' THEN '2026-11-20T18:29:00+05:30'::timestamptz
    ELSE application_deadline
  END
WHERE slug IN (
  'iim-ahmedabad-pgp',
  'iim-bangalore-pgp',
  'iim-calcutta-mba',
  'spjimr-mumbai-pgdm',
  'mdi-gurgaon-pgpm',
  'nmims-mumbai-mba'
);