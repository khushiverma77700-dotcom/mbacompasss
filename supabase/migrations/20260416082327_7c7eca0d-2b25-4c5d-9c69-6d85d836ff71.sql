
-- Table to track Google Indexing API submissions
CREATE TABLE public.indexing_urls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  page_type TEXT NOT NULL DEFAULT 'other',
  record_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  last_submitted_at TIMESTAMP WITH TIME ZONE,
  last_response JSONB,
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(url)
);

-- Enable RLS
ALTER TABLE public.indexing_urls ENABLE ROW LEVEL SECURITY;

-- Only admins can manage indexing URLs
CREATE POLICY "Admins can manage indexing_urls"
ON public.indexing_urls
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Edge functions can insert/update (for automated submissions)
CREATE POLICY "Service can insert indexing_urls"
ON public.indexing_urls
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Service can update indexing_urls"
ON public.indexing_urls
FOR UPDATE
TO public
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_indexing_urls_updated_at
BEFORE UPDATE ON public.indexing_urls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexing logs table for audit trail
CREATE TABLE public.indexing_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indexing_url_id UUID REFERENCES public.indexing_urls(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  response JSONB,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.indexing_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage indexing_logs"
ON public.indexing_logs
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert indexing_logs"
ON public.indexing_logs
FOR INSERT
TO public
WITH CHECK (true);
