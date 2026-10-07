CREATE OR REPLACE FUNCTION public.ensure_unique_slug()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  j jsonb := to_jsonb(NEW);
  base text;
  candidate text;
  n int := 1;
  taken boolean;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.slug IS NOT DISTINCT FROM OLD.slug THEN
    RETURN NEW;
  END IF;
  base := coalesce(nullif(trim(NEW.slug), ''), j->>'name', j->>'title', j->>'word', '');
  base := lower(base);
  base := regexp_replace(base, '[^a-z0-9\s-]', '', 'g');
  base := regexp_replace(base, '[\s_]+', '-', 'g');
  base := regexp_replace(base, '-+', '-', 'g');
  base := trim(both '-' from base);
  base := left(base, 90);
  IF base = '' THEN
    IF NEW.slug IS NULL THEN RETURN NEW; END IF;
    base := 'page';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(TG_TABLE_NAME || ':' || base));
  candidate := base;
  LOOP
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE slug = $1 AND id::text <> $2)', TG_TABLE_NAME)
      INTO taken USING candidate, coalesce(j->>'id', '');
    EXIT WHEN NOT taken;
    n := n + 1;
    candidate := base || '-' || n;
  END LOOP;
  NEW.slug := candidate;
  RETURN NEW;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['articles','colleges','exams','institutes','city_pages','categories','application_trackers','mba_compass_courses','mock_bundles','mock_tests','quant_formulas','course_categories','specializations'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_unique_slug ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_unique_slug BEFORE INSERT OR UPDATE OF slug ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ensure_unique_slug()', t);
  END LOOP;
END $$;