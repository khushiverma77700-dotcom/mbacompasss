
ALTER TYPE public.mock_test_type ADD VALUE IF NOT EXISTS 'topic_wise';
ALTER TYPE public.mock_test_type ADD VALUE IF NOT EXISTS 'practice_set';

CREATE TABLE IF NOT EXISTS public.course_bundles (
  course_id  uuid NOT NULL REFERENCES public.mba_compass_courses(id) ON DELETE CASCADE,
  bundle_id  uuid NOT NULL REFERENCES public.mock_bundles(id)        ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, bundle_id)
);

ALTER TABLE public.course_bundles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view course bundle links" ON public.course_bundles;
CREATE POLICY "Anyone can view course bundle links"
  ON public.course_bundles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage course bundle links" ON public.course_bundles;
CREATE POLICY "Admins manage course bundle links"
  ON public.course_bundles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_course_bundles_course ON public.course_bundles(course_id);
CREATE INDEX IF NOT EXISTS idx_course_bundles_bundle ON public.course_bundles(bundle_id);

CREATE OR REPLACE FUNCTION public.unlock_course_bundles_on_enrollment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bundle record;
BEGIN
  FOR _bundle IN SELECT bundle_id FROM public.course_bundles WHERE course_id = NEW.course_id LOOP
    PERFORM public.unlock_bundle_mocks(NEW.user_id, _bundle.bundle_id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_unlock_course_bundles ON public.course_enrollments;
CREATE TRIGGER trg_unlock_course_bundles
AFTER INSERT ON public.course_enrollments
FOR EACH ROW EXECUTE FUNCTION public.unlock_course_bundles_on_enrollment();
