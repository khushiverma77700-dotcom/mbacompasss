// Live "Wins" board — every improvement the site is actually recording.
//
// Data comes from `seo-intel-control` → `wins_report`, which compares real
// Search Console windows (last 7d vs previous 7d vs all-time) and the stored
// previous-window numbers for each page and keyword. Nothing is invented: if a
// metric has no baseline it is shown as "no baseline yet" instead of a win.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList,
} from "recharts";
import {
  ArrowDownRight, ArrowUpRight, Award, Flame, Gauge, MousePointerClick, RefreshCw,
  Search, Sparkles, Trophy, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { fmtDec, fmtInt, fmtPct, fmtRatioPct, fmtWhen, agoText, safeText } from "@/lib/seoSafeRender";
import { LiveDot, RawPayloadDrawer, Scanline } from "./SeoSafeUi";

const PHASES = [
  "Reading Search Console windows…",
  "Comparing this week with last week…",
  "Scoring page-level gains…",
  "Detecting new page-1 keywords…",
  "Ranking the biggest wins…",
  "Wins board live.",
];

const useLivePhase = (busy: boolean) => {
  const [phase, setPhase] = useState(PHASES[PHASES.length - 1]);
  useEffect(() => {
    if (!busy) { setPhase(PHASES[PHASES.length - 1]); return; }
    let i = 0;
    setPhase(PHASES[0]);
    const t = setInterval(() => { i = (i + 1) % (PHASES.length - 1); setPhase(PHASES[i]); }, 800);
    return () => clearInterval(t);
  }, [busy]);
  return phase;
};

/** Count-up number that replays on every refresh so the board always feels live. */
const Counter = ({ value, format, replay = 0 }: { value: number | null; format: (v: number | null) => string; replay?: number }) => {
  const [shown, setShown] = useState<number | null>(value);
  const prev = useRef<number | null>(0);
  useEffect(() => {
    if (value === null) { setShown(null); prev.current = null; return; }
    const from = prev.current ?? 0;
    prev.current = value;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 900);
      setShown(from + (value - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, replay]);
  return <>{format(shown)}</>;
};

const WinPill = ({ improved, pct, unitLabel }: { improved: boolean; pct: number | null; unitLabel: string }) => {
  const Icon = improved ? ArrowUpRight : ArrowDownRight;
  return (
    <Badge className={`gap-1 text-[10px] ${improved ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100" : "bg-red-100 text-red-800 hover:bg-red-100"}`}>
      <Icon className="h-3 w-3" /> {fmtPct(pct)} {unitLabel}
    </Badge>
  );
};

const HeroStat = ({ icon: Icon, label, value, sub, live, replay }: {
  icon: any; label: string; value: number | null; sub: string; live: boolean; replay: number;
}) => (
  <Card className="relative overflow-hidden border-emerald-200">
    <div className="absolute inset-x-0 top-0"><Scanline active={live} /></div>
    <CardContent className="space-y-1.5 p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {label}
        </span>
        <LiveDot live={live} tone={live ? "sky" : "emerald"} />
      </div>
      <div className="font-mono text-2xl font-semibold tabular-nums text-emerald-700">
        <Counter value={value} format={(v) => fmtInt(v, "0")} replay={replay} />
      </div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </CardContent>
  </Card>
);

export default function SeoWinsBoard() {
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [spotlight, setSpotlight] = useState(0);
  const [tab, setTab] = useState("pages");
  const phase = useLivePhase(busy || loading);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("seo-intel-control", { body: { action: "wins_report" } });
      if (error) throw new Error(error.message);
      if ((res as any)?.error) throw new Error(safeText((res as any).error));
      setData(res);
      setTick((t) => t + 1);
      setLastUpdated(new Date().toISOString());
      setErr(null);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 45_000);
    return () => clearInterval(t);
  }, [load]);

  const totals = data?.totals ?? {};
  const siteWins: any[] = Array.isArray(data?.site_wins) ? data.site_wins : [];
  const pageWins: any[] = Array.isArray(data?.page_wins) ? data.page_wins : [];
  const kwWins: any[] = Array.isArray(data?.keyword_wins) ? data.keyword_wins : [];
  const changeWins: any[] = Array.isArray(data?.change_wins) ? data.change_wins : [];
  const compare: any[] = Array.isArray(data?.compare) ? data.compare : [];
  const live = busy || loading;

  // Rotating spotlight of the biggest wins — keeps the panel visibly moving.
  const highlights = useMemo(() => {
    const items: Array<{ title: string; detail: string; tone: string }> = [];
    pageWins.slice(0, 6).forEach((p) => items.push({
      title: safeText(p.path),
      detail: [
        p.click_delta > 0 ? `+${fmtInt(p.click_delta)} clicks` : null,
        p.position_gain > 0 ? `${fmtDec(p.position_gain, 1)} positions better` : null,
        p.ctr_pct > 0 ? `CTR ${fmtPct(p.ctr_pct)}` : null,
      ].filter(Boolean).join(" · "),
      tone: "emerald",
    }));
    kwWins.slice(0, 6).forEach((k) => items.push({
      title: safeText(k.keyword),
      detail: [
        k.position_gain > 0 ? `up ${fmtDec(k.position_gain, 1)} places to #${fmtDec(k.current_position, 1)}` : null,
        k.entered_top3 ? "entered top 3" : k.entered_top10 ? "entered page 1" : null,
      ].filter(Boolean).join(" · "),
      tone: "sky",
    }));
    siteWins.filter((w) => w.improved).slice(0, 4).forEach((w) => items.push({
      title: safeText(w.label),
      detail: `${fmtPct(w.pct)} vs baseline`,
      tone: "amber",
    }));
    return items;
  }, [pageWins, kwWins, siteWins]);

  useEffect(() => {
    if (highlights.length < 2) return;
    const t = setInterval(() => setSpotlight((s) => (s + 1) % highlights.length), 3200);
    return () => clearInterval(t);
  }, [highlights.length]);

  const winRate = totals.site_checks ? Math.round((Number(totals.site_wins ?? 0) / Number(totals.site_checks)) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* live strip */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-sky-50">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Trophy className="h-4 w-4" />
              {live && <span className="absolute inset-0 animate-ping rounded-lg bg-emerald-500/40" />}
            </span>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <LiveDot live={live} tone={live ? "sky" : "emerald"} />
                <AnimatePresence mode="wait">
                  <motion.span key={phase} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
                    {phase}
                  </motion.span>
                </AnimatePresence>
              </div>
              <p className="text-xs text-muted-foreground">
                {fmtInt(totals.pages_tracked, "0")} pages and {fmtInt(totals.keywords_tracked, "0")} keywords compared with their
                previous window · refreshed {fmtWhen(lastUpdated)} ({agoText(lastUpdated)})
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {data?.data_label === "actual" ? "ACTUAL — Search Console + engine" : "NO DATA"}
            </Badge>
            <RawPayloadDrawer title="wins_report payload" payload={data} />
            <Button size="sm" variant="outline" disabled={busy} onClick={async () => { await load(); toast.success("Wins re-checked"); }}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> Re-check wins
            </Button>
          </div>
        </CardContent>
      </Card>

      {err && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-sm text-red-800">Could not build the wins board: {safeText(err)}</CardContent>
        </Card>
      )}

      {/* win feed + counters + win-rate gauge in one compact deck */}
      <div className="grid gap-3 xl:grid-cols-[1fr_auto]">
        <div className="space-y-3">
          {/* rotating spotlight — three wins visible, cycling */}
          <Card className="relative overflow-hidden">
            <div className="absolute inset-x-0 top-0"><Scanline active={live} /></div>
            <CardContent className="p-3">
              {highlights.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No improvement recorded yet in the current comparison window. As soon as a page gains clicks, CTR or
                  ranking against its previous window it appears here automatically.
                </p>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                    <Flame className="h-4 w-4" />
                    {live && <span className="absolute inset-0 animate-ping rounded-lg bg-amber-300/50" />}
                  </span>
                  <div className="grid min-w-0 flex-1 gap-1.5 sm:grid-cols-3">
                    {[0, 1, 2].map((off) => {
                      const h = highlights[(spotlight + off) % highlights.length];
                      if (!h) return null;
                      return (
                        <AnimatePresence mode="wait" key={off}>
                          <motion.div
                            key={`${h.title}-${off}-${spotlight}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.3, delay: off * 0.06 }}
                            className="min-w-0 rounded-md border bg-muted/20 px-2.5 py-1.5"
                          >
                            <div className="truncate text-xs font-semibold">{h.title}</div>
                            <div className="truncate text-[11px] text-emerald-700">{h.detail || "improving"}</div>
                          </motion.div>
                        </AnimatePresence>
                      );
                    })}
                  </div>
                  <div className="hidden shrink-0 items-center gap-1 sm:flex">
                    {highlights.slice(0, 10).map((_, i) => (
                      <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === spotlight % Math.min(10, highlights.length) ? "bg-emerald-600" : "bg-muted"}`} />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* headline win counters */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <BurstOnIncrease value={totals.clicks_gained ?? null}>
              <HeroStat icon={MousePointerClick} live={live} replay={tick} label="Extra clicks won" value={totals.clicks_gained ?? null}
                sub={`Across ${fmtInt(totals.page_wins, "0")} improving pages`} />
            </BurstOnIncrease>
            <BurstOnIncrease value={totals.positions_gained ?? null}>
              <HeroStat icon={Gauge} live={live} replay={tick} label="Ranking places gained" value={totals.positions_gained ?? null}
                sub={`${fmtInt(totals.keyword_wins, "0")} keywords moved up`} />
            </BurstOnIncrease>
            <BurstOnIncrease value={totals.top10_entries ?? null}>
              <HeroStat icon={Award} live={live} replay={tick} label="New page-1 keywords" value={totals.top10_entries ?? null}
                sub={`${fmtInt(totals.top3_entries, "0")} of them reached the top 3`} />
            </BurstOnIncrease>
            <BurstOnIncrease value={totals.site_wins ?? null}>
              <HeroStat icon={Sparkles} live={live} replay={tick} label="Winning site metrics" value={totals.site_wins ?? null}
                sub={`Out of ${fmtInt(totals.site_checks, "0")} site-level checks`} />
            </BurstOnIncrease>
          </div>
        </div>

        {/* win rate gauge + per-metric chips */}
        <Card className="xl:w-[320px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Win rate right now</CardTitle>
            <CardDescription className="text-xs">Site-level comparisons currently beating their baseline.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-center gap-4">
              <GaugeRing pct={winRate} value={`${winRate}%`} label="Checks improving" tone="emerald" live={live} size={116} />
              <RadarSweep blips={Math.max(4, Math.min(20, pageWins.length))} active={live} size={104} />
            </div>
            <div className="text-center text-xs text-muted-foreground">
              {fmtInt(totals.site_wins, "0")} of {fmtInt(totals.site_checks, "0")} checks improving
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {siteWins.map((w, i) => (
                <motion.div key={`${w.label}-${tick}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    {safeText(w.label)}
                    <WinPill improved={!!w.improved} pct={w.pct} unitLabel="" />
                  </Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* animated comparison chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">This week vs last week vs all-time average</CardTitle>
          <CardDescription>
            Animated on every refresh. Green means the last 7 days beat the previous 7 days; for average position a lower bar is better.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {compare.length === 0 ? (
            <p className="text-sm text-muted-foreground">No Search Console windows stored yet.</p>
          ) : (
            <>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart key={`cmp-${tick}`} data={compare}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="previous" name="Previous 7 days" fill="hsl(210 20% 78%)" animationDuration={900} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="current" name="Last 7 days" fill="hsl(150 60% 45%)" animationDuration={1200} radius={[3, 3, 0, 0]}>
                      <LabelList dataKey="current" position="top" style={{ fontSize: 10 }} />
                    </Bar>
                    <Bar dataKey="all_time" name="All-time average" fill="hsl(210 90% 62%)" animationDuration={1500} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {compare.map((c, i) => {
                  const improved = c.current != null && c.previous != null
                    ? (c.lower_is_better ? c.current < c.previous : c.current > c.previous) : null;
                  const pct = c.previous ? Number((((c.current - c.previous) / Math.abs(c.previous)) * 100).toFixed(2)) : null;
                  return (
                    <motion.div key={`${c.metric}-${tick}`} initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.08 }} className="rounded-lg border bg-muted/20 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{safeText(c.metric)}</div>
                      <div className="mt-1 font-mono text-lg font-semibold tabular-nums">
                        <Counter value={c.current ?? null} format={(v) => fmtDec(v, 2)} replay={tick} />
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">was {fmtDec(c.previous, 2)} · all-time {fmtDec(c.all_time, 2)}</div>
                      {improved === null
                        ? <Badge variant="outline" className="mt-1 text-[10px]">No baseline yet</Badge>
                        : <div className="mt-1"><WinPill improved={improved} pct={pct} unitLabel="vs last week" /></div>}
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* detailed win lists */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Every recorded win</CardTitle>
          <CardDescription>Sorted by impact. Each row is a real comparison against that item's own previous window.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex-wrap">
              <TabsTrigger value="pages">Pages ({fmtInt(pageWins.length, "0")})</TabsTrigger>
              <TabsTrigger value="keywords">Keywords ({fmtInt(kwWins.length, "0")})</TabsTrigger>
              <TabsTrigger value="changes">Applied changes ({fmtInt(changeWins.length, "0")})</TabsTrigger>
            </TabsList>

            <TabsContent value="pages" className="pt-3">
              {pageWins.length === 0 ? (
                <p className="text-sm text-muted-foreground">No page improved against its previous window yet.</p>
              ) : (
                <div className="space-y-2">
                  {pageWins.map((p, i) => (
                    <motion.div key={`${p.path}-${tick}`} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.6) }}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{safeText(p.path)}</div>
                        <div className="text-xs text-muted-foreground">
                          {fmtInt(p.clicks)} clicks (was {fmtInt(p.prev_clicks)}) · CTR {fmtRatioPct(p.ctr)} (was {fmtRatioPct(p.prev_ctr)}) ·
                          position {fmtDec(p.avg_position, 1)} (was {fmtDec(p.prev_avg_position, 1)})
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {p.click_delta > 0 && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px]"><MousePointerClick className="mr-1 h-3 w-3" />+{fmtInt(p.click_delta)} clicks</Badge>}
                        {p.position_gain > 0 && <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100 text-[10px]"><TrendingUp className="mr-1 h-3 w-3" />+{fmtDec(p.position_gain, 1)} places</Badge>}
                        {p.ctr_pct > 0 && <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100 text-[10px]"><Search className="mr-1 h-3 w-3" />CTR {fmtPct(p.ctr_pct)}</Badge>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="keywords" className="pt-3">
              {kwWins.length === 0 ? (
                <p className="text-sm text-muted-foreground">No keyword moved up in the latest check.</p>
              ) : (
                <div className="space-y-2">
                  {kwWins.map((k, i) => (
                    <motion.div key={`${k.keyword}-${tick}`} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.6) }}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card p-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{safeText(k.keyword)}</div>
                        <div className="text-xs text-muted-foreground">
                          #{fmtDec(k.current_position, 1)} (was #{fmtDec(k.previous_position, 1)}) · best #{fmtDec(k.best_position, 1)} ·
                          volume {fmtInt(k.search_volume)} · {safeText(k.target_path)}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {k.position_gain > 0 && <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px]"><TrendingUp className="mr-1 h-3 w-3" />+{fmtDec(k.position_gain, 1)} places</Badge>}
                        {k.entered_top3 && <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px]"><Trophy className="mr-1 h-3 w-3" />Top 3</Badge>}
                        {!k.entered_top3 && k.entered_top10 && <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-100 text-[10px]"><Award className="mr-1 h-3 w-3" />Page 1</Badge>}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="changes" className="pt-3">
              {changeWins.length === 0 ? (
                <p className="text-sm text-muted-foreground">No applied change has a measured positive outcome yet.</p>
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {changeWins.map((c, i) => (
                    <motion.div key={`${c.category}-${c.change_type}-${tick}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.04, 0.6) }} className="rounded-lg border bg-card p-3">
                      <div className="text-sm font-medium">{safeText(c.change_type)} · {safeText(c.category)}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {fmtInt(c.succeeded, "0")} of {fmtInt(c.implemented, "0")} applied changes measured as successful ·
                        avg position change {fmtDec(c.avg_position_delta, 2)} · avg CTR change {fmtRatioPct(c.avg_ctr_delta)} ·
                        typical impact after {fmtDec(c.avg_days_to_impact, 1)} days
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
