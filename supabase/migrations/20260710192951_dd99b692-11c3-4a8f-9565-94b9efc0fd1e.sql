
-- Helper: figure out the public URL for a row in a content table.
CREATE OR REPLACE FUNCTION public._indexing_url_for(_table text, _slug text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _table
    WHEN 'institutes' THEN 'https://mbacompass.in/institute/'  || _slug
    WHEN 'courses'    THEN 'https://mbacompass.in/course/'     || _slug
    WHEN 'colleges'   THEN 'https://mbacompass.in/college/'    || _slug
    WHEN 'articles'   THEN 'https://mbacompass.in/article/'    || _slug
    ELSE NULL
  END
$$;

-- Trigger fn: on INSERT or slug change, upsert the URL into indexing_urls
-- so the existing Google-Indexing cron picks it up on its next tick.
CREATE OR REPLACE FUNCTION public.enqueue_indexing_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url  text;
  v_slug text;
BEGIN
  v_slug := COALESCE(NEW.slug, '');
  IF v_slug = '' THEN
    RETURN NEW;
  END IF;

  -- Only re-queue on INSERT or when the slug actually changed on UPDATE.
  IF TG_OP = 'UPDATE' AND NEW.slug IS NOT DISTINCT FROM OLD.slug THEN
    RETURN NEW;
  END IF;

  v_url := public._indexing_url_for(TG_TABLE_NAME, v_slug);
  IF v_url IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.indexing_urls (url, page_type, record_id, status)
  VALUES (v_url, TG_TABLE_NAME, NEW.id, 'pending')
  ON CONFLICT (url) DO UPDATE
    SET status        = 'pending',
        retry_count   = 0,
        next_retry_at = NULL,
        error_message = NULL,
        updated_at    = now();

  RETURN NEW;
END;
$$;

-- Attach the trigger to every content table that maps to a public URL.
DROP TRIGGER IF EXISTS trg_enqueue_indexing_url ON public.institutes;
CREATE TRIGGER trg_enqueue_indexing_url
AFTER INSERT OR UPDATE OF slug ON public.institutes
FOR EACH ROW EXECUTE FUNCTION public.enqueue_indexing_url();

DROP TRIGGER IF EXISTS trg_enqueue_indexing_url ON public.courses;
CREATE TRIGGER trg_enqueue_indexing_url
AFTER INSERT OR UPDATE OF slug ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.enqueue_indexing_url();

DROP TRIGGER IF EXISTS trg_enqueue_indexing_url ON public.colleges;
CREATE TRIGGER trg_enqueue_indexing_url
AFTER INSERT OR UPDATE OF slug ON public.colleges
FOR EACH ROW EXECUTE FUNCTION public.enqueue_indexing_url();

DROP TRIGGER IF EXISTS trg_enqueue_indexing_url ON public.articles;
CREATE TRIGGER trg_enqueue_indexing_url
AFTER INSERT OR UPDATE OF slug ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.enqueue_indexing_url();
