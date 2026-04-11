
-- Create course_categories table
CREATE TABLE public.course_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Course categories viewable by everyone"
ON public.course_categories FOR SELECT
USING (true);

CREATE POLICY "Admins can manage course_categories"
ON public.course_categories FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add course_category_id to courses table
ALTER TABLE public.courses
ADD COLUMN course_category_id UUID REFERENCES public.course_categories(id) ON DELETE SET NULL;

-- Trigger for updated_at
CREATE TRIGGER update_course_categories_updated_at
BEFORE UPDATE ON public.course_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
