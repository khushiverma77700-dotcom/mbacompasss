
-- Make ticket-attachments bucket private
UPDATE storage.buckets SET public = false WHERE id = 'ticket-attachments';

-- Storage RLS policies for ticket-attachments (owner-scoped by first folder = user_id)
DROP POLICY IF EXISTS "ticket_attachments_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "ticket_attachments_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "ticket_attachments_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "ticket_attachments_owner_delete" ON storage.objects;
DROP POLICY IF EXISTS "ticket_attachments_admin_select" ON storage.objects;

CREATE POLICY "ticket_attachments_owner_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'ticket-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "ticket_attachments_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "ticket_attachments_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'ticket-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "ticket_attachments_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ticket-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "ticket_attachments_admin_select"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'ticket-attachments' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Realtime channel authorization: require authenticated subscribers
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_can_receive_realtime" ON realtime.messages;
CREATE POLICY "authenticated_can_receive_realtime"
ON realtime.messages FOR SELECT TO authenticated
USING (true);
