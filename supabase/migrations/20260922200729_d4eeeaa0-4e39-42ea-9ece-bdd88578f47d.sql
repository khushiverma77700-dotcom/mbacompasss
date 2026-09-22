-- Reusable saved WhatsApp messages
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  message_type text NOT NULL DEFAULT 'template' CHECK (message_type IN ('template','text')),
  template_name text,
  template_language text NOT NULL DEFAULT 'en',
  template_params jsonb NOT NULL DEFAULT '[]'::jsonb,
  message_body text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_messages TO service_role;

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage whatsapp messages"
  ON public.whatsapp_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER whatsapp_messages_updated_at
  BEFORE UPDATE ON public.whatsapp_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.whatsapp_campaigns
  ADD COLUMN IF NOT EXISTS message_id uuid REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL;

-- Per-campaign progress counts for the admin overview
CREATE OR REPLACE FUNCTION public.whatsapp_campaign_progress()
RETURNS TABLE (
  campaign_id uuid,
  total bigint,
  sent bigint,
  failed bigint,
  pending bigint,
  retry bigint
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    r.campaign_id,
    count(*)::bigint,
    count(*) FILTER (WHERE r.status = 'sent')::bigint,
    count(*) FILTER (WHERE r.status = 'max_retry_failed')::bigint,
    count(*) FILTER (WHERE r.status = 'pending')::bigint,
    count(*) FILTER (WHERE r.status = 'retry')::bigint
  FROM public.whatsapp_recipients r
  GROUP BY r.campaign_id
$$;

REVOKE ALL ON FUNCTION public.whatsapp_campaign_progress() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.whatsapp_campaign_progress() TO authenticated, service_role;