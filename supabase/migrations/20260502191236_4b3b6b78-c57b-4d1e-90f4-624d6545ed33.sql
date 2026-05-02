
-- Ensure: when admin adds a new mock to a bundle, all already-enrolled students
-- automatically get the new mock unlocked. (Re-create trigger; function already exists.)
DROP TRIGGER IF EXISTS trg_sync_bundle_item ON public.mock_bundle_items;
CREATE TRIGGER trg_sync_bundle_item
  AFTER INSERT ON public.mock_bundle_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_bundle_item_to_enrollments();

-- Ensure: when a student enrolls in a course, all bundles attached to that course
-- (and their mocks) are automatically unlocked.
DROP TRIGGER IF EXISTS trg_unlock_course_bundles ON public.course_enrollments;
CREATE TRIGGER trg_unlock_course_bundles
  AFTER INSERT ON public.course_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.unlock_course_bundles_on_enrollment();

-- NEW: when admin attaches a new bundle to a course, automatically unlock that
-- bundle (and all its mocks) for every student already enrolled in the course.
CREATE OR REPLACE FUNCTION public.sync_course_bundle_to_enrollments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _enrollment record;
BEGIN
  FOR _enrollment IN
    SELECT user_id FROM public.course_enrollments WHERE course_id = NEW.course_id
  LOOP
    PERFORM public.unlock_bundle_mocks(_enrollment.user_id, NEW.bundle_id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_course_bundle ON public.course_bundles;
CREATE TRIGGER trg_sync_course_bundle
  AFTER INSERT ON public.course_bundles
  FOR EACH ROW EXECUTE FUNCTION public.sync_course_bundle_to_enrollments();
