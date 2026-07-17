
-- retry increment helper
CREATE OR REPLACE FUNCTION public.increment_meritto_retry(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.meritto_lead_logs
     SET retry_count = COALESCE(retry_count,0) + 1
   WHERE id = p_id;
$$;
REVOKE ALL ON FUNCTION public.increment_meritto_retry(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_meritto_retry(uuid) TO authenticated, service_role;

-- generic trigger to fire the meritto edge function via pg_net
CREATE OR REPLACE FUNCTION public.fire_meritto_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_url text;
  v_body jsonb;
  v_source text := TG_ARGV[0];
BEGIN
  v_url := 'https://mttoiqruzzxooveooldo.supabase.co/functions/v1/push-to-meritto';

  IF v_source = 'business_inquiry' THEN
    v_body := jsonb_build_object(
      'source', 'business_inquiry',
      'name', NEW.poc_name,
      'email', NEW.poc_email,
      'mobile', NEW.contact_number,
      'campus', NEW.institute_name,
      'campaign', 'business_inquiry'
    );
  ELSIF v_source = 'inquiry' THEN
    v_body := jsonb_build_object(
      'source', 'inquiry',
      'name', NEW.name,
      'email', NEW.email,
      'mobile', NEW.phone,
      'campaign', COALESCE(NEW.type, 'inquiry')
    );
  ELSIF v_source = 'demo_lead' THEN
    v_body := jsonb_build_object(
      'source', 'demo_lead',
      'name', NEW.name,
      'email', NEW.email,
      'mobile', NEW.phone,
      'campaign', 'demo_lead'
    );
  ELSIF v_source = 'iim_waitlist' THEN
    v_body := jsonb_build_object(
      'source', 'iim_waitlist',
      'name', NEW.name,
      'email', NEW.email,
      'mobile', NEW.phone,
      'campaign', 'iim_waitlist'
    );
  ELSE
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type','application/json'),
    body := v_body
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- never break the parent insert if push fails
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_meritto_business_inquiry ON public.business_inquiries;
CREATE TRIGGER trg_meritto_business_inquiry
  AFTER INSERT ON public.business_inquiries
  FOR EACH ROW EXECUTE FUNCTION public.fire_meritto_push('business_inquiry');

DROP TRIGGER IF EXISTS trg_meritto_inquiry ON public.inquiries;
CREATE TRIGGER trg_meritto_inquiry
  AFTER INSERT ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.fire_meritto_push('inquiry');

DROP TRIGGER IF EXISTS trg_meritto_demo_lead ON public.demo_leads;
CREATE TRIGGER trg_meritto_demo_lead
  AFTER INSERT ON public.demo_leads
  FOR EACH ROW EXECUTE FUNCTION public.fire_meritto_push('demo_lead');

DROP TRIGGER IF EXISTS trg_meritto_iim_waitlist ON public.iim_waitlist_leads;
CREATE TRIGGER trg_meritto_iim_waitlist
  AFTER INSERT ON public.iim_waitlist_leads
  FOR EACH ROW EXECUTE FUNCTION public.fire_meritto_push('iim_waitlist');
