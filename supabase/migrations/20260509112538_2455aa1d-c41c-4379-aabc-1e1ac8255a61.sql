
CREATE TABLE IF NOT EXISTS public.welcome_email_template (
  id INT PRIMARY KEY DEFAULT 1,
  subject TEXT NOT NULL DEFAULT 'Welcome to MBA Compass — Your Course Access Details',
  body_html TEXT NOT NULL DEFAULT '<p>Hi {{name}},</p><p>Thank you for purchasing <strong>{{course}}</strong>!</p><p>Your login details:</p><ul><li>Email: <strong>{{email}}</strong></li><li>Password: <strong>{{password}}</strong></li></ul><p><a href="{{dashboard_link}}">Go to your Dashboard</a></p><p>Amount paid: ₹{{amount}}</p><p>For support, contact {{support_email}}.</p><p>— Team MBA Compass</p>',
  support_email TEXT NOT NULL DEFAULT 'support@mbacompass.in',
  support_phone TEXT NOT NULL DEFAULT '',
  dashboard_link TEXT NOT NULL DEFAULT 'https://dashboard.mbacompass.in',
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);

INSERT INTO public.welcome_email_template (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.welcome_email_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read welcome template"
  ON public.welcome_email_template FOR SELECT USING (true);
CREATE POLICY "Admins manage welcome template"
  ON public.welcome_email_template FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.welcome_email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  course_name TEXT,
  amount NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  brevo_message_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.welcome_email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view email logs"
  ON public.welcome_email_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_welcome_email_logs_created ON public.welcome_email_logs(created_at DESC);
