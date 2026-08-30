// Live "server room" command deck for the AI SEO Intelligence Center.
//
// Always visible above the tabs. Every figure is read from the backend
// (`live_status` + `research_feed`) — the animations only visualise how those
// real numbers move: research running, changes being injected into pages,
// approvals waiting, wins landing.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, Bot, CheckCircle2, ClipboardCheck, Cpu, Radar, RefreshCw, Search, Syringe, Trophy, Wifi,
} from "lucide-react";

import { fmtInt, safeText, agoText } from "@/lib/seoSafeRender";
import { LiveDot, RawPayloadDrawer } from "./SeoSafeUi";
import { useSeoMotion } from "./SeoMotion";
import { useSeoRealtime } from "@/hooks/useSeoRealtime";
import {
  FxCounter, GaugeRing, HeatGrid, PhaseRotator, PipelineFlow, RadarSweep, TerminalStream, BurstOnIncrease,
  type FxStage,
} from "./SeoLiveFx";


const PHRASES = [
  "Researching new keyword demand…",
  "Crawling competitor pages…",
  "Scoring page-level opportunities…",
  "Writing recommendations…",
  "Injecting approved changes into pages…",
  "Measuring ranking movement…",
];

const toneFor = (level: unknown, status?: unknown): "ok" | "warn" | "err" | "info" => {
  const l = String(level ?? status ?? "").toLowerCase();
  if (l.includes("error") || l.includes("fail")) return "err";
  if (l.includes("warn")) return "warn";
  if (l.includes("ok") || l.includes("done") || l.includes("success")) return "ok";
  return "info";
};

const hhmm = (v: unknown) => {
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? "--:--:--" : d.toLocaleTimeString("en-IN", { hour12: false });
};

export default function SeoCommandDeck() {
  const m = useSeoMotion();
  const [status, setStatus] = useState<any>(null);
  const [feed, setFeed] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [updated, setUpdated] = useState<string | null>(null);
  const mounted = useRef(true);

  const call = useCallback(async (action: string, extra: Record<string, unknown> = {}) => {
    const { data, error } = await supabase.functions.invoke("seo-intel-control", { body: { action, ...extra } });
    if (error) throw new Error(error.message);
    if ((data as any)?.error) throw new Error(safeText((data as any).error));
    return data as any;
  }, []);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const [s, f] = await Promise.all([call("live_status"), call("research_feed", { hours: 24 })]);
      if (!mounted.current) return;
      setStatus(s);
      setFeed(f);
      setErr(null);
      setUpdated(new Date().toISOString());
      setTick((t) => t + 1);
    } catch (e) {
      if (mounted.current) setErr((e as Error).message);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }, [call]);

  // Realtime push: any engine table change refreshes the deck immediately.
  const rt = useSeoRealtime(() => { if (mounted.current) load(); }, undefined, { debounceMs: 900 });

  useEffect(() => {
    mounted.current = true;
    load();
    // Safety-net poll — much slower when realtime is connected.
    const t = setInterval(load, rt.connected ? m.pollMs * 4 : m.pollMs);
    return () => { mounted.current = false; clearInterval(t); };
  }, [load, rt.connected, m.pollMs]);

  const running: any[] = Array.isArray(status?.running) ? status.running : [];
  const queued: any[] = Array.isArray(status?.queued) ? status.queued : [];
  const recent: any[] = Array.isArray(status?.recent) ? status.recent : [];
  const sources: any[] = Array.isArray(status?.sources) ? status.sources : [];
  const gains = feed?.gains ?? {};
  const activity: any[] = Array.isArray(feed?.activity) ? feed.activity : [];
  const working = running.length > 0 || busy;


  const stages: FxStage[] = useMemo(() => {
    const activeTypes = new Set(running.map((r) => String(r.job_type ?? "")));
    const any = (...keys: string[]) => keys.some((k) => Array.from(activeTypes).some((t) => t.includes(k)));
    return [
      { key: "research", label: "Research", count: gains.keywords_discovered ?? null, active: any("keyword", "gsc", "competitor"), icon: Search },
      { key: "analyse", label: "Analyse", count: gains.gaps_open ?? null, active: any("analyze", "audit", "crawl"), icon: Cpu },
      { key: "recommend", label: "Recommend", count: gains.awaiting_approval ?? null, active: any("analyze", "recommend"), icon: Bot },
      { key: "approve", label: "Awaiting approval", count: gains.awaiting_approval ?? null, active: false, icon: ClipboardCheck },
      { key: "inject", label: "Injected today", count: gains.changes_today ?? null, active: any("apply", "auto_apply"), icon: Syringe },
      { key: "measure", label: "Measured wins", count: gains.competitors_analysed ?? null, active: any("snapshot", "measure"), icon: Trophy },
    ];
  }, [running, gains]);

  const throughput = (status?.throughput ?? {}) as Record<string, any>;
  const heatCells = useMemo(() => {
    const entries = Object.entries(throughput);
    const max = Math.max(1, ...entries.map(([, v]) => Number(v?.records ?? 0)));
    const cells = entries.map(([k, v]) => ({
      key: k,
      label: `${k} · ${fmtInt(v?.records, "0")} records`,
      load: Number(v?.records ?? 0) / max,
      failed: Number(v?.failed ?? 0) > 0,
    }));
    // pad the grid so the heat map always reads as a full server rack
    while (cells.length < 24) cells.push({ key: `pad-${cells.length}`, label: "idle slot", load: 0, failed: false });
    return cells;
  }, [throughput]);

  const logLines = useMemo(
    () =>
      activity.slice(0, 60).map((a: any, i: number) => ({
        id: `${a.id ?? i}-${tick}`,
        time: hhmm(a.created_at),
        tag: String(safeText(a.job_type ?? a.data_source ?? "engine", "engine")).slice(0, 14),
        text: `${safeText(a.event)}${a.records ? ` · ${fmtInt(a.records)} records` : ""}${a.detail ? ` — ${safeText(a.detail)}` : ""}`,
        tone: toneFor(a.level),
      })),
    [activity, tick],
  );

  const okSources = sources.filter((s) => s.configured && String(s.status ?? "").toLowerCase() !== "error").length;
  const sourceHealth = sources.length ? Math.round((okSources / sources.length) * 100) : 0;
  const failures = Number(status?.failures_24h ?? 0);
  const finished24h = recent.length || 1;
  const successRate = Math.max(0, Math.round(((finished24h - failures) / finished24h) * 100));
  const queueLoad = Math.min(100, queued.length * 4);
  const engineOn = !!status?.engine?.enabled;

  return (
    <Card className="relative overflow-hidden border-emerald-200 bg-gradient-to-br from-emerald-50/70 via-white to-sky-50/70">
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent"
        animate={{ opacity: working && m.intensity > 0 ? [0.2, 1, 0.2] : 0.3 }}
        transition={{ duration: m.dur(1.8), repeat: m.repeat }}
      />

      <CardContent className="space-y-4 p-4">
        {/* header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Radar className="h-4.5 w-4.5" />
              {working && <span className="absolute inset-0 animate-ping rounded-lg bg-emerald-500/40" />}
            </span>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <LiveDot live={working} tone={working ? "sky" : engineOn ? "emerald" : "muted"} />
                {working
                  ? <PhaseRotator active phrases={PHRASES} />
                  : engineOn ? "Engine armed · idle between cycles" : "Engine switched off"}
              </div>
              <p className="text-xs text-muted-foreground">
                {fmtInt(running.length, "0")} stage(s) running · {fmtInt(queued.length, "0")} queued · {fmtInt(failures, "0")} failures in 24h ·
                synced {agoText(updated)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 text-xs">
              <Wifi className={`h-3 w-3 ${rt.connected ? "text-emerald-600" : "text-muted-foreground"}`} />
              {rt.connected ? `streaming · ${fmtInt(rt.eventCount, "0")} events` : "polling"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {okSources}/{sources.length || 0} data sources live
            </Badge>

            <RawPayloadDrawer title="live_status + research_feed" payload={{ status, feed }} />
            <Button size="sm" variant="outline" disabled={busy} onClick={load}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> Refresh deck
            </Button>
          </div>
        </div>

        {err && <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">Deck could not read the engine: {safeText(err)}</div>}

        {/* pipeline */}
        <PipelineFlow stages={stages} />

        {/* gauges + radar + heat + terminal */}
        <div className="grid gap-4 xl:grid-cols-[auto_auto_1fr]">
          <div className="flex flex-wrap items-start gap-4">
            <GaugeRing pct={successRate} value={`${successRate}%`} label="Job success 24h" tone="emerald" live={working} />
            <GaugeRing pct={sourceHealth} value={`${sourceHealth}%`} label="Source health" tone="sky" live={working} />
            <GaugeRing pct={queueLoad} value={fmtInt(queued.length, "0")} label="Queue depth" tone="amber" live={queued.length > 0} />
          </div>

          {m.heavy && (
            <div className="flex flex-col items-center gap-2">
              <RadarSweep blips={Math.max(4, running.length + Math.min(20, queued.length))} active={working} />
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Scanner</span>
            </div>
          )}


          <div className="space-y-2">
            <div className="grid gap-2 sm:grid-cols-3">
              {[
                { label: "Keywords found today", value: gains.keywords_discovered_today ?? null, icon: Search },
                { label: "Changes injected today", value: gains.changes_today ?? null, icon: Syringe },
                { label: "Waiting for approval", value: gains.awaiting_approval ?? null, icon: ClipboardCheck },
              ].map((k) => (
                <BurstOnIncrease key={k.label} value={k.value === null ? null : Number(k.value)}>
                  <div className="rounded-lg border bg-card p-3">
                    <div className="flex items-center justify-between">
                      <k.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <LiveDot live={working} tone={working ? "sky" : "emerald"} />
                    </div>
                    <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-emerald-700">
                      <FxCounter value={k.value === null ? null : Number(k.value)} replay={tick} format={(v) => fmtInt(v, "0")} />
                    </div>
                    <div className="text-xs text-muted-foreground">{k.label}</div>
                  </div>
                </BurstOnIncrease>
              ))}
            </div>
            {m.heavy && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <Activity className="h-3.5 w-3.5" /> Stage load, last 24 hours
                </div>
                <HeatGrid cells={heatCells} />
              </div>
            )}
          </div>
        </div>


        {/* realtime push ticker — the exact rows the engine just wrote */}
        {m.intensity > 0 && rt.events.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <AnimatePresence initial={false}>
              {rt.events.slice(0, 8).map((e) => (
                <motion.span
                  key={e.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: m.dur(0.25) }}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-xs text-emerald-800"
                >
                  {e.type.toLowerCase()} · {e.table.replace("seo_intel_", "")}
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        )}

        {m.heavy && <TerminalStream lines={logLines} live={working} height={200} />}


        {running.length > 0 && (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {running.map((r) => (
              <div key={String(r.id)} className="relative overflow-hidden rounded-lg border border-sky-200 bg-sky-50/60 p-3">
                <motion.span
                  className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/70 to-transparent"
                  animate={{ x: ["0%", "420%"] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
                <div className="relative flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-sky-600" /> {safeText(r.label ?? r.job_type)}
                </div>
                <div className="relative text-xs text-muted-foreground">
                  started {agoText(r.started_at)} · {fmtInt(r.records_processed, "0")} records · {safeText(r.progress, "working")}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
