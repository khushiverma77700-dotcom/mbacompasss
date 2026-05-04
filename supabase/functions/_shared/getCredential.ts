// Shared credential resolver for edge functions.
// Looks up a key from the api_credentials table (admin-managed),
// falls back to Deno.env.get() if not in DB or empty.
// In-memory cache with 60s TTL to keep DB load low.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

type CacheEntry = { value: string; fetchedAt: number };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60 * 1000;

let serviceClient: ReturnType<typeof createClient> | null = null;
function getServiceClient() {
  if (serviceClient) return serviceClient;
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  serviceClient = createClient(url, key, { auth: { persistSession: false } });
  return serviceClient;
}

/**
 * Resolve a credential by name.
 * Resolution order: cache → api_credentials table → Deno.env → throw if required.
 */
export async function getCredential(name: string, opts?: { required?: boolean }): Promise<string> {
  const required = opts?.required ?? true;
  const now = Date.now();

  // 1. Cache hit
  const cached = cache.get(name);
  if (cached && now - cached.fetchedAt < TTL_MS) {
    if (cached.value) return cached.value;
  }

  // 2. DB lookup
  let dbValue = "";
  try {
    const sb = getServiceClient();
    const { data } = await sb
      .from("api_credentials")
      .select("key_value, is_active")
      .eq("key_name", name)
      .maybeSingle();
    if (data?.is_active && typeof data.key_value === "string" && data.key_value.length > 0) {
      dbValue = data.key_value;
      // best-effort touch last_used_at
      sb.from("api_credentials")
        .update({ last_used_at: new Date().toISOString() })
        .eq("key_name", name)
        .then(() => {})
        .catch(() => {});
    }
  } catch (_) {
    // Ignore DB errors and fall through to env
  }

  // 3. Env fallback
  const envValue = Deno.env.get(name) || "";
  const value = dbValue || envValue;

  cache.set(name, { value, fetchedAt: now });

  if (!value && required) {
    throw new Error(`Missing credential: ${name}. Configure it in Admin → API Keys.`);
  }
  return value;
}

/** Clear the in-memory cache (called by flush-credentials-cache function). */
export function flushCredentialCache() {
  cache.clear();
}
