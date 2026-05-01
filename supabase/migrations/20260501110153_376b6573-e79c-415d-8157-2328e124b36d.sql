CREATE OR REPLACE FUNCTION public.dedupe_site_settings_faqs(_value jsonb)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN jsonb_typeof(_value) = 'object' AND jsonb_typeof(_value->'items') = 'array'
      THEN jsonb_set(_value, '{items}', public.dedupe_faq_jsonb(_value->'items'), true)
    WHEN jsonb_typeof(_value) = 'object' AND jsonb_typeof(_value->'faqs') = 'array'
      THEN jsonb_set(_value, '{faqs}', public.dedupe_faq_jsonb(_value->'faqs'), true)
    WHEN jsonb_typeof(_value) = 'array'
      THEN public.dedupe_faq_jsonb(_value)
    ELSE _value
  END
$$;

CREATE OR REPLACE FUNCTION public.clean_site_settings_faqs()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.key = 'faqs' OR NEW.key LIKE 'seo_page__%' THEN
    NEW.value := public.dedupe_site_settings_faqs(NEW.value);
  END IF;
  RETURN NEW;
END;
$$;

UPDATE public.site_settings
SET value = public.dedupe_site_settings_faqs(value), updated_at = now()
WHERE key = 'faqs'
   OR key LIKE 'seo_page__%';