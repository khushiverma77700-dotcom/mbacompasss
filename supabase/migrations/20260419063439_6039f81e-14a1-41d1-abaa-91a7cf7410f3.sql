-- Backfill any indexable URLs that aren't in the queue yet (covers rows created before triggers existed)
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