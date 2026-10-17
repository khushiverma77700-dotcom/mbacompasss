ALTER TABLE public.articles ADD COLUMN prepared_display jsonb;
CREATE TABLE public.article_display_jobs (article_id uuid PRIMARY KEY REFERENCES public.articles(id) ON DELETE CASCADE, source_content text NOT NULL DEFAULT '', token uuid NOT NULL DEFAULT gen_random_uuid(), requested_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.article_display_jobs TO service_role;
ALTER TABLE public.article_display_jobs ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.invalidate_article_display() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN IF TG_OP='INSERT' OR NEW.content IS DISTINCT FROM OLD.content THEN NEW.prepared_display := NULL; END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.invalidate_article_display() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER invalidate_article_display BEFORE INSERT OR UPDATE OF content ON public.articles FOR EACH ROW EXECUTE FUNCTION public.invalidate_article_display();
CREATE OR REPLACE FUNCTION public.enqueue_article_display() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF TG_OP='INSERT' OR NEW.content IS DISTINCT FROM OLD.content THEN
INSERT INTO public.article_display_jobs(article_id,source_content) VALUES(NEW.id,coalesce(NEW.content,'')) ON CONFLICT(article_id) DO UPDATE SET source_content=excluded.source_content, token=gen_random_uuid(), requested_at=now();
END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.enqueue_article_display() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER enqueue_article_display AFTER INSERT OR UPDATE OF content ON public.articles FOR EACH ROW EXECUTE FUNCTION public.enqueue_article_display();
CREATE OR REPLACE FUNCTION public.wake_article_display() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN PERFORM net.http_post(url := 'https://mbacompasss.lovable.app/api/public/articles/prepare', headers := jsonb_build_object('Content-Type','application/json'), body := jsonb_build_object('articleId',NEW.article_id,'token',NEW.token), timeout_milliseconds := 30000); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.wake_article_display() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER wake_article_display AFTER INSERT OR UPDATE OF token ON public.article_display_jobs FOR EACH ROW EXECUTE FUNCTION public.wake_article_display();
INSERT INTO public.article_display_jobs(article_id,source_content) SELECT id,coalesce(content,'') FROM public.articles ON CONFLICT DO NOTHING;