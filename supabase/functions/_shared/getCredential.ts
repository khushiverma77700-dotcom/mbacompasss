// Shared credential resolver for edge functions.
// Looks up a key from the api_credentials table (admin-managed),
// falls back to Deno.env.get() if not in DB or empty.
// OpenAI is special: the secure OPENAI_API_KEY backend secret is the sole
// canonical AI credential. Database copies and legacy provider keys are never
// allowed to override it.

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

  // Legacy AI credential names are deliberately routed to the one OpenAI key
  // while older functions are migrated. This prevents Gemini, Lovable AI, or
  // a retired second OpenAI key from receiving any generation request.
  if (["OPENAI_API_KEY", "OPENAI_API_KEY_2", "GEMINI_API_KEY", "GOOGLE_AI_API_KEY"].includes(name)) {
    return resolveCredential("OPENAI_API_KEY", required, { envOnly: true });
  }


  return resolveCredential(name, required);
}

/** Safe key fingerprint for diagnostics. Never logs or returns the credential. */
export async function getOpenAiKeyFingerprint(): Promise<string> {
  const key = await getCredential("OPENAI_API_KEY", { required: false });
  if (!key) return "missing";
  const bytes = new TextEncoder().encode(key.trim());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest).slice(0, 6))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function resolveCredential(name: string, required: boolean, options?: { envOnly?: boolean }): Promise<string> {
  const now = Date.now();
  // 1. Cache hit
  const cached = cache.get(name);
  if (cached && now - cached.fetchedAt < TTL_MS) {
    if (cached.value) return cached.value;
  }

  if (options?.envOnly) {
    const envValue = Deno.env.get(name) || "";
    if (envValue) {
      cache.set(name, { value: envValue, fetchedAt: now });
      return envValue.trim();
    }
    if (required) throw new Error(`Missing credential: ${name}. Configure it in Admin → API Keys.`);
    return "";
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
      dbValue = data.key_value.trim();
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
  const value = (dbValue || envValue).trim();

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

