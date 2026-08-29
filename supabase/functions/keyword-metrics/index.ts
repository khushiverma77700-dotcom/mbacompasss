// Unified REAL keyword-metrics API for the admin SEO tools.
//
// actions:
//   lookup   { keywords: string[], refresh?: boolean }  → verified metrics + opportunity scores
//   expand   { keyword: string }                        → real related + question keywords with metrics
//   serp     { keyword: string }                        → live top-10 organic owners
//   gap      { competitor: string }                     → keywords a competitor ranks for that we don't
//   health   {}                                         → which providers are configured/working
import { requireAdmin } from "../_shared/requireAdmin.ts";
import {
  getKeywordMetrics,
  opportunityScore,
  semrushExpand,
  semrushSerp,
  semrushCompetitorGap,
  semrushConfigured,
  dataForSeoConfigured,
} from "../_shared/keywordMetrics.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-worker-key",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const OUR_DOMAIN = "mbacompass.in";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authFail = await requireAdmin(req, corsHeaders);
    if (authFail) return authFail;

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "lookup");
    const locale = String(body.locale || "in").toLowerCase();

    if (action === "health") {
      const probe = await getKeywordMetrics(["cat exam"], { locale, refresh: true, withGsc: false });
      return json({
        success: true,
        providers: {
          semrush: { configured: semrushConfigured(), ok: probe.health.semrush.ok, error: probe.health.semrush.error },
          dataforseo: {
            configured: dataForSeoConfigured(),
            ok: probe.health.dataforseo.ok,
            error: probe.health.dataforseo.error,
            note: dataForSeoConfigured()
              ? undefined
              : "Add DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD to unlock exact Google Keyword Planner volumes.",
          },
          searchConsole: { configured: true },
        },
        sample: probe.metrics[0] || null,
      });
    }

    if (action === "expand") {
      const keyword = String(body.keyword || "").trim();
      if (!keyword) return json({ error: "keyword is required" }, 400);
      const expansion = await semrushExpand(keyword, locale, Number(body.limit) || 40);
      const all = [keyword, ...expansion.map((e) => e.keyword)];
      const { metrics, health } = await getKeywordMetrics(all, { locale });
      const scored = metrics
        .map((m) => ({
          ...m,
          opportunityScore: opportunityScore(m),
          kind: expansion.find((e) => e.keyword?.toLowerCase() === m.keyword)?.kind || "seed",
        }))
        .sort((a, b) => b.opportunityScore - a.opportunityScore);
      return json({ success: true, keyword, metrics: scored, health });
    }

    if (action === "serp") {
      const keyword = String(body.keyword || "").trim();
      if (!keyword) return json({ error: "keyword is required" }, 400);
      const [serp, { metrics }] = await Promise.all([
        semrushSerp(keyword, locale),
        getKeywordMetrics([keyword], { locale }),
      ]);
      const metric = metrics[0] || null;
      return json({
        success: true,
        keyword,
        serp,
        metric: metric ? { ...metric, opportunityScore: opportunityScore(metric) } : null,
      });
    }

    if (action === "gap") {
      const competitor = String(body.competitor || "").trim();
      if (!competitor) return json({ error: "competitor is required" }, 400);
      const gaps = await semrushCompetitorGap(OUR_DOMAIN, competitor, locale, Number(body.limit) || 25);
      return json({ success: true, competitor, gaps });
    }

    // default: lookup
    const keywords: string[] = Array.isArray(body.keywords)
      ? body.keywords.map((k: unknown) => String(k))
      : String(body.keyword || "")
          .split("\n")
          .map((k) => k.trim())
          .filter(Boolean);
    if (!keywords.length) return json({ error: "keywords is required" }, 400);

    const { metrics, health } = await getKeywordMetrics(keywords, {
      locale,
      refresh: Boolean(body.refresh),
    });
    return json({
      success: true,
      metrics: metrics
        .map((m) => ({ ...m, opportunityScore: opportunityScore(m) }))
        .sort((a, b) => b.opportunityScore - a.opportunityScore),
      health,
    });
  } catch (e) {
    console.error("[keyword-metrics] error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
