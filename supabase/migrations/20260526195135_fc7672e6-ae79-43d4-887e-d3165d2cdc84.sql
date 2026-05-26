ALTER TABLE public.news_articles
  ADD COLUMN IF NOT EXISTS short_summary_hi text,
  ADD COLUMN IF NOT EXISTS short_summary_hinglish text,
  ADD COLUMN IF NOT EXISTS news_date date NOT NULL DEFAULT CURRENT_DATE;

CREATE INDEX IF NOT EXISTS idx_news_articles_news_date ON public.news_articles (news_date DESC);