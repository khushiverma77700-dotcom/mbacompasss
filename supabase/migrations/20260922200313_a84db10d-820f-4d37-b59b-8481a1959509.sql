ALTER TABLE public.whatsapp_campaigns
  ADD COLUMN IF NOT EXISTS send_start_time time NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS send_end_time time NOT NULL DEFAULT '21:00',
  ADD COLUMN IF NOT EXISTS send_timezone text NOT NULL DEFAULT 'Asia/Kolkata';