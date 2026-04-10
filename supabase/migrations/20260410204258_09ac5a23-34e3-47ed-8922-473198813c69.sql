
CREATE TABLE public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature text NOT NULL,
  model text,
  prompt_tokens integer DEFAULT 0,
  completion_tokens integer DEFAULT 0,
  total_tokens integer DEFAULT 0,
  estimated_cost numeric DEFAULT 0,
  status text DEFAULT 'success',
  error_message text,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage ai_usage_logs"
  ON public.ai_usage_logs FOR ALL
  TO public
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Edge functions can insert logs"
  ON public.ai_usage_logs FOR INSERT
  TO public
  WITH CHECK (true);

CREATE INDEX idx_ai_usage_logs_feature ON public.ai_usage_logs(feature);
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at DESC);
