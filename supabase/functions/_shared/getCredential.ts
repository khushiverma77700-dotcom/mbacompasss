// Shared credential resolver for edge functions.
// Looks up a key from the api_credentials table (admin-managed),
// falls back to Deno.env.get() if not in DB or empty.
// OpenAI is special: secure backend secrets win over DB values so a freshly
// rotated key takes effect even if Admin → API Keys still contains an older key.
// Credential values are cached, but the active OpenAI slot is intentionally
// read for every generation so an admin switch applies across warm workers.

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

  // POLICY: the only AI credentials allowed anywhere in the app are the two
  // OpenAI keys managed in Admin → API Keys & Secrets → OpenAI API Switcher
  // (slot 1 = Suyash, slot 2 = Vaibhav). Legacy provider names are aliased to
  // the active OpenAI slot so no stale Gemini/other key can ever be used.
  if (name === "OPENAI_API_KEY" || name === "GEMINI_API_KEY" || name === "GOOGLE_AI_API_KEY") {
    const slot = await getOpenAiActiveSlot();
    const effective = slot === 2 ? "OPENAI_API_KEY_2" : "OPENAI_API_KEY";
    return resolveCredential(effective, required, { preferEnv: true });
  }

  if (name === "OPENAI_API_KEY_2") {
    return resolveCredential(name, required, { preferEnv: true });
  }


  return resolveCredential(name, required);
}

/** Resolve a specific OpenAI slot key (1 = Suyash, 2 = Vaibhav), ignoring the active-slot toggle. */
export async function getOpenAiKeyForSlot(slot: 1 | 2): Promise<string> {
  const name = slot === 2 ? "OPENAI_API_KEY_2" : "OPENAI_API_KEY";
  try {
    return await resolveCredential(name, false, { preferEnv: true });
  } catch {
    return "";
  }
}

/** Return the currently selected OpenAI slot. Do not cache this setting. */
export async function getOpenAiActiveSlot(): Promise<1 | 2> {
  try {
    const sb = getServiceClient();
    const { data, error } = await sb
      .from("site_settings")
      .select("value")
      .eq("key", "openai_active_slot")
      .maybeSingle();
    if (error) console.warn("[credentials] Could not read active OpenAI slot:", error.message);
    const value = (data?.value as { slot?: number | string } | null)?.slot;
    return value === 2 || value === "2" ? 2 : 1;
  } catch (error) {
    console.warn("[credentials] Active OpenAI slot lookup failed; using slot 1:", error instanceof Error ? error.message : error);
    return 1;
  }
}

async function resolveCredential(name: string, required: boolean, options?: { preferEnv?: boolean }): Promise<string> {
  const now = Date.now();
  // 1. Cache hit
  const cached = cache.get(name);
  if (cached && now - cached.fetchedAt < TTL_MS) {
    if (cached.value) return cached.value;
  }

  if (options?.preferEnv) {
    const envValue = Deno.env.get(name) || "";
    if (envValue) {
      cache.set(name, { value: envValue, fetchedAt: now });
      return envValue;
    }
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
  const envValue = options?.preferEnv ? "" : Deno.env.get(name) || "";
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

