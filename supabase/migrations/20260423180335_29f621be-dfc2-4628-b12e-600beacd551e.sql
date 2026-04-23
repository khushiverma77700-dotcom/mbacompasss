
CREATE OR REPLACE FUNCTION public.enqueue_indexing_url()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  base_url text := 'https://mbacompass.in';
  path_prefix text;
  page_type text;
  full_url text;
  should_enqueue boolean := false;
BEGIN
  IF TG_TABLE_NAME = 'articles' THEN
    path_prefix := '/article/';
    page_type := 'article';
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
$function$;

-- Migrate existing queued URLs to the new domain (skip rows that would conflict)
UPDATE public.indexing_urls
SET url = REPLACE(REPLACE(url, 'https://bschoolbuzz.com', 'https://mbacompass.in'), 'https://www.bschoolbuzz.com', 'https://mbacompass.in')
WHERE url ILIKE '%bschoolbuzz.com%'
  AND NOT EXISTS (
    SELECT 1 FROM public.indexing_urls i2
    WHERE i2.url = REPLACE(REPLACE(public.indexing_urls.url, 'https://bschoolbuzz.com', 'https://mbacompass.in'), 'https://www.bschoolbuzz.com', 'https://mbacompass.in')
  );

-- Delete any leftover old-domain duplicates
DELETE FROM public.indexing_urls WHERE url ILIKE '%bschoolbuzz.com%';
