
CREATE TABLE public.mega_menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_type text NOT NULL DEFAULT 'college',
  tab_label text NOT NULL,
  tab_sort_order integer DEFAULT 0,
  column_title text NOT NULL,
  column_sort_order integer DEFAULT 0,
  link_label text NOT NULL,
  link_url text NOT NULL,
  link_sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.mega_menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage mega_menu_items" ON public.mega_menu_items
  FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Mega menu viewable by everyone" ON public.mega_menu_items
  FOR SELECT TO public USING (active = true);

-- Seed default College mega-menu items
INSERT INTO public.mega_menu_items (menu_type, tab_label, tab_sort_order, column_title, column_sort_order, link_label, link_url, link_sort_order) VALUES
-- College > IIMs tab
('college', 'IIMs', 0, 'Top IIMs', 0, 'IIM Ahmedabad', '/college/iim-ahmedabad', 0),
('college', 'IIMs', 0, 'Top IIMs', 0, 'IIM Bangalore', '/college/iim-bangalore', 1),
('college', 'IIMs', 0, 'Top IIMs', 0, 'IIM Calcutta', '/college/iim-calcutta', 2),
('college', 'IIMs', 0, 'Top IIMs', 0, 'IIM Lucknow', '/college/iim-lucknow', 3),
('college', 'IIMs', 0, 'Top IIMs', 0, 'IIM Indore', '/college/iim-indore', 4),
('college', 'IIMs', 0, 'Top IIMs', 0, 'IIM Kozhikode', '/college/iim-kozhikode', 5),
('college', 'IIMs', 0, 'New IIMs', 1, 'IIM Nagpur', '/college/iim-nagpur', 0),
('college', 'IIMs', 0, 'New IIMs', 1, 'IIM Bodh Gaya', '/college/iim-bodh-gaya', 1),
('college', 'IIMs', 0, 'New IIMs', 1, 'IIM Jammu', '/college/iim-jammu', 2),
('college', 'IIMs', 0, 'Exams', 2, 'CAT 2026', '/exam/cat-exam', 0),
('college', 'IIMs', 0, 'Exams', 2, 'XAT 2026', '/exam/xat-exam', 1),

-- College > Non-IIMs tab
('college', 'Non-IIMs', 1, 'Top Non-IIM Colleges', 0, 'XLRI Jamshedpur', '/college/xlri-jamshedpur', 0),
('college', 'Non-IIMs', 1, 'Top Non-IIM Colleges', 0, 'FMS Delhi', '/college/fms-delhi', 1),
('college', 'Non-IIMs', 1, 'Top Non-IIM Colleges', 0, 'MDI Gurgaon', '/college/mdi-gurgaon', 2),
('college', 'Non-IIMs', 1, 'Top Non-IIM Colleges', 0, 'SPJIMR Mumbai', '/college/spjimr-mumbai', 3),
('college', 'Non-IIMs', 1, 'Top Non-IIM Colleges', 0, 'JBIMS Mumbai', '/college/jbims-mumbai', 4),
('college', 'Non-IIMs', 1, 'Courses', 1, 'MBA', '/colleges?course=MBA', 0),
('college', 'Non-IIMs', 1, 'Courses', 1, 'PGDM', '/colleges?course=PGDM', 1),
('college', 'Non-IIMs', 1, 'Courses', 1, 'Executive MBA', '/colleges?course=EMBA', 2),

-- College > City Wise tab
('college', 'City Wise', 2, 'MBA Colleges (Cities)', 0, 'MBA in Mumbai', '/colleges?city=Mumbai', 0),
('college', 'City Wise', 2, 'MBA Colleges (Cities)', 0, 'MBA in Delhi', '/colleges?city=Delhi', 1),
('college', 'City Wise', 2, 'MBA Colleges (Cities)', 0, 'MBA in Bangalore', '/colleges?city=Bangalore', 2),
('college', 'City Wise', 2, 'MBA Colleges (Cities)', 0, 'MBA in Pune', '/colleges?city=Pune', 3),
('college', 'City Wise', 2, 'MBA Colleges (Cities)', 0, 'MBA in Hyderabad', '/colleges?city=Hyderabad', 4),
('college', 'City Wise', 2, 'MBA Colleges (Cities)', 0, 'MBA in Chennai', '/colleges?city=Chennai', 5),
('college', 'City Wise', 2, 'MBA Colleges (States)', 1, 'Maharashtra', '/colleges?state=Maharashtra', 0),
('college', 'City Wise', 2, 'MBA Colleges (States)', 1, 'Karnataka', '/colleges?state=Karnataka', 1),
('college', 'City Wise', 2, 'MBA Colleges (States)', 1, 'Delhi', '/colleges?state=Delhi', 2),
('college', 'City Wise', 2, 'MBA Colleges (States)', 1, 'Tamil Nadu', '/colleges?state=Tamil+Nadu', 3),

-- College > Featured tab
('college', 'Featured', 3, 'Featured Colleges', 0, 'View All Colleges', '/colleges', 0),
('college', 'Featured', 3, 'Featured Colleges', 0, 'College Shortlister', '/college-shortlister', 1),
('college', 'Featured', 3, 'Featured Colleges', 0, 'AI College Finder', '/college-finder', 2),
('college', 'Featured', 3, 'Featured Colleges', 0, 'Compare Colleges', '/compare', 3),
('college', 'Featured', 3, 'Tools', 1, 'Profile Analyzer', '/profile-analyzer', 0),
('college', 'Featured', 3, 'Tools', 1, 'CAT Score Calculator', '/cat-score-calculator', 1),

-- Coaching menu items
('coaching', 'CAT Coaching', 0, 'Top CAT Coaching', 0, 'All CAT Coaching', '/category/cat', 0),
('coaching', 'CAT Coaching', 0, 'By City', 1, 'CAT Coaching in Mumbai', '/category/cat?city=Mumbai', 0),
('coaching', 'CAT Coaching', 0, 'By City', 1, 'CAT Coaching in Delhi', '/category/cat?city=Delhi', 1),
('coaching', 'CAT Coaching', 0, 'By City', 1, 'CAT Coaching in Bangalore', '/category/cat?city=Bangalore', 2),
('coaching', 'CAT Coaching', 0, 'By City', 1, 'CAT Coaching in Pune', '/category/cat?city=Pune', 3),
('coaching', 'CAT Coaching', 0, 'By City', 1, 'Online CAT Coaching', '/category/cat?mode=Online', 4),

('coaching', 'GMAT Prep', 1, 'Top GMAT Coaching', 0, 'All GMAT Coaching', '/category/gmat', 0),
('coaching', 'GMAT Prep', 1, 'By City', 1, 'GMAT Coaching in Mumbai', '/category/gmat?city=Mumbai', 0),
('coaching', 'GMAT Prep', 1, 'By City', 1, 'GMAT Coaching in Delhi', '/category/gmat?city=Delhi', 1),
('coaching', 'GMAT Prep', 1, 'By City', 1, 'Online GMAT Coaching', '/category/gmat?mode=Online', 2),

('coaching', 'Other Exams', 2, 'Exam Coaching', 0, 'XAT & SNAP Coaching', '/category/xat-snap', 0),
('coaching', 'Other Exams', 2, 'Exam Coaching', 0, 'MAT & CMAT Coaching', '/category/mat-cmat', 1),
('coaching', 'Other Exams', 2, 'Exam Coaching', 0, 'GRE & TOEFL Coaching', '/category/gre-toefl', 2),
('coaching', 'Other Exams', 2, 'Exam Coaching', 0, 'Interview Prep', '/category/interview', 3),
('coaching', 'Other Exams', 2, 'Top Picks', 1, 'Featured Institutes', '/#featured', 0),
('coaching', 'Other Exams', 2, 'Top Picks', 1, 'Coaching of the Week', '/#coaching-of-week', 1),
('coaching', 'Other Exams', 2, 'Top Picks', 1, 'AI Coaching Finder', '/#ai-coaching', 2);
