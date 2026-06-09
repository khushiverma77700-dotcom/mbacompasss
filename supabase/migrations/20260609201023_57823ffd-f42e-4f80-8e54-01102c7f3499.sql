
UPDATE public.articles
SET
  intro = regexp_replace(
            regexp_replace(
              regexp_replace(
                COALESCE(intro, ''),
                '<a\s[^>]*href\s*=\s*"(https?://|//|mailto:|tel:|www\.)[^"]*"[^>]*>(.*?)</a>',
                '\2',
                'gi'
              ),
              'https?://[^\s<>"'')]+',
              '',
              'gi'
            ),
            '\mwww\.[^\s<>"'')]+',
            '',
            'gi'
          ),
  content = regexp_replace(
              regexp_replace(
                regexp_replace(
                  COALESCE(content, ''),
                  '<a\s[^>]*href\s*=\s*"(https?://|//|mailto:|tel:|www\.)[^"]*"[^>]*>(.*?)</a>',
                  '\2',
                  'gi'
                ),
                'https?://[^\s<>"'')]+',
                '',
                'gi'
              ),
              '\mwww\.[^\s<>"'')]+',
              '',
              'gi'
            ),
  updated_at = now()
WHERE
  (intro    ~* '<a\s[^>]*href\s*=\s*"(https?://|//|mailto:|tel:|www\.)'
   OR intro    ~* 'https?://'
   OR intro    ~* '\mwww\.'
   OR content  ~* '<a\s[^>]*href\s*=\s*"(https?://|//|mailto:|tel:|www\.)'
   OR content  ~* 'https?://'
   OR content  ~* '\mwww\.');
