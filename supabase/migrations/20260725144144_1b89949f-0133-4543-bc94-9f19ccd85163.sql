CREATE OR REPLACE FUNCTION public.user_has_mock_access(_user_id uuid, _test_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.mock_tests t
      WHERE t.id = _test_id
        AND (COALESCE(t.is_published, false) = true OR COALESCE(t.is_live, false) = true)
        AND (
          t.scheduled_start_at IS NULL
          OR t.scheduled_start_at <= now()
          OR COALESCE(t.is_published, false) = true
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.user_has_mock_access(uuid, uuid) TO anon, authenticated, service_role;
