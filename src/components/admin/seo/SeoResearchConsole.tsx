// Research Console — the live, animated face of the autonomous SEO engine.
//
// Every number, line of the feed and insight on this screen comes from recorded
// backend state (seo_intel_jobs.progress, seo_intel_activity, seo_intel_keywords,
// seo_intel_content_gaps, seo_intel_competitors, seo_intel_experiments). The
// animation reflects the worker's real current step — when nothing is running,
// the console says so instead of faking motion.

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Activity, Bot, Radar, Search, Sparkles, Target, TrendingUp, Users, Loader2,
  RefreshCw, CheckCircle2, AlertTriangle, Zap,
} from "lucide-react";
import { callControl } from "./SeoLiveOps";
import { asText } from "@/components/admin/seo/SeoLiveOps";

const num = (v: any) => (v === null || v === undefined ? "—" : Number(v).toLocaleString("en-IN"));
const ago = (v: any) => {
  if (!v) return "never";
  const s = Math.max(0, Math.round((Date.now() - new Date(v).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
};

type Progress = { step?: string; pct?: number | null; detail?: string | null; target?: string | null; at?: string };
type RunningJob = { id: string; job_type: string; label?: string; started_at: string; progress?: Progress | null; records_processed?: number };

const LEVEL_STYLES: Record<string, string> = {
  success: "text-emerald-600",
  warn: "text-amber-600",
  error: "text-destructive",
  info: "text-sky-600",
};

/* ───────── the animated "engine is thinking" strip ───────── */

const ResearchPulse = ({ jobs }: { jobs: RunningJob[] }) => {
  const active = jobs[0];
  return (
    <div className="relative overflow-hidden rounded-xl border bg-sky-50/60 p-4">
      {/* decorative sweep — must never intercept clicks */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-sky-200/50 to-transparent"
        animate={{ x: active ? ["0%", "400%"] : "0%" }}
        transition={{ duration: 2.4, repeat: active ? Infinity : 0, ease: "linear" }}
      />
      <div className="relative flex flex-wrap items-start gap-3">
        <div className="mt-0.5">
          {active
            ? <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
            : <Radar className="h-5 w-5 text-muted-foreground" />}
        </div>
        <div className="min-w-0 flex-1">
          {active ? (
            <>
              <p className="text-sm font-semibold text-sky-900">
                {active.label ?? active.job_type}
                <span className="ml-2 font-normal text-sky-700">
                  {active.progress?.step ?? "starting"}
                </span>
              </p>
              {active.progress?.target && (
                <p className="mt-0.5 truncate text-xs text-sky-700/80">{active.progress.target}</p>
              )}
              <Progress value={active.progress?.pct ?? 5} className="mt-2 h-1.5" />
              <p className="mt-1 text-xs text-muted-foreground">
                Running for {ago(active.started_at).replace(" ago", "")} · updated {ago(active.progress?.at ?? active.started_at)}
                {jobs.length > 1 ? ` · ${jobs.length - 1} more job(s) in flight` : ""}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold">No research job is running right now</p>
              <p className="text-xs text-muted-foreground">
                The engine works on its schedule. Use “Research now” to start a discovery cycle immediately.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const GainTile = ({ icon: Icon, label, value, hint }: { icon: any; label: string; value: any; hint?: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
    className="rounded-lg border bg-card p-3"
  >
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5" /> {label}
    </div>
    <div className="mt-1 text-2xl font-semibold tabular-nums">{num(value)}</div>
    {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
  </motion.div>
);

const SeoResearchConsole = () => {
  const [live, setLive] = useState<any>(null);
  const [feed, setFeed] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const timer = useRef<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [l, f] = await Promise.all([
        callControl("live_status"),
        callControl("research_feed", { hours: 24 }),
      ]);
      setLive(l); setFeed(f); setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    load();
    timer.current = window.setInterval(load, 5000);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [load]);

  const run = async (only: string[], label: string) => {
    setBusy(label);
    try {
      await callControl("run_now", { only });
      toast.success(`${label} queued — watch the console for live progress.`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not queue the job");
    } finally { setBusy(null); }
  };

  const toggleAutonomous = async (on: boolean) => {
    setBusy("autonomous");
    try {
      await callControl("save_settings", { settings: { autonomous_mode: on } });
      toast.success(on
        ? "Autonomous mode on — the engine will apply safe title and meta wins by itself."
        : "Autonomous mode off — every change now waits for your approval.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save the setting");
    } finally { setBusy(null); }
  };

  const running: RunningJob[] = live?.running ?? [];
  const gains = feed?.gains ?? {};

  return (
    <div className="space-y-6">
      {err && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" />
          <span>{err}</span>
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-sky-600" /> Research &amp; Rank console
              </CardTitle>
              <CardDescription>
                Live view of what the engine is researching right now, what it learned in the last 24 hours,
                and what it changed. All values are read from recorded backend state.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-medium">Autonomous mode</span>
                <Switch
                  checked={!!live?.autonomous_mode}
                  disabled={busy === "autonomous"}
                  onCheckedChange={toggleAutonomous}
                />
              </div>
              <Button size="sm" variant="outline" onClick={load}>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ResearchPulse jobs={running} />

          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={!!busy} onClick={() => run(["keyword_discovery"], "Keyword research")}>
              <Search className="mr-1.5 h-3.5 w-3.5" /> Research keywords now
            </Button>
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run(["competitor_deep"], "Competitor teardown")}>
              <Users className="mr-1.5 h-3.5 w-3.5" /> Tear down competitors
            </Button>
            <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run(["analyze"], "AI analysis")}>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Analyse &amp; recommend
            </Button>
            <Button size="sm" variant="outline" disabled={!!busy || !live?.autonomous_mode} onClick={() => run(["auto_apply"], "Autonomous apply")}>
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Apply safe wins
            </Button>
            {busy && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {busy}…</span>}
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <GainTile icon={Search} label="Keywords found (24h)" value={gains.keywords_discovered} hint="Search Console + Semrush" />
            <GainTile icon={Sparkles} label="Found today" value={gains.keywords_discovered_today} />
            <GainTile icon={Target} label="Open content gaps" value={gains.gaps_open} />
            <GainTile icon={Users} label="Competitors analysed" value={gains.competitors_analysed} hint="Firecrawl, actual" />
            <GainTile icon={TrendingUp} label="Changes today" value={gains.changes_today} />
            <GainTile icon={Activity} label="Awaiting approval" value={gains.awaiting_approval} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Live research feed</CardTitle>
            <CardDescription>Actual worker events from the last 24 hours, newest first.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[360px] pr-3">
              <AnimatePresence initial={false}>
                {(feed?.activity ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No engine events recorded in this window yet.</p>
                )}
                {(feed?.activity ?? []).map((a: any) => (
                  <motion.div
                    key={a.id}
                    layout
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                    className="border-b py-2 last:border-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className={`text-sm font-medium ${LEVEL_STYLES[a.level] ?? ""}`}>{a.event}</p>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">{ago(a.created_at)}</span>
                    </div>
                    {a.detail && <p className="mt-0.5 text-xs text-muted-foreground">{asText(a.detail, "")}</p>}
                    {(a.label || a.records) && (
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {a.label && <Badge variant="outline" className="text-xs">{a.label}</Badge>}
                        {a.records ? <Badge variant="secondary" className="text-xs">{num(a.records)} records</Badge> : null}
                        {a.data_source && <Badge variant="outline" className="text-xs">{a.data_source}</Badge>}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Keywords the engine just found</CardTitle>
            <CardDescription>
              Striking-distance queries from Search Console (actual) plus Semrush expansion (estimated volume).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[360px] pr-3">
              {(feed?.new_keywords ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No new keywords in this window. Run “Research keywords now” to start a discovery cycle.
                </p>
              )}
              {(feed?.new_keywords ?? []).map((k: any, i: number) => (
                <motion.div
                  key={`${k.keyword}-${i}`}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  className="border-b py-2 last:border-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{k.keyword}</p>
                    <span className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                      {k.search_volume ? `${num(k.search_volume)}/mo` : "volume unavailable"}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {k.intent && <Badge variant="outline" className="text-xs">{k.intent}</Badge>}
                    {k.difficulty != null && <Badge variant="secondary" className="text-xs">KD {Math.round(k.difficulty)}</Badge>}
                    {k.current_position != null && <Badge variant="outline" className="text-xs">now #{Math.round(k.current_position)}</Badge>}
                    <Badge variant="outline" className="text-xs">
                      {k.discovery_source === "gsc" ? "Search Console (actual)" : "Semrush (estimated)"}
                    </Badge>
                  </div>
                  {k.discovered_from && (
                    <p className="mt-0.5 text-xs text-muted-foreground">from our ranking query “{k.discovered_from}”</p>
                  )}
                </motion.div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Why competitors outrank us</CardTitle>
            <CardDescription>Crawled competitor pages compared against our own, with the change to make.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[360px] pr-3">
              {(feed?.competitor_insights ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No competitor teardown recorded yet. Run “Tear down competitors” once a competitor scan has stored SERP owners.
                </p>
              )}
              {(feed?.competitor_insights ?? []).map((c: any, i: number) => (
                <motion.div
                  key={`${c.domain}-${c.keyword}-${i}`}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="border-b py-3 last:border-0"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{c.domain}</p>
                    {c.their_position != null && <Badge className="text-xs">they #{Math.round(c.their_position)}</Badge>}
                    {c.our_position != null && <Badge variant="outline" className="text-xs">us #{Math.round(c.our_position)}</Badge>}
                    {c.keyword && <Badge variant="secondary" className="text-xs">{c.keyword}</Badge>}
                  </div>
                  {c.why_outranking && <p className="mt-1 text-xs text-muted-foreground">{c.why_outranking}</p>}
                  {c.what_to_change && (
                    <p className="mt-1 whitespace-pre-line text-xs">{c.what_to_change}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {c.word_count ? `${num(c.word_count)} words` : "word count unavailable"}
                    {c.faq_count ? ` · ${c.faq_count} FAQ blocks` : ""}
                    {c.schema_types?.length ? ` · schema: ${c.schema_types.slice(0, 4).join(", ")}` : ""}
                    {` · read ${ago(c.last_checked_at)}`}
                  </p>
                </motion.div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Content gaps worth building</CardTitle>
            <CardDescription>Open gaps found from our own ranking data and crawled competitor coverage.</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[360px] pr-3">
              {(feed?.content_gaps ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No open content gaps recorded yet.</p>
              )}
              {(feed?.content_gaps ?? []).map((g: any) => (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="border-b py-2 last:border-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{g.title}</p>
                    <Badge variant={g.priority === "high" ? "default" : "outline"} className="text-xs">
                      {g.priority}
                    </Badge>
                  </div>
                  {g.description && <p className="mt-0.5 text-xs text-muted-foreground">{g.description}</p>}
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-xs">{g.gap_type}</Badge>
                    {g.keyword && <Badge variant="secondary" className="text-xs">{g.keyword}</Badge>}
                    {g.path && <Badge variant="outline" className="text-xs">{g.path}</Badge>}
                  </div>
                </motion.div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Changes made and being measured</CardTitle>
          <CardDescription>
            Every applied change stores a before/after baseline; the outcome is measured from Search Console after the window closes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(feed?.changes ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No change has been applied and baselined yet.</p>
          ) : (
            <div className="space-y-2">
              {(feed?.changes ?? []).map((c: any) => (
                <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{c.path}</p>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-xs">{c.change_type}</Badge>
                      <Badge
                        variant={c.outcome === "improved" ? "default" : c.outcome === "declined" ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {c.outcome ?? "pending"}
                      </Badge>
                    </div>
                  </div>
                  {c.change_summary && <p className="mt-0.5 text-xs text-muted-foreground">{c.change_summary}</p>}
                  <div className="mt-1 grid gap-1 text-xs sm:grid-cols-2">
                    <p className="text-muted-foreground">Before: {asText(c.before_value)}</p>
                    <p>After: {asText(c.after_value)}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Changed {c.changed_on}
                    {c.baseline_position != null ? ` · baseline position ${Number(c.baseline_position).toFixed(1)}` : ""}
                    {c.measure_after ? ` · measured after ${c.measure_after}` : ""}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SeoResearchConsole;
