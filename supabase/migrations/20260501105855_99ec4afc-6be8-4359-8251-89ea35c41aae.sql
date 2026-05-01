-- Normalize FAQ questions consistently for duplicate detection
CREATE OR REPLACE FUNCTION public.normalize_faq_question(_question text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT regexp_replace(lower(trim(coalesce(_question, ''))), '\s+', ' ', 'g')
$$;

-- Keep the first published support FAQ per category/question and hide duplicate published copies
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY category, public.normalize_faq_question(question)
      ORDER BY display_order ASC, created_at ASC, id ASC
    ) AS rn
  FROM public.support_faqs
  WHERE is_published = true
    AND public.normalize_faq_question(question) <> ''
)
UPDATE public.support_faqs sf
SET is_published = false,
    updated_at = now()
FROM ranked r
WHERE sf.id = r.id
  AND r.rn > 1;

-- Prevent future duplicate published support FAQ questions within the same category
CREATE UNIQUE INDEX IF NOT EXISTS support_faqs_unique_published_question_category
ON public.support_faqs (category, public.normalize_faq_question(question))
WHERE is_published = true
  AND category IS NOT NULL
  AND public.normalize_faq_question(question) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS support_faqs_unique_published_question_uncategorized
ON public.support_faqs (public.normalize_faq_question(question))
WHERE is_published = true
  AND category IS NULL
  AND public.normalize_faq_question(question) <> '';

-- Dedupe JSONB FAQ arrays while preserving order and original object shape
CREATE OR REPLACE FUNCTION public.dedupe_faq_jsonb(_faqs jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH items AS (
    SELECT value AS item, ord
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(_faqs) = 'array' THEN _faqs ELSE '[]'::jsonb END) WITH ORDINALITY AS e(value, ord)
  ), normalized AS (
    SELECT
      item,
      ord,
      public.normalize_faq_question(coalesce(item->>'q', item->>'question', item->>'name')) AS qn
    FROM items
  ), ranked AS (
    SELECT item, ord, row_number() OVER (PARTITION BY qn ORDER BY ord) AS rn
    FROM normalized
    WHERE qn <> ''
      AND coalesce(item->>'a', item->>'answer', item #>> '{acceptedAnswer,text}') IS NOT NULL
      AND trim(coalesce(item->>'a', item->>'answer', item #>> '{acceptedAnswer,text}')) <> ''
  )
  SELECT coalesce(jsonb_agg(item ORDER BY ord), '[]'::jsonb)
  FROM ranked
  WHERE rn = 1
$$;

-- Dedupe site_settings values shaped like { items: [...] } without changing unrelated settings
CREATE OR REPLACE FUNCTION public.dedupe_site_settings_faqs(_value jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN jsonb_typeof(_value) = 'object' AND jsonb_typeof(_value->'items') = 'array'
      THEN jsonb_set(_value, '{items}', public.dedupe_faq_jsonb(_value->'items'), true)
    WHEN jsonb_typeof(_value) = 'array'
      THEN public.dedupe_faq_jsonb(_value)
    ELSE _value
  END
$$;

-- Trigger helpers to clean FAQ arrays on write
CREATE OR REPLACE FUNCTION public.clean_mba_compass_course_faqs()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.faqs := public.dedupe_faq_jsonb(NEW.faqs);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clean_mba_compass_course_faqs ON public.mba_compass_courses;
CREATE TRIGGER trg_clean_mba_compass_course_faqs
BEFORE INSERT OR UPDATE OF faqs ON public.mba_compass_courses
FOR EACH ROW
EXECUTE FUNCTION public.clean_mba_compass_course_faqs();

CREATE OR REPLACE FUNCTION public.clean_mocks_landing_faqs()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.faqs := public.dedupe_faq_jsonb(NEW.faqs);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clean_mocks_landing_faqs ON public.mocks_landing_settings;
CREATE TRIGGER trg_clean_mocks_landing_faqs
BEFORE INSERT OR UPDATE OF faqs ON public.mocks_landing_settings
FOR EACH ROW
EXECUTE FUNCTION public.clean_mocks_landing_faqs();

CREATE OR REPLACE FUNCTION public.clean_site_settings_faqs()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.key = 'faqs' THEN
    NEW.value := public.dedupe_site_settings_faqs(NEW.value);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clean_site_settings_faqs ON public.site_settings;
CREATE TRIGGER trg_clean_site_settings_faqs
BEFORE INSERT OR UPDATE OF value ON public.site_settings
FOR EACH ROW
EXECUTE FUNCTION public.clean_site_settings_faqs();

-- Clean existing JSONB FAQ sources once
UPDATE public.mba_compass_courses
SET faqs = public.dedupe_faq_jsonb(faqs), updated_at = now()
WHERE faqs IS NOT NULL
  AND jsonb_typeof(faqs) = 'array';

UPDATE public.mocks_landing_settings
SET faqs = public.dedupe_faq_jsonb(faqs), updated_at = now()
WHERE faqs IS NOT NULL
  AND jsonb_typeof(faqs) = 'array';

UPDATE public.site_settings
SET value = public.dedupe_site_settings_faqs(value), updated_at = now()
WHERE key = 'faqs';