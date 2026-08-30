import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  MinusCircle,
  PlayCircle,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";

type CheckStatus = "pass" | "warn" | "fail" | "skip";

type RunRow = {
  id: string;
  started_at: string;
  finished_at: string | null;
  run_date: string;
  trigger: string;
  status: string;
  total: number;
  passed: number;
  warned: number;
  failed: number;
  skipped: number;
  duration_ms: number | null;
  error: string | null;
};

type ResultRow = {
  id: string;
  run_id: string;
  run_date: string;
  section: string;
  check_key: string;
  name: string;
  category: string;
  provider: string | null;
  target: string | null;
  status: CheckStatus;
  http_status: number | null;
  latency_ms: number | null;
  message: string | null;
  fix_hint: string | null;
  used_in: string[] | null;
  detail: Record<string, unknown> | null;
};

const SECTION_ORDER = [
  "AI Providers",
  "Research & Crawling",
  "Payments",
  "Login & Messaging",
  "CRM & Leads",
  "Google Search & Indexing",
  "Database & Content Store",
  "Public Endpoints & SEO Delivery",
  "Content Generation & Tools",
  "Background Jobs & Queues",
];

const STATUS_META: Record<CheckStatus, { label: string; className: string; Icon: typeof CheckCircle2 }> = {
  pass: { label: "Working", className: "bg-emerald-50 text-emerald-700 border-emerald-200", Icon: CheckCircle2 },
  warn: { label: "Needs attention", className: "bg-amber-50 text-amber-700 border-amber-200", Icon: AlertTriangle },
  fail: { label: "Broken", className: "bg-red-50 text-red-700 border-red-200", Icon: XCircle },
  skip: { label: "Skipped", className: "bg-muted text-muted-foreground border-border", Icon: MinusCircle },
};

function statusRank(s: CheckStatus) {
  return s === "fail" ? 0 : s === "warn" ? 1 : s === "skip" ? 2 : 3;
}

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function fmtDay(day: string) {
  return new Date(`${day}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function AdminSystemCheck() {
  const [runs, setRuns] = useState<RunRow[]>([]);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [history, setHistory] = useState<ResultRow[]>([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [onlyProblems, setOnlyProblems] = useState(false);
  const pollRef = useRef<number | null>(null);

  const activeRun = useMemo(() => runs.find((r) => r.id === activeRunId) || null, [runs, activeRunId]);

  const loadRuns = useCallback(async () => {
    const { data, error } = await supabase
      .from("system_check_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(60);
    if (error) {
      toast.error(`Could not load system check runs: ${error.message}`);
      return [];
    }
    const rows = (data || []) as RunRow[];
    setRuns(rows);
    return rows;
  }, []);

  const loadResults = useCallback(async (runId: string) => {
    const { data, error } = await supabase
      .from("system_check_results")
      .select("*")
      .eq("run_id", runId)
      .order("section");
    if (error) {
      toast.error(`Could not load results: ${error.message}`);
      return;
    }
    setResults((data || []) as unknown as ResultRow[]);
  }, []);

  const loadHistory = useCallback(async () => {
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const { data } = await supabase
      .from("system_check_results")
      .select("check_key, name, section, status, run_date, message, run_id")
      .gte("run_date", since)
      .order("run_date", { ascending: false })
      .limit(5000);
    setHistory((data || []) as unknown as ResultRow[]);
  }, []);

  useEffect(() => {
    (async () => {
      const rows = await loadRuns();
      if (rows.length) {
        setActiveRunId(rows[0].id);
        await loadResults(rows[0].id);
      }
      await loadHistory();
      setLoading(false);
    })();
  }, [loadRuns, loadResults, loadHistory]);

  // Live polling while a run is in progress.
  useEffect(() => {
    const isLive = running || activeRun?.status === "running";
    if (!isLive || !activeRunId) {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    pollRef.current = window.setInterval(async () => {
      await loadRuns();
      await loadResults(activeRunId);
    }, 2500);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [running, activeRun?.status, activeRunId, loadRuns, loadResults]);

  const startRun = async () => {
    setRunning(true);
    setResults([]);
    toast.info("Running a full system check — every API, AI key and tool is being called for real.");
    try {
      const { data, error } = await supabase.functions.invoke("system-check", { body: {} });
      if (error) throw error;
      const runId = (data as { run_id?: string })?.run_id;
      if (runId) {
        setActiveRunId(runId);
        await loadResults(runId);
      }
      await loadRuns();
      await loadHistory();
      const failed = (data as { failed?: number })?.failed ?? 0;
      const warned = (data as { warned?: number })?.warned ?? 0;
      if (failed) toast.error(`${failed} check(s) are broken and ${warned} need attention.`);
      else if (warned) toast.warning(`Everything responded, but ${warned} check(s) need attention.`);
      else toast.success("All systems working.");
    } catch (e) {
      toast.error(`System check failed to start: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunning(false);
    }
  };

  // Poll a freshly started run so results stream in even before invoke resolves.
  useEffect(() => {
    if (!running || !activeRunId) return;
    const id = window.setInterval(() => loadResults(activeRunId), 2500);
    return () => window.clearInterval(id);
  }, [running, activeRunId, loadResults]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return results.filter((r) => {
      if (onlyProblems && r.status === "pass") return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.section.toLowerCase().includes(q) ||
        (r.provider || "").toLowerCase().includes(q) ||
        (r.message || "").toLowerCase().includes(q) ||
        (r.used_in || []).join(" ").toLowerCase().includes(q)
      );
    });
  }, [results, query, onlyProblems]);

  const grouped = useMemo(() => {
    const map = new Map<string, ResultRow[]>();
    for (const r of filtered) {
      const list = map.get(r.section) || [];
      list.push(r);
      map.set(r.section, list);
    }
    for (const [, list] of map) list.sort((a, b) => statusRank(a.status) - statusRank(b.status) || a.name.localeCompare(b.name));
    return [...map.entries()].sort(
      (a, b) => (SECTION_ORDER.indexOf(a[0]) + 100) % 100 - ((SECTION_ORDER.indexOf(b[0]) + 100) % 100),
    );
  }, [filtered]);

  const problems = useMemo(
    () => results.filter((r) => r.status === "fail" || r.status === "warn").sort((a, b) => statusRank(a.status) - statusRank(b.status)),
    [results],
  );

  // Day-to-day matrix: check → last 14 days status.
  const days = useMemo(() => {
    const set = new Set(history.map((h) => h.run_date));
    return [...set].sort().reverse().slice(0, 14);
  }, [history]);

  const matrix = useMemo(() => {
    const byKey = new Map<string, { name: string; section: string; days: Record<string, CheckStatus> }>();
    for (const h of history) {
      const entry = byKey.get(h.check_key) || { name: h.name, section: h.section, days: {} };
      // Keep the worst status seen that day so a failure is never hidden.
      const prev = entry.days[h.run_date];
      if (!prev || statusRank(h.status) < statusRank(prev)) entry.days[h.run_date] = h.status;
      byKey.set(h.check_key, entry);
    }
    const rows = [...byKey.entries()].map(([key, v]) => ({ key, ...v }));
    // Failing/flaky checks first.
    const score = (r: (typeof rows)[number]) =>
      days.reduce((acc, d) => acc + (r.days[d] === "fail" ? -3 : r.days[d] === "warn" ? -1 : 0), 0);
    return rows.sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name));
  }, [history, days]);

  const flaky = useMemo(() => matrix.filter((m) => days.some((d) => m.days[d] === "fail" || m.days[d] === "warn")), [matrix, days]);

  const progressPct = activeRun && activeRun.total ? Math.round(((activeRun.passed + activeRun.warned + activeRun.failed + activeRun.skipped) / activeRun.total) * 100) : 0;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Activity className="h-6 w-6 text-primary" />
              System Check
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              One button that really calls every service the website depends on — both OpenAI keys, Firecrawl,
              Razorpay, OTP SMS, email, Meritto, Google Search Console &amp; Indexing, the database and RPCs, the
              public SEO endpoints, and every AI content-generation function. Anything broken is listed with the
              exact API, token or backend error so it can be fixed from the backend. It also runs automatically
              every day at 7:00 AM IST.
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <Button variant="outline" onClick={() => { loadRuns(); if (activeRunId) loadResults(activeRunId); loadHistory(); }}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Button onClick={startRun} disabled={running} size="lg">
              {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
              {running ? "Testing everything…" : "Run full system check"}
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Last run</CardTitle></CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">{activeRun ? fmtTime(activeRun.started_at) : "Never"}</div>
              <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {activeRun?.trigger === "daily" ? "Automatic daily run" : "Manual run"}
                {activeRun?.duration_ms ? ` · ${(activeRun.duration_ms / 1000).toFixed(1)}s` : ""}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Working</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-600">{activeRun?.passed ?? 0}</div>
              <div className="text-xs text-muted-foreground">of {activeRun?.total ?? 0} checks</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Needs attention</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-amber-600">{activeRun?.warned ?? 0}</div>
              <div className="text-xs text-muted-foreground">degraded but not down</div>
            </CardContent>
          </Card>
          <Card className={activeRun && activeRun.failed > 0 ? "border-red-200" : undefined}>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Broken</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{activeRun?.failed ?? 0}</div>
              <div className="text-xs text-muted-foreground">needs a backend fix</div>
            </CardContent>
          </Card>
        </div>

        {(running || activeRun?.status === "running") && (
          <Card className="border-primary/30">
            <CardContent className="py-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Live run in progress — {results.length} of {activeRun?.total || "?"} checks done
                </span>
                <span className="text-muted-foreground">{progressPct}%</span>
              </div>
              <Progress value={progressPct} />
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="results">
          <TabsList>
            <TabsTrigger value="results">Section-by-section</TabsTrigger>
            <TabsTrigger value="problems">
              Problems{problems.length ? ` (${problems.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="daily">Day-to-day history</TabsTrigger>
          </TabsList>

          {/* ---------------- Section by section ---------------- */}
          <TabsContent value="results" className="mt-4 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                placeholder="Search a service, page, error or function…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="sm:max-w-sm"
              />
              <Button variant={onlyProblems ? "default" : "outline"} size="sm" onClick={() => setOnlyProblems((v) => !v)}>
                <ShieldAlert className="mr-2 h-4 w-4" /> Only problems
              </Button>
              <div className="text-xs text-muted-foreground sm:ml-auto">
                {loading ? "Loading…" : `${filtered.length} checks shown`}
              </div>
            </div>

            {!loading && results.length === 0 && (
              <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
                No run yet — press “Run full system check” to test every API, AI key and tool now.
              </CardContent></Card>
            )}

            <Accordion type="multiple" defaultValue={SECTION_ORDER} className="space-y-3">
              {grouped.map(([section, rows]) => {
                const fails = rows.filter((r) => r.status === "fail").length;
                const warns = rows.filter((r) => r.status === "warn").length;
                return (
                  <AccordionItem key={section} value={section} className="rounded-lg border bg-card px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex flex-1 flex-wrap items-center gap-2 pr-3 text-left">
                        <span className="font-semibold">{section}</span>
                        <Badge variant="outline" className="text-xs">{rows.length} checks</Badge>
                        {fails > 0 && <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{fails} broken</Badge>}
                        {warns > 0 && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{warns} to review</Badge>}
                        {fails === 0 && warns === 0 && (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">All working</Badge>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pb-4">
                      {rows.map((r) => {
                        const meta = STATUS_META[r.status] || STATUS_META.skip;
                        return (
                          <div key={r.id} className="rounded-lg border bg-background p-3">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <meta.Icon
                                    className={
                                      r.status === "pass"
                                        ? "h-4 w-4 text-emerald-600"
                                        : r.status === "warn"
                                          ? "h-4 w-4 text-amber-600"
                                          : r.status === "fail"
                                            ? "h-4 w-4 text-red-600"
                                            : "h-4 w-4 text-muted-foreground"
                                    }
                                  />
                                  <span className="font-medium">{r.name}</span>
                                </div>
                                {r.target && (
                                  <div className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{r.target}</div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {r.latency_ms != null && (
                                  <span className="text-xs text-muted-foreground">{r.latency_ms} ms</span>
                                )}
                                {r.http_status != null && (
                                  <Badge variant="outline" className="text-xs">HTTP {r.http_status}</Badge>
                                )}
                                <Badge variant="outline" className={`text-xs ${meta.className}`}>{meta.label}</Badge>
                              </div>
                            </div>

                            {r.message && (
                              <p
                                className={`mt-2 text-sm ${
                                  r.status === "fail" ? "text-red-700" : r.status === "warn" ? "text-amber-700" : "text-muted-foreground"
                                }`}
                              >
                                {r.message}
                              </p>
                            )}

                            {r.status !== "pass" && r.fix_hint && (
                              <p className="mt-2 rounded-md bg-muted px-3 py-2 text-xs">
                                <span className="font-semibold">How to fix: </span>
                                {r.fix_hint}
                              </p>
                            )}

                            {(r.used_in?.length ?? 0) > 0 && (
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <span className="text-xs font-medium text-muted-foreground">Used in:</span>
                                {r.used_in!.map((u) => (
                                  <Badge key={u} variant="secondary" className="text-xs font-normal">{u}</Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </TabsContent>

          {/* ---------------- Problems ---------------- */}
          <TabsContent value="problems" className="mt-4 space-y-3">
            {problems.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
                Nothing is broken in the latest run.
              </CardContent></Card>
            ) : (
              problems.map((r) => (
                <Card key={r.id} className={r.status === "fail" ? "border-red-200" : "border-amber-200"}>
                  <CardContent className="space-y-2 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{r.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{r.section}</Badge>
                        <Badge variant="outline" className={`text-xs ${STATUS_META[r.status].className}`}>
                          {STATUS_META[r.status].label}
                        </Badge>
                      </div>
                    </div>
                    <p className={`text-sm ${r.status === "fail" ? "text-red-700" : "text-amber-700"}`}>{r.message}</p>
                    {r.fix_hint && (
                      <p className="rounded-md bg-muted px-3 py-2 text-xs">
                        <span className="font-semibold">How to fix: </span>{r.fix_hint}
                      </p>
                    )}
                    {(r.used_in?.length ?? 0) > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Impact:</span>
                        {r.used_in!.map((u) => (
                          <Badge key={u} variant="secondary" className="text-xs font-normal">{u}</Badge>
                        ))}
                      </div>
                    )}
                    {r.detail && Object.keys(r.detail).length > 0 && (
                      <details className="text-xs text-muted-foreground">
                        <summary className="cursor-pointer">Raw response / diagnostics</summary>
                        <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-muted p-3 text-xs">
                          {JSON.stringify(r.detail, null, 2)}
                        </pre>
                      </details>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ---------------- Daily history ---------------- */}
          <TabsContent value="daily" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Runs (latest 60)</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-2 text-left">When</th>
                      <th className="py-2 text-left">Trigger</th>
                      <th className="py-2 text-left">Result</th>
                      <th className="py-2 text-right">Working</th>
                      <th className="py-2 text-right">Attention</th>
                      <th className="py-2 text-right">Broken</th>
                      <th className="py-2 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.map((r) => (
                      <tr key={r.id} className={`border-b last:border-0 ${r.id === activeRunId ? "bg-muted/40" : ""}`}>
                        <td className="py-2">{fmtTime(r.started_at)}</td>
                        <td className="py-2">
                          <Badge variant="outline" className="text-xs">{r.trigger === "daily" ? "Daily auto" : "Manual"}</Badge>
                        </td>
                        <td className="py-2">
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              r.status === "failed"
                                ? STATUS_META.fail.className
                                : r.status === "degraded"
                                  ? STATUS_META.warn.className
                                  : r.status === "running"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : STATUS_META.pass.className
                            }`}
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="py-2 text-right text-emerald-700">{r.passed}</td>
                        <td className="py-2 text-right text-amber-700">{r.warned}</td>
                        <td className="py-2 text-right font-semibold text-red-700">{r.failed}</td>
                        <td className="py-2 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setActiveRunId(r.id); loadResults(r.id); }}
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {runs.length === 0 && (
                      <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No runs recorded yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Failures day by day (last {days.length || 0} days with runs)</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {flaky.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No check has failed on any recorded day.
                  </p>
                ) : (
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="text-xs uppercase text-muted-foreground">
                      <tr className="border-b">
                        <th className="py-2 text-left">Check</th>
                        {days.map((d) => (
                          <th key={d} className="px-1 py-2 text-center font-medium">{fmtDay(d)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {flaky.map((row) => (
                        <tr key={row.key} className="border-b last:border-0">
                          <td className="py-2 pr-3">
                            <div className="font-medium">{row.name}</div>
                            <div className="text-xs text-muted-foreground">{row.section}</div>
                          </td>
                          {days.map((d) => {
                            const st = row.days[d];
                            const cls =
                              st === "fail"
                                ? "bg-red-500"
                                : st === "warn"
                                  ? "bg-amber-400"
                                  : st === "pass"
                                    ? "bg-emerald-500"
                                    : "bg-muted";
                            return (
                              <td key={d} className="px-1 py-2 text-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className={`inline-block h-4 w-4 rounded ${cls}`} aria-label={`${fmtDay(d)}: ${st || "no run"}`} />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {fmtDay(d)} — {st ? STATUS_META[st].label : "no run"}
                                  </TooltipContent>
                                </Tooltip>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded bg-emerald-500" /> Working</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded bg-amber-400" /> Needs attention</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded bg-red-500" /> Broken</span>
                  <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded bg-muted" /> No run that day</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
