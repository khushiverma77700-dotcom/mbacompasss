// System Check — realistically probes every external API, AI provider,
// database surface, public endpoint and content-generation function the
// website depends on, then stores the result so admins get a day-by-day
// failure history.
//
// POST /functions/v1/system-check          (admin session)      → runs everything
// POST { cron: true, token: "<cron_token>" } (pg_cron daily run) → runs everything
//
// Nothing destructive: every probe is a read, a token exchange, a tiny AI
// completion, or a deliberately-invalid request used only to prove the
// function is deployed and answering.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4?target=denonext";
import { getCredential, getOpenAiSlotKeys } from "../_shared/getCredential.ts";
import { firecrawlScrape } from "../_shared/firecrawlGateway.ts";
import { requireAdmin } from "../_shared/requireAdmin.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FUNCTIONS_BASE = `${SUPABASE_URL}/functions/v1`;
const SITE = "https://mbacompass.in";

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

type Status = "pass" | "warn" | "fail" | "skip";

interface Outcome {
  status: Status;
  message: string;
  httpStatus?: number;
  detail?: Record<string, unknown>;
  fixHint?: string;
}

interface Check {
  key: string;
  section: string;
  name: string;
  category: string;
  provider?: string;
  target?: string;
  usedIn: string[];
  /** Shown when the check fails and no runtime-specific hint is produced. */
  fixHint?: string;
  run: () => Promise<Outcome>;
}

const PER_CHECK_TIMEOUT_MS = 20_000;

async function timed<T>(fn: (signal: AbortSignal) => Promise<T>, ms = PER_CHECK_TIMEOUT_MS) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    return await fn(ac.signal);
  } finally {
    clearTimeout(t);
  }
}

function errText(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

/** Probe a deployed edge function without doing real work: we send a request
 *  we expect to be rejected by validation/auth. Anything other than a network
 *  error or a 5xx means the function is deployed and answering. */
async function probeFunction(name: string, body: unknown = {}): Promise<Outcome> {
  const start = Date.now();
  try {
    const resp = await timed((signal) =>
      fetch(`${FUNCTIONS_BASE}/${name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      }),
    );
    const text = (await resp.text().catch(() => "")).slice(0, 400);
    const ms = Date.now() - start;
    if (resp.status >= 500) {
      return {
        status: "fail",
        httpStatus: resp.status,
        message: `${name} returned ${resp.status}: ${text || "no body"}`,
        detail: { latency_ms: ms, body: text },
        fixHint: `Open the ${name} function logs in the backend and fix the server error it throws on a minimal request.`,
      };
    }
    return {
      status: "pass",
      httpStatus: resp.status,
      message: `Deployed and answering (HTTP ${resp.status} on a validation probe)`,
      detail: { latency_ms: ms, body: text.slice(0, 200) },
    };
  } catch (e) {
    return {
      status: "fail",
      message: `${name} unreachable: ${errText(e)}`,
      fixHint: `The function is not deployed or is timing out. Redeploy ${name}.`,
    };
  }
}

async function probeUrl(
  url: string,
  opts: { expectContains?: string; minBytes?: number; method?: string } = {},
): Promise<Outcome> {
  const start = Date.now();
  try {
    const resp = await timed((signal) => fetch(url, { method: opts.method || "GET", signal }));
    const text = await resp.text().catch(() => "");
    const ms = Date.now() - start;
    if (!resp.ok) {
      return {
        status: "fail",
        httpStatus: resp.status,
        message: `HTTP ${resp.status} from ${url}`,
        detail: { latency_ms: ms, body: text.slice(0, 300) },
      };
    }
    if (opts.minBytes && text.length < opts.minBytes) {
      return {
        status: "warn",
        httpStatus: resp.status,
        message: `Responded but body is unusually small (${text.length} bytes)`,
        detail: { latency_ms: ms, bytes: text.length },
      };
    }
    if (opts.expectContains && !text.includes(opts.expectContains)) {
      return {
        status: "warn",
        httpStatus: resp.status,
        message: `Responded but "${opts.expectContains}" was missing from the output`,
        detail: { latency_ms: ms, bytes: text.length },
      };
    }
    return {
      status: "pass",
      httpStatus: resp.status,
      message: `OK — ${text.length} bytes in ${ms} ms`,
      detail: { latency_ms: ms, bytes: text.length },
    };
  } catch (e) {
    return { status: "fail", message: `Request failed: ${errText(e)}` };
  }
}

/** Real (tiny) chat completion against one of the two allowed OpenAI keys. */
async function openAiProbe(slot: { secret_name: string; label: string; key: string }): Promise<Outcome> {
  if (!slot.key) {
    return {
      status: "fail",
      message: `${slot.label} key (${slot.secret_name}) is not configured`,
      fixHint: `Add the ${slot.secret_name} secret in Admin → API Keys & Secrets.`,
    };
  }
  const start = Date.now();
  try {
    const resp = await timed((signal) =>
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${slot.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Reply with the single word: ok" }],
          max_tokens: 5,
        }),
        signal,
      }),
    );
    const ms = Date.now() - start;
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = data?.error?.message || `HTTP ${resp.status}`;
      const code = data?.error?.code || data?.error?.type || "";
      return {
        status: "fail",
        httpStatus: resp.status,
        message: `${slot.label}: ${msg}`,
        detail: { latency_ms: ms, code },
        fixHint:
          resp.status === 401
            ? `The ${slot.secret_name} token is invalid or revoked — replace it in Admin → API Keys & Secrets.`
            : resp.status === 429
              ? `Rate limited or out of quota on the ${slot.label} account — top up billing or slow bulk jobs down.`
              : `Check the ${slot.label} OpenAI account status.`,
      };
    }
    const out = data?.choices?.[0]?.message?.content ?? "";
    return {
      status: "pass",
      httpStatus: 200,
      message: `${slot.label} key works — replied "${String(out).trim().slice(0, 20)}" in ${ms} ms`,
      detail: { latency_ms: ms, tokens: data?.usage?.total_tokens ?? null },
    };
  } catch (e) {
    return { status: "fail", message: `${slot.label}: ${errText(e)}` };
  }
}

async function googleAccessToken(scope: string): Promise<{ token?: string; error?: string }> {
  const raw = (await getCredential("GOOGLE_INDEXING_SERVICE_ACCOUNT", { required: false })) || "";
  let client_email = "";
  let private_key = "";
  let token_uri = "https://oauth2.googleapis.com/token";
  if (raw.trim()) {
    try {
      const j = JSON.parse(raw);
      client_email = j.client_email;
      private_key = j.private_key;
      token_uri = j.token_uri || token_uri;
    } catch (_) { /* fall through to split secrets */ }
  }
  if (!client_email || !private_key) {
    client_email = await getCredential("GOOGLE_INDEXING_CLIENT_EMAIL", { required: false });
    private_key = await getCredential("GOOGLE_INDEXING_PRIVATE_KEY", { required: false });
  }
  if (!client_email || !private_key) return { error: "Service account credentials are not configured" };

  try {
    const now = Math.floor(Date.now() / 1000);
    const enc = (obj: unknown) =>
      btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const signingInput = `${enc({ alg: "RS256", typ: "JWT" })}.${
      enc({ iss: client_email, scope, aud: token_uri, iat: now, exp: now + 3600 })
    }`;
    let pem = private_key
      .replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r/g, "\n")
      .replace(/^["']|["']$/g, "")
      .replace(/-----BEGIN [A-Z ]+-----/g, "").replace(/-----END [A-Z ]+-----/g, "")
      .replace(/\s+/g, "").replace(/[^A-Za-z0-9+/=]/g, "");
    while (pem.length % 4 !== 0) pem += "=";
    const bin = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      "pkcs8", bin, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"],
    );
    const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput));
    const sigStr = btoa(String.fromCharCode(...new Uint8Array(sig)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const resp = await timed((signal) =>
      fetch(token_uri, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: `${signingInput}.${sigStr}`,
        }).toString(),
        signal,
      })
    );
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.access_token) {
      return { error: `Token exchange failed (HTTP ${resp.status}): ${JSON.stringify(data).slice(0, 200)}` };
    }
    return { token: data.access_token as string };
  } catch (e) {
    return { error: errText(e) };
  }
}

async function tableCount(table: string): Promise<{ count: number | null; error?: string }> {
  const { count, error } = await sb.from(table).select("*", { count: "exact", head: true });
  return { count: count ?? null, error: error?.message };
}

// ---------------------------------------------------------------------------
// The check registry — this is also the "where is each service used" map that
// the dashboard renders section by section.
// ---------------------------------------------------------------------------
function buildChecks(): Check[] {
  const slots = getOpenAiSlotKeys();

  const checks: Check[] = [];

  // ---------------- AI providers ----------------
  for (const slot of slots) {
    checks.push({
      key: `ai.openai.${slot.secret_name.toLowerCase()}`,
      section: "AI Providers",
      name: `OpenAI key — ${slot.label} (${slot.secret_name})`,
      category: "ai",
      provider: "OpenAI",
      target: "https://api.openai.com/v1/chat/completions",
      usedIn: [
        "All AI writers (college, exam, institute, course, blog)",
        "SEO engine: ai-seo-enhance, seo-reoptimize-worker, auto-seo-engine",
        "Mock generation: generate-mock-questions, personalized-questions-generate",
        "Student tools: profile-analyzer, sop-review, vocab, student-ai-insights",
      ],
      run: () => openAiProbe(slot),
    });
  }

  checks.push({
    key: "ai.shared-gateway",
    section: "AI Providers",
    name: "Shared AI gateway path (failover Vaibhav → Suyash)",
    category: "ai",
    provider: "OpenAI",
    target: "_shared/aiGateway.ts",
    usedIn: ["Every edge function that calls callAIGateway()"],
    fixHint: "If both OpenAI keys fail above, all AI content generation is down until a valid key is set.",
    run: async () => {
      const working = [];
      for (const slot of slots) {
        if (!slot.key) continue;
        const r = await openAiProbe(slot);
        if (r.status === "pass") working.push(slot.label);
      }
      if (working.length === 0) {
        return {
          status: "fail",
          message: "No working AI key — every AI feature on the site will fail",
          fixHint: "Replace OPENAI_API_KEY (Vaibhav) and/or OPENAI_API_KEY_2 (Suyash) in Admin → API Keys & Secrets.",
        };
      }
      if (working.length < slots.length) {
        return {
          status: "warn",
          message: `Only ${working.join(", ")} is usable — no failover key left`,
          fixHint: "Restore the second OpenAI key so bulk jobs keep running when one account rate-limits.",
        };
      }
      return { status: "pass", message: `Both keys usable (${working.join(", ")}) — failover healthy` };
    },
  });

  checks.push({
    key: "ai.lovable-gateway",
    section: "AI Providers",
    name: "Lovable AI Gateway (LOVABLE_API_KEY)",
    category: "ai",
    provider: "Lovable AI",
    target: "https://ai.gateway.lovable.dev/v1/chat/completions",
    usedIn: ["Firecrawl connector gateway auth", "gsc-index-check", "deep-seo-audit", "pruning-signals"],
    run: async () => {
      const key = Deno.env.get("LOVABLE_API_KEY") || "";
      if (!key) {
        return {
          status: "warn",
          message: "LOVABLE_API_KEY not set — connector-gateway calls (Firecrawl) will fail",
          fixHint: "Reconnect the workspace connectors so LOVABLE_API_KEY is provisioned.",
        };
      }
      return { status: "pass", message: "Gateway key present" };
    },
  });

  // ---------------- Research / crawling ----------------
  checks.push({
    key: "api.firecrawl",
    section: "Research & Crawling",
    name: "Firecrawl (official-source research)",
    category: "api",
    provider: "Firecrawl",
    target: "connector-gateway.lovable.dev/firecrawl",
    usedIn: [
      "ai-exam-writer (exam facts, fees, dates)",
      "exam-backfill-worker (gap fill)",
      "ai-college-writer / ai-institute-writer",
      "SEO keyword research + competitor crawl",
    ],
    fixHint: "Reconnect Firecrawl in Connectors, or check the Firecrawl account quota.",
    run: async () => {
      const start = Date.now();
      try {
        const res = await firecrawlScrape("https://example.com", ["markdown"]);
        const md = res?.markdown || res?.data?.markdown || "";
        const ms = Date.now() - start;
        if (!md) {
          return {
            status: "warn",
            message: `Firecrawl answered in ${ms} ms but returned no content`,
            detail: { latency_ms: ms },
          };
        }
        return { status: "pass", message: `Scraped a live page in ${ms} ms`, detail: { latency_ms: ms, chars: md.length } };
      } catch (e) {
        return { status: "fail", message: `Firecrawl failed: ${errText(e)}` };
      }
    },
  });

  checks.push({
    key: "api.pagespeed",
    section: "Research & Crawling",
    name: "Google PageSpeed Insights",
    category: "api",
    provider: "Google",
    target: "https://www.googleapis.com/pagespeedonline/v5",
    usedIn: ["speed-optimizer (daily 6:20 UTC cron)", "Admin → Speed / Image SEO reports"],
    run: async () => {
      const key = await getCredential("GOOGLE_PSI_API_KEY", { required: false });
      if (!key) {
        return {
          status: "warn",
          message: "GOOGLE_PSI_API_KEY not configured — speed reports fall back to unauthenticated quota",
          fixHint: "Add GOOGLE_PSI_API_KEY in Admin → API Keys & Secrets.",
        };
      }
      const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(SITE)}&strategy=mobile&category=performance&key=${encodeURIComponent(key)}`;
      const start = Date.now();
      try {
        const resp = await timed((signal) => fetch(url, { signal }), 25_000);
        const ms = Date.now() - start;
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          return {
            status: "fail",
            httpStatus: resp.status,
            message: data?.error?.message || `HTTP ${resp.status}`,
            fixHint: "Verify the PSI API key and that the PageSpeed Insights API is enabled for the project.",
          };
        }
        const score = data?.lighthouseResult?.categories?.performance?.score;
        return {
          status: "pass",
          httpStatus: 200,
          message: `Live audit returned mobile performance ${score != null ? Math.round(score * 100) : "n/a"} in ${ms} ms`,
          detail: { latency_ms: ms, performance: score },
        };
      } catch (e) {
        return { status: "fail", message: `PSI request failed: ${errText(e)}` };
      }
    },
  });

  // ---------------- Payments ----------------
  checks.push({
    key: "api.razorpay",
    section: "Payments",
    name: "Razorpay API credentials",
    category: "payment",
    provider: "Razorpay",
    target: "https://api.razorpay.com/v1/payments",
    usedIn: [
      "razorpay-create-order / razorpay-verify-payment (mock + course checkout)",
      "bundle-create-order / bundle-verify-payment",
      "create-mock-checkout (/mocks guest checkout)",
    ],
    fixHint: "Update RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET in Admin → API Keys & Secrets.",
    run: async () => {
      const id = await getCredential("RAZORPAY_KEY_ID", { required: false });
      const secret = await getCredential("RAZORPAY_KEY_SECRET", { required: false });
      if (!id || !secret) {
        return { status: "fail", message: "Razorpay key id/secret missing — checkout cannot create orders" };
      }
      const start = Date.now();
      try {
        const resp = await timed((signal) =>
          fetch("https://api.razorpay.com/v1/payments?count=1", {
            headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}` },
            signal,
          })
        );
        const ms = Date.now() - start;
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) {
          return {
            status: "fail",
            httpStatus: resp.status,
            message: data?.error?.description || `HTTP ${resp.status}`,
          };
        }
        return {
          status: "pass",
          httpStatus: 200,
          message: `Authenticated with Razorpay in ${ms} ms (mode: ${id.startsWith("rzp_live") ? "live" : "test"})`,
          detail: { latency_ms: ms, mode: id.startsWith("rzp_live") ? "live" : "test" },
        };
      } catch (e) {
        return { status: "fail", message: `Razorpay request failed: ${errText(e)}` };
      }
    },
  });

  checks.push({
    key: "api.razorpay.webhook",
    section: "Payments",
    name: "Razorpay webhook secret",
    category: "payment",
    provider: "Razorpay",
    target: "razorpay-webhook",
    usedIn: ["razorpay-webhook (auto-unlocks purchases when the browser closes mid-payment)"],
    run: async () => {
      const s = await getCredential("RAZORPAY_WEBHOOK_SECRET", { required: false });
      return s
        ? { status: "pass", message: "Webhook signing secret configured" }
        : {
            status: "warn",
            message: "RAZORPAY_WEBHOOK_SECRET missing — webhook-driven unlocks are disabled",
            fixHint: "Add RAZORPAY_WEBHOOK_SECRET and point the Razorpay dashboard webhook at the razorpay-webhook function.",
          };
    },
  });

  // ---------------- OTP / SMS ----------------
  checks.push({
    key: "api.hspsms",
    section: "Login & Messaging",
    name: "HSPSMS OTP delivery",
    category: "sms",
    provider: "HSPSMS",
    target: "https://sms.hspsms.com",
    usedIn: [
      "send-otp (student login on dashboard.mbacompass.in)",
      "Google OAuth mobile verification",
      "Lead forms with mobile OTP",
    ],
    fixHint: "Check HSPSMS_USERNAME / HSPSMS_API_KEY / HSPSMS_SENDER_ID / HSPSMS_OTP_TEMPLATE and the DLT template approval.",
    run: async () => {
      const username = await getCredential("HSPSMS_USERNAME", { required: false });
      const apiKey = await getCredential("HSPSMS_API_KEY", { required: false });
      const sender = await getCredential("HSPSMS_SENDER_ID", { required: false });
      const template = await getCredential("HSPSMS_OTP_TEMPLATE", { required: false });
      const missing = [
        !username && "HSPSMS_USERNAME",
        !apiKey && "HSPSMS_API_KEY",
        !sender && "HSPSMS_SENDER_ID",
        !template && "HSPSMS_OTP_TEMPLATE",
      ].filter(Boolean);
      if (missing.length) {
        return { status: "fail", message: `OTP cannot be sent — missing ${missing.join(", ")}` };
      }
      const start = Date.now();
      try {
        const url = `https://sms.hspsms.com/balance?username=${encodeURIComponent(username)}&apikey=${encodeURIComponent(apiKey)}`;
        const resp = await timed((signal) => fetch(url, { signal }));
        const text = (await resp.text().catch(() => "")).slice(0, 200);
        const ms = Date.now() - start;
        const looksBad = /invalid|error|authentication/i.test(text);
        if (!resp.ok || looksBad) {
          return {
            status: "fail",
            httpStatus: resp.status,
            message: `HSPSMS rejected the credentials: ${text || `HTTP ${resp.status}`}`,
            detail: { latency_ms: ms },
          };
        }
        return {
          status: "pass",
          httpStatus: resp.status,
          message: `HSPSMS account reachable in ${ms} ms (${text || "no balance payload"})`,
          detail: { latency_ms: ms, response: text },
        };
      } catch (e) {
        return { status: "fail", message: `HSPSMS unreachable: ${errText(e)}` };
      }
    },
  });

  checks.push({
    key: "db.otp.delivery",
    section: "Login & Messaging",
    name: "OTP delivery success (last 24 h)",
    category: "sms",
    provider: "HSPSMS",
    target: "public.phone_otps",
    usedIn: ["Student login", "Signup mobile verification"],
    run: async () => {
      const since = new Date(Date.now() - 86400000).toISOString();
      const { count: total, error } = await sb
        .from("phone_otps")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since);
      if (error) return { status: "warn", message: `Could not read phone_otps: ${error.message}` };
      const { count: verified } = await sb
        .from("phone_otps")
        .select("*", { count: "exact", head: true })
        .gte("created_at", since)
        .not("verified_at", "is", null);
      const t = total ?? 0;
      const v = verified ?? 0;
      if (t === 0) return { status: "pass", message: "No OTP requests in the last 24 h" };
      const rate = Math.round((v / t) * 100);
      if (rate < 25) {
        return {
          status: "fail",
          message: `Only ${rate}% of ${t} OTPs were verified in 24 h — students are likely not receiving SMS`,
          detail: { requested: t, verified: v },
          fixHint: "Check the HSPSMS delivery logs and the DLT template text match.",
        };
      }
      if (rate < 55) {
        return { status: "warn", message: `${rate}% of ${t} OTPs verified in 24 h`, detail: { requested: t, verified: v } };
      }
      return { status: "pass", message: `${rate}% of ${t} OTPs verified in 24 h`, detail: { requested: t, verified: v } };
    },
  });

  checks.push({
    key: "email.queue",
    section: "Login & Messaging",
    name: "Transactional email queue",
    category: "email",
    provider: "Lovable Email",
    target: "process-email-queue",
    usedIn: [
      "Purchase confirmation + login credentials emails",
      "Auth emails (magic link, reset password)",
      "Daily test notifications",
    ],
    run: async () => {
      const since = new Date(Date.now() - 86400000).toISOString();
      const { data, error } = await sb
        .from("email_send_log")
        .select("status, created_at")
        .gte("created_at", since)
        .limit(1000);
      if (error) return { status: "warn", message: `Could not read email_send_log: ${error.message}` };
      const rows = data || [];
      const failed = rows.filter((r) => String(r.status || "").toLowerCase().includes("fail")).length;
      if (rows.length === 0) return { status: "pass", message: "No emails attempted in the last 24 h" };
      if (failed > 0 && failed / rows.length > 0.2) {
        return {
          status: "fail",
          message: `${failed} of ${rows.length} emails failed in 24 h`,
          detail: { attempted: rows.length, failed },
          fixHint: "Open process-email-queue logs — usually a sender-domain or rate-limit (429) problem.",
        };
      }
      if (failed > 0) {
        return { status: "warn", message: `${failed} of ${rows.length} emails failed in 24 h`, detail: { attempted: rows.length, failed } };
      }
      return { status: "pass", message: `${rows.length} emails sent in 24 h with no failures` };
    },
  });

  // ---------------- CRM ----------------
  checks.push({
    key: "api.meritto",
    section: "CRM & Leads",
    name: "Meritto (NoPaperForms) lead push",
    category: "api",
    provider: "Meritto",
    target: "api.in4.nopaperforms.com",
    usedIn: ["push-to-meritto", "Admin → Meritto Logs bulk upload", "Lead forms & guidance requests"],
    fixHint: "Check MERITTO_SECRET_KEY and the Meritto data-porting endpoint status.",
    run: async () => {
      const secret = await getCredential("MERITTO_SECRET_KEY", { required: false });
      if (!secret) {
        return { status: "fail", message: "MERITTO_SECRET_KEY missing — no leads can be pushed" };
      }
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data, error } = await sb
        .from("meritto_lead_logs")
        .select("status, created_at")
        .gte("created_at", since)
        .limit(1000);
      if (error) return { status: "warn", message: `Key present; could not read meritto_lead_logs: ${error.message}` };
      const rows = data || [];
      const failed = rows.filter((r) => String(r.status || "").toLowerCase() === "failed").length;
      if (rows.length && failed / rows.length > 0.2) {
        return {
          status: "fail",
          message: `Key present but ${failed} of ${rows.length} lead pushes failed in 7 days`,
          detail: { attempted: rows.length, failed },
        };
      }
      return {
        status: "pass",
        message: `Key configured — ${rows.length} pushes in 7 days, ${failed} failed`,
        detail: { attempted: rows.length, failed },
      };
    },
  });

  // ---------------- Google Search ----------------
  checks.push({
    key: "api.gsc",
    section: "Google Search & Indexing",
    name: "Search Console service account (live token exchange)",
    category: "api",
    provider: "Google",
    target: "https://oauth2.googleapis.com/token",
    usedIn: ["ctr-optimizer", "gsc-ingest", "gsc-index-check", "Admin → SEO dashboards"],
    fixHint: "Re-upload the service account JSON (GOOGLE_INDEXING_SERVICE_ACCOUNT) and confirm it has access to the property.",
    run: async () => {
      const r = await googleAccessToken("https://www.googleapis.com/auth/webmasters.readonly");
      if (r.error) return { status: "fail", message: r.error };
      const start = Date.now();
      const resp = await timed((signal) =>
        fetch("https://www.googleapis.com/webmasters/v3/sites", {
          headers: { Authorization: `Bearer ${r.token}` },
          signal,
        })
      );
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        return {
          status: "fail",
          httpStatus: resp.status,
          message: data?.error?.message || `HTTP ${resp.status} listing Search Console properties`,
        };
      }
      const sites = (data?.siteEntry || []).map((s: { siteUrl?: string }) => s.siteUrl).filter(Boolean);
      return {
        status: sites.length ? "pass" : "warn",
        httpStatus: 200,
        message: sites.length
          ? `Token minted and ${sites.length} property/properties visible`
          : "Token minted but the service account sees no Search Console property",
        detail: { latency_ms: Date.now() - start, sites: sites.slice(0, 5) },
      };
    },
  });

  checks.push({
    key: "api.indexing",
    section: "Google Search & Indexing",
    name: "Google Indexing API token",
    category: "api",
    provider: "Google",
    target: "https://indexing.googleapis.com",
    usedIn: ["Automated URL submission", "Admin → Google Indexing dashboard"],
    run: async () => {
      const r = await googleAccessToken("https://www.googleapis.com/auth/indexing");
      if (r.error) {
        return {
          status: "fail",
          message: r.error,
          fixHint: "The indexing service account credentials are missing or invalid — URLs will not be submitted to Google.",
        };
      }
      return { status: "pass", message: "Indexing API access token minted successfully" };
    },
  });

  // ---------------- Database ----------------
  const coreTables = ["colleges", "exams", "courses", "mock_tests", "articles", "institutes", "profiles"];
  checks.push({
    key: "db.core-tables",
    section: "Database & Content Store",
    name: "Core content tables readable",
    category: "db",
    target: coreTables.join(", "),
    usedIn: ["Every public listing and detail page", "Admin content managers"],
    run: async () => {
      const counts: Record<string, number | null> = {};
      const problems: string[] = [];
      for (const t of coreTables) {
        const { count, error } = await tableCount(t);
        counts[t] = count;
        if (error) problems.push(`${t}: ${error}`);
        else if ((count ?? 0) === 0) problems.push(`${t} is empty`);
      }
      if (problems.length) {
        return { status: problems.some((p) => p.includes(":")) ? "fail" : "warn", message: problems.join(" · "), detail: counts };
      }
      return { status: "pass", message: Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(" · "), detail: counts };
    },
  });

  checks.push({
    key: "db.rpc.colleges-listing",
    section: "Database & Content Store",
    name: "colleges_listing RPC (public college directory)",
    category: "db",
    target: "public.colleges_listing()",
    usedIn: ["/colleges listing page", "Home page college blocks"],
    fixHint: "Grant EXECUTE on colleges_listing to anon + authenticated if this fails.",
    run: async () => {
      const anon = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
      const start = Date.now();
      const { data, error } = await anon.rpc("colleges_listing" as never, {} as never);
      if (error) return { status: "fail", message: `RPC failed for logged-out visitors: ${error.message}` };
      const n = Array.isArray(data) ? data.length : 0;
      if (n === 0) return { status: "fail", message: "RPC returned 0 colleges — the public listing page will look empty" };
      return { status: "pass", message: `${n} colleges returned in ${Date.now() - start} ms`, detail: { rows: n } };
    },
  });

  checks.push({
    key: "db.storage",
    section: "Database & Content Store",
    name: "Storage buckets (uploads / images)",
    category: "db",
    target: "storage",
    usedIn: ["Freebies PDFs", "College & article images", "Admin uploads"],
    run: async () => {
      const { data, error } = await sb.storage.listBuckets();
      if (error) return { status: "fail", message: `Cannot list buckets: ${error.message}` };
      const names = (data || []).map((b) => b.name);
      if (!names.length) return { status: "warn", message: "No storage buckets found" };
      const probe = names.includes("uploads") ? "uploads" : names[0];
      const { error: listErr } = await sb.storage.from(probe).list("", { limit: 1 });
      if (listErr) return { status: "fail", message: `Bucket "${probe}" unreadable: ${listErr.message}` };
      return { status: "pass", message: `${names.length} buckets, "${probe}" readable`, detail: { buckets: names } };
    },
  });

  // ---------------- Public endpoints ----------------
  const endpoints: Array<[string, string, string, string[], Record<string, unknown>]> = [
    ["seo.sitemap", "Sitemap index (serve-sitemap)", `${FUNCTIONS_BASE}/serve-sitemap`, ["Google Search Console", "Daily sitemap cron"], { expectContains: "<?xml", minBytes: 200 }],
    ["seo.image-sitemap", "Image sitemap (serve-image-sitemap)", `${FUNCTIONS_BASE}/serve-image-sitemap`, ["Google Images indexing"], { expectContains: "<?xml", minBytes: 100 }],
    ["seo.feed", "RSS feed (serve-feed)", `${FUNCTIONS_BASE}/serve-feed`, ["News aggregators", "Blog syndication"], { minBytes: 100 }],
    ["seo.ssr", "SSR prerender (ssr-prerender)", `${FUNCTIONS_BASE}/ssr-prerender?path=/colleges`, ["Cloudflare worker edge merge", "Googlebot HTML"], { expectContains: "<", minBytes: 500 }],
    ["site.home", "Live home page", `${SITE}/`, ["Public site"], { minBytes: 1000 }],
    ["site.robots", "robots.txt", `${SITE}/robots.txt`, ["Crawler directives"], { expectContains: "Sitemap", minBytes: 20 }],
  ];
  for (const [key, name, url, usedIn, opts] of endpoints) {
    checks.push({
      key,
      section: "Public Endpoints & SEO Delivery",
      name,
      category: "endpoint",
      target: url,
      usedIn,
      run: () => probeUrl(url, opts as { expectContains?: string; minBytes?: number }),
    });
  }

  // ---------------- Content generation functions ----------------
  const contentFns: Array<[string, string, string[]]> = [
    ["ai-exam-writer", "Exam page generator", ["Admin → Exams → AI generate", "Bulk exam creator", "Exam completeness gap-fill"]],
    ["ai-college-writer", "College page generator", ["Admin → Colleges → AI generate", "Bulk college creator"]],
    ["ai-college-section", "College section generator", ["Admin → College Sections", "Bulk section jobs"]],
    ["ai-institute-writer", "Coaching institute generator", ["Admin → Coaching Institutes"]],
    ["ai-course-writer", "Course content generator", ["Admin → Courses", "Bulk course worker"]],
    ["ai-blog-writer", "Blog / article writer", ["Admin → Articles", "Newsroom automation"]],
    ["ai-seo-enhance", "AI SEO enhancer", ["Admin → SEO tools", "Exam & college SEO"]],
    ["seo-reoptimize-worker", "Re-SEO worker", ["Admin → Re-SEO Optimizer"]],
    ["generate-mock-questions", "Mock question generator", ["Admin → Mock Builder", "Bulk mock generation"]],
    ["personalized-questions-generate", "Personalized hub generator", ["/student/personalized-hub"]],
    ["profile-analyzer", "AI Profile Analyzer", ["/profile-analyzer public tool"]],
    ["college-shortlister", "AI College Finder", ["/college-shortlister public tool"]],
    ["sop-review", "SOP review tool", ["Student SOP reviewer"]],
    ["vocab-quiz-generate", "Vocabulary quiz generator", ["/student/vocabulary"]],
    ["roi-calculator", "ROI analyser", ["Public ROI calculator"]],
    ["ai-page-summary", "AI page gist", ["Article & college page summaries"]],
    ["image-optimizer", "Image SEO optimizer", ["Admin → Image SEO"]],
    ["push-to-meritto", "Meritto push function", ["Lead automation"]],
    ["send-otp", "OTP sender", ["Student login"]],
    ["mock-submit-attempt", "Mock scoring engine", ["Student mock submission"]],
  ];
  for (const [fn, label, usedIn] of contentFns) {
    checks.push({
      key: `fn.${fn}`,
      section: "Content Generation & Tools",
      name: `${label} (${fn})`,
      category: "function",
      target: `${FUNCTIONS_BASE}/${fn}`,
      usedIn,
      run: () => probeFunction(fn),
    });
  }

  // ---------------- Background workers ----------------
  checks.push({
    key: "worker.watchdog",
    section: "Background Jobs & Queues",
    name: "Bulk jobs watchdog (pumps all workers every minute)",
    category: "function",
    target: `${FUNCTIONS_BASE}/bulk-jobs-watchdog`,
    usedIn: ["Bulk exams", "Bulk colleges", "Mock sections", "Exam backfill"],
    run: async () => {
      const start = Date.now();
      try {
        const resp = await timed((signal) =>
          fetch(`${FUNCTIONS_BASE}/bulk-jobs-watchdog`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-worker-key": SERVICE_KEY },
            body: "{}",
            signal,
          })
        );
        const data = await resp.json().catch(() => ({}));
        if (!resp.ok) return { status: "fail", httpStatus: resp.status, message: `Watchdog returned ${resp.status}` };
        return {
          status: "pass",
          httpStatus: 200,
          message: `Watchdog ran in ${Date.now() - start} ms`,
          detail: data as Record<string, unknown>,
        };
      } catch (e) {
        return { status: "fail", message: `Watchdog failed: ${errText(e)}` };
      }
    },
  });

  checks.push({
    key: "worker.stuck-jobs",
    section: "Background Jobs & Queues",
    name: "Stuck / stalled background items",
    category: "db",
    target: "bulk + backfill queues",
    usedIn: ["Bulk generation dashboards"],
    run: async () => {
      const cutoff = new Date(Date.now() - 30 * 60000).toISOString();
      const queues: Array<[string, string]> = [
        ["exam_backfill_items", "status"],
        ["bulk_college_jobs", "status"],
        ["bulk_seo_items", "status"],
        ["mock_section_jobs", "status"],
        ["seo_reoptimization_items", "status"],
      ];
      const stuck: Record<string, number> = {};
      for (const [table, col] of queues) {
        const { count, error } = await sb
          .from(table)
          .select("*", { count: "exact", head: true })
          .eq(col, "running")
          .lt("updated_at", cutoff);
        if (!error && (count ?? 0) > 0) stuck[table] = count as number;
      }
      const total = Object.values(stuck).reduce((a, b) => a + b, 0);
      if (total === 0) return { status: "pass", message: "No queue item has been running for over 30 minutes" };
      return {
        status: "warn",
        message: `${total} item(s) stuck over 30 min: ${Object.entries(stuck).map(([k, v]) => `${k} ${v}`).join(", ")}`,
        detail: stuck,
        fixHint: "The watchdog normally recovers these; if the count keeps growing, inspect that worker's logs.",
      };
    },
  });

  checks.push({
    key: "worker.ai-errors",
    section: "Background Jobs & Queues",
    name: "AI errors logged in the last 24 h",
    category: "ai",
    target: "public.ai_usage_logs",
    usedIn: ["All AI features"],
    run: async () => {
      const since = new Date(Date.now() - 86400000).toISOString();
      const { data, error } = await sb
        .from("ai_usage_logs")
        .select("feature, success, error_message, created_at")
        .gte("created_at", since)
        .limit(1000);
      if (error) return { status: "warn", message: `Could not read ai_usage_logs: ${error.message}` };
      const rows = data || [];
      const failures = rows.filter((r) => r.success === false);
      if (!failures.length) {
        return { status: "pass", message: `${rows.length} AI calls in 24 h, none failed` };
      }
      const byFeature: Record<string, number> = {};
      for (const f of failures) byFeature[String(f.feature || "unknown")] = (byFeature[String(f.feature || "unknown")] || 0) + 1;
      const sample = failures[0]?.error_message ? String(failures[0].error_message).slice(0, 200) : "";
      const ratio = rows.length ? failures.length / rows.length : 0;
      return {
        status: ratio > 0.25 ? "fail" : "warn",
        message: `${failures.length} of ${rows.length} AI calls failed in 24 h${sample ? ` — e.g. "${sample}"` : ""}`,
        detail: { by_feature: byFeature, sample },
        fixHint: "Check the OpenAI key status and quota above, then re-run the affected job.",
      };
    },
  });

  checks.push({
    key: "cron.jobs",
    section: "Background Jobs & Queues",
    name: "Scheduled jobs registered",
    category: "db",
    target: "cron.job",
    usedIn: ["Sitemap refresh", "Daily tests", "SEO schedulers", "Daily system check"],
    run: async () => {
      const { data, error } = await sb.rpc("system_check_cron_jobs" as never, {} as never);
      if (error) return { status: "warn", message: `Could not read the schedule: ${error.message}` };
      const jobs = (data as Array<{ jobname: string; active: boolean }>) || [];
      const inactive = jobs.filter((j) => !j.active).map((j) => j.jobname);
      if (inactive.length) {
        return { status: "warn", message: `${jobs.length} jobs registered, inactive: ${inactive.join(", ")}`, detail: { jobs } };
      }
      return { status: "pass", message: `${jobs.length} scheduled jobs registered and active`, detail: { jobs } };
    },
  });

  return checks;
}

async function runAll(runId: string, trigger: string) {
  const checks = buildChecks();
  const started = Date.now();
  const rows: Record<string, unknown>[] = [];
  let passed = 0, warned = 0, failed = 0, skipped = 0;

  const CONCURRENCY = 6;
  let cursor = 0;
  async function worker() {
    while (cursor < checks.length) {
      const check = checks[cursor++];
      const t0 = Date.now();
      let outcome: Outcome;
      try {
        outcome = await check.run();
      } catch (e) {
        outcome = { status: "fail", message: `Check crashed: ${errText(e)}` };
      }
      const latency = Date.now() - t0;
      if (outcome.status === "pass") passed++;
      else if (outcome.status === "warn") warned++;
      else if (outcome.status === "fail") failed++;
      else skipped++;
      rows.push({
        run_id: runId,
        section: check.section,
        check_key: check.key,
        name: check.name,
        category: check.category,
        provider: check.provider ?? null,
        target: check.target ?? null,
        status: outcome.status,
        http_status: outcome.httpStatus ?? null,
        latency_ms: latency,
        message: outcome.message,
        fix_hint: outcome.fixHint ?? check.fixHint ?? null,
        used_in: check.usedIn,
        detail: outcome.detail ?? {},
      });
      // Stream results in as they finish so the dashboard shows live progress.
      await sb.from("system_check_results").insert(rows[rows.length - 1]);
      await sb
        .from("system_check_runs")
        .update({ total: checks.length, passed, warned, failed, skipped })
        .eq("id", runId);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const bySection: Record<string, { pass: number; warn: number; fail: number }> = {};
  for (const r of rows) {
    const s = String(r.section);
    bySection[s] ||= { pass: 0, warn: 0, fail: 0 };
    const st = String(r.status);
    if (st === "pass") bySection[s].pass++;
    else if (st === "warn") bySection[s].warn++;
    else if (st === "fail") bySection[s].fail++;
  }

  await sb
    .from("system_check_runs")
    .update({
      status: failed > 0 ? "failed" : warned > 0 ? "degraded" : "healthy",
      finished_at: new Date().toISOString(),
      duration_ms: Date.now() - started,
      total: checks.length,
      passed,
      warned,
      failed,
      skipped,
      summary: { by_section: bySection, trigger },
    })
    .eq("id", runId);

  return { runId, total: checks.length, passed, warned, failed, skipped, bySection };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let body: Record<string, unknown> = {};
  try {
    body = req.method === "POST" ? await req.json() : {};
  } catch (_) { /* empty body */ }

  // Auth: admin session, worker key, or the daily cron token.
  let trigger = "manual";
  let authorised = false;
  if (body?.cron && typeof body.token === "string") {
    const { data } = await sb.from("system_check_config").select("cron_token, daily_enabled").eq("id", true).maybeSingle();
    if (data?.cron_token && data.cron_token === body.token) {
      if (!data.daily_enabled) {
        return new Response(JSON.stringify({ ok: true, skipped: "daily schedule disabled" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      authorised = true;
      trigger = "daily";
    }
  }
  if (!authorised) {
    const denied = await requireAdmin(req, corsHeaders);
    if (denied) return denied;
    authorised = true;
  }

  // Identify the admin who pressed the button (best effort).
  let triggeredBy: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (trigger === "manual" && authHeader?.startsWith("Bearer ")) {
    const { data } = await sb.auth.getUser(authHeader.replace("Bearer ", ""));
    triggeredBy = data?.user?.id ?? null;
  }

  const { data: run, error: runErr } = await sb
    .from("system_check_runs")
    .insert({ trigger, status: "running", triggered_by: triggeredBy })
    .select("id")
    .single();
  if (runErr || !run) {
    return new Response(JSON.stringify({ error: runErr?.message || "Could not create run" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const runId = run.id as string;

  const work = runAll(runId, trigger).catch(async (e) => {
    await sb
      .from("system_check_runs")
      .update({ status: "error", error: errText(e), finished_at: new Date().toISOString() })
      .eq("id", runId);
  });

  if (body?.wait === false) {
    // Fire-and-forget mode (used by cron): return immediately.
    (globalThis as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime?.waitUntil(work);
    return new Response(JSON.stringify({ ok: true, run_id: runId, mode: "background" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const result = await work;
  return new Response(JSON.stringify({ ok: true, run_id: runId, ...(result || {}) }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
