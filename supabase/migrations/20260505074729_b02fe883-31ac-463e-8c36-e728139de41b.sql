
-- 1. Add new columns to institutes
ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS institute_type text NOT NULL DEFAULT 'city' CHECK (institute_type IN ('city','hybrid')),
  ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_institutes_institute_type ON public.institutes(institute_type);

-- 2. Many-to-many courses link
CREATE TABLE IF NOT EXISTS public.institute_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid NOT NULL REFERENCES public.institutes(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(institute_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_institute_courses_institute ON public.institute_courses(institute_id);
CREATE INDEX IF NOT EXISTS idx_institute_courses_course ON public.institute_courses(course_id);

ALTER TABLE public.institute_courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view institute_courses" ON public.institute_courses;
CREATE POLICY "Public can view institute_courses"
  ON public.institute_courses FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage institute_courses" ON public.institute_courses;
CREATE POLICY "Admins can manage institute_courses"
  ON public.institute_courses FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
