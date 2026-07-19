// Homepage server-side cache.
// GET  → returns { settings: { [key]: value }, cachedAt, ttl, version, versions }
//        aggregated from public.site_settings for a fixed allow-list of
//        homepage keys. Served from an in-memory per-key cache (TTL 60s).
// POST { action: "purge", keys?: string[] } → admin-only, rate-limited.
//        Without `keys` → clears everything and bumps the global version.
//        With `keys` → evicts only those keys and bumps their per-key version,
//        so unrelated homepage sections keep serving from cache.
//
// Deploys with verify_jwt=false (Lovable managed). Admin auth for purge is
// validated in-code against user_roles.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Keys aggregated for the homepage. Keep in sync with useAllSiteSettings +
// AdminTablesManager storageKey values.
const HOMEPAGE_KEYS = [
  // UI settings
  "header", "hero", "stats", "why_choose_us", "how_it_works",
  "faqs", "footer", "contact_page", "announcement",
  // Tables (managed via AdminTablesManager)
  "homepage_colleges_table", "homepage_exam_cutoffs", "homepage_roi_comparison",
  "homepage_placements_by_sector", "homepage_landscape", "homepage_journey",
  "homepage_newsroom", "homepage_free_tools", "homepage_top_cities",
  "homepage_popular_exams", "homepage_top_ranked_colleges",
];
const HOMEPAGE_KEY_SET = new Set(HOMEPAGE_KEYS);

const TTL_MS = 60 * 1000;

// Per-key cache: value + fetch time. Missing entries are loaded lazily.
interface Entry { value: unknown; cachedAt: number }
const cache = new Map<string, Entry>();
const keyVersion = new Map<string, number>();
let globalVersion = 1;

// Rate limiter: max 10 purges / 60s per admin user. In-memory sliding window.
const PURGE_WINDOW_MS = 60 * 1000;
const PURGE_MAX = 10;
const purgeHits = new Map<string, number[]>();
function rateLimit(userId: string): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const hits = (purgeHits.get(userId) ?? []).filter((t) => now - t < PURGE_WINDOW_MS);
  if (hits.length >= PURGE_MAX) {
    return { ok: false, retryAfter: Math.ceil((PURGE_WINDOW_MS - (now - hits[0])) / 1000) };
  }
  hits.push(now);
  purgeHits.set(userId, hits);
  return { ok: true, retryAfter: 0 };
}

async function loadKeys(keys: string[]): Promise<Record<string, unknown>> {
  if (!keys.length) return {};
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data, error } = await admin
    .from("site_settings").select("key, value").in("key", keys);
  if (error) throw error;
  const map: Record<string, unknown> = {};
  for (const k of keys) map[k] = null; // ensure the shape stays stable
  (data ?? []).forEach((r: any) => { map[r.key] = r.value; });
  return map;
}

async function loadAllFresh(): Promise<Record<string, unknown>> {
  const now = Date.now();
  const stale = HOMEPAGE_KEYS.filter((k) => {
    const e = cache.get(k);
    return !e || now - e.cachedAt > TTL_MS;
  });
  if (stale.length) {
    const fresh = await loadKeys(stale);
    for (const k of stale) cache.set(k, { value: fresh[k] ?? null, cachedAt: now });
  }
  const map: Record<string, unknown> = {};
  for (const k of HOMEPAGE_KEYS) map[k] = cache.get(k)?.value ?? null;
  return map;
}

async function getCallerUserId(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const supa = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const token = auth.slice(7);
  const { data, error } = await supa.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub as string;
}

async function isAdmin(userId: string): Promise<boolean> {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data } = await admin
    .from("user_roles").select("role")
    .eq("user_id", userId).eq("role", "admin").limit(1);
  return !!(data && data.length);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body?.action !== "purge") {
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Auth: must be signed-in admin.
      const userId = await getCallerUserId(req);
      if (!userId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!(await isAdmin(userId))) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Rate limit per admin.
      const rl = rateLimit(userId);
      if (!rl.ok) {
        return new Response(
          JSON.stringify({ error: "Too many purges", retryAfter: rl.retryAfter }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
              "Retry-After": String(rl.retryAfter),
            },
          },
        );
      }

      // Fine-grained purge when a keys[] is supplied. Unknown keys are dropped.
      const requested: unknown = body?.keys;
      const keys = Array.isArray(requested)
        ? (requested as unknown[])
            .filter((k): k is string => typeof k === "string")
            .filter((k) => HOMEPAGE_KEY_SET.has(k))
        : null;

      if (keys && keys.length) {
        for (const k of keys) {
          cache.delete(k);
          keyVersion.set(k, (keyVersion.get(k) ?? 0) + 1);
        }
        return new Response(
          JSON.stringify({ ok: true, purged: keys, version: globalVersion, versions: Object.fromEntries(keyVersion) }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // No keys → full purge (legacy behavior).
      cache.clear();
      globalVersion += 1;
      for (const k of HOMEPAGE_KEYS) keyVersion.set(k, (keyVersion.get(k) ?? 0) + 1);
      return new Response(
        JSON.stringify({ ok: true, purged: "all", version: globalVersion }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // GET → serve aggregate map (per-key TTL).
    const settings = await loadAllFresh();
    const oldest = Math.min(
      ...HOMEPAGE_KEYS.map((k) => cache.get(k)?.cachedAt ?? Date.now()),
    );
    return new Response(
      JSON.stringify({
        settings,
        cachedAt: oldest,
        ttl: TTL_MS,
        version: globalVersion,
        versions: Object.fromEntries(keyVersion),
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
