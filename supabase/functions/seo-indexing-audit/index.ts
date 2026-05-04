// SEO Indexing Audit — runs an end-to-end crawlability + indexing audit and stores findings.
// Actions: "run" | "fix" | "summary"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { getCredential } from "../_shared/getCredential.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE = "https://mbacompass.in";
const SITEMAP_FN = `${Deno.env.get("SUPABASE_URL")}/functions/v1/serve-sitemap`;

type Finding = {
  category: string;
  severity: "critical" | "warning" | "info";
  url?: string;
  page_type?: string;
  record_id?: string;
  issue_code: string;
  message: string;
  fix_suggestion?: string;
  fix_action?: string;
  meta?: Record<string, unknown>;
};

// ---------- Google Search Console (uses existing service account) ----------
async function getGoogleAccessToken(): Promise<string | null> {
  const json = (await getCredential("GOOGLE_INDEXING_SERVICE_ACCOUNT"));
  let clientEmail = (await getCredential("GOOGLE_INDEXING_CLIENT_EMAIL"));
  let privateKey = (await getCredential("GOOGLE_INDEXING_PRIVATE_KEY"));
  if (json) {
    try {
      const p = JSON.parse(json);
      clientEmail = p.client_email; privateKey = p.private_key;
    } catch {/* ignore */}
  }
  if (!clientEmail || !privateKey) return null;

  privateKey = privateKey.replace(/\\n/g, "\n");
  const header = { alg: "RS256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const claim = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/indexing",
    aud: "https://oauth2.googleapis.com/token",
    iat, exp: iat + 3600,
  };
  const enc = (o: unknown) =>
    btoa(JSON.stringify(o)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unsigned = `${enc(header)}.${enc(claim)}`;

  // Import PKCS8 key
  const pem = privateKey.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s/g, "");
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8", der.buffer, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const jwt = `${unsigned}.${sigB64}`;

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const d = await r.json();
  return d.access_token ?? null;
}

async function gscInspect(token: string, url: string) {
  const r = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE }),
  });
  if (!r.ok) return null;
  return await r.json();
}

// ---------- Sitemap ----------
async function fetchSitemapUrls(): Promise<string[]> {
  try {
    const r = await fetch(`${SITEMAP_FN}?cb=${Date.now()}`);
    if (!r.ok) return [];
    const xml = await r.text();
    const urls: string[] = [];
    const re = /<loc>([^<]+)<\/loc>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) urls.push(m[1].trim());
    // If sitemap index, fetch children
    if (xml.includes("<sitemapindex")) {
      const out: string[] = [];
      for (const child of urls) {
        try {
          const rr = await fetch(`${SITEMAP_FN}?segment=${child.split("sitemap-")[1]?.replace(".xml","")}&cb=${Date.now()}`);
          if (rr.ok) {
            const cx = await rr.text();
            const rre = /<loc>([^<]+)<\/loc>/g;
            let mm: RegExpExecArray | null;
            while ((mm = rre.exec(cx)) !== null) out.push(mm[1].trim());
          }
        } catch {/* ignore */}
      }
      return Array.from(new Set(out));
    }
    return Array.from(new Set(urls));
  } catch {
    return [];
  }
}

// ---------- Robots.txt ----------
async function fetchRobots(): Promise<{ ok: boolean; body: string; hasSitemap: boolean }> {
  try {
    const r = await fetch(`${SITE}/robots.txt`);
    const body = await r.text();
    return { ok: r.ok, body, hasSitemap: /Sitemap:/i.test(body) };
  } catch {
    return { ok: false, body: "", hasSitemap: false };
  }
}

// ---------- Main ----------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth — must be admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userRes } = await userClient.auth.getUser();
    if (!userRes?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", userRes.user.id).eq("role", "admin").maybeSingle();
    if (!roles) {
      return new Response(JSON.stringify({ error: "Admin only" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action ?? "run";

    // ---------------- ACTION: FIX ----------------
    if (action === "fix") {
      const findingId = body.finding_id as string;
      const { data: f } = await supabase.from("seo_audit_findings").select("*").eq("id", findingId).maybeSingle();
      if (!f) {
        return new Response(JSON.stringify({ error: "Finding not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      let result = "skipped";
      switch (f.fix_action) {
        case "requeue_indexing":
          if (f.url) {
            await supabase.from("indexing_urls").upsert({
              url: f.url, page_type: f.page_type ?? "unknown", record_id: f.record_id,
              status: "pending", retry_count: 0, next_retry_at: new Date().toISOString(),
            }, { onConflict: "url" });
            result = "requeued";
          }
          break;
        case "unpublish_thin":
          if (f.page_type === "article" && f.record_id) {
            await supabase.from("articles").update({ published: false }).eq("id", f.record_id);
            result = "unpublished";
          }
          break;
        case "ping_sitemap":
          await Promise.all([
            fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(`${SITE}/sitemap.xml`)}`),
            fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(`${SITE}/sitemap.xml`)}`),
          ]);
          result = "pinged";
          break;
      }
      await supabase.from("seo_audit_findings").update({ auto_fixed: true, meta: { ...f.meta, fix_result: result } }).eq("id", findingId);
      return new Response(JSON.stringify({ ok: true, result }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---------------- ACTION: RUN ----------------
    const { data: run } = await supabase.from("seo_audit_runs").insert({
      started_by: userRes.user.id, status: "running", scope: "full",
    }).select().single();

    const findings: Finding[] = [];
    const summary: Record<string, unknown> = {};

    // 1) Robots.txt
    const robots = await fetchRobots();
    if (!robots.ok) {
      findings.push({
        category: "crawlability", severity: "critical",
        url: `${SITE}/robots.txt`, issue_code: "robots_unreachable",
        message: "robots.txt is not reachable. Googlebot may treat the site as restricted.",
        fix_suggestion: "Restore /robots.txt with explicit Allow rules and Sitemap declaration.",
      });
    } else {
      if (!robots.hasSitemap) {
        findings.push({
          category: "crawlability", severity: "warning", url: `${SITE}/robots.txt`,
          issue_code: "robots_no_sitemap",
          message: "robots.txt does not declare a Sitemap directive.",
          fix_suggestion: `Add: Sitemap: ${SITE}/sitemap.xml`,
        });
      }
      if (/Disallow:\s*\/\s*$/m.test(robots.body)) {
        findings.push({
          category: "crawlability", severity: "critical", url: `${SITE}/robots.txt`,
          issue_code: "robots_disallow_all",
          message: "robots.txt contains 'Disallow: /' which blocks the entire site.",
          fix_suggestion: "Remove the global disallow rule immediately.",
        });
      }
    }
    summary.robots = robots.ok;

    // 2) Sitemap
    const urls = await fetchSitemapUrls();
    summary.sitemap_url_count = urls.length;
    if (urls.length === 0) {
      findings.push({
        category: "sitemap", severity: "critical", url: `${SITE}/sitemap.xml`,
        issue_code: "sitemap_empty", message: "Sitemap returned no URLs.",
        fix_suggestion: "Check the serve-sitemap edge function and DB content.",
      });
    } else if (urls.length > 50000) {
      findings.push({
        category: "sitemap", severity: "warning", issue_code: "sitemap_too_large",
        message: `Sitemap has ${urls.length} URLs (>50k Google limit per file).`,
        fix_suggestion: "Use a sitemap index that splits URLs into <50k child sitemaps.",
      });
    }

    // Detect duplicate / query-string URLs in sitemap
    const seen = new Set<string>(); const dupes: string[] = []; const params: string[] = [];
    for (const u of urls) {
      if (seen.has(u)) dupes.push(u); else seen.add(u);
      if (u.includes("?")) params.push(u);
    }
    if (dupes.length) {
      findings.push({
        category: "sitemap", severity: "warning", issue_code: "sitemap_duplicates",
        message: `${dupes.length} duplicate URLs in sitemap.`,
        fix_suggestion: "Deduplicate sitemap output in serve-sitemap.",
        meta: { sample: dupes.slice(0, 5) },
      });
    }
    if (params.length) {
      findings.push({
        category: "sitemap", severity: "warning", issue_code: "sitemap_query_params",
        message: `${params.length} URLs include query params (non-canonical).`,
        fix_suggestion: "Strip query params before adding to sitemap.",
        meta: { sample: params.slice(0, 5) },
      });
    }

    // 3) Crawl status check — sample up to 50 URLs (HEAD requests, fast)
    const sample = urls.slice(0, 50);
    const statusResults = await Promise.all(sample.map(async (u) => {
      try {
        const r = await fetch(u, { method: "HEAD", redirect: "manual" });
        return { url: u, status: r.status, location: r.headers.get("location") };
      } catch { return { url: u, status: 0, location: null }; }
    }));
    let bad = 0;
    for (const s of statusResults) {
      if (s.status >= 400 || s.status === 0) {
        bad++;
        findings.push({
          category: "crawlability", severity: s.status >= 500 ? "critical" : "warning",
          url: s.url, issue_code: `http_${s.status}`,
          message: `URL returned HTTP ${s.status || "network error"}.`,
          fix_suggestion: "Fix the broken page or remove from sitemap.",
          fix_action: "requeue_indexing",
        });
      } else if (s.status >= 300 && s.status < 400 && s.location) {
        findings.push({
          category: "technical_seo", severity: "warning", url: s.url,
          issue_code: "redirect_chain",
          message: `Redirects to ${s.location}. Sitemap should contain final URL.`,
          fix_suggestion: "Update sitemap to point to the destination URL.",
        });
      }
    }
    summary.sample_checked = sample.length;
    summary.sample_failed = bad;

    // 4) Content quality — DB-driven thin content detection
    const { data: thinArticles } = await supabase.from("articles")
      .select("id,slug,title,content,published")
      .eq("published", true)
      .limit(5000);
    let thinCount = 0;
    for (const a of thinArticles ?? []) {
      const text = String(a.content ?? "").replace(/<[^>]+>/g, " ").trim();
      const words = text.split(/\s+/).filter(Boolean).length;
      if (words < 250) {
        thinCount++;
        findings.push({
          category: "content_quality", severity: "warning",
          url: `${SITE}/article/${a.slug}`, page_type: "article", record_id: a.id,
          issue_code: "thin_article", message: `Article has only ${words} words (<250).`,
          fix_suggestion: "Expand the article or unpublish it.",
          fix_action: "unpublish_thin",
          meta: { words, title: a.title },
        });
      }
      if (!a.slug || !a.title) {
        findings.push({
          category: "content_quality", severity: "critical",
          page_type: "article", record_id: a.id,
          issue_code: "missing_slug_or_title",
          message: "Article missing slug or title — cannot be indexed.",
          fix_suggestion: "Add slug and title in admin editor.",
        });
      }
    }
    summary.thin_articles = thinCount;

    // 5) Duplicate titles
    const { data: dupTitles } = await supabase.rpc("has_role", { _user_id: userRes.user.id, _role: "admin" }).then(async () => {
      const { data } = await supabase.from("articles")
        .select("title").eq("published", true);
      return { data };
    });
    const titleMap = new Map<string, number>();
    for (const r of dupTitles ?? []) {
      const t = String(r.title ?? "").toLowerCase().trim();
      if (t) titleMap.set(t, (titleMap.get(t) ?? 0) + 1);
    }
    let dupTitleCount = 0;
    for (const [t, n] of titleMap) {
      if (n > 1) {
        dupTitleCount += n;
        findings.push({
          category: "content_quality", severity: "warning",
          issue_code: "duplicate_title",
          message: `${n} articles share the title "${t.slice(0, 60)}".`,
          fix_suggestion: "Rewrite duplicate titles for uniqueness.",
        });
      }
    }
    summary.duplicate_titles = dupTitleCount;

    // 6) Indexing queue health
    const { data: queueStats } = await supabase
      .from("indexing_urls")
      .select("status", { count: "exact" });
    const statusCounts: Record<string, number> = {};
    for (const r of queueStats ?? []) statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
    summary.indexing_queue = statusCounts;
    if ((statusCounts.permanently_failed ?? 0) > 50) {
      findings.push({
        category: "indexing", severity: "critical",
        issue_code: "many_perm_failed",
        message: `${statusCounts.permanently_failed} URLs permanently failed indexing.`,
        fix_suggestion: "Investigate failed URLs in /admin/google-indexing and re-queue valid ones.",
      });
    }

    // 7) GSC inspection — sample top 5 URLs
    const token = await getGoogleAccessToken();
    if (token && urls.length) {
      const inspectSample = urls.slice(0, 5);
      const gscResults = await Promise.all(inspectSample.map(u => gscInspect(token, u)));
      const notIndexed: string[] = [];
      for (let i = 0; i < inspectSample.length; i++) {
        const res = gscResults[i];
        const verdict = res?.inspectionResult?.indexStatusResult?.verdict;
        const coverage = res?.inspectionResult?.indexStatusResult?.coverageState;
        if (verdict && verdict !== "PASS") {
          notIndexed.push(inspectSample[i]);
          findings.push({
            category: "indexing", severity: "warning",
            url: inspectSample[i], issue_code: "gsc_not_indexed",
            message: `GSC verdict: ${verdict}. Coverage: ${coverage ?? "unknown"}`,
            fix_suggestion: "Re-queue via Google Indexing API and ensure content is high-quality.",
            fix_action: "requeue_indexing",
            meta: { coverage, verdict },
          });
        }
      }
      summary.gsc_inspected = inspectSample.length;
      summary.gsc_not_indexed = notIndexed.length;
    } else {
      findings.push({
        category: "search_console", severity: "info",
        issue_code: "gsc_not_configured",
        message: "Google Search Console service account not available — skipped per-URL inspection.",
        fix_suggestion: "Verify GOOGLE_INDEXING_SERVICE_ACCOUNT secret is valid.",
      });
    }

    // 8) Internal linking — orphan colleges/institutes (no inbound link)
    const { data: orphanColleges } = await supabase.from("colleges")
      .select("id,slug,name").or("city.is.null,city.eq.").limit(20);
    for (const c of orphanColleges ?? []) {
      findings.push({
        category: "internal_linking", severity: "warning",
        url: `${SITE}/college/${c.slug}`, page_type: "college", record_id: c.id,
        issue_code: "orphan_college",
        message: `College "${c.name}" has no city assigned — won't appear on city pages.`,
        fix_suggestion: "Assign a city in /admin/colleges.",
      });
    }

    // Insert findings
    if (findings.length) {
      const rows = findings.map(f => ({
        run_id: run!.id, category: f.category, severity: f.severity,
        url: f.url ?? null, page_type: f.page_type ?? null, record_id: f.record_id ?? null,
        issue_code: f.issue_code, message: f.message,
        fix_suggestion: f.fix_suggestion ?? null, fix_action: f.fix_action ?? null,
        meta: f.meta ?? {},
      }));
      // batch insert in chunks of 500
      for (let i = 0; i < rows.length; i += 500) {
        await supabase.from("seo_audit_findings").insert(rows.slice(i, i + 500));
      }
    }

    const critical = findings.filter(f => f.severity === "critical").length;
    const warning = findings.filter(f => f.severity === "warning").length;
    const info = findings.filter(f => f.severity === "info").length;

    await supabase.from("seo_audit_runs").update({
      status: "completed",
      total_urls: urls.length,
      total_issues: findings.length,
      critical_issues: critical,
      warning_issues: warning,
      info_issues: info,
      summary,
      finished_at: new Date().toISOString(),
    }).eq("id", run!.id);

    return new Response(JSON.stringify({
      ok: true, run_id: run!.id, totals: { urls: urls.length, critical, warning, info, total: findings.length },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("seo-indexing-audit error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
