/**
 * Shared-page HTML cache for the server entry.
 *
 * Public pages render the same HTML for every visitor (sign-in state lives in
 * the browser), so a finished render can be reused instead of re-rendering on
 * every visit. A cached hit skips loading the whole server bundle, which is
 * what made first visits take 1-2 seconds.
 *
 * Layers: the edge Cache API (shared per data centre) plus a small in-memory
 * map (per server instance). Entries are keyed by build ID, so a new publish
 * never serves HTML that points at old script files.
 */

declare const __BUILD_ID__: string | undefined;

/** Fresh window: served without re-rendering. */
export const HTML_FRESH_MS = 2 * 60 * 1000;
/** After this, a stale copy is still served instantly while a background refresh runs. */
export const HTML_MAX_STALE_MS = 24 * 60 * 60 * 1000;

const PRIVATE_PREFIXES = [
  "/api", "/_serverFn", "/_server", "/lovable", "/assets",
  "/admin", "/student", "/auth", "/dashboard", "/my-listings", "/my-mba-2027",
  "/mba-application/my-applications", "/mocks/result", "/mocks/review", "/mocks/thank-you",
  "/report", "/reset-password", "/forgot-password",
];

/** Only anonymous, public page GETs are eligible. */
export function isCacheableRequest(request: Request): boolean {
  if (request.method !== "GET") return false;
  if (request.headers.has("authorization")) return false;
  if (request.headers.get("cache-control")?.includes("no-store")) return false;
  let url: URL;
  try { url = new URL(request.url); } catch { return false; }
  if (url.searchParams.has("ad_preview") || url.searchParams.has("nocache")) return false;
  const path = url.pathname;
  if (/\.[a-z0-9]{2,5}$/i.test(path)) return false; // files (sitemap.xml, robots.txt…)
  return !PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}

/** Only complete, successful, cookie-free HTML is stored. */
export function isCacheableResponse(response: Response): boolean {
  if (response.status !== 200) return false;
  if (response.headers.has("set-cookie")) return false;
  if (!(response.headers.get("content-type") || "").includes("text/html")) return false;
  const cc = response.headers.get("cache-control") || "";
  return !/private|no-store/.test(cc);
}

export function cacheKeyFor(request: Request): string {
  const url = new URL(request.url);
  const build = typeof __BUILD_ID__ !== "undefined" && __BUILD_ID__ ? __BUILD_ID__ : "dev";
  return `https://html-cache.internal/${build}/${url.host}${url.pathname}${url.search}`;
}

export type CachedEntry = { body: string; headers: [string, string][]; storedAt: number };

const memory = new Map<string, CachedEntry>();
const MEMORY_LIMIT = 60;

type EdgeCache = { match(k: string): Promise<Response | undefined>; put(k: string, r: Response): Promise<void> };
function edgeCache(): EdgeCache | null {
  try {
    const c = (globalThis as { caches?: { default?: EdgeCache } }).caches?.default;
    return c && typeof c.match === "function" ? c : null;
  } catch {
    return null;
  }
}

export async function readCached(key: string): Promise<CachedEntry | null> {
  const mem = memory.get(key);
  if (mem) return mem;
  const edge = edgeCache();
  if (!edge) return null;
  try {
    const hit = await edge.match(key);
    if (!hit) return null;
    const storedAt = Number(hit.headers.get("x-mbac-stored-at")) || 0;
    const headers = [...hit.headers.entries()].filter(([k]) => !k.startsWith("x-mbac-") && k !== "cache-control");
    const entry = { body: await hit.text(), headers, storedAt };
    remember(key, entry);
    return entry;
  } catch {
    return null;
  }
}

function remember(key: string, entry: CachedEntry) {
  memory.delete(key);
  memory.set(key, entry);
  while (memory.size > MEMORY_LIMIT) memory.delete(memory.keys().next().value as string);
}

const SKIP_HEADERS = new Set(["content-length", "content-encoding", "transfer-encoding", "set-cookie", "cache-control", "age", "date"]);

export async function storeCached(key: string, response: Response): Promise<void> {
  const body = await response.text();
  if (body.length < 1000 || !body.includes("</html>")) return; // incomplete render
  const headers = [...response.headers.entries()].filter(([k]) => !SKIP_HEADERS.has(k.toLowerCase()));
  const entry = { body, headers, storedAt: Date.now() };
  remember(key, entry);
  const edge = edgeCache();
  if (!edge) return;
  try {
    const h = new Headers(headers);
    h.set("cache-control", `public, max-age=${Math.floor(HTML_MAX_STALE_MS / 1000)}`);
    h.set("x-mbac-stored-at", String(entry.storedAt));
    await edge.put(key, new Response(body, { status: 200, headers: h }));
  } catch {
    /* edge cache unavailable — memory layer still works */
  }
}

export function cachedResponse(entry: CachedEntry, state: "fresh" | "stale"): Response {
  const h = new Headers(entry.headers);
  // Browsers always revalidate, so a new publish shows up on the next visit.
  h.set("cache-control", "no-cache, must-revalidate, max-age=0");
  h.set("x-mbac-cache", state);
  return new Response(entry.body, { status: 200, headers: h });
}

export function entryAge(entry: CachedEntry, now = Date.now()) {
  return now - entry.storedAt;
}

/** Test hook. */
export function clearMemoryCache() {
  memory.clear();
}
