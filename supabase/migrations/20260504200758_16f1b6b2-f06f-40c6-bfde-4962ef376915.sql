
-- API Credentials table
CREATE TABLE public.api_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key_name TEXT NOT NULL UNIQUE,
  key_value TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT api_credentials_key_name_format CHECK (key_name ~ '^[A-Z][A-Z0-9_]*$')
);

ALTER TABLE public.api_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view api credentials"
  ON public.api_credentials FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert api credentials"
  ON public.api_credentials FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update api credentials"
  ON public.api_credentials FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete api credentials"
  ON public.api_credentials FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_api_credentials_updated_at
  BEFORE UPDATE ON public.api_credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log
CREATE TABLE public.api_credential_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key_name TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID,
  actor_email TEXT,
  old_value_masked TEXT,
  new_value_masked TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.api_credential_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.api_credential_audit FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert audit log"
  ON public.api_credential_audit FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Mask helper
CREATE OR REPLACE FUNCTION public.mask_secret(_v TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _v IS NULL OR length(_v) = 0 THEN '(empty)'
    WHEN length(_v) <= 8 THEN repeat('*', length(_v))
    ELSE substr(_v, 1, 4) || repeat('*', GREATEST(length(_v) - 8, 4)) || substr(_v, length(_v) - 3)
  END
$$;

-- Audit trigger
CREATE OR REPLACE FUNCTION public.log_api_credential_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _email TEXT;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.api_credential_audit (key_name, action, actor_id, actor_email, new_value_masked)
    VALUES (NEW.key_name, 'created', auth.uid(), _email, public.mask_secret(NEW.key_value));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.key_value IS DISTINCT FROM NEW.key_value THEN
      INSERT INTO public.api_credential_audit (key_name, action, actor_id, actor_email, old_value_masked, new_value_masked)
      VALUES (NEW.key_name, 'value_changed', auth.uid(), _email, public.mask_secret(OLD.key_value), public.mask_secret(NEW.key_value));
    END IF;
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
      INSERT INTO public.api_credential_audit (key_name, action, actor_id, actor_email)
      VALUES (NEW.key_name, CASE WHEN NEW.is_active THEN 'activated' ELSE 'deactivated' END, auth.uid(), _email);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.api_credential_audit (key_name, action, actor_id, actor_email, old_value_masked)
    VALUES (OLD.key_name, 'deleted', auth.uid(), _email, public.mask_secret(OLD.key_value));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER api_credentials_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.api_credentials
  FOR EACH ROW EXECUTE FUNCTION public.log_api_credential_change();

-- Seed known keys
INSERT INTO public.api_credentials (key_name, category, description) VALUES
  ('RAZORPAY_KEY_ID', 'payments', 'Razorpay public Key ID for creating orders'),
  ('RAZORPAY_KEY_SECRET', 'payments', 'Razorpay secret used to verify payments'),
  ('RAZORPAY_WEBHOOK_SECRET', 'payments', 'Razorpay webhook signing secret'),
  ('OPENAI_API_KEY', 'ai', 'OpenAI API key (used by Personalized Mock Hub)'),
  ('GEMINI_API_KEY', 'ai', 'Google Gemini API key (direct API, not via Lovable AI Gateway)'),
  ('MSG91_AUTH_KEY', 'sms', 'MSG91 Auth Key for sending OTP'),
  ('MSG91_TEMPLATE_ID', 'sms', 'MSG91 OTP template ID'),
  ('FAST2SMS_API_KEY', 'sms', 'Fast2SMS fallback OTP provider key'),
  ('TWILIO_FROM_NUMBER', 'sms', 'Twilio from-number for SMS fallback'),
  ('GOOGLE_INDEXING_SERVICE_ACCOUNT', 'seo', 'Full Google service account JSON for Indexing API'),
  ('GOOGLE_INDEXING_CLIENT_EMAIL', 'seo', 'Service account email for Google Indexing API'),
  ('GOOGLE_INDEXING_PRIVATE_KEY', 'seo', 'Private key (PEM) for Google Indexing API'),
  ('GOOGLE_PSI_API_KEY', 'seo', 'Google PageSpeed Insights API key'),
  ('FIRECRAWL_API_KEY', 'scraping', 'Firecrawl API key for site scraping')
ON CONFLICT (key_name) DO NOTHING;
