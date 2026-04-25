
-- Add versioning to college_sections so AI generations never overwrite original content
ALTER TABLE public.college_sections
  ADD COLUMN IF NOT EXISTS version text NOT NULL DEFAULT 'original',
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS parent_section_id uuid NULL REFERENCES public.college_sections(id) ON DELETE SET NULL;

-- Mark all existing rows as the original baseline (preserve their SEO authority)
UPDATE public.college_sections
SET version = 'original', source = COALESCE(source, 'admin'), is_active = true
WHERE version IS NULL OR version = '';

-- Index for fast lookup by college + section_type + version
CREATE INDEX IF NOT EXISTS idx_college_sections_lookup
  ON public.college_sections (college_id, section_type, version, is_active);

-- Constraint: ensure only ONE row per (college_id, section_type, version) so AI versions stack as ai_v1, ai_v2…
CREATE UNIQUE INDEX IF NOT EXISTS uniq_college_section_version
  ON public.college_sections (college_id, section_type, version);
