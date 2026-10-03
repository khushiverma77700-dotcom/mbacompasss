ALTER TABLE public.email_campaigns
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS from_name text,
  ADD COLUMN IF NOT EXISTS heading text,
  ADD COLUMN IF NOT EXISTS body_html text,
  ADD COLUMN IF NOT EXISTS ctas jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS template_id uuid,
  ADD COLUMN IF NOT EXISTS list_id uuid,
  ADD COLUMN IF NOT EXISTS list_name text,
  ADD COLUMN IF NOT EXISTS template_name text;

CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  from_name text,
  subject text NOT NULL DEFAULT '',
  heading text,
  body_html text NOT NULL DEFAULT '',
  ctas jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage email templates" ON public.email_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.email_contact_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  variables text[] NOT NULL DEFAULT '{}',
  contact_count integer NOT NULL DEFAULT 0,
  consent_confirmed boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_contact_lists TO authenticated;
GRANT ALL ON public.email_contact_lists TO service_role;
ALTER TABLE public.email_contact_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage contact lists" ON public.email_contact_lists FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.email_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.email_contact_lists(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  vars jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (list_id, email)
);
CREATE INDEX email_contacts_list_idx ON public.email_contacts(list_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_contacts TO authenticated;
GRANT ALL ON public.email_contacts TO service_role;
ALTER TABLE public.email_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage contacts" ON public.email_contacts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.email_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  email text NOT NULL,
  name text,
  message_id text NOT NULL,
  tracking_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'queued',
  error text,
  queued_at timestamptz NOT NULL DEFAULT now(),
  first_opened_at timestamptz,
  open_count integer NOT NULL DEFAULT 0,
  first_clicked_at timestamptz,
  click_count integer NOT NULL DEFAULT 0
);
CREATE INDEX email_campaign_recipients_campaign_idx ON public.email_campaign_recipients(campaign_id);
CREATE INDEX email_campaign_recipients_msg_idx ON public.email_campaign_recipients(message_id);
GRANT SELECT ON public.email_campaign_recipients TO authenticated;
GRANT ALL ON public.email_campaign_recipients TO service_role;
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read campaign recipients" ON public.email_campaign_recipients FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.email_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  event_type text NOT NULL,
  url text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX email_tracking_events_campaign_idx ON public.email_tracking_events(campaign_id, created_at);
GRANT SELECT ON public.email_tracking_events TO authenticated;
GRANT ALL ON public.email_tracking_events TO service_role;
ALTER TABLE public.email_tracking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read tracking events" ON public.email_tracking_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));