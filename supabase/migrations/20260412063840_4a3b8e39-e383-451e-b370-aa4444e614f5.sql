
CREATE TABLE public.phone_otps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone text NOT NULL,
  otp_code text NOT NULL,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '5 minutes'),
  verified boolean NOT NULL DEFAULT false,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_phone_otps_phone ON public.phone_otps(phone);
CREATE INDEX idx_phone_otps_expires ON public.phone_otps(expires_at);

ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (sending OTP)
CREATE POLICY "Anyone can create OTP"
ON public.phone_otps FOR INSERT
TO public
WITH CHECK (true);

-- Allow anyone to read (verifying OTP)
CREATE POLICY "Anyone can read OTP"
ON public.phone_otps FOR SELECT
TO public
USING (true);

-- Allow anyone to update (marking verified, incrementing attempts)
CREATE POLICY "Anyone can update OTP"
ON public.phone_otps FOR UPDATE
TO public
USING (true);

-- Admins can delete
CREATE POLICY "Admins can manage OTPs"
ON public.phone_otps FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
