
-- Allow bundle deletion to preserve order history but unlink the bundle
ALTER TABLE public.mock_bundle_orders
  ALTER COLUMN bundle_id DROP NOT NULL;
ALTER TABLE public.mock_bundle_orders
  DROP CONSTRAINT IF EXISTS mock_bundle_orders_bundle_id_fkey;
ALTER TABLE public.mock_bundle_orders
  ADD CONSTRAINT mock_bundle_orders_bundle_id_fkey
  FOREIGN KEY (bundle_id) REFERENCES public.mock_bundles(id) ON DELETE SET NULL;

-- Cascading delete function: removes the bundle and every student access
-- (per-mock enrollments granted by this bundle, bundle enrollments, items, course links).
CREATE OR REPLACE FUNCTION public.admin_delete_bundle(_bundle_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _removed_mock_enrollments integer := 0;
  _removed_bundle_enrollments integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- 1. Remove per-mock student access that came from this bundle
  WITH del AS (
    DELETE FROM public.mock_enrollments me
    WHERE me.source = 'bundle'
      AND me.test_id IN (SELECT test_id FROM public.mock_bundle_items WHERE bundle_id = _bundle_id)
      AND me.user_id IN (SELECT user_id FROM public.mock_bundle_enrollments WHERE bundle_id = _bundle_id)
    RETURNING 1
  )
  SELECT count(*) INTO _removed_mock_enrollments FROM del;

  -- 2. Bundle enrollments
  WITH del AS (
    DELETE FROM public.mock_bundle_enrollments WHERE bundle_id = _bundle_id RETURNING 1
  )
  SELECT count(*) INTO _removed_bundle_enrollments FROM del;

  -- 3. course_bundles + mock_bundle_items cascade via FK; bundle row triggers cascade
  DELETE FROM public.mock_bundles WHERE id = _bundle_id;

  RETURN jsonb_build_object(
    'removed_mock_enrollments', _removed_mock_enrollments,
    'removed_bundle_enrollments', _removed_bundle_enrollments
  );
END;
$$;
