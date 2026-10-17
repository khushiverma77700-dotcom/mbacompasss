CREATE OR REPLACE FUNCTION public.invalidate_article_display() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
IF TG_OP='INSERT' OR NEW.content IS DISTINCT FROM OLD.content THEN NEW.prepared_display := NULL;
ELSIF NEW.prepared_display IS DISTINCT FROM OLD.prepared_display AND current_user NOT IN ('service_role','postgres') THEN RAISE EXCEPTION 'Prepared article display is server-managed'; END IF; RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION public.complete_article_display(_article_id uuid, _token uuid, _display jsonb) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE job public.article_display_jobs; BEGIN
SELECT * INTO job FROM public.article_display_jobs WHERE article_id=_article_id AND token=_token FOR UPDATE;
IF NOT FOUND THEN RETURN false; END IF;
UPDATE public.articles SET prepared_display=_display, updated_at=updated_at WHERE id=_article_id AND coalesce(content,'')=job.source_content;
IF NOT FOUND THEN RETURN false; END IF;
DELETE FROM public.article_display_jobs WHERE article_id=_article_id AND token=_token;
RETURN true; END $$;
REVOKE ALL ON FUNCTION public.complete_article_display(uuid,uuid,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_article_display(uuid,uuid,jsonb) TO service_role;
