import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Activity, Cpu, Gauge, PauseCircle, PlayCircle, Save, Server, Zap,
  AlertTriangle, ShieldCheck, Layers, Flame, HardDrive, Network,
  Database, Timer, TrendingUp, Radio, Waves, CircuitBoard, Thermometer,
  CheckCircle2, XCircle, Clock, Wifi, BarChart3, RefreshCw,
} from "lucide-react";

type Workflow = "Bulk Colleges" | "Bulk College Sections";

interface Props {
  workflow: Workflow;
  table: "bulk_college_jobs" | "bulk_section_jobs";
  jobId: string;
  status: string;
  paused: boolean;
  concurrency: number;
  /** Live stats from parent */
  active: number;
  succeeded: number;
  failed: number;
  pending: number;
  total: number;
  processed?: number;
  updatedAt?: string | null;
  telemetry?: any;
  onRefresh?: () => void | Promise<void>;
  refreshing?: boolean;
}

/** Simple rolling buffer for sparkline rendering */
const useRolling = (value: number, max = 60) => {
  const ref = useRef<number[]>([]);
  ref.current = [...ref.current, value].slice(-max);
  return ref.current;
};

const Sparkline = ({ data, color = "hsl(var(--primary))", height = 36 }: { data: number[]; color?: string; height?: number }) => {
  const max = Math.max(1, ...data);
  const w = 100;
  const points = data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * w},${height - (v / max) * (height - 2) - 1}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
      <polyline
        fill={color} fillOpacity="0.15" stroke="none"
        points={`0,${height} ${points} ${w},${height}`}
      />
    </svg>
  );
};

/** Circular ring gauge (SVG). value in 0..100 */
const RingGauge = ({
  value, label, sublabel, color = "hsl(var(--primary))", size = 110,
}: { value: number; label: string; sublabel?: string; color?: string; size?: number }) => {
  const radius = (size - 14) / 2;
  const circ = 2 * Math.PI * radius;
  const dash = (Math.min(100, Math.max(0, value)) / 100) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={color} strokeWidth="8" fill="none"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-xl font-bold font-mono leading-none" style={{ color }}>{Math.round(value)}<span className="text-xs">%</span></div>
        <div className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">{label}</div>
        {sublabel && <div className="text-[9px] text-muted-foreground/80 font-mono">{sublabel}</div>}
      </div>
    </div>
  );
};

/** 6x10 cell activity heatmap — newest on the right */
const ActivityHeatmap = ({ data, max = 60 }: { data: number[]; max?: number }) => {
  const cells = Array.from({ length: max }, (_, i) => data[data.length - max + i] ?? 0);
  const peak = Math.max(1, ...cells);
  const colorFor = (v: number) => {
    const t = v / peak;
    if (t === 0) return "hsl(var(--muted) / 0.4)";
    if (t < 0.25) return "hsl(160 84% 39% / 0.35)";
    if (t < 0.5) return "hsl(160 84% 39% / 0.7)";
    if (t < 0.75) return "hsl(38 92% 50% / 0.85)";
    return "hsl(0 84% 60% / 0.95)";
  };
  return (
    <div className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-[2px]">
      {cells.map((v, i) => (
        <div
          key={i}
          className="aspect-square rounded-[2px] transition-colors"
          style={{ backgroundColor: colorFor(v) }}
          title={`t-${max - i}s · ${v} ops`}
        />
      ))}
    </div>
  );
};

const BulkLiveControlPanel = ({
  workflow, table, jobId, status, paused, concurrency,
  active, succeeded, failed, pending, total, processed, updatedAt, telemetry, onRefresh, refreshing,
}: Props) => {
  const [draftConcurrency, setDraftConcurrency] = useState(concurrency);
  const [saving, setSaving] = useState(false);
  const [browserCpu, setBrowserCpu] = useState(0); // 0..100
  const [tickRate, setTickRate] = useState(0); // throughput units/min approx
  const processedUnits = Math.max(0, Number(processed ?? (succeeded + failed)));
  const totalUnits = Math.max(0, Number(total || 0));
  const lastProcessed = useRef(processedUnits);
  const lastTime = useRef(Date.now());

  const networkStats = telemetry?.network || {};
  const telemetryAgeSec = telemetry?.updatedAt ? Math.max(0, (Date.now() - new Date(telemetry.updatedAt).getTime()) / 1000) : null;
  const isTelemetryFresh = telemetryAgeSec !== null && telemetryAgeSec <= 90 && !paused && !isTerminal;
  const serverCpu = isTelemetryFresh ? Number(telemetry?.cpu?.loadPct || 0) : 0;
  const memory = telemetry?.memory || null;
  const memoryUsedMb = Number(memory?.heapUsed || memory?.rss || 0);
  const memoryTotalMb = Number(memory?.heapTotal || memory?.rss || 0);
  const memoryPct = memoryTotalMb > 0 ? Math.min(100, Math.round((memoryUsedMb / memoryTotalMb) * 100)) : 0;
  const requestBytes = Number(networkStats.requestBytes || 0);
  const responseBytes = Number(networkStats.responseBytes || 0);
  const networkRequests = Number(networkStats.requests || 0);
  const networkFailures = Number(networkStats.failed || 0);
  const networkSuccess = Number(networkStats.success || 0);
  const realLatencyMs = Number(networkStats.avgLatencyMs || 0);
  const formatBytes = (bytes: number) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  useEffect(() => { setDraftConcurrency(concurrency); }, [concurrency]);

  // Browser CPU estimate via setTimeout drift
  useEffect(() => {
    let alive = true;
    let last = performance.now();
    const interval = 200; // expected ms
    const loop = () => {
      const now = performance.now();
      const drift = Math.max(0, (now - last) - interval);
      // map drift 0–120ms onto 0–100% load
      const sample = Math.min(100, (drift / 120) * 100);
      setBrowserCpu((prev) => prev * 0.7 + sample * 0.3);
      last = now;
      if (alive) setTimeout(loop, interval);
    };
    loop();
    return () => { alive = false; };
  }, []);

  // Throughput estimate (items completed per minute, smoothed)
  useEffect(() => {
    const now = Date.now();
    const dt = (now - lastTime.current) / 1000;
    if (dt > 1) {
      const delta = Math.max(0, processedUnits - lastProcessed.current);
      const rate = (delta / dt) * 60;
      setTickRate((prev) => prev * 0.6 + rate * 0.4);
      lastProcessed.current = processedUnits;
      lastTime.current = now;
    }
  }, [processedUnits]);

  // Server pressure now comes from real worker telemetry when available.
  const serverLoad = useMemo(() => {
    const utilisation = concurrency > 0 ? Math.min(1, active / concurrency) : 0;
    const completed = succeeded + failed;
    const failureRate = completed > 0 ? failed / completed : 0;
    const idleMin = updatedAt ? (Date.now() - new Date(updatedAt).getTime()) / 60000 : 0;
    const idlePenalty = !paused && !isTerminal ? Math.min(1, Math.max(0, idleMin - 1) / 5) : 0;
    const workerPressure = utilisation * 70 + failureRate * 20 + idlePenalty * 10;
    return Math.min(100, Math.round(Math.max(serverCpu, workerPressure)));
  }, [serverCpu, active, concurrency, succeeded, failed, updatedAt, paused, isTerminal]);

  const cpuHistory = useRolling(browserCpu);
  const loadHistory = useRolling(serverLoad);

  // Per-second ops history for heatmap — driven by real worker telemetry events.
  const [opsHistory, setOpsHistory] = useState<number[]>(Array.from({ length: 60 }, () => 0));
  const lastTotalRef = useRef(processedUnits);
  useEffect(() => {
    const buildBins = () => {
      const now = Date.now();
      const bins = Array.from({ length: 60 }, () => 0);
      const timeline = Array.isArray(telemetry?.timeline) ? telemetry.timeline : [];
      for (const point of timeline) {
        const ts = Number(point?.ts || 0);
        if (!ts) continue;
        const age = Math.floor((now - ts) / 1000);
        if (age >= 0 && age < 60) bins[59 - age] += Math.max(1, Number(point?.ops || 1));
      }
      const cur = processedUnits;
      const delta = Math.max(0, cur - lastTotalRef.current);
      lastTotalRef.current = cur;
      if (delta > 0) bins[59] += delta;
      setOpsHistory(bins);
    };
    buildBins();
    const t = setInterval(buildBins, 1000);
    return () => clearInterval(t);
  }, [telemetry, processedUnits]);

  // Live event ticker (last 8)
  const [events, setEvents] = useState<{ ts: number; kind: "ok" | "fail" | "info"; msg: string }[]>([]);
  const lastSucc = useRef(succeeded);
  const lastFail = useRef(failed);
  useEffect(() => {
    const newOk = Math.max(0, succeeded - lastSucc.current);
    const newFail = Math.max(0, failed - lastFail.current);
    if (newOk > 0 || newFail > 0) {
      setEvents((prev) => {
        const add: typeof prev = [];
        if (newOk > 0) add.push({ ts: Date.now(), kind: "ok", msg: `${newOk} item${newOk > 1 ? "s" : ""} completed by worker` });
        if (newFail > 0) add.push({ ts: Date.now(), kind: "fail", msg: `${newFail} item${newFail > 1 ? "s" : ""} failed — check logs` });
        return [...add, ...prev].slice(0, 8);
      });
    }
    lastSucc.current = succeeded;
    lastFail.current = failed;
  }, [succeeded, failed]);

  useEffect(() => {
    const realEvents = Array.isArray(telemetry?.events)
      ? telemetry.events.map((e: any) => ({ ts: Number(e.ts) || Date.now(), kind: e.kind === "fail" ? "fail" as const : e.kind === "ok" ? "ok" as const : "info" as const, msg: String(e.msg || "Worker event") }))
      : [];
    if (realEvents.length) setEvents((p) => [...realEvents, ...p].slice(0, 8));
  }, [telemetry?.updatedAt]);

  useEffect(() => {
    setEvents((p) => [{ ts: Date.now(), kind: "info" as const, msg: paused ? "Job paused by admin" : "Job resumed — workers warming up" }, ...p].slice(0, 8));
  }, [paused]);

  const latencyMs = realLatencyMs;

  // ETA
  const remaining = Math.max(0, totalUnits - processedUnits);
  const etaSec = tickRate > 0 ? Math.round((remaining / tickRate) * 60) : 0;
  const fmtEta = (s: number) => {
    if (!s) return "—";
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${ss}s` : `${ss}s`;
  };

  // Progress %
  const completedAll = succeeded + failed;
  const progressPct = totalUnits > 0 ? Math.round((processedUnits / totalUnits) * 100) : 0;
  const successRate = completedAll > 0 ? (succeeded / completedAll) * 100 : 0;
  const failureRatePct = completedAll > 0 ? (failed / completedAll) * 100 : 0;

  const loadTone =
    serverLoad >= 80 ? { color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/40", label: "Critical" }
    : serverLoad >= 55 ? { color: "text-amber-700", bg: "bg-amber-500/10", border: "border-amber-500/40", label: "Heavy" }
    : serverLoad >= 25 ? { color: "text-emerald-700", bg: "bg-emerald-500/10", border: "border-emerald-500/40", label: "Healthy" }
    : { color: "text-muted-foreground", bg: "bg-muted/40", border: "border-border", label: "Idle" };

  const cpuTone =
    browserCpu >= 70 ? { color: "text-destructive", label: "High" }
    : browserCpu >= 35 ? { color: "text-amber-700", label: "Warm" }
    : { color: "text-emerald-700", label: "Cool" };

  const isTerminal = ["completed", "failed", "cancelled"].includes(status);

  const saveConcurrency = async () => {
    setSaving(true);
    const { error } = await (supabase as any).from(table).update({
      concurrency: draftConcurrency,
      updated_at: new Date().toISOString(),
    }).eq("id", jobId);
    setSaving(false);
    if (error) toast({ title: "Couldn't update concurrency", description: error.message, variant: "destructive" });
    else toast({ title: "Concurrency updated", description: `Worker will use ${draftConcurrency} parallel slot${draftConcurrency > 1 ? "s" : ""} on the next batch tick (~5s).` });
  };

  const togglePaused = async (next: boolean) => {
    const { error } = await (supabase as any).from(table).update({
      status: "running",
      paused: next,
      updated_at: new Date().toISOString(),
      current_activity: next ? "Paused by admin" : "Resumed by admin",
    }).eq("id", jobId);
    if (error) {
      toast({ title: "Couldn't toggle pause", description: error.message, variant: "destructive" });
      return;
    }
    if (!next) {
      // Kick the worker so it resumes immediately (don't wait for watchdog)
      const fn = table === "bulk_college_jobs" ? "bulk-college-create" : "bulk-section-create";
      supabase.functions.invoke(fn, { body: { action: "resume", job_id: jobId } }).catch(() => {});
    }
    toast({
      title: next ? "Job paused" : "Job resumed",
      description: next
        ? "The worker will stop picking new items within ~5 seconds. Already-running items finish."
        : "The worker is restarting now and will pick up pending items.",
    });
  };

  const stopAll = async () => {
    const ok = window.confirm(
      "STOP ALL JOBS?\n\nThis will pause this job AND every other running bulk job (colleges + sections) immediately so the AI gateway and database can cool down.\n\nContinue?"
    );
    if (!ok) return;
    const stopPatch = {
      status: "cancelled",
      paused: true,
      worker_lock_until: null,
      current_activity: "Emergency stopped by admin",
      updated_at: new Date().toISOString(),
    };
    await (supabase as any).from("bulk_college_jobs").update(stopPatch).in("status", ["pending", "running", "processing"]);
    await (supabase as any).from("bulk_section_jobs").update(stopPatch).in("status", ["pending", "running", "processing"]);
    toast({ title: "Emergency stop sent", description: "All bulk workers are being cancelled now. Use Restart/Refresh later to continue from saved rows." });
  };

  return (
    <Card className="mb-4 border-primary/30 overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            Live Control Center
            <Badge variant="outline" className="ml-2 gap-1 font-mono text-[10px]">
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${paused ? "bg-amber-500" : isTerminal ? "bg-muted-foreground" : "bg-emerald-500 animate-pulse"}`} />
              {paused ? "PAUSED" : status.toUpperCase()}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onRefresh} disabled={!!refreshing} className="h-7 gap-1.5">
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> Refresh / Resume
            </Button>
            {!isTerminal && (
              <Button size="sm" variant="destructive" onClick={stopAll} className="h-7 gap-1.5">
                <Flame className="w-3.5 h-3.5" /> Emergency Stop ALL
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Top metric strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Server Load gauge */}
          <div className={`rounded-lg border ${loadTone.border} ${loadTone.bg} p-3`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${loadTone.color}`}>
                <Gauge className="w-3.5 h-3.5" /> SERVER CPU
              </div>
              <Badge variant="outline" className={`${loadTone.color} border-current text-[10px] h-5`}>{loadTone.label}</Badge>
            </div>
            <div className={`text-2xl font-bold font-mono leading-tight ${loadTone.color}`}>{serverLoad}%</div>
            <Sparkline data={loadHistory} color={serverLoad >= 80 ? "hsl(var(--destructive))" : serverLoad >= 55 ? "rgb(217 119 6)" : "rgb(5 150 105)"} />
            <div className="text-[10px] text-muted-foreground mt-0.5">worker runtime · real telemetry</div>
            {memory && <div className="text-[10px] text-muted-foreground font-mono mt-1">mem {memoryUsedMb}/{memoryTotalMb || "?"} MB · {memoryPct}%</div>}
          </div>

          {/* Browser CPU */}
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${cpuTone.color}`}>
                <Cpu className="w-3.5 h-3.5" /> BROWSER CPU
              </div>
              <Badge variant="outline" className={`${cpuTone.color} border-current text-[10px] h-5`}>{cpuTone.label}</Badge>
            </div>
            <div className={`text-2xl font-bold font-mono leading-tight ${cpuTone.color}`}>{Math.round(browserCpu)}%</div>
            <Sparkline data={cpuHistory} color={browserCpu >= 70 ? "hsl(var(--destructive))" : browserCpu >= 35 ? "rgb(217 119 6)" : "rgb(5 150 105)"} />
            <div className="text-[10px] text-muted-foreground mt-0.5">your device · est. via timer drift</div>
          </div>

          {/* Throughput */}
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                <Zap className="w-3.5 h-3.5" /> THROUGHPUT
              </div>
              <Badge variant="outline" className="text-[10px] h-5 border-primary/40 text-primary">{networkRequests} req</Badge>
            </div>
            <div className="text-2xl font-bold font-mono leading-tight text-primary">{tickRate.toFixed(1)}</div>
            <div className="grid grid-cols-3 gap-1 mt-2 text-[10px]">
              <div className="rounded bg-emerald-500/10 text-emerald-700 px-1 py-0.5 text-center font-mono">✓ {succeeded}</div>
              <div className="rounded bg-destructive/10 text-destructive px-1 py-0.5 text-center font-mono">✗ {failed}</div>
              <div className="rounded bg-muted px-1 py-0.5 text-center font-mono">⋯ {pending}</div>
            </div>
          </div>

          {/* Active workers visualisation */}
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                <Layers className="w-3.5 h-3.5" /> WORKERS
              </div>
              <Badge variant="outline" className="text-[10px] h-5 font-mono">{active}/{concurrency}</Badge>
            </div>
            <div className="grid grid-cols-5 gap-1 mt-1">
              {Array.from({ length: 10 }).map((_, i) => {
                const isAvailable = i < concurrency;
                const isBusy = i < active;
                return (
                  <div
                    key={i}
                    className={`h-6 rounded border ${
                      paused
                        ? "bg-amber-500/10 border-amber-500/30"
                        : isBusy
                        ? "bg-emerald-500/30 border-emerald-500/60 animate-pulse"
                        : isAvailable
                        ? "bg-primary/5 border-primary/30"
                        : "bg-muted/30 border-border opacity-40"
                    }`}
                    title={`Slot ${i + 1}: ${paused ? "paused" : isBusy ? "busy" : isAvailable ? "idle" : "disabled"}`}
                  />
                );
              })}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1.5 font-mono">
              {paused ? "all slots paused" : `${active} active · ${Math.max(0, concurrency - active)} idle · ${10 - concurrency} disabled`}
            </div>
          </div>
        </div>

        {/* Critical-load warning */}
        {serverLoad >= 80 && !paused && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 flex items-start gap-2.5 animate-pulse">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <div className="font-semibold text-destructive">Server load is CRITICAL ({serverLoad}%)</div>
              <div className="text-xs text-destructive/80 mt-0.5">
                AI gateway is under heavy strain. Consider lowering concurrency, pausing this job, or hitting Emergency Stop ALL to cool things down.
              </div>
            </div>
            <Button size="sm" variant="destructive" onClick={() => togglePaused(true)} className="h-7 shrink-0">
              Pause now
            </Button>
          </div>
        )}

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Concurrency slider */}
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Network className="w-3.5 h-3.5 text-primary" /> Parallel jobs (live)
              </div>
              <Badge variant="outline" className="font-mono text-[11px]">{draftConcurrency} / 10</Badge>
            </div>
            <Slider
              value={[draftConcurrency]}
              onValueChange={(v) => setDraftConcurrency(v[0])}
              min={1} max={10} step={1}
              disabled={isTerminal}
              className="my-2"
            />
            <div className="flex items-center justify-between gap-2 mt-2">
              <div className="text-[11px] text-muted-foreground">
                Currently saved: <span className="font-mono font-semibold text-foreground">{concurrency}</span>
                {draftConcurrency !== concurrency && <span className="text-amber-600 ml-1.5">· unsaved change</span>}
              </div>
              <Button
                size="sm"
                onClick={saveConcurrency}
                disabled={saving || draftConcurrency === concurrency || isTerminal}
                className="h-7 gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> {saving ? "Saving…" : "Save"}
              </Button>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1.5">
              Applies on the next batch tick (~5s). Already-running items always finish.
            </div>
          </div>

          {/* Pause switch */}
          <div className={`rounded-lg border p-3 ${paused ? "bg-amber-500/5 border-amber-500/30" : "bg-card"}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                {paused ? <PauseCircle className="w-3.5 h-3.5 text-amber-600" /> : <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />}
                Job switch (live)
              </div>
              <Switch
                checked={!paused}
                onCheckedChange={(v) => togglePaused(!v)}
                disabled={isTerminal}
              />
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={paused
                  ? "border-amber-500/50 text-amber-700 bg-amber-500/10"
                  : "border-emerald-500/50 text-emerald-700 bg-emerald-500/10"}
              >
                {paused ? "OFF — worker idle" : "ON — worker running"}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                {paused
                  ? "Toggle ON to resume immediately."
                  : "Toggle OFF to halt new items within ~5s."}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3 h-3 text-primary" />
              Watchdog skips paused jobs — they stay off until you re-enable them.
            </div>
          </div>
        </div>

        {/* === RICH LIVE TELEMETRY === */}

        {/* Heatmap + Ring gauges row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-lg border bg-gradient-to-br from-card to-muted/20 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                Throughput Heatmap
                <span className="text-[10px] text-muted-foreground font-normal ml-1">— ops/sec · last 60s</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-muted-foreground">low</span>
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "hsl(160 84% 39% / 0.35)" }} />
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "hsl(160 84% 39% / 0.7)" }} />
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "hsl(38 92% 50% / 0.85)" }} />
                <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "hsl(0 84% 60% / 0.95)" }} />
                <span className="text-muted-foreground">peak</span>
              </div>
            </div>
            <ActivityHeatmap data={opsHistory} />
            <div className="grid grid-cols-4 gap-2 mt-3 text-[10px]">
              <div className="rounded border bg-card px-2 py-1.5">
                <div className="text-muted-foreground">peak/s</div>
                <div className="font-mono font-semibold text-sm">{Math.max(0, ...opsHistory)}</div>
              </div>
              <div className="rounded border bg-card px-2 py-1.5">
                <div className="text-muted-foreground">avg/s</div>
                <div className="font-mono font-semibold text-sm">{opsHistory.length > 0 ? (opsHistory.reduce((a, b) => a + b, 0) / opsHistory.length).toFixed(1) : "0"}</div>
              </div>
              <div className="rounded border bg-card px-2 py-1.5">
                <div className="text-muted-foreground">window</div>
                <div className="font-mono font-semibold text-sm">{opsHistory.reduce((a, b) => a + b, 0)} ops</div>
              </div>
              <div className="rounded border bg-card px-2 py-1.5">
                <div className="text-muted-foreground">silent</div>
                <div className="font-mono font-semibold text-sm">{opsHistory.filter((v) => v === 0).length}/60</div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold mb-2">
              <CircuitBoard className="w-3.5 h-3.5 text-primary" /> Quality Mix
            </div>
            <div className="flex items-center justify-around">
              <RingGauge value={successRate} label="Success" sublabel={`${succeeded}`} color="hsl(160 84% 39%)" size={100} />
              <RingGauge value={failureRatePct} label="Failure" sublabel={`${failed}`} color="hsl(0 84% 60%)" size={100} />
            </div>
            <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
              <span>{completedAll} processed</span><span>·</span><span>{remaining} remaining</span>
            </div>
          </div>
        </div>

        {/* Progress + ETA + Latency */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2 rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <TrendingUp className="w-3.5 h-3.5 text-primary" /> Job Progress
              </div>
              <span className="font-mono text-xs">{progressPct}%</span>
            </div>
            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-emerald-500 transition-all" style={{ width: `${totalUnits > 0 ? (succeeded / totalUnits) * 100 : 0}%` }} />
              <div className="absolute inset-y-0 bg-destructive transition-all" style={{ left: `${totalUnits > 0 ? (succeeded / totalUnits) * 100 : 0}%`, width: `${totalUnits > 0 ? (failed / totalUnits) * 100 : 0}%` }} />
              {!paused && active > 0 && (
                <div className="absolute inset-y-0 bg-primary/40 animate-pulse" style={{ left: `${totalUnits > 0 ? (processedUnits / totalUnits) * 100 : 0}%`, width: `${totalUnits > 0 ? (active / totalUnits) * 100 : 0}%` }} />
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3 text-[10px]">
              <div><div className="text-emerald-700 font-mono font-semibold">{succeeded}</div><div className="text-muted-foreground">done</div></div>
              <div><div className="text-destructive font-mono font-semibold">{failed}</div><div className="text-muted-foreground">failed</div></div>
              <div><div className="text-primary font-mono font-semibold">{active}</div><div className="text-muted-foreground">active</div></div>
              <div><div className="font-mono font-semibold">{pending}</div><div className="text-muted-foreground">queued</div></div>
            </div>
          </div>

          <div className="rounded-lg border bg-gradient-to-br from-card to-primary/5 p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                <Clock className="w-3.5 h-3.5" /> ETA
              </div>
              <Badge variant="outline" className="text-[10px] h-5">{tickRate > 0 ? "live" : "idle"}</Badge>
            </div>
            <div className="text-2xl font-bold font-mono leading-tight">{paused ? "—" : fmtEta(etaSec)}</div>
            <div className="text-[10px] text-muted-foreground mt-1">{remaining} left @ {tickRate.toFixed(1)}/min</div>
          </div>

          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                <Timer className={`w-3.5 h-3.5 ${latencyMs > 8000 ? "text-destructive" : latencyMs > 4000 ? "text-amber-600" : "text-emerald-600"}`} />
                AI LATENCY
              </div>
              <Badge variant="outline" className="text-[10px] h-5">avg</Badge>
            </div>
            <div className={`text-2xl font-bold font-mono leading-tight ${latencyMs > 8000 ? "text-destructive" : latencyMs > 4000 ? "text-amber-700" : "text-emerald-700"}`}>
              {latencyMs > 0 ? `${(latencyMs / 1000).toFixed(1)}s` : "—"}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">real avg · worker HTTP</div>
          </div>
        </div>

        {/* I/O bars + Event ticker */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-lg border bg-card p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold mb-3">
              <Wifi className="w-3.5 h-3.5 text-primary" /> Network I/O
            </div>
            {[
              { label: "Request payload ↑", value: Math.min(100, requestBytes / 1024), unit: formatBytes(requestBytes), color: "bg-primary" },
              { label: "Response payload ↓", value: Math.min(100, responseBytes / 1024), unit: formatBytes(responseBytes), color: "bg-accent" },
              { label: "DB writes", value: Math.min(100, Number(telemetry?.db?.writes || 0) * 2), unit: `${Number(telemetry?.db?.writes || 0)} writes`, color: "bg-secondary" },
            ].map((row) => (
              <div key={row.label} className="mb-2 last:mb-0">
                <div className="flex items-center justify-between text-[10px] mb-0.5">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-mono">{row.unit}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full ${row.color} transition-all`} style={{ width: `${row.value}%` }} />
                </div>
              </div>
            ))}
            <div className="mt-3 pt-2 border-t grid grid-cols-3 gap-2 text-[10px]">
              <div><span className="text-muted-foreground">ok</span><div className="font-mono text-emerald-700">{networkSuccess}</div></div>
              <div><span className="text-muted-foreground">fail</span><div className="font-mono text-destructive">{networkFailures}</div></div>
              <div><span className="text-muted-foreground flex items-center gap-1"><Database className="w-3 h-3" /> queue</span><div className="font-mono">{pending}</div></div>
            </div>
          </div>

          <div className="lg:col-span-2 rounded-lg border bg-gradient-to-br from-card to-muted/10 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Radio className={`w-3.5 h-3.5 ${paused ? "text-muted-foreground" : "text-emerald-600 animate-pulse"}`} />
                Live Event Stream
              </div>
              <Badge variant="outline" className="text-[10px] h-5 font-mono">{events.length} event{events.length === 1 ? "" : "s"}</Badge>
            </div>
            <div className="space-y-1 max-h-44 overflow-hidden">
              {events.length === 0 ? (
                <div className="text-[11px] text-muted-foreground py-6 text-center font-mono">// waiting for worker activity…</div>
              ) : events.map((e, i) => (
                <div
                  key={`${e.ts}-${i}`}
                  className={`flex items-center gap-2 text-[11px] font-mono px-2 py-1 rounded border-l-2 ${
                    e.kind === "ok" ? "border-emerald-500 bg-emerald-500/5"
                    : e.kind === "fail" ? "border-destructive bg-destructive/5"
                    : "border-primary bg-primary/5"
                  } animate-fade-in`}
                >
                  <span className="text-muted-foreground tabular-nums">{new Date(e.ts).toLocaleTimeString("en-IN", { hour12: false })}</span>
                  {e.kind === "ok" ? <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    : e.kind === "fail" ? <XCircle className="w-3 h-3 text-destructive" />
                    : <Waves className="w-3 h-3 text-primary" />}
                  <span className="flex-1 truncate">{e.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Thermal strip */}
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Thermometer className="w-3.5 h-3.5 text-amber-600" /> System Thermal Strip
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">cool → hot · 60s window</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden border">
            {(loadHistory.length > 0 ? loadHistory : [0]).map((v, i, arr) => {
              const t = v / 100;
              const hue = 160 - t * 160;
              return (
                <div key={i} className="flex-1 transition-colors" style={{ background: `hsl(${hue} 80% ${50 - t * 10}%)`, opacity: 0.35 + t * 0.65 }} title={`t-${arr.length - i}s · load ${v}%`} />
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5 font-mono">
            <span>min {Math.min(...(loadHistory.length ? loadHistory : [0]))}%</span>
            <span>now {serverLoad}%</span>
            <span>max {Math.max(...(loadHistory.length ? loadHistory : [0]))}%</span>
          </div>
        </div>

        {/* Activity strip */}
        <div className="rounded-md bg-muted/30 border px-3 py-2 flex items-center gap-3 text-[11px] flex-wrap">
          <Activity className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono text-muted-foreground">JOB</span>
          <span className="font-mono">{jobId.slice(0, 8)}</span>
          <span className="text-muted-foreground">·</span>
          <HardDrive className="w-3 h-3 text-muted-foreground" />
          <span className="font-mono">{processedUnits}/{totalUnits}</span>
          <span className="text-muted-foreground">processed</span>
          <span className="ml-auto text-muted-foreground font-mono">
            tick {((Date.now() / 1000) | 0) % 1000}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkLiveControlPanel;
