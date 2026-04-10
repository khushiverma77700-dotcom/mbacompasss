
-- Add tier classification to colleges
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS tier text DEFAULT 'Tier 2';
ALTER TABLE public.colleges ADD COLUMN IF NOT EXISTS college_category text DEFAULT 'Non-IIM';

-- Update existing colleges that have IIM in name
UPDATE public.colleges SET college_category = 'IIM', tier = 'Tier 1' WHERE lower(name) LIKE '%iim%';
UPDATE public.colleges SET tier = 'Tier 1' WHERE ranking IS NOT NULL AND ranking <= 25 AND tier = 'Tier 2';
UPDATE public.colleges SET tier = 'Tier 3' WHERE ranking IS NOT NULL AND ranking > 75;
