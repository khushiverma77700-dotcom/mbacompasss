INSERT INTO public.indexing_urls (url, page_type, status, retry_count, next_retry_at)
SELECT u, 'static', 'pending', 0, now()
FROM (VALUES
  ('https://bschoolbuzz.com/'),
  ('https://bschoolbuzz.com/about'),
  ('https://bschoolbuzz.com/contact'),
  ('https://bschoolbuzz.com/blog'),
  ('https://bschoolbuzz.com/colleges'),
  ('https://bschoolbuzz.com/compare'),
  ('https://bschoolbuzz.com/college-finder'),
  ('https://bschoolbuzz.com/profile-analyzer'),
  ('https://bschoolbuzz.com/college-shortlister'),
  ('https://bschoolbuzz.com/dashboard'),
  ('https://bschoolbuzz.com/auth')
) AS t(u)
WHERE NOT EXISTS (SELECT 1 FROM public.indexing_urls i WHERE i.url = t.u);