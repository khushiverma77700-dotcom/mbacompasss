UPDATE public.phone_otps
SET otp_code = encode(digest(phone || ':' || otp_code, 'sha256'), 'hex')
WHERE otp_code ~ '^[0-9]{6}$';

ALTER TABLE public.phone_otps
DROP CONSTRAINT IF EXISTS phone_otps_otp_code_hashed_check;

ALTER TABLE public.phone_otps
ADD CONSTRAINT phone_otps_otp_code_hashed_check
CHECK (otp_code ~ '^[a-f0-9]{64}$');

COMMENT ON COLUMN public.phone_otps.otp_code IS 'SHA-256 hash of phone:number OTP, never plaintext.';