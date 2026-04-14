
ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS h1_tag text;
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS h1_tag text;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS h1_tag text;
ALTER TABLE public.city_pages ADD COLUMN IF NOT EXISTS h1_tag text;
