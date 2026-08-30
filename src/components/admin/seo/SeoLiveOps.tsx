// Live operations, real impact reporting and the approval workspace for the
// AI SEO Intelligence Center.
//
// Everything on this screen mirrors recorded backend state:
//   • job rows (queued / running / done / failed) from seo_intel_jobs
//   • daily rollups from seo_intel_daily_snapshots
//   • before/after experiments measured against Search Console history
// There are no simulated counters, no fake progress bars and no invented
// numbers — when the backend has nothing recorded, we say so.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, Clock, Eye,
  Loader2, Minus, Pause, PlayCircle, RefreshCw, ShieldCheck, XCircle,
} from "lucide-react";

/* ───────────────────────── shared helpers ───────────────────────── */

export const callControl = async (action: string, payload: Record<string, unknown> = {}) => {
  const { data, error } = await supabase.functions.invoke("seo-intel-control", { body: { action, ...payload } });
  if (error) {
    let detail = error.message;
    try { detail = (await (error as any).context?.text?.()) ?? detail; } catch { /* ignore */ }
    throw new Error(detail);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as any;
};

const n = (v: any) => (v === null || v === undefined ? "—" : Number(v).toLocaleString("en-IN"));
const d1 = (v: any, p = 1) => (v === null || v === undefined ? "—" : Number(v).toFixed(p));
const when = (v: any) =>
  v ? new Date(v).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "Never";

const ago = (v: any) => {
  if (!v) return "never";
  const s = Math.max(0, Math.round((Date.now() - new Date(v).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

const ahead = (v: any) => {
  if (!v) return "not scheduled";
  const s = Math.round((new Date(v).getTime() - Date.now()) / 1000);
  if (s <= 0) return "due now";
  if (s < 60) return `in ${s}s`;
  if (s < 3600) return `in ${Math.round(s / 60)}m`;
  return `in ${Math.round(s / 3600)}h`;
};

const runningFor = (v: any) => {
  if (!v) return "";
  const s = Math.max(0, Math.round((Date.now() - new Date(v).getTime()) / 1000));
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
};

const tone: Record<string, string> = {
  done: "bg-emerald-100 text-emerald-800 border-emerald-200",
  running: "bg-sky-100 text-sky-800 border-sky-200",
  queued: "bg-amber-100 text-amber-800 border-amber-200",
  parked: "bg-orange-100 text-orange-800 border-orange-200",
  failed: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-muted text-muted-foreground border-border",
  connected: "bg-emerald-100 text-emerald-800 border-emerald-200",
  error: "bg-red-100 text-red-800 border-red-200",
  not_connected: "bg-muted text-muted-foreground border-border",
};

const Empty = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">{children}</div>
);

/* ───────────────────────── live status hook ───────────────────────── */

export type LiveStatus = {
  engine: { enabled: boolean; running: boolean; reason: string | null; paused_reason: string | null; last_full_scan_at: string | null; last_report_at: string | null };
  running: any[];
  queued: any[];
  recent: any[];
  throughput: Record<string, { runs: number; records: number; failed: number; last_finished_at: string | null }>;
  failures_24h: number;
  next_scan_at: string | null;
  sources: any[];
  freshness: Record<string, string | null>;
  server_time: string;
  job_labels: Record<string, string>;
};

export const useLiveStatus = (intervalMs = 5000) => {
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const data = await callControl("live_status");
      if (alive.current) { setStatus(data); setError(null); }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    load();
    const id = setInterval(load, intervalMs);
    return () => { alive.current = false; clearInterval(id); };
  }, [load, intervalMs]);

  return { status, error, reload: load };
};

/* ───────────────────────── live operations panel ───────────────────────── */

export const LiveOperationsPanel = ({
  status, error, reload, onRunStage,
}: {
  status: LiveStatus | null;
  error: string | null;
  reload: () => void;
  onRunStage: (types: string[], label: string) => Promise<void>;
}) => {
  const [busy, setBusy] = useState<string | null>(null);
  const [, tick] = useState(0);
  // Re-render once a second so "running for" durations stay honest — the numbers
  // themselves still come only from the recorded started_at timestamps.
  useEffect(() => { const id = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(id); }, []);

  const run = async (types: string[], label: string) => {
    setBusy(label);
    try { await onRunStage(types, label); await reload(); } finally { setBusy(null); }
  };

  if (error) {
    return <Empty>Could not read live engine state: {error}</Empty>;
  }
  if (!status) {
    return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Reading engine state…</div>;
  }

  const e = status.engine;
  const stateText = !e.enabled ? "Stopped" : e.running ? (status.running.length ? "Working" : "Idle — waiting for next scan") : "Paused";
  const stateTone = !e.enabled ? "bg-muted text-muted-foreground" : e.running ? (status.running.length ? "bg-sky-100 text-sky-800" : "bg-emerald-100 text-emerald-800") : "bg-amber-100 text-amber-800";

  const freshnessRows = [
    ["Search Console performance", status.freshness.performance],
    ["Page crawl", status.freshness.crawl],
    ["Page speed (Core Web Vitals)", status.freshness.speed],
    ["Indexing state", status.freshness.indexing],
    ["Crawler-view check", status.freshness.crawler_view],
    ["Keyword positions", status.freshness.keywords],
  ] as [string, string | null][];

  return (
    <div className="space-y-4">
      {/* what is happening right now */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-4 w-4" /> What the system is doing right now
              </CardTitle>
              <CardDescription>
                Live job rows from the server. Last read {ago(status.server_time)} · next scheduled scan {ahead(status.next_scan_at)}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={stateTone}>{stateText}</Badge>
              <Button size="sm" variant="ghost" onClick={reload}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {(e.paused_reason || e.reason) && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <Pause className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{e.paused_reason || e.reason}</span>
            </div>
          )}

          {status.running.length === 0 ? (
            <Empty>Nothing is running at this moment. The next scheduled stage starts {ahead(status.next_scan_at)}.</Empty>
          ) : (
            <div className="space-y-2">
              {status.running.map((j) => (
                <div key={j.id} className="rounded-md border bg-sky-50/50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-medium">
                      <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
                      {j.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      running {runningFor(j.started_at)} · started {when(j.started_at)}
                      {j.retry_count > 0 && ` · retry ${j.retry_count}`}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {j.records_processed != null
                      ? `${n(j.records_processed)} records written so far (reported by the worker)`
                      : "Worker has not reported a record count for this stage yet."}
                    {j.triggered_by ? ` · triggered by ${j.triggered_by}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {[
              { label: "Scan website", types: ["crawl_pages"] },
              { label: "Fetch search data", types: ["gsc_pages", "gsc_queries"] },
              { label: "Check rankings", types: ["rank_track"] },
              { label: "Analyze keywords", types: ["keyword_metrics"] },
              { label: "Research competitors", types: ["competitor_scan"] },
              { label: "Check page speed", types: ["speed_audit"] },
              { label: "Crawler view", types: ["live_crawl"] },
              { label: "Check indexing", types: ["index_check"] },
              { label: "AI recommendations", types: ["analyze"] },
              { label: "Verify applied changes", types: ["verify"] },
              { label: "Record daily snapshot", types: ["daily_snapshot"] },
            ].map((s) => (
              <Button key={s.label} size="sm" variant="outline" disabled={!!busy} onClick={() => run(s.types, s.label)}>
                {busy === s.label ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
                {s.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* queue */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Queued next</CardTitle>
            <CardDescription>{status.queued.length} stage(s) waiting in the server queue</CardDescription>
          </CardHeader>
          <CardContent>
            {status.queued.length === 0 ? <Empty>Queue is empty.</Empty> : (
              <div className="space-y-1.5">
                {status.queued.map((j) => (
                  <div key={j.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                    <span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-muted-foreground" /> {j.label}</span>
                    <span className="text-xs text-muted-foreground">{ahead(j.scheduled_for)}{j.status === "parked" ? " · parked" : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* throughput 24h */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Processed in the last 24 hours</CardTitle>
            <CardDescription>Actual records written per stage · {status.failures_24h} failure(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(status.throughput).length === 0 ? <Empty>No stage has completed in the last 24 hours.</Empty> : (
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Stage</TableHead><TableHead className="text-right">Runs</TableHead><TableHead className="text-right">Records</TableHead><TableHead className="text-right">Failed</TableHead><TableHead className="text-right">Last</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(status.throughput).map(([type, t]) => (
                    <TableRow key={type}>
                      <TableCell>{status.job_labels[type] ?? type}</TableCell>
                      <TableCell className="text-right">{t.runs}</TableCell>
                      <TableCell className="text-right">{n(t.records)}</TableCell>
                      <TableCell className={`text-right ${t.failed ? "text-red-600 font-medium" : ""}`}>{t.failed}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">{ago(t.last_finished_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* freshness + sources */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Data freshness</CardTitle>
            <CardDescription>Newest timestamp recorded against any tracked page</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {freshnessRows.map(([label, v]) => (
              <div key={label} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                <span>{label}</span>
                <span className="text-xs text-muted-foreground">{v ? `${ago(v)} · ${when(v)}` : "Never collected"}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Connected data sources</CardTitle>
            <CardDescription>Real connector state — a source in error stops its stage instead of guessing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {status.sources.length === 0 ? <Empty>No sources registered.</Empty> : status.sources.map((s) => (
              <div key={s.source_key} className="rounded border px-3 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{s.label}</span>
                  <Badge variant="outline" className={tone[s.status] ?? tone.not_connected}>{String(s.status ?? "unknown").replace("_", " ")}</Badge>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  synced {ago(s.last_sync_at)} · next {ahead(s.next_sync_at)}
                </div>
                {s.last_error && <div className="mt-1 text-xs text-red-600">{s.last_error}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* recent history */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recently finished</CardTitle>
          <CardDescription>Completed and failed stages, newest first</CardDescription>
        </CardHeader>
        <CardContent>
          {status.recent.length === 0 ? <Empty>No completed runs recorded yet.</Empty> : (
            <ScrollArea className="h-[320px]">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Stage</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Records</TableHead><TableHead>Finished</TableHead><TableHead>Detail</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {status.recent.map((j) => (
                    <TableRow key={j.id}>
                      <TableCell className="whitespace-nowrap">{j.label}</TableCell>
                      <TableCell><Badge variant="outline" className={tone[j.status] ?? ""}>{j.status}</Badge></TableCell>
                      <TableCell className="text-right">{n(j.records_processed)}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{ago(j.finished_at)}</TableCell>
                      <TableCell className="max-w-[340px] truncate text-xs text-red-600">{j.error ?? ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/* ───────────────────────── impact & change report ───────────────────────── */

const METRIC_LABELS: Record<string, string> = {
  clicks: "Organic clicks",
  impressions: "Impressions",
  ctr: "CTR (%)",
  avg_position: "Average position",
  ranking_keywords: "Ranking keywords",
  rank_1: "Rank #1",
  top_3_calc: "Top 3",
  top_5: "Top 5",
  top_10: "Top 10",
  top_20: "Top 20",
  indexed_pages: "Indexed pages",
  avg_health: "Avg SEO health score",
  avg_psi_perf: "Avg PageSpeed score",
  avg_lcp_ms: "Avg LCP (ms)",
};

const DeltaCell = ({ m }: { m: any }) => {
  if (m.status === "no_data") return <span className="text-xs text-muted-foreground">No data recorded</span>;
  if (m.status === "awaiting_baseline") return <span className="text-xs text-muted-foreground">Awaiting baseline</span>;
  if (m.status === "unchanged" || m.delta === 0) return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Minus className="h-3 w-3" /> No change</span>;
  const better = m.lower_is_better ? m.delta < 0 : m.delta > 0;
  const Icon = m.delta > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${better ? "text-emerald-600" : "text-red-600"}`}>
      <Icon className="h-3.5 w-3.5" />{m.delta > 0 ? "+" : ""}{d1(m.delta, 2)}
    </span>
  );
};

const WindowTable = ({ w, title }: { w: any; title: string }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base">{title}</CardTitle>
      <CardDescription>
        {w.comparable
          ? `${w.baseline_date} → ${w.current_date}, from recorded daily snapshots`
          : "Not enough recorded history yet — snapshots are stored twice a day, so this window fills in as data accumulates."}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow><TableHead>Metric</TableHead><TableHead className="text-right">Then</TableHead><TableHead className="text-right">Now</TableHead><TableHead className="text-right">Change</TableHead></TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(w.metrics).map(([key, m]: any) => (
            <TableRow key={key}>
              <TableCell>{METRIC_LABELS[key] ?? key}</TableCell>
              <TableCell className="text-right">{n(m.previous)}</TableCell>
              <TableCell className="text-right font-medium">{n(m.current)}</TableCell>
              <TableCell className="text-right"><div className="flex justify-end"><DeltaCell m={m} /></div></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

export const ImpactReportPanel = ({ onRunStage }: { onRunStage: (types: string[], label: string) => Promise<void> }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [win, setWin] = useState<"today" | "d7" | "d30">("d7");

  const load = useCallback(async () => {
    try { setData(await callControl("impact_report")); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading recorded impact history…</div>;
  if (!data) return <Empty>Impact history unavailable.</Empty>;

  const c = data.changes;
  const groups: [string, string, any[], string][] = [
    ["improved", "Improved", c.improved, "text-emerald-700"],
    ["declined", "Declined", c.declined, "text-red-700"],
    ["unchanged", "No change yet", c.unchanged, "text-muted-foreground"],
    ["analyzing", "Still being analyzed", c.analyzing, "text-sky-700"],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {(["today", "d7", "d30"] as const).map((k) => (
            <Button key={k} size="sm" variant={win === k ? "default" : "outline"} onClick={() => setWin(k)}>
              {k === "today" ? "Today" : k === "d7" ? "7 days" : "30 days"}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={async () => { setBusy(true); try { await onRunStage(["daily_snapshot"], "Snapshot"); await load(); } finally { setBusy(false); } }}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Record snapshot now
          </Button>
          <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
        </div>
      </div>

      {!data.has_history && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          No daily snapshots have been recorded yet, so before/after comparison is not possible. Record one now to start the history.
        </div>
      )}

      <WindowTable w={data.windows[win]} title={win === "today" ? "Since the previous snapshot" : win === "d7" ? "Last 7 days" : "Last 30 days"} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Changes we made, and what happened</CardTitle>
            <CardDescription>Each row is a recorded before/after experiment measured against Search Console</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {groups.map(([key, label, rows, cls]) => (
              <div key={key}>
                <div className={`mb-1 text-sm font-semibold ${cls}`}>{label} ({rows.length})</div>
                {rows.length === 0 ? (
                  <div className="text-xs text-muted-foreground">None.</div>
                ) : (
                  <div className="space-y-1.5">
                    {rows.slice(0, 8).map((x: any) => (
                      <div key={x.id} className="rounded border px-3 py-2 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium">{x.path}</span>
                          <span className="text-xs text-muted-foreground">changed {x.changed_on}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">{x.change_type}: {x.change_summary}</div>
                        <div className="mt-1 text-xs">
                          {x.result_captured_on
                            ? <>position {d1(x.baseline_position, 2)} → {d1(x.result_position, 2)} · clicks {n(x.baseline_clicks)} → {n(x.result_clicks)} (measured {x.result_captured_on})</>
                            : <>baseline position {d1(x.baseline_position, 2)}, clicks {n(x.baseline_clicks)} — result not measured yet{x.measure_after ? `, measuring after ${String(x.measure_after).slice(0, 10)}` : ""}</>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Keyword movement from recorded rank history</CardTitle>
            <CardDescription>
              {data.movement.improved.length} up · {data.movement.declined.length} down · {data.movement.unchanged} flat ·
              {" "}{data.movement.insufficient_history} without enough history
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.movement.improved.length + data.movement.declined.length === 0 ? (
              <Empty>No keyword has two or more recorded position readings yet.</Empty>
            ) : (
              <ScrollArea className="h-[420px]">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Keyword</TableHead><TableHead className="text-right">From</TableHead><TableHead className="text-right">To</TableHead><TableHead className="text-right">Move</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...data.movement.improved, ...data.movement.declined].map((k: any) => (
                      <TableRow key={k.keyword}>
                        <TableCell className="max-w-[240px] truncate">{k.keyword}</TableCell>
                        <TableCell className="text-right">{d1(k.from, 1)}</TableCell>
                        <TableCell className="text-right font-medium">{d1(k.to, 1)}</TableCell>
                        <TableCell className={`text-right text-xs font-medium ${k.delta > 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {k.delta > 0 ? "+" : ""}{d1(k.delta, 1)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Change log</CardTitle>
          <CardDescription>Every applied or approved change, with the value before and after</CardDescription>
        </CardHeader>
        <CardContent>
          {(data.audit ?? []).length === 0 ? <Empty>No changes recorded yet.</Empty> : (
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>When</TableHead><TableHead>Action</TableHead><TableHead>Page</TableHead><TableHead>Before</TableHead><TableHead>After</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {data.audit.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{when(a.created_at)}</TableCell>
                      <TableCell className="text-xs">{a.action}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs">{a.path ?? "—"}</TableCell>
                      <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">{asText(a.before_value)}</TableCell>
                      <TableCell className="max-w-[220px] truncate text-xs">{asText(a.after_value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/* ───────────────────────── approval workspace ───────────────────────── */

export const ApprovalPanel = ({ onChanged }: { onChanged?: () => void }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<any>(null);

  const load = useCallback(async () => {
    try { setData(await callControl("approval_queue")); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const doAct = async (rec: any, act: string) => {
    setBusy(`${rec.id}:${act}`);
    try {
      const res = await callControl("rec_action", { id: rec.id, act });
      toast.success(res.note ?? `${act} done`);
      await load();
      onChanged?.();
      if (preview?.id === rec.id) setPreview(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading approval queue…</div>;
  if (!data) return <Empty>Approval queue unavailable.</Empty>;

  const Row = ({ r, stage }: { r: any; stage: "pending" | "approved" | "applied" }) => (
    <div className="rounded-md border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-medium">{r.path ?? r.keyword ?? "Site-wide"}</div>
          <div className="text-xs text-muted-foreground">{r.change_type} · priority {r.priority ?? "—"}{r.data_source ? ` · source: ${r.data_source}` : ""}</div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setPreview(r)}><Eye className="mr-1.5 h-3.5 w-3.5" /> Review</Button>
          {stage === "pending" && (
            <>
              <Button size="sm" disabled={!!busy} onClick={() => doAct(r, "approve")}>
                {busy === `${r.id}:approve` ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />} Approve
              </Button>
              <Button size="sm" variant="ghost" disabled={!!busy} onClick={() => doAct(r, "reject")}>
                <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject
              </Button>
            </>
          )}
          {stage === "approved" && (
            r.can_auto_apply ? (
              <Button size="sm" disabled={!!busy} onClick={() => doAct(r, "apply")}>
                {busy === `${r.id}:apply` ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="mr-1.5 h-3.5 w-3.5" />} Apply automatically
              </Button>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-800">Manual task created</Badge>
            )
          )}
          {stage === "applied" && (
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => doAct(r, "verify")}>
              {busy === `${r.id}:verify` ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />} Verify impact
            </Button>
          )}
        </div>
      </div>
      <div className="mt-1.5 text-sm">{r.recommended_change}</div>
      {r.problem && <div className="mt-1 text-xs text-muted-foreground">Problem: {r.problem}</div>}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Review → Preview → Approve → Apply → Verify. Title and meta changes can be applied automatically;
          anything else becomes a task for a human, and Search Console actions become a console task.
        </p>
        <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Waiting for your approval ({data.pending.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.pending.length === 0 ? <Empty>Nothing needs approval right now.</Empty>
              : <ScrollArea className="h-[520px] pr-3"><div className="space-y-2">{data.pending.map((r: any) => <Row key={r.id} r={r} stage="pending" />)}</div></ScrollArea>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Approved, ready to execute ({data.approved.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.approved.length === 0 ? <Empty>Nothing approved is pending execution.</Empty>
              : <ScrollArea className="h-[520px] pr-3"><div className="space-y-2">{data.approved.map((r: any) => <Row key={r.id} r={r} stage="approved" />)}</div></ScrollArea>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Applied, awaiting verification ({data.applied.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.applied.length === 0 ? <Empty>No applied change is waiting to be measured.</Empty>
              : <ScrollArea className="h-[520px] pr-3"><div className="space-y-2">{data.applied.map((r: any) => <Row key={r.id} r={r} stage="applied" />)}</div></ScrollArea>}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Manual tasks ({data.tasks.length})</CardTitle>
            <CardDescription>Approved changes that need a person to edit content</CardDescription>
          </CardHeader>
          <CardContent>
            {data.tasks.length === 0 ? <Empty>No open tasks.</Empty> : (
              <ScrollArea className="h-[260px]">
                <div className="space-y-1.5">
                  {data.tasks.map((t: any) => (
                    <div key={t.id} className="rounded border px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{t.path ?? t.keyword}</span>
                        <Badge variant="outline">{t.status}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{t.recommendation}</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Search Console actions ({data.console_tasks.length})</CardTitle>
            <CardDescription>Steps that must be done inside Google Search Console</CardDescription>
          </CardHeader>
          <CardContent>
            {data.console_tasks.length === 0 ? <Empty>No console actions pending.</Empty> : (
              <ScrollArea className="h-[260px]">
                <div className="space-y-1.5">
                  {data.console_tasks.map((t: any) => (
                    <div key={t.id} className="rounded border px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{t.title ?? t.action ?? t.url}</span>
                        <Badge variant="outline">{t.status}</Badge>
                      </div>
                      {t.instructions && <div className="text-xs text-muted-foreground">{t.instructions}</div>}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview change</DialogTitle>
            <DialogDescription>{preview?.path ?? preview?.keyword}</DialogDescription>
          </DialogHeader>
          {preview && (
            <div className="space-y-3 text-sm">
              <div><span className="font-semibold">Change type:</span> {preview.change_type}</div>
              <div><span className="font-semibold">Problem:</span> {preview.problem ?? "—"}</div>
              <div><span className="font-semibold">Recommendation:</span> {preview.recommended_change}</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded border p-2">
                  <div className="mb-1 text-xs font-semibold text-muted-foreground">Before</div>
                  <div className="whitespace-pre-wrap break-words text-xs">{preview.before_value ?? "— (nothing recorded)"}</div>
                </div>
                <div className="rounded border p-2">
                  <div className="mb-1 text-xs font-semibold text-muted-foreground">After</div>
                  <div className="whitespace-pre-wrap break-words text-xs">{preview.after_value ?? "— (needs a human edit)"}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Evidence source: {preview.data_source ?? "not recorded"}
                {preview.opportunity_score != null && ` · opportunity score ${d1(preview.opportunity_score, 1)}`}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ───────────────────── live intelligence overview ───────────────────── */

export const IntelligenceOverview = ({ status }: { status: LiveStatus | null }) => {
  const [snap, setSnap] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("seo_intel_daily_snapshots")
        .select("*").order("captured_on", { ascending: false }).limit(2);
      setSnap(data?.[0] ?? null);
      setLoading(false);
    })();
  }, []);

  const buckets = useMemo(() => {
    if (!snap) return [];
    const top3 = (snap.rank_1 ?? 0) + (snap.rank_2 ?? 0) + (snap.rank_3 ?? 0);
    return [
      { label: "Rank #1", value: snap.rank_1 },
      { label: "Rank #2", value: snap.rank_2 },
      { label: "Rank #3", value: snap.rank_3 },
      { label: "Top 3", value: top3 },
      { label: "Top 5", value: snap.top_5 },
      { label: "Top 10", value: snap.top_10 },
      { label: "Top 20", value: snap.top_20 },
      { label: "Ranking keywords", value: snap.ranking_keywords },
    ];
  }, [snap]);

  if (loading) return <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading recorded metrics…</div>;
  if (!snap) return <Empty>No daily snapshot recorded yet. Run “Record daily snapshot” in Live operations to capture the first one.</Empty>;

  const cards = [
    { label: "Organic clicks", value: n(snap.clicks), src: "Search Console (actual)" },
    { label: "Impressions", value: n(snap.impressions), src: "Search Console (actual)" },
    { label: "CTR", value: snap.ctr == null ? "—" : `${d1(snap.ctr, 2)}%`, src: "Calculated from actuals" },
    { label: "Average position", value: d1(snap.avg_position, 2), src: "Search Console (actual)" },
    { label: "Indexed pages", value: n(snap.indexed_pages), src: "URL Inspection (actual)" },
    { label: "Pages tracked", value: n(snap.pages_tracked), src: "Internal" },
    { label: "SEO health score", value: d1(snap.avg_health, 1), src: "Calculated" },
    { label: "PageSpeed score", value: d1(snap.avg_psi_perf, 0), src: "PageSpeed (actual)" },
    { label: "Avg LCP", value: snap.avg_lcp_ms == null ? "—" : `${n(Math.round(snap.avg_lcp_ms))} ms`, src: "PageSpeed (actual)" },
    { label: "Gains", value: n(snap.gains), src: "Recorded position change" },
    { label: "Losses", value: n(snap.losses), src: "Recorded position change" },
    { label: "Applied changes", value: n(snap.applied_changes), src: "Internal" },
  ];

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground">
        Snapshot recorded on {snap.captured_on}
        {status?.running?.length ? ` · ${status.running.length} stage(s) running right now` : ""}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        {cards.map((c) => (
          <div key={c.label} className="rounded-lg border p-3">
            <div className="text-xl font-semibold">{c.value}</div>
            <div className="text-xs font-medium">{c.label}</div>
            <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{c.src}</div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ranking distribution</CardTitle>
          <CardDescription>Counted from the positions actually recorded for tracked keywords</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
            {buckets.map((b) => (
              <div key={b.label} className="rounded-lg border bg-muted/30 p-3 text-center">
                <div className="text-lg font-semibold">{n(b.value)}</div>
                <div className="text-xs text-muted-foreground">{b.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Coverage: {n(snap.coverage?.keywords_with_position)} of {n(snap.coverage?.keywords_total)} keywords have a recorded position ·
            {" "}{n(snap.coverage?.pages_with_speed)} pages have a speed audit ·
            {" "}{n(snap.coverage?.pages_with_index_state)} pages have an indexing state.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
