/**
 * Cloudflare Worker for mbacompass.in — Plan B1 (universal SSR merge).
 * --------------------------------------------------------------------
 *
 * For every HTML navigation (human or bot), we:
 *   1. Fetch the Hostinger-served SPA shell (index.html with hashed
 *      <script src="/assets/index-[hash].js"> and #root div).
 *   2. Fetch route metadata JSON from the `ssr-prerender` Supabase
 *      Edge Function (title, description, canonical, jsonLd, bodyHtml).
 *   3. Rewrite the shell's <head> with route-specific tags and inject
 *      the SEO body content inside <div id="root"> so crawlers see full
 *      content in the initial HTML. React then boots normally, replaces
 *      #root contents on first render — no hydration mismatch because
 *      main.tsx uses `createRoot(...).render(...)`, not `hydrateRoot`.
 *
 * Non-HTML paths (assets, /storage/*, /functions/*, sitemap, robots),
 * authenticated traffic, and app-only routes (/student, /admin, /auth,
 * /login) pass straight through to origin with no prerender.
 *
 * ?nossr=1  → escape hatch that skips the merge for debugging.
 * ?ssrjson=1 → returns the raw JSON from ssr-prerender (debug).
 *
 * Staging: bind this worker to both mbacompass.in/* AND
 * staging.mbacompass.in/* so you can click through the merged output
 * on the staging subdomain BEFORE swapping DNS on the live domain.
 */

const SUPABASE_PROJECT = "mttoiqruzzxooveooldo";
const SSR_ORIGIN = `https://${SUPABASE_PROJECT}.supabase.co/functions/v1/ssr-prerender`;

// Where the built SPA files (index.html + /assets/*) live. Hostinger
// serves them from mbacompass.in itself; the worker must fetch the raw
// origin without re-entering itself. On staging, use the same origin.
const ORIGIN_HOST = "mbacompass.in";

const ASSET_EXT = /\.(js|css|map|png|jpe?g|webp|avif|svg|gif|ico|woff2?|ttf|otf|mp4|webm|json|xml|txt|pdf)$/i;

const APP_ONLY_PREFIXES = ["/student", "/admin", "/auth", "/login", "/reset-password", "/forgot-password"];

const PASSTHROUGH_PREFIXES = [
  "/assets/",
  "/storage/",
  "/functions/",
  "/api/",
];

const PASSTHROUGH_EXACT = new Set(["/sitemap.xml", "/robots.txt", "/manifest.json", "/version.json", "/llms.txt", "/placeholder.svg"]);

function isAssetPath(p) {
  return ASSET_EXT.test(p);
}

function isAppOnly(p) {
  return APP_ONLY_PREFIXES.some((pref) => p === pref || p.startsWith(pref + "/"));
}

function isPassthrough(p) {
  if (PASSTHROUGH_EXACT.has(p)) return true;
  return PASSTHROUGH_PREFIXES.some((pref) => p.startsWith(pref));
}

function hasAuthSignal(request) {
  if (request.headers.get("authorization")) return true;
  const cookie = request.headers.get("cookie") || "";
  return /sb-[^=]+-auth-token=/.test(cookie);
}

function isDashboardHost(host) {
  return host === "dashboard.mbacompass.in" || host.endsWith(".lovable.app");
}

// Escape values before injecting into HTML attributes.
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildHeadTags(meta) {
  const image = meta.image || "https://mbacompass.in/og-image.png";
  const robots = meta.noindex
    ? "noindex, follow"
    : "index, follow, max-image-preview:large, max-snippet:-1";
  const ogType = meta.bodyHtml ? "article" : "website";
  const jsonLdArr = !meta.jsonLd
    ? []
    : Array.isArray(meta.jsonLd)
    ? meta.jsonLd
    : [meta.jsonLd];
  if (Array.isArray(meta.breadcrumbs) && meta.breadcrumbs.length > 0) {
    jsonLdArr.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: meta.breadcrumbs.map((b, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: b.name,
        item: b.url,
      })),
    });
  }
  const ldTags = jsonLdArr
    .map(
      (n) =>
        `<script type="application/ld+json">${JSON.stringify(n).replace(/</g, "\\u003c")}</script>`,
    )
    .join("\n");

  return `<title>${esc(meta.title)}</title>
<meta name="description" content="${esc(meta.description)}">
<meta name="robots" content="${robots}">
<meta name="googlebot" content="${robots}">
<link rel="canonical" href="${esc(meta.canonical || meta.url)}">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="MBA Compass">
<meta property="og:title" content="${esc(meta.title)}">
<meta property="og:description" content="${esc(meta.description)}">
<meta property="og:url" content="${esc(meta.canonical || meta.url)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(meta.title)}">
<meta name="twitter:description" content="${esc(meta.description)}">
<meta name="twitter:image" content="${esc(image)}">
${ldTags}`;
}

function buildSeoBody(meta) {
  // Injected inside <div id="root"> so crawlers see real content in
  // the initial HTML. React blows this away on first render because
  // main.tsx uses createRoot(...).render(...) (not hydrateRoot), so
  // no hydration mismatch warning. Hidden from humans via inline
  // style — Vite's #root child paints on top instantly, but even if
  // there's a delay, the hidden text won't flash.
  const breadcrumbHtml =
    Array.isArray(meta.breadcrumbs) && meta.breadcrumbs.length > 1
      ? `<nav aria-label="Breadcrumb"><ol>${meta.breadcrumbs
          .map((b, i) =>
            i === meta.breadcrumbs.length - 1
              ? `<li>${esc(b.name)}</li>`
              : `<li><a href="${esc(b.url)}">${esc(b.name)}</a></li>`,
          )
          .join("")}</ol></nav>`
      : "";

  return `<div data-ssr-seo="1" style="position:absolute;left:-99999px;top:-99999px;width:1px;height:1px;overflow:hidden;">
<header><a href="https://mbacompass.in/"><strong>MBA Compass</strong></a> — India's MBA Discovery Platform</header>
${breadcrumbHtml}
<main>
<h1>${esc(meta.h1 || meta.title)}</h1>
${meta.bodyHtml || `<p>${esc(meta.description)}</p>`}
<p><a href="${esc(meta.canonical || meta.url)}">View the full interactive page on MBA Compass →</a></p>
</main>
<footer><nav>
<a href="https://mbacompass.in/colleges">Top MBA Colleges</a> ·
<a href="https://mbacompass.in/coaching">MBA Coaching</a> ·
<a href="https://mbacompass.in/blog">Articles</a> ·
<a href="https://mbacompass.in/mocks">Mock Tests</a>
</nav></footer>
</div>`;
}

// Rewrite the shell's <head> — strip existing <title>, description,
// canonical, robots and og/twitter meta tags, then inject our set just
// before </head>. Everything else (viewport, favicon, preloads, module
// script tags) is preserved so React still boots.
function mergeShell(shellHtml, meta) {
  let html = shellHtml;

  // Strip tags we're about to replace so we don't emit duplicates.
  const removePatterns = [
    /<title>[\s\S]*?<\/title>/i,
    /<meta\s+name=["']description["'][^>]*>/gi,
    /<meta\s+name=["']robots["'][^>]*>/gi,
    /<meta\s+name=["']googlebot["'][^>]*>/gi,
    /<link\s+rel=["']canonical["'][^>]*>/gi,
    /<meta\s+property=["']og:(?:type|site_name|title|description|url|image|locale)["'][^>]*>/gi,
    /<meta\s+name=["']twitter:(?:card|title|description|image)["'][^>]*>/gi,
  ];
  for (const re of removePatterns) html = html.replace(re, "");

  const headTags = buildHeadTags(meta);
  html = html.replace(/<\/head>/i, `${headTags}\n</head>`);

  // Inject SEO body inside <div id="root">…</div>. Handle both empty
  // and non-empty root nodes (Vite ships an empty one by default).
  const seo = buildSeoBody(meta);
  html = html.replace(
    /<div\s+id=["']root["'][^>]*>([\s\S]*?)<\/div>/i,
    (m, inner) => m.replace(inner, seo + inner),
  );

  return html;
}

async function fetchSsrMeta(pathAndQuery) {
  const target = `${SSR_ORIGIN}?path=${encodeURIComponent(pathAndQuery)}&format=json`;
  const resp = await fetch(target, {
    headers: { "accept": "application/json" },
    cf: { cacheTtl: 600, cacheEverything: true },
  });
  if (!resp.ok && resp.status !== 404) return null;
  try {
    return { data: await resp.json(), status: resp.status };
  } catch {
    return null;
  }
}

async function fetchShell(request) {
  // Fetch the Hostinger-served index.html for the SAME origin. Use the
  // origin host explicitly so this call doesn't re-enter the worker.
  const url = new URL(request.url);
  const shellUrl = `https://${ORIGIN_HOST}/index.html`;
  const resp = await fetch(shellUrl, {
    headers: { "user-agent": request.headers.get("user-agent") || "" },
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  return resp;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const host = url.hostname;
    const path = url.pathname;

    // Debug — raw JSON straight from ssr-prerender.
    if (url.searchParams.get("ssrjson") === "1") {
      const meta = await fetchSsrMeta(path + url.search);
      return new Response(JSON.stringify(meta, null, 2), {
        headers: { "content-type": "application/json" },
      });
    }

    // Never touch the dashboard subdomain or lovable preview hosts.
    if (isDashboardHost(host)) return fetch(request);

    // Non-HTML, app-only, or authenticated paths → straight to origin.
    if (
      isAssetPath(path) ||
      isPassthrough(path) ||
      isAppOnly(path) ||
      hasAuthSignal(request) ||
      url.searchParams.get("nossr") === "1"
    ) {
      // Legacy image-format negotiation kept for /storage/v1/render/image/*.
      if (path.startsWith("/storage/v1/render/image/public/")) {
        const accept = request.headers.get("accept") || "";
        const format = accept.includes("image/avif")
          ? "avif"
          : accept.includes("image/webp")
          ? "webp"
          : "auto";
        return fetch(request, {
          cf: {
            image: { format, quality: 72, fit: "scale-down" },
            cacheTtl: 31536000,
            cacheEverything: true,
          },
        });
      }
      return fetch(request);
    }

    // ── HTML navigation: fetch shell + meta in parallel and merge ──
    const [shellResp, ssr] = await Promise.all([
      fetchShell(request),
      fetchSsrMeta(path + url.search),
    ]);

    // Shell must succeed — if not, pass through so the user still sees
    // whatever Hostinger returned instead of a worker error.
    if (!shellResp.ok) return fetch(request);

    let shellHtml;
    try {
      shellHtml = await shellResp.text();
    } catch {
      return fetch(request);
    }

    // If SSR meta fetch failed, serve the shell as-is (SPA fallback).
    if (!ssr || !ssr.data) {
      return new Response(shellHtml, {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "public, max-age=60, s-maxage=300",
          "vary": "Cookie, Accept-Encoding",
          "x-prerender": "shell-only",
        },
      });
    }

    const merged = mergeShell(shellHtml, ssr.data);
    return new Response(merged, {
      status: ssr.status === 404 ? 404 : 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=600, s-maxage=600, stale-while-revalidate=86400",
        "vary": "Cookie, Accept-Encoding",
        "x-prerender": "b1-merge",
      },
    });
  },
};
