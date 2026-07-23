ALTER TABLE public.seo_reoptimization_items
  ADD COLUMN IF NOT EXISTS applied boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS applied_at timestamptz,
  ADD COLUMN IF NOT EXISTS discarded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discarded_at timestamptz;

CREATE INDEX IF NOT EXISTS seo_reopt_items_pending_apply_idx
  ON public.seo_reoptimization_items (run_id)
  WHERE status = 'done' AND applied = false AND discarded = false;