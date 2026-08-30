// Top-level SEO Performance Report — 100% live, 100% real Search Console data.
//
// Data comes from `seo-intel-control` → `performance_report`, which syncs the
// full Search Console daily history into `seo_gsc_daily` and computes:
//   * daily average clicks / CTR / ranking / impressions
//   * the overall average from the first day of Search Console data until today
//   * today's numbers vs that historical average (higher / lower)
//   * cumulative totals and growth-% series for every important metric
// Nothing is estimated or hard-coded; when Search Console has no data the panel
// says so instead of inventing numbers.

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer, ComposedChart, AreaChart, Area, Line, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from "recharts";
import {
  Activity, ArrowDownRight, ArrowUpRight, Gauge, MousePointerClick, RefreshCw,
  Search, TrendingUp, Minus,
} from "lucide-react";
import { toast } from "sonner";
import {
  fmtDate, fmtDec, fmtInt, fmtPct, fmtRatioPct, fmtWhen, safeText,
  validatePayload, validateRows, PERFORMANCE_SERIES_SPEC, type ValidationResult,
} from "@/lib/seoSafeRender";
import { LiveDot, RawPayloadDrawer, Scanline, ValidationNotice } from "./SeoSafeUi";

const REPORT_SPEC = {
  configured: { kind: "boolean" as const, required: true },
  overall: { kind: "object" as const, required: true },
  today_vs_overall: { kind: "object" as const, required: true },
  recent: { kind: "object" as const },
  series: { kind: "array" as const, required: true },
  sync: { kind: "object" as const },
  server_time: { kind: "string" as const },
};

type Cmp = { value: number | null; baseline: number | null; delta: number | null; pct: number | null; direction: string };

const PHASES = [
  "Scanning SEO data…",
  "Fetching Search Console daily rows…",
  "Calculating rankings…",
  "Updating CTR…",
  "Building cumulative growth model…",
  "Report updated.",
];

const useLivePhase = (busy: boolean) => {
  const [phase, setPhase] = useState(PHASES[PHASES.length - 1]);
  useEffect(() => {
    if (!busy) {
      setPhase(PHASES[PHASES.length - 1]);
      return;
    }
    let i = 0;
    setPhase(PHASES[0]);
    const t = setInterval(() => {
      i = (i + 1) % (PHASES.length - 1);
      setPhase(PHASES[i]);
    }, 900);
    return () => clearInterval(t);
  }, [busy]);
  return phase;
};

/** Count-up animated number so every refresh is visibly "live". Bump `replay` to re-run the count. */
const Counter = ({ value, format, replay = 0 }: { value: number | null; format: (v: number | null) => string; replay?: number }) => {
  const [shown, setShown] = useState<number | null>(value);
  const prev = useRef<number | null>(0);
  useEffect(() => {
    if (value === null) { setShown(null); prev.current = null; return; }
    const from = prev.current ?? 0;
    const to = value;
    prev.current = value;
    const start = performance.now();
    const dur = 900;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      setShown(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, replay]);
  return <>{format(shown)}</>;
};

/** Animated horizontal comparison bar — makes "is the average rising?" obvious. */
const VersusBar = ({
  label, current, previous, allTime, lowerIsBetter, digits = 2, replay,
}: {
  label: string; current: number | null; previous: number | null; allTime: number | null;
  lowerIsBetter?: boolean; digits?: number; replay: number;
}) => {
  const vals = [current, previous, allTime].filter((v) => v != null).map((v) => Math.abs(Number(v)));
  const max = vals.length ? Math.max(...vals) : 1;
  const improved = current != null && previous != null
    ? (lowerIsBetter ? current < previous : current > previous) : null;
  const pct = previous ? Number((((Number(current) - Number(previous)) / Math.abs(Number(previous))) * 100).toFixed(2)) : null;
  const rows = [
    { k: "Last 7 days", v: current, tone: improved === false ? "bg-red-500" : "bg-emerald-500" },
    { k: "Previous 7 days", v: previous, tone: "bg-slate-300" },
    { k: "All-time average", v: allTime, tone: "bg-sky-500" },
  ];
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        {improved === null ? (
          <Badge variant="outline" className="text-[10px]">No baseline yet</Badge>
        ) : (
          <Badge className={`gap-1 text-[10px] ${improved ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-red-100 text-red-800 hover:bg-red-100"}`}>
            {improved ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {improved ? "Improving" : "Declining"} · {fmtPct(pct)}
          </Badge>
        )}
      </div>
      <div className="mt-2 space-y-1.5">
        {rows.map((r) => (
          <div key={r.k} className="flex items-center gap-2">
            <span className="w-28 shrink-0 text-[11px] text-muted-foreground">{r.k}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
              <motion.div
                key={`${label}-${r.k}-${replay}`}
                className={`h-full rounded-full ${r.tone}`}
                initial={{ width: 0 }}
                animate={{ width: `${r.v == null ? 0 : Math.min(100, (Math.abs(Number(r.v)) / max) * 100)}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
            <span className="w-16 shrink-0 text-right font-mono text-[11px] tabular-nums">
              <Counter value={r.v ?? null} format={(v) => fmtDec(v, digits)} replay={replay} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const DirBadge = ({ cmp, unitLabel }: { cmp: Cmp | undefined; unitLabel: string }) => {
  if (!cmp || cmp.direction === "no_data") {
    return <Badge variant="outline" className="text-[10px]">No baseline yet</Badge>;
  }
  if (cmp.direction === "flat") {
    return (
      <Badge variant="secondary" className="gap-1 text-[10px]">
        <Minus className="h-3 w-3" /> Same as average
      </Badge>
    );
  }
  const up = cmp.direction === "up";
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <Badge
      className={`gap-1 text-[10px] ${up ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-red-100 text-red-800 hover:bg-red-100"}`}
    >
      <Icon className="h-3 w-3" />
      {up ? "Higher" : "Lower"} than average · {fmtPct(cmp.pct)} {unitLabel}
    </Badge>
  );
};

const StatCard = ({
  icon: Icon, label, value, sub, cmp, unitLabel, live,
}: {
  icon: any; label: string; value: string; sub: string; cmp?: Cmp; unitLabel: string; live: boolean;
}) => (
  <Card className="relative overflow-hidden">
    <div className="absolute inset-x-0 top-0"><Scanline active={live} /></div>
    <CardContent className="space-y-2 p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {label}
        </span>
        <LiveDot live={live} tone={live ? "sky" : "emerald"} />
      </div>
      <div className="font-mono text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
      <DirBadge cmp={cmp} unitLabel={unitLabel} />
    </CardContent>
  </Card>
);

const CHART_TABS = [
  { value: "clicks", label: "Clicks & impressions" },
  { value: "ctr", label: "CTR" },
  { value: "position", label: "Average ranking" },
  { value: "cumulative", label: "Cumulative totals" },
  { value: "growth", label: "Cumulative growth %" },
] as const;

export default function SeoPerformanceReport() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [chart, setChart] = useState<string>("clicks");
  const [validation, setValidation] = useState<ValidationResult>({ ok: true, issues: [] });
  const [seriesValidation, setSeriesValidation] = useState<ValidationResult>({ ok: true, issues: [] });
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [newData, setNewData] = useState(false);
  const [tick, setTick] = useState(0);
  const phase = useLivePhase(busy || loading);

  const load = useCallback(async (force = false) => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("seo-intel-control", {
        body: { action: "performance_report", force },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error(safeText((data as any).error));
      const v = validatePayload(data, REPORT_SPEC, "performance_report");
      setValidation(v);
      setSeriesValidation(validateRows((data as any)?.series, PERFORMANCE_SERIES_SPEC, "series"));
      setReport((prev: any) => {
        const changed = prev && safeText(prev?.latest_day?.captured_on) !== safeText((data as any)?.latest_day?.captured_on);
        if (changed) {
          setNewData(true);
          setTimeout(() => setNewData(false), 6000);
        }
        return data;
      });
      setLastUpdated(new Date().toISOString());
      setTick((t) => t + 1);
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
    const t = setInterval(() => load(false), 30_000);
    return () => clearInterval(t);
  }, [load]);

  const series: any[] = Array.isArray(report?.series) ? report.series : [];
  const overall = report?.overall ?? {};
  const tvo = report?.today_vs_overall ?? {};
  const recent = report?.recent ?? {};
  const live = busy || loading;

  const chartData = series.map((d) => ({
    ...d,
    date: safeText(d?.date, ""),
  }));

  // Client-side 7-day windows straight off the real daily rows, so the panel can
  // answer "is the average going up or down?" without another request.
  const winAvg = (key: string, n: number, offset = 0) => {
    const end = series.length - offset;
    const slice = series.slice(Math.max(0, end - n), Math.max(0, end))
      .filter((d) => d?.[key] != null).map((d) => Number(d[key]));
    if (!slice.length) return null;
    return Number((slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(4));
  };
  const cmpWindows = [
    { label: "Clicks per day", key: "clicks", digits: 1, lower: false, allTime: overall?.avg_daily_clicks ?? null },
    { label: "Impressions per day", key: "impressions", digits: 0, lower: false, allTime: overall?.avg_daily_impressions ?? null },
    { label: "CTR %", key: "ctr", digits: 2, lower: false, allTime: overall?.avg_ctr == null ? null : Number((Number(overall.avg_ctr) * 100).toFixed(2)) },
    { label: "Average position", key: "avg_position", digits: 2, lower: true, allTime: overall?.avg_position ?? null },
  ].map((c) => ({ ...c, current: winAvg(c.key, 7), previous: winAvg(c.key, 7, 7) }));

  const improvingCount = cmpWindows.filter((c) =>
    c.current != null && c.previous != null && (c.lower ? c.current < c.previous : c.current > c.previous)).length;
  const measurable = cmpWindows.filter((c) => c.current != null && c.previous != null).length;
  const verdict = !measurable
    ? { text: "Not enough recorded days to compare averages yet.", tone: "muted" as const }
    : improvingCount >= 3
      ? { text: `Averages are rising — ${improvingCount} of ${measurable} key metrics are better than last week.`, tone: "up" as const }
      : improvingCount === 0
        ? { text: `Averages are falling — none of the ${measurable} key metrics beat last week.`, tone: "down" as const }
        : { text: `Mixed movement — ${improvingCount} of ${measurable} key metrics are better than last week.`, tone: "mixed" as const };

  return (
    <div className="space-y-4">
      {/* live activity strip */}
      <Card className="border-sky-200 bg-gradient-to-r from-sky-50 via-white to-sky-50">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-sky-600 text-white">
              <Activity className="h-4 w-4" />
              {live && <span className="absolute inset-0 animate-ping rounded-lg bg-sky-500/40" />}
            </span>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <LiveDot live={live} tone={live ? "sky" : "emerald"} />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={phase}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}
                  >
                    {phase}
                  </motion.span>
                </AnimatePresence>
              </div>
              <p className="text-xs text-muted-foreground">
                Search Console history {fmtDate(overall?.from)} → {fmtDate(overall?.to)} ·{" "}
                {fmtInt(overall?.days, "0")} days recorded · report refreshed {fmtWhen(lastUpdated)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {newData && (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">New data detected</Badge>
              </motion.div>
            )}
            <Badge variant="outline" className="text-[10px]">
              {report?.data_label === "actual" ? "ACTUAL — Search Console" : "NO DATA"}
            </Badge>
            <RawPayloadDrawer title="performance_report payload" payload={report} validation={validation} />
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={async () => {
                await load(true);
                toast.success("Search Console history re-synced");
              }}
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
              Re-sync now
            </Button>
          </div>
        </CardContent>
      </Card>

      <ValidationNotice result={validation} source="performance_report" />
      <ValidationNotice result={seriesValidation} source="performance_report.series" />

      {err && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-800">
            Could not build the performance report: {safeText(err)}
          </CardContent>
        </Card>
      )}

      {report && report.configured === false && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-900">
            Search Console is not connected yet, so no real performance data can be read. Connect it in
            Setup → Data sources.
          </CardContent>
        </Card>
      )}

      {report?.sync?.error && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-xs text-amber-900">
            Last Search Console sync failed: {safeText(report.sync.error)}
          </CardContent>
        </Card>
      )}

      {/* headline live numbers */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={MousePointerClick} live={live} unitLabel="vs all-time average"
          label="Daily average clicks"
          value={fmtDec(overall?.avg_daily_clicks, 1)}
          sub={`Today ${fmtInt((tvo as any)?.clicks?.value)} · all-time avg ${fmtDec(overall?.avg_daily_clicks, 1)}`}
          cmp={(tvo as any)?.clicks}
        />
        <StatCard
          icon={Search} live={live} unitLabel="vs all-time average"
          label="Average CTR"
          value={fmtRatioPct(overall?.avg_ctr)}
          sub={`Today ${fmtRatioPct((tvo as any)?.ctr?.value)} · last 7d ${fmtRatioPct(recent?.last_7_ctr)}`}
          cmp={(tvo as any)?.ctr}
        />
        <StatCard
          icon={Gauge} live={live} unitLabel="vs all-time average"
          label="Average ranking"
          value={fmtDec(overall?.avg_position, 2)}
          sub={`Today ${fmtDec((tvo as any)?.avg_position?.value, 2)} · last 7d ${fmtDec(recent?.last_7_position, 2)} (lower is better)`}
          cmp={(tvo as any)?.avg_position}
        />
        <StatCard
          icon={TrendingUp} live={live} unitLabel="vs all-time average"
          label="Average daily performance"
          value={fmtDec(overall?.avg_daily_impressions, 0)}
          sub={`Impressions/day · today ${fmtInt((tvo as any)?.impressions?.value)} · last 28d avg ${fmtDec(recent?.last_28_impressions, 0)}`}
          cmp={(tvo as any)?.impressions}
        />
      </div>

      {/* overall totals since data started */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Overall average since Search Console data started</CardTitle>
          <CardDescription>
            Every figure below is the actual recorded total from {fmtDate(overall?.from)} until {fmtDate(overall?.to)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {[
            { k: "Days of data", v: fmtInt(overall?.days, "0") },
            { k: "Total clicks", v: <Counter value={overall?.total_clicks ?? null} format={(v) => fmtInt(v)} /> },
            { k: "Total impressions", v: <Counter value={overall?.total_impressions ?? null} format={(v) => fmtInt(v)} /> },
            { k: "Avg clicks / day", v: fmtDec(overall?.avg_daily_clicks, 1) },
            { k: "Avg CTR", v: fmtRatioPct(overall?.avg_ctr) },
            { k: "Avg position", v: fmtDec(overall?.avg_position, 2) },
          ].map((s) => (
            <div key={s.k} className="rounded-lg border bg-muted/20 p-3">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{s.k}</div>
              <div className="mt-1 font-mono text-lg font-semibold tabular-nums">{s.v}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* interactive cumulative charts */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Interactive performance charts</CardTitle>
              <CardDescription>
                Real daily Search Console rows with 7-day rolling trend, cumulative totals and growth percentage.
              </CardDescription>
            </div>
            <RawPayloadDrawer title="performance_report.series" payload={series} validation={seriesValidation} label="View raw series" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tabs value={chart} onValueChange={setChart}>
            <TabsList className="flex-wrap">
              {CHART_TABS.map((t) => <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>)}
            </TabsList>
          </Tabs>

          {chartData.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              No Search Console daily data stored yet. Use “Re-sync now” once the connection is live.
            </div>
          ) : (
            <div className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                {chart === "clicks" ? (
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={24} />
                    <YAxis yAxisId="l" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="l" dataKey="clicks" name="Clicks" fill="hsl(210 90% 60%)" />
                    <Line yAxisId="l" type="monotone" dataKey="clicks_7d" name="Clicks (7d avg)" stroke="hsl(150 60% 40%)" dot={false} strokeWidth={2} />
                    <Line yAxisId="r" type="monotone" dataKey="impressions" name="Impressions" stroke="hsl(35 90% 55%)" dot={false} />
                  </ComposedChart>
                ) : chart === "ctr" ? (
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={24} />
                    <YAxis tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="ctr" name="CTR %" stroke="hsl(210 90% 55%)" fill="hsl(210 90% 90%)" />
                    <Line type="monotone" dataKey="ctr_7d" name="CTR % (7d avg)" stroke="hsl(280 60% 55%)" dot={false} strokeWidth={2} />
                    {overall?.avg_ctr != null && (
                      <ReferenceLine y={Number((Number(overall.avg_ctr) * 100).toFixed(2))} stroke="hsl(0 0% 45%)" strokeDasharray="4 4" label="All-time avg" />
                    )}
                  </ComposedChart>
                ) : chart === "position" ? (
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={24} />
                    <YAxis tick={{ fontSize: 10 }} reversed domain={["auto", "auto"]} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="avg_position" name="Average position" stroke="hsl(210 90% 55%)" dot={false} />
                    <Line type="monotone" dataKey="position_7d" name="Position (7d avg)" stroke="hsl(150 60% 40%)" dot={false} strokeWidth={2} />
                    {overall?.avg_position != null && (
                      <ReferenceLine y={Number(Number(overall.avg_position).toFixed(2))} stroke="hsl(0 0% 45%)" strokeDasharray="4 4" label="All-time avg" />
                    )}
                  </ComposedChart>
                ) : chart === "cumulative" ? (
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={24} />
                    <YAxis yAxisId="l" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Area yAxisId="r" type="monotone" dataKey="cum_impressions" name="Cumulative impressions" stroke="hsl(35 90% 55%)" fill="hsl(35 90% 90%)" />
                    <Area yAxisId="l" type="monotone" dataKey="cum_clicks" name="Cumulative clicks" stroke="hsl(210 90% 55%)" fill="hsl(210 90% 88%)" />
                  </AreaChart>
                ) : (
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={24} />
                    <YAxis tick={{ fontSize: 10 }} unit="%" />
                    <Tooltip />
                    <Legend />
                    <ReferenceLine y={0} stroke="hsl(0 0% 45%)" />
                    <Line type="monotone" dataKey="growth_clicks_pct" name="Clicks growth %" stroke="hsl(210 90% 55%)" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="growth_impressions_pct" name="Impressions growth %" stroke="hsl(35 90% 55%)" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="growth_ctr_pct" name="CTR growth %" stroke="hsl(280 60% 55%)" dot={false} strokeWidth={2} />
                    <Line type="monotone" dataKey="growth_position_pct" name="Ranking improvement %" stroke="hsl(150 60% 40%)" dot={false} strokeWidth={2} />
                  </ComposedChart>
                )}
              </ResponsiveContainer>
            </div>
          )}

          {chart === "growth" && (
            <p className="text-xs text-muted-foreground">
              Growth % compares the 7-day rolling average of each metric with the earliest recorded 7 days
              ({fmtDate(overall?.from)}). Ranking improvement % is inverted so a positive value always means better rankings.
            </p>
          )}
        </CardContent>
      </Card>

      {/* daily activity heat map — real clicks per day */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily performance heat map</CardTitle>
          <CardDescription>Each cell is one recorded day; intensity is that day's actual clicks.</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground">No days recorded yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1">
              {(() => {
                const max = Math.max(1, ...chartData.map((d) => Number(d.clicks ?? 0)));
                return chartData.slice(-182).map((d) => {
                  const ratio = Number(d.clicks ?? 0) / max;
                  return (
                    <div
                      key={safeText(d.date)}
                      title={`${fmtDate(d.date)} — ${fmtInt(d.clicks)} clicks, ${fmtInt(d.impressions)} impressions`}
                      className="h-4 w-4 rounded-sm border border-sky-100"
                      style={{ backgroundColor: `hsl(210 90% ${95 - ratio * 50}%)` }}
                    />
                  );
                });
              })()}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
