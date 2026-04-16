-- 1. Add new columns to colleges
ALTER TABLE public.colleges
  ADD COLUMN IF NOT EXISTS fees_lakhs NUMERIC,
  ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}'::text[];

-- 2. Add new columns to institutes
ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS fees_lakhs NUMERIC,
  ADD COLUMN IF NOT EXISTS specializations TEXT[] DEFAULT '{}'::text[];

-- 3. Best-effort backfill: parse first number out of colleges.fees text
UPDATE public.colleges
SET fees_lakhs = CASE
  WHEN fees ~* 'lakh' THEN
    NULLIF(regexp_replace(substring(fees from '([0-9]+(?:\.[0-9]+)?)'), ',', '', 'g'), '')::numeric
  WHEN fees ~* 'crore' THEN
    NULLIF(regexp_replace(substring(fees from '([0-9]+(?:\.[0-9]+)?)'), ',', '', 'g'), '')::numeric * 100
  WHEN fees ~ '[0-9]{6,}' THEN
    NULLIF(regexp_replace(substring(fees from '([0-9,]+)'), ',', '', 'g'), '')::numeric / 100000
  ELSE NULL
END
WHERE fees_lakhs IS NULL AND fees IS NOT NULL AND fees <> '';

-- 4. Backfill institutes from cheapest linked course (course.fees is in rupees)
UPDATE public.institutes i
SET fees_lakhs = sub.min_fee_lakhs
FROM (
  SELECT institute_id, ROUND(MIN(fees) / 100000.0, 2) AS min_fee_lakhs
  FROM public.courses
  WHERE fees IS NOT NULL AND fees > 0
  GROUP BY institute_id
) sub
WHERE i.id = sub.institute_id AND i.fees_lakhs IS NULL;

-- 5. Specializations catalogue table
CREATE TABLE IF NOT EXISTS public.specializations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'both' CHECK (type IN ('college','coaching','both')),
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.specializations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Specializations viewable by everyone" ON public.specializations;
CREATE POLICY "Specializations viewable by everyone"
  ON public.specializations FOR SELECT
  USING (active = true);

DROP POLICY IF EXISTS "Admins can manage specializations" ON public.specializations;
CREATE POLICY "Admins can manage specializations"
  ON public.specializations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_specializations_updated_at ON public.specializations;
CREATE TRIGGER update_specializations_updated_at
  BEFORE UPDATE ON public.specializations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Helpful indexes for filter performance
CREATE INDEX IF NOT EXISTS idx_colleges_fees_lakhs ON public.colleges(fees_lakhs);
CREATE INDEX IF NOT EXISTS idx_institutes_fees_lakhs ON public.institutes(fees_lakhs);
CREATE INDEX IF NOT EXISTS idx_colleges_specializations ON public.colleges USING GIN(specializations);
CREATE INDEX IF NOT EXISTS idx_institutes_specializations ON public.institutes USING GIN(specializations);

-- 7. Seed common specializations
INSERT INTO public.specializations (name, slug, type, sort_order) VALUES
  ('Finance', 'finance', 'college', 1),
  ('Marketing', 'marketing', 'college', 2),
  ('Operations', 'operations', 'college', 3),
  ('Human Resources', 'human-resources', 'college', 4),
  ('Business Analytics', 'business-analytics', 'college', 5),
  ('Strategy', 'strategy', 'college', 6),
  ('International Business', 'international-business', 'college', 7),
  ('Information Technology', 'information-technology', 'college', 8),
  ('CAT Coaching', 'cat-coaching', 'coaching', 1),
  ('XAT Coaching', 'xat-coaching', 'coaching', 2),
  ('GMAT Coaching', 'gmat-coaching', 'coaching', 3),
  ('SNAP Coaching', 'snap-coaching', 'coaching', 4),
  ('NMAT Coaching', 'nmat-coaching', 'coaching', 5),
  ('CMAT Coaching', 'cmat-coaching', 'coaching', 6),
  ('MAT Coaching', 'mat-coaching', 'coaching', 7),
  ('IIFT Coaching', 'iift-coaching', 'coaching', 8)
ON CONFLICT (slug) DO NOTHING;