CREATE OR REPLACE FUNCTION public.user_has_mock_access(_user_id uuid, _test_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mock_enrollments
    WHERE user_id = _user_id
      AND test_id = _test_id
      AND (expires_at IS NULL OR expires_at > now())
  )
  OR EXISTS (
    SELECT 1
    FROM public.mock_bundle_enrollments be
    JOIN public.mock_bundle_items bi ON bi.bundle_id = be.bundle_id
    WHERE be.user_id = _user_id
      AND bi.test_id = _test_id
      AND (be.expires_at IS NULL OR be.expires_at > now())
  );
$$;