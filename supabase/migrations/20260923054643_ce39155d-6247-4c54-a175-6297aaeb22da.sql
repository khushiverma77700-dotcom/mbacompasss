CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  category text,
  status text NOT NULL DEFAULT 'APPROVED',
  body_text text,
  header_text text,
  footer_text text,
  variable_count integer NOT NULL DEFAULT 0,
  components jsonb,
  source text NOT NULL DEFAULT 'manual',
  provider_id text,
  synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_templates_name_lang_key UNIQUE (name, language),
  CONSTRAINT whatsapp_templates_source_check CHECK (source IN ('manual','provider'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_templates TO authenticated;
GRANT ALL ON public.whatsapp_templates TO service_role;

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage whatsapp templates"
ON public.whatsapp_templates FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_whatsapp_templates_updated_at
BEFORE UPDATE ON public.whatsapp_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.whatsapp_campaigns
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.whatsapp_templates(id) ON DELETE SET NULL;