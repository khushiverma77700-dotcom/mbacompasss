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
  Coins, Server, Gauge, FileText, Search, Download, Wifi, MemoryStick,
} from "lucide-react";

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
  /** Active model (e.g., openai/gpt-5-mini). */
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

export const BulkOptimizeProgressDialog = ({
  open, onOpenChange, items, logs, paused, onPauseToggle, onCancel, finished, startedAt, model,
}: Props) => {
  // Force re-render every second for live elapsed/ETA
  const [, force] = useState(0);
  useEffect(() => {
    if (!open || finished) return;
    const id = window.setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [open, finished]);

  // Browser perf probes
  const [perf, setPerf] = useState<{ memMb?: number; memLimitMb?: number; longTasksPerSec: number; fps: number; online: boolean; rtt?: number }>(
    { longTasksPerSec: 0, fps: 60, online: navigator.onLine, rtt: (navigator as any).connection?.rtt }
  );
  const longTaskCountRef = useRef(0);
  const frameCountRef = useRef(0);
  const rafRef = useRef<number | null>(null);

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
      setPerf({
        memMb: m?.usedJSHeapSize ? Math.round(m.usedJSHeapSize / 1024 / 1024) : undefined,
        memLimitMb: m?.jsHeapSizeLimit ? Math.round(m.jsHeapSizeLimit / 1024 / 1024) : undefined,
        longTasksPerSec: longTaskCountRef.current,
        fps: frameCountRef.current,
        online: navigator.onLine,
        rtt: (navigator as any).connection?.rtt,
      });
      longTaskCountRef.current = 0;
      frameCountRef.current = 0;
    }, 1000);
    return () => {
      observer?.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearInterval(id);
    };
  }, [open]);

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter(i => i.status === "ok").length;
    const failed = items.filter(i => i.status === "fail").length;
    const running = items.filter(i => i.status === "running").length;
    const pending = items.filter(i => i.status === "pending").length;
    const completed = done + failed;
    const totalTokens = items.reduce((s, i) => s + (i.totalTokens || 0), 0);
    const promptTokens = items.reduce((s, i) => s + (i.promptTokens || 0), 0);
    const completionTokens = items.reduce((s, i) => s + (i.completionTokens || 0), 0);
    const totalCost = items.reduce((s, i) => s + (i.cost || 0), 0);
    const finishedItems = items.filter(i => i.durationMs);
    const avgMs = finishedItems.length ? finishedItems.reduce((s, i) => s + (i.durationMs || 0), 0) / finishedItems.length : 0;
    const elapsed = startedAt ? Date.now() - startedAt : 0;
    const remaining = total - completed;
    const eta = avgMs && remaining > 0 ? Math.round(avgMs * remaining) : 0;
    const speed = elapsed > 0 ? (completed / (elapsed / 60000)) : 0; // pages/min
    const successRate = completed > 0 ? Math.round((done / completed) * 100) : 100;
    return { total, done, failed, running, pending, completed, totalTokens, promptTokens, completionTokens, totalCost, avgMs, elapsed, eta, speed, successRate };
  }, [items, startedAt, perf]);

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

  const fpsTone = perf.fps < 30 ? "warn" : perf.fps < 50 ? "soft-warn" : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Bulk SEO Optimization — Live Control Panel
            <span className={`ml-2 inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded ${perf.online ? "bg-emerald-500/10 text-emerald-700" : "bg-destructive/10 text-destructive"}`}>
              <Wifi className="w-3 h-3" /> {perf.online ? "ONLINE" : "OFFLINE"}
            </span>
          </DialogTitle>
          <DialogDescription>
            Enterprise-grade real-time monitoring of every page, token, dollar, and system signal.
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
                {finished ? "Optimization complete" : paused ? "Paused — click Resume to continue" : currentItem ? `Optimizing: ${currentItem.name}` : "Starting…"}
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
          <MetricTile icon={Server} label="API key" value="LOVABLE_AI" mono />
        </div>

        {/* System tiles */}
        <div className="px-6 pt-2 grid grid-cols-2 md:grid-cols-5 gap-2 shrink-0">
          <MetricTile icon={MemoryStick} label="Browser memory" value={perf.memMb ? `${perf.memMb} / ${perf.memLimitMb} MB` : "n/a"} />
          <MetricTile icon={Cpu} label="UI FPS" value={`${perf.fps}`} tone={fpsTone === "warn" ? "warn" : undefined} />
          <MetricTile icon={Activity} label="Long tasks/s" value={`${perf.longTasksPerSec}`} tone={perf.longTasksPerSec > 5 ? "warn" : undefined} />
          <MetricTile icon={Wifi} label="Network RTT" value={perf.rtt ? `${perf.rtt} ms` : "n/a"} />
          <MetricTile icon={Server} label="Backend" value="Lovable Cloud · Edge" />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pages" className="flex-1 flex flex-col min-h-0 mt-3">
          <TabsList className="mx-6 self-start">
            <TabsTrigger value="pages"><FileText className="w-3.5 h-3.5 mr-1.5" />Pages ({items.length})</TabsTrigger>
            <TabsTrigger value="logs"><Activity className="w-3.5 h-3.5 mr-1.5" />Live Logs ({logs.length})</TabsTrigger>
          </TabsList>

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

export default BulkOptimizeProgressDialog;
