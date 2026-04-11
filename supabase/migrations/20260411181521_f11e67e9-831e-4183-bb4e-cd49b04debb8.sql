
CREATE TABLE public.cat_score_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  candidate_name TEXT NOT NULL DEFAULT 'Unknown',
  application_no TEXT,
  test_date TEXT,
  test_time TEXT,
  subject TEXT DEFAULT 'CAT',
  email TEXT,
  phone TEXT,
  state TEXT,
  total_score NUMERIC NOT NULL DEFAULT 0,
  max_score NUMERIC NOT NULL DEFAULT 0,
  estimated_percentile NUMERIC DEFAULT 0,
  total_questions INTEGER DEFAULT 0,
  attempted INTEGER DEFAULT 0,
  correct INTEGER DEFAULT 0,
  incorrect INTEGER DEFAULT 0,
  unattempted INTEGER DEFAULT 0,
  accuracy NUMERIC DEFAULT 0,
  negative_marks NUMERIC DEFAULT 0,
  varc_score NUMERIC DEFAULT 0,
  varc_attempted INTEGER DEFAULT 0,
  varc_correct INTEGER DEFAULT 0,
  varc_incorrect INTEGER DEFAULT 0,
  varc_accuracy NUMERIC DEFAULT 0,
  dilr_score NUMERIC DEFAULT 0,
  dilr_attempted INTEGER DEFAULT 0,
  dilr_correct INTEGER DEFAULT 0,
  dilr_incorrect INTEGER DEFAULT 0,
  dilr_accuracy NUMERIC DEFAULT 0,
  qa_score NUMERIC DEFAULT 0,
  qa_attempted INTEGER DEFAULT 0,
  qa_correct INTEGER DEFAULT 0,
  qa_incorrect INTEGER DEFAULT 0,
  qa_accuracy NUMERIC DEFAULT 0,
  sections_data JSONB DEFAULT '[]'::jsonb,
  questions_data JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cat_score_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit CAT score" ON public.cat_score_submissions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage all submissions" ON public.cat_score_submissions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view own submissions" ON public.cat_score_submissions
  FOR SELECT USING (user_id IS NOT NULL AND auth.uid() = user_id);

CREATE INDEX idx_cat_submissions_created ON public.cat_score_submissions (created_at DESC);
CREATE INDEX idx_cat_submissions_user ON public.cat_score_submissions (user_id);
