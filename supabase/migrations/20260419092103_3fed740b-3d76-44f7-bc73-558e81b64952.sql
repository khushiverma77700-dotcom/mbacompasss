ALTER TABLE public.user_listings
  ADD COLUMN IF NOT EXISTS approved_record_id uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone;