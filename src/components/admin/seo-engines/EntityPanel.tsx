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
import { Loader2, Play, RefreshCw, Download, Boxes, CheckCircle2, XCircle, Undo2 } from "lucide-react";
import { exportCsv, fmtDate, invokeEngine, priorityVariant, statusVariant } from "./shared";

type Rec = {
  id: string; path: string; page_name: string | null; page_type: string | null; action: string;
  entity_name: string | null; entity_type: string | null; payload: any;
  problem: string | null; rationale: string | null; seo_impact: string | null;
  priority: string; confidence: number | null; status: string; error: string | null;
};

const EntityPanel = () => {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [run, setRun] = useState<any>(null);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [entities, setEntities] = useState<any[]>([]);
  const [actions, setActions] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState("pending");
  const [actionFilter, setActionFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Rec | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: runs } = await supabase.from("entity_runs").select("*").order("created_at", { ascending: false }).limit(1);
    const latest = runs?.[0] ?? null;
    setRun(latest);
    if (latest) {
      const { data: r } = await supabase.from("entity_recommendations")
        .select("*").eq("run_id", latest.id).order("score", { ascending: false }).limit(500);
      setRecs((r ?? []) as unknown as Rec[]);
    }
    const [{ data: e }, { data: a }] = await Promise.all([
      supabase.from("seo_entities").select("name, entity_type, page_count, importance, official_url")
        .order("page_count", { ascending: false }).limit(200),
      supabase.from("entity_actions").select("*").order("created_at", { ascending: false }).limit(120),
    ]);
    setEntities(e ?? []);
    setActions(a ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const runEngine = async () => {
    setRunning(true);
    setProgress(3);
    try {
      setPhase("Building the entity graph…");
      let res = await invokeEngine<any>("entity-stacking", { stage: "graph" });
      const runId = res.run_id;
      let guard = 0;
      while (res.next_stage === "graph" && guard++ < 12) {
        setPhase(`Mapping entity mentions (${res.pages_scanned} pages scanned)…`);
        res = await invokeEngine<any>("entity-stacking", { stage: "graph", run_id: runId, offset: res.next_offset });
        setProgress(3 + Math.min(30, guard * 4));
      }
      setProgress(35);
      for (let i = 0; i < 14; i++) {
        setPhase(`Recommending entities, schema and FAQs (batch ${i + 1})…`);
        const step = await invokeEngine<any>("entity-stacking", { stage: "analyze", run_id: runId, batch: 6 });
        setProgress(35 + Math.min(60, (i + 1) * 5));
        if (step.done) break;
      }
      setProgress(100);
      setPhase("Complete");
      toast.success("Entity stacking analysis complete.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Entity run failed.");
    } finally {
      setRunning(false);
    }
  };

  const act = async (stage: "apply" | "reject", ids: string[]) => {
    if (!ids.length) return;
    try {
      const res = await invokeEngine<any>("entity-stacking", { stage, recommendation_ids: ids });
      toast.success(stage === "apply" ? `${res.applied} applied.` : `${res.rejected} rejected.`);
      const failed = (res.results ?? []).filter((r: any) => !r.ok);
      if (failed.length) toast.error(`${failed.length} failed: ${failed[0].error}`);
      setSelected(new Set());
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
    }
  };

  const revert = async (id: string) => {
    try {
      await invokeEngine("entity-stacking", { stage: "revert", action_id: id });
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
      return [r.path, r.page_name, r.entity_name].some((v) => (v ?? "").toLowerCase().includes(q));
    });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><Boxes className="h-4 w-4" /> Entity Stacking</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Maintains the site entity graph (B-schools, exams, cities, bodies) and adds missing entities, schema, FAQs and metadata consistently.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={runEngine} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
              Run entity analysis
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Entities in graph", value: run?.entities_total ?? entities.length },
          { label: "Pages scanned", value: run?.pages_scanned ?? 0 },
          { label: "Recommendations", value: recs.length },
          { label: "Applied", value: recs.filter((r) => r.status === "applied").length },
        ].map((s) => (
          <Card key={s.label}><CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="text-3xl font-semibold">{s.value}</p>
          </CardContent></Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base">Recommendations ({filtered.length})</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Input placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} className="w-44" />
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="add_mention">Add mention</SelectItem>
                <SelectItem value="add_schema">Add schema</SelectItem>
                <SelectItem value="add_faq">Add FAQ</SelectItem>
                <SelectItem value="update_meta">Update metadata</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => exportCsv("entity-recommendations", filtered)}>
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
              <TableHeader><TableRow>
                <TableHead className="w-8">
                  <Checkbox
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onCheckedChange={(v) => setSelected(v ? new Set(filtered.map((r) => r.id)) : new Set())}
                  />
                </TableHead>
                <TableHead>Page</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead>
                <TableHead>Rationale</TableHead><TableHead>Priority</TableHead>
                <TableHead>Status</TableHead><TableHead />
              </TableRow></TableHeader>
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
                    <TableCell className="max-w-[220px]">
                      <p className="font-medium truncate">{r.page_name ?? r.path}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.path}</p>
                    </TableCell>
                    <TableCell><Badge variant="outline">{r.action}</Badge></TableCell>
                    <TableCell className="max-w-[160px]">
                      <p className="text-xs truncate">{r.entity_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{r.entity_type ?? ""}</p>
                    </TableCell>
                    <TableCell className="max-w-[240px] text-xs text-muted-foreground truncate">{r.rationale ?? r.problem ?? "—"}</TableCell>
                    <TableCell><Badge variant={priorityVariant(r.priority) as never}>{r.priority}</Badge></TableCell>
                    <TableCell><Badge variant={statusVariant(r.status) as never}>{r.status}</Badge></TableCell>
                    <TableCell><Button size="sm" variant="ghost" onClick={() => setDetail(r)}>View</Button></TableCell>
                  </TableRow>
                ))}
                {!filtered.length && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No recommendations for this filter.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Top entities</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Entity</TableHead><TableHead>Type</TableHead><TableHead>Pages</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {entities.slice(0, 40).map((e) => (
                  <TableRow key={e.name}>
                    <TableCell className="text-sm">{e.name}</TableCell>
                    <TableCell><Badge variant="outline">{e.entity_type}</Badge></TableCell>
                    <TableCell>{e.page_count}</TableCell>
                  </TableRow>
                ))}
                {!entities.length && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Run the entity analysis to build the graph.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Audit history</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>When</TableHead><TableHead>Action</TableHead><TableHead>Page</TableHead>
                <TableHead>Status</TableHead><TableHead />
              </TableRow></TableHeader>
              <TableBody>
                {actions.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs">{fmtDate(a.created_at)}</TableCell>
                    <TableCell><Badge variant="outline">{a.action}</Badge></TableCell>
                    <TableCell className="text-xs max-w-[160px] truncate">{a.path}</TableCell>
                    <TableCell><Badge variant={statusVariant(a.status) as never}>{a.status}</Badge></TableCell>
                    <TableCell>
                      {a.status !== "reverted" && (
                        <Button size="sm" variant="ghost" onClick={() => revert(a.id)}>
                          <Undo2 className="h-4 w-4" />
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
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{detail?.action} — {detail?.entity_name}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <p className="text-xs text-muted-foreground">{detail.path}</p>
              {detail.problem && <div><p className="text-xs text-muted-foreground">Problem</p><p>{detail.problem}</p></div>}
              {detail.rationale && <div><p className="text-xs text-muted-foreground">Rationale</p><p>{detail.rationale}</p></div>}
              {detail.seo_impact && <div><p className="text-xs text-muted-foreground">SEO impact</p><p>{detail.seo_impact}</p></div>}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Change to be written</p>
                <pre className="rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap">
                  {JSON.stringify(detail.payload ?? {}, null, 2)}
                </pre>
              </div>
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

export default EntityPanel;
