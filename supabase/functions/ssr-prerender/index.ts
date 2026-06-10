// SSR Prerender for search-engine crawlers.
//
// Why this exists:
//   The site is a Vite + React SPA. Googlebot fetches a near-empty index.html
//   shell and flags article URLs as "Soft 404 — URL is not available to Google".
//   This function returns fully-rendered HTML (title, meta, full article body,
//   JSON-LD) so crawlers see real content at the canonical mbacompass.in URL.
//
// Apache .htaccess proxies bot user-agents on /article/<slug> here via mod_proxy
// [P] so Google sees the rendered HTML at the original URL, not a redirect.
//
// Usage:
//   GET /functions/v1/ssr-prerender?path=/article/some-slug

import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=denonext";

const SITE = "https://mbacompass.in";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
};

function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Strip raw <script>/<style>/event handlers from stored article HTML for safe inlining.
function sanitizeContent(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

function notFound(path: string): Response {
  const safe = esc(path).slice(0, 200);
  const html = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><title>404 — Not Found | MBA Compass</title>
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${SITE}/404">
</head><body><h1>404</h1><p>${safe} not found.</p>
<p><a href="${SITE}/">Home</a> · <a href="${SITE}/blog">Blog</a></p>
</body></html>`;
  return new Response(html, {
    status: 404,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, follow" },
  });
}

function renderArticle(a: any): string {
  const url = `${SITE}/article/${a.slug}`;
  const title = a.meta_title || a.title || "MBA Compass Article";
  const description = (a.meta_description || a.excerpt || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
  const image = a.image_url || a.banner_url || a.mobile_banner_url || `${SITE}/og-default.jpg`;
  const author = a.author || "MBA Compass Editorial";
  const published = a.created_at ? new Date(a.created_at).toISOString() : new Date().toISOString();
  const modified = a.updated_at ? new Date(a.updated_at).toISOString() : published;
  const category = a.category || "MBA";
  const keywords = Array.isArray(a.keywords) ? a.keywords.join(", ") : "";

  const bodyHtml = sanitizeContent(a.content || "");
  const excerptHtml = a.excerpt ? `<p class="lead">${esc(a.excerpt)}</p>` : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    image: [image],
    datePublished: published,
    dateModified: modified,
    author: { "@type": "Person", name: author },
    publisher: {
      "@type": "Organization",
      name: "MBA Compass",
      logo: { "@type": "ImageObject", url: `${SITE}/logo.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    articleSection: category,
    keywords,
  };

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | MBA Compass</title>
<meta name="description" content="${esc(description)}">
${keywords ? `<meta name="keywords" content="${esc(keywords)}">` : ""}
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="author" content="${esc(author)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="article">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:site_name" content="MBA Compass">
<meta property="article:published_time" content="${published}">
<meta property="article:modified_time" content="${modified}">
<meta property="article:section" content="${esc(category)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<style>
body{font-family:system-ui,-apple-system,sans-serif;max-width:780px;margin:0 auto;padding:24px;color:#0f172a;line-height:1.65}
h1{font-size:2rem;line-height:1.2;margin:.5rem 0}
img{max-width:100%;height:auto}
.meta{color:#475569;font-size:.9rem;margin-bottom:1rem}
.lead{font-size:1.1rem;color:#334155;border-left:3px solid #2563eb;padding-left:1rem;margin:1rem 0}
a{color:#2563eb}
</style>
</head>
<body>
<header>
  <p class="meta"><a href="${SITE}/">MBA Compass</a> &raquo; <a href="${SITE}/blog">Blog</a> &raquo; ${esc(category)}</p>
  <h1>${esc(a.h1_tag || a.title)}</h1>
  <p class="meta">By ${esc(author)} · Published ${new Date(published).toDateString()} · Updated ${new Date(modified).toDateString()}</p>
  ${image ? `<img src="${esc(image)}" alt="${esc(title)}" loading="eager">` : ""}
</header>
<main>
  ${excerptHtml}
  <article>${bodyHtml || "<p>Full article content coming soon.</p>"}</article>
</main>
<footer>
  <hr>
  <p><a href="${url}">View full interactive page on MBA Compass</a></p>
  <nav>
    <a href="${SITE}/">Home</a> ·
    <a href="${SITE}/blog">Blog</a> ·
    <a href="${SITE}/colleges">Colleges</a> ·
    <a href="${SITE}/exams">Exams</a>
  </nav>
</footer>
</body>
</html>`;
}

function renderCollege(c: any): string {
  const url = `${SITE}/college/${c.slug}`;
  const title = c.meta_title || `${c.name} - Admissions, Fees, Placements | MBA Compass`;
  const description = (c.meta_description || c.short_description || c.description || "")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
  const image = c.image_url || c.banner_url || `${SITE}/og-default.jpg`;
  const body = sanitizeContent(c.description || c.short_description || "");
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${esc(image)}">
</head><body>
<h1>${esc(c.name)}</h1>
${c.location ? `<p><strong>Location:</strong> ${esc(c.location)}</p>` : ""}
${c.tier ? `<p><strong>Tier:</strong> ${esc(c.tier)}</p>` : ""}
${c.fees ? `<p><strong>Fees:</strong> ${esc(c.fees)}</p>` : ""}
<article>${body}</article>
<p><a href="${url}">View on MBA Compass</a></p>
</body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const path = (url.searchParams.get("path") || "/").trim();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // /article/<slug>
    const articleMatch = path.match(/^\/article\/([^/?#]+)/);
    if (articleMatch) {
      const slug = decodeURIComponent(articleMatch[1]);
      const { data } = await supabase
        .from("articles")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (!data) return notFound(path);
      return new Response(renderArticle(data), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=600, s-maxage=3600",
          "X-Robots-Tag": "index, follow",
        },
      });
    }

    // /college/<slug>
    const collegeMatch = path.match(/^\/college\/([^/?#]+)/);
    if (collegeMatch) {
      const slug = decodeURIComponent(collegeMatch[1]);
      const { data } = await supabase
        .from("colleges").select("*").eq("slug", slug).maybeSingle();
      if (!data) return notFound(path);
      return new Response(renderCollege(data), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, max-age=600, s-maxage=3600",
        },
      });
    }

    return notFound(path);
  } catch (err) {
    console.error("ssr-prerender error", err);
    return new Response(
      `<!doctype html><html><head><title>Error</title><meta name="robots" content="noindex"></head><body>Temporary error</body></html>`,
      { status: 500, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } },
    );
  }
});
