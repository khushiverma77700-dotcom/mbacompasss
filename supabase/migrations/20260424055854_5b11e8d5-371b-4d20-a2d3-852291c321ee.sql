ALTER TABLE public.ai_usage_logs
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS latency_ms integer;

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON public.ai_usage_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_provider ON public.ai_usage_logs (provider);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_model ON public.ai_usage_logs (model);