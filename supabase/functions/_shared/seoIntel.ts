// Shared plumbing for the AI SEO Intelligence Center.
//
// Everything here is used by three functions:
//   seo-intel-scheduler  → decides what is due and enqueues jobs (cron driven)
//   seo-intel-worker     → claims one job at a time and executes it
//   seo-intel-control    → admin-facing read/write API for the dashboard
//
// Hard rules encoded here:
//   * every number we store carries a data_source label (actual / estimated / calculated / ai)
//   * background work is bounded: one job per invocation, leases, retry caps
//   * a 402/403 from any provider parks the engine instead of looping

import { createClient } from "npm:@supabase/supabase-js@2";

export const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

export const admin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

export const SITE_URL = "https://mbacompass.in";

// ── Job types the worker understands ───────────────────────────────
export const JOB_TYPES = [
  "gsc_pages",        // actual clicks/impressions/CTR/position per page
  "gsc_queries",      // actual query-level performance → keywords
  "index_check",      // actual indexing state per URL (URL Inspection)
  "crawl_pages",      // on-page technical + content snapshot from our DB
  "keyword_metrics",  // Semrush volume / difficulty / CPC / trend
  "rank_track",       // daily rank snapshot per tracked keyword
  "competitor_scan",  // SERP competitors + what they do differently
  "analyze",          // AI recommendation generation from stored signals
  "verify",           // measure impact of applied changes
  "report",           // daily / weekly report rollup
  "daily_snapshot",   // site-wide daily metric rollup for before/after reporting
  "live_crawl",       // crawler-visibility check (Firecrawl)
  "speed_audit",      // Core Web Vitals (PageSpeed)
  // ── advanced intelligence layer ────────────────────────────────
  "demand_model",       // multi-source search demand + acceleration
  "intent_scan",        // intent classification + intent-shift detection
  "serp_intel",         // SERP composition & rewarded format
  "volatility_scan",    // ranking volatility monitor
  "forecast",           // ranking forecast with confidence
  "cannibalization",    // competing URLs for the same intent
  "content_gaps",       // content gap intelligence 2.0
  "entity_map",         // entity & topical authority coverage
  "link_intel",         // internal linking opportunities
  "ctr_intel",          // CTR benchmarking vs our own cohorts
  "anomaly_scan",       // statistical anomaly detection
  "opportunity_score",  // opportunity scoring + next best action
  "page_twin",          // page-level SEO digital twin profiles
  "impact_attribution", // isolate change impact from site-wide trend
  "knowledge_graph",    // entity/keyword/page/competitor graph
  "strategy",           // AI SEO growth strategy
] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const JOB_LABELS: Record<string, string> = {
  gsc_pages: "Search Console — page performance",
  gsc_queries: "Search Console — query performance",
  index_check: "Indexing status check",
  crawl_pages: "On-page technical crawl",
  live_crawl: "Live crawler-visibility check (Firecrawl)",
  speed_audit: "Core Web Vitals audit (PageSpeed)",
  keyword_metrics: "Keyword metrics refresh (Semrush)",
  rank_track: "Daily rank tracking",
  competitor_scan: "Competitor intelligence scan",
  analyze: "AI analysis & recommendations",
  verify: "Change impact verification",
  report: "Report generation",
  daily_snapshot: "Daily metrics snapshot",
  demand_model: "Search demand model (multi-source)",
  intent_scan: "Search intent classification & shift detection",
  serp_intel: "SERP intelligence snapshot",
  volatility_scan: "Ranking volatility monitor",
  forecast: "Ranking forecast",
  cannibalization: "Keyword cannibalization detection",
  content_gaps: "Content gap intelligence",
  entity_map: "Entity & topical authority map",
  link_intel: "Internal linking intelligence",
  ctr_intel: "CTR benchmarking",
  anomaly_scan: "Anomaly detection",
  opportunity_score: "Opportunity scoring & next best action",
  page_twin: "Page SEO intelligence profiles",
  impact_attribution: "SEO change impact attribution",
  knowledge_graph: "SEO knowledge graph",
  strategy: "AI SEO growth strategy",
};


export interface IntelSettings {
  engine_enabled: boolean;
  schedule_mode: "always" | "window";
  window_start: string;
  window_end: string;
  active_days: number[];
  timezone: string;
  freq_monitor_min: number;
  freq_rank_min: number;
  freq_competitor_min: number;
  freq_crawl_min: number;
  freq_report_min: number;
  auto_apply_safe: boolean;
  gsc_site_url: string | null;
  semrush_database: string;
  semrush_campaign_id: string | null;
  max_pages_per_run: number;
  cron_token: string;
  paused_reason: string | null;
  last_full_scan_at: string | null;
  last_report_at: string | null;
  updated_at: string;
}

export async function loadIntelSettings(sb: any): Promise<IntelSettings> {
  const { data } = await sb.from("seo_intel_settings").select("*").eq("id", true).maybeSingle();
  if (data) return data as IntelSettings;
  const { data: created } = await sb.from("seo_intel_settings")
    .insert({ id: true }).select("*").single();
  return created as IntelSettings;
}

/** Is the engine allowed to run right now (enabled + inside its window + not parked)? */
export function withinSchedule(s: IntelSettings, now = new Date()): { ok: boolean; reason?: string } {
  if (!s.engine_enabled) return { ok: false, reason: "Engine is switched off" };
  if (s.paused_reason) return { ok: false, reason: s.paused_reason };
  // Evaluate the window in the configured timezone (IST by default).
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: s.timezone || "Asia/Kolkata",
    hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const mm = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const wdName = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = wdMap[wdName] ?? 1;
  const days = s.active_days?.length ? s.active_days : [0, 1, 2, 3, 4, 5, 6];
  if (!days.includes(dow)) return { ok: false, reason: "Outside the configured active days" };
  if (s.schedule_mode === "always") return { ok: true };
  const mins = hh * 60 + mm;
  const toMin = (t: string) => {
    const [a, b] = String(t).split(":");
    return Number(a) * 60 + Number(b || 0);
  };
  const start = toMin(s.window_start);
  const end = toMin(s.window_end);
  const inside = start <= end ? mins >= start && mins <= end : mins >= start || mins <= end;
  return inside ? { ok: true } : { ok: false, reason: "Outside the configured monitoring window" };
}

// ── Activity + audit ──────────────────────────────────────────────
export async function logActivity(sb: any, e: {
  event: string;
  detail?: string;
  level?: "info" | "success" | "warn" | "error";
  job_id?: string | null;
  job_type?: string | null;
  data_source?: string | null;
  records?: number | null;
  meta?: Record<string, unknown>;
}) {
  try {
    await sb.from("seo_intel_activity").insert({
      event: e.event,
      detail: e.detail ?? null,
      level: e.level ?? "info",
      job_id: e.job_id ?? null,
      job_type: e.job_type ?? null,
      data_source: e.data_source ?? null,
      records: e.records ?? null,
      meta: e.meta ?? {},
    });
  } catch (_) { /* logging must never break a run */ }
}

export async function logAudit(sb: any, e: {
  actor?: string | null;
  actor_label?: string;
  action: string;
  entity?: string;
  entity_id?: string | null;
  path?: string | null;
  before_value?: unknown;
  after_value?: unknown;
  data_source?: string | null;
  recommendation_id?: string | null;
  verification_result?: string | null;
}) {
  try {
    await sb.from("seo_intel_audit").insert({
      actor: e.actor ?? null,
      actor_label: e.actor_label ?? "engine",
      action: e.action,
      entity: e.entity ?? null,
      entity_id: e.entity_id ?? null,
      path: e.path ?? null,
      before_value: e.before_value ?? null,
      after_value: e.after_value ?? null,
      data_source: e.data_source ?? null,
      recommendation_id: e.recommendation_id ?? null,
      verification_result: e.verification_result ?? null,
    });
  } catch (_) { /* ignore */ }
}

export async function notify(sb: any, n: {
  kind: string;
  title: string;
  body?: string;
  severity?: "info" | "warn" | "critical";
  path?: string | null;
  keyword?: string | null;
  meta?: Record<string, unknown>;
}) {
  try {
    await sb.from("seo_intel_notifications").insert({
      kind: n.kind,
      title: n.title,
      body: n.body ?? null,
      severity: n.severity ?? "info",
      path: n.path ?? null,
      keyword: n.keyword ?? null,
      meta: n.meta ?? {},
    });
  } catch (_) { /* ignore */ }
}

// ── Queue ─────────────────────────────────────────────────────────
export async function enqueue(sb: any, job: {
  job_type: JobType | string;
  payload?: Record<string, unknown>;
  priority?: number;
  dedupe_key?: string | null;
  data_source?: string | null;
  triggered_by?: string;
  scheduled_for?: string;
  max_retries?: number;
}) {
  const row = {
    job_type: job.job_type,
    payload: job.payload ?? {},
    priority: job.priority ?? 5,
    dedupe_key: job.dedupe_key ?? `${job.job_type}:${JSON.stringify(job.payload ?? {})}`,
    data_source: job.data_source ?? null,
    triggered_by: job.triggered_by ?? "scheduler",
    scheduled_for: job.scheduled_for ?? new Date().toISOString(),
    max_retries: job.max_retries ?? 3,
  };
  const { data, error } = await sb.from("seo_intel_jobs").insert(row).select("id").maybeSingle();
  if (error) {
    // Unique violation on dedupe_key simply means the job is already pending.
    if ((error as any).code === "23505") return { skipped: true as const };
    throw new Error(`enqueue ${job.job_type}: ${error.message}`);
  }
  return { id: data?.id as string };
}

/** Fire-and-forget invocation of another edge function in this project. */
export async function invokeFn(name: string, body: Record<string, unknown>) {
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/${name}`;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        apikey: key,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error(`[seoIntel] invoke ${name} failed:`, (e as Error).message);
  }
}

/** Park the whole engine — used for provider 402/403 (credits / policy). */
export async function parkEngine(sb: any, reason: string) {
  await sb.from("seo_intel_settings").update({ paused_reason: reason }).eq("id", true);
  await logActivity(sb, { event: "Engine parked", detail: reason, level: "error" });
  await notify(sb, {
    kind: "engine_parked",
    severity: "critical",
    title: "SEO engine paused",
    body: reason,
  });
}

/** Classify a provider failure so the worker can decide park vs retry. */
export function classifyProviderError(status: number, body: string): "park" | "retry" | "fail" {
  if (status === 402 || status === 403) return "park";
  if (status === 429 || status >= 500) return "retry";
  if (/insufficient_quota|billing|credit/i.test(body)) return "park";
  return "fail";
}

// ── Source health bookkeeping ─────────────────────────────────────
export async function markSource(sb: any, key: string, patch: {
  configured?: boolean;
  status?: "connected" | "not_connected" | "error";
  last_sync_at?: string | null;
  next_sync_at?: string | null;
  last_tested_at?: string | null;
  last_error?: string | null;
  usage?: Record<string, unknown>;
}) {
  try {
    await sb.from("seo_intel_sources").update({ ...patch }).eq("source_key", key);
  } catch (_) { /* ignore */ }
}

// ── Data-source labelling (the "no fake numbers" rule) ────────────
export type DataLabel = "actual" | "estimated" | "calculated" | "ai" | "unavailable";
export const LABELS: Record<string, DataLabel> = {
  gsc: "actual",
  gsc_inspection: "actual",
  semrush: "estimated",
  semrush_tracking: "actual",
  firecrawl: "actual",
  pagespeed: "actual",
  internal: "calculated",
  openai: "ai",
  none: "unavailable",
};

export const nowIso = () => new Date().toISOString();
export const today = () => new Date().toISOString().slice(0, 10);
export const dayOffset = (days: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
};
