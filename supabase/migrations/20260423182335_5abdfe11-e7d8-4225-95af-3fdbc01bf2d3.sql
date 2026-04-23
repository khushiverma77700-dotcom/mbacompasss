UPDATE public.indexing_urls
SET url = regexp_replace(url, '^https?://(www\.)?(bschoolbuzz\.com|bschoolbus\.com|bestmbacoaching\.com)', 'https://mbacompass.in'),
    status = 'pending',
    retry_count = 0,
    next_retry_at = now(),
    error_message = NULL,
    updated_at = now()
WHERE url ~* '(bschoolbuzz\.com|bschoolbus\.com|bestmbacoaching\.com)';