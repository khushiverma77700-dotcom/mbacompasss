
CREATE TABLE public.comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  link text DEFAULT '/blog',
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comparisons viewable by everyone" ON public.comparisons FOR SELECT TO public USING (active = true);
CREATE POLICY "Admins can manage comparisons" ON public.comparisons FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.coaching_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coaching_of_week_id uuid NOT NULL REFERENCES public.coaching_of_week(id) ON DELETE CASCADE,
  year integer NOT NULL,
  total_calls integer DEFAULT 0,
  conversions integer DEFAULT 0,
  students_placed integer DEFAULT 0,
  avg_score_improvement numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.coaching_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Results viewable by everyone" ON public.coaching_results FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage coaching_results" ON public.coaching_results FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.coaching_of_week ADD COLUMN IF NOT EXISTS website_url text;
