// Time-range playback — scrub or auto-play through the last 7d / 30d / 90d of
// real Search Console history and watch the charts, counters and cumulative
// totals rebuild day by day. Every frame is stored data, nothing simulated.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Pause, Play, RefreshCw, Rewind, Timer } from "lucide-react";
import { fmtInt, fmtDec, safeText, fmtDate } from "@/lib/seoSafeRender";
import { LiveDot, RawPayloadDrawer } from "./SeoSafeUi";
import { FxCounter } from "./SeoLiveFx";
import { useSeoMotion } from "./SeoMotion";

const RANGES = [
  { key: "7", label: "Last 7 days", days: 7 },
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "90", label: "Last 90 days", days: 90 },
];

const SPEEDS = [0.5, 1, 2, 4];

export default function SeoPlayback() {
  const m = useSeoMotion();
  const [report, setReport] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rangeKey, setRangeKey] = useState("30");
  const [cursor, setCursor] = useState(0);       // index within the windowed series
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const raf = useRef<number | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("seo-intel-control", { body: { action: "performance_report" } });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error(safeText((data as any).error));
      setReport(data);
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const days = RANGES.find((r) => r.key === rangeKey)?.days ?? 30;
  const series: any[] = useMemo(() => {
    const all: any[] = Array.isArray(report?.series) ? report.series : [];
    return all.slice(Math.max(0, all.length - days));
  }, [report, days]);

  // reset the playhead to the end whenever the window changes
  useEffect(() => { setCursor(Math.max(0, series.length - 1)); }, [series.length]);

  // auto-play the scrubber
  useEffect(() => {
    if (!playing || series.length < 2) return;
    let last = performance.now();
    const stepMs = 700 / speed;
    const tick = (now: number) => {
      if (now - last >= stepMs) {
        last = now;
        setCursor((c) => (c >= series.length - 1 ? 0 : c + 1));
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [playing, speed, series.length]);

  const visible = useMemo(() => series.slice(0, cursor + 1), [series, cursor]);
  const frame = visible[visible.length - 1] ?? null;
  const first = visible[0] ?? null;

  const totals = useMemo(() => {
    const clicks = visible.reduce((a, d) => a + Number(d.clicks ?? 0), 0);
    const impressions = visible.reduce((a, d) => a + Number(d.impressions ?? 0), 0);
    const ctrRows = visible.filter((d) => d.ctr != null);
    const posRows = visible.filter((d) => d.avg_position != null);
    return {
      clicks,
      impressions,
      ctr: ctrRows.length ? ctrRows.reduce((a, d) => a + Number(d.ctr), 0) / ctrRows.length : null,
      position: posRows.length ? posRows.reduce((a, d) => a + Number(d.avg_position), 0) / posRows.length : null,
      best_day: visible.reduce((best, d) => (Number(d.clicks ?? 0) > Number(best?.clicks ?? -1) ? d : best), null as any),
    };
  }, [visible]);

  const deltaSinceStart = useMemo(() => {
    if (!frame || !first) return null;
    const c = Number(frame.clicks ?? 0) - Number(first.clicks ?? 0);
    const p = frame.avg_position == null || first.avg_position == null
      ? null : Number(first.avg_position) - Number(frame.avg_position);
    return { clicks: c, position: p };
  }, [frame, first]);

  const winsSoFar = useMemo(() => {
    // A "win day": clicks above the window average, or ranking better than the window average.
    const avgClicks = series.length ? series.reduce((a, d) => a + Number(d.clicks ?? 0), 0) / series.length : 0;
    const posRows = series.filter((d) => d.avg_position != null);
    const avgPos = posRows.length ? posRows.reduce((a, d) => a + Number(d.avg_position), 0) / posRows.length : null;
    return visible.filter((d) =>
      Number(d.clicks ?? 0) > avgClicks || (avgPos != null && d.avg_position != null && Number(d.avg_position) < avgPos),
    ).length;
  }, [series, visible]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Timer className="h-4 w-4 text-emerald-600" /> Time-range playback
              <LiveDot live={playing} tone={playing ? "sky" : "muted"} />
            </CardTitle>
            <CardDescription>
              Scrub or play back real Search Console history day by day and watch the charts and wins build up.
              {report?.data_label === "unavailable" && " No history stored yet — run the performance sync first."}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <RawPayloadDrawer title="performance_report series" payload={{ days, series }} />
            <Button size="sm" variant="outline" disabled={busy} onClick={load}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> Reload history
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {err && <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">{safeText(err)}</div>}

        {/* controls */}
        <div className="flex flex-wrap items-center gap-2">
          {RANGES.map((r) => (
            <Button key={r.key} size="sm" variant={rangeKey === r.key ? "default" : "outline"} onClick={() => setRangeKey(r.key)}>
              {r.label}
            </Button>
          ))}
          <span className="mx-1 h-6 w-px bg-border" />
          <Button size="sm" variant={playing ? "default" : "outline"} onClick={() => setPlaying((p) => !p)} disabled={series.length < 2}>
            {playing ? <Pause className="mr-1.5 h-3.5 w-3.5" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
            {playing ? "Pause" : "Play"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCursor(0)} disabled={!series.length}>
            <Rewind className="mr-1.5 h-3.5 w-3.5" /> Start
          </Button>
          {SPEEDS.map((s) => (
            <Button key={s} size="sm" variant={speed === s ? "secondary" : "ghost"} className="h-7 px-2 text-xs" onClick={() => setSpeed(s)}>
              {s}×
            </Button>
          ))}
          <Badge variant="outline" className="ml-auto font-mono text-xs">
            {frame ? fmtDate(frame.date) : "—"} · day {fmtInt(cursor + 1, "0")}/{fmtInt(series.length, "0")}
          </Badge>
        </div>

        <Slider
          value={[cursor]}
          min={0}
          max={Math.max(0, series.length - 1)}
          step={1}
          onValueChange={(v) => { setPlaying(false); setCursor(v[0] ?? 0); }}
        />

        {/* frame stats */}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Clicks that day", value: frame ? Number(frame.clicks ?? 0) : null, fmt: (v: number | null) => fmtInt(v, "0") },
            { label: "Cumulative clicks", value: totals.clicks, fmt: (v: number | null) => fmtInt(v, "0") },
            { label: "Avg CTR so far", value: totals.ctr, fmt: (v: number | null) => (v == null ? "—" : `${fmtDec(v, 2)}%`) },
            { label: "Avg position so far", value: totals.position, fmt: (v: number | null) => fmtDec(v, 2) },
            { label: "Win days so far", value: winsSoFar, fmt: (v: number | null) => fmtInt(v, "0") },
          ].map((s) => (
            <motion.div
              key={s.label}
              animate={m.intensity > 0 ? { scale: [1, 1.015, 1] } : undefined}
              transition={{ duration: m.dur(0.5) }}
              className="rounded-lg border bg-card p-3"
            >
              <div className="font-mono text-xl font-semibold tabular-nums text-emerald-700">
                <FxCounter value={s.value} replay={cursor} duration={m.intensity > 0 ? 350 : 1} format={s.fmt} />
              </div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </div>

        {deltaSinceStart && (
          <div className="flex flex-wrap items-center gap-4 rounded-md border bg-muted/30 p-3 text-sm">
            <span className="flex items-center gap-1.5">
              {deltaSinceStart.clicks >= 0 ? <ArrowUpRight className="h-4 w-4 text-emerald-600" /> : <ArrowDownRight className="h-4 w-4 text-red-600" />}
              <span className={deltaSinceStart.clicks >= 0 ? "text-emerald-700" : "text-red-700"}>
                {deltaSinceStart.clicks >= 0 ? "+" : ""}{fmtInt(deltaSinceStart.clicks, "0")} clicks vs the first day in view
              </span>
            </span>
            {deltaSinceStart.position != null && (
              <span className="flex items-center gap-1.5">
                {deltaSinceStart.position >= 0 ? <ArrowUpRight className="h-4 w-4 text-emerald-600" /> : <ArrowDownRight className="h-4 w-4 text-red-600" />}
                <span className={deltaSinceStart.position >= 0 ? "text-emerald-700" : "text-red-700"}>
                  {fmtDec(Math.abs(deltaSinceStart.position), 2)} places {deltaSinceStart.position >= 0 ? "better" : "worse"}
                </span>
              </span>
            )}
            {totals.best_day && (
              <span className="text-muted-foreground">
                Best day so far: {fmtDate(totals.best_day.date)} · {fmtInt(totals.best_day.clicks, "0")} clicks
              </span>
            )}
          </div>
        )}

        {/* charts rebuilding as the playhead moves */}
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg border p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Clicks & impressions</div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={visible}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="impressions" stroke="hsl(199 89% 48%)" fill="hsl(199 89% 48% / 0.15)" isAnimationActive={m.intensity > 0} />
                <Area type="monotone" dataKey="clicks" stroke="hsl(160 84% 39%)" fill="hsl(160 84% 39% / 0.25)" isAnimationActive={m.intensity > 0} />
                {frame && <ReferenceLine x={frame.date} stroke="hsl(160 84% 39%)" strokeDasharray="4 4" />}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-lg border p-3">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">CTR % and average position</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={visible}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="l" tick={{ fontSize: 10 }} />
                <YAxis yAxisId="r" orientation="right" reversed tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line yAxisId="l" type="monotone" dataKey="ctr" stroke="hsl(258 90% 66%)" dot={false} isAnimationActive={m.intensity > 0} />
                <Line yAxisId="r" type="monotone" dataKey="avg_position" stroke="hsl(24 95% 53%)" dot={false} isAnimationActive={m.intensity > 0} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
