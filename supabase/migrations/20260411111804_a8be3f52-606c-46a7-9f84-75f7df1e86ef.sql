
ALTER TABLE public.courses
  ADD COLUMN mode TEXT DEFAULT 'Offline',
  ADD COLUMN start_date TEXT,
  ADD COLUMN total_seats INTEGER,
  ADD COLUMN highlights TEXT[] DEFAULT '{}',
  ADD COLUMN eligibility TEXT,
  ADD COLUMN demo_video_url TEXT,
  ADD COLUMN discount_text TEXT,
  ADD COLUMN rating NUMERIC DEFAULT 0,
  ADD COLUMN enrolled_count INTEGER DEFAULT 0;
