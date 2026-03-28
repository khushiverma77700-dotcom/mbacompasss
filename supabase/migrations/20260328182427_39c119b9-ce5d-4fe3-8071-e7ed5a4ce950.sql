
-- Coupons table
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  description text,
  discount_text text,
  institute_id uuid REFERENCES public.institutes(id) ON DELETE SET NULL,
  valid_from timestamptz,
  valid_until timestamptz,
  max_uses integer DEFAULT 0,
  current_uses integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Active coupons viewable by authenticated" ON public.coupons FOR SELECT TO authenticated USING (active = true);

-- Coupon claims
CREATE TABLE public.coupon_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  target_exam text,
  login_source text,
  claimed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupon_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all claims" ON public.coupon_claims FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own claims" ON public.coupon_claims FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own claims" ON public.coupon_claims FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Institute results
CREATE TABLE public.institute_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid REFERENCES public.institutes(id) ON DELETE CASCADE NOT NULL,
  year integer NOT NULL,
  college_name text NOT NULL,
  students_selected integer DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.institute_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage results" ON public.institute_results FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Results viewable by everyone" ON public.institute_results FOR SELECT USING (true);

-- College sections (editable tabs)
CREATE TABLE public.college_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid REFERENCES public.colleges(id) ON DELETE CASCADE NOT NULL,
  section_type text NOT NULL,
  title text,
  content text,
  data jsonb DEFAULT '{}',
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.college_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage college_sections" ON public.college_sections FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "College sections viewable by everyone" ON public.college_sections FOR SELECT USING (true);

-- Coaching of the week
CREATE TABLE public.coaching_of_week (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institute_id uuid REFERENCES public.institutes(id) ON DELETE CASCADE NOT NULL,
  headline text,
  description text,
  offer_text text,
  offer_details text,
  results_summary text,
  banner_url text,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coaching_of_week ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage coaching_of_week" ON public.coaching_of_week FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Active coaching_of_week viewable" ON public.coaching_of_week FOR SELECT USING (active = true);

-- Add institute_id to testimonials for institute-linked testimonials
ALTER TABLE public.testimonials ADD COLUMN institute_id uuid REFERENCES public.institutes(id) ON DELETE SET NULL;
