CREATE TABLE public.ai_blog_generation_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  current_step TEXT,
  error_message TEXT,
  brief JSONB NOT NULL DEFAULT '{}'::jsonb,
  article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_blog_generation_jobs TO authenticated;
GRANT ALL ON public.ai_blog_generation_jobs TO service_role;

ALTER TABLE public.ai_blog_generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage AI blog generation jobs"
ON public.ai_blog_generation_jobs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_ai_blog_generation_jobs_updated_at
BEFORE UPDATE ON public.ai_blog_generation_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();