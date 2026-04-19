-- Sync indexing_urls to canonical site links only
-- 1. Remove non-canonical entries (manual additions, 'other' types, and stale article URLs no longer in DB)
DELETE FROM public.indexing_urls
WHERE page_type IN ('manual', 'other');

-- 2. Remove article URLs whose slug no longer exists in articles table OR article is unpublished
DELETE FROM public.indexing_urls i
WHERE i.page_type = 'article'
  AND NOT EXISTS (
    SELECT 1 FROM public.articles a
    WHERE a.published = true
      AND 'https://bschoolbuzz.com/article/' || a.slug = i.url
  );

-- 3. Remove college/institute/exam/category/city_page URLs whose record no longer exists
DELETE FROM public.indexing_urls i
WHERE i.page_type = 'college'
  AND NOT EXISTS (SELECT 1 FROM public.colleges c WHERE 'https://bschoolbuzz.com/college/' || c.slug = i.url);

DELETE FROM public.indexing_urls i
WHERE i.page_type = 'institute'
  AND NOT EXISTS (SELECT 1 FROM public.institutes c WHERE 'https://bschoolbuzz.com/institute/' || c.slug = i.url);

DELETE FROM public.indexing_urls i
WHERE i.page_type = 'exam'
  AND NOT EXISTS (SELECT 1 FROM public.exams c WHERE 'https://bschoolbuzz.com/exam/' || c.slug = i.url);

DELETE FROM public.indexing_urls i
WHERE i.page_type = 'category'
  AND NOT EXISTS (SELECT 1 FROM public.categories c WHERE 'https://bschoolbuzz.com/category/' || c.slug = i.url);

DELETE FROM public.indexing_urls i
WHERE i.page_type = 'city_page'
  AND NOT EXISTS (SELECT 1 FROM public.city_pages c WHERE c.active = true AND 'https://bschoolbuzz.com/colleges/' || c.slug = i.url);

-- 4. Backfill any missing static pages (canonical list — 11 pages, no admin routes)
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

-- 5. Backfill any missing dynamic URLs
INSERT INTO public.indexing_urls (url, page_type, record_id, status, retry_count, next_retry_at)
SELECT u.url, u.page_type, u.record_id, 'pending', 0, now()
FROM (
  SELECT 'https://bschoolbuzz.com/institute/'||slug AS url, 'institute' AS page_type, id AS record_id FROM public.institutes WHERE slug IS NOT NULL AND slug<>''
  UNION ALL SELECT 'https://bschoolbuzz.com/college/'||slug, 'college', id FROM public.colleges WHERE slug IS NOT NULL AND slug<>''
  UNION ALL SELECT 'https://bschoolbuzz.com/exam/'||slug, 'exam', id FROM public.exams WHERE slug IS NOT NULL AND slug<>''
  UNION ALL SELECT 'https://bschoolbuzz.com/category/'||slug, 'category', id FROM public.categories WHERE slug IS NOT NULL AND slug<>''
  UNION ALL SELECT 'https://bschoolbuzz.com/article/'||slug, 'article', id FROM public.articles WHERE published=true AND slug IS NOT NULL AND slug<>''
  UNION ALL SELECT 'https://bschoolbuzz.com/colleges/'||slug, 'city_page', id FROM public.city_pages WHERE active=true AND slug IS NOT NULL AND slug<>''
) u
WHERE NOT EXISTS (SELECT 1 FROM public.indexing_urls i WHERE i.url = u.url);

-- 6. Remove any URL pointing to admin/auth-only routes (defensive)
DELETE FROM public.indexing_urls
WHERE url ~ '/admin($|/)' OR url LIKE '%/admin/%';