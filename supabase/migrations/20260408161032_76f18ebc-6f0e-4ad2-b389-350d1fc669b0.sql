
CREATE TABLE public.business_inquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  institute_type TEXT NOT NULL CHECK (institute_type IN ('Coaching Institute', 'College')),
  institute_name TEXT NOT NULL,
  poc_name TEXT NOT NULL,
  website_url TEXT,
  contact_number TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  poc_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'onboarded')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.business_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit business inquiry"
ON public.business_inquiries
FOR INSERT
TO public
WITH CHECK (
  (institute_name IS NOT NULL) AND (length(institute_name) <= 255)
  AND (poc_name IS NOT NULL) AND (length(poc_name) <= 255)
  AND (poc_email IS NOT NULL) AND (length(poc_email) <= 255)
  AND (poc_email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$')
  AND (contact_number IS NOT NULL) AND (length(contact_number) <= 20)
);

CREATE POLICY "Admins can view business inquiries"
ON public.business_inquiries
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update business inquiries"
ON public.business_inquiries
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete business inquiries"
ON public.business_inquiries
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_business_inquiries_updated_at
BEFORE UPDATE ON public.business_inquiries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
