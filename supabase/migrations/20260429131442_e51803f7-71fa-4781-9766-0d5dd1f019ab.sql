ALTER TABLE public.student_notifications
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS link_label text;

CREATE INDEX IF NOT EXISTS idx_student_notifications_user_created
  ON public.student_notifications (user_id, created_at DESC);