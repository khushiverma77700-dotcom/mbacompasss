ALTER TABLE public.email_contact_lists ADD COLUMN IF NOT EXISTS is_test_inbox boolean NOT NULL DEFAULT false;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS last_error text;
ALTER TABLE public.email_campaign_recipients
  ADD COLUMN IF NOT EXISTS is_test_inbox boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS placement text;