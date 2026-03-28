
-- Replace overly permissive newsletter policy with one that still allows inserts but is documented as intentional
DROP POLICY "Anyone can subscribe" ON public.newsletter_subscribers;
CREATE POLICY "Public newsletter subscription" ON public.newsletter_subscribers 
  FOR INSERT WITH CHECK (
    email IS NOT NULL AND length(email) <= 255
  );

-- Replace overly permissive inquiry policy
DROP POLICY "Anyone can submit inquiry" ON public.inquiries;
CREATE POLICY "Public inquiry submission" ON public.inquiries
  FOR INSERT WITH CHECK (
    name IS NOT NULL AND length(name) <= 255 AND
    email IS NOT NULL AND length(email) <= 255
  );
