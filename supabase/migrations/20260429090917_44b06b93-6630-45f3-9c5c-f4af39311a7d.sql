-- 1. Extend student_planner_tasks
ALTER TABLE public.student_planner_tasks
  ADD COLUMN IF NOT EXISTS recurrence text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS recurrence_days int[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recurrence_until date,
  ADD COLUMN IF NOT EXISTS series_id uuid,
  ADD COLUMN IF NOT EXISTS linked_action text,
  ADD COLUMN IF NOT EXISTS linked_ref text,
  ADD COLUMN IF NOT EXISTS rolled_over_from date,
  ADD COLUMN IF NOT EXISTS auto_rollover boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS original_date date;

-- Backfill original_date for existing rows
UPDATE public.student_planner_tasks
   SET original_date = scheduled_date
 WHERE original_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_planner_tasks_user_date
  ON public.student_planner_tasks (user_id, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_planner_tasks_series
  ON public.student_planner_tasks (user_id, series_id)
  WHERE series_id IS NOT NULL;

-- 2. Skips table
CREATE TABLE IF NOT EXISTS public.student_planner_skips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  series_id uuid NOT NULL,
  skipped_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, series_id, skipped_date)
);

ALTER TABLE public.student_planner_skips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "skips_select_own" ON public.student_planner_skips;
CREATE POLICY "skips_select_own" ON public.student_planner_skips
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "skips_insert_own" ON public.student_planner_skips;
CREATE POLICY "skips_insert_own" ON public.student_planner_skips
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "skips_delete_own" ON public.student_planner_skips;
CREATE POLICY "skips_delete_own" ON public.student_planner_skips
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_planner_skips_user_series
  ON public.student_planner_skips (user_id, series_id);

-- 3. Auto-rollover function
CREATE OR REPLACE FUNCTION public.rollover_planner_tasks(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _n integer;
BEGIN
  IF _user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.student_planner_tasks
     SET rolled_over_from = scheduled_date,
         scheduled_date   = CURRENT_DATE,
         updated_at       = now()
   WHERE user_id = _user_id
     AND status = 'pending'
     AND auto_rollover = true
     AND scheduled_date < CURRENT_DATE;

  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END;
$$;

-- 4. Materialise upcoming recurring instances
CREATE OR REPLACE FUNCTION public.materialize_recurring_tasks(_user_id uuid, _through date DEFAULT (CURRENT_DATE + 14))
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _series record;
  _d date;
  _dow int;
  _matches boolean;
  _inserted int := 0;
BEGIN
  IF _user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- For each distinct recurring series owned by user, ensure instances exist up to _through.
  FOR _series IN
    SELECT DISTINCT ON (series_id)
      series_id, title, description, category, priority,
      scheduled_start_time, estimated_minutes,
      recurrence, recurrence_days, recurrence_until,
      linked_action, linked_ref, auto_rollover, original_date
    FROM public.student_planner_tasks
    WHERE user_id = _user_id
      AND series_id IS NOT NULL
      AND recurrence <> 'none'
      AND (recurrence_until IS NULL OR recurrence_until >= CURRENT_DATE)
    ORDER BY series_id, original_date ASC
  LOOP
    _d := GREATEST(COALESCE(_series.original_date, CURRENT_DATE), CURRENT_DATE);
    WHILE _d <= LEAST(_through, COALESCE(_series.recurrence_until, _through)) LOOP
      _dow := EXTRACT(DOW FROM _d)::int; -- 0=Sun..6=Sat
      _matches := CASE _series.recurrence
        WHEN 'daily'    THEN true
        WHEN 'weekdays' THEN _dow BETWEEN 1 AND 5
        WHEN 'weekly'   THEN _dow = ANY(_series.recurrence_days)
        WHEN 'custom'   THEN _dow = ANY(_series.recurrence_days)
        ELSE false
      END;

      IF _matches
         AND NOT EXISTS (
           SELECT 1 FROM public.student_planner_tasks
            WHERE user_id = _user_id
              AND series_id = _series.series_id
              AND scheduled_date = _d
         )
         AND NOT EXISTS (
           SELECT 1 FROM public.student_planner_skips
            WHERE user_id = _user_id
              AND series_id = _series.series_id
              AND skipped_date = _d
         )
      THEN
        INSERT INTO public.student_planner_tasks (
          user_id, title, description, category, priority,
          scheduled_date, scheduled_start_time, estimated_minutes,
          status, recurrence, recurrence_days, recurrence_until,
          series_id, linked_action, linked_ref,
          auto_rollover, original_date
        ) VALUES (
          _user_id, _series.title, _series.description, _series.category, _series.priority,
          _d, _series.scheduled_start_time, _series.estimated_minutes,
          'pending', _series.recurrence, _series.recurrence_days, _series.recurrence_until,
          _series.series_id, _series.linked_action, _series.linked_ref,
          _series.auto_rollover, _series.original_date
        );
        _inserted := _inserted + 1;
      END IF;

      _d := _d + 1;
    END LOOP;
  END LOOP;

  RETURN _inserted;
END;
$$;