
CREATE TABLE public.news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  headline text NOT NULL,
  category text NOT NULL,
  source_name text,
  source_url text,
  one_liner text,
  short_summary text,
  detailed_summary text,
  why_matters text,
  gdpi_points jsonb NOT NULL DEFAULT '[]'::jsonb,
  wat_topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  key_facts jsonb NOT NULL DEFAULT '[]'::jsonb,
  vocabulary jsonb NOT NULL DEFAULT '[]'::jsonb,
  exam_relevance jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  importance text NOT NULL DEFAULT 'medium',
  reading_seconds int NOT NULL DEFAULT 45,
  published_at timestamptz NOT NULL DEFAULT now(),
  ai_generated boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_news_articles_published_at ON public.news_articles (published_at DESC);
CREATE INDEX idx_news_articles_category ON public.news_articles (category);
CREATE INDEX idx_news_articles_importance ON public.news_articles (importance);

GRANT SELECT ON public.news_articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_articles TO authenticated;
GRANT ALL ON public.news_articles TO service_role;

ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "News articles are public to read"
  ON public.news_articles FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert news"
  ON public.news_articles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update news"
  ON public.news_articles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete news"
  ON public.news_articles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));


CREATE TABLE public.news_user_actions (
  user_id uuid NOT NULL,
  article_id uuid NOT NULL REFERENCES public.news_articles(id) ON DELETE CASCADE,
  is_read boolean NOT NULL DEFAULT false,
  is_saved boolean NOT NULL DEFAULT false,
  is_liked boolean NOT NULL DEFAULT false,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, article_id)
);

CREATE INDEX idx_news_actions_user ON public.news_user_actions (user_id, updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_user_actions TO authenticated;
GRANT ALL ON public.news_user_actions TO service_role;

ALTER TABLE public.news_user_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own news actions select"
  ON public.news_user_actions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage their own news actions insert"
  ON public.news_user_actions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage their own news actions update"
  ON public.news_user_actions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage their own news actions delete"
  ON public.news_user_actions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
