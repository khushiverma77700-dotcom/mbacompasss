CREATE TABLE public.magic_link_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid REFERENCES public.content_magic_links(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  entity_title text,
  entity_slug text,
  source text NOT NULL DEFAULT 'manual_save',
  field_count integer NOT NULL DEFAULT 0,
  changed_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  notified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.magic_link_edits TO authenticated;
GRANT ALL ON public.magic_link_edits TO service_role;

ALTER TABLE public.magic_link_edits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view magic link edits"
ON public.magic_link_edits FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_magic_link_edits_entity ON public.magic_link_edits (entity_type, entity_id, created_at DESC);
CREATE INDEX idx_magic_link_edits_link ON public.magic_link_edits (link_id, created_at DESC);