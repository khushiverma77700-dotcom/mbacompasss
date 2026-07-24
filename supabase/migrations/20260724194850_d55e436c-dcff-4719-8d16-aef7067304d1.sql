
-- 1) Pin search_path on public functions that were flagged as mutable
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;

-- 2) Prevent students from changing ticket status/priority/assignment/internal_notes on their own tickets
CREATE OR REPLACE FUNCTION public.protect_support_tickets_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins bypass this trigger
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Only owners reach here (RLS already restricts). Lock down staff-only columns.
  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.priority IS DISTINCT FROM OLD.priority
     OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
     OR NEW.internal_notes IS DISTINCT FROM OLD.internal_notes
     OR NEW.resolved_at IS DISTINCT FROM OLD.resolved_at
     OR NEW.closed_at IS DISTINCT FROM OLD.closed_at
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.ticket_code IS DISTINCT FROM OLD.ticket_code THEN
    RAISE EXCEPTION 'Only admins can modify ticket status, priority, assignment, or internal fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_support_tickets_fields_trg ON public.support_tickets;
CREATE TRIGGER protect_support_tickets_fields_trg
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.protect_support_tickets_fields();

-- 3) Prevent non-admin users from self-approving user_listings
CREATE OR REPLACE FUNCTION public.protect_user_listings_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     OR NEW.poc_verified IS DISTINCT FROM OLD.poc_verified
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.approved_record_id IS DISTINCT FROM OLD.approved_record_id
     OR NEW.reviewed_by IS DISTINCT FROM OLD.reviewed_by
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Only admins can change listing review fields (status, poc_verified, approval, reviewer)';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_listings_review_trg ON public.user_listings;
CREATE TRIGGER protect_user_listings_review_trg
  BEFORE UPDATE ON public.user_listings
  FOR EACH ROW EXECUTE FUNCTION public.protect_user_listings_review();
