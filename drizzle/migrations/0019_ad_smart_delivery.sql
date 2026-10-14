ALTER TABLE public.ad_campaigns
  ADD COLUMN IF NOT EXISTS smart_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS goal_end_at timestamptz,
  ADD COLUMN IF NOT EXISTS smart_plan jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS ad_events_recent_idx ON public.ad_events (created_at, event_type);

CREATE OR REPLACE FUNCTION public.ad_page_type(_path text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN coalesce(_path,'') IN ('', '/') THEN 'home'
    WHEN lower(_path) ~ '^/(colleges|exams|blog|articles|courses|coaching|mba-application)/?$' THEN 'listing'
    WHEN lower(_path) ~ '^/(blog|articles?|news|newsroom)(/|$)' THEN 'article'
    WHEN lower(_path) ~ '^/(colleges?|mba-colleges|mba-application)/' THEN 'college'
    WHEN lower(_path) ~ '^/exams?/' THEN 'exam'
    WHEN lower(_path) ~ '(calculator|profile-analyzer|shortlister|predictor|tools?|compare|formulas|roi)' THEN 'tool'
    WHEN lower(_path) ~ '^/(mba-compass|courses?|coaching)/' THEN 'course'
    WHEN lower(_path) ~ '^/(mocks|lp|offer|landing)' THEN 'landing'
    ELSE 'static' END
$$;

-- Recomputes delivery plans for smart campaigns from the last 7 days of real ad traffic.
CREATE OR REPLACE FUNCTION public.ad_smart_refresh()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c record; n integer := 0; w jsonb; tops jsonb;
  delivered bigint; last24 bigint; needed numeric; boost numeric; days_left numeric;
  st text; note text; best_pt text; best_pl text; best_dv text;
BEGIN
  CREATE TEMP TABLE IF NOT EXISTS _ad_traffic ON COMMIT DROP AS
    SELECT ad_page_type(page_path) pt, coalesce(nullif(placement,''),'in_content') pl, coalesce(device,'desktop') dv,
           count(*) FILTER (WHERE event_type='impression') imp,
           count(*) FILTER (WHERE event_type='click') clk
    FROM ad_events WHERE created_at > now() - interval '7 days' GROUP BY 1,2,3;

  -- Dimension weights: traffic share (90%) + exploration floor (10%), nudged by relative click rate.
  WITH tot AS (SELECT greatest(sum(imp),1)::numeric ti, greatest(sum(clk),0)::numeric tc FROM _ad_traffic),
  dims AS (
    SELECT 'pt:'||pt k, sum(imp) imp, sum(clk) clk, count(*) OVER () cnt FROM _ad_traffic GROUP BY pt
    UNION ALL SELECT 'pl:'||pl, sum(imp), sum(clk), count(*) OVER () FROM _ad_traffic GROUP BY pl
    UNION ALL SELECT 'dv:'||dv, sum(imp), sum(clk), count(*) OVER () FROM _ad_traffic GROUP BY dv)
  SELECT coalesce(jsonb_object_agg(k, round((0.1 + 0.9 * (imp / tot.ti) * cnt)
      * CASE WHEN tot.tc > 0 THEN least(1.5, greatest(0.7, ((clk + 0.5) / greatest(imp,1)) / (tot.tc / tot.ti))) ELSE 1 END, 3)), '{}'::jsonb)
  INTO w FROM dims, tot;

  SELECT pt INTO best_pt FROM _ad_traffic GROUP BY pt ORDER BY sum(imp) DESC LIMIT 1;
  SELECT pl INTO best_pl FROM _ad_traffic GROUP BY pl ORDER BY sum(clk)::numeric/greatest(sum(imp),1) DESC, sum(imp) DESC LIMIT 1;
  SELECT dv INTO best_dv FROM _ad_traffic GROUP BY dv ORDER BY sum(imp) DESC LIMIT 1;

  FOR c IN SELECT * FROM ad_campaigns WHERE smart_mode AND status = 'active' LOOP
    SELECT count(*), count(*) FILTER (WHERE created_at > now() - interval '24 hours')
      INTO delivered, last24 FROM ad_events WHERE campaign_id = c.id AND event_type = 'impression';
    SELECT coalesce(jsonb_agg(t), '[]'::jsonb) INTO tops FROM (
      SELECT page_path path, count(*) views FROM ad_events
      WHERE campaign_id = c.id AND event_type='impression' AND created_at > now() - interval '7 days'
      GROUP BY 1 ORDER BY 2 DESC LIMIT 5) t;
    days_left := CASE WHEN c.goal_end_at IS NOT NULL THEN greatest(0.25, extract(epoch FROM c.goal_end_at - now()) / 86400) END;
    IF c.impression_budget > 0 AND delivered >= c.impression_budget THEN
      st := 'reached'; needed := 0; boost := 0;
      note := 'Goal reached. The ad has stopped by itself.';
    ELSE
      needed := CASE WHEN days_left IS NOT NULL THEN (c.impression_budget - delivered) / days_left
                     ELSE greatest(last24, c.impression_budget / 14.0) END;
      boost := round(least(3, greatest(0.5, needed / greatest(last24, 1))), 2);
      st := CASE WHEN boost >= 1.3 THEN 'behind' WHEN boost <= 0.8 THEN 'ahead' ELSE 'on_track' END;
      note := format('Most visitors are on %s pages (%s); %s spots get the best response, so this ad is shown there more. ',
                coalesce(best_pt,'all'), coalesce(best_dv,'all devices'), replace(coalesce(best_pl,'in_content'),'_',' '))
        || CASE st WHEN 'behind' THEN 'Behind goal: boosting delivery.' WHEN 'ahead' THEN 'Ahead of goal: easing off.' ELSE 'On track.' END;
    END IF;
    UPDATE ad_campaigns SET smart_plan = jsonb_build_object(
      'weights', w, 'boost', boost, 'needed_per_day', round(coalesce(needed,0)), 'last_24h', last24,
      'delivered', delivered, 'status', st, 'note', note, 'top_pages', tops, 'updated_at', now())
    WHERE id = c.id;
    n := n + 1;
  END LOOP;
  RETURN n;
END $$;

REVOKE ALL ON FUNCTION public.ad_smart_refresh() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ad_smart_refresh() TO service_role;