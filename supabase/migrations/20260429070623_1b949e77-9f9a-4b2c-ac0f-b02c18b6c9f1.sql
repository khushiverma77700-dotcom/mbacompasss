
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT ce.user_id, cb.bundle_id
    FROM public.course_enrollments ce
    JOIN public.course_bundles cb ON cb.course_id = ce.course_id
  LOOP
    PERFORM public.unlock_bundle_mocks(r.user_id, r.bundle_id);
  END LOOP;
END $$;
