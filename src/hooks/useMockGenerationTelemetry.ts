import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { computeAICost } from "@/lib/aiPricing";

export type UsageLog = {
  id: string;
  created_at: string;
  model: string | null;
  provider: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  estimated_cost: number | string | null;
  latency_ms: number | null;
  status: string | null;
  error_message: string | null;
};

export type MockGenerationTelemetry = {
  loading: boolean;
  /** Raw logs since the panel was opened, newest first. */
  logs: UsageLog[];
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  totalCostUsd: number;
  totalCostInr: number;
  avgLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  callsPerMinute: number;
  /** model → call count map, sorted desc */
  modelBreakdown: { model: string; calls: number; tokens: number; costUsd: number }[];
  /** Heatmap: 60 cells, one per second (oldest left). Value = calls completing in that second. */
  heatmapPerSec: number[];
  /** Latency sparkline of last 30 calls (ms) */
  latencySparkline: number[];
  /** Calls / 5s sparkline (last 60 buckets = 5 minutes) */
  callsSparkline: number[];
};

const USD_TO_INR = 84;

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

export function useMockGenerationTelemetry(
  active: boolean,
  startedAt: number | null,
  intervalMs = 2000,
): MockGenerationTelemetry {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(false);
  // pinned start so a paused panel still measures from this run only
  const startRef = useRef<number | null>(null);
  if (active && startedAt && startRef.current !== startedAt) startRef.current = startedAt;
  if (!active) startRef.current = null;

  useEffect(() => {
    if (!active || !startedAt) {
      setLogs([]);
      return;
    }
    let alive = true;
    setLoading(true);
    const fetchLogs = async () => {
      const sinceIso = new Date(startedAt - 5_000).toISOString();
      const { data } = await supabase
        .from("ai_usage_logs")
        .select("id, created_at, model, provider, prompt_tokens, completion_tokens, total_tokens, estimated_cost, latency_ms, status, error_message")
        .eq("feature", "mock_question_generator")
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(500);
      if (!alive) return;
      setLogs((data ?? []) as UsageLog[]);
      setLoading(false);
    };
    fetchLogs();
    const t = setInterval(fetchLogs, intervalMs);
    return () => { alive = false; clearInterval(t); };
  }, [active, startedAt, intervalMs]);

  const totalCalls = logs.length;
  const successCalls = logs.filter((l) => l.status !== "error").length;
  const errorCalls = totalCalls - successCalls;

  let promptTokens = 0, completionTokens = 0, totalTokens = 0, totalCostUsd = 0;
  const latencies: number[] = [];
  const modelMap = new Map<string, { calls: number; tokens: number; costUsd: number }>();

  for (const l of logs) {
    const p = Number(l.prompt_tokens) || 0;
    const c = Number(l.completion_tokens) || 0;
    promptTokens += p;
    completionTokens += c;
    totalTokens += Number(l.total_tokens) || (p + c);
    const cost = computeAICost({ model: l.model, promptTokens: p, completionTokens: c, totalTokens: Number(l.total_tokens) || undefined });
    totalCostUsd += cost;
    if (typeof l.latency_ms === "number") latencies.push(l.latency_ms);
    const key = l.model || "unknown";
    const cur = modelMap.get(key) || { calls: 0, tokens: 0, costUsd: 0 };
    cur.calls += 1;
    cur.tokens += (Number(l.total_tokens) || (p + c));
    cur.costUsd += cost;
    modelMap.set(key, cur);
  }

  const avgLatencyMs = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;
  const p50LatencyMs = Math.round(percentile(latencies, 50));
  const p95LatencyMs = Math.round(percentile(latencies, 95));

  // Calls per minute over the actual elapsed window since startedAt (capped at 10 min for stability).
  const elapsedMin = startedAt ? Math.max(1 / 60, Math.min(10, (Date.now() - startedAt) / 60_000)) : 1;
  const callsPerMinute = totalCalls / elapsedMin;

  const modelBreakdown = [...modelMap.entries()]
    .map(([model, v]) => ({ model, ...v }))
    .sort((a, b) => b.calls - a.calls);

  // Heatmap: last 60 seconds, value = number of calls finishing in that second
  const nowMs = Date.now();
  const heatmapPerSec = Array.from({ length: 60 }, () => 0);
  for (const l of logs) {
    const t = new Date(l.created_at).getTime();
    const ago = Math.floor((nowMs - t) / 1000);
    if (ago >= 0 && ago < 60) heatmapPerSec[59 - ago] += 1;
  }

  // Latency sparkline — last 30 calls (chronological)
  const latencySparkline = logs
    .slice(0, 30)
    .reverse()
    .map((l) => Number(l.latency_ms) || 0);

  // Calls/5s buckets — last 60 buckets (5 minutes window)
  const buckets = Array.from({ length: 60 }, () => 0);
  for (const l of logs) {
    const t = new Date(l.created_at).getTime();
    const bucket = Math.floor((nowMs - t) / 5000);
    if (bucket >= 0 && bucket < 60) buckets[59 - bucket] += 1;
  }

  return {
    loading,
    logs,
    totalCalls,
    successCalls,
    errorCalls,
    totalTokens,
    promptTokens,
    completionTokens,
    totalCostUsd,
    totalCostInr: totalCostUsd * USD_TO_INR,
    avgLatencyMs,
    p50LatencyMs,
    p95LatencyMs,
    callsPerMinute,
    modelBreakdown,
    heatmapPerSec,
    latencySparkline,
    callsSparkline: buckets,
  };
}
