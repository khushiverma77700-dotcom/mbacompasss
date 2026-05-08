-- User-scoped dashboard queries
CREATE INDEX IF NOT EXISTS idx_roi_analyses_user_created ON public.roi_analyses (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_analyses_user_created ON public.profile_analyses (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_institutes_user_created ON public.saved_institutes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_user_created ON public.reviews (user_id, created_at DESC);

-- Mock generation worker queue (claim_mock_section_job)
CREATE INDEX IF NOT EXISTS idx_mock_section_jobs_status_created ON public.mock_section_jobs (status, created_at);
CREATE INDEX IF NOT EXISTS idx_mock_section_jobs_generation ON public.mock_section_jobs (generation_id);

-- Mock access / enrollments
CREATE INDEX IF NOT EXISTS idx_mock_enrollments_user_test ON public.mock_enrollments (user_id, test_id);
CREATE INDEX IF NOT EXISTS idx_mock_enrollments_user ON public.mock_enrollments (user_id);
CREATE INDEX IF NOT EXISTS idx_mock_bundle_enrollments_user ON public.mock_bundle_enrollments (user_id);
CREATE INDEX IF NOT EXISTS idx_mock_bundle_items_bundle ON public.mock_bundle_items (bundle_id);

-- Mock attempts / leaderboard
CREATE INDEX IF NOT EXISTS idx_mock_attempts_test_status_score ON public.mock_attempts (test_id, status, total_score DESC);
CREATE INDEX IF NOT EXISTS idx_mock_attempts_user ON public.mock_attempts (user_id, submitted_at DESC);

-- Admin dashboard counts
CREATE INDEX IF NOT EXISTS idx_articles_published ON public.articles (published) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON public.inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_created ON public.newsletter_subscribers (created_at DESC);

-- Indexing URL queue
CREATE INDEX IF NOT EXISTS idx_indexing_urls_status_retry ON public.indexing_urls (status, next_retry_at);

-- Daily test lookup
CREATE INDEX IF NOT EXISTS idx_daily_test_assignments_date ON public.daily_test_assignments (assigned_date DESC);
CREATE INDEX IF NOT EXISTS idx_student_daily_test_progress_user_date ON public.student_daily_test_progress (user_id, assigned_date);

-- Personalized hub
CREATE INDEX IF NOT EXISTS idx_personalized_mock_attempts_user_created ON public.personalized_mock_attempts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_personalized_question_seen_user ON public.personalized_question_seen (user_id, question_id);

-- Profiles lookup
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);

-- Refresh planner stats
ANALYZE;