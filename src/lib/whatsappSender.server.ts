// WhatsApp Automation sending engine (server only).
//
// Messages go out through the SmartPing (pinbot.ai) WhatsApp Business partner
// API, which mirrors Meta's Cloud API payload shape:
//   POST {base}/v3/{phone_number_id}/messages   header: apikey: <WABA api key>
//
// Credentials are read from the server environment first and fall back to the
// admin "API Keys & Secrets" table so the panel stays the single place to
// manage them.

import type { SupabaseClient } from "@supabase/supabase-js";

export const MAX_ATTEMPTS = 3;
// Hard cap per dispatch run so a single invocation stays well inside the
// serverless time budget and provider rate limits.
export const RUN_BATCH_CAP = 40;
const SEND_DELAY_MS = 350;

export type WhatsAppConfig = {
  apiKey: string;
  phoneNumberId: string;
  baseUrl: string;
};

type Client = SupabaseClient<any, any, any>;

type CredentialRow = { key_name: string; key_value: string | null };

export async function loadWhatsAppConfig(supabase: Client): Promise<WhatsAppConfig | null> {
  let apiKey = process.env["SMARTPING_API_KEY"] ?? process.env["WHATSAPP_API_KEY"] ?? "";
  let phoneNumberId = process.env["SMARTPING_PHONE_NUMBER_ID"] ?? "";
  let baseUrl = process.env["SMARTPING_API_URL"] ?? "https://partnersv1.pinbot.ai";

  if (!apiKey || !phoneNumberId) {
    const { data } = await supabase
      .from("api_credentials")
      .select("key_name, key_value")
      .in("key_name", ["SMARTPING_API_KEY", "SMARTPING_PHONE_NUMBER_ID", "SMARTPING_API_URL"]);
    for (const row of (data ?? []) as CredentialRow[]) {
      const value = (row.key_value ?? "").trim();
      if (!value) continue;
      if (row.key_name === "SMARTPING_API_KEY" && !apiKey) apiKey = value;
      if (row.key_name === "SMARTPING_PHONE_NUMBER_ID" && !phoneNumberId) phoneNumberId = value;
      if (row.key_name === "SMARTPING_API_URL") baseUrl = value;
    }
  }

  if (!apiKey || !phoneNumberId) return null;
  return { apiKey, phoneNumberId, baseUrl: baseUrl.replace(/\/+$/, "") };
}

export function normalisePhone(raw: string): string | null {
  const digits = (raw ?? "").replace(/\D+/g, "").replace(/^0+/, "");
  if (digits.length < 10 || digits.length > 15) return null;
  // Indian 10-digit numbers get the country code so WhatsApp can resolve them.
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

type Recipient = {
  id: string;
  phone: string;
  name: string | null;
  variables: Record<string, unknown> | null;
  attempts: number;
  status: string;
};

type Campaign = {
  id: string;
  name: string;
  message_type: string;
  template_name: string | null;
  template_language: string;
  template_params: unknown;
  message_body: string | null;
  daily_limit: number;
  start_date: string;
  total_target: number | null;
  status: string;
};

function resolveToken(token: string, recipient: Recipient): string {
  return token.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_all, key: string) => {
    if (key === "name") return recipient.name ?? "";
    if (key === "phone") return recipient.phone;
    const vars = recipient.variables ?? {};
    const value = (vars as Record<string, unknown>)[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

function buildPayload(campaign: Campaign, recipient: Recipient): Record<string, unknown> {
  if (campaign.message_type === "template") {
    const rawParams = Array.isArray(campaign.template_params) ? campaign.template_params : [];
    const parameters = rawParams
      .map((p) => (typeof p === "string" ? resolveToken(p, recipient) : ""))
      .map((text) => ({ type: "text", text: text || " " }));
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipient.phone,
      type: "template",
      template: {
        name: campaign.template_name ?? "",
        language: { code: campaign.template_language || "en" },
        ...(parameters.length > 0
          ? { components: [{ type: "body", parameters }] }
          : {}),
      },
    };
  }
  return {
    messaging_product: "whatsapp",
    preview_url: false,
    recipient_type: "individual",
    to: recipient.phone,
    type: "text",
    text: { body: resolveToken(campaign.message_body ?? "", recipient) },
  };
}

type SendOutcome =
  | { ok: true; messageId: string | null; response: unknown }
  | { ok: false; retryable: boolean; code: string; message: string; response: unknown };

async function sendOne(
  config: WhatsAppConfig,
  campaign: Campaign,
  recipient: Recipient,
): Promise<SendOutcome> {
  const url = `${config.baseUrl}/v3/${config.phoneNumberId}/messages`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: config.apiKey },
      body: JSON.stringify(buildPayload(campaign, recipient)),
    });
  } catch (e) {
    return {
      ok: false,
      retryable: true,
      code: "network_error",
      message: e instanceof Error ? e.message : "Network error",
      response: null,
    };
  }

  const text = await res.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text.slice(0, 1000) };
  }

  if (!res.ok) {
    const body = parsed as { error?: { code?: unknown; message?: unknown } } | null;
    const code = body?.error?.code !== undefined ? String(body.error.code) : String(res.status);
    const message =
      typeof body?.error?.message === "string"
        ? body.error.message
        : text.slice(0, 500) || `HTTP ${res.status}`;
    // 429 / 5xx are provider-side throttling or outages: pause, do not burn an attempt.
    const retryable = res.status === 429 || res.status >= 500;
    return { ok: false, retryable, code, message, response: parsed };
  }

  const body = parsed as { messages?: Array<{ id?: string }> } | null;
  const messageId = body?.messages?.[0]?.id ?? null;
  return { ok: true, messageId, response: parsed };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type CampaignRunResult = {
  campaignId: string;
  campaignName: string;
  attempted: number;
  sent: number;
  failed: number;
  throttled: boolean;
  completed: boolean;
  skippedReason?: string;
};

export type DispatchResult = {
  ranAt: string;
  campaigns: CampaignRunResult[];
  error?: string;
};

/**
 * Processes every running campaign: retry queue first, then fresh numbers,
 * never exceeding the campaign's daily limit or the remaining total target.
 * Safe to call repeatedly — it always resumes where it stopped.
 */
export async function dispatchWhatsAppQueue(
  supabase: Client,
  options: { campaignId?: string; maxPerCampaign?: number } = {},
): Promise<DispatchResult> {
  const ranAt = new Date().toISOString();
  const config = await loadWhatsAppConfig(supabase);
  if (!config) {
    return {
      ranAt,
      campaigns: [],
      error:
        "WhatsApp API credentials are missing. Add SMARTPING_API_KEY and SMARTPING_PHONE_NUMBER_ID in API Keys & Secrets.",
    };
  }

  const today = new Date().toISOString().slice(0, 10);
  let campaignQuery = supabase
    .from("whatsapp_campaigns")
    .select(
      "id, name, message_type, template_name, template_language, template_params, message_body, daily_limit, start_date, total_target, status",
    )
    .eq("status", "running")
    .lte("start_date", today)
    .order("created_at", { ascending: true })
    .limit(20);
  if (options.campaignId) campaignQuery = campaignQuery.eq("id", options.campaignId);

  const { data: campaignRows, error: campaignError } = await campaignQuery;
  if (campaignError) return { ranAt, campaigns: [], error: campaignError.message };

  const results: CampaignRunResult[] = [];

  for (const campaign of (campaignRows ?? []) as Campaign[]) {
    const result: CampaignRunResult = {
      campaignId: campaign.id,
      campaignName: campaign.name,
      attempted: 0,
      sent: 0,
      failed: 0,
      throttled: false,
      completed: false,
    };

    const { data: statsRow } = await supabase
      .from("whatsapp_daily_stats")
      .select("processed_count")
      .eq("campaign_id", campaign.id)
      .eq("send_date", today)
      .maybeSingle();
    const processedToday = (statsRow?.processed_count as number | undefined) ?? 0;
    let budget = Math.max(campaign.daily_limit - processedToday, 0);

    if (campaign.total_target && campaign.total_target > 0) {
      const { count } = await supabase
        .from("whatsapp_recipients")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign.id)
        .in("status", ["sent", "max_retry_failed"]);
      const remainingTarget = campaign.total_target - (count ?? 0);
      budget = Math.min(budget, Math.max(remainingTarget, 0));
    }

    budget = Math.min(budget, options.maxPerCampaign ?? RUN_BATCH_CAP);

    if (budget <= 0) {
      result.skippedReason = "Daily limit already reached";
      results.push(result);
      continue;
    }

    // Retry queue first, then new numbers.
    const { data: retryRows } = await supabase
      .from("whatsapp_recipients")
      .select("id, phone, name, variables, attempts, status")
      .eq("campaign_id", campaign.id)
      .eq("status", "retry")
      .lt("attempts", MAX_ATTEMPTS)
      .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
      .order("next_retry_at", { ascending: true, nullsFirst: true })
      .limit(budget);

    const queue = [...((retryRows ?? []) as Recipient[])];
    if (queue.length < budget) {
      const { data: pendingRows } = await supabase
        .from("whatsapp_recipients")
        .select("id, phone, name, variables, attempts, status")
        .eq("campaign_id", campaign.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(budget - queue.length);
      queue.push(...((pendingRows ?? []) as Recipient[]));
    }

    for (const recipient of queue) {
      result.attempted += 1;
      const attempt = recipient.attempts + 1;
      const outcome = await sendOne(config, campaign, recipient);
      const nowIso = new Date().toISOString();

      if (outcome.ok) {
        result.sent += 1;
        await supabase
          .from("whatsapp_recipients")
          .update({
            status: "sent",
            attempts: attempt,
            last_attempt_at: nowIso,
            sent_at: nowIso,
            next_retry_at: null,
            last_error: null,
            last_error_code: null,
            provider_message_id: outcome.messageId,
          })
          .eq("id", recipient.id);
        await supabase.from("whatsapp_send_logs").insert({
          campaign_id: campaign.id,
          recipient_id: recipient.id,
          phone: recipient.phone,
          attempt,
          status: "sent",
          provider_message_id: outcome.messageId,
          response: outcome.response ?? null,
        });
        await sleep(SEND_DELAY_MS);
        continue;
      }

      if (outcome.retryable) {
        // Provider throttled or is down: reschedule without consuming an attempt
        // and stop this campaign's run so we respect the rate limit.
        const nextRetry = new Date(Date.now() + 20 * 60 * 1000).toISOString();
        result.throttled = true;
        result.attempted -= 1;
        await supabase
          .from("whatsapp_recipients")
          .update({
            status: "retry",
            next_retry_at: nextRetry,
            last_attempt_at: nowIso,
            last_error: outcome.message.slice(0, 500),
            last_error_code: outcome.code,
          })
          .eq("id", recipient.id);
        await supabase.from("whatsapp_send_logs").insert({
          campaign_id: campaign.id,
          recipient_id: recipient.id,
          phone: recipient.phone,
          attempt,
          status: "failed",
          error_code: outcome.code,
          error_message: `Rate limited / provider unavailable: ${outcome.message}`.slice(0, 500),
          next_retry_at: nextRetry,
          response: outcome.response ?? null,
        });
        break;
      }

      result.failed += 1;
      const exhausted = attempt >= MAX_ATTEMPTS;
      const nextRetry = exhausted
        ? null
        : new Date(Date.now() + attempt * 30 * 60 * 1000).toISOString();
      await supabase
        .from("whatsapp_recipients")
        .update({
          status: exhausted ? "max_retry_failed" : "retry",
          attempts: attempt,
          last_attempt_at: nowIso,
          next_retry_at: nextRetry,
          last_error: outcome.message.slice(0, 500),
          last_error_code: outcome.code,
        })
        .eq("id", recipient.id);
      await supabase.from("whatsapp_send_logs").insert({
        campaign_id: campaign.id,
        recipient_id: recipient.id,
        phone: recipient.phone,
        attempt,
        status: "failed",
        error_code: outcome.code,
        error_message: exhausted
          ? `Failed - max retries reached: ${outcome.message}`.slice(0, 500)
          : outcome.message.slice(0, 500),
        next_retry_at: nextRetry,
        response: outcome.response ?? null,
      });
      await sleep(SEND_DELAY_MS);
    }

    if (result.sent > 0 || result.failed > 0) {
      await supabase.rpc("whatsapp_bump_daily", {
        p_campaign: campaign.id,
        p_date: today,
        p_sent: result.sent,
        p_failed: result.failed,
      });
    }

    // Nothing left that can still be sent -> campaign is finished.
    const { count: openCount } = await supabase
      .from("whatsapp_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .in("status", ["pending", "retry", "sending"]);
    result.completed = (openCount ?? 0) === 0;

    await supabase
      .from("whatsapp_campaigns")
      .update({
        last_run_at: new Date().toISOString(),
        ...(result.completed ? { status: "completed" } : {}),
      })
      .eq("id", campaign.id);

    results.push(result);
  }

  return { ranAt, campaigns: results };
}
