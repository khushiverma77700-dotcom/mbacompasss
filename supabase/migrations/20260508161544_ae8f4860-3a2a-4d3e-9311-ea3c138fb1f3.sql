
CREATE TABLE IF NOT EXISTS public.bulk_mock_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL,
  label TEXT,
  total_items INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued', -- queued | running | completed | partial | failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bulk_mock_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.bulk_mock_requests(id) ON DELETE CASCADE,
  exam_code TEXT NOT NULL,
  category TEXT NOT NULL,            -- full_length | sectional | topic | daily | practice
  level TEXT NOT NULL DEFAULT 'mixed',
  section_code TEXT,
  topic TEXT,
  questions_per_set INT NOT NULL DEFAULT 20,
  sets INT NOT NULL DEFAULT 1,
  test_name_prefix TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | processing | completed | failed | needs_review
  paused BOOLEAN NOT NULL DEFAULT false,
  generation_id UUID,                 -- ai_mock_generations.id once dispatched
  total_requested INT NOT NULL DEFAULT 0,
  total_generated INT NOT NULL DEFAULT 0,
  error_message TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  worker_lock_until TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bulk_mock_items_request ON public.bulk_mock_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_bulk_mock_items_status ON public.bulk_mock_request_items(status, paused);

ALTER TABLE public.bulk_mock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_mock_request_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bulk mock requests"
  ON public.bulk_mock_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage bulk mock items"
  ON public.bulk_mock_request_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_bulk_mock_requests_updated
  BEFORE UPDATE ON public.bulk_mock_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_bulk_mock_items_updated
  BEFORE UPDATE ON public.bulk_mock_request_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
