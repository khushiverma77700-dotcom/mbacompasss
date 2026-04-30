CREATE OR REPLACE FUNCTION public.auto_grant_admin_mock_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _admin_id uuid;
BEGIN
  SELECT id INTO _admin_id FROM auth.users WHERE lower(email) = 'admin@admin.com' LIMIT 1;
  IF _admin_id IS NOT NULL THEN
    INSERT INTO public.mock_enrollments (user_id, test_id, source, admin_notes)
    VALUES (_admin_id, NEW.id, 'admin', 'Auto-granted: admin testing access')
    ON CONFLICT (user_id, test_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_grant_admin_mock_access ON public.mock_tests;
CREATE TRIGGER trg_auto_grant_admin_mock_access
AFTER INSERT ON public.mock_tests
FOR EACH ROW
EXECUTE FUNCTION public.auto_grant_admin_mock_access();