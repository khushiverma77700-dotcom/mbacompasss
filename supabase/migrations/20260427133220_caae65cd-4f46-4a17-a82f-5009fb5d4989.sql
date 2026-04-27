ALTER TABLE public.content_refreshes
DROP CONSTRAINT IF EXISTS content_refreshes_entity_type_check;

ALTER TABLE public.content_refreshes
ADD CONSTRAINT content_refreshes_entity_type_check
CHECK (entity_type = ANY (ARRAY['article'::text, 'college'::text, 'college_section'::text, 'institute'::text, 'course'::text]));