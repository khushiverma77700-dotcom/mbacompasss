ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE public.institutes ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS content_hash TEXT;
ALTER TABLE public.city_pages ADD COLUMN IF NOT EXISTS content_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_articles_content_hash ON public.articles(content_hash);
CREATE INDEX IF NOT EXISTS idx_colleges_content_hash ON public.colleges(content_hash);
CREATE INDEX IF NOT EXISTS idx_institutes_content_hash ON public.institutes(content_hash);
CREATE INDEX IF NOT EXISTS idx_exams_content_hash ON public.exams(content_hash);
CREATE INDEX IF NOT EXISTS idx_city_pages_content_hash ON public.city_pages(content_hash);