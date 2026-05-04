import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1?target=denonext";
import { getCredential } from "../_shared/getCredential.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const PSI_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

interface PageSpeedResult {
  url: string;
  name: string;
  slug: string;
  contentType: string;
  device: string;
  score: number;
  status: "good" | "warning" | "poor";
  fcp: number;
  lcp: number;
  tbt: number;
  cls: number;
  si: number;
  tti: number;
  issues: string[];
  opportunities: { title: string; description: string; savings: string }[];
  diagnostics: { title: string; description: string }[];
  checkedAt: string;
}

function extractMetrics(data: any): Partial<PageSpeedResult> {
  const lhr = data?.lighthouseResult;
  if (!lhr) return {};

  const audits = lhr.audits || {};
  const cats = lhr.categories || {};
  const perfScore = Math.round((cats.performance?.score || 0) * 100);

  const fcp = parseFloat(((audits["first-contentful-paint"]?.numericValue || 0) / 1000).toFixed(1));
  const lcp = parseFloat(((audits["largest-contentful-paint"]?.numericValue || 0) / 1000).toFixed(1));
  const tbt = Math.round(audits["total-blocking-time"]?.numericValue || 0);
  const cls = parseFloat((audits["cumulative-layout-shift"]?.numericValue || 0).toFixed(3));
  const si = parseFloat(((audits["speed-index"]?.numericValue || 0) / 1000).toFixed(1));
  const tti = parseFloat(((audits["interactive"]?.numericValue || 0) / 1000).toFixed(1));

  const issues: string[] = [];
  if (lcp > 2.5) issues.push(`LCP ${lcp}s exceeds 2.5s — optimize largest visible element`);
  if (fcp > 1.8) issues.push(`FCP ${fcp}s exceeds 1.8s — reduce render-blocking resources`);
  if (tbt > 200) issues.push(`TBT ${tbt}ms exceeds 200ms — reduce JavaScript execution`);
  if (cls > 0.1) issues.push(`CLS ${cls} exceeds 0.1 — add dimensions to images/embeds`);
  if (si > 3.4) issues.push(`Speed Index ${si}s exceeds 3.4s — optimize above-the-fold`);
  if (tti > 3.8) issues.push(`TTI ${tti}s exceeds 3.8s — code-split heavy JS`);
  if (issues.length === 0) issues.push("All Core Web Vitals within target range ✓");

  // Extract opportunities
  const opportunities: { title: string; description: string; savings: string }[] = [];
  const oppAudits = [
    "render-blocking-resources", "unused-css-rules", "unused-javascript",
    "modern-image-formats", "offscreen-images", "unminified-css",
    "unminified-javascript", "efficient-animated-content", "uses-responsive-images",
    "uses-optimized-images", "uses-text-compression", "uses-rel-preconnect",
    "server-response-time", "redirects", "uses-rel-preload",
    "uses-http2", "dom-size", "critical-request-chains",
    "font-display", "third-party-summary",
  ];
  for (const key of oppAudits) {
    const audit = audits[key];
    if (audit && audit.score !== null && audit.score < 1 && audit.title) {
      const savings = audit.numericValue
        ? audit.numericUnit === "millisecond"
          ? `${Math.round(audit.numericValue)}ms`
          : audit.numericUnit === "byte"
            ? `${Math.round(audit.numericValue / 1024)}KB`
            : `${audit.numericValue}`
        : "";
      opportunities.push({
        title: audit.title,
        description: (audit.description || "").replace(/\[.*?\]\(.*?\)/g, "").slice(0, 200),
        savings,
      });
    }
  }

  // Extract diagnostics
  const diagnostics: { title: string; description: string }[] = [];
  const diagAudits = [
    "mainthread-work-breakdown", "bootup-time", "dom-size",
    "total-byte-weight", "network-requests", "network-rtt",
    "network-server-latency", "long-tasks", "layout-shift-elements",
    "largest-contentful-paint-element", "lcp-lazy-loaded",
  ];
  for (const key of diagAudits) {
    const audit = audits[key];
    if (audit && audit.score !== null && audit.score < 1 && audit.title) {
      diagnostics.push({
        title: audit.title,
        description: audit.displayValue || "",
      });
    }
  }

  return {
    score: perfScore,
    status: perfScore >= 90 ? "good" : perfScore >= 50 ? "warning" : "poor",
    fcp, lcp, tbt, cls, si, tti,
    issues, opportunities, diagnostics,
  };
}

async function requireAdmin(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const token = authHeader.replace("Bearer ", "");
  const sb = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const sbAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data: roleRow } = await sbAdmin
    .from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
  if (!roleRow) {
    return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authFail = await requireAdmin(req);
    if (authFail) return authFail;

    const { urls, device = "mobile", siteUrl } = await req.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(JSON.stringify({ error: "urls array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Map device to PSI strategy
    const strategy = device === "desktop" ? "DESKTOP" : "MOBILE";

    const results: PageSpeedResult[] = [];
    const apiKey = (await getCredential("GOOGLE_PSI_API_KEY")) || "";

    // Process pages sequentially with delay to avoid rate limits
    for (let i = 0; i < Math.min(urls.length, 15); i++) {
      const page = urls[i];
      const fullUrl = page.url.startsWith("http")
        ? page.url
        : `${siteUrl || "https://coach-compass-finder.lovable.app"}${page.url}`;

      try {
        // Build PSI URL — try with API key first, fallback without if 403
        let psiUrl = `${PSI_API}?url=${encodeURIComponent(fullUrl)}&strategy=${strategy}&category=PERFORMANCE`;
        if (apiKey) psiUrl += `&key=${apiKey}`;
        console.log(`[${i + 1}/${Math.min(urls.length, 15)}] Analyzing: ${fullUrl} (${strategy})`);

        // Add delay between requests to avoid 429
        if (i > 0) await new Promise(r => setTimeout(r, 2000));

        let response: Response | null = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          response = await fetch(psiUrl);
          if (response.status !== 429) break;
          console.log(`Rate limited, retrying in ${(attempt + 1) * 5}s...`);
          await new Promise(r => setTimeout(r, (attempt + 1) * 5000));
        }

        // If API key gave 403, retry WITHOUT the key (free tier works without key)
        if (response && response.status === 403 && apiKey) {
          console.log(`API key returned 403, retrying without key...`);
          const errorBody = await response.text();
          console.log(`Google API error: ${errorBody.slice(0, 300)}`);
          const fallbackUrl = `${PSI_API}?url=${encodeURIComponent(fullUrl)}&strategy=${strategy}&category=PERFORMANCE`;
          response = await fetch(fallbackUrl);
        }

        if (!response || !response.ok) {
          const errText = response ? await response.text() : "timeout";
          console.error(`PSI error for ${fullUrl}: ${response?.status} — ${errText.slice(0, 200)}`);
          results.push({
            url: fullUrl,
            name: page.name || fullUrl,
            slug: page.slug || "/",
            contentType: page.contentType || "unknown",
            device,
            score: 0,
            status: "poor",
            fcp: 0, lcp: 0, tbt: 0, cls: 0, si: 0, tti: 0,
            issues: [`API error: ${response?.status || 'timeout'} — could not analyze this URL`],
            opportunities: [],
            diagnostics: [],
            checkedAt: new Date().toISOString(),
          });
          continue;
        }

        const data = await response.json();
        const metrics = extractMetrics(data);

        results.push({
          url: fullUrl,
          name: page.name || fullUrl,
          slug: page.slug || "/",
          contentType: page.contentType || "unknown",
          device,
          score: metrics.score || 0,
          status: metrics.status || "poor",
          fcp: metrics.fcp || 0,
          lcp: metrics.lcp || 0,
          tbt: metrics.tbt || 0,
          cls: metrics.cls || 0,
          si: metrics.si || 0,
          tti: metrics.tti || 0,
          issues: metrics.issues || [],
          opportunities: metrics.opportunities || [],
          diagnostics: metrics.diagnostics || [],
          checkedAt: new Date().toISOString(),
        });
      } catch (pageErr) {
        console.error(`Error analyzing ${fullUrl}:`, pageErr);
        results.push({
          url: fullUrl,
          name: page.name || fullUrl,
          slug: page.slug || "/",
          contentType: page.contentType || "unknown",
          device,
          score: 0, status: "poor",
          fcp: 0, lcp: 0, tbt: 0, cls: 0, si: 0, tti: 0,
          issues: [`Analysis failed: ${(pageErr as Error).message}`],
          opportunities: [], diagnostics: [],
          checkedAt: new Date().toISOString(),
        });
      }
    }

    // Calculate summary
    const avgScore = results.length
      ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
      : 0;

    const summary = {
      good: results.filter(r => r.status === "good").length,
      warning: results.filter(r => r.status === "warning").length,
      poor: results.filter(r => r.status === "poor").length,
    };

    const payload = {
      pages: results,
      avgScore,
      device,
      summary,
      lastChecked: new Date().toISOString(),
      pagesAnalyzed: results.length,
    };

    // Save to site_settings for persistence
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const storageKey = `page_speed_${device}`;

    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", storageKey)
      .maybeSingle();

    if (existing?.id) {
      await supabase.from("site_settings").update({ value: payload as any }).eq("id", existing.id);
    } else {
      await supabase.from("site_settings").insert({ key: storageKey, value: payload as any });
    }

    // ─── Track API Usage ──────────────────────────
    const now = new Date();
    const todayKey = `psi_usage_${now.toISOString().slice(0, 10)}`;
    const monthKey = `psi_usage_month_${now.toISOString().slice(0, 7)}`;

    // Update daily usage
    const { data: dailyData } = await supabase
      .from("site_settings").select("id, value").eq("key", todayKey).maybeSingle();

    const dailyUsage = dailyData?.value as any || { calls: 0, pages: 0, date: todayKey };
    dailyUsage.calls = (dailyUsage.calls || 0) + 1;
    dailyUsage.pages = (dailyUsage.pages || 0) + results.length;
    dailyUsage.lastRun = now.toISOString();
    dailyUsage.device = device;

    if (dailyData?.id) {
      await supabase.from("site_settings").update({ value: dailyUsage as any }).eq("id", dailyData.id);
    } else {
      await supabase.from("site_settings").insert({ key: todayKey, value: dailyUsage as any });
    }

    // Update monthly usage
    const { data: monthlyData } = await supabase
      .from("site_settings").select("id, value").eq("key", monthKey).maybeSingle();

    const monthlyUsage = monthlyData?.value as any || { calls: 0, pages: 0, month: monthKey };
    monthlyUsage.calls = (monthlyUsage.calls || 0) + 1;
    monthlyUsage.pages = (monthlyUsage.pages || 0) + results.length;
    monthlyUsage.lastRun = now.toISOString();

    if (monthlyData?.id) {
      await supabase.from("site_settings").update({ value: monthlyUsage as any }).eq("id", monthlyData.id);
    } else {
      await supabase.from("site_settings").insert({ key: monthKey, value: monthlyUsage as any });
    }

    // Save cumulative usage summary
    const { data: cumData } = await supabase
      .from("site_settings").select("id, value").eq("key", "psi_api_usage").maybeSingle();

    const cumUsage = cumData?.value as any || { totalCalls: 0, totalPages: 0, dailyLimit: 25000, monthlyQuota: 25000, history: [] };
    cumUsage.totalCalls = (cumUsage.totalCalls || 0) + 1;
    cumUsage.totalPages = (cumUsage.totalPages || 0) + results.length;
    cumUsage.lastRun = now.toISOString();
    cumUsage.todayCalls = dailyUsage.calls;
    cumUsage.todayPages = dailyUsage.pages;
    cumUsage.monthCalls = monthlyUsage.calls;
    cumUsage.monthPages = monthlyUsage.pages;
    // Keep last 30 entries in history
    if (!Array.isArray(cumUsage.history)) cumUsage.history = [];
    cumUsage.history.push({ date: now.toISOString(), pages: results.length, device, avgScore });
    if (cumUsage.history.length > 30) cumUsage.history = cumUsage.history.slice(-30);

    if (cumData?.id) {
      await supabase.from("site_settings").update({ value: cumUsage as any }).eq("id", cumData.id);
    } else {
      await supabase.from("site_settings").insert({ key: "psi_api_usage", value: cumUsage as any });
    }

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("page-speed-check error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
