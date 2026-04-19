
-- ============== USER LISTINGS ==============
CREATE TABLE public.user_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  listing_type text NOT NULL CHECK (listing_type IN ('coaching','college','request')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','changes_requested','approved','rejected')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  sections jsonb NOT NULL DEFAULT '{}'::jsonb,
  poc jsonb DEFAULT '{}'::jsonb,
  poc_verified boolean NOT NULL DEFAULT false,
  admin_notes text,
  target_record_id uuid,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_listings_user ON public.user_listings(user_id);
CREATE INDEX idx_user_listings_status ON public.user_listings(status);
CREATE INDEX idx_user_listings_type ON public.user_listings(listing_type);

ALTER TABLE public.user_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own listings"
  ON public.user_listings FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create own listings"
  ON public.user_listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listings"
  ON public.user_listings FOR UPDATE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete listings"
  ON public.user_listings FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_user_listings_updated_at
  BEFORE UPDATE ON public.user_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== POC PROFILES ==============
CREATE TABLE public.user_listing_pocs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  designation text,
  organization text,
  website text,
  email text,
  email_is_generic boolean DEFAULT false,
  mobile text,
  mobile_otp_verified boolean DEFAULT false,
  whatsapp text,
  city text,
  state text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pocs_user ON public.user_listing_pocs(user_id);

ALTER TABLE public.user_listing_pocs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own poc"
  ON public.user_listing_pocs FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create own poc"
  ON public.user_listing_pocs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own poc"
  ON public.user_listing_pocs FOR UPDATE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_pocs_updated_at
  BEFORE UPDATE ON public.user_listing_pocs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== SOURCE TRACKING ON LIVE TABLES ==============
ALTER TABLE public.colleges
  ADD COLUMN IF NOT EXISTS submitted_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'admin' CHECK (source IN ('admin','user')),
  ADD COLUMN IF NOT EXISTS last_updated_by text DEFAULT 'admin' CHECK (last_updated_by IN ('admin','user'));

ALTER TABLE public.institutes
  ADD COLUMN IF NOT EXISTS submitted_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'admin' CHECK (source IN ('admin','user')),
  ADD COLUMN IF NOT EXISTS last_updated_by text DEFAULT 'admin' CHECK (last_updated_by IN ('admin','user'));

-- ============== STORAGE BUCKET ==============
INSERT INTO storage.buckets (id, name, public)
VALUES ('listing-uploads', 'listing-uploads', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Listing uploads are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-uploads');

CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own listing files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'listing-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own listing files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'listing-uploads'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
