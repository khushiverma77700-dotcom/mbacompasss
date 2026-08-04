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
import { Loader2, Play, RefreshCw, Download, Undo2, Split, CheckCircle2, XCircle } from "lucide-react";
import { COLORS, exportCsv, fmtDate, invokeEngine, priorityVariant, statusVariant } from "./shared";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";

type Cluster = {
  id: string; primary_keyword: string; intent_type: string; sub_intents: string[];
  total_impressions: number; total_clicks: number; best_position: number | null;
  competing_paths: Array<{ path: string; clicks: number; impressions: number; position: number | null }>;
  page_count: number; is_cannibalized: boolean; severity: string;
  winner_path: string | null; winner_reason: string | null; needs_new_page: boolean;
  ai_summary: string | null; keywords: Array<{ keyword: string; impressions: number }>;
};

type Rec = {
  id: string; run_id: string; action: string; source_path: string | null; target_path: string | null;
  anchor_text: string | null; keyword: string | null; intent_type: string | null; title: string | null;
  brief: any; problem: string | null; rationale: string | null; seo_impact: string | null;
  priority: string; confidence: number | null; status: string; error: string | null;
  applied_at: string | null; created_at: string;
};

const IntentPanel = () => {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [run, setRun] = useState<any>(null);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState("pending");
  const [actionFilter, setActionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Rec | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: runs } = await supabase.from("intent_runs").select("*").order("created_at", { ascending: false }).limit(1);
    const latest = runs?.[0] ?? null;
    setRun(latest);
    if (latest) {
      const [{ data: c }, { data: r }] = await Promise.all([
        supabase.from("intent_clusters").select("*").eq("run_id", latest.id).order("total_impressions", { ascending: false }).limit(400),
        supabase.from("intent_recommendations").select("*").eq("run_id", latest.id).order("score", { ascending: false }).limit(500),
      ]);
      setClusters((c ?? []) as unknown as Cluster[]);
      setRecs((r ?? []) as unknown as Rec[]);
    }
    const { data: a } = await supabase.from("intent_actions").select("*").order("created_at", { ascending: false }).limit(120);
    setActions(a ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runEngine = async () => {
    setRunning(true);
    setProgress(4);
    try {
      setPhase("Clustering Search Console queries by intent…");
      const cluster = await invokeEngine<any>("intent-splitting", { stage: "cluster" });
      setProgress(30);
      if (!cluster.clusters) {
        toast.warning(cluster.note ?? "No query data available yet.");
      } else {
        toast.success(`${cluster.clusters} clusters, ${cluster.conflicts} cannibalization conflicts.`);
        for (let i = 0; i < 12; i++) {
          setPhase(`Generating briefs and consolidation plans (batch ${i + 1})…`);
          const res = await invokeEngine<any>("intent-splitting", { stage: "analyze", run_id: cluster.run_id, batch: 8 });
          setProgress(30 + Math.min(65, (i + 1) * 6));
          if (res.done) break;
        }
      }
      setProgress(100);
      setPhase("Complete");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Intent run failed.");
    } finally {
      setRunning(false);
    }
  };

  const act = async (stage: "apply" | "reject", ids: string[]) => {
    if (!ids.length) return;
    try {
      if (stage === "reject") {
        await supabase.from("intent_recommendations").update({ status: "rejected" }).in("id", ids);
        toast.success(`${ids.length} rejected.`);
      } else {
        const res = await invokeEngine<any>("intent-splitting", { stage: "apply", recommendation_ids: ids });
        toast.success(`${res.applied} applied.`);
        const failed = (res.results ?? []).filter((r: any) => !r.ok);
        if (failed.length) toast.error(`${failed.length} failed: ${failed[0].error}`);
      }
      setSelected(new Set());
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
    }
  };

  const revert = async (id: string) => {
    try {
      await invokeEngine("intent-splitting", { stage: "revert", action_id: id });
      toast.success("Reverted.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Revert failed.");
    }
  };

  const filtered = recs
    .filter((r) => (statusFilter === "all" ? true : r.status === statusFilter))
    .filter((r) => (actionFilter === "all" ? true : r.action === actionFilter))
    .filter((r) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return [r.source_path, r.target_path, r.keyword, r.title].some((v) => (v ?? "").toLowerCase().includes(q));
    });

  const conflicts = clusters.filter((c) => c.is_cannibalized);
  const chart = conflicts.slice(0, 12).map((c) => ({
    name: c.primary_keyword.slice(0, 22),
    pages: c.page_count,
    impressions: c.total_impressions,
  }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><Split className="h-4 w-4" /> Search Intent Splitting</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Clusters real Search Console queries, finds cannibalization, and produces briefs, canonical, redirect and internal-link fixes.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={runEngine} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
              Run intent analysis
            </Button>
            <Button variant="outline" size="icon" onClick={load} disabled={loading}>
              <RefreshCw className="h-4 w-4" />
            </Button>
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
          { label: "Keywords analyzed", value: run?.keywords_analyzed ?? 0 },
          { label: "Clusters", value: run?.clusters_found ?? 0 },
          { label: "Cannibalization", value: run?.conflicts_found ?? 0 },
          { label: "Recommendations", value: recs.length },
          { label: "Applied", value: recs.filter((r) => r.status === "applied").length },
        ].map((s) => (
          <Card key={s.label}><CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="text-3xl font-semibold">{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      {!!chart.length && (
        <Card>
          <CardHeader><CardTitle className="text-base">Worst cannibalization clusters</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={10} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="pages" fill={COLORS[4]} radius={[4, 4, 0, 0]} name="competing pages" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base">Recommendations ({filtered.length})</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="w-44" />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="brief">Brief</SelectItem>
                <SelectItem value="split">Split (new page)</SelectItem>
                <SelectItem value="internal_link">Internal link</SelectItem>
                <SelectItem value="canonical">Canonical</SelectItem>
                <SelectItem value="redirect">301 redirect</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => exportCsv("intent-recommendations", filtered)}>
              <Download className="h-4 w-4 mr-1" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!!selected.size && (
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="secondary">{selected.size} selected</Badge>
              <Button size="sm" onClick={() => act("apply", Array.from(selected))}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Approve &amp; apply
              </Button>
              <Button size="sm" variant="outline" onClick={() => act("reject", Array.from(selected))}>
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8">
                    <Checkbox
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      onCheckedChange={(v) => setSelected(v ? new Set(filtered.map((r) => r.id)) : new Set())}
                    />
                  </TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Source → target</TableHead>
                  <TableHead>Keyword / intent</TableHead>
                  <TableHead>Problem</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 250).map((r) => (
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
                    <TableCell><Badge variant="outline">{r.action}</Badge></TableCell>
                    <TableCell className="max-w-[260px]">
                      <p className="text-xs truncate">{r.source_path ?? "(new page)"}</p>
                      <p className="text-xs text-muted-foreground truncate">→ {r.target_path ?? "—"}</p>
                    </TableCell>
                    <TableCell className="max-w-[180px]">
                      <p className="text-xs truncate">{r.keyword ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{r.intent_type ?? "—"}</p>
                    </TableCell>
                    <TableCell className="max-w-[260px] text-xs text-muted-foreground truncate">{r.problem ?? "—"}</TableCell>
                    <TableCell><Badge variant={priorityVariant(r.priority) as never}>{r.priority}</Badge></TableCell>
                    <TableCell><Badge variant={statusVariant(r.status) as never}>{r.status}</Badge></TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>View</Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!filtered.length && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No recommendations for this filter. Run the intent analysis to generate them.
                  </TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Audit history</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>When</TableHead><TableHead>Action</TableHead><TableHead>From → to</TableHead>
              <TableHead>Status</TableHead><TableHead />
            </TableRow></TableHeader>
            <TableBody>
              {actions.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-xs">{fmtDate(a.created_at)}</TableCell>
                  <TableCell><Badge variant="outline">{a.action}</Badge></TableCell>
                  <TableCell className="text-xs">{a.from_path} → {a.to_path ?? "—"}</TableCell>
                  <TableCell><Badge variant={statusVariant(a.status) as never}>{a.status}</Badge></TableCell>
                  <TableCell>
                    {a.status !== "reverted" && (
                      <Button size="sm" variant="ghost" onClick={() => revert(a.id)}>
                        <Undo2 className="h-4 w-4 mr-1" /> Undo
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!actions.length && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No actions yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detail?.action} — {detail?.keyword ?? detail?.source_path}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-muted-foreground text-xs">Source</p><p>{detail.source_path ?? "(new page)"}</p></div>
                <div><p className="text-muted-foreground text-xs">Target</p><p>{detail.target_path ?? "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Intent</p><p>{detail.intent_type ?? "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Confidence</p><p>{detail.confidence != null ? `${Math.round(detail.confidence * 100)}%` : "—"}</p></div>
              </div>
              {detail.problem && <div><p className="text-xs text-muted-foreground">Problem</p><p>{detail.problem}</p></div>}
              {detail.rationale && <div><p className="text-xs text-muted-foreground">Rationale</p><p>{detail.rationale}</p></div>}
              {detail.seo_impact && <div><p className="text-xs text-muted-foreground">SEO impact</p><p>{detail.seo_impact}</p></div>}
              {detail.brief && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Content brief</p>
                  <div className="rounded-md border p-3 space-y-2">
                    {detail.brief.h1 && <p className="font-medium">{detail.brief.h1}</p>}
                    {Array.isArray(detail.brief.outline) && (
                      <ul className="list-disc pl-5 text-xs space-y-1">
                        {detail.brief.outline.map((o: string, i: number) => <li key={i}>{o}</li>)}
                      </ul>
                    )}
                    {Array.isArray(detail.brief.must_cover) && !!detail.brief.must_cover.length && (
                      <div>
                        <p className="text-xs text-muted-foreground">Must cover</p>
                        <p className="text-xs">{detail.brief.must_cover.join(" · ")}</p>
                      </div>
                    )}
                    {Array.isArray(detail.brief.faqs) && (
                      <div className="space-y-1">
                        {detail.brief.faqs.map((f: any, i: number) => (
                          <div key={i} className="text-xs"><span className="font-medium">{f.q}</span> — {f.a}</div>
                        ))}
                      </div>
                    )}
                    {detail.brief.word_target && <p className="text-xs text-muted-foreground">Target length: {detail.brief.word_target} words</p>}
                  </div>
                </div>
              )}
              {detail.error && <p className="text-destructive text-xs">{detail.error}</p>}
              {detail.status === "pending" && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={() => { act("apply", [detail.id]); setDetail(null); }}>Approve &amp; apply</Button>
                  <Button size="sm" variant="outline" onClick={() => { act("reject", [detail.id]); setDetail(null); }}>Reject</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IntentPanel;
