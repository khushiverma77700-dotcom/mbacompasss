// Live SEO Analytics — the "is this tool actually working?" screen.
//
// Everything on this panel comes from the coverage_pulse action, which computes
// real numbers out of stored engine data (Search Console performance, crawl
// snapshots, PageSpeed audits, keyword research, recorded change experiments).
// Nothing is simulated: a lever with no collected signal reads "not measured
// yet" instead of showing a score. The motion is only there to make live work
// legible — the values behind it are the actual database state.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Gauge, Layers, Loader2,
  RefreshCw, Search, Sparkles, Target, TrendingUp,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { callControl, type LiveStatus } from "@/components/admin/seo/SeoLiveOps";
import { asText } from "@/components/admin/seo/SeoLiveOps";

type Lever = {
  id: number; group: string; name: string; scope: "page" | "keyword";
  applicable: number; passed: number; failed: number; coverage: number | null; measured: boolean;
};

type Pulse = {
  totals: Record<string, number>;
  levers: Lever[];
  groups: Array<{ group: string; levers: number; measured: number; coverage: number | null }>;
  overall_coverage: number | null;
  levers_total: number;
  levers_measured: number;
  gap_queue: Lever[];
  outcomes: {
    changes_tracked: number; measured: number; awaiting_measurement: number;
    improved: number; declined: number; neutral: number;
    avg_position_delta: number | null; total_clicks_delta: number;
    recent: any[];
  };
  trend: Array<Record<string, any>>;
  server_time: string;
};

const nf = (v: any) => (v === null || v === undefined ? "—" : Number(v).toLocaleString("en-IN"));
const pctOf = (v: number | null | undefined) => (v === null || v === undefined ? "—" : `${Math.round(v * 100)}%`);
const when = (v: any) => (v ? new Date(v).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");

/* ── animated number ── */
const Counter = ({ value, digits = 0 }: { value: number | null | undefined; digits?: number }) => {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const target = Number(value ?? 0);
    const start = from.current;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 700);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(start + (target - start) * eased);
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  if (value === null || value === undefined) return <>—</>;
  return <>{digits ? shown.toFixed(digits) : Math.round(shown).toLocaleString("en-IN")}</>;
};

/* ── animated coverage ring ── */
const Ring = ({ value, label, sub }: { value: number | null; label: string; sub?: string }) => {
  const r = 46;
  const c = 2 * Math.PI * r;
  const v = value ?? 0;
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-28 w-28 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" strokeWidth="10" className="stroke-muted" />
          <motion.circle
            cx="60" cy="60" r={r} fill="none" strokeWidth="10" strokeLinecap="round"
            className="stroke-primary"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - v) }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold">{value === null ? "—" : <><Counter value={v * 100} />%</>}</span>
        </div>
      </div>
      <div>
        <div className="text-sm font-medium">{label}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  );
};

const Tile = ({ icon: Icon, label, value, sub, tone = "" }: any) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
    className="rounded-lg border bg-card p-3"
  >
    <div className="flex items-center justify-between">
      <Icon className="h-4 w-4 text-muted-foreground" />
      {sub && <span className={`text-xs font-semibold tracking-wide ${tone || "text-muted-foreground"}`}>{sub}</span>}
    </div>
    <div className="mt-2 text-xl font-semibold">{typeof value === "number" ? <Counter value={value} /> : value}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </motion.div>
);

const coverageTone = (v: number | null) => {
  if (v === null) return "bg-muted";
  if (v >= 0.85) return "bg-emerald-500";
  if (v >= 0.6) return "bg-sky-500";
  if (v >= 0.35) return "bg-amber-500";
  return "bg-red-500";
};

/* ───────────────────────── panel ───────────────────────── */

const SeoLiveAnalytics = ({
  status, onRunStage,
}: {
  status: LiveStatus | null;
  onRunStage: (types: string[], label: string) => Promise<void>;
}) => {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const data = await callControl("coverage_pulse");
      if (alive.current) { setPulse(data); setError(null); }
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    load();
    const id = setInterval(load, 20000);
    return () => { alive.current = false; clearInterval(id); };
  }, [load]);

  const run = async (types: string[], label: string) => {
    setBusy(label);
    try { await onRunStage(types, label); } finally { setBusy(null); setTimeout(load, 4000); }
  };

  const running = status?.running ?? [];
  const groups = pulse?.groups ?? [];
  const byGroup = useMemo(() => {
    const map: Record<string, Lever[]> = {};
    for (const l of pulse?.levers ?? []) (map[l.group] ??= []).push(l);
    return map;
  }, [pulse]);

  const t = pulse?.totals ?? {};
  const kwCoverage = t.pages ? (t.pages_with_primary_keyword ?? 0) / t.pages : null;

  return (
    <div className="space-y-4">
      {/* live work strip */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="relative flex h-2.5 w-2.5">
                  <span className={`absolute inline-flex h-full w-full rounded-full ${running.length ? "animate-ping bg-sky-400" : "bg-emerald-400"}`} />
                  <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${running.length ? "bg-sky-500" : "bg-emerald-500"}`} />
                </span>
                Live now
              </CardTitle>
              <CardDescription>
                {running.length
                  ? `${running.length} stage(s) working in the backend right now — this keeps running even if you close the browser.`
                  : "No stage is executing this second. The engine works on its schedule and the numbers below update automatically."}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run(["gsc_pages", "gsc_queries", "keyword_discovery", "keyword_metrics"], "Keyword research")}>
                {busy === "Keyword research" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Research keywords for all pages
              </Button>
              <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run(["crawl_pages", "live_crawl", "speed_audit", "index_check"], "Technical scan")}>
                {busy === "Technical scan" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Layers className="mr-2 h-4 w-4" />}
                Scan technical SEO gaps
              </Button>
              <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run(["verify", "impact_attribution", "daily_snapshot"], "Outcome check")}>
                {busy === "Outcome check" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}
                Measure outcome of changes
              </Button>
              <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="mr-2 h-4 w-4" /> Refresh</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {running.length === 0 ? (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Idle. Last data refresh: {when(pulse?.server_time)}
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {running.map((j: any) => {
                  const p = j.progress ?? {};
                  return (
                    <motion.div
                      key={j.id}
                      layout
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="rounded-md border bg-sky-50/60 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-medium">
                          {status?.job_labels?.[j.job_type] ?? j.job_type}
                          {p.target ? <span className="ml-2 font-normal text-muted-foreground">{p.target}</span> : null}
                        </div>
                        <Badge variant="outline" className="border-sky-200 bg-white text-sky-800">
                          {p.step ?? "working"}{p.records ? ` · ${nf(p.records)} records` : ""}
                        </Badge>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded bg-sky-100">
                        <motion.div
                          className="h-full rounded bg-sky-500"
                          initial={{ width: 0 }}
                          animate={p.pct == null
                            ? { width: ["10%", "80%", "35%"] }
                            : { width: `${p.pct}%` }}
                          transition={p.pct == null
                            ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
                            : { duration: 0.6 }}
                        />
                      </div>
                      {p.detail && <div className="mt-1 text-xs text-muted-foreground">{asText(p.detail, "")}</div>}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4" /> Could not load live analytics: {error}
        </div>
      )}

      {loading && !pulse ? (
        <Card><CardContent className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Reading the engine's stored measurements…
        </CardContent></Card>
      ) : pulse && (
        <>
          {/* headline coverage */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">64-lever AI SEO coverage</CardTitle>
                <CardDescription>Share of applicable pages/keywords passing each measured lever.</CardDescription></CardHeader>
              <CardContent>
                <Ring
                  value={pulse.overall_coverage}
                  label={`${pulse.levers_measured} of ${pulse.levers_total} levers measured`}
                  sub={`${nf(t.pages)} pages · ${nf(t.keywords)} keywords in scope`}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Keyword research coverage</CardTitle>
                <CardDescription>Pages that already have a researched primary keyword.</CardDescription></CardHeader>
              <CardContent>
                <Ring
                  value={kwCoverage}
                  label={`${nf(t.pages_with_primary_keyword)} of ${nf(t.pages)} pages targeted`}
                  sub={`${nf(t.keywords_with_volume)} keywords with real volume data · ${nf(t.keywords_ranked)} rank-tracked`}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Outcome of applied changes</CardTitle>
                <CardDescription>Measured before vs after, from recorded experiments.</CardDescription></CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md border bg-emerald-50 p-2">
                    <div className="text-lg font-semibold text-emerald-700"><Counter value={pulse.outcomes.improved} /></div>
                    <div className="text-xs text-emerald-800">Improved</div>
                  </div>
                  <div className="rounded-md border bg-muted/50 p-2">
                    <div className="text-lg font-semibold"><Counter value={pulse.outcomes.neutral} /></div>
                    <div className="text-xs text-muted-foreground">No change</div>
                  </div>
                  <div className="rounded-md border bg-red-50 p-2">
                    <div className="text-lg font-semibold text-red-700"><Counter value={pulse.outcomes.declined} /></div>
                    <div className="text-xs text-red-800">Declined</div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {pulse.outcomes.measured} of {pulse.outcomes.changes_tracked} tracked changes have a measured result
                  {pulse.outcomes.awaiting_measurement ? ` · ${pulse.outcomes.awaiting_measurement} still inside their waiting period` : ""}.
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">
                    Avg position move: {pulse.outcomes.avg_position_delta === null ? "not measured yet"
                      : `${pulse.outcomes.avg_position_delta > 0 ? "+" : ""}${pulse.outcomes.avg_position_delta.toFixed(2)}`}
                  </Badge>
                  <Badge variant="outline">
                    Clicks change: {pulse.outcomes.total_clicks_delta > 0 ? "+" : ""}{nf(pulse.outcomes.total_clicks_delta)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* work-done tiles */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <Tile icon={Layers} label="Pages crawled" value={t.pages_crawled} sub="CALCULATED" />
            <Tile icon={Gauge} label="Pages speed-audited" value={t.pages_speed_audited} sub="ACTUAL" tone="text-emerald-700" />
            <Tile icon={Search} label="Pages index-checked" value={t.pages_index_checked} sub="ACTUAL" tone="text-emerald-700" />
            <Tile icon={Target} label="Keywords in top 10" value={t.keywords_top10} sub="ACTUAL" tone="text-emerald-700" />
            <Tile icon={Sparkles} label="Changes applied" value={t.recommendations_applied} sub="CALCULATED" />
            <Tile icon={Activity} label="Open recommendations" value={t.recommendations_open} sub="AI" tone="text-violet-700" />
          </div>

          {/* lever matrix */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">The 64 levers, group by group</CardTitle>
              <CardDescription>
                Green means most pages already pass, red means a real gap the engine can work on. A grey bar means the
                signal has not been collected yet, so no score is shown.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {groups.map((g) => (
                <div key={g.group}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium">{g.group}</div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{g.measured}/{g.levers} measured</span>
                      <Badge variant="outline">{pctOf(g.coverage)} covered</Badge>
                    </div>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {(byGroup[g.group] ?? []).map((l, i) => (
                      <motion.div
                        key={l.id}
                        initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        className="rounded-md border p-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-xs font-medium leading-snug">{l.id}. {l.name}</div>
                          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {l.measured ? pctOf(l.coverage) : "—"}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded bg-muted">
                          <motion.div
                            className={`h-full rounded ${coverageTone(l.measured ? l.coverage : null)}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${(l.coverage ?? 0) * 100}%` }}
                            transition={{ duration: 0.9, ease: "easeOut" }}
                          />
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {l.measured
                            ? `${nf(l.passed)} pass · ${nf(l.failed)} to fix (of ${nf(l.applicable)} ${l.scope === "keyword" ? "keywords" : "pages"})`
                            : "Not measured yet — run the matching scan"}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* gap queue */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Biggest technical SEO gaps right now</CardTitle>
                <CardDescription>Ranked by how many pages actually fail the check.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[320px] pr-3">
                  <div className="space-y-2">
                    {pulse.gap_queue.length === 0 && (
                      <div className="rounded-md border bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
                        No failing checks recorded. Run a technical scan to refresh this list.
                      </div>
                    )}
                    {pulse.gap_queue.map((l) => (
                      <motion.div key={l.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="rounded-md border p-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm">{l.name}</div>
                          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-800">
                            {nf(l.failed)} pages
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{l.group} · {pctOf(l.coverage)} of pages already pass</div>
                        <Progress value={(l.coverage ?? 0) * 100} className="mt-2 h-1.5" />
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* trend + recent outcomes */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Is it working? Clicks vs changes applied</CardTitle>
                <CardDescription>Daily snapshots captured by the engine from Search Console.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pulse.trend.length < 2 ? (
                  <div className="rounded-md border bg-muted/40 px-3 py-6 text-center text-sm text-muted-foreground">
                    At least two daily snapshots are needed before a trend can be drawn.
                  </div>
                ) : (
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={pulse.trend}>
                        <defs>
                          <linearGradient id="clk" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="captured_on" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Area type="monotone" dataKey="clicks" stroke="hsl(var(--primary))" fill="url(#clk)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="space-y-2">
                  {pulse.outcomes.recent.length === 0 && (
                    <div className="text-xs text-muted-foreground">No changes recorded yet.</div>
                  )}
                  {pulse.outcomes.recent.slice(0, 5).map((e: any, i: number) => {
                    const up = Number(e.position_delta) > 0;
                    return (
                      <div key={i} className="flex items-start justify-between gap-2 rounded-md border p-2 text-xs">
                        <div className="min-w-0">
                          <div className="truncate font-medium">{e.path ?? e.keyword ?? "—"}</div>
                          <div className="truncate text-muted-foreground">{e.change_summary ?? e.change_type} · {e.changed_on}</div>
                        </div>
                        <Badge variant="outline" className={up ? "border-emerald-200 bg-emerald-50 text-emerald-800" : ""}>
                          {e.position_delta == null
                            ? "measuring"
                            : <span className="flex items-center gap-1">
                                {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                {Math.abs(Number(e.position_delta)).toFixed(1)} pos
                              </span>}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default SeoLiveAnalytics;
