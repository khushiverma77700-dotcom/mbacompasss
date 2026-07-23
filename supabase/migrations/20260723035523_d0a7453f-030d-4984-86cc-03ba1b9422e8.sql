CREATE TABLE public.page_indexing_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  slug text,
  page_type text,
  site_url text,
  verdict text,
  coverage_state text,
  index_status text,
  robots_txt_state text,
  indexing_state text,
  page_fetch_state text,
  google_canonical text,
  user_canonical text,
  last_crawl_time timestamptz,
  priority int NOT NULL DEFAULT 0,
  error text,
  raw jsonb,
  checked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.page_indexing_status TO authenticated;
GRANT ALL ON public.page_indexing_status TO service_role;

ALTER TABLE public.page_indexing_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read indexing status"
  ON public.page_indexing_status FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can modify indexing status"
  ON public.page_indexing_status FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_page_indexing_status_index_status ON public.page_indexing_status(index_status);
CREATE INDEX idx_page_indexing_status_priority ON public.page_indexing_status(priority DESC);
CREATE INDEX idx_page_indexing_status_page_type ON public.page_indexing_status(page_type);
CREATE INDEX idx_page_indexing_status_checked_at ON public.page_indexing_status(checked_at DESC);

CREATE TRIGGER trg_page_indexing_status_updated
  BEFORE UPDATE ON public.page_indexing_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();