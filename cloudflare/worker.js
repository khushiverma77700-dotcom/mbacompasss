/**
 * Cloudflare Worker for mbacompass.in
 * ------------------------------------
 * Two responsibilities:
 *
 * 1. Bot SSR routing — when Googlebot / Bingbot / social crawlers hit any
 *    HTML route, proxy the request to the `ssr-prerender` Supabase Edge
 *    Function so they receive fully-rendered HTML (with title, meta,
 *    canonical, JSON-LD) instead of the bare SPA shell. Fixes the GSC
 *    "Discovered – not indexed" + "Crawled – not indexed" buckets that
 *    were stuck because Cloudflare was caching the empty index.html at
 *    the edge.
 *
 * 2. Image format negotiation (AVIF/WebP) — for any request to
 *    /storage/v1/render/image/public/... the worker uses Cloudflare's
 *    Image Resizing (cf.image) to re-encode the response into AVIF when
 *    the client's Accept header lists it, falling back to WebP, then the
 *    Supabase-served WebP. Reduces LCP image weight by ~30-50% on
 *    AVIF-capable browsers (Chrome, Edge, Opera, Android, Safari 16+).
 *
 * Deployment:
 *   wrangler deploy --name mbacompass-edge
 *   Then bind to route: mbacompass.in/*  and  www.mbacompass.in/*
 *
 * Required Cloudflare plan: Image Resizing requires Pro+ ($25/mo) OR
 * Polish (Pro plan) which auto-converts to WebP/AVIF without code.
 * If you only have Polish, you can DELETE the image block below — it's
 * a no-op when cf.image isn't licensed.
 */

const SSR_ORIGIN = "https://mttoiqruzzxooveooldo.supabase.co/functions/v1/ssr-prerender";

const BOT_UA = /googlebot|bingbot|yandex|baiduspider|duckduckbot|slurp|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|slackbot|applebot|pinterestbot|ia_archiver/i;

// HTML routes the SPA owns. Everything else (assets, /storage/, /functions/,
// /sitemap.xml, /robots.txt, .htaccess paths) passes through untouched.
const ASSET_EXT = /\.(js|css|map|png|jpe?g|webp|avif|svg|gif|ico|woff2?|ttf|otf|mp4|webm|json|xml|txt|pdf)$/i;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const ua = request.headers.get("user-agent") || "";

    // ── 1. Bot SSR ──
    // Only HTML navigations (no asset extensions) get routed to the
    // prerender function. Avoids proxying JS/CSS through Supabase.
    if (BOT_UA.test(ua) && !ASSET_EXT.test(url.pathname)) {
      const target = `${SSR_ORIGIN}?path=${encodeURIComponent(url.pathname + url.search)}`;
      const resp = await fetch(target, {
        headers: { "user-agent": ua, "accept": "text/html" },
        cf: { cacheTtl: 3600, cacheEverything: true },
      });
      return new Response(resp.body, {
        status: resp.status,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "x-prerender": "ssr-prerender",
          "cache-control": "public, max-age=3600, s-maxage=3600",
        },
      });
    }

    // ── 2. AVIF/WebP negotiation for Supabase render URLs ──
    // Cloudflare Image Resizing re-encodes the upstream image into the
    // best format the client accepts. Requires Image Resizing add-on.
    if (url.pathname.startsWith("/storage/v1/render/image/public/")) {
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

    // ── Default: pass through ──
    return fetch(request);
  },
};
