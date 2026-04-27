
-- =============================================
-- MOCK BUNDLES (a.k.a. Course Management for mocks)
-- A bundle groups multiple existing mock_tests and unlocks them all on purchase.
-- =============================================

CREATE TABLE IF NOT EXISTS public.mock_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  exam_code text,
  cover_image_url text,
  price_inr numeric(10,2) NOT NULL DEFAULT 0,
  validity_days integer NOT NULL DEFAULT 365,
  is_published boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mock_bundles_published ON public.mock_bundles(is_published, sort_order);

CREATE TABLE IF NOT EXISTS public.mock_bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.mock_bundles(id) ON DELETE CASCADE,
  test_id uuid NOT NULL REFERENCES public.mock_tests(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bundle_id, test_id)
);
CREATE INDEX IF NOT EXISTS idx_mock_bundle_items_bundle ON public.mock_bundle_items(bundle_id);
CREATE INDEX IF NOT EXISTS idx_mock_bundle_items_test ON public.mock_bundle_items(test_id);

CREATE TABLE IF NOT EXISTS public.mock_bundle_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bundle_id uuid NOT NULL REFERENCES public.mock_bundles(id) ON DELETE RESTRICT,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  razorpay_order_id text UNIQUE,
  razorpay_payment_id text,
  razorpay_signature text,
  status text NOT NULL DEFAULT 'created',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mock_bundle_orders_user ON public.mock_bundle_orders(user_id);

CREATE TABLE IF NOT EXISTS public.mock_bundle_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  bundle_id uuid NOT NULL REFERENCES public.mock_bundles(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.mock_bundle_orders(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'purchase',
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  UNIQUE(user_id, bundle_id)
);
CREATE INDEX IF NOT EXISTS idx_mock_bundle_enrollments_user ON public.mock_bundle_enrollments(user_id);

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_mock_bundles_updated ON public.mock_bundles;
CREATE TRIGGER trg_mock_bundles_updated BEFORE UPDATE ON public.mock_bundles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_mock_bundle_orders_updated ON public.mock_bundle_orders;
CREATE TRIGGER trg_mock_bundle_orders_updated BEFORE UPDATE ON public.mock_bundle_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.mock_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_bundle_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_bundle_enrollments ENABLE ROW LEVEL SECURITY;

-- Bundles: published readable by everyone; admins manage all
CREATE POLICY "bundles public read published" ON public.mock_bundles
  FOR SELECT USING (is_published = true OR has_role(auth.uid(), 'admin'));
CREATE POLICY "bundles admin write" ON public.mock_bundles
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Items: same as bundles
CREATE POLICY "bundle items public read" ON public.mock_bundle_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.mock_bundles b WHERE b.id = bundle_id AND (b.is_published = true OR has_role(auth.uid(),'admin')))
  );
CREATE POLICY "bundle items admin write" ON public.mock_bundle_items
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Orders: owner read; admin all (writes go through service role / edge functions)
CREATE POLICY "bundle orders owner read" ON public.mock_bundle_orders
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "bundle orders admin write" ON public.mock_bundle_orders
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Enrollments: owner read; admin all
CREATE POLICY "bundle enrollments owner read" ON public.mock_bundle_enrollments
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "bundle enrollments admin write" ON public.mock_bundle_enrollments
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Helper: unlock all mocks in a bundle for a user (called by edge function with service role)
CREATE OR REPLACE FUNCTION public.unlock_bundle_mocks(_user_id uuid, _bundle_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _validity_days integer;
  _expires timestamptz;
  _count integer := 0;
BEGIN
  SELECT validity_days INTO _validity_days FROM public.mock_bundles WHERE id = _bundle_id;
  IF _validity_days IS NULL THEN _validity_days := 365; END IF;
  _expires := now() + (_validity_days || ' days')::interval;

  -- Bundle enrollment record
  INSERT INTO public.mock_bundle_enrollments (user_id, bundle_id, source, expires_at)
  VALUES (_user_id, _bundle_id, 'purchase', _expires)
  ON CONFLICT (user_id, bundle_id) DO UPDATE
    SET expires_at = GREATEST(EXCLUDED.expires_at, public.mock_bundle_enrollments.expires_at),
        enrolled_at = now();

  -- Per-mock enrollments (so existing StudentMocks page just works)
  WITH inserted AS (
    INSERT INTO public.mock_enrollments (user_id, test_id, source, expires_at)
    SELECT _user_id, mbi.test_id, 'bundle', _expires
    FROM public.mock_bundle_items mbi
    WHERE mbi.bundle_id = _bundle_id
    ON CONFLICT (user_id, test_id) DO UPDATE
      SET expires_at = GREATEST(EXCLUDED.expires_at, public.mock_enrollments.expires_at),
          source = COALESCE(public.mock_enrollments.source, EXCLUDED.source)
    RETURNING 1
  )
  SELECT count(*) INTO _count FROM inserted;

  RETURN _count;
END;
$$;

-- Helper: when admin adds a new mock to a bundle, auto-unlock it for all already-enrolled students
CREATE OR REPLACE FUNCTION public.sync_bundle_item_to_enrollments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.mock_enrollments (user_id, test_id, source, expires_at)
  SELECT e.user_id, NEW.test_id, 'bundle', e.expires_at
  FROM public.mock_bundle_enrollments e
  WHERE e.bundle_id = NEW.bundle_id
    AND (e.expires_at IS NULL OR e.expires_at > now())
  ON CONFLICT (user_id, test_id) DO UPDATE
    SET expires_at = GREATEST(EXCLUDED.expires_at, public.mock_enrollments.expires_at);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_bundle_item ON public.mock_bundle_items;
CREATE TRIGGER trg_sync_bundle_item
  AFTER INSERT ON public.mock_bundle_items
  FOR EACH ROW EXECUTE FUNCTION public.sync_bundle_item_to_enrollments();
