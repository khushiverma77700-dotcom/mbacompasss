// Route Coverage Check
// ─────────────────────────────────────────────────────────────────────────────
// Verifies, for every public route on the site, three SEO-critical guarantees:
//   1. ROBOTS:    The route is NOT blocked by /robots.txt (no Disallow rule
//                 matches its path for User-agent: * or Googlebot).
//   2. CANONICAL: Fetching the URL returns HTML containing a self-referencing
//                 <link rel="canonical"> (or X-Robots header equivalent), so
//                 Google won't pick a duplicate or dedupe it into nothing.
//   3. SITEMAP:   The route appears in the live sitemap (served via
//                 serve-sitemap edge function). Pages missing from the sitemap
//                 won't be reliably discovered and are a major Soft 404 risk.
//
// Routes covered (auto-discovered from DB so this stays current):
//   - All published colleges          (/colleges/:slug)
//   - All published articles / blog   (/blog/:slug, /articles/:slug)
//   - All published exams             (/exams/:slug)
//   - All published institutes        (/institute/:slug)
//   - Static high-value routes        (home, /colleges, /blog, /exams, /mocks, ...)
//
// Findings are written to seo_audit_findings using a fresh seo_audit_runs row,
// so they appear in the existing /admin/indexing-audit dashboard automatically
// under three new categories: route_robots, route_canonical, route_sitemap.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE = "https://mbacompass.in";
const SITEMAP_FN = `${Deno.env.get("SUPABASE_URL")}/functions/v1/serve-sitemap`;

type Severity = "critical" | "warning" | "info";
type Finding = {
  category: "route_robots" | "route_canonical" | "route_sitemap" | "route_status" | "route_soft404" | "duplicate_faq";
  severity: Severity;
  url: string;
  page_type: string;
  issue_code: string;
  message: string;
  fix_suggestion: string;
};

const STATIC_ROUTES: { path: string; type: string }[] = [
  { path: "/", type: "home" },
  { path: "/colleges", type: "list" },
  { path: "/coaching", type: "list" },
  { path: "/blog", type: "list" },
  { path: "/compare", type: "tool" },
  { path: "/mocks", type: "landing" },
  { path: "/courses", type: "landing" },
  { path: "/mba-compass", type: "landing" },
  { path: "/college-shortlister", type: "tool" },
  { path: "/college-finder", type: "tool" },
  { path: "/profile-analyzer", type: "tool" },
  { path: "/cat-score-calculator", type: "tool" },
  { path: "/roi-calculator", type: "tool" },
  { path: "/iim-waitlist-movement", type: "tool" },
  { path: "/about", type: "static" },
  { path: "/contact", type: "static" },
];

const SENTINEL_UNKNOWN_PATHS = [
  "/__google-soft-404-check__",
  "/college/__missing-college-soft-404-check__",
  "/article/__missing-article-soft-404-check__",
];

// ─── robots.txt parsing ──────────────────────────────────────────────────────
type RobotsRules = { disallow: string[]; allow: string[] };

async function fetchRobots(): Promise<RobotsRules> {
  try {
    const r = await fetch(`${SITE}/robots.txt`, { cache: "no-store" });
    if (!r.ok) return { disallow: [], allow: [] };
    const body = await r.text();

    // Apply rules from the * group AND the Googlebot group (most restrictive wins).
    const groups = body.split(/\n(?=User-agent:)/i);
    const disallow: string[] = [];
    const allow: string[] = [];
    for (const g of groups) {
      const ua = /User-agent:\s*(\S+)/i.exec(g)?.[1]?.toLowerCase() ?? "";
      if (ua !== "*" && ua !== "googlebot") continue;
      for (const line of g.split("\n")) {
        const d = /^\s*Disallow:\s*(\S*)/i.exec(line);
        const a = /^\s*Allow:\s*(\S*)/i.exec(line);
        if (d && d[1]) disallow.push(d[1].trim());
        if (a && a[1]) allow.push(a[1].trim());
      }
    }
    return { disallow, allow };
  } catch {
    return { disallow: [], allow: [] };
  }
}

function isBlockedByRobots(path: string, rules: RobotsRules): string | null {
  // Allow rules take precedence when they're more specific (longer match).
  const matchLen = (pattern: string) => {
    if (!pattern) return -1;
    if (pattern.endsWith("$")) {
      return path === pattern.slice(0, -1) ? pattern.length : -1;
    }
    // Wildcards converted naively.
    if (pattern.includes("*")) {
      const re = new RegExp("^" + pattern.replace(/\*/g, ".*"));
      return re.test(path) ? pattern.length : -1;
    }
    return path.startsWith(pattern) ? pattern.length : -1;
  };
  let bestAllow = -1;
  let bestDisallow = -1;
  let bestDisallowPattern = "";
  for (const a of rules.allow) bestAllow = Math.max(bestAllow, matchLen(a));
  for (const d of rules.disallow) {
    const m = matchLen(d);
    if (m > bestDisallow) {
      bestDisallow = m;
      bestDisallowPattern = d;
    }
  }
  return bestDisallow > bestAllow && bestDisallow > 0 ? bestDisallowPattern : null;
}

// ─── sitemap loading (handles index + segments) ──────────────────────────────
async function fetchSitemapUrls(): Promise<Set<string>> {
  const out = new Set<string>();
  try {
    const r = await fetch(`${SITEMAP_FN}?cb=${Date.now()}`);
    if (!r.ok) return out;
    const xml = await r.text();
    const re = /<loc>([^<]+)<\/loc>/g;
    let m: RegExpExecArray | null;
    const top: string[] = [];
    while ((m = re.exec(xml)) !== null) top.push(m[1].trim());

    if (xml.includes("<sitemapindex")) {
      for (const child of top) {
        const seg = child.split("sitemap-")[1]?.replace(".xml", "");
        if (!seg) continue;
        const rr = await fetch(`${SITEMAP_FN}?segment=${seg}&cb=${Date.now()}`);
        if (!rr.ok) continue;
        const cx = await rr.text();
        let mm: RegExpExecArray | null;
        const cre = /<loc>([^<]+)<\/loc>/g;
        while ((mm = cre.exec(cx)) !== null) out.add(normalizeUrl(mm[1].trim()));
      }
    } else {
      for (const u of top) out.add(normalizeUrl(u));
    }
  } catch { /* swallow */ }
  return out;
}

function normalizeUrl(u: string): string {
  try {
    const x = new URL(u);
    return `${x.origin}${x.pathname.replace(/\/+$/, "") || "/"}`;
  } catch {
    return u.replace(/\/+$/, "") || "/";
  }
}

// ─── live HTML extraction ────────────────────────────────────────────────────
async function fetchRouteHtml(url: string): Promise<{ status: number; canonical: string | null; title: string | null; robots: string | null; h1Count: number; textLength: number }> {
  try {
    const r = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" },
      cache: "no-store",
    });
    const html = await r.text();
    const canonicalMatch = /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i.exec(html)
          ?? /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i.exec(html);
    const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    const robotsMatch = /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i.exec(html)
      ?? /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i.exec(html);
    const h1Count = (html.match(/<h1\b/gi) || []).length;
    const textLength = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
    return { status: r.status, canonical: canonicalMatch?.[1] ?? null, title: titleMatch?.[1]?.trim() ?? null, robots: robotsMatch?.[1]?.trim() ?? null, h1Count, textLength };
  } catch {
    return { status: 0, canonical: null, title: null, robots: null, h1Count: 0, textLength: 0 };
  }
}

// ─── core check ──────────────────────────────────────────────────────────────
async function checkRoute(
  path: string,
  pageType: string,
  robots: RobotsRules,
  sitemap: Set<string>,
  findings: Finding[],
) {
  const fullUrl = `${SITE}${path}`;
  const norm = normalizeUrl(fullUrl);

  // 1) robots.txt
  const blockedBy = isBlockedByRobots(path, robots);
  if (blockedBy) {
    findings.push({
      category: "route_robots",
      severity: "critical",
      url: fullUrl,
      page_type: pageType,
      issue_code: "route_blocked_by_robots",
      message: `Route is blocked by robots.txt rule: Disallow: ${blockedBy}`,
      fix_suggestion: `Remove or narrow the "Disallow: ${blockedBy}" directive in /robots.txt so Googlebot can crawl this route.`,
    });
  }

  // 2) sitemap inclusion (skip for paths that are intentionally noindex e.g. auth/admin)
  const intentionallyExcluded = /^\/(admin|auth|dashboard|reset-password|forgot-password)/.test(path);
  if (!intentionallyExcluded && !sitemap.has(norm)) {
    findings.push({
      category: "route_sitemap",
      severity: "warning",
      url: fullUrl,
      page_type: pageType,
      issue_code: "route_missing_from_sitemap",
      message: "Route is reachable but not listed in /sitemap.xml — Google may discover it slowly or not at all.",
      fix_suggestion: "Re-generate the sitemap (Admin → Sitemap Manager) and verify the underlying record is published.",
    });
  }

  // 3) live Googlebot-facing status + canonical + soft-404 signals
  if (!blockedBy && !intentionallyExcluded) {
    const { status, canonical, title, robots: metaRobots, h1Count, textLength } = await fetchRouteHtml(fullUrl);
    if (status === 0 || status >= 500) {
      findings.push({
        category: "route_status",
        severity: "critical",
        url: fullUrl,
        page_type: pageType,
        issue_code: "route_unreachable",
        message: `Route returned HTTP ${status || "network error"} — cannot verify canonical.`,
        fix_suggestion: "Investigate the page render path / edge prerender; pages that don't return 2xx will be dropped from the index.",
      });
    } else if (status >= 400) {
      findings.push({
        category: "route_status",
        severity: "critical",
        url: fullUrl,
        page_type: pageType,
        issue_code: "route_http_error",
        message: `Route returned HTTP ${status}.`,
        fix_suggestion: "Either restore the page (200) or remove it from the sitemap and serve a real 404.",
      });
    } else if (!canonical) {
      findings.push({
        category: "route_canonical",
        severity: "warning",
        url: fullUrl,
        page_type: pageType,
        issue_code: "route_canonical_missing",
        message: "No <link rel=\"canonical\"> tag found in the rendered HTML.",
        fix_suggestion: "Ensure SEOHead renders a canonical tag for this page (or that the SSR/prerender layer injects one).",
      });
    } else {
      const canonNorm = normalizeUrl(canonical);
      if (canonNorm !== norm) {
        findings.push({
          category: "route_canonical",
          severity: "warning",
          url: fullUrl,
          page_type: pageType,
          issue_code: "route_canonical_mismatch",
          message: `Canonical points elsewhere: ${canonical}`,
          fix_suggestion:
            "If this page should be indexed, the canonical must be self-referencing. Otherwise remove it from the sitemap to match the canonical signal.",
        });
      }
    }
    if (status === 200 && normalizeUrl(canonical || "") === normalizeUrl(SITE) && path !== "/") {
      findings.push({
        category: "route_soft404",
        severity: "critical",
        url: fullUrl,
        page_type: pageType,
        issue_code: "generic_homepage_shell",
        message: "Googlebot receives a generic homepage canonical/title for this route, which can make every page look duplicate or like a Soft 404.",
        fix_suggestion: "Add route-specific prerender/HTML fallback for this URL, or remove the static homepage canonical from the HTML shell before publish.",
      });
    }
    if (status === 200 && (h1Count === 0 || textLength < 500 || /not found|page not found|404/i.test(title || ""))) {
      findings.push({
        category: "route_soft404",
        severity: "warning",
        url: fullUrl,
        page_type: pageType,
        issue_code: "thin_or_not_found_html",
        message: `Googlebot-facing HTML is thin or error-like (H1 count: ${h1Count}, visible text: ${textLength} chars).`,
        fix_suggestion: "Ensure the initial HTML contains real page-specific heading/body content before JavaScript hydration.",
      });
    }
    if (metaRobots && /noindex/i.test(metaRobots)) {
      findings.push({
        category: "route_soft404",
        severity: "critical",
        url: fullUrl,
        page_type: pageType,
        issue_code: "route_noindex",
        message: `Route contains a noindex robots directive: ${metaRobots}`,
        fix_suggestion: "Remove noindex from public pages that should be crawled and indexed.",
      });
    }
  }
}

// ─── DB → route inventory ────────────────────────────────────────────────────
async function collectRoutes(supabase: ReturnType<typeof createClient>) {
  const routes: { path: string; type: string }[] = [...STATIC_ROUTES];

  const pull = async (
    table: string,
    pathFn: (slug: string) => string,
    type: string,
    publishedFilter?: { col: string; val: unknown },
  ) => {
    let q = supabase.from(table).select("slug").not("slug", "is", null).neq("slug", "");
    if (publishedFilter) q = q.eq(publishedFilter.col, publishedFilter.val);
    const { data } = await q.limit(2000);
    for (const row of (data ?? []) as { slug: string }[]) {
      if (row.slug) routes.push({ path: pathFn(row.slug), type });
    }
  };

  await pull("colleges", s => `/college/${s}`, "college");
  await pull("articles", s => `/article/${s}`, "article", { col: "published", val: true });
  await pull("exams", s => `/exam/${s}`, "exam");
  await pull("institutes", s => `/institute/${s}`, "institute");
  await pull("categories", s => `/category/${s}`, "category");
  await pull("city_pages", s => `/colleges/${s}`, "city_page", { col: "active", val: true });
  await pull("mock_tests", s => `/mocks/${s}`, "mock", { col: "is_published", val: true });
  await pull("mock_bundles", s => `/courses/${s}`, "mock_bundle", { col: "is_published", val: true });
  await pull("mba_compass_courses", s => `/mba-compass/${s}`, "mba_compass_course", { col: "is_active", val: true });

  // Deduplicate
  const seen = new Set<string>();
  return routes.filter(r => {
    if (seen.has(r.path)) return false;
    seen.add(r.path);
    return true;
  });
}

async function checkUnknownPathStatus(findings: Finding[]) {
  await Promise.all(SENTINEL_UNKNOWN_PATHS.map(async (path) => {
    const fullUrl = `${SITE}${path}`;
    const { status, canonical, robots, title } = await fetchRouteHtml(fullUrl);
    if (status !== 404 && status !== 410) {
      findings.push({
        category: "route_soft404",
        severity: "critical",
        url: fullUrl,
        page_type: "unknown_route",
        issue_code: "unknown_route_returns_200",
        message: `Unknown route returned HTTP ${status || "network error"} instead of a real 404/410. Google will classify this as Soft 404 at scale.`,
        fix_suggestion: "Configure host-level routing for unknown slugs to return a real 404 status, not the generic SPA shell.",
      });
    } else if (!/noindex/i.test(robots || "") && !/not found|404/i.test(title || "")) {
      findings.push({
        category: "route_soft404",
        severity: "warning",
        url: fullUrl,
        page_type: "unknown_route",
        issue_code: "unknown_404_missing_noindex_signal",
        message: "Unknown route returns 404 but the HTML does not clearly include noindex or 404/not-found title text.",
        fix_suggestion: "Keep 404 pages noindex and clearly titled as not found so Google does not treat them as duplicate content.",
      });
    }
    if (canonical && normalizeUrl(canonical) === normalizeUrl(SITE)) {
      findings.push({
        category: "route_soft404",
        severity: "warning",
        url: fullUrl,
        page_type: "unknown_route",
        issue_code: "unknown_route_home_canonical",
        message: "Unknown route carries the homepage canonical, which is a common Soft 404/duplicate signal.",
        fix_suggestion: "Remove homepage canonical from unknown-route responses and serve a real noindex 404 page.",
      });
    }
  }));
}

function normalizeQuestion(q: unknown) {
  return String(q ?? "").toLowerCase().replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractFaqItems(value: unknown): { q: string; a: string }[] {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as any).items)
      ? (value as any).items
      : value && typeof value === "object" && Array.isArray((value as any).faqs)
        ? (value as any).faqs
        : [];
  return list.map((item: any) => ({
    q: String(item?.q ?? item?.question ?? item?.name ?? "").trim(),
    a: String(item?.a ?? item?.answer ?? item?.acceptedAnswer?.text ?? "").trim(),
  })).filter((item) => item.q && item.a);
}

function pushDuplicateFaqFindings(findings: Finding[], scope: { url: string; page_type: string }, faqs: { q: string; a: string }[]) {
  const seen = new Map<string, string[]>();
  for (const faq of faqs) {
    const key = normalizeQuestion(faq.q);
    if (!key) continue;
    const list = seen.get(key) ?? [];
    list.push(faq.q);
    seen.set(key, list);
  }
  for (const [key, copies] of seen) {
    if (copies.length <= 1) continue;
    findings.push({
      category: "duplicate_faq",
      severity: "warning",
      url: scope.url,
      page_type: scope.page_type,
      issue_code: "duplicate_faq_question",
      message: `${copies.length} FAQ entries repeat the same question: "${copies[0].slice(0, 90)}".`,
      fix_suggestion: "Keep one canonical FAQ answer and remove duplicate questions from the page/FAQ settings before requesting indexing again.",
    });
  }
}

async function checkDuplicateFaqSources(supabase: ReturnType<typeof createClient>, findings: Finding[]) {
  const [{ data: supportFaqs }, { data: siteSettings }, { data: courses }, { data: mocksLanding }, { data: cityPages }] = await Promise.all([
    supabase.from("support_faqs").select("category,question,answer,is_published").eq("is_published", true).limit(5000),
    supabase.from("site_settings").select("key,value").or("key.eq.faqs,key.like.seo_page__%").limit(5000),
    supabase.from("mba_compass_courses").select("slug,faqs,is_active").eq("is_active", true).limit(2000),
    supabase.from("mocks_landing_settings").select("faqs").limit(5),
    supabase.from("city_pages").select("slug,faq_content,active").eq("active", true).limit(2000),
  ]);

  const supportByCategory = new Map<string, { q: string; a: string }[]>();
  for (const row of supportFaqs ?? []) {
    const key = String((row as any).category ?? "uncategorized");
    const list = supportByCategory.get(key) ?? [];
    list.push({ q: (row as any).question, a: (row as any).answer });
    supportByCategory.set(key, list);
  }
  for (const [category, faqs] of supportByCategory) {
    pushDuplicateFaqFindings(findings, { url: `${SITE}/student/support#${category}`, page_type: "support_faq" }, faqs);
  }

  for (const row of siteSettings ?? []) {
    const key = String((row as any).key ?? "");
    const faqs = extractFaqItems((row as any).value);
    if (!faqs.length) continue;
    const parts = key.split("__");
    const pageType = parts[1] || "site_setting";
    const recordId = parts[2] || "homepage";
    pushDuplicateFaqFindings(findings, { url: key === "faqs" ? SITE : `${SITE}/admin/seo-dashboard?record=${recordId}`, page_type: `seo_snapshot_${pageType}` }, faqs);
  }

  for (const row of courses ?? []) {
    const slug = (row as any).slug;
    pushDuplicateFaqFindings(findings, { url: `${SITE}/mba-compass/${slug}`, page_type: "mba_compass_course" }, extractFaqItems((row as any).faqs));
  }
  for (const row of mocksLanding ?? []) {
    pushDuplicateFaqFindings(findings, { url: `${SITE}/mocks`, page_type: "mocks_landing" }, extractFaqItems((row as any).faqs));
  }
  for (const row of cityPages ?? []) {
    const html = String((row as any).faq_content ?? "");
    const matches = Array.from(html.matchAll(/<h[23][^>]*>([\s\S]*?\?)<\/h[23]>\s*<p[^>]*>([\s\S]*?)<\/p>/gi));
    const faqs = matches.map((m) => ({ q: m[1].replace(/<[^>]+>/g, " "), a: m[2].replace(/<[^>]+>/g, " ") }));
    pushDuplicateFaqFindings(findings, { url: `${SITE}/colleges/${(row as any).slug}`, page_type: "city_page" }, faqs);
  }
}

// ─── handler ─────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Caller may pass { sample: 100 } to limit work for ad-hoc runs.
  let sample = 0;
  try { ({ sample = 0 } = (await req.json().catch(() => ({}))) as { sample?: number }); } catch {/*noop*/}

  const startedAt = new Date().toISOString();
  const { data: runRow, error: runErr } = await supabase
    .from("seo_audit_runs")
    .insert({ status: "running", started_at: startedAt, summary: { kind: "route_coverage" } })
    .select("id")
    .single();

  if (runErr || !runRow) {
    return new Response(
      JSON.stringify({ ok: false, error: runErr?.message ?? "could not create run" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const runId = runRow.id;

  try {
    const [robots, sitemap, allRoutes] = await Promise.all([
      fetchRobots(),
      fetchSitemapUrls(),
      collectRoutes(supabase),
    ]);

    const routes = sample > 0 ? allRoutes.slice(0, sample) : allRoutes;
    const findings: Finding[] = [];

    // Modest concurrency to avoid hammering the origin.
    const CONCURRENCY = 8;
    let i = 0;
    const workers = Array.from({ length: CONCURRENCY }, async () => {
      while (i < routes.length) {
        const idx = i++;
        const r = routes[idx];
        try {
          await checkRoute(r.path, r.type, robots, sitemap, findings);
        } catch (e) {
          console.error("checkRoute failed", r.path, e);
        }
      }
    });
    await Promise.all(workers);
    await Promise.all([
      checkUnknownPathStatus(findings),
      checkDuplicateFaqSources(supabase, findings),
    ]);

    if (findings.length > 0) {
      // Insert in chunks of 500.
      for (let k = 0; k < findings.length; k += 500) {
        const chunk = findings.slice(k, k + 500).map(f => ({ ...f, run_id: runId }));
        await supabase.from("seo_audit_findings").insert(chunk);
      }
    }

    const critical = findings.filter(f => f.severity === "critical").length;
    const warning = findings.filter(f => f.severity === "warning").length;
    const info = findings.filter(f => f.severity === "info").length;

    await supabase.from("seo_audit_runs").update({
      status: "completed",
      finished_at: new Date().toISOString(),
      total_urls: routes.length,
      total_issues: findings.length,
      critical_issues: critical,
      warning_issues: warning,
      info_issues: info,
      summary: {
        kind: "route_coverage",
        sitemap_size: sitemap.size,
        robots_disallow_count: robots.disallow.length,
        unknown_paths_checked: SENTINEL_UNKNOWN_PATHS.length,
        sampled: sample > 0,
      },
    }).eq("id", runId);

    return new Response(
      JSON.stringify({
        ok: true,
        run_id: runId,
        routes_checked: routes.length,
        findings: findings.length,
        critical, warning, info,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    await supabase.from("seo_audit_runs").update({
      status: "failed",
      finished_at: new Date().toISOString(),
      summary: { kind: "route_coverage", error: String(err) },
    }).eq("id", runId);

    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
