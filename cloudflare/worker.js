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
 * on the staging subdomain BEFORE swapping DNS on the live domain. Static
 * assets requested from staging are proxied to the canonical origin so React
 * can actually boot and take over the SSR shell.
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
<style id="__ssr_handoff_style">
html.app-mounted [data-ssr-shell="1"]{display:none!important}
#root>[data-ssr-shell="1"]+section[style*="min-height:520px"]{display:none!important}
[data-ssr-shell="1"]{min-height:100vh;background:#fff;color:#0f172a;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.55}
[data-ssr-shell="1"] header,[data-ssr-shell="1"] main,[data-ssr-shell="1"] footer,[data-ssr-shell="1"] nav[aria-label="Breadcrumb"]{max-width:1120px;margin-left:auto;margin-right:auto;padding-left:24px;padding-right:24px;box-sizing:border-box}
[data-ssr-shell="1"] header{padding-top:56px;padding-bottom:22px}
[data-ssr-shell="1"] h1{margin:0;color:#0f172a;font-size:clamp(32px,5vw,58px);line-height:1.08;font-weight:850;letter-spacing:0}
[data-ssr-shell="1"] header p{max-width:760px;margin:18px 0 0;color:#475569;font-size:18px;line-height:1.65}
[data-ssr-shell="1"] main{padding-bottom:64px;font-size:16px;color:#334155}
[data-ssr-shell="1"] main p{max-width:880px;margin:0 0 18px}
[data-ssr-shell="1"] ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px 18px;margin:24px 0 0;padding-left:22px}
[data-ssr-shell="1"] li{margin:0}
[data-ssr-shell="1"] a{color:#2563eb;text-decoration:none;font-weight:650}
[data-ssr-shell="1"] a:hover{text-decoration:underline}
[data-ssr-shell="1"] footer{border-top:1px solid #e2e8f0;padding-top:26px;padding-bottom:34px;color:#64748b;font-size:14px}
[data-ssr-shell="1"] footer nav{display:flex;flex-wrap:wrap;gap:12px 18px;padding:0}
@media(max-width:640px){[data-ssr-shell="1"] header,[data-ssr-shell="1"] main,[data-ssr-shell="1"] footer,[data-ssr-shell="1"] nav[aria-label="Breadcrumb"]{padding-left:16px;padding-right:16px}[data-ssr-shell="1"] header{padding-top:36px}[data-ssr-shell="1"] ul{grid-template-columns:1fr}}
</style>
${ldTags}`;
}

function buildSeoBody(meta) {
  // Injected inside <div id="root"> as a genuinely VISIBLE loading shell.
  // React's createRoot(...).render(...) replaces #root's children on first
  // mount, so this is naturally swapped by the real interactive UI. No
  // off-screen positioning, no 1px boxes, no display/visibility hiding,
  // no aria-hidden. Same Tailwind classes as the site's own hero/section
  // patterns so the pre-hydration paint looks like a real page loading,
  // not a distinct cloaked payload.
  const breadcrumbHtml =
    Array.isArray(meta.breadcrumbs) && meta.breadcrumbs.length > 1
      ? `<nav aria-label="Breadcrumb" class="mx-auto max-w-7xl px-4 pt-6 text-sm text-slate-600"><ol class="flex flex-wrap gap-2">${meta.breadcrumbs
          .map((b, i) =>
            i === meta.breadcrumbs.length - 1
              ? `<li aria-current="page" class="text-slate-900 font-medium">${esc(b.name)}</li>`
              : `<li><a href="${esc(b.url)}" class="hover:underline">${esc(b.name)}</a><span class="mx-2 text-slate-400">/</span></li>`,
          )
          .join("")}</ol></nav>`
      : "";

  const h1 = esc(meta.h1 || meta.title);
  const sub = esc(meta.description || "");
  const body = meta.bodyHtml || `<p class="text-base text-slate-700 leading-relaxed">${sub}</p>`;

  return `<div data-ssr-shell="1" class="min-h-screen bg-white text-slate-900">
${breadcrumbHtml}
<header class="mx-auto max-w-7xl px-4 pt-8 pb-6">
  <h1 class="font-heading text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">${h1}</h1>
  ${sub ? `<p class="mt-4 max-w-3xl text-base sm:text-lg text-slate-600 leading-relaxed">${sub}</p>` : ""}
</header>
<main class="mx-auto max-w-7xl px-4 pb-16 prose prose-slate max-w-none">
${body}
</main>
<footer class="mx-auto max-w-7xl px-4 py-8 border-t border-slate-200 text-sm text-slate-600">
  <nav class="flex flex-wrap gap-x-4 gap-y-2">
    <a href="https://mbacompass.in/colleges" class="hover:underline">Top MBA Colleges</a>
    <a href="https://mbacompass.in/coaching" class="hover:underline">MBA Coaching</a>
    <a href="https://mbacompass.in/blog" class="hover:underline">Articles</a>
    <a href="https://mbacompass.in/mocks" class="hover:underline">Mock Tests</a>
    <a href="https://mbacompass.in/about" class="hover:underline">About</a>
  </nav>
</footer>
</div>`;
}

function replaceRootContent(shellHtml, replacementHtml) {
  const openRe = /<div\b[^>]*\bid=["']root["'][^>]*>/i;
  const openMatch = openRe.exec(shellHtml);
  if (!openMatch) return shellHtml;

  const openStart = openMatch.index;
  const openEnd = openStart + openMatch[0].length;
  const tail = shellHtml.slice(openEnd);
  const divRe = /<\/?div\b[^>]*>/gi;
  let depth = 1;
  let match;

  while ((match = divRe.exec(tail))) {
    const tag = match[0];
    if (/^<\s*\/\s*div/i.test(tag)) {
      depth -= 1;
      if (depth === 0) {
        const closeStart = openEnd + match.index;
        return shellHtml.slice(0, openEnd) + replacementHtml + shellHtml.slice(closeStart);
      }
    } else if (!/\/\s*>$/.test(tag)) {
      depth += 1;
    }
  }

  // Fallback for malformed shells: keep the document usable rather than
  // emitting a broken response.
  return shellHtml.replace(openRe, (openTag) => `${openTag}${replacementHtml}`);
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

  // Staging runs on staging.mbacompass.in, but the built JS/CSS assets live on
  // the canonical origin. Make the asset URLs absolute so React can boot even
  // if the Cloudflare route for /assets/* is not attached to staging yet.
  html = html
    .replace(/\b(src|href)=(['"])\/assets\//gi, `$1=$2https://${ORIGIN_HOST}/assets/`)
    .replace(/\b(src|href)=(['"])\/fonts\//gi, `$1=$2https://${ORIGIN_HOST}/fonts/`)
    .replace(/\b(src|href)=(['"])\/favicon\.png/gi, `$1=$2https://${ORIGIN_HOST}/favicon.png`)
    .replace(/\b(src|href)=(['"])\/apple-touch-icon\.png/gi, `$1=$2https://${ORIGIN_HOST}/apple-touch-icon.png`);

  // Inject SEO body inside <div id="root">…</div>. The published shell may
  // already contain an inline prerender placeholder with nested <div> nodes,
  // so do not use a non-greedy regex here — it stops at the first nested
  // </div> and leaves duplicate content stacked on the page. Parse enough of
  // the div nesting to replace the whole #root payload atomically.
  const seo = buildSeoBody(meta);
  html = replaceRootContent(html, seo);

  return html;
}

function originUrlFor(request) {
  const url = new URL(request.url);
  url.protocol = "https:";
  url.hostname = ORIGIN_HOST;
  return url.toString();
}

function fetchOriginPath(request, cacheTtl = 300) {
  return fetch(originUrlFor(request), {
    method: request.method,
    headers: request.headers,
    cf: { cacheTtl, cacheEverything: true },
  });
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
        return fetch(host === ORIGIN_HOST ? request : originUrlFor(request), {
          cf: {
            image: { format, quality: 72, fit: "scale-down" },
            cacheTtl: 31536000,
            cacheEverything: true,
          },
        });
      }
      if (host !== ORIGIN_HOST && (isAssetPath(path) || isPassthrough(path))) {
        return fetchOriginPath(request, isAssetPath(path) ? 31536000 : 300);
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
