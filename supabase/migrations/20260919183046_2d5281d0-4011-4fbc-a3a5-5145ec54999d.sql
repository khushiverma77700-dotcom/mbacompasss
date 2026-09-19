UPDATE public.application_trackers AS tracker
SET logo_url = college.logo_url
FROM public.colleges AS college
WHERE tracker.is_homepage_featured = true
  AND tracker.logo_url IS NULL
  AND college.logo_url IS NOT NULL
  AND college.logo_url <> ''
  AND (
    lower(college.slug) = regexp_replace(lower(tracker.slug), '-(pgp|mba|pgdm|pgpm)$', '')
    OR lower(tracker.name) LIKE lower(college.name) || '%'
  );