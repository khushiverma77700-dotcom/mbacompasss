CREATE OR REPLACE FUNCTION public.user_has_mock_access(_user_id uuid, _test_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- 1) Sectional, topic-wise, and practice set mocks are open to every signed-in student.
  SELECT EXISTS (
    SELECT 1 FROM public.mock_tests t
    WHERE t.id = _test_id
      AND t.test_type::text IN ('sectional', 'topic', 'topic_wise', 'practice_set')
      AND _user_id IS NOT NULL
  )
  -- 2) Any student who has purchased ANY course, bundle, or mock gets access to every mock.
  OR EXISTS (
    SELECT 1 FROM public.course_enrollments WHERE user_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.mock_bundle_enrollments
    WHERE user_id = _user_id
      AND (expires_at IS NULL OR expires_at > now())
  )
  OR EXISTS (
    SELECT 1 FROM public.mock_enrollments
    WHERE user_id = _user_id
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_mock_access(uuid, uuid) TO anon, authenticated;