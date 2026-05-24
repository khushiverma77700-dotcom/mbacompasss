
-- 1) Lock down mock_coupons: discount codes should not be enumerable by all users.
--    Validation happens server-side in edge functions via service role.
DROP POLICY IF EXISTS "Authenticated users can read active coupons" ON public.mock_coupons;

-- 2) Remove legacy/conflicting ticket-attachments storage policies that used a
--    different path schema (ticket_id as first folder). Actual paths are
--    {user_id}/{ticket_id}/filename, enforced by ticket_attachments_owner_* policies.
DROP POLICY IF EXISTS "Ticket owners can read their attachments" ON storage.objects;
DROP POLICY IF EXISTS "Students upload to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage all ticket attachments" ON storage.objects;
