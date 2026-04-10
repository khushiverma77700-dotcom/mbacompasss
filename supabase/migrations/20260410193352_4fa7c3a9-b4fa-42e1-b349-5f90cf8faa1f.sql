ALTER TABLE public.inquiries ADD COLUMN read boolean NOT NULL DEFAULT false;

-- Allow admins to update inquiries (to mark as read)
CREATE POLICY "Admins can update inquiries"
ON public.inquiries
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));