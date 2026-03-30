
ALTER TABLE public.coaching_results 
  ADD COLUMN IF NOT EXISTS iim_a_selections integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS iim_b_selections integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cat_99_plus integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS xat_99_plus integer DEFAULT 0;
