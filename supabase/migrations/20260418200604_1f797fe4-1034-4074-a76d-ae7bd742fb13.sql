-- Add retry backoff column
ALTER TABLE public.indexing_urls
  ADD COLUMN IF NOT EXISTS next_retry_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_indexing_urls_status_retry
  ON public.indexing_urls (status, next_retry_at);

-- Generic enqueue function
CREATE OR REPLACE FUNCTION public.enqueue_indexing_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_url text := 'https://bschoolbuzz.com';
  path_prefix text;
  page_type text;
  full_url text;
  should_enqueue boolean := false;
BEGIN
  -- Map table -> path + type
  IF TG_TABLE_NAME = 'articles' THEN
    path_prefix := '/article/';
    page_type := 'article';
    -- only published articles
    IF TG_OP = 'INSERT' THEN
      should_enqueue := COALESCE(NEW.published, false);
    ELSIF TG_OP = 'UPDATE' THEN
      should_enqueue := COALESCE(NEW.published, false)
        AND (NEW.slug IS DISTINCT FROM OLD.slug
             OR COALESCE(NEW.published, false) IS DISTINCT FROM COALESCE(OLD.published, false));
    END IF;
  ELSIF TG_TABLE_NAME = 'colleges' THEN
    path_prefix := '/college/';
    page_type := 'college';
    should_enqueue := (TG_OP = 'INSERT') OR (NEW.slug IS DISTINCT FROM OLD.slug);
  ELSIF TG_TABLE_NAME = 'institutes' THEN
    path_prefix := '/institute/';
    page_type := 'institute';
    should_enqueue := (TG_OP = 'INSERT') OR (NEW.slug IS DISTINCT FROM OLD.slug);
  ELSIF TG_TABLE_NAME = 'exams' THEN
    path_prefix := '/exam/';
    page_type := 'exam';
    should_enqueue := (TG_OP = 'INSERT') OR (NEW.slug IS DISTINCT FROM OLD.slug);
  ELSIF TG_TABLE_NAME = 'city_pages' THEN
    path_prefix := '/colleges/';
    page_type := 'city_page';
    IF TG_OP = 'INSERT' THEN
      should_enqueue := COALESCE(NEW.active, true);
    ELSE
      should_enqueue := COALESCE(NEW.active, true)
        AND (NEW.slug IS DISTINCT FROM OLD.slug
             OR COALESCE(NEW.active, true) IS DISTINCT FROM COALESCE(OLD.active, true));
    END IF;
  ELSIF TG_TABLE_NAME = 'categories' THEN
    path_prefix := '/category/';
    page_type := 'category';
    should_enqueue := (TG_OP = 'INSERT') OR (NEW.slug IS DISTINCT FROM OLD.slug);
  ELSE
    RETURN NEW;
  END IF;

  IF NOT should_enqueue OR NEW.slug IS NULL OR NEW.slug = '' THEN
    RETURN NEW;
  END IF;

  full_url := base_url || path_prefix || NEW.slug;

  INSERT INTO public.indexing_urls (url, page_type, record_id, status, retry_count, next_retry_at)
  VALUES (full_url, page_type, NEW.id, 'pending', 0, now())
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop existing triggers if any, then create
DROP TRIGGER IF EXISTS trg_enqueue_articles ON public.articles;
CREATE TRIGGER trg_enqueue_articles
AFTER INSERT OR UPDATE OF slug, published ON public.articles
FOR EACH ROW EXECUTE FUNCTION public.enqueue_indexing_url();

DROP TRIGGER IF EXISTS trg_enqueue_colleges ON public.colleges;
CREATE TRIGGER trg_enqueue_colleges
AFTER INSERT OR UPDATE OF slug ON public.colleges
FOR EACH ROW EXECUTE FUNCTION public.enqueue_indexing_url();

DROP TRIGGER IF EXISTS trg_enqueue_institutes ON public.institutes;
CREATE TRIGGER trg_enqueue_institutes
AFTER INSERT OR UPDATE OF slug ON public.institutes
FOR EACH ROW EXECUTE FUNCTION public.enqueue_indexing_url();

DROP TRIGGER IF EXISTS trg_enqueue_exams ON public.exams;
CREATE TRIGGER trg_enqueue_exams
AFTER INSERT OR UPDATE OF slug ON public.exams
FOR EACH ROW EXECUTE FUNCTION public.enqueue_indexing_url();

DROP TRIGGER IF EXISTS trg_enqueue_city_pages ON public.city_pages;
CREATE TRIGGER trg_enqueue_city_pages
AFTER INSERT OR UPDATE OF slug, active ON public.city_pages
FOR EACH ROW EXECUTE FUNCTION public.enqueue_indexing_url();

DROP TRIGGER IF EXISTS trg_enqueue_categories ON public.categories;
CREATE TRIGGER trg_enqueue_categories
AFTER INSERT OR UPDATE OF slug ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.enqueue_indexing_url();