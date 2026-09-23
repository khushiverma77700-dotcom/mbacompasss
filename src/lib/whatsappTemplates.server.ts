// Reads the approved WhatsApp message templates from the provider and stores
// them locally so the admin panel can show a simple pick-list.
//
// The provider proxies Meta's Graph API, so the template list lives at
//   GET {base}/v3/{whatsapp_business_account_id}/message_templates
// Some API keys are only authorised for sending; in that case the provider
// answers with "Authentication Failed" and we surface that verbatim.

import type { SupabaseClient } from "@supabase/supabase-js";
import { loadWhatsAppConfig } from "./whatsappSender.server";

type Client = SupabaseClient<any, any, any>;

type ProviderComponent = {
  type?: string;
  format?: string;
  text?: string;
  buttons?: unknown;
};

type ProviderTemplate = {
  id?: string;
  name?: string;
  language?: string;
  status?: string;
  category?: string;
  components?: ProviderComponent[];
};

export type SyncResult = {
  synced: number;
  error: string | null;
};

function countVariables(text: string): number {
  const found = new Set<string>();
  for (const match of text.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) {
    found.add(match[1] ?? "");
  }
  return found.size;
}

function pickComponent(components: ProviderComponent[], type: string): ProviderComponent | null {
  return components.find((c) => (c.type ?? "").toUpperCase() === type) ?? null;
}

/**
 * Pull the template list and upsert it into public.whatsapp_templates.
 * `businessAccountId` is optional — when omitted the phone number id is tried,
 * which works on some provider setups.
 */
export async function syncWhatsAppTemplates(
  supabase: Client,
  businessAccountId?: string | null,
): Promise<SyncResult> {
  const config = await loadWhatsAppConfig(supabase);
  if (!config) return { synced: 0, error: "WhatsApp API keys are not saved yet." };

  const candidates = [businessAccountId?.trim(), process.env["SMARTPING_WABA_ID"], config.phoneNumberId]
    .filter((v): v is string => Boolean(v && v.trim()))
    .filter((v, i, arr) => arr.indexOf(v) === i);

  let lastError = "No account id available to read templates.";

  for (const id of candidates) {
    let response: Response;
    try {
      response = await fetch(`${config.baseUrl}/v3/${id}/message_templates?limit=200`, {
        method: "GET",
        headers: { apikey: config.apiKey, Accept: "application/json" },
      });
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Could not reach the WhatsApp provider.";
      continue;
    }

    const body = await response.text();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(body);
    } catch {
      /* keep raw body for the error message */
    }
    const list = (parsed as { data?: ProviderTemplate[] } | null)?.data;

    if (!response.ok || !Array.isArray(list)) {
      lastError = `Provider refused the template list [${response.status}]: ${body.slice(0, 400)}`;
      continue;
    }

    const rows = list
      .filter((t) => (t.name ?? "").trim().length > 0)
      .map((t) => {
        const components = Array.isArray(t.components) ? t.components : [];
        const bodyComponent = pickComponent(components, "BODY");
        const headerComponent = pickComponent(components, "HEADER");
        const footerComponent = pickComponent(components, "FOOTER");
        const bodyText = bodyComponent?.text ?? "";
        return {
          name: (t.name ?? "").trim(),
          language: (t.language ?? "en").trim(),
          category: t.category ?? null,
          status: (t.status ?? "APPROVED").toUpperCase(),
          body_text: bodyText || null,
          header_text: headerComponent?.text ?? null,
          footer_text: footerComponent?.text ?? null,
          variable_count: countVariables(bodyText),
          components: components as unknown,
          source: "provider",
          provider_id: t.id ?? null,
          synced_at: new Date().toISOString(),
        };
      });

    if (rows.length > 0) {
      const { error } = await supabase
        .from("whatsapp_templates")
        .upsert(rows, { onConflict: "name,language" });
      if (error) return { synced: 0, error: error.message };
    }
    return { synced: rows.length, error: null };
  }

  return { synced: 0, error: lastError };
}
