// Weekly SEO health check.
// Scans category (coaching) and institute pages (plus optional colleges/exams sample) and records:
// indexability, meta tags, response time, HTML size, canonical, robots meta, and derives scores.
//
// Body:
//   { scope?: "weekly"|"manual", limitPerType?: number, includeColleges?: boolean, includeExams?: boolean }
//
// Called both manually (admin UI) and via pg_cron weekly.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.1?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://mbacompass.in";

// Coaching category slugs (mirror /coaching hub URLs). Kept static so scan works even without DB seeds.
const COACHING_EXAM_SLUGS = ["cat", "xat", "cmat", "iift", "snap", "nmat", "mat", "ipmat", "cuet"];
const COACHING_MODE_SLUGS = ["online", "offline", "hybrid", "weekend", "crash-course", "video"];
const COACHING_REGION_SLUGS = [
  "delhi","mumbai","bangalore","chennai","hyderabad","pune","kolkata",
  "ahmedabad","jaipur","lucknow","chandigarh","indore","kochi","noida",
];

type PageEntry = { url: string; page_type: string; slug: string | null };

type CheckResult = {
  page_type: string;
  url: string;
  slug: string | null;
  http_status: number | null;
  response_ms: number | null;
  html_kb: number | null;
  is_indexable: boolean | null;
  has_canonical: boolean;
  canonical_url: string | null;
  title: string | null;
  title_length: number;
  description: string | null;
  description_length: number;
  h1_count: number;
  images_missing_alt: number;
  robots_meta: string | null;
  x_robots_tag: string | null;
  speed_score: number;
  seo_score: number;
  status: "pass" | "warn" | "fail";
  issues: string[];
};

function escapeText(html: string) {
  return html.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

function extractTag(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m ? escapeText(m[1].trim()) : null;
}

async function checkPage(entry: PageEntry): Promise<CheckResult> {
  const issues: string[] = [];
  const started = performance.now();
  let http_status: number | null = null;
  let response_ms: number | null = null;
  let html = "";
  let html_kb: number | null = null;
  let x_robots_tag: string | null = null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(entry.url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "MBACompass-SEO-HealthCheck/1.0" },
    });
    clearTimeout(timeout);
    http_status = res.status;
    x_robots_tag = res.headers.get("x-robots-tag");
    html = await res.text();
    response_ms = Math.round(performance.now() - started);
    html_kb = Math.round(new Blob([html]).size / 1024);
  } catch (e) {
    response_ms = Math.round(performance.now() - started);
    issues.push(`Fetch failed: ${String((e as any)?.message || e).slice(0, 200)}`);
    return {
      page_type: entry.page_type,
      url: entry.url,
      slug: entry.slug,
      http_status,
      response_ms,
      html_kb,
      is_indexable: false,
      has_canonical: false,
      canonical_url: null,
      title: null,
      title_length: 0,
      description: null,
      description_length: 0,
      h1_count: 0,
      images_missing_alt: 0,
      robots_meta: null,
      x_robots_tag,
      speed_score: 0,
      seo_score: 0,
      status: "fail",
      issues,
    };
  }

  const title = extractTag(html, /<title[^>]*>([^<]*)<\/title>/i);
  const description = extractTag(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
  );
  const canonical = extractTag(
    html,
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
  );
  const robots_meta = extractTag(
    html,
    /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i,
  );

  const h1_count = (html.match(/<h1\b/gi) || []).length;
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const images_missing_alt = imgs.filter((t) => !/\balt\s*=/.test(t)).length;

  const robotsLower = `${robots_meta || ""} ${x_robots_tag || ""}`.toLowerCase();
  const noindex = /noindex/.test(robotsLower);
  const is_indexable = http_status === 200 && !noindex;

  // ---- Issue collection ----
  if (http_status !== 200) issues.push(`HTTP ${http_status}`);
  if (noindex) issues.push("Page marked noindex");
  if (!title) issues.push("Missing <title>");
  else if (title.length < 30) issues.push(`Title too short (${title.length} chars)`);
  else if (title.length > 60) issues.push(`Title too long (${title.length} chars)`);
  if (!description) issues.push("Missing meta description");
  else if (description.length < 70) issues.push(`Description too short (${description.length} chars)`);
  else if (description.length > 160) issues.push(`Description too long (${description.length} chars)`);
  if (!canonical) issues.push("Missing canonical tag");
  if (h1_count === 0) issues.push("No <h1> found");
  else if (h1_count > 1) issues.push(`Multiple <h1> tags (${h1_count})`);
  if (images_missing_alt > 0) issues.push(`${images_missing_alt} images without alt`);
  if ((response_ms ?? 0) > 3000) issues.push(`Slow response (${response_ms}ms)`);
  if ((html_kb ?? 0) > 500) issues.push(`Large HTML (${html_kb} KB)`);

  // ---- Scoring ----
  // Speed: 100 at ≤500ms and ≤150KB, 0 at ≥5000ms or ≥1000KB.
  const speedByTime = response_ms == null ? 0 : Math.max(0, Math.min(100, 100 - ((response_ms - 500) / 45)));
  const speedBySize = html_kb == null ? 100 : Math.max(0, Math.min(100, 100 - ((html_kb - 150) / 8.5)));
  const speed_score = Math.round(Math.min(speedByTime, speedBySize));

  let seo_score = 100;
  if (!title) seo_score -= 20;
  else if (title.length < 30 || title.length > 60) seo_score -= 8;
  if (!description) seo_score -= 15;
  else if (description.length < 70 || description.length > 160) seo_score -= 6;
  if (!canonical) seo_score -= 10;
  if (h1_count === 0) seo_score -= 10;
  else if (h1_count > 1) seo_score -= 4;
  if (!is_indexable) seo_score -= 30;
  if (images_missing_alt > 0) seo_score -= Math.min(10, images_missing_alt);
  seo_score = Math.max(0, seo_score);

  const combined = Math.round((seo_score * 0.7) + (speed_score * 0.3));
  const status: "pass" | "warn" | "fail" = combined >= 80 ? "pass" : combined >= 60 ? "warn" : "fail";

  return {
    page_type: entry.page_type,
    url: entry.url,
    slug: entry.slug,
    http_status,
    response_ms,
    html_kb,
    is_indexable,
    has_canonical: !!canonical,
    canonical_url: canonical,
    title,
    title_length: title?.length ?? 0,
    description,
    description_length: description?.length ?? 0,
    h1_count,
    images_missing_alt,
    robots_meta,
    x_robots_tag,
    speed_score,
    seo_score,
    status,
    issues,
  };
}

async function collectPages(
  admin: any,
  opts: { limitPerType: number; includeColleges: boolean; includeExams: boolean },
): Promise<PageEntry[]> {
  const pages: PageEntry[] = [];

  // Coaching category hubs (static, matches sitemap)
  for (const slug of COACHING_EXAM_SLUGS)
    pages.push({ url: `${SITE_URL}/coaching/exam/${slug}`, page_type: "category", slug: `exam/${slug}` });
  for (const slug of COACHING_MODE_SLUGS)
    pages.push({ url: `${SITE_URL}/coaching/mode/${slug}`, page_type: "category", slug: `mode/${slug}` });
  for (const slug of COACHING_REGION_SLUGS)
    pages.push({ url: `${SITE_URL}/coaching/${slug}`, page_type: "category", slug });

  // Institutes
  const { data: insts } = await admin
    .from("institutes")
    .select("slug")
    .not("slug", "is", null)
    .neq("slug", "")
    .order("updated_at", { ascending: false })
    .limit(opts.limitPerType);
  for (const r of insts || [])
    pages.push({ url: `${SITE_URL}/institute/${r.slug}`, page_type: "institute", slug: r.slug });

  if (opts.includeColleges) {
    const { data: colleges } = await admin
      .from("colleges")
      .select("slug")
      .not("slug", "is", null)
      .neq("slug", "")
      .order("updated_at", { ascending: false })
      .limit(Math.min(opts.limitPerType, 30));
    for (const r of colleges || [])
      pages.push({ url: `${SITE_URL}/college/${r.slug}`, page_type: "college", slug: r.slug });
  }

  if (opts.includeExams) {
    const { data: exams } = await admin
      .from("exams")
      .select("slug")
      .not("slug", "is", null)
      .neq("slug", "")
      .limit(20);
    for (const r of exams || [])
      pages.push({ url: `${SITE_URL}/exam/${r.slug}`, page_type: "exam", slug: r.slug });
  }

  return pages;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    let body: any = {};
    try { body = await req.json(); } catch {}
    const scope = (body.scope as string) || "manual";
    const limitPerType = Math.min(Math.max(Number(body.limitPerType) || 40, 5), 150);
    const includeColleges = body.includeColleges !== false;
    const includeExams = body.includeExams !== false;

    // Optional auth check for manual runs (cron uses service role directly)
    let triggered_by: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && scope !== "weekly") {
      const jwt = authHeader.replace("Bearer ", "");
      const { data: userData } = await admin.auth.getUser(jwt);
      if (userData?.user) {
        const { data: role } = await admin
          .from("user_roles")
          .select("role")
          .eq("user_id", userData.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (!role) return json({ error: "Forbidden" }, 403);
        triggered_by = userData.user.id;
      }
    }

    const pages = await collectPages(admin, { limitPerType, includeColleges, includeExams });

    const { data: runRow, error: runErr } = await admin
      .from("seo_health_runs")
      .insert({
        scope,
        status: "running",
        triggered_by,
        pages_total: pages.length,
      })
      .select()
      .single();
    if (runErr) throw runErr;

    // Kick off scan in background so HTTP call returns immediately.
    (async () => {
      const results: CheckResult[] = [];
      const CONCURRENCY = 5;
      for (let i = 0; i < pages.length; i += CONCURRENCY) {
        const slice = pages.slice(i, i + CONCURRENCY);
        const batch = await Promise.all(slice.map((p) => checkPage(p)));
        results.push(...batch);
        // Persist batch immediately for live progress.
        await admin.from("seo_health_page_results").insert(
          batch.map((r) => ({ ...r, run_id: runRow.id })),
        );
        await admin
          .from("seo_health_runs")
          .update({ pages_checked: results.length })
          .eq("id", runRow.id);
      }

      const pass = results.filter((r) => r.status === "pass").length;
      const warn = results.filter((r) => r.status === "warn").length;
      const fail = results.filter((r) => r.status === "fail").length;
      const times = results.map((r) => r.response_ms || 0).filter((v) => v > 0);
      const sizes = results.map((r) => r.html_kb || 0).filter((v) => v > 0);
      const avgResp = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
      const avgKb = sizes.length ? Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length) : null;

      const summary = {
        by_type: results.reduce((acc: Record<string, any>, r) => {
          const t = r.page_type;
          acc[t] ||= { total: 0, pass: 0, warn: 0, fail: 0 };
          acc[t].total++;
          acc[t][r.status]++;
          return acc;
        }, {}),
        top_issues: Object.entries(
          results.flatMap((r) => r.issues).reduce((acc: Record<string, number>, iss) => {
            acc[iss] = (acc[iss] || 0) + 1;
            return acc;
          }, {}),
        )
          .sort((a, b) => (b[1] as number) - (a[1] as number))
          .slice(0, 10)
          .map(([issue, count]) => ({ issue, count })),
      };

      await admin
        .from("seo_health_runs")
        .update({
          status: "completed",
          pages_checked: results.length,
          pages_passing: pass,
          pages_warning: warn,
          pages_failing: fail,
          avg_response_ms: avgResp,
          avg_html_kb: avgKb,
          summary,
          completed_at: new Date().toISOString(),
        })
        .eq("id", runRow.id);
    })().catch(async (e) => {
      await admin
        .from("seo_health_runs")
        .update({ status: "failed", error: String((e as any)?.message || e), completed_at: new Date().toISOString() })
        .eq("id", runRow.id);
    });

    return json({ run_id: runRow.id, pages_total: pages.length, status: "running" });
  } catch (e) {
    return json({ error: String((e as any)?.message || e) }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
