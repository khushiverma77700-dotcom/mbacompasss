
CREATE TABLE public.bulk_course_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  label text,
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_institutes integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bulk_course_jobs_created_by_idx ON public.bulk_course_jobs(created_by, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulk_course_jobs TO authenticated;
GRANT ALL ON public.bulk_course_jobs TO service_role;
ALTER TABLE public.bulk_course_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage bulk_course_jobs" ON public.bulk_course_jobs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.bulk_course_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.bulk_course_jobs(id) ON DELETE CASCADE,
  institute_id uuid NOT NULL,
  institute_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  progress_step text,
  courses_found integer NOT NULL DEFAULT 0,
  courses_saved integer NOT NULL DEFAULT 0,
  courses_failed integer NOT NULL DEFAULT 0,
  course_names jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_message text,
  worker_lock_until timestamptz,
  retry_count integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bulk_course_items_job_idx ON public.bulk_course_items(job_id, created_at);
CREATE INDEX bulk_course_items_status_idx ON public.bulk_course_items(status, worker_lock_until);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulk_course_items TO authenticated;
GRANT ALL ON public.bulk_course_items TO service_role;
ALTER TABLE public.bulk_course_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage bulk_course_items" ON public.bulk_course_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER bulk_course_jobs_set_updated_at
  BEFORE UPDATE ON public.bulk_course_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER bulk_course_items_set_updated_at
  BEFORE UPDATE ON public.bulk_course_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
