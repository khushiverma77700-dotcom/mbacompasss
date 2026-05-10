-- Auto-sync triggers so admin changes propagate to existing student purchases.

-- 1) When a new mock is added to a bundle, unlock it for everyone who already bought the bundle.
DROP TRIGGER IF EXISTS trg_sync_bundle_item_to_enrollments ON public.mock_bundle_items;
CREATE TRIGGER trg_sync_bundle_item_to_enrollments
AFTER INSERT ON public.mock_bundle_items
FOR EACH ROW EXECUTE FUNCTION public.sync_bundle_item_to_enrollments();

-- 2) When a new bundle is linked to a course, unlock all its mocks for everyone who already bought the course.
DROP TRIGGER IF EXISTS trg_sync_course_bundle_to_enrollments ON public.course_bundles;
CREATE TRIGGER trg_sync_course_bundle_to_enrollments
AFTER INSERT ON public.course_bundles
FOR EACH ROW EXECUTE FUNCTION public.sync_course_bundle_to_enrollments();

-- 3) Also keep the existing course-purchase unlock trigger in place (idempotent).
DROP TRIGGER IF EXISTS trg_unlock_course_bundles ON public.course_enrollments;
CREATE TRIGGER trg_unlock_course_bundles
AFTER INSERT ON public.course_enrollments
FOR EACH ROW EXECUTE FUNCTION public.unlock_course_bundles_on_enrollment();