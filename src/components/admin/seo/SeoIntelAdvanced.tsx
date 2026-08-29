// Advanced intelligence panels for the AI SEO Intelligence Center.
//
// Every panel renders stored evidence only. When a table has no rows yet the
// panel says so plainly instead of showing a fabricated placeholder number.

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  ArrowUpRight, Activity, AlertTriangle, Gauge, GitBranch, Layers, LineChart,
  Link2, Loader2, RefreshCw, Sparkles, Target, TrendingUp,
} from "lucide-react";

export interface IntelData {
  locale: string;
  demand: any[]; intent: any[]; serp: any[]; volatility: any[]; forecasts: any[];
  cannibalization: any[]; gaps: any[]; entities: any[]; links: any[]; ctr: any[];
  anomalies: any[]; opportunities: any[]; profiles: any[]; learning: any[];
  graph: any[]; strategy: any | null; keyword_sources: any[];
}

const num = (v: any, d = 0) => (v == null || Number.isNaN(Number(v)) ? "—" : Number(v).toFixed(d));
const pct = (v: any, d = 1) => (v == null ? "—" : `${Number(v) > 0 ? "+" : ""}${Number(v).toFixed(d)}%`);

export function ConfidenceBadge({ value }: { value?: string | number | null }) {
  if (value == null) return <Badge variant="outline">unrated</Badge>;
  const v = typeof value === "number" ? (value >= 0.7 ? "high" : value >= 0.4 ? "medium" : "low") : String(value);
  const cls =
    v === "high" ? "bg-primary/10 text-primary border-primary/30"
    : v === "medium" ? "bg-muted text-foreground"
    : v === "insufficient" ? "bg-destructive/10 text-destructive border-destructive/30"
    : "bg-muted/60 text-muted-foreground";
  return <Badge variant="outline" className={cls}>{v}</Badge>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-muted-foreground">{children}</p>;
}

function StageButton({
  stage, label, busy, onRun,
}: { stage: string; label: string; busy: string | null; onRun: (stage: string, label: string) => void }) {
  return (
    <Button size="sm" variant="outline" disabled={!!busy} onClick={() => onRun(stage, label)}>
      {busy === stage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
      {label}
    </Button>
  );
}

/* ─────────────────────── hook ─────────────────────── */

export function useIntelData() {
  const [data, setData] = useState<IntelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const call = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    const { data: res, error } = await supabase.functions.invoke("seo-intel-control", { body: { action, ...payload } });
    if (error) throw new Error(error.message);
    if ((res as any)?.error) throw new Error((res as any).error);
    return res as any;
  }, []);

  const load = useCallback(async (silent = false) => {
    try {
      setData(await call("intel_snapshot"));
    } catch (e) {
      if (!silent) toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [call]);

  useEffect(() => { load(); }, [load]);

  const runStage = useCallback(async (stage: string, label: string) => {
    setBusy(stage);
    try {
      await call("run_now", { only: [stage] });
      toast.success(`${label} queued — results appear here as the engine finishes.`);
      setTimeout(() => load(true), 12_000);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }, [call, load]);

  const setItemStatus = useCallback(async (table: string, id: string, status: string) => {
    try {
      await call("intel_item_action", { table, id, status });
      toast.success("Updated.");
      load(true);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [call, load]);

  return { data, loading, busy, load, runStage, setItemStatus, call };
}

/* ─────────────────────── panels ─────────────────────── */

export function StrategyPanel({ intel, busy, runStage }: { intel: IntelData | null; busy: string | null; runStage: any }) {
  const s = intel?.strategy;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <StageButton stage="strategy" label="Generate growth strategy" busy={busy} onRun={runStage} />
        <StageButton stage="opportunity_score" label="Rescore opportunities" busy={busy} onRun={runStage} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> AI SEO growth strategy</CardTitle>
          <CardDescription>
            Written only from stored Search Console, Semrush, crawl and outcome data. Areas without evidence are reported as insufficient data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!s ? (
            <Empty>No strategy generated yet. Run the generator once the monitoring stages have collected data.</Empty>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <ConfidenceBadge value={s.confidence} />
                <span>Generated {new Date(s.created_at).toLocaleString()}</span>
                {s.data_coverage && (
                  <span>· evidence: {Object.entries(s.data_coverage).map(([k, v]) => `${k.replace(/_/g, " ")} ${v}`).join(", ")}</span>
                )}
              </div>
              <p className="text-sm">{s.summary}</p>
              <div className="space-y-3">
                {(s.priorities ?? []).map((p: any, i: number) => (
                  <div key={i} className="rounded-lg border p-3">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Badge>{p.rank ?? i + 1}</Badge>
                      <span className="font-medium">{p.area}</span>
                      <ConfidenceBadge value={p.confidence} />
                    </div>
                    {p.headline && <p className="mb-2 text-sm text-muted-foreground">{p.headline}</p>}
                    <ul className="space-y-2 text-sm">
                      {(p.actions ?? []).map((a: any, j: number) => (
                        <li key={j} className="rounded-md bg-muted/40 p-2">
                          <div className="font-medium">{a.what}</div>
                          <div className="text-xs text-muted-foreground">
                            {a.path && <span className="mr-2">Page: {a.path}</span>}
                            {a.keyword && <span className="mr-2">Keyword: {a.keyword}</span>}
                            {a.effort && <span>Effort: {a.effort}</span>}
                          </div>
                          {a.evidence && <div className="mt-1 text-xs">Evidence: {a.evidence}</div>}
                          {a.expected_effect && <div className="text-xs text-muted-foreground">Expected: {a.expected_effect}</div>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">What has actually worked on this site</CardTitle>
          <CardDescription>Outcome history the recommendation engine learns from.</CardDescription>
        </CardHeader>
        <CardContent>
          {!intel?.learning?.length ? (
            <Empty>No applied change has been measured yet, so there is nothing to learn from.</Empty>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Category</TableHead><TableHead>Change type</TableHead><TableHead>Applied</TableHead>
                <TableHead>Worked</TableHead><TableHead>Avg position change</TableHead><TableHead>Avg days to impact</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {intel.learning.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell>{l.category}</TableCell>
                    <TableCell>{l.change_type}</TableCell>
                    <TableCell>{l.implemented}</TableCell>
                    <TableCell>{l.succeeded}/{l.implemented}</TableCell>
                    <TableCell>{num(l.avg_position_delta, 2)}</TableCell>
                    <TableCell>{num(l.avg_days_to_impact, 1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function OpportunitiesPanel({
  intel, busy, runStage, setItemStatus,
}: { intel: IntelData | null; busy: string | null; runStage: any; setItemStatus: any }) {
  const [kind, setKind] = useState("all");
  const opps = useMemo(
    () => (intel?.opportunities ?? []).filter((o) => kind === "all" || o.kind === kind),
    [intel, kind],
  );
  const kinds = ["all", "ranking", "ctr", "content_gap", "technical"];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StageButton stage="opportunity_score" label="Rescore now" busy={busy} onRun={runStage} />
        {kinds.map((k) => (
          <Button key={k} size="sm" variant={kind === k ? "default" : "outline"} onClick={() => setKind(k)}>
            {k.replace("_", " ")}
          </Button>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><Target className="h-4 w-4" /> Next best actions</CardTitle>
          <CardDescription>Ranked by an evidence-weighted score: demand, distance to the next threshold, competition and measured blockers.</CardDescription>
        </CardHeader>
        <CardContent>
          {!opps.length ? (
            <Empty>No opportunities scored yet. Collect Search Console data, then run the scorer.</Empty>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-10">#</TableHead><TableHead>Action</TableHead><TableHead>Type</TableHead>
                <TableHead>Score</TableHead><TableHead>Evidence</TableHead><TableHead>Confidence</TableHead><TableHead />
              </TableRow></TableHeader>
              <TableBody>
                {opps.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="text-muted-foreground">{o.priority_rank}</TableCell>
                    <TableCell className="max-w-sm">
                      <div className="font-medium">{o.title}</div>
                      <div className="text-xs text-muted-foreground">{o.path}</div>
                      <div className="mt-1 text-xs">{o.next_action}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{o.kind}</Badge></TableCell>
                    <TableCell className="font-medium">{num(o.score)}</TableCell>
                    <TableCell className="max-w-xs text-xs text-muted-foreground">{o.rationale}</TableCell>
                    <TableCell><ConfidenceBadge value={o.confidence} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setItemStatus("seo_intel_opportunities", o.id, "dismissed")}>Dismiss</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function DemandPanel({ intel, busy, runStage }: { intel: IntelData | null; busy: string | null; runStage: any }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<any>(null);
  const rows = useMemo(
    () => (intel?.demand ?? []).filter((d) => !q || d.keyword.toLowerCase().includes(q.toLowerCase())),
    [intel, q],
  );
  const intentMap = useMemo(() => new Map((intel?.intent ?? []).map((i) => [i.keyword, i])), [intel]);
  const sourcesFor = useCallback(
    (kw: string) => (intel?.keyword_sources ?? []).filter((s) => s.keyword === kw),
    [intel],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StageButton stage="demand_model" label="Rebuild demand model" busy={busy} onRun={runStage} />
        <StageButton stage="intent_scan" label="Reclassify intent" busy={busy} onRun={runStage} />
        <StageButton stage="serp_intel" label="Capture SERPs" busy={busy} onRun={runStage} />
        <Input className="h-9 w-56" placeholder="Filter keywords" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4" /> Multi-source search demand</CardTitle>
          <CardDescription>
            Volume is a provider estimate; impressions and movement are your own Search Console actuals. Where sources disagree, the observed data wins and the conflict is recorded.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!rows.length ? (
            <Empty>No demand model yet. Run it after the Search Console and keyword stages have data.</Empty>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Keyword</TableHead><TableHead>Volume (est.)</TableHead><TableHead>Impressions 30d</TableHead>
                <TableHead>Change</TableHead><TableHead>Acceleration</TableHead><TableHead>Direction</TableHead>
                <TableHead>Intent</TableHead><TableHead>Confidence</TableHead><TableHead />
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((d) => (
                  <TableRow key={d.id} className={d.emerging ? "bg-primary/5" : undefined}>
                    <TableCell className="max-w-xs">
                      <div className="font-medium">{d.keyword}</div>
                      {d.emerging && <Badge className="mt-1">emerging demand</Badge>}
                      {d.discrepancy && <Badge variant="outline" className="mt-1 border-destructive/30 text-destructive">sources disagree</Badge>}
                    </TableCell>
                    <TableCell>{d.final_volume ?? "unavailable"}</TableCell>
                    <TableCell>{num(d.historical?.avg_impressions_30d, 1)}</TableCell>
                    <TableCell>{pct(d.impressions_change_pct)}</TableCell>
                    <TableCell>{pct(d.acceleration_30d)}</TableCell>
                    <TableCell><Badge variant="outline">{d.trend_direction}</Badge></TableCell>
                    <TableCell className="text-xs">{intentMap.get(d.keyword)?.intent ?? "—"}</TableCell>
                    <TableCell><ConfidenceBadge value={d.volume_confidence} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setOpen(d)}>Sources</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Search intent shifts</CardTitle>
          <CardDescription>Detected when the type of page Google rewards for a query changes.</CardDescription>
        </CardHeader>
        <CardContent>
          {!(intel?.intent ?? []).some((i) => i.shift_detected) ? (
            <Empty>No intent shift detected in the captured SERP snapshots.</Empty>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Keyword</TableHead><TableHead>Was</TableHead><TableHead>Now</TableHead><TableHead>What it means</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {intel!.intent.filter((i) => i.shift_detected).map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.keyword}</TableCell>
                    <TableCell>{i.previous_intent}</TableCell>
                    <TableCell>{i.serp_intent}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{i.shift_evidence?.note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">SERP intelligence</CardTitle>
          <CardDescription>What the results page rewards, from the latest captured snapshot.</CardDescription>
        </CardHeader>
        <CardContent>
          {!intel?.serp?.length ? (
            <Empty>No SERP snapshots captured yet.</Empty>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Keyword</TableHead><TableHead>Rewarded format</TableHead><TableHead>Our position</TableHead>
                <TableHead>Captured</TableHead><TableHead>Top domains</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {intel.serp.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.keyword}</TableCell>
                    <TableCell>{s.rewarded_format}</TableCell>
                    <TableCell>{s.our_position ?? "not in top 10"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.captured_on}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                      {(s.top_results ?? []).slice(0, 5).map((r: any) => r.domain).join(", ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Source audit — {open?.keyword}</DialogTitle>
            <DialogDescription>Every provider value used for this keyword, with its label and timestamp.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-3">
            <p className="mb-3 text-sm">{open?.verdict}</p>
            {open?.discrepancy && (
              <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
                {open.discrepancy.note}
              </div>
            )}
            <Table>
              <TableHeader><TableRow>
                <TableHead>Metric</TableHead><TableHead>Source</TableHead><TableHead>Value</TableHead>
                <TableHead>Label</TableHead><TableHead>Recorded</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {sourcesFor(open?.keyword ?? "").map((s: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{s.metric}</TableCell>
                    <TableCell>{s.source}</TableCell>
                    <TableCell>{s.value ?? s.value_text ?? "—"}</TableCell>
                    <TableCell><Badge variant="outline">{s.label}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.observed_at ? new Date(s.observed_at).toLocaleString() : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ForecastPanel({ intel, busy, runStage }: { intel: IntelData | null; busy: string | null; runStage: any }) {
  const vol = intel?.volatility?.[0];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <StageButton stage="forecast" label="Recompute forecasts" busy={busy} onRun={runStage} />
        <StageButton stage="volatility_scan" label="Check volatility" busy={busy} onRun={runStage} />
        <StageButton stage="anomaly_scan" label="Scan for anomalies" busy={busy} onRun={runStage} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" /> Ranking volatility</CardTitle>
          <CardDescription>Distinguishes our own drops from movement across the whole tracked set.</CardDescription>
        </CardHeader>
        <CardContent>
          {!vol ? (
            <Empty>Not enough daily rank snapshots yet to judge volatility.</Empty>
          ) : (
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{vol.classification.replace("_", " ")}</Badge>
                <ConfidenceBadge value={vol.confidence} />
                <span className="text-muted-foreground">{vol.detected_on}</span>
              </div>
              <p>{vol.keywords_moved} of {vol.keywords_tracked} tracked keywords moved 3 or more positions (average {num(vol.avg_abs_change, 2)}).</p>
              <p className="text-xs text-muted-foreground">{vol.evidence?.note}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><LineChart className="h-4 w-4" /> Ranking forecasts</CardTitle>
          <CardDescription>Momentum-based projections over 30 days. Estimates, never guarantees.</CardDescription>
        </CardHeader>
        <CardContent>
          {!intel?.forecasts?.length ? (
            <Empty>No forecasts yet — at least five days of rank history are needed per keyword.</Empty>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Keyword</TableHead><TableHead>Now</TableHead><TableHead>Momentum</TableHead>
                <TableHead>Outlook</TableHead><TableHead>Target</TableHead><TableHead>Probability</TableHead>
                <TableHead>Risk / opportunity</TableHead><TableHead>Confidence</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {intel.forecasts.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.keyword}</TableCell>
                    <TableCell>{num(f.current_position, 1)}</TableCell>
                    <TableCell>{num(f.momentum_30d, 2)}</TableCell>
                    <TableCell><Badge variant="outline">{String(f.forecast_direction).replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-xs">{f.target_threshold?.replace("_", " ")}</TableCell>
                    <TableCell>{f.probability == null ? "—" : `${Math.round(f.probability * 100)}%`}</TableCell>
                    <TableCell className="max-w-xs text-xs text-muted-foreground">{f.opportunity ?? f.risk}</TableCell>
                    <TableCell><ConfidenceBadge value={f.confidence} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="h-4 w-4" /> Anomalies</CardTitle>
          <CardDescription>Only deviations beyond two standard deviations of each page's own baseline are shown.</CardDescription>
        </CardHeader>
        <CardContent>
          {!intel?.anomalies?.length ? (
            <Empty>No anomalies detected. Normal day-to-day fluctuation is deliberately not reported.</Empty>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Page</TableHead><TableHead>Metric</TableHead><TableHead>Observed</TableHead>
                <TableHead>Expected</TableHead><TableHead>Deviation</TableHead><TableHead>Type</TableHead><TableHead>Detected</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {intel.anomalies.map((a) => (
                  <TableRow key={a.id} className={a.severity === "anomaly" ? "bg-destructive/5" : undefined}>
                    <TableCell className="max-w-xs truncate">{a.path}</TableCell>
                    <TableCell>{a.metric}</TableCell>
                    <TableCell>{num(a.observed, 3)}</TableCell>
                    <TableCell>{num(a.expected, 3)}</TableCell>
                    <TableCell>{num(a.deviation_sigma, 2)}σ</TableCell>
                    <TableCell><Badge variant="outline">{a.classification?.replace("_", " ")}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.detected_on}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function GapsPanel({
  intel, busy, runStage, setItemStatus,
}: { intel: IntelData | null; busy: string | null; runStage: any; setItemStatus: any }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <StageButton stage="cannibalization" label="Detect cannibalization" busy={busy} onRun={runStage} />
        <StageButton stage="content_gaps" label="Map content gaps" busy={busy} onRun={runStage} />
        <StageButton stage="ctr_intel" label="Benchmark CTR" busy={busy} onRun={runStage} />
        <StageButton stage="link_intel" label="Find internal links" busy={busy} onRun={runStage} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><Layers className="h-4 w-4" /> Keyword cannibalization</CardTitle>
          <CardDescription>Pages of ours competing for the same intent, with the stronger page identified from actual clicks.</CardDescription>
        </CardHeader>
        <CardContent>
          {!intel?.cannibalization?.length ? (
            <Empty>No competing pages detected in the last 45 days of query data.</Empty>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Cluster</TableHead><TableHead>Keep</TableHead><TableHead>Competing pages</TableHead>
                <TableHead>Overlap</TableHead><TableHead>Action</TableHead><TableHead />
              </TableRow></TableHeader>
              <TableBody>
                {intel.cannibalization.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="max-w-[10rem] truncate font-medium">{c.keyword}</TableCell>
                    <TableCell className="max-w-xs truncate">{c.stronger_path}</TableCell>
                    <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{(c.weaker_paths ?? []).join(", ")}</TableCell>
                    <TableCell>{Math.round((c.overlap_score ?? 0) * 100)}%</TableCell>
                    <TableCell className="max-w-sm text-xs">
                      <Badge variant="outline" className="mr-2">{c.recommended_action}</Badge>{c.recommendation}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setItemStatus("seo_intel_cannibalization", c.id, "done")}>Done</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Content gaps</CardTitle>
          <CardDescription>Missing topics, entities, questions and evidence versus pages that outrank us.</CardDescription>
        </CardHeader>
        <CardContent>
          {!intel?.gaps?.length ? (
            <Empty>No content gaps mapped yet.</Empty>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Page</TableHead><TableHead>Gap</TableHead><TableHead>Type</TableHead>
                <TableHead>Value</TableHead><TableHead>Confidence</TableHead><TableHead />
              </TableRow></TableHeader>
              <TableBody>
                {intel.gaps.map((g) => (
                  <TableRow key={g.id}>
                    <TableCell className="max-w-[12rem] truncate">{g.path}</TableCell>
                    <TableCell className="max-w-sm">
                      <div className="font-medium">{g.title}</div>
                      <div className="text-xs text-muted-foreground">{g.description}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{g.gap_type}</Badge></TableCell>
                    <TableCell>{num(g.value_score)}</TableCell>
                    <TableCell><ConfidenceBadge value={g.confidence} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setItemStatus("seo_intel_content_gaps", g.id, "done")}>Done</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><Gauge className="h-4 w-4" /> CTR under-performers</CardTitle>
          <CardDescription>Benchmarked against each query's own history, or our pages at the same position — never a generic curve.</CardDescription>
        </CardHeader>
        <CardContent>
          {!intel?.ctr?.length ? (
            <Empty>Not enough impressions yet to benchmark click-through rates.</Empty>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Query</TableHead><TableHead>Page</TableHead><TableHead>Position</TableHead>
                <TableHead>CTR</TableHead><TableHead>Benchmark</TableHead><TableHead>Gap</TableHead>
                <TableHead>Likely cause</TableHead><TableHead>Confidence</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {intel.ctr.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="max-w-[12rem] truncate font-medium">{c.query}</TableCell>
                    <TableCell className="max-w-[10rem] truncate text-xs text-muted-foreground">{c.path}</TableCell>
                    <TableCell>{num(c.position, 1)}</TableCell>
                    <TableCell>{c.ctr == null ? "—" : `${(Number(c.ctr) * 100).toFixed(2)}%`}</TableCell>
                    <TableCell>{c.benchmark_ctr == null ? "—" : `${(Number(c.benchmark_ctr) * 100).toFixed(2)}%`}</TableCell>
                    <TableCell className="text-destructive">{pct(c.ctr_delta_pct)}</TableCell>
                    <TableCell><Badge variant="outline">{c.diagnosis?.replace("_", " ")}</Badge></TableCell>
                    <TableCell><ConfidenceBadge value={c.confidence} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><Link2 className="h-4 w-4" /> Internal linking opportunities</CardTitle>
          <CardDescription>Authority routed from pages that already earn clicks to pages just outside the top 10.</CardDescription>
        </CardHeader>
        <CardContent>
          {!intel?.links?.length ? (
            <Empty>No internal link opportunities found yet.</Empty>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Link from</TableHead><TableHead>To</TableHead><TableHead>Anchor</TableHead>
                <TableHead>Where</TableHead><TableHead>Score</TableHead><TableHead />
              </TableRow></TableHeader>
              <TableBody>
                {intel.links.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="max-w-[12rem] truncate">{l.source_path}</TableCell>
                    <TableCell className="max-w-[12rem] truncate">{l.target_path}</TableCell>
                    <TableCell className="font-medium">{l.anchor_suggestion}</TableCell>
                    <TableCell className="max-w-sm text-xs text-muted-foreground">{l.context_hint}</TableCell>
                    <TableCell>{num(l.score)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setItemStatus("seo_intel_link_opportunities", l.id, "done")}>Done</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function EntityPanel({ intel, busy, runStage }: { intel: IntelData | null; busy: string | null; runStage: any }) {
  const [q, setQ] = useState("");
  const rows = useMemo(
    () => (intel?.entities ?? []).filter((e) => !q || e.entity.includes(q.toLowerCase())),
    [intel, q],
  );
  const edgeCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of intel?.graph ?? []) m.set(e.edge, (m.get(e.edge) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [intel]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StageButton stage="entity_map" label="Rebuild entity map" busy={busy} onRun={runStage} />
        <StageButton stage="knowledge_graph" label="Rebuild knowledge graph" busy={busy} onRun={runStage} />
        <StageButton stage="page_twin" label="Refresh page profiles" busy={busy} onRun={runStage} />
        <Input className="h-9 w-56" placeholder="Filter entities" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base"><GitBranch className="h-4 w-4" /> Topical authority coverage</CardTitle>
          <CardDescription>Every college, exam and topic we should own, and how well we currently cover it.</CardDescription>
        </CardHeader>
        <CardContent>
          {!rows.length ? (
            <Empty>No entity map built yet.</Empty>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Entity</TableHead><TableHead>Type</TableHead><TableHead>Coverage</TableHead>
                <TableHead>Pages</TableHead><TableHead>Impressions</TableHead><TableHead>Score</TableHead><TableHead>What to do</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.slice(0, 200).map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium capitalize">{e.entity}</TableCell>
                    <TableCell><Badge variant="outline">{e.entity_type}</Badge></TableCell>
                    <TableCell>
                      <Badge variant="outline" className={e.coverage_state === "missing" ? "border-destructive/30 text-destructive" : undefined}>
                        {e.coverage_state}
                      </Badge>
                    </TableCell>
                    <TableCell>{e.page_count}</TableCell>
                    <TableCell>{e.impressions}</TableCell>
                    <TableCell>{e.score}</TableCell>
                    <TableCell className="max-w-sm text-xs text-muted-foreground">{e.recommendation ?? "Covered."}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">SEO knowledge graph</CardTitle>
            <CardDescription>Relationships the AI reasons over when writing recommendations.</CardDescription>
          </CardHeader>
          <CardContent>
            {!edgeCounts.length ? (
              <Empty>Graph not built yet.</Empty>
            ) : (
              <ul className="space-y-1 text-sm">
                {edgeCounts.map(([edge, count]) => (
                  <li key={edge} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2">
                    <span className="capitalize">{edge.replace(/_/g, " ")}</span>
                    <Badge variant="outline">{count}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Page intelligence profiles</CardTitle>
            <CardDescription>Competitive gap score per page, from measured factors only.</CardDescription>
          </CardHeader>
          <CardContent>
            {!intel?.profiles?.length ? (
              <Empty>No page profiles built yet.</Empty>
            ) : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Page</TableHead><TableHead>Gap score</TableHead><TableHead>Confidence</TableHead><TableHead>Summary</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {intel.profiles.map((p) => (
                    <TableRow key={p.path}>
                      <TableCell className="max-w-[10rem] truncate">{p.path}</TableCell>
                      <TableCell>{num(p.competitive_gap_score, 1)}</TableCell>
                      <TableCell><ConfidenceBadge value={p.confidence} /></TableCell>
                      <TableCell className="max-w-xs text-xs text-muted-foreground">{p.summary}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function AdvancedHeaderStat({ intel }: { intel: IntelData | null }) {
  const top = intel?.opportunities?.[0];
  if (!top) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border bg-primary/5 p-3 text-sm">
      <ArrowUpRight className="mt-0.5 h-4 w-4 text-primary" />
      <div>
        <div className="font-medium">Next best action: {top.title}</div>
        <div className="text-xs text-muted-foreground">{top.rationale}</div>
      </div>
    </div>
  );
}
