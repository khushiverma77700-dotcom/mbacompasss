
CREATE TABLE public.city_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  type text NOT NULL DEFAULT 'city',
  state text,
  meta_title text,
  meta_description text,
  keywords text[] DEFAULT '{}',
  intro_content text,
  detailed_content text,
  faq_content text,
  hero_image_url text,
  city_aliases text[] DEFAULT '{}',
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.city_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "City pages viewable by everyone"
ON public.city_pages FOR SELECT TO public
USING (active = true);

CREATE POLICY "Admins can manage city_pages"
ON public.city_pages FOR ALL TO public
USING (public.has_role(auth.uid(), 'admin'));
