// Push a lead to Meritto (NoPaperForms) and log the outcome.
// Called directly (client/edge/DB trigger). Idempotent by log id if provided.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MERITTO_URL = "https://bschoolbuzz.nopaperforms.io/lead/v1/leadCreation";
const SOURCE = "bschoolbuzz";

type LeadInput = {
  log_id?: string;
  source: string; // e.g. business_inquiry, contact, demo_lead, signup
  name?: string;
  email?: string;
  mobile?: string;
  state?: string;
  city?: string;
  campus?: string;
  course?: string;
  medium?: string;
  campaign?: string;
  extra?: Record<string, unknown>;
};

function sanitizeMobile(m?: string) {
  if (!m) return "";
  const digits = m.replace(/\D/g, "");
  // Meritto expects 10-digit Indian mobile in most configs
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

async function callMeritto(secret: string, lead: LeadInput) {
  const body: Record<string, unknown> = {
    name: lead.name ?? "",
    email: lead.email ?? "",
    mobile: sanitizeMobile(lead.mobile),
    source: SOURCE,
    state: lead.state ?? "",
    city: lead.city ?? "",
    campus: lead.campus ?? "",
    course: lead.course ?? "",
    medium: lead.medium ?? "website",
    campaign: lead.campaign ?? lead.source,
    ...(lead.extra ?? {}),
  };

  const res = await fetch(MERITTO_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "secret-key": secret,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json, body };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const secret = Deno.env.get("MERITTO_SECRET_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!secret) {
    return new Response(JSON.stringify({ error: "MERITTO_SECRET_KEY missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const input = (await req.json()) as LeadInput & { retry_log_id?: string };
    console.log("[meritto] incoming", { source: input.source, log_id: input.log_id, retry: !!input.retry_log_id });

    // Retry mode
    let logId = input.log_id ?? null;
    let lead: LeadInput = input;

    if (input.retry_log_id) {
      const { data } = await admin
        .from("meritto_lead_logs")
        .select("*")
        .eq("id", input.retry_log_id)
        .maybeSingle();
      if (!data) {
        return new Response(JSON.stringify({ error: "log not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      logId = data.id;
      lead = {
        source: data.source,
        name: data.name ?? undefined,
        email: data.email ?? undefined,
        mobile: data.mobile ?? undefined,
        state: data.state ?? undefined,
        city: data.city ?? undefined,
        campus: data.campus ?? undefined,
        course: data.course ?? undefined,
        medium: data.medium ?? undefined,
        campaign: data.campaign ?? undefined,
      };
    }

    // Create pending log first (or update existing)
    if (!logId) {
      const { data: created } = await admin
        .from("meritto_lead_logs")
        .insert({
          source: lead.source ?? "unknown",
          name: lead.name,
          email: lead.email,
          mobile: lead.mobile,
          state: lead.state,
          city: lead.city,
          campus: lead.campus,
          course: lead.course,
          medium: lead.medium,
          campaign: lead.campaign,
          payload: lead as unknown as Record<string, unknown>,
          status: "pending",
        })
        .select("id")
        .single();
      logId = created?.id ?? null;
    }

    const result = await callMeritto(secret, lead);
    console.log("[meritto] response", { status: result.status, ok: result.ok });

    const finalStatus = result.ok ? "success" : "failed";
    if (logId) {
      await admin
        .from("meritto_lead_logs")
        .update({
          payload: result.body as unknown as Record<string, unknown>,
          response: result.json as unknown as Record<string, unknown>,
          http_status: result.status,
          status: finalStatus,
          error: result.ok ? null : `HTTP ${result.status}`,
          retry_count: input.retry_log_id ? (undefined as any) : 0,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", logId);

      if (input.retry_log_id) {
        // increment retry
        await admin.rpc("increment_meritto_retry", { p_id: logId }).catch(() => {});
      }
    }

    return new Response(
      JSON.stringify({ ok: result.ok, status: result.status, log_id: logId, response: result.json }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[meritto] error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
