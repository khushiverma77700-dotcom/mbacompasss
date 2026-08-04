import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, Play, RefreshCw, Download, TrendingDown, CheckCircle2, XCircle } from "lucide-react";
import { COLORS, exportCsv, invokeEngine, priorityVariant, statusVariant } from "./shared";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type DecayPage = {
  id: string; path: string; page_name: string | null; page_type: string | null;
  clicks_current: number; clicks_previous: number; impressions_current: number; impressions_previous: number;
  ctr_current: number; ctr_previous: number; position_current: number | null; position_previous: number | null;
  click_change_pct: number | null; impression_change_pct: number | null; position_change: number | null;
  decay_type: string | null; decay_state: string; severity: string; recovery_potential: number;
};

type Rec = {
  id: string; run_id: string; path: string; page_name: string | null; action: string;
  sections: Array<{ heading: string; action: string; guidance: string; target_words?: number }>;
  refresh_brief: string | null; outdated_facts: string[]; keyword_gaps: string[];
  problem: string | null; rationale: string | null; seo_impact: string | null; expected_impact: string | null;
  priority: string; confidence: number | null; status: string; error: string | null; refresh_id: string | null;
};

const DecayPanel = () => {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [run, setRun] = useState<any>(null);
  const [pages, setPages] = useState<DecayPage[]>([]);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState("pending");
  const [severity, setSeverity] = useState("all");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Rec | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: runs } = await supabase.from("decay_runs").select("*").order("created_at", { ascending: false }).limit(1);
    const latest = runs?.[0] ?? null;
    setRun(latest);
    if (latest) {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase.from("decay_pages").select("*").eq("run_id", latest.id).order("recovery_potential", { ascending: false }).limit(500),
        supabase.from("decay_recommendations").select("*").eq("run_id", latest.id).order("score", { ascending: false }).limit(400),
      ]);
      setPages((p ?? []) as unknown as DecayPage[]);
      setRecs((r ?? []) as unknown as Rec[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runEngine = async () => {
    setRunning(true);
    setProgress(5);
    try {
      setPhase("Comparing the last 28 days against the previous period…");
      const detect = await invokeEngine<any>("decay-recovery", { stage: "detect" });
      setProgress(30);
      if (!detect.declining) {
        toast.warning(detect.note ?? "No declining pages detected.");
      } else {
        toast.success(`${detect.declining} declining pages found.`);
        for (let i = 0; i < 14; i++) {
          setPhase(`Building refresh briefs (batch ${i + 1})…`);
          const res = await invokeEngine<any>("decay-recovery", { stage: "analyze", run_id: detect.run_id, batch: 6 });
          setProgress(30 + Math.min(65, (i + 1) * 5));
          if (res.done) break;
        }
      }
      setProgress(100);
      setPhase("Complete");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Decay run failed.");
    } finally {
      setRunning(false);
    }
  };

  const act = async (stage: "approve" | "reject", ids: string[]) => {
    if (!ids.length) return;
    try {
      const res = await invokeEngine<any>("decay-recovery", { stage, recommendation_ids: ids });
      toast.success(stage === "approve"
        ? `${res.approved} refreshes queued for review.`
        : `${res.rejected} rejected.`);
      setSelected(new Set());
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
    }
  };

  const declining = pages.filter((p) => ["decaying", "dying"].includes(p.decay_state));
  const filteredPages = declining
    .filter((p) => (severity === "all" ? true : p.severity === severity))
    .filter((p) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return p.path.toLowerCase().includes(q) || (p.page_name ?? "").toLowerCase().includes(q);
    });
  const filteredRecs = recs.filter((r) => (statusFilter === "all" ? true : r.status === statusFilter));

  const lostClicks = declining.reduce((s, p) => s + Math.max(0, p.clicks_previous - p.clicks_current), 0);
  const chart = declining.slice(0, 12).map((p) => ({
    name: (p.page_name ?? p.path).slice(0, 20),
    before: p.clicks_previous,
    now: p.clicks_current,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><TrendingDown className="h-4 w-4" /> Content Decay Recovery</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Detects real click, impression and position decline, then produces refresh-only recovery briefs. Nothing is ever deleted or redirected here.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={runEngine} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
              Run decay detection
            </Button>
            <Button variant="outline" size="icon" onClick={load} disabled={loading}><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        {running && (
          <CardContent>
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground mt-2">{phase}</p>
          </CardContent>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "Pages checked", value: run?.pages_checked ?? 0 },
          { label: "Declining", value: declining.length },
          { label: "Clicks lost / 28d", value: lostClicks },
          { label: "Refresh briefs", value: recs.length },
          { label: "Queued refreshes", value: recs.filter((r) => r.status === "approved").length },
        ].map((s) => (
          <Card key={s.label}><CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="text-3xl font-semibold">{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      {!!chart.length && (
        <Card>
          <CardHeader><CardTitle className="text-base">Biggest click losses (previous vs current 28 days)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={10} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="before" fill={COLORS[3]} radius={[4, 4, 0, 0]} name="previous" />
                <Bar dataKey="now" fill={COLORS[0]} radius={[4, 4, 0, 0]} name="current" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base">Declining pages ({filteredPages.length})</CardTitle>
          <div className="flex items-center gap-2">
            <Input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="w-44" />
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severity</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => exportCsv("decay-pages", filteredPages)}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Page</TableHead><TableHead>Clicks</TableHead><TableHead>Impressions</TableHead>
              <TableHead>Position</TableHead><TableHead>Decay type</TableHead>
              <TableHead>Severity</TableHead><TableHead>Recovery</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filteredPages.slice(0, 250).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="max-w-[260px]">
                    <p className="font-medium truncate">{p.page_name ?? p.path}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.path}</p>
                  </TableCell>
                  <TableCell className="text-xs">
                    {p.clicks_previous} → {p.clicks_current}
                    <span className="text-destructive ml-1">{p.click_change_pct}%</span>
                  </TableCell>
                  <TableCell className="text-xs">{p.impressions_previous} → {p.impressions_current}</TableCell>
                  <TableCell className="text-xs">
                    {p.position_previous?.toFixed?.(1) ?? "-"} → {p.position_current?.toFixed?.(1) ?? "-"}
                  </TableCell>
                  <TableCell className="text-xs">{p.decay_type ?? "—"}</TableCell>
                  <TableCell><Badge variant={p.severity === "high" ? "destructive" : "secondary"}>{p.severity}</Badge></TableCell>
                  <TableCell>{Math.round(p.recovery_potential)}</TableCell>
                </TableRow>
              ))}
              {!filteredPages.length && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No declining pages for this filter. Run Signal Ingestion first if you have no Search Console data yet.
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base">Refresh recommendations ({filteredRecs.length})</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => exportCsv("decay-recommendations", filteredRecs)}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!!selected.size && (
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary">{selected.size} selected</Badge>
              <Button size="sm" onClick={() => act("approve", Array.from(selected))}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Approve &amp; queue refresh
              </Button>
              <Button size="sm" variant="outline" onClick={() => act("reject", Array.from(selected))}>
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-8">
                  <Checkbox
                    checked={filteredRecs.length > 0 && selected.size === filteredRecs.length}
                    onCheckedChange={(v) => setSelected(v ? new Set(filteredRecs.map((r) => r.id)) : new Set())}
                  />
                </TableHead>
                <TableHead>Page</TableHead><TableHead>Problem</TableHead><TableHead>Sections</TableHead>
                <TableHead>Expected impact</TableHead><TableHead>Priority</TableHead>
                <TableHead>Status</TableHead><TableHead />
              </TableRow></TableHeader>
              <TableBody>
                {filteredRecs.slice(0, 250).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={(v) => {
                          const next = new Set(selected);
                          v ? next.add(r.id) : next.delete(r.id);
                          setSelected(next);
                        }}
                      />
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <p className="font-medium truncate">{r.page_name ?? r.path}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.path}</p>
                    </TableCell>
                    <TableCell className="max-w-[240px] text-xs text-muted-foreground truncate">{r.problem ?? "—"}</TableCell>
                    <TableCell>{r.sections?.length ?? 0}</TableCell>
                    <TableCell className="max-w-[200px] text-xs truncate">{r.expected_impact ?? "—"}</TableCell>
                    <TableCell><Badge variant={priorityVariant(r.priority) as never}>{r.priority}</Badge></TableCell>
                    <TableCell><Badge variant={statusVariant(r.status) as never}>{r.status}</Badge></TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => setDetail(r)}>View</Button></TableCell>
                  </TableRow>
                ))}
                {!filteredRecs.length && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No recommendations for this filter.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Refresh plan — {detail?.page_name ?? detail?.path}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              {detail.problem && <div><p className="text-xs text-muted-foreground">Problem</p><p>{detail.problem}</p></div>}
              {detail.rationale && <div><p className="text-xs text-muted-foreground">Rationale</p><p>{detail.rationale}</p></div>}
              {detail.expected_impact && <div><p className="text-xs text-muted-foreground">Expected impact</p><p>{detail.expected_impact}</p></div>}
              {!!detail.outdated_facts?.length && (
                <div>
                  <p className="text-xs text-muted-foreground">Outdated content found</p>
                  <ul className="list-disc pl-5 text-xs">{detail.outdated_facts.map((f, i) => <li key={i}>{f}</li>)}</ul>
                </div>
              )}
              {!!detail.keyword_gaps?.length && (
                <div>
                  <p className="text-xs text-muted-foreground">Keyword gaps</p>
                  <p className="text-xs">{detail.keyword_gaps.join(" · ")}</p>
                </div>
              )}
              {!!detail.sections?.length && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Sections to update</p>
                  {detail.sections.map((s, i) => (
                    <div key={i} className="rounded-md border p-3">
                      <p className="font-medium text-sm">{s.heading} <Badge variant="outline" className="ml-2">{s.action}</Badge></p>
                      <p className="text-xs text-muted-foreground mt-1">{s.guidance}</p>
                      {s.target_words && <p className="text-xs text-muted-foreground mt-1">~{s.target_words} words</p>}
                    </div>
                  ))}
                </div>
              )}
              {detail.refresh_brief && (
                <div><p className="text-xs text-muted-foreground">Editorial brief</p><p className="text-sm">{detail.refresh_brief}</p></div>
              )}
              {detail.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => { act("approve", [detail.id]); setDetail(null); }}>Approve &amp; queue refresh</Button>
                  <Button size="sm" variant="outline" onClick={() => { act("reject", [detail.id]); setDetail(null); }}>Reject</Button>
                </div>
              )}
              {detail.refresh_id && <p className="text-xs text-muted-foreground">Queued in the Content Refresh Queue for review.</p>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DecayPanel;
