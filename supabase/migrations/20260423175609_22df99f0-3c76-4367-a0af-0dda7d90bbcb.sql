
UPDATE public.site_settings
SET value = jsonb_set(value, '{brand_name}', '"MBA Compass"'::jsonb)
WHERE key = 'header';

UPDATE public.site_settings
SET value = jsonb_set(value, '{copyright}', '"2026 MBA Compass. All rights reserved."'::jsonb)
WHERE key = 'footer';

UPDATE public.site_settings
SET value = jsonb_set(value, '{contact_email}', '"admin@mbacompass.in"'::jsonb)
WHERE key = 'footer';

-- Replace any remaining string occurrences across all settings (jsonb -> text -> back)
UPDATE public.site_settings
SET value = REPLACE(REPLACE(REPLACE(value::text, 'MBAHub', 'MBA Compass'), 'bschoolbuzz.com', 'mbacompass.in'), 'bschoolbuzz.in', 'mbacompass.in')::jsonb
WHERE value::text ILIKE '%MBAHub%' OR value::text ILIKE '%bschoolbuzz%';
