// Real 404 fallback for unknown paths.
//
// Why this exists:
//   The site is a single-page app served from static hosting. Any unknown URL
//   normally returns `index.html` with HTTP 200, which Google flags as a
//   "Soft 404". This edge function exists so that:
//     1. Internal "page not found" handling can issue a request that produces
//        a real `404 Not Found` HTTP status in server logs / GSC.
//     2. Hosting rewrites (e.g. Hostinger `.htaccess` ErrorDocument) can point
//        unknown paths at this function and crawlers will receive a genuine
//        404 with crawlable HTML — not a 200 SPA shell.
//
// Usage:
//   GET  /functions/v1/not-found?path=/something
//   HEAD /functions/v1/not-found?path=/something
//
// Always returns HTTP 404. Body is minimal SEO-safe HTML carrying
// `<meta name="robots" content="noindex, follow">`.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
};

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderHtml(path: string): string {
  const safe = escapeHtml(path).slice(0, 256);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>404 — Page Not Found | MBA Compass</title>
  <meta name="robots" content="noindex, follow" />
  <meta name="description" content="The page you are looking for does not exist on MBA Compass." />
  <meta http-equiv="Status" content="404 Not Found" />
  <link rel="canonical" href="https://mbacompass.in/404" />
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;background:#f1f5f9;color:#0f172a;
         display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
    .card{max-width:520px;padding:2rem;text-align:center}
    h1{font-size:4rem;margin:0 0 .5rem}
    p{color:#475569}
    a{color:#2563eb;text-decoration:none;margin:0 .5rem}
    code{background:#e2e8f0;padding:2px 6px;border-radius:4px;font-size:.85rem}
  </style>
</head>
<body>
  <main class="card">
    <h1>404</h1>
    <p>The page <code>${safe}</code> doesn&apos;t exist or has been moved.</p>
    <nav>
      <a href="https://mbacompass.in/">Home</a>
      <a href="https://mbacompass.in/colleges">Colleges</a>
      <a href="https://mbacompass.in/blog">Articles</a>
      <a href="https://mbacompass.in/exams">Exams</a>
    </nav>
  </main>
</body>
</html>`;
}

Deno.serve((req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const requestedPath = url.searchParams.get("path") || url.pathname || "/";

  const headers: Record<string, string> = {
    ...corsHeaders,
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store, must-revalidate",
    "X-Robots-Tag": "noindex, follow",
  };

  if (req.method === "HEAD") {
    return new Response(null, { status: 404, headers });
  }

  return new Response(renderHtml(requestedPath), { status: 404, headers });
});
