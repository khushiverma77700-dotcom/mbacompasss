// Cache diagnostics — probes key public routes and returns Cloudflare/edge
// cache-status headers plus TTFB timing so we can verify HTML edge caching
// is working after changing Cloudflare Cache Rules.
//
// verify_jwt is left at the project default; this is a read-only probe
// against public marketing URLs, no secrets touched.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const DEFAULT_ROUTES = [
  "/",
  "/colleges",
  "/coaching",
  "/blog",
  "/exam/cat",
];

const ORIGIN = "https://mbacompass.in";

type Probe = {
  url: string;
  ok: boolean;
  status: number;
  ttfb_ms: number | null;
  cf_cache_status: string | null;
  age: number | null;
  cache_control: string | null;
  server: string | null;
  x_cache: string | null;
  content_type: string | null;
  error?: string;
};

async function probe(url: string): Promise<Probe> {
  const started = Date.now();
  try {
    // HEAD is enough — we only care about response headers, not the body.
    // cache-busting is intentionally NOT added: we want the real cached
    // response the CDN would serve to a normal visitor.
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      headers: { "user-agent": "MBACompass-CacheDiagnostics/1.0" },
    });
    const ttfb = Date.now() - started;
    const h = res.headers;
    const ageRaw = h.get("age");
    return {
      url,
      ok: res.status >= 200 && res.status < 400,
      status: res.status,
      ttfb_ms: ttfb,
      cf_cache_status: h.get("cf-cache-status"),
      age: ageRaw ? Number(ageRaw) : null,
      cache_control: h.get("cache-control"),
      server: h.get("server"),
      x_cache: h.get("x-cache") ?? h.get("x-vercel-cache"),
      content_type: h.get("content-type"),
    };
  } catch (e) {
    return {
      url,
      ok: false,
      status: 0,
      ttfb_ms: null,
      cf_cache_status: null,
      age: null,
      cache_control: null,
      server: null,
      x_cache: null,
      content_type: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const u = new URL(req.url);
  const paramRoutes = u.searchParams.get("routes");
  const origin = u.searchParams.get("origin") ?? ORIGIN;
  const routes = paramRoutes
    ? paramRoutes.split(",").map((s) => s.trim()).filter(Boolean)
    : DEFAULT_ROUTES;

  // Two probes per route — the SECOND one is the real signal (first may
  // populate the edge cache). Sequential per URL so we measure a warm hit.
  const results: { route: string; cold: Probe; warm: Probe }[] = [];
  for (const route of routes) {
    const full = new URL(route, origin).toString();
    const cold = await probe(full);
    const warm = await probe(full);
    results.push({ route, cold, warm });
  }

  const summary = {
    hits: results.filter((r) => r.warm.cf_cache_status === "HIT").length,
    misses: results.filter((r) => r.warm.cf_cache_status !== "HIT").length,
    total: results.length,
    origin,
    generated_at: new Date().toISOString(),
  };

  return new Response(
    JSON.stringify({ summary, results }, null, 2),
    { headers: { ...CORS, "content-type": "application/json" } },
  );
});
