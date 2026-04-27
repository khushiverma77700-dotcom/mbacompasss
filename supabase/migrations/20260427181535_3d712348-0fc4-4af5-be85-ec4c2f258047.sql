CREATE TABLE public.mocks_landing_settings (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  -- Hero
  hero_eyebrow text DEFAULT 'CAT 2025 Mock Test Series',
  hero_headline text DEFAULT 'Crack CAT 2025 with Mocks That Mirror the Real Exam',
  hero_subheadline text DEFAULT 'Realistic interface, server-side timing, AI analysis, and detailed solutions — built by 99+ percentilers.',
  hero_cta_label text DEFAULT 'Get Instant Access',
  hero_image_url text,
  -- Pricing / Offer
  price_current integer DEFAULT 999,
  price_original integer DEFAULT 2999,
  price_discount_label text DEFAULT '67% OFF',
  offer_urgency text DEFAULT 'Limited-time offer ends soon',
  offer_ends_at timestamptz,
  bundle_title text DEFAULT 'Complete CAT Mock Bundle',
  bundle_subtitle text DEFAULT '10 full-length mocks + 30 sectional tests',
  cta_target_test_id uuid,
  -- Trust
  trust_students text DEFAULT '12,000+',
  trust_avg_improvement text DEFAULT '+18 percentile',
  trust_rating text DEFAULT '4.8/5',
  -- Content blocks (JSONB arrays)
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  whats_included jsonb NOT NULL DEFAULT '[]'::jsonb,
  comparison jsonb NOT NULL DEFAULT '[]'::jsonb,
  testimonials jsonb NOT NULL DEFAULT '[]'::jsonb,
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Tracking
  meta_pixel_id text,
  -- SEO
  meta_title text DEFAULT 'CAT 2025 Mock Tests | Real Exam Interface | MBAHub',
  meta_description text DEFAULT 'Crack CAT 2025 with realistic mock tests. AI analysis, detailed solutions, server-side timing. Trusted by 12,000+ aspirants.',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mocks_landing_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view mocks landing settings"
  ON public.mocks_landing_settings FOR SELECT USING (true);

CREATE POLICY "Admins can manage mocks landing settings"
  ON public.mocks_landing_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_mocks_landing_updated
  BEFORE UPDATE ON public.mocks_landing_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed one row with sensible defaults
INSERT INTO public.mocks_landing_settings (
  singleton,
  benefits,
  whats_included,
  comparison,
  testimonials,
  faqs
) VALUES (
  true,
  '[
    {"icon":"BrainCircuit","title":"AI Mock Analysis","desc":"Personalized weakness reports after every test."},
    {"icon":"Timer","title":"Real CAT Interface","desc":"Server-side timer, sectional locks, calculator."},
    {"icon":"BookOpen","title":"Video Solutions","desc":"Detailed video explanations for every question."},
    {"icon":"TrendingUp","title":"Percentile Predictor","desc":"Live percentile based on actual CAT data."},
    {"icon":"Users","title":"All-India Leaderboard","desc":"Compare your rank with 12,000+ aspirants."},
    {"icon":"MessageCircle","title":"Doubt Solving","desc":"24/7 doubt resolution by IIM mentors."}
  ]'::jsonb,
  '[
    {"label":"Full-length mocks","value":"10"},
    {"label":"Sectional tests","value":"30"},
    {"label":"Topic-wise quizzes","value":"100+"},
    {"label":"Video solutions","value":"Every Q"},
    {"label":"AI analysis","value":"Included"},
    {"label":"Validity","value":"12 months"}
  ]'::jsonb,
  '[
    {"feature":"Real CAT interface","us":true,"others":false},
    {"feature":"AI personalised analysis","us":true,"others":false},
    {"feature":"Video solutions","us":true,"others":true},
    {"feature":"All-India leaderboard","us":true,"others":true},
    {"feature":"Percentile predictor","us":true,"others":false},
    {"feature":"Price under \u20b91000","us":true,"others":false}
  ]'::jsonb,
  '[
    {"name":"Aarav Sharma","score":"99.6%ile","quote":"The mocks felt exactly like the real CAT. AI analysis showed my weak topics in days."},
    {"name":"Priya Menon","score":"IIM Bangalore","quote":"Best ROI mock series I tried. Improved from 85 to 99 percentile in 3 months."},
    {"name":"Rahul Verma","score":"99.2%ile","quote":"Detailed solutions and the leaderboard kept me pushing harder every week."}
  ]'::jsonb,
  '[
    {"q":"How are these mocks different from free ones?","a":"Real CAT interface, AI-driven personalised analysis, video solutions for every question, and an All-India leaderboard."},
    {"q":"Is there a refund policy?","a":"Yes \u2014 7-day money-back guarantee, no questions asked."},
    {"q":"How long is access valid?","a":"12 months from the day of purchase."},
    {"q":"Are these suitable for beginners?","a":"Yes. Start with sectional tests, then move to full-length mocks as you build stamina."},
    {"q":"Do I need any software?","a":"No. Everything runs in your browser \u2014 desktop or mobile."}
  ]'::jsonb
);