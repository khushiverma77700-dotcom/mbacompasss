
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage site_settings" ON public.site_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Site settings viewable by everyone" ON public.site_settings FOR SELECT USING (true);

CREATE TABLE public.testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'text',
  name text NOT NULL,
  designation text,
  institute text,
  content text,
  image_url text,
  video_url text,
  rating integer DEFAULT 5,
  featured boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage testimonials" ON public.testimonials FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Active testimonials viewable by everyone" ON public.testimonials FOR SELECT USING (true);
