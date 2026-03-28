
ALTER TABLE public.colleges
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS banner_url text,
ADD COLUMN IF NOT EXISTS established integer,
ADD COLUMN IF NOT EXISTS accreditations text[],
ADD COLUMN IF NOT EXISTS placement_highest text,
ADD COLUMN IF NOT EXISTS placement_median text,
ADD COLUMN IF NOT EXISTS total_students integer,
ADD COLUMN IF NOT EXISTS campus_size text,
ADD COLUMN IF NOT EXISTS admission_process text,
ADD COLUMN IF NOT EXISTS cutoff_info jsonb,
ADD COLUMN IF NOT EXISTS top_recruiters text[],
ADD COLUMN IF NOT EXISTS highlights jsonb,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();
