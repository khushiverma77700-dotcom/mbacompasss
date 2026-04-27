-- =========================================================
-- Support Ticket System
-- =========================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.ticket_status AS ENUM ('open','in_progress','resolved','closed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_priority AS ENUM ('low','medium','high');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_category AS ENUM ('mock_issue','payment_issue','login_issue','technical_issue','ai_tools','other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.ticket_message_sender AS ENUM ('student','admin','system');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Ticket code generator: TKT-YYYY-XXXXXX (uppercase alphanum, no ambiguous chars)
CREATE OR REPLACE FUNCTION public.generate_ticket_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path TO 'public'
AS $$
DECLARE
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  i int;
  c int;
BEGIN
  LOOP
    candidate := 'TKT-' || to_char(now(),'YYYY') || '-';
    FOR i IN 1..6 LOOP
      c := 1 + floor(random() * length(alphabet))::int;
      candidate := candidate || substr(alphabet, c, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.support_tickets WHERE code = candidate);
  END LOOP;
  RETURN candidate;
END;
$$;

-- =========================================================
-- support_tickets
-- =========================================================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL DEFAULT public.generate_ticket_code(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_name text,
  student_email text,
  student_phone text,
  category public.ticket_category NOT NULL DEFAULT 'other',
  title text NOT NULL,
  description text NOT NULL,
  priority public.ticket_priority NOT NULL DEFAULT 'medium',
  status public.ticket_status NOT NULL DEFAULT 'open',
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  attachment_url text,
  attachment_name text,
  internal_notes text,
  resolved_at timestamptz,
  last_admin_reply_at timestamptz,
  last_student_reply_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON public.support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON public.support_tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON public.support_tickets(assigned_to);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Trigger to maintain updated_at + resolved_at
CREATE OR REPLACE FUNCTION public.support_ticket_before_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at := now();
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'resolved' AND OLD.status <> 'resolved' AND NEW.resolved_at IS NULL THEN
      NEW.resolved_at := now();
    END IF;
    IF NEW.status <> 'resolved' AND OLD.status = 'resolved' THEN
      NEW.resolved_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_ticket_before_write ON public.support_tickets;
CREATE TRIGGER trg_support_ticket_before_write
BEFORE INSERT OR UPDATE ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.support_ticket_before_write();

-- RLS
DROP POLICY IF EXISTS "Students manage own tickets" ON public.support_tickets;
CREATE POLICY "Students can view own tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Students can create own tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Students can update own tickets limited"
  ON public.support_tickets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all tickets"
  ON public.support_tickets FOR SELECT
  USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins can update all tickets"
  ON public.support_tickets FOR UPDATE
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins can delete tickets"
  ON public.support_tickets FOR DELETE
  USING (public.has_role(auth.uid(),'admin'::app_role));

-- =========================================================
-- support_ticket_messages
-- =========================================================
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role public.ticket_message_sender NOT NULL DEFAULT 'student',
  body text NOT NULL,
  attachment_url text,
  attachment_name text,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_msgs_ticket ON public.support_ticket_messages(ticket_id, created_at);

ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Students see their own ticket's NON-internal messages; admins see all
CREATE POLICY "Students view own ticket messages (no internal)"
  ON public.support_ticket_messages FOR SELECT
  USING (
    is_internal = false
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Students reply on own tickets"
  ON public.support_ticket_messages FOR INSERT
  WITH CHECK (
    sender_role = 'student'
    AND is_internal = false
    AND sender_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins view all ticket messages"
  ON public.support_ticket_messages FOR SELECT
  USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins create ticket messages"
  ON public.support_ticket_messages FOR INSERT
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins delete ticket messages"
  ON public.support_ticket_messages FOR DELETE
  USING (public.has_role(auth.uid(),'admin'::app_role));

-- =========================================================
-- support_faqs
-- =========================================================
CREATE TABLE IF NOT EXISTS public.support_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.ticket_category,
  question text NOT NULL,
  answer text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_faqs_published ON public.support_faqs(is_published, display_order);

ALTER TABLE public.support_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published FAQs"
  ON public.support_faqs FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins manage FAQs"
  ON public.support_faqs FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

DROP TRIGGER IF EXISTS trg_support_faqs_updated_at ON public.support_faqs;
CREATE TRIGGER trg_support_faqs_updated_at
BEFORE UPDATE ON public.support_faqs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- imported_students  (CSV import)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.imported_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  mobile text,
  course text,
  notes text,
  imported_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  matched_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_imported_students_email ON public.imported_students(lower(email));

ALTER TABLE public.imported_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage imported students"
  ON public.imported_students FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

DROP TRIGGER IF EXISTS trg_imported_students_updated_at ON public.imported_students;
CREATE TRIGGER trg_imported_students_updated_at
BEFORE UPDATE ON public.imported_students
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Auto-link imported student to a real auth user when email matches
-- =========================================================
CREATE OR REPLACE FUNCTION public.link_imported_student_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.imported_students
  SET matched_user_id = NEW.id, updated_at = now()
  WHERE lower(email) = lower(NEW.email)
    AND matched_user_id IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_link_imported_student ON auth.users;
CREATE TRIGGER trg_link_imported_student
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.link_imported_student_on_signup();

-- =========================================================
-- Storage bucket for ticket attachments (images only, <=1MB)
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket-attachments','ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Path layout: {auth.uid()}/{ticket_id}/{filename}
CREATE POLICY "Ticket attachments are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ticket-attachments');

CREATE POLICY "Students upload to their own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ticket-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Students delete their own attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'ticket-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins manage all ticket attachments"
  ON storage.objects FOR ALL
  USING (bucket_id = 'ticket-attachments' AND public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (bucket_id = 'ticket-attachments' AND public.has_role(auth.uid(),'admin'::app_role));
