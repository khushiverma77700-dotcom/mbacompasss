// Push a lead to Meritto (NoPaperForms) and log the outcome.
// Called directly (client/edge/DB trigger). Idempotent by log id if provided.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const MERITTO_URL = "https://api.in4.nopaperforms.com/dataporting/7080/bschoolbuzz";
const SOURCE = "bschoolbuzz";
const COLLEGE_ID = "7080";

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
  origin_domain?: string; // e.g. bschoolbuzz.in, mbacompass.in — tracked via sub_source
  extra?: Record<string, unknown>;
};

function sanitizeMobile(m?: string) {
  if (!m) return "";
  const digits = m.replace(/\D/g, "");
  // Meritto expects 10-digit Indian mobile in most configs
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

function redact(body: Record<string, unknown>) {
  const clone: Record<string, unknown> = { ...body };
  if (typeof clone.secret_key === "string") {
    const s = clone.secret_key as string;
    clone.secret_key = s.length > 8 ? `${s.slice(0, 4)}…${s.slice(-4)}` : "***";
  }
  return clone;
}

async function callMeritto(secret: string, lead: LeadInput, cid: string) {
  // Meritto binds `source=bschoolbuzz` to the URL path — it cannot be changed.
  // To distinguish which of our domains the lead came from (bschoolbuzz /
  // bschoolbuzz.in / mbacompass.in), we tag the origin domain into multiple
  // sub-source/UTM fields so it's visible on the Meritto dashboard and CSV
  // exports without triggering "Invalid Source".
  const domain = (lead.origin_domain || "").trim().toLowerCase();
  const baseMedium = lead.medium ?? "website";
  const medium = domain ? `${baseMedium} | ${domain}` : baseMedium;
  const baseCampaign = lead.campaign ?? lead.source;
  const campaign = domain ? `${baseCampaign} | ${domain}` : baseCampaign;

  const body: Record<string, unknown> = {
    name: lead.name ?? "",
    email: lead.email ?? "",
    mobile: sanitizeMobile(lead.mobile),
    source: SOURCE,
    college_id: COLLEGE_ID,
    secret_key: secret,
    state: lead.state ?? "",
    city: lead.city ?? "",
    campus: lead.campus ?? "",
    course: lead.course ?? "",
    medium,
    campaign,
    sub_source: domain || "bschoolbuzz",
    utm_source: domain || "bschoolbuzz",
    utm_medium: baseMedium,
    utm_campaign: baseCampaign,
    lead_origin: domain || "bschoolbuzz",
    ...(lead.extra ?? {}),
  };

  const startedAt = Date.now();
  console.log(`[meritto][${cid}] → POST ${MERITTO_URL}`, {
    origin_domain: domain || null,
    lead_source: lead.source,
    payload: redact(body),
  });

  let res: Response;
  try {
    res = await fetch(MERITTO_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    console.error(`[meritto][${cid}] ✗ network error after ${durationMs}ms`, err);
    throw err;
  }

  const text = await res.text();
  const durationMs = Date.now() - startedAt;
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  const merittoStatus = (json?.status ?? "").toString().toLowerCase();
  const merittoMessage = (json?.message ?? "").toString();
  const msgLower = merittoMessage.toLowerCase();

  // Classify Meritto's business response into an outcome.
  //  - success  : lead accepted
  //  - duplicate: mobile/email already in Meritto (not an error, still logged)
  //  - invalid  : validation error (bad mobile, missing field, invalid source, etc.)
  //  - failed   : HTTP/network or unknown provider error
  let outcome: "success" | "duplicate" | "invalid" | "failed";
  if (!res.ok) {
    outcome = "failed";
  } else if (merittoStatus === "" || merittoStatus === "success" || merittoStatus === "ok") {
    outcome = "success";
  } else if (merittoStatus === "duplicate" || msgLower.includes("already registered") || msgLower.includes("duplicate")) {
    outcome = "duplicate";
  } else if (
    merittoStatus === "error" ||
    merittoStatus === "invalid" ||
    merittoStatus === "fail" ||
    merittoStatus === "failed" ||
    msgLower.includes("invalid") ||
    msgLower.includes("required") ||
    msgLower.includes("mandatory") ||
    msgLower.includes("missing")
  ) {
    outcome = "invalid";
  } else {
    outcome = "failed";
  }

  const ok = outcome === "success" || outcome === "duplicate";

  console.log(`[meritto][${cid}] ← HTTP ${res.status} in ${durationMs}ms`, {
    ok,
    outcome,
    meritto_status: json?.status ?? null,
    meritto_message: json?.message ?? null,
    response_preview: text.slice(0, 500),
  });

  return { ok, outcome, status: res.status, json, body, durationMs };
}

// Simple in-memory per-IP rate limiter: max 5 requests / 60s window.
const RL = new Map<string, { count: number; reset: number }>();
function rateLimit(ip: string, max = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const cur = RL.get(ip);
  if (!cur || cur.reset < now) {
    RL.set(ip, { count: 1, reset: now + windowMs });
    return true;
  }
  if (cur.count >= max) return false;
  cur.count++;
  return true;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (!rateLimit(ip)) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }



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

  const cid = crypto.randomUUID().slice(0, 8);

  try {
    const input = (await req.json()) as LeadInput & { retry_log_id?: string; skip_log?: boolean };
    const skipLog = !!input.skip_log;

    // Master switch (Admin → Meritto Integration). When off, nothing is sent or logged.
    const { data: switchRow } = await admin
      .from("site_settings")
      .select("value")
      .eq("key", "meritto_integration")
      .maybeSingle();
    const enabled = !!(switchRow?.value as { enabled?: boolean } | null)?.enabled;
    if (!enabled) {
      console.log(`[meritto][${cid}] skipped — integration switched off`);
      return new Response(
        JSON.stringify({
          ok: false,
          skipped: true,
          outcome: "skipped",
          reason: "Meritto integration is switched off in Admin → Meritto Integration",
          log_id: null,
          correlation_id: cid,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }


    // Basic validation (skip when retrying an existing log — those were already validated on first insert).
    if (!input.retry_log_id) {
      if (input.email && !EMAIL_RE.test(String(input.email))) {
        return new Response(JSON.stringify({ error: "Invalid email format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (input.mobile) {
        const digits = String(input.mobile).replace(/\D/g, "");
        if (digits.length < 10 || digits.length > 15) {
          return new Response(JSON.stringify({ error: "Invalid mobile number" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      if (!input.email && !input.mobile) {
        return new Response(JSON.stringify({ error: "email or mobile required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    console.log(`[meritto][${cid}] incoming`, {
      source: input.source,
      log_id: input.log_id ?? null,
      retry_log_id: input.retry_log_id ?? null,
      skip_log: skipLog,
      origin_domain: input.origin_domain ?? null,
      has_email: !!input.email,
      has_mobile: !!input.mobile,
    });

    // Ephemeral mode: push to Meritto WITHOUT persisting anything to our DB.
    if (skipLog && !input.retry_log_id) {
      const result = await callMeritto(secret, input, cid);
      console.log(`[meritto][${cid}] ephemeral done`, { ok: result.ok, outcome: result.outcome, http: result.status, ms: result.durationMs });
      return new Response(
        JSON.stringify({ ok: result.ok, outcome: result.outcome, status: result.status, log_id: null, response: result.json, correlation_id: cid, ephemeral: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let logId = input.log_id ?? null;
    let lead: LeadInput = input;

    if (input.retry_log_id) {
      const { data } = await admin
        .from("meritto_lead_logs")
        .select("*")
        .eq("id", input.retry_log_id)
        .maybeSingle();
      if (!data) {
        console.warn(`[meritto][${cid}] retry log not found`, input.retry_log_id);
        return new Response(JSON.stringify({ error: "log not found", correlation_id: cid }), {
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
      console.log(`[meritto][${cid}] created log ${logId}`);
    }

    const result = await callMeritto(secret, lead, cid);

    const finalStatus = result.outcome; // success | duplicate | invalid | failed
    const errMsg = result.outcome === "success"
      ? null
      : ((result.json as any)?.message
          ? `Meritto: ${(result.json as any).message}`
          : `HTTP ${result.status}`);

    if (logId) {
      await admin
        .from("meritto_lead_logs")
        .update({
          payload: redact(result.body) as unknown as Record<string, unknown>,
          response: result.json as unknown as Record<string, unknown>,
          http_status: result.status,
          status: finalStatus,
          error: errMsg,
          retry_count: input.retry_log_id ? (undefined as any) : 0,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", logId);

      if (input.retry_log_id) {
        await admin.rpc("increment_meritto_retry", { p_id: logId }).catch(() => {});
      }
    }

    console.log(`[meritto][${cid}] done`, { log_id: logId, status: finalStatus, http: result.status, ms: result.durationMs, error: errMsg });

    return new Response(
      JSON.stringify({ ok: result.ok, outcome: result.outcome, status: result.status, log_id: logId, response: result.json, correlation_id: cid }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(`[meritto][${cid}] error`, e);
    return new Response(JSON.stringify({ error: String(e), correlation_id: cid }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

