
CREATE TABLE IF NOT EXISTS public.course_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.mba_compass_courses(id) ON DELETE CASCADE,
  razorpay_order_id text UNIQUE NOT NULL,
  razorpay_payment_id text,
  razorpay_signature text,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'created',
  notes jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_course_orders_user ON public.course_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_course_orders_course ON public.course_orders(course_id);
ALTER TABLE public.course_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own orders" ON public.course_orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins view all orders" ON public.course_orders FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.mba_compass_courses(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.course_orders(id) ON DELETE SET NULL,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  UNIQUE(user_id, course_id)
);
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own enrollments" ON public.course_enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins view all enrollments" ON public.course_enrollments FOR SELECT USING (has_role(auth.uid(), 'admin'));
