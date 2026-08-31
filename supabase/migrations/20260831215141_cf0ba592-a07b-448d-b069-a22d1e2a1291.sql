CREATE TABLE public.content_magic_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('college','article','exam')),
  entity_id uuid NOT NULL,
  entity_title text,
  entity_slug text,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  active boolean NOT NULL DEFAULT true,
  note text,
  expires_at timestamptz,
  created_by uuid,
  opened_count integer NOT NULL DEFAULT 0,
  saved_count integer NOT NULL DEFAULT 0,
  last_opened_at timestamptz,
  last_saved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_magic_links TO authenticated;
GRANT ALL ON public.content_magic_links TO service_role;

ALTER TABLE public.content_magic_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage magic links"
ON public.content_magic_links FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_content_magic_links_entity ON public.content_magic_links (entity_type, entity_id);

CREATE TRIGGER trg_content_magic_links_updated_at
BEFORE UPDATE ON public.content_magic_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();