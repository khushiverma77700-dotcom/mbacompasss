import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, Loader2, Pause, Play, X, Cpu, Activity, Zap, Clock, Coins, Server, Gauge } from "lucide-react";

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

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  items: BulkItem[];
  paused: boolean;
  onPauseToggle: () => void;
  onCancel: () => void;
  finished: boolean;
  startedAt: number | null;
  /** Active model (e.g., openai/gpt-5-mini). */
  model: string;
}

function fmtMs(ms?: number) {
  if (!ms || ms < 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 100) / 10;
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60); const r = Math.round(s - m * 60);
  return `${m}m ${r}s`;
}
function fmtCost(usd?: number) {
  if (usd == null) return "$0.0000";
  return `$${usd.toFixed(4)}`;
}

const StatusBadge = ({ s }: { s: ItemStatus }) => {
  if (s === "ok") return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1"><CheckCircle2 className="w-3 h-3" />Done</Badge>;
  if (s === "fail") return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" />Failed</Badge>;
  if (s === "running") return <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/30 gap-1"><Loader2 className="w-3 h-3 animate-spin" />Running</Badge>;
  if (s === "skipped") return <Badge variant="outline">Skipped</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">Queued</Badge>;
};

export const BulkOptimizeProgressDialog = ({
  open, onOpenChange, items, paused, onPauseToggle, onCancel, finished, startedAt, model,
}: Props) => {
  // Live "now" tick for ETA / elapsed
  const [, force] = useState(0);
  const tickRef = useRef<number | null>(null);
  useEffect(() => {
    if (!open || finished) return;
    tickRef.current = window.setInterval(() => force((n) => n + 1), 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [open, finished]);

  // Browser performance probes (real, not faked)
  const [perf, setPerf] = useState<{ memMb?: number; memLimitMb?: number; longTasksPerSec: number }>({ longTasksPerSec: 0 });
  const longTaskCountRef = useRef(0);
  useEffect(() => {
    if (!open) return;
    let observer: PerformanceObserver | null = null;
    try {
      observer = new PerformanceObserver((list) => {
        longTaskCountRef.current += list.getEntries().length;
      });
      observer.observe({ entryTypes: ["longtask"] as any });
    } catch { /* unsupported */ }
    const id = window.setInterval(() => {
      const m = (performance as any).memory;
      setPerf({
        memMb: m?.usedJSHeapSize ? Math.round(m.usedJSHeapSize / 1024 / 1024) : undefined,
        memLimitMb: m?.jsHeapSizeLimit ? Math.round(m.jsHeapSizeLimit / 1024 / 1024) : undefined,
        longTasksPerSec: longTaskCountRef.current,
      });
      longTaskCountRef.current = 0;
    }, 1000);
    return () => { if (observer) observer.disconnect(); clearInterval(id); };
  }, [open]);

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter(i => i.status === "ok").length;
    const failed = items.filter(i => i.status === "fail").length;
    const running = items.filter(i => i.status === "running").length;
    const pending = items.filter(i => i.status === "pending").length;
    const completed = done + failed;
    const totalTokens = items.reduce((s, i) => s + (i.totalTokens || 0), 0);
    const totalCost = items.reduce((s, i) => s + (i.cost || 0), 0);
    const finishedItems = items.filter(i => i.durationMs);
    const avgMs = finishedItems.length ? finishedItems.reduce((s, i) => s + (i.durationMs || 0), 0) / finishedItems.length : 0;
    const elapsed = startedAt ? Date.now() - startedAt : 0;
    const remaining = total - completed;
    const eta = avgMs && remaining > 0 ? Math.round(avgMs * remaining) : 0;
    const speed = elapsed > 0 ? (completed / (elapsed / 60000)) : 0; // pages/min
    return { total, done, failed, running, pending, completed, totalTokens, totalCost, avgMs, elapsed, eta, speed };
  }, [items, startedAt]);

  const pct = stats.total ? Math.round((stats.completed / stats.total) * 100) : 0;
  const currentItem = items.find(i => i.status === "running");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Bulk SEO Optimization — Live Monitor
          </DialogTitle>
          <DialogDescription>
            Real-time tracking of every page being optimized. Pause anytime; failed items are kept for retry.
          </DialogDescription>
        </DialogHeader>

        {/* Top progress + controls */}
        <div className="px-6 pt-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              {finished ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Loader2 className="w-4 h-4 text-primary animate-spin" />}
              <span className="font-semibold">
                {finished ? "Optimization complete" : paused ? "Paused" : currentItem ? `Optimizing: ${currentItem.name}` : "Starting…"}
              </span>
              <Badge variant="outline" className="ml-2 font-mono text-[10px]">{model.split("/").pop()}</Badge>
            </div>
            <div className="flex items-center gap-2">
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
            <span className="text-muted-foreground">{stats.completed} / {stats.total}</span>
            <span className="text-emerald-600 font-medium">✓ {stats.done}</span>
            {stats.failed > 0 && <span className="text-destructive font-medium">✕ {stats.failed}</span>}
            <span className="font-bold text-primary ml-auto">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2.5" />
        </div>

        {/* Metric tiles */}
        <div className="px-6 pt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          <MetricTile icon={Clock} label="Elapsed" value={fmtMs(stats.elapsed)} />
          <MetricTile icon={Clock} label="ETA" value={finished ? "—" : fmtMs(stats.eta)} />
          <MetricTile icon={Gauge} label="Speed" value={`${stats.speed.toFixed(1)}/min`} />
          <MetricTile icon={Activity} label="Avg / page" value={fmtMs(stats.avgMs)} />
          <MetricTile icon={Coins} label="AI tokens" value={stats.totalTokens.toLocaleString()} />
          <MetricTile icon={Coins} label="AI cost" value={fmtCost(stats.totalCost)} accent />
          <MetricTile icon={Server} label="Active key" value="LOVABLE_AI" mono />
        </div>

        {/* Browser/server health */}
        <div className="px-6 pt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
          <MetricTile
            icon={Cpu} label="Browser memory"
            value={perf.memMb ? `${perf.memMb} / ${perf.memLimitMb} MB` : "n/a"}
          />
          <MetricTile
            icon={Activity} label="Long tasks/s"
            value={`${perf.longTasksPerSec}`}
            tone={perf.longTasksPerSec > 5 ? "warn" : undefined}
          />
          <MetricTile icon={Server} label="Concurrency" value="1 (sequential)" />
          <MetricTile icon={Zap} label="Backend" value="Lovable Cloud · Edge" />
        </div>

        {/* Per-page table */}
        <div className="px-6 pt-4 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Per-page progress
        </div>
        <ScrollArea className="flex-1 px-6 pb-6">
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs">
                <tr className="text-left">
                  <th className="px-3 py-2 w-10">#</th>
                  <th className="px-3 py-2">Page</th>
                  <th className="px-3 py-2 w-28">Type</th>
                  <th className="px-3 py-2 w-28">Status</th>
                  <th className="px-3 py-2 w-24 text-right">Time</th>
                  <th className="px-3 py-2 w-24 text-right">Tokens</th>
                  <th className="px-3 py-2 w-24 text-right">Cost</th>
                  <th className="px-3 py-2 w-28">Score</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.key} className={`border-t ${it.status === "running" ? "bg-primary/5" : ""}`}>
                    <td className="px-3 py-2 text-muted-foreground tabular-nums">{idx + 1}</td>
                    <td className="px-3 py-2 font-medium truncate max-w-[260px]" title={it.name}>{it.name}</td>
                    <td className="px-3 py-2 text-muted-foreground capitalize">{it.contentType}</td>
                    <td className="px-3 py-2"><StatusBadge s={it.status} /></td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmtMs(it.durationMs)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{it.totalTokens?.toLocaleString() ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{it.cost != null ? fmtCost(it.cost) : "—"}</td>
                    <td className="px-3 py-2 text-xs">
                      {it.newScore != null ? (
                        <span className="font-mono">
                          {it.oldScore ?? "?"} → <span className="font-bold text-emerald-700">{it.newScore}</span>
                        </span>
                      ) : it.error ? (
                        <span className="text-destructive truncate block max-w-[160px]" title={it.error}>{it.error}</span>
                      ) : it.status === "running" ? (
                        <span className="text-muted-foreground">{it.step || "AI thinking…"}</span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

const MetricTile = ({
  icon: Icon, label, value, accent, mono, tone,
}: { icon: any; label: string; value: string; accent?: boolean; mono?: boolean; tone?: "warn" }) => (
  <div className={`rounded-md border p-2.5 ${accent ? "border-primary/40 bg-primary/5" : "bg-card"} ${tone === "warn" ? "border-amber-400/50 bg-amber-50" : ""}`}>
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
      <Icon className="w-3 h-3" />{label}
    </div>
    <div className={`mt-0.5 text-sm font-bold ${mono ? "font-mono text-xs" : ""} ${accent ? "text-primary" : "text-foreground"}`}>{value}</div>
  </div>
);

export default BulkOptimizeProgressDialog;
