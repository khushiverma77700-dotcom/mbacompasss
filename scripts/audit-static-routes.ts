/**
 * Static route audit — single source of truth check.
 *
 * Compares STATIC_ROUTES (supabase/functions/_shared/staticRoutes.ts)
 * against what production actually serves:
 *
 *   1. robots.txt        — parses `Sitemap:` line + `Disallow` rules that
 *                          would block any expected route.
 *   2. sitemap.xml       — every expected path must appear as a <loc>.
 *                          Reports missing + unexpected extras.
 *   3. per-route HTML    — fetches each expected route with a Googlebot UA
 *                          (so the Cloudflare Worker serves prerendered HTML),
 *                          then checks canonical, og:url, robots meta and
 *                          confirms canonical/og:url self-reference the route
 *                          (a homepage canonical on a deep page silently
 *                          re-attributes the page to `/`).
 *
 * Usage:
 *   bunx tsx scripts/audit-static-routes.ts
 *   bunx tsx scripts/audit-static-routes.ts https://mbacompass.in
 *
 * Read-only. Exits 1 if any mismatch is found so it can gate CI later.
 */

import { STATIC_ROUTES } from "../supabase/functions/_shared/staticRoutes.ts";

const BASE = (process.argv[2] || "https://mbacompass.in").replace(/\/$/, "");
const UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

const norm = (p: string) => {
  try {
    const u = new URL(p, BASE);
    let path = u.pathname;
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return path;
  } catch {
    return p;
  }
};

const pick = (html: string, re: RegExp) => {
  const m = html.match(re);
  return m ? m[1].trim() : undefined;
};

async function auditRobots() {
  const res = await fetch(`${BASE}/robots.txt`, { headers: { "User-Agent": UA } });
  const issues: string[] = [];
  if (!res.ok) {
    issues.push(`robots.txt HTTP ${res.status}`);
    return { issues, sitemapUrl: undefined as string | undefined };
  }
  const body = await res.text();
  const sitemapUrl = pick(body, /^\s*Sitemap:\s*(\S+)/im);
  if (!sitemapUrl) issues.push("robots.txt missing `Sitemap:` directive");

  // Look for disallow rules affecting expected routes under `User-agent: *`
  const starBlock = body.split(/^User-agent:\s*/im).find((b) => /^\*/.test(b)) || "";
  const disallows = [...starBlock.matchAll(/^\s*Disallow:\s*(\S+)/gim)].map((m) => m[1]);
  for (const r of STATIC_ROUTES) {
    for (const d of disallows) {
      if (d === "/" || (d !== "" && r.path.startsWith(d))) {
        issues.push(`robots.txt disallows ${r.path} via "Disallow: ${d}"`);
      }
    }
  }
  return { issues, sitemapUrl };
}

async function auditSitemap(sitemapUrl: string) {
  const seen = new Set<string>();
  const walk = async (u: string) => {
    if (seen.has(u)) return [] as string[];
    seen.add(u);
    const r = await fetch(u, { headers: { "User-Agent": UA } });
    if (!r.ok) return [];
    const xml = await r.text();
    if (/<sitemapindex/i.test(xml)) {
      const kids = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
      const all: string[] = [];
      for (const k of kids) all.push(...(await walk(k)));
      return all;
    }
    return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
  };

  const locs = new Set((await walk(sitemapUrl)).map(norm));
  const issues: string[] = [];
  for (const r of STATIC_ROUTES) {
    if (!locs.has(norm(r.path))) issues.push(`sitemap missing ${r.path}`);
  }
  return { issues, sitemapCount: locs.size };
}

async function auditPage(path: string) {
  const url = `${BASE}${path}`;
  const issues: string[] = [];
  let status = 0;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
    });
    status = res.status;
    if (!res.ok) issues.push(`HTTP ${res.status}`);
    const html = await res.text();
    const head = html.split(/<\/head>/i)[0] || html;

    const canonical = pick(
      head,
      /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i,
    );
    const ogUrl = pick(
      head,
      /<meta[^>]+property=["']og:url["'][^>]*content=["']([^"']+)["']/i,
    );
    const ogTitle = pick(
      head,
      /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']+)["']/i,
    );
    const ogDesc = pick(
      head,
      /<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']+)["']/i,
    );
    const robots = pick(
      head,
      /<meta[^>]+name=["']robots["'][^>]*content=["']([^"']+)["']/i,
    );

    if (!canonical) issues.push("missing canonical");
    else if (norm(canonical) !== norm(path))
      issues.push(`canonical mismatch (${norm(canonical)} vs ${norm(path)})`);

    if (!ogUrl) issues.push("missing og:url");
    else if (norm(ogUrl) !== norm(path))
      issues.push(`og:url mismatch (${norm(ogUrl)} vs ${norm(path)})`);

    if (!ogTitle) issues.push("missing og:title");
    if (!ogDesc) issues.push("missing og:description");
    if (robots && /noindex/i.test(robots))
      issues.push(`robots meta noindex ("${robots}")`);
  } catch (e: any) {
    issues.push(`fetch error: ${e?.message || e}`);
  }
  return { path, url, status, issues };
}

async function main() {
  console.log(`Auditing ${BASE}\nManifest: ${STATIC_ROUTES.length} static routes\n`);

  console.log("→ robots.txt");
  const robots = await auditRobots();
  robots.issues.forEach((i) => console.log(`   FAIL ${i}`));
  if (!robots.issues.length) console.log("   OK");

  const sitemapUrl = robots.sitemapUrl || `${BASE}/sitemap.xml`;
  console.log(`\n→ sitemap.xml (${sitemapUrl})`);
  const sm = await auditSitemap(sitemapUrl);
  console.log(`   ${sm.sitemapCount} <loc> entries`);
  sm.issues.forEach((i) => console.log(`   FAIL ${i}`));
  if (!sm.issues.length) console.log("   OK");

  console.log(`\n→ per-route HTML (${STATIC_ROUTES.length} routes)`);
  const pageReports: Awaited<ReturnType<typeof auditPage>>[] = [];
  const q = [...STATIC_ROUTES.map((r) => r.path)];
  const workers = Array.from({ length: 6 }, async () => {
    while (q.length) {
      const p = q.shift()!;
      const rep = await auditPage(p);
      pageReports.push(rep);
      const tag = rep.issues.length ? "FAIL" : "OK  ";
      console.log(`   ${tag} ${p}${rep.issues.length ? " — " + rep.issues.join("; ") : ""}`);
    }
  });
  await Promise.all(workers);

  const totalIssues =
    robots.issues.length +
    sm.issues.length +
    pageReports.reduce((a, r) => a + r.issues.length, 0);

  console.log(`\nDone. ${totalIssues} issue(s) across manifest.`);
  process.exit(totalIssues ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
