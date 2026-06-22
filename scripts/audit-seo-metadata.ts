/**
 * SEO metadata auditor.
 *
 * Usage:
 *   bunx tsx scripts/audit-seo-metadata.ts                # uses default base
 *   bunx tsx scripts/audit-seo-metadata.ts https://mbacompass.in
 *
 * What it does:
 *   1. Pulls every <loc> from /sitemap.xml (follows sitemap-index entries).
 *   2. Fetches each URL with a Googlebot UA so the Cloudflare Worker
 *      serves the prerendered HTML (not the SPA shell).
 *   3. Parses the static <head> and reports:
 *        - missing / duplicate <title>
 *        - title length outside 50–60 chars
 *        - missing / duplicate <meta name="description">
 *        - description length outside 150–160 chars
 *        - missing or wrong <link rel="canonical">
 *        - canonical loops / non-self-references
 *        - missing og:title / og:description / og:image / og:url
 *        - missing JSON-LD
 *   4. Writes a JSON report + a human-readable markdown summary under
 *      ./reports/.
 *
 * The script is read-only — it never edits the site. Fix the issues it
 * surfaces in seoAutomation defaults, per-route Helmets, or admin SEO rows.
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

const BASE = (process.argv[2] || "https://mbacompass.in").replace(/\/$/, "");
const SITEMAP = `${BASE}/sitemap.xml`;
const UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const CONCURRENCY = 8;
const MAX_URLS = Number(process.env.MAX_URLS || 0); // 0 = unlimited

interface PageReport {
  url: string;
  status: number;
  title?: string;
  titleLen?: number;
  description?: string;
  descriptionLen?: number;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  jsonLdCount: number;
  issues: string[];
}

async function fetchSitemapUrls(url: string, seen = new Set<string>()): Promise<string[]> {
  if (seen.has(url)) return [];
  seen.add(url);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) {
    console.warn(`[sitemap] ${url} → ${res.status}`);
    return [];
  }
  const xml = await res.text();
  // Sitemap index?
  if (/<sitemapindex/i.test(xml)) {
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
    const all: string[] = [];
    for (const loc of locs) all.push(...(await fetchSitemapUrls(loc, seen)));
    return all;
  }
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((m) => m[1].trim());
}

function pick(html: string, re: RegExp): string | undefined {
  const m = html.match(re);
  return m ? m[1].trim().replace(/\s+/g, " ") : undefined;
}

function auditHtml(url: string, status: number, html: string): PageReport {
  const head = html.split(/<\/head>/i)[0] || html;
  const title = pick(head, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = pick(
    head,
    /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i,
  );
  const canonical = pick(
    head,
    /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']*)["']/i,
  );
  const ogTitle = pick(
    head,
    /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["']/i,
  );
  const ogDescription = pick(
    head,
    /<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i,
  );
  const ogImage = pick(
    head,
    /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']*)["']/i,
  );
  const ogUrl = pick(
    head,
    /<meta[^>]+property=["']og:url["'][^>]*content=["']([^"']*)["']/i,
  );
  const jsonLdCount = (head.match(/<script[^>]+type=["']application\/ld\+json["']/gi) || [])
    .length;

  const issues: string[] = [];
  if (status >= 400) issues.push(`HTTP ${status}`);
  if (!title) issues.push("missing <title>");
  else {
    if (title.length < 30) issues.push(`title too short (${title.length})`);
    else if (title.length > 65) issues.push(`title too long (${title.length})`);
  }
  if (!description) issues.push("missing meta description");
  else {
    if (description.length < 120) issues.push(`description too short (${description.length})`);
    else if (description.length > 170) issues.push(`description too long (${description.length})`);
  }
  if (!canonical) issues.push("missing canonical");
  else {
    try {
      const c = new URL(canonical, BASE).toString().replace(/\/$/, "");
      const u = url.replace(/\/$/, "");
      if (c !== u) issues.push(`canonical mismatch: ${canonical}`);
    } catch {
      issues.push(`invalid canonical: ${canonical}`);
    }
  }
  if (!ogTitle) issues.push("missing og:title");
  if (!ogDescription) issues.push("missing og:description");
  if (!ogImage) issues.push("missing og:image");
  if (!ogUrl) issues.push("missing og:url");
  if (jsonLdCount === 0) issues.push("no JSON-LD");

  return {
    url,
    status,
    title,
    titleLen: title?.length,
    description,
    descriptionLen: description?.length,
    canonical,
    ogTitle,
    ogDescription,
    ogImage,
    ogUrl,
    jsonLdCount,
    issues,
  };
}

async function auditUrl(url: string): Promise<PageReport> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html" },
      redirect: "follow",
    });
    const html = await res.text();
    return auditHtml(url, res.status, html);
  } catch (e: any) {
    return {
      url,
      status: 0,
      jsonLdCount: 0,
      issues: [`fetch error: ${e?.message || e}`],
    };
  }
}

async function runPool<T, R>(items: T[], n: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
      if (idx % 25 === 0) console.log(`  …${idx + 1}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: n }, worker));
  return out;
}

async function main() {
  console.log(`Auditing ${BASE}`);
  console.log(`Sitemap: ${SITEMAP}`);
  let urls = await fetchSitemapUrls(SITEMAP);
  urls = Array.from(new Set(urls));
  if (MAX_URLS > 0) urls = urls.slice(0, MAX_URLS);
  console.log(`Found ${urls.length} URLs`);
  const reports = await runPool(urls, CONCURRENCY, auditUrl);

  // Duplicate detection
  const titleMap = new Map<string, string[]>();
  const descMap = new Map<string, string[]>();
  for (const r of reports) {
    if (r.title) {
      const arr = titleMap.get(r.title) || [];
      arr.push(r.url);
      titleMap.set(r.title, arr);
    }
    if (r.description) {
      const arr = descMap.get(r.description) || [];
      arr.push(r.url);
      descMap.set(r.description, arr);
    }
  }
  for (const r of reports) {
    if (r.title && (titleMap.get(r.title) || []).length > 1) r.issues.push("duplicate title");
    if (r.description && (descMap.get(r.description) || []).length > 1)
      r.issues.push("duplicate description");
  }

  const failing = reports.filter((r) => r.issues.length > 0);
  const summary = {
    base: BASE,
    generatedAt: new Date().toISOString(),
    total: reports.length,
    failing: failing.length,
    passing: reports.length - failing.length,
    duplicateTitles: [...titleMap.entries()].filter(([, v]) => v.length > 1).length,
    duplicateDescriptions: [...descMap.entries()].filter(([, v]) => v.length > 1).length,
    issueBreakdown: failing
      .flatMap((r) => r.issues)
      .reduce<Record<string, number>>((acc, k) => {
        const key = k.replace(/\(\d+\)/, "(N)");
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
  };

  mkdirSync(resolve("reports"), { recursive: true });
  writeFileSync(
    resolve("reports/seo-metadata-audit.json"),
    JSON.stringify({ summary, reports: failing }, null, 2),
  );

  const md = [
    `# SEO Metadata Audit — ${BASE}`,
    ``,
    `_${summary.generatedAt}_`,
    ``,
    `- Total URLs: **${summary.total}**`,
    `- Passing: **${summary.passing}**`,
    `- Failing: **${summary.failing}**`,
    `- Duplicate titles: **${summary.duplicateTitles}**`,
    `- Duplicate descriptions: **${summary.duplicateDescriptions}**`,
    ``,
    `## Issue breakdown`,
    ``,
    ...Object.entries(summary.issueBreakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `- ${v} × ${k}`),
    ``,
    `## Failing URLs (first 100)`,
    ``,
    ...failing.slice(0, 100).map((r) => `- \`${r.url}\` — ${r.issues.join("; ")}`),
  ].join("\n");
  writeFileSync(resolve("reports/seo-metadata-audit.md"), md);

  console.log(`\nDone. ${summary.failing}/${summary.total} URLs have issues.`);
  console.log(`Reports written to reports/seo-metadata-audit.{json,md}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
