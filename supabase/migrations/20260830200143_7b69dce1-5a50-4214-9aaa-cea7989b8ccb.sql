ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS content_chars integer
  GENERATED ALWAYS AS (length(regexp_replace(coalesce(content, ''), '<[^>]+>', '', 'g'))) STORED;

CREATE INDEX IF NOT EXISTS idx_articles_published_created
  ON public.articles (published, created_at DESC);