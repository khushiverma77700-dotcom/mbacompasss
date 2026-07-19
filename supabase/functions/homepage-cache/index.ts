// Homepage server-side cache.
// GET  → returns { settings: { [key]: value }, cachedAt, ttl, version } aggregated
//        from public.site_settings for a fixed allow-list of homepage keys.
//        Response is served from in-memory cache (TTL 60s) when warm.
// POST { action: "purge" } → admin-only. Clears the in-memory cache and bumps
//        the version counter so any client honoring `?v=` skips its own cache.
//
// This function deploys with verify_jwt=false by default (Lovable managed).
// Admin auth for purge is validated in-code against user_roles.
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

const TTL_MS = 60 * 1000;

interface CacheEntry {
  payload: Record<string, unknown>;
  cachedAt: number;
}

let cache: CacheEntry | null = null;
let version = 1;

async function loadFresh() {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data, error } = await admin
    .from("site_settings")
    .select("key, value")
    .in("key", HOMEPAGE_KEYS);
  if (error) throw error;
  const map: Record<string, unknown> = {};
  (data ?? []).forEach((r: any) => { map[r.key] = r.value; });
  return map;
}

async function isCallerAdmin(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization");
  if (!auth) return false;
  const supa = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData } = await supa.auth.getUser();
  const uid = userData?.user?.id;
  if (!uid) return false;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
  const { data: roles } = await admin
    .from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").limit(1);
  return !!(roles && roles.length);
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
      if (!(await isCallerAdmin(req))) {
        return new Response(JSON.stringify({ error: "Not authorized" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      cache = null;
      version += 1;
      return new Response(JSON.stringify({ ok: true, version }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET (default) — serve from cache if fresh.
    const now = Date.now();
    if (!cache || now - cache.cachedAt > TTL_MS) {
      const settings = await loadFresh();
      cache = { payload: settings, cachedAt: now };
    }

    return new Response(JSON.stringify({
      settings: cache.payload,
      cachedAt: cache.cachedAt,
      ttl: TTL_MS,
      version,
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        // Allow browser + CDN to reuse for the same TTL window.
        "Cache-Control": `public, max-age=30, s-maxage=60, stale-while-revalidate=120`,
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
