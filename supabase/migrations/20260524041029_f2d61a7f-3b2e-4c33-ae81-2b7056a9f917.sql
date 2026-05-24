CREATE TABLE IF NOT EXISTS public.phone_lookup_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  phone_hash_prefix text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS phone_lookup_audit_ip_created_idx ON public.phone_lookup_audit (ip, created_at DESC);
ALTER TABLE public.phone_lookup_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view phone lookup audit" ON public.phone_lookup_audit;
CREATE POLICY "Admins can view phone lookup audit" ON public.phone_lookup_audit
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));