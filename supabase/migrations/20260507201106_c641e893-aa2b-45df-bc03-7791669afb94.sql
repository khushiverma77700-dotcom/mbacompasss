
CREATE TABLE IF NOT EXISTS public.cta_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cta_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  location_hint TEXT,
  requires_login BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.cta_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cta_settings"
  ON public.cta_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert cta_settings"
  ON public.cta_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update cta_settings"
  ON public.cta_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete cta_settings"
  ON public.cta_settings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_cta_settings_updated
  BEFORE UPDATE ON public.cta_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.cta_settings;
ALTER TABLE public.cta_settings REPLICA IDENTITY FULL;

INSERT INTO public.cta_settings (cta_key, label, category, description, location_hint, requires_login) VALUES
  ('college_download_brochure',      'Download College Brochure',     'Colleges',  'Brochure PDF download on any college page',                       'College detail pages',                            true),
  ('college_download_placement',     'Download Placement Report',     'Colleges',  'Placement report PDF on college pages',                           'College detail → Placements tab',                  true),
  ('college_request_callback',       'Request a Callback (College)',  'Colleges',  'Callback request from a college page',                            'College detail page sticky CTA',                   true),
  ('college_apply_now',              'Apply Now (College)',           'Colleges',  'External apply CTA on college pages',                             'College detail page',                              false),
  ('coaching_download_brochure',     'Download Coaching Brochure',    'Coaching',  'Brochure download on coaching institute pages',                   'Institute / coaching pages',                       true),
  ('coaching_request_callback',      'Request a Callback (Coaching)', 'Coaching',  'Callback request from coaching pages',                            'Institute / coaching pages',                       true),
  ('coaching_get_coupon',            'Reveal Coaching Coupon',        'Coaching',  'Coupon reveal CTA on coaching pages',                             'Institute / coaching pages, Coupons section',      true),
  ('coaching_view_courses',          'View Coaching Courses',         'Coaching',  'View course list on a coaching page',                             'Institute pages',                                  false),
  ('exam_download_syllabus',         'Download Exam Syllabus',        'Exams',     'Syllabus PDF on any exam page',                                   'Exam detail pages',                                true),
  ('exam_view_pattern',              'View Exam Pattern',             'Exams',     'View exam pattern details',                                       'Exam detail pages',                                false),
  ('article_download_pdf',           'Download Article PDF',          'Articles',  'PDF download on blog/articles',                                   'Article pages',                                    true),
  ('article_subscribe_newsletter',   'Subscribe Newsletter',          'Articles',  'Email newsletter subscribe form',                                 'Footer + article pages',                           false),
  ('mock_buy',                       'Buy Mock Test',                 'Mocks',     'Buy individual mock test',                                        '/mocks listing + landing page',                    true),
  ('mock_start',                     'Start Mock Test',               'Mocks',     'Start an unlocked mock test',                                     'Student dashboard / mock pages',                   true),
  ('mock_view_leaderboard',          'View Mock Leaderboard',         'Mocks',     'View leaderboard for a mock',                                     'Mock result page',                                 false),
  ('bundle_buy',                     'Buy Mock Bundle',               'Courses',   'Buy a mock bundle (Razorpay)',                                    '/courses bundle pages',                            true),
  ('course_enroll',                  'Enroll in Course',              'Courses',   'Enroll in MBA Compass course (Razorpay)',                         '/mba-compass course detail',                       true),
  ('course_compare',                 'Compare Courses',               'Courses',   'Compare courses side by side',                                    'MBA Compass compare page',                         false),
  ('tool_profile_analyzer',          'Run Profile Analyzer',          'AI Tools',  'AI Profile Analyzer submission',                                  '/profile-analyzer',                                true),
  ('tool_college_finder',            'Run College Finder',            'AI Tools',  'AI College Finder submission',                                    '/college-finder',                                  true),
  ('tool_coaching_finder',           'Run Coaching Finder',           'AI Tools',  'AI Coaching Finder submission',                                   '/coaching-finder',                                 true),
  ('tool_shortlister',               'Run College Shortlister',       'AI Tools',  'College Shortlister simulator submit',                            '/college-shortlister',                             true),
  ('tool_cat_calculator',            'Submit CAT Score Calculator',   'AI Tools',  'CAT score calculator submission',                                 '/cat-score-calculator',                            false),
  ('tool_roi_calculator',            'Submit ROI Calculator',         'AI Tools',  'MBA ROI calculator submission',                                   '/mba-roi-calculator',                              false),
  ('tool_iim_waitlist',              'IIM Waitlist Predictor',        'AI Tools',  'IIM Waitlist prediction CTA',                                     '/iim-waitlist',                                    true),
  ('tool_sop_review',                'AI SOP Review',                 'AI Tools',  'SOP review submission',                                           '/student/sop-review',                              true),
  ('compare_save',                   'Save Comparison',               'Comparisons','Save a comparison result',                                       'Compare pages',                                    true),
  ('compare_download',               'Download Comparison PDF',       'Comparisons','Download comparison as PDF',                                     'Compare pages',                                    true),
  ('banner_click',                   'Banner / Offer Click',          'Banners',   'Click on any home/listing banner CTA',                            'Homepage banners, OfferBanners',                   false),
  ('lead_popup_submit',              'Lead Popup Submit',             'Lead Forms','Submit lead capture popup form',                                  'Site-wide popup',                                  false),
  ('list_business',                  'List Your Business',            'Lead Forms','Business listing inquiry submit',                                 '/list-your-business',                              true),
  ('contact_submit',                 'Contact Form Submit',           'Lead Forms','Send message via /contact',                                       '/contact',                                         false),
  ('share_report',                   'Share Profile Report',          'Sharing',   'Share generated report link',                                     'Profile analyzer report page',                     false)
ON CONFLICT (cta_key) DO NOTHING;
