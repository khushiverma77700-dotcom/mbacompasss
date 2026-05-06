import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2, XCircle, Loader2, Pause, Play, X, Cpu, Activity, Zap, Clock,
  Coins, Server, Gauge, FileText, Search, Download, Wifi, MemoryStick, BarChart3, Flame,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";

export type ItemStatus = "pending" | "running" | "ok" | "fail" | "skipped";

export interface BulkItem {
  key: string;
  name: string;
  contentType: string;
  status: ItemStatus;
  startedAt?: number;
  finishedAt?: number;
  durationMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cost?: number;
  oldScore?: number;
  newScore?: number;
  error?: string;
  step?: string;
  saveStatus?: "pending" | "saving" | "snapshot_saved" | "db_applied" | "verified" | "failed";
  savedAt?: number;
  snapshotId?: string;
  dbUpdated?: boolean;
  verified?: boolean;
  changedFields?: string[];
}

export interface LogEntry {
  ts: number;
  level: "info" | "ok" | "warn" | "error";
  msg: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  items: BulkItem[];
  logs: LogEntry[];
  paused: boolean;
  onPauseToggle: () => void;
  onCancel: () => void;
  finished: boolean;
  startedAt: number | null;
  model: string;
}

function fmtMs(ms?: number) {
  if (ms == null || ms < 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60); const r = Math.round(s - m * 60);
  return `${m}m ${r}s`;
}
function fmtCost(usd?: number) {
  if (usd == null) return "$0.0000";
  return `$${usd.toFixed(4)}`;
}
function fmtTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0");
}

const StatusBadge = ({ s }: { s: ItemStatus }) => {
  if (s === "ok") return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1"><CheckCircle2 className="w-3 h-3" />Done</Badge>;
  if (s === "fail") return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Failed</Badge>;
  if (s === "running") return <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/30 gap-1"><Loader2 className="w-3 h-3 animate-spin" />Running</Badge>;
  if (s === "skipped") return <Badge variant="outline">Skipped</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">Queued</Badge>;
};

interface Sample {
  t: number;
  completed: number;
  totalTokens: number;
  totalCost: number;
  fps: number;
  memMb: number;
  longTasks: number;
  rtt: number;
  running: number;
  // derived per-second deltas
  pagesPerSec: number;
  tokensPerSec: number;
  costPerMin: number;
}

const HEATMAP_COLS = 60; // last 60 seconds
const HEATMAP_ROWS = 4;  // FPS, Long-tasks, Memory, RTT

export const BulkOptimizeProgressDialog = ({
  open, onOpenChange, items, logs, paused, onPauseToggle, onCancel, finished, startedAt, model,
}: Props) => {
  const [, force] = useState(0);
  useEffect(() => {
    if (!open || finished) return;
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [open, finished]);

  // Browser perf probes
  const [perf, setPerf] = useState<{ memMb?: number; memLimitMb?: number; longTasksPerSec: number; fps: number; online: boolean; rtt?: number }>(
    { longTasksPerSec: 0, fps: 60, online: typeof navigator !== "undefined" ? navigator.onLine : true, rtt: (typeof navigator !== "undefined" ? (navigator as any).connection?.rtt : undefined) }
  );
  const longTaskCountRef = useRef(0);
  const frameCountRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  // Time-series samples (1 per second)
  const samplesRef = useRef<Sample[]>([]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const lastSnapRef = useRef<{ completed: number; totalTokens: number; totalCost: number } | null>(null);

  // Derived stats from items
  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter(i => i.status === "ok").length;
    const failed = items.filter(i => i.status === "fail").length;
    const running = items.filter(i => i.status === "running").length;
    const pending = items.filter(i => i.status === "pending").length;
    const skipped = items.filter(i => i.status === "skipped").length;
    const completed = done + failed;
    const verifiedSaves = items.filter(i => i.saveStatus === "verified" || i.verified).length;
    const dbApplied = items.filter(i => i.dbUpdated).length;
    const totalTokens = items.reduce((s, i) => s + (i.totalTokens || 0), 0);
    const promptTokens = items.reduce((s, i) => s + (i.promptTokens || 0), 0);
    const completionTokens = items.reduce((s, i) => s + (i.completionTokens || 0), 0);
    const totalCost = items.reduce((s, i) => s + (i.cost || 0), 0);
    const finishedItems = items.filter(i => i.durationMs && (i.status === "ok" || i.status === "fail"));
    const avgMs = finishedItems.length ? finishedItems.reduce((s, i) => s + (i.durationMs || 0), 0) / finishedItems.length : 0;
    const elapsed = startedAt ? Date.now() - startedAt : 0;
    const remaining = total - completed;
    const eta = avgMs && remaining > 0 ? Math.round(avgMs * remaining) : 0;
    const speed = elapsed > 0 ? (completed / (elapsed / 60000)) : 0;
    const successRate = completed > 0 ? Math.round((done / completed) * 100) : 100;
    const minDur = finishedItems.length ? Math.min(...finishedItems.map(i => i.durationMs!)) : 0;
    const maxDur = finishedItems.length ? Math.max(...finishedItems.map(i => i.durationMs!)) : 0;
    const avgTokens = finishedItems.length ? Math.round(totalTokens / finishedItems.length) : 0;
    const avgCost = finishedItems.length ? totalCost / finishedItems.length : 0;
    const projectedTotalCost = total > 0 && finishedItems.length > 0 ? avgCost * total : totalCost;
    return {
      total, done, failed, running, pending, skipped, completed,
      verifiedSaves, dbApplied,
      totalTokens, promptTokens, completionTokens, totalCost,
      avgMs, elapsed, eta, speed, successRate, minDur, maxDur,
      avgTokens, avgCost, projectedTotalCost,
    };
  }, [items, startedAt]);

  // 1Hz sampler — drives all live charts/heatmap with REAL numbers
  useEffect(() => {
    if (!open) return;
    let observer: PerformanceObserver | null = null;
    try {
      observer = new PerformanceObserver((list) => { longTaskCountRef.current += list.getEntries().length; });
      observer.observe({ entryTypes: ["longtask"] as any });
    } catch { /* unsupported */ }

    const tickFrame = () => { frameCountRef.current += 1; rafRef.current = requestAnimationFrame(tickFrame); };
    rafRef.current = requestAnimationFrame(tickFrame);

    const id = window.setInterval(() => {
      const m = (performance as any).memory;
      const memMb = m?.usedJSHeapSize ? Math.round(m.usedJSHeapSize / 1024 / 1024) : 0;
      const memLimitMb = m?.jsHeapSizeLimit ? Math.round(m.jsHeapSizeLimit / 1024 / 1024) : 0;
      const fps = frameCountRef.current;
      const longTasks = longTaskCountRef.current;
      const rtt = (navigator as any).connection?.rtt ?? 0;

      setPerf({
        memMb, memLimitMb,
        longTasksPerSec: longTasks,
        fps,
        online: navigator.onLine,
        rtt,
      });

      // Sample (use latest stats via closure-safe read from items)
      const snapCompleted = items.filter(i => i.status === "ok" || i.status === "fail").length;
      const snapTokens = items.reduce((s, i) => s + (i.totalTokens || 0), 0);
      const snapCost = items.reduce((s, i) => s + (i.cost || 0), 0);
      const last = lastSnapRef.current;
      const dPages = last ? Math.max(0, snapCompleted - last.completed) : 0;
      const dTokens = last ? Math.max(0, snapTokens - last.totalTokens) : 0;
      const dCost = last ? Math.max(0, snapCost - last.totalCost) : 0;
      lastSnapRef.current = { completed: snapCompleted, totalTokens: snapTokens, totalCost: snapCost };

      const sample: Sample = {
        t: Date.now(),
        completed: snapCompleted,
        totalTokens: snapTokens,
        totalCost: snapCost,
        fps,
        memMb,
        longTasks,
        rtt,
        running: items.filter(i => i.status === "running").length,
        pagesPerSec: dPages,
        tokensPerSec: dTokens,
        costPerMin: dCost * 60,
      };
      const next = [...samplesRef.current, sample].slice(-HEATMAP_COLS);
      samplesRef.current = next;
      setSamples(next);

      longTaskCountRef.current = 0;
      frameCountRef.current = 0;
    }, 1000);
    return () => {
      observer?.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearInterval(id);
    };
  }, [open, items]);

  const pct = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
  const currentItem = items.find(i => i.status === "running");

  // Pages tab: search + filter
  const [pageSearch, setPageSearch] = useState("");
  const [pageFilter, setPageFilter] = useState<"all" | ItemStatus>("all");
  const filteredItems = useMemo(() => {
    return items.filter(i =>
      (pageFilter === "all" || i.status === pageFilter) &&
      (pageSearch === "" || i.name.toLowerCase().includes(pageSearch.toLowerCase()))
    );
  }, [items, pageSearch, pageFilter]);

  // Logs tab: auto-scroll
  const logScrollRef = useRef<HTMLDivElement | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  useEffect(() => {
    if (!autoScroll || !logScrollRef.current) return;
    logScrollRef.current.scrollTop = logScrollRef.current.scrollHeight;
  }, [logs, autoScroll]);

  const exportReport = () => {
    const csv = [
      ["Page", "Type", "Status", "Duration (ms)", "Prompt Tokens", "Completion Tokens", "Total Tokens", "Cost ($)", "Old Score", "New Score", "Error"].join(","),
      ...items.map(i => [
        JSON.stringify(i.name), i.contentType, i.status, i.durationMs ?? "",
        i.promptTokens ?? "", i.completionTokens ?? "", i.totalTokens ?? "",
        i.cost?.toFixed(6) ?? "", i.oldScore ?? "", i.newScore ?? "",
        JSON.stringify(i.error ?? ""),
      ].join(","))
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `bulk-seo-report-${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Chart datasets — real numbers
  const chartData = useMemo(
    () => samples.map(s => ({
      time: new Date(s.t).toLocaleTimeString([], { hour12: false }).slice(3),
      pagesPerMin: +(s.pagesPerSec * 60).toFixed(2),
      tokensPerSec: s.tokensPerSec,
      costPerMin: +s.costPerMin.toFixed(4),
      fps: s.fps,
      mem: s.memMb,
      longTasks: s.longTasks,
      rtt: s.rtt,
      completed: s.completed,
    })),
    [samples]
  );

  const durationBars = useMemo(() => {
    return items
      .filter(i => i.durationMs && (i.status === "ok" || i.status === "fail"))
      .slice(-30)
      .map(i => ({
        name: i.name.length > 16 ? i.name.slice(0, 14) + "…" : i.name,
        ms: i.durationMs!,
        cost: i.cost ?? 0,
        tokens: i.totalTokens ?? 0,
        status: i.status,
      }));
  }, [items]);

  const statusPie = useMemo(() => ([
    { name: "Done", value: stats.done, color: "hsl(142 71% 45%)" },
    { name: "Failed", value: stats.failed, color: "hsl(0 84% 60%)" },
    { name: "Running", value: stats.running, color: "hsl(217 91% 60%)" },
    { name: "Pending", value: stats.pending, color: "hsl(220 9% 65%)" },
    { name: "Skipped", value: stats.skipped, color: "hsl(45 93% 58%)" },
  ].filter(s => s.value > 0)), [stats]);

  const contentTypeBars = useMemo(() => {
    const map = new Map<string, { name: string; done: number; failed: number; pending: number }>();
    for (const i of items) {
      const k = i.contentType || "unknown";
      if (!map.has(k)) map.set(k, { name: k, done: 0, failed: 0, pending: 0 });
      const e = map.get(k)!;
      if (i.status === "ok") e.done++;
      else if (i.status === "fail") e.failed++;
      else e.pending++;
    }
    return Array.from(map.values());
  }, [items]);

  // Heatmap — last 60s × 4 metrics, normalized 0..1, colored
  const heatRows = useMemo(() => {
    const padded: Sample[] = Array.from({ length: HEATMAP_COLS - samples.length }, () => ({
      t: 0, completed: 0, totalTokens: 0, totalCost: 0, fps: 0, memMb: 0, longTasks: 0, rtt: 0,
      running: 0, pagesPerSec: 0, tokensPerSec: 0, costPerMin: 0,
    } as Sample)).concat(samples);
    const rows = [
      { label: "FPS load", values: padded.map(s => s.fps ? Math.max(0, Math.min(1, (60 - s.fps) / 60)) : 0), invert: false },
      { label: "Long tasks", values: padded.map(s => Math.min(1, s.longTasks / 10)) },
      { label: "Memory", values: padded.map(s => Math.min(1, s.memMb / 1024)) },
      { label: "Throughput", values: padded.map(s => Math.min(1, s.pagesPerSec / 2)) },
    ];
    return rows;
  }, [samples]);

  const fpsTone = perf.fps < 30 ? "warn" : perf.fps < 50 ? "soft-warn" : undefined;
  const memPct = perf.memMb && perf.memLimitMb ? Math.round((perf.memMb / perf.memLimitMb) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[97vw] max-h-[94vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Bulk SEO Optimization — Live Control Panel
            <span className={`ml-2 inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded ${perf.online ? "bg-emerald-500/10 text-emerald-700" : "bg-destructive/10 text-destructive"}`}>
              <Wifi className="w-3 h-3" /> {perf.online ? "ONLINE" : "OFFLINE"}
            </span>
            <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-700">
              <Activity className="w-3 h-3 animate-pulse" /> LIVE 1Hz
            </span>
          </DialogTitle>
          <DialogDescription>
            Real-time enterprise telemetry — every metric below is sampled live from this browser, the AI gateway, and your queue.
          </DialogDescription>
        </DialogHeader>

        {/* Top progress + controls */}
        <div className="px-6 pt-4 space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm min-w-0">
              {finished
                ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                : <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />}
              <span className="font-semibold truncate">
                {finished ? `Optimization complete — ${stats.verifiedSaves}/${stats.total} saves verified` : paused ? "Paused — click Resume to continue" : currentItem ? `Optimizing: ${currentItem.name}` : "Starting…"}
              </span>
              <Badge variant="outline" className="ml-1 font-mono text-[10px] shrink-0">{model.split("/").pop()}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={exportReport} disabled={items.length === 0}>
                <Download className="w-3.5 h-3.5 mr-1" />Export CSV
              </Button>
              {!finished && (
                <Button size="sm" variant="outline" onClick={onPauseToggle}>
                  {paused ? <><Play className="w-3.5 h-3.5 mr-1" />Resume</> : <><Pause className="w-3.5 h-3.5 mr-1" />Pause</>}
                </Button>
              )}
              <Button size="sm" variant={finished ? "default" : "destructive"} onClick={onCancel}>
                <X className="w-3.5 h-3.5 mr-1" />{finished ? "Close" : "Cancel"}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground tabular-nums">{stats.completed} / {stats.total}</span>
            <span className="text-emerald-600 font-medium">✓ {stats.done}</span>
            <span className="text-primary font-medium">Saved {stats.verifiedSaves}</span>
            {stats.failed > 0 && <span className="text-destructive font-medium">✕ {stats.failed}</span>}
            {stats.running > 0 && <span className="text-blue-600 font-medium">▶ {stats.running}</span>}
            <span className="text-muted-foreground">⏳ {stats.pending}</span>
            <span className="font-bold text-primary ml-auto tabular-nums">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2.5" />
        </div>

        {/* KPI tiles */}
        <div className="px-6 pt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 shrink-0">
          <MetricTile icon={Clock} label="Elapsed" value={fmtMs(stats.elapsed)} />
          <MetricTile icon={Clock} label="ETA" value={finished ? "—" : fmtMs(stats.eta)} />
          <MetricTile icon={Gauge} label="Speed" value={`${stats.speed.toFixed(1)}/min`} />
          <MetricTile icon={Activity} label="Avg / page" value={fmtMs(stats.avgMs)} />
          <MetricTile icon={Coins} label="Tokens" value={stats.totalTokens.toLocaleString()} />
          <MetricTile icon={Coins} label="AI cost" value={fmtCost(stats.totalCost)} accent />
          <MetricTile icon={CheckCircle2} label="Success rate" value={`${stats.successRate}%`}
            tone={stats.successRate < 80 ? "warn" : undefined} />
          <MetricTile icon={Server} label="Verified saves" value={`${stats.verifiedSaves}/${stats.total}`} accent={finished && stats.verifiedSaves === stats.total} tone={finished && stats.verifiedSaves < stats.done ? "warn" : undefined} />
        </div>

        {/* Secondary tiles */}
        <div className="px-6 pt-2 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 shrink-0">
          <MetricTile icon={Coins} label="Avg tokens" value={stats.avgTokens.toLocaleString()} />
          <MetricTile icon={Coins} label="Avg cost" value={fmtCost(stats.avgCost)} />
          <MetricTile icon={Coins} label="Projected total" value={fmtCost(stats.projectedTotalCost)} />
          <MetricTile icon={Activity} label="Min / Max page" value={`${fmtMs(stats.minDur)} · ${fmtMs(stats.maxDur)}`} />
          <MetricTile icon={MemoryStick} label="JS heap" value={perf.memMb ? `${perf.memMb}/${perf.memLimitMb} MB (${memPct}%)` : "n/a"} tone={memPct > 80 ? "warn" : undefined} />
          <MetricTile icon={Cpu} label="UI FPS" value={`${perf.fps}`} tone={fpsTone === "warn" ? "warn" : undefined} />
          <MetricTile icon={Activity} label="Long tasks/s" value={`${perf.longTasksPerSec}`} tone={perf.longTasksPerSec > 5 ? "warn" : undefined} />
          <MetricTile icon={Wifi} label="Net RTT" value={perf.rtt ? `${perf.rtt} ms` : "n/a"} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="summary" className="flex-1 flex flex-col min-h-0 mt-3">
          <TabsList className="mx-6 self-start">
            <TabsTrigger value="summary"><CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />Save Report</TabsTrigger>
            <TabsTrigger value="charts"><BarChart3 className="w-3.5 h-3.5 mr-1.5" />Live Charts</TabsTrigger>
            <TabsTrigger value="heatmap"><Flame className="w-3.5 h-3.5 mr-1.5" />Server Heatmap</TabsTrigger>
            <TabsTrigger value="pages"><FileText className="w-3.5 h-3.5 mr-1.5" />Pages ({items.length})</TabsTrigger>
            <TabsTrigger value="logs"><Activity className="w-3.5 h-3.5 mr-1.5" />Live Logs ({logs.length})</TabsTrigger>
          </TabsList>

          {/* SAVE REPORT TAB */}
          <TabsContent value="summary" className="flex-1 min-h-0 mt-3 px-6 pb-5 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
              <SignalCard label="Final status" value={finished ? (stats.failed ? "Completed with errors" : "Completed") : "Running"} hint={`${stats.verifiedSaves}/${stats.total} page saves verified`} tone={stats.failed ? "warn" : "ok"} />
              <SignalCard label="Database applied" value={`${stats.dbApplied}`} hint="Rows updated with SEO columns" tone="ok" />
              <SignalCard label="Snapshots saved" value={`${stats.verifiedSaves}`} hint="Verified in site settings" tone={stats.verifiedSaves < stats.done ? "warn" : "ok"} />
              <SignalCard label="Tokens / cost" value={`${stats.totalTokens.toLocaleString()}`} hint={fmtCost(stats.totalCost)} tone="ok" />
            </div>
            <ScrollArea className="border rounded-md h-[420px]">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs sticky top-0 z-10 backdrop-blur">
                  <tr className="text-left">
                    <th className="px-3 py-2">Page</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Saved</th><th className="px-3 py-2">Score</th><th className="px-3 py-2">Tokens</th><th className="px-3 py-2">Cost</th><th className="px-3 py-2">Changes / Error</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.key} className="border-t">
                      <td className="px-3 py-2 font-medium max-w-[260px] truncate" title={it.name}>{it.name}</td>
                      <td className="px-3 py-2"><StatusBadge s={it.status} /></td>
                      <td className="px-3 py-2 text-xs">{it.verified ? <span className="text-emerald-700 font-medium">Verified</span> : it.saveStatus || "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{it.oldScore ?? "?"} → {it.newScore ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums text-xs">{it.totalTokens?.toLocaleString() ?? "—"}</td>
                      <td className="px-3 py-2 tabular-nums text-xs">{it.cost != null ? fmtCost(it.cost) : "—"}</td>
                      <td className="px-3 py-2 text-xs max-w-[360px] truncate" title={it.error || it.changedFields?.join(", ")}>{it.error || it.changedFields?.join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </TabsContent>

          {/* CHARTS TAB */}
          <TabsContent value="charts" className="flex-1 min-h-0 mt-3 px-6 pb-5 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <ChartCard title="Throughput (pages/min)" subtitle="Live — sampled every second">
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gThroughput" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={36} />
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="pagesPerMin" stroke="hsl(217 91% 60%)" fill="url(#gThroughput)" strokeWidth={2} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="AI tokens / sec" subtitle="Live token consumption rate">
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gTokens" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(280 80% 55%)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(280 80% 55%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={42} />
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="tokensPerSec" stroke="hsl(280 80% 55%)" fill="url(#gTokens)" strokeWidth={2} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="AI cost burn ($/min)" subtitle="Real-time spend rate">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={50} tickFormatter={(v) => `$${v}`} />
                    <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: any) => `$${Number(v).toFixed(4)}`} />
                    <Line type="monotone" dataKey="costPerMin" stroke="hsl(160 84% 39%)" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Browser FPS & memory" subtitle="UI thread health">
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="l" tick={{ fontSize: 10 }} width={32} />
                    <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} width={42} />
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line yAxisId="l" type="monotone" dataKey="fps" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line yAxisId="r" type="monotone" dataKey="mem" stroke="hsl(25 95% 53%)" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Per-page latency (last 30)" subtitle="Real durations from AI gateway">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={durationBars}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 10 }} width={50} tickFormatter={(v) => `${Math.round(v/1000)}s`} />
                    <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: any) => `${v} ms`} />
                    <Bar dataKey="ms" radius={[3, 3, 0, 0]}>
                      {durationBars.map((d, i) => (
                        <Cell key={i} fill={d.status === "fail" ? "hsl(0 84% 60%)" : "hsl(217 91% 60%)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Status breakdown" subtitle="Live queue composition">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2} isAnimationActive={false}>
                      {statusPie.map((s, i) => <Cell key={i} fill={s.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Per content-type progress" subtitle="Done / failed / pending grouped">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={contentTypeBars}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={32} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 11 }} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="done" stackId="a" fill="hsl(142 71% 45%)" />
                    <Bar dataKey="failed" stackId="a" fill="hsl(0 84% 60%)" />
                    <Bar dataKey="pending" stackId="a" fill="hsl(220 9% 65%)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Network RTT" subtitle="Live navigator.connection.rtt">
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="gRtt" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(45 93% 58%)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="hsl(45 93% 58%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} width={36} tickFormatter={(v) => `${v}ms`} />
                    <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: any) => `${v} ms`} />
                    <Area type="monotone" dataKey="rtt" stroke="hsl(45 93% 58%)" fill="url(#gRtt)" strokeWidth={2} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          </TabsContent>

          {/* HEATMAP TAB */}
          <TabsContent value="heatmap" className="flex-1 min-h-0 mt-3 px-6 pb-5 overflow-y-auto">
            <div className="rounded-md border p-4 bg-card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-1.5"><Flame className="w-4 h-4 text-orange-500" /> Server &amp; client load — last 60 seconds</h3>
                  <p className="text-[11px] text-muted-foreground">Each cell = 1 second. Cooler = healthy, hotter = under load. Updates live every second.</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span>cool</span>
                  <div className="flex">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div key={i} className="w-3 h-3" style={{ background: heatColor(i / 9) }} />
                    ))}
                  </div>
                  <span>hot</span>
                </div>
              </div>
              <div className="space-y-2">
                {heatRows.map((row) => (
                  <div key={row.label} className="flex items-center gap-3">
                    <div className="w-28 text-[11px] font-mono text-muted-foreground shrink-0">{row.label}</div>
                    <div className="flex-1 grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${HEATMAP_COLS}, minmax(0, 1fr))` }}>
                      {row.values.map((v, i) => (
                        <div
                          key={i}
                          className="h-6 rounded-sm transition-colors"
                          style={{ background: heatColor(v) }}
                          title={`${row.label}: ${(v * 100).toFixed(0)}%`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-3 pt-1">
                  <div className="w-28 text-[11px] font-mono text-muted-foreground shrink-0">timeline</div>
                  <div className="flex-1 grid gap-[2px] text-[9px] text-muted-foreground" style={{ gridTemplateColumns: `repeat(${HEATMAP_COLS}, minmax(0, 1fr))` }}>
                    <div className="col-span-10">-60s</div>
                    <div className="col-span-10 text-center">-45s</div>
                    <div className="col-span-10 text-center">-30s</div>
                    <div className="col-span-10 text-center">-15s</div>
                    <div className="col-span-20 text-right">now</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <SignalCard label="Current FPS" value={`${perf.fps}`} hint="60 = smooth" tone={perf.fps < 30 ? "warn" : "ok"} />
              <SignalCard label="Long tasks (last 1s)" value={`${perf.longTasksPerSec}`} hint="≥1 = main thread blocked" tone={perf.longTasksPerSec > 0 ? "warn" : "ok"} />
              <SignalCard label="Active concurrent jobs" value={`${stats.running}`} hint="Edge function calls in flight" tone={stats.running > 1 ? "warn" : "ok"} />
              <SignalCard label="Memory used" value={`${perf.memMb ?? 0} MB`} hint={`of ${perf.memLimitMb ?? "?"} MB`} tone={memPct > 80 ? "warn" : "ok"} />
              <SignalCard label="Network RTT" value={perf.rtt ? `${perf.rtt} ms` : "n/a"} hint="Round-trip estimate" tone={(perf.rtt ?? 0) > 300 ? "warn" : "ok"} />
              <SignalCard label="Throughput now" value={`${(samples[samples.length - 1]?.pagesPerSec ?? 0) * 60} /min`} hint="Pages/min latest 1s" tone="ok" />
            </div>
          </TabsContent>

          {/* PAGES TAB */}
          <TabsContent value="pages" className="flex-1 min-h-0 mt-3 px-6 pb-5 flex flex-col">
            <div className="flex items-center gap-2 mb-2 shrink-0">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  value={pageSearch} onChange={(e) => setPageSearch(e.target.value)}
                  placeholder="Filter pages…" className="pl-8 h-9 text-sm"
                />
              </div>
              <div className="flex gap-1">
                {(["all", "running", "pending", "ok", "fail"] as const).map(f => (
                  <Button key={f} size="sm" variant={pageFilter === f ? "default" : "outline"}
                    className="h-8 text-xs capitalize" onClick={() => setPageFilter(f as any)}>
                    {f === "ok" ? "Done" : f === "fail" ? "Failed" : f}
                  </Button>
                ))}
              </div>
              <span className="text-xs text-muted-foreground ml-auto tabular-nums">
                Showing {filteredItems.length} of {items.length}
              </span>
            </div>

            <ScrollArea className="flex-1 border rounded-md min-h-0">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs sticky top-0 z-10 backdrop-blur">
                  <tr className="text-left">
                    <th className="px-3 py-2 w-10">#</th>
                    <th className="px-3 py-2">Page</th>
                    <th className="px-3 py-2 w-24">Type</th>
                    <th className="px-3 py-2 w-28">Status</th>
                    <th className="px-3 py-2 w-20 text-right">Time</th>
                    <th className="px-3 py-2 w-24 text-right">Tokens</th>
                    <th className="px-3 py-2 w-20 text-right">Cost</th>
                    <th className="px-3 py-2 w-24">Score</th>
                    <th className="px-3 py-2">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((it, idx) => {
                    const liveDur = it.status === "running" && it.startedAt ? Date.now() - it.startedAt : it.durationMs;
                    return (
                      <tr key={it.key} className={`border-t ${it.status === "running" ? "bg-primary/5" : ""}`}>
                        <td className="px-3 py-2 text-muted-foreground tabular-nums">{idx + 1}</td>
                        <td className="px-3 py-2 font-medium truncate max-w-[260px]" title={it.name}>{it.name}</td>
                        <td className="px-3 py-2 text-muted-foreground capitalize text-xs">{it.contentType}</td>
                        <td className="px-3 py-2"><StatusBadge s={it.status} /></td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground text-xs">{fmtMs(liveDur)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground text-xs">{it.totalTokens?.toLocaleString() ?? "—"}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground text-xs">{it.cost != null ? fmtCost(it.cost) : "—"}</td>
                        <td className="px-3 py-2 text-xs">
                          {it.newScore != null ? (
                            <span className="font-mono">
                              {it.oldScore ?? "?"} → <span className="font-bold text-emerald-700">{it.newScore}</span>
                            </span>
                          ) : it.oldScore != null ? <span className="text-muted-foreground font-mono">{it.oldScore}</span> : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {it.error
                            ? <span className="text-destructive truncate block max-w-[260px]" title={it.error}>{it.error}</span>
                            : it.status === "running"
                              ? <span className="text-blue-700 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />{it.step || "AI thinking…"}</span>
                              : it.status === "ok" ? <span className="text-muted-foreground">Snapshot saved</span>
                              : "—"}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <tr><td colSpan={9} className="text-center text-muted-foreground py-8 text-xs">No pages match the current filter.</td></tr>
                  )}
                </tbody>
              </table>
            </ScrollArea>
          </TabsContent>

          {/* LOGS TAB */}
          <TabsContent value="logs" className="flex-1 min-h-0 mt-3 px-6 pb-5 flex flex-col">
            <div className="flex items-center gap-2 mb-2 shrink-0">
              <Badge variant="outline" className="text-xs">{logs.length} entries</Badge>
              <label className="text-xs text-muted-foreground inline-flex items-center gap-1.5 ml-auto">
                <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />
                Auto-scroll
              </label>
            </div>
            <div
              ref={logScrollRef}
              className="flex-1 min-h-0 overflow-y-auto border rounded-md bg-foreground/[0.02] font-mono text-[11px] p-3 space-y-0.5"
            >
              {logs.length === 0 && <p className="text-muted-foreground italic">Waiting for events…</p>}
              {logs.map((l, i) => (
                <div key={i} className="flex gap-2 leading-5">
                  <span className="text-muted-foreground shrink-0">{fmtTime(l.ts)}</span>
                  <span className={`shrink-0 w-12 font-bold ${
                    l.level === "ok" ? "text-emerald-600" :
                    l.level === "warn" ? "text-amber-600" :
                    l.level === "error" ? "text-destructive" : "text-blue-600"
                  }`}>{l.level.toUpperCase()}</span>
                  <span className="break-all">{l.msg}</span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

const MetricTile = ({
  icon: Icon, label, value, accent, mono, tone,
}: { icon: any; label: string; value: string; accent?: boolean; mono?: boolean; tone?: "warn" }) => (
  <div className={`rounded-md border p-2.5 ${accent ? "border-primary/40 bg-primary/5" : "bg-card"} ${tone === "warn" ? "border-amber-400/60 bg-amber-50" : ""}`}>
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
      <Icon className="w-3 h-3" />{label}
    </div>
    <div className={`mt-0.5 text-sm font-bold truncate ${mono ? "font-mono text-xs" : ""} ${accent ? "text-primary" : "text-foreground"}`}>{value}</div>
  </div>
);

const ChartCard = ({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) => (
  <div className="rounded-md border bg-card p-3">
    <div className="mb-2">
      <h4 className="text-xs font-bold">{title}</h4>
      {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const SignalCard = ({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "ok" | "warn" }) => (
  <div className={`rounded-md border p-3 ${tone === "warn" ? "border-amber-400/60 bg-amber-50" : "bg-card"}`}>
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="text-2xl font-bold tabular-nums">{value}</div>
    {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
  </div>
);

// 0 = cool blue, 1 = hot red
function heatColor(v: number) {
  const t = Math.max(0, Math.min(1, v));
  // Interpolate hue 220 -> 0
  const hue = 220 - 220 * t;
  const sat = 70 + 20 * t;
  const lit = 92 - 45 * t;
  return `hsl(${hue}, ${sat}%, ${lit}%)`;
}

export default BulkOptimizeProgressDialog;
