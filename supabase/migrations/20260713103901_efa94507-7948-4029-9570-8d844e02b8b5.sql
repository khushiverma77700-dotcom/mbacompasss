
-- 1) Fix mutable search_path on _indexing_url_for
CREATE OR REPLACE FUNCTION public._indexing_url_for(_table text, _slug text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE _table
    WHEN 'institutes' THEN 'https://mbacompass.in/institute/'  || _slug
    WHEN 'courses'    THEN 'https://mbacompass.in/course/'     || _slug
    WHEN 'colleges'   THEN 'https://mbacompass.in/college/'    || _slug
    WHEN 'articles'   THEN 'https://mbacompass.in/article/'    || _slug
    ELSE NULL
  END
$function$;

-- 2) mock_attempts: block non-admin writes to scoring/rank fields
CREATE OR REPLACE FUNCTION public.protect_mock_attempts_scoring()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  NEW.total_score         := OLD.total_score;
  NEW.max_score           := OLD.max_score;
  NEW.sectional_scores    := OLD.sectional_scores;
  NEW.total_attempted     := OLD.total_attempted;
  NEW.total_correct       := OLD.total_correct;
  NEW.total_incorrect     := OLD.total_incorrect;
  NEW.accuracy            := OLD.accuracy;
  NEW.percentile          := OLD.percentile;
  NEW.all_india_rank      := OLD.all_india_rank;
  NEW.topic_breakdown     := OLD.topic_breakdown;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_protect_mock_attempts_scoring ON public.mock_attempts;
CREATE TRIGGER trg_protect_mock_attempts_scoring
BEFORE UPDATE ON public.mock_attempts
FOR EACH ROW EXECUTE FUNCTION public.protect_mock_attempts_scoring();

-- 3) mock_responses: block non-admin writes to is_correct/marks_awarded
CREATE OR REPLACE FUNCTION public.protect_mock_responses_scoring()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.is_correct    := NULL;
    NEW.marks_awarded := NULL;
  ELSE
    NEW.is_correct    := OLD.is_correct;
    NEW.marks_awarded := OLD.marks_awarded;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_protect_mock_responses_scoring ON public.mock_responses;
CREATE TRIGGER trg_protect_mock_responses_scoring
BEFORE INSERT OR UPDATE ON public.mock_responses
FOR EACH ROW EXECUTE FUNCTION public.protect_mock_responses_scoring();

-- 4) support_tickets: restrict student-editable columns
CREATE OR REPLACE FUNCTION public.protect_support_tickets_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  NEW.priority             := OLD.priority;
  NEW.status               := OLD.status;
  NEW.assigned_to          := OLD.assigned_to;
  NEW.internal_notes       := OLD.internal_notes;
  NEW.resolved_at          := OLD.resolved_at;
  NEW.last_admin_reply_at  := OLD.last_admin_reply_at;
  NEW.code                 := OLD.code;
  NEW.user_id              := OLD.user_id;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_protect_support_tickets_fields ON public.support_tickets;
CREATE TRIGGER trg_protect_support_tickets_fields
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.protect_support_tickets_fields();

-- 5) user_listing_pocs: prevent self-verifying OTP
CREATE OR REPLACE FUNCTION public.protect_user_listing_pocs_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.mobile_otp_verified := false;
  ELSE
    NEW.mobile_otp_verified := OLD.mobile_otp_verified;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_protect_user_listing_pocs_verification ON public.user_listing_pocs;
CREATE TRIGGER trg_protect_user_listing_pocs_verification
BEFORE INSERT OR UPDATE ON public.user_listing_pocs
FOR EACH ROW EXECUTE FUNCTION public.protect_user_listing_pocs_verification();

-- 6) user_listings: prevent self-approval and review-field tampering
CREATE OR REPLACE FUNCTION public.protect_user_listings_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.status              := 'pending';
    NEW.reviewed_by         := NULL;
    NEW.reviewed_at         := NULL;
    NEW.approved_record_id  := NULL;
    NEW.approved_at         := NULL;
    NEW.admin_notes         := NULL;
    NEW.poc_verified        := false;
  ELSE
    NEW.status              := OLD.status;
    NEW.reviewed_by         := OLD.reviewed_by;
    NEW.reviewed_at         := OLD.reviewed_at;
    NEW.approved_record_id  := OLD.approved_record_id;
    NEW.approved_at         := OLD.approved_at;
    NEW.admin_notes         := OLD.admin_notes;
    NEW.poc_verified        := OLD.poc_verified;
    NEW.target_record_id    := OLD.target_record_id;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_protect_user_listings_review ON public.user_listings;
CREATE TRIGGER trg_protect_user_listings_review
BEFORE INSERT OR UPDATE ON public.user_listings
FOR EACH ROW EXECUTE FUNCTION public.protect_user_listings_review();
