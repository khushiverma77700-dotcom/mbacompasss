
-- ============ 1. RESULTS TABLE ============
CREATE TABLE public.iim_waitlist_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_name text NOT NULL,
  college_short text,
  college_type text NOT NULL DEFAULT 'IIM', -- IIM | IIT | Non-IIM
  result_date date,
  result_date_label text, -- e.g. "Apr 29 – May 4, 2026" or "~May 1, 2026"
  status text NOT NULL DEFAULT 'expected', -- declared | coming_soon | expected
  result_url text,
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ 2. MOVEMENT (5-YR TREND) TABLE ============
CREATE TABLE public.iim_waitlist_movement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_name text NOT NULL,
  college_short text,
  college_type text NOT NULL DEFAULT 'IIM', -- IIM | IIT | Private
  category text NOT NULL DEFAULT 'General', -- General | EWS | OBC | SC | ST
  wl_2021 int,
  wl_2022 int,
  wl_2023 int,
  wl_2024 int,
  wl_2025 int,
  wl_2026_est int,
  five_yr_avg numeric,
  trend text, -- rising | falling | stable
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ 3. RTI INSIGHTS TABLE ============
CREATE TABLE public.iim_waitlist_rti (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_name text NOT NULL,
  college_short text,
  college_type text NOT NULL DEFAULT 'IIM',
  rti_year int NOT NULL DEFAULT 2025,
  insights jsonb NOT NULL DEFAULT '[]'::jsonb, -- array of bullet strings
  source_url text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ 4. APPLICATION FUNNEL TABLE ============
CREATE TABLE public.iim_waitlist_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_name text NOT NULL,
  college_short text,
  college_type text NOT NULL DEFAULT 'IIM',
  year int NOT NULL DEFAULT 2026,
  applications_received int DEFAULT 0,
  shortlisted int DEFAULT 0,
  called_for_pi int DEFAULT 0,
  offers_made int DEFAULT 0,
  waitlisted int DEFAULT 0,
  admitted int DEFAULT 0,
  batch_size int,
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ 5. PUBLIC LEAD FORM TABLE ============
CREATE TABLE public.iim_waitlist_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  target_iims text[],            -- multi-select
  cat_percentile numeric,
  category text,                  -- General/OBC/SC/ST/EWS
  year int DEFAULT 2026,
  current_status text,            -- e.g. "Waitlisted at IIM-K"
  message text,
  status text NOT NULL DEFAULT 'new', -- new | contacted | converted | rejected
  admin_notes text,
  source text DEFAULT 'iim_waitlist_page',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============ INDEXES ============
CREATE INDEX idx_iim_results_status ON public.iim_waitlist_results(status, sort_order);
CREATE INDEX idx_iim_movement_college ON public.iim_waitlist_movement(college_name, category);
CREATE INDEX idx_iim_rti_college ON public.iim_waitlist_rti(college_name);
CREATE INDEX idx_iim_apps_college_year ON public.iim_waitlist_applications(college_name, year);
CREATE INDEX idx_iim_leads_status ON public.iim_waitlist_leads(status, created_at DESC);

-- ============ UPDATED-AT TRIGGERS ============
CREATE TRIGGER trg_iim_results_updated BEFORE UPDATE ON public.iim_waitlist_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_iim_movement_updated BEFORE UPDATE ON public.iim_waitlist_movement
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_iim_rti_updated BEFORE UPDATE ON public.iim_waitlist_rti
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_iim_apps_updated BEFORE UPDATE ON public.iim_waitlist_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_iim_leads_updated BEFORE UPDATE ON public.iim_waitlist_leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ RLS ============
ALTER TABLE public.iim_waitlist_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iim_waitlist_movement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iim_waitlist_rti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iim_waitlist_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iim_waitlist_leads ENABLE ROW LEVEL SECURITY;

-- Public read for the 4 data tables
CREATE POLICY "Public can view iim_waitlist_results" ON public.iim_waitlist_results
  FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage iim_waitlist_results" ON public.iim_waitlist_results
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view iim_waitlist_movement" ON public.iim_waitlist_movement
  FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage iim_waitlist_movement" ON public.iim_waitlist_movement
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view iim_waitlist_rti" ON public.iim_waitlist_rti
  FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage iim_waitlist_rti" ON public.iim_waitlist_rti
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view iim_waitlist_applications" ON public.iim_waitlist_applications
  FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage iim_waitlist_applications" ON public.iim_waitlist_applications
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Leads: public can submit, only admins can view/manage
CREATE POLICY "Public can submit iim_waitlist_leads" ON public.iim_waitlist_leads
  FOR INSERT WITH CHECK (
    name IS NOT NULL AND length(name) BETWEEN 1 AND 255
    AND email IS NOT NULL AND email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'
    AND phone IS NOT NULL AND length(phone) BETWEEN 6 AND 20
  );
CREATE POLICY "Admins manage iim_waitlist_leads" ON public.iim_waitlist_leads
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
