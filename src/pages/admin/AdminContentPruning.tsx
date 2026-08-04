import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Loader2, Play, RefreshCw, ShieldCheck, Trash2, Download } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type Rec = {
  id: string;
  url: string;
  page_type: string | null;
  recommendation: string;
  target_url: string | null;
  problem: string | null;
  reason: string | null;
  seo_impact: string | null;
  solution: string | null;
  sections: any;
  priority: string;
  expected_improvement: string | null;
  difficulty: string | null;
  confidence: number | null;
  competing_urls: string[] | null;
  ai_summary: string | null;
  status: string;
  error: string | null;
  page_id: string | null;
};

type Page = {
  id: string;
  url: string;
  path: string;
  page_type: string;
  page_name: string | null;
  word_count: number;
  thin_content: boolean;
  stale_facts: any;
  clicks: number;
  impressions: number;
  ctr: number;
  avg_position: number | null;
  index_state: string | null;
  internal_links_in: number;
  internal_links_out: number;
  is_orphan: boolean;
  seo_score: number | null;
  content_score: number | null;
  freshness_score: number | null;
  authority_score: number | null;
  opportunity_score: number | null;
  days_since_update: number | null;
  duplicate_cluster_id: string | null;
};

const REC_COLORS: Record<string, string> = {
  keep: "hsl(150 60% 40%)", update: "hsl(210 80% 55%)", refresh: "hsl(190 70% 45%)",
  expand: "hsl(260 60% 60%)", rewrite: "hsl(35 85% 55%)", merge: "hsl(280 60% 55%)",
  canonical: "hsl(200 60% 50%)", redirect: "hsl(20 80% 55%)", noindex: "hsl(220 10% 55%)",
  delete: "hsl(0 75% 55%)",
};

const priorityVariant = (p: string) =>
  p === "critical" ? "destructive" : p === "high" ? "default" : "secondary";

const AdminContentPruning = () => {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [run, setRun] = useState<any>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterRec, setFilterRec] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<{ rec: Rec; page?: Page } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [{ data: runRow }, { data: pageRows }, { data: recRows }] = await Promise.all([
      supabase.from("pruning_runs").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("pruning_pages").select("*").order("opportunity_score", { ascending: false }).limit(3000),
      supabase.from("pruning_recommendations").select("*").order("created_at", { ascending: false }).limit(3000),
    ]);
    setRun(runRow ?? null);
    setPages((pageRows ?? []) as any);
    setRecs((recRows ?? []) as any);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live polling while a run is active
  useEffect(() => {
    if (!running && !["running", "queued"].includes(run?.status ?? "")) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [running, run?.status, load]);

  const pageById = useMemo(() => new Map(pages.map((p) => [p.id, p])), [pages]);

  const invoke = async (fn: string, body: any) => {
    const { data, error } = await supabase.functions.invoke(fn, { body });
    if (error) {
      let msg = error.message;
      try { msg = await (error as any).context?.text?.() ?? msg; } catch { /* noop */ }
      throw new Error(msg);
    }
    if ((data as any)?.error) throw new Error(`${(data as any).error}: ${(data as any).details ?? ""}`);
    return data as any;
  };

  const runPruning = async () => {
    setRunning(true);
    setProgress(5);
    try {
      setPhase("Building page inventory…");
      let runId: string | null = null;
      let nextGroup: number | null = 0;
      let invGuard = 0;
      while (nextGroup !== null && invGuard++ < 30) {
        const step = await invoke("pruning-inventory", { run_id: runId, stage: "pages", group: nextGroup });
        runId = step.run_id;
        setPhase(`Inventorying ${step.group_name ?? "pages"}…`);
        setProgress(5 + Math.round(((nextGroup + 1) / 11) * 20));
        nextGroup = step.next_group ?? null;
      }
      const inv = await invoke("pruning-inventory", { run_id: runId, stage: "graph" });
      setProgress(30);
      toast.success(`Inventory: ${inv.total_pages} pages, ${inv.duplicate_clusters} duplicate clusters`);


      setPhase("Collecting Search Console, index and speed signals…");
      const sig = await invoke("pruning-signals", { run_id: runId });
      (sig.notes ?? []).forEach((n: string) => toast.info(n));
      setProgress(45);

      setPhase("Running AI analysis…");
      let guard = 0;
      for (;;) {
        const res = await invoke("pruning-analyze-worker", { run_id: runId, limit: 120 });
        await load();
        const total = inv.total_pages || 1;
        setProgress(Math.min(97, 45 + Math.round(((total - (res.remaining ?? 0)) / total) * 52)));
        setPhase(`AI analysis — ${res.remaining ?? 0} pages remaining`);
        if (res.done || ++guard > 40) break;
      }
      setProgress(100);
      setPhase("Complete — review recommendations below");
      toast.success("Content pruning analysis complete");
    } catch (e) {
      toast.error((e as Error).message);
      setPhase("Failed");
    } finally {
      setRunning(false);
      load();
    }
  };

  const setStatus = async (ids: string[], status: string) => {
    if (!ids.length) return;
    const { error } = await supabase.from("pruning_recommendations")
      .update({ status, approved_at: status === "approved" ? new Date().toISOString() : null })
      .in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} recommendation(s) marked ${status}`);
    setSelected(new Set());
    load();
  };

  const execute = async (confirmDelete: boolean) => {
    const approved = recs.filter((r) => selected.has(r.id) && r.status === "approved");
    if (!approved.length) return toast.error("Approve the selected recommendations first");
    if (approved.some((r) => r.recommendation === "delete") && !confirmDelete) {
      const typed = window.prompt('This will permanently delete pages. Type DELETE to continue.');
      if (typed !== "DELETE") return;
      confirmDelete = true;
    }
    try {
      const res = await invoke("pruning-execute", {
        run_id: run?.id ?? null,
        recommendation_ids: approved.map((r) => r.id),
        confirm_delete: confirmDelete,
      });
      toast.success(`Executed ${res.executed}, failed ${res.failed}`);
      setSelected(new Set());
      load();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const filtered = useMemo(() => recs.filter((r) => {
    if (filterRec !== "all" && r.recommendation !== filterRec) return false;
    if (filterType !== "all" && r.page_type !== filterType) return false;
    if (filterStatus !== "all" && r.status !== filterStatus) return false;
    if (search && !`${r.url} ${r.problem ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [recs, filterRec, filterType, filterStatus, search]);

  const counts = useMemo(() => {
    const by: Record<string, number> = {};
    recs.forEach((r) => { by[r.recommendation] = (by[r.recommendation] ?? 0) + 1; });
    return by;
  }, [recs]);

  const tiles = [
    { label: "Total pages", value: pages.length },
    { label: "Healthy (keep)", value: counts.keep ?? 0 },
    { label: "To update", value: (counts.update ?? 0) + (counts.rewrite ?? 0) + (counts.expand ?? 0) + (counts.refresh ?? 0) },
    { label: "To merge", value: counts.merge ?? 0 },
    { label: "To redirect", value: counts.redirect ?? 0 },
    { label: "To delete", value: counts.delete ?? 0 },
    { label: "Thin content", value: pages.filter((p) => p.thin_content).length },
    { label: "Orphan pages", value: pages.filter((p) => p.is_orphan).length },
    { label: "Outdated facts", value: pages.filter((p) => (p.stale_facts?.length ?? 0) > 0).length },
    { label: "High opportunity", value: pages.filter((p) => (p.opportunity_score ?? 0) >= 55).length },
  ];

  const pieData = Object.entries(counts).map(([k, v]) => ({ name: k, value: v }));
  const typeData = useMemo(() => {
    const by: Record<string, number> = {};
    pages.forEach((p) => { by[p.page_type] = (by[p.page_type] ?? 0) + 1; });
    return Object.entries(by).map(([name, value]) => ({ name, value }));
  }, [pages]);

  const exportCsv = () => {
    const head = ["url", "type", "recommendation", "target", "priority", "problem", "reason", "status"];
    const rows = filtered.map((r) => [r.url, r.page_type, r.recommendation, r.target_url ?? "", r.priority,
      (r.problem ?? "").replace(/"/g, "'"), (r.reason ?? "").replace(/"/g, "'"), r.status]);
    const csv = [head, ...rows].map((r) => r.map((c) => `"${c ?? ""}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `content-pruning-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const allSelected = filtered.length > 0 && filtered.every((r) => selected.has(r.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground">Content Pruning</h1>
          <p className="text-sm text-muted-foreground">
            AI SEO auditor across every page — keep, update, merge, redirect, canonicalize, noindex or delete.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="w-4 h-4 mr-2" /> Reload
          </Button>
          <Button onClick={runPruning} disabled={running}>
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
            Run Content Pruning
          </Button>
        </div>
      </div>

      {(running || phase) && (
        <Card>
          <CardContent className="pt-6 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{phase}</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} />
            {run && (
              <div className="text-xs text-muted-foreground">
                Run {String(run.id).slice(0, 8)} · status {run.status} · phase {run.phase} ·
                {" "}{run.inventoried_count} inventoried · {run.analyzed_count} analysed · {run.executed_count} executed
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardContent className="pt-5">
              <div className="text-xs text-muted-foreground">{t.label}</div>
              <div className="text-2xl font-bold font-heading text-foreground">{t.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Recommendation mix</CardTitle></CardHeader>
          <CardContent className="h-72">
            {pieData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={95} label>
                    {pieData.map((d) => <Cell key={d.name} fill={REC_COLORS[d.name] ?? "hsl(210 20% 60%)"} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">Run the pruning analysis to populate this chart.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Pages by type</CardTitle></CardHeader>
          <CardContent className="h-72">
            {typeData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-25} height={60} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(210 80% 55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground">No inventory yet.</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">Recommendations ({filtered.length})</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Input placeholder="Search URL or problem…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <Select value={filterRec} onValueChange={setFilterRec}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Recommendation" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {Object.keys(REC_COLORS).map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Page type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {typeData.map((t) => <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                {["all", "pending", "approved", "rejected", "executed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="w-4 h-4 mr-2" />Export</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setStatus([...selected], "approved")} disabled={!selected.size}>
              <ShieldCheck className="w-4 h-4 mr-2" />Approve ({selected.size})
            </Button>
            <Button size="sm" variant="outline" onClick={() => setStatus([...selected], "rejected")} disabled={!selected.size}>
              Reject
            </Button>
            <Button size="sm" onClick={() => execute(false)} disabled={!selected.size}>
              Execute approved
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(v) => setSelected(v ? new Set(filtered.map((r) => r.id)) : new Set())}
                  />
                </TableHead>
                <TableHead>Page</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Problem</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Impr.</TableHead>
                <TableHead className="text-right">SEO</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.slice(0, 500).map((r) => {
                const p = r.page_id ? pageById.get(r.page_id) : undefined;
                return (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setDetail({ rec: r, page: p })}>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(r.id)}
                        onCheckedChange={(v) => {
                          const next = new Set(selected);
                          v ? next.add(r.id) : next.delete(r.id);
                          setSelected(next);
                        }}
                      />
                    </TableCell>
                    <TableCell className="max-w-[320px]">
                      <div className="truncate text-sm font-medium">{p?.page_name ?? r.url}</div>
                      <div className="truncate text-xs text-muted-foreground">{p?.path ?? r.url}</div>
                    </TableCell>
                    <TableCell>
                      <Badge style={{ backgroundColor: REC_COLORS[r.recommendation], color: "white" }}>
                        {r.recommendation}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant={priorityVariant(r.priority) as any}>{r.priority}</Badge></TableCell>
                    <TableCell className="max-w-[240px] truncate text-xs">{r.problem}</TableCell>
                    <TableCell className="text-right text-xs">{p?.clicks ?? 0}</TableCell>
                    <TableCell className="text-right text-xs">{p?.impressions ?? 0}</TableCell>
                    <TableCell className="text-right text-xs">{p?.seo_score ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.status}{r.error ? " ⚠" : ""}</TableCell>
                  </TableRow>
                );
              })}
              {!filtered.length && (
                <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                  No recommendations yet — click “Run Content Pruning”.
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-base break-all">{detail?.rec.url}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  ["SEO", detail.page?.seo_score], ["Content", detail.page?.content_score],
                  ["Freshness", detail.page?.freshness_score], ["Authority", detail.page?.authority_score],
                  ["Opportunity", detail.page?.opportunity_score],
                ].map(([label, v]) => (
                  <div key={String(label)} className="rounded-md border border-border p-2 text-center">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="text-lg font-semibold">{v ?? "—"}</div>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge style={{ backgroundColor: REC_COLORS[detail.rec.recommendation], color: "white" }}>
                  {detail.rec.recommendation}
                </Badge>
                <Badge variant={priorityVariant(detail.rec.priority) as any}>{detail.rec.priority}</Badge>
                {detail.rec.difficulty && <Badge variant="outline">{detail.rec.difficulty}</Badge>}
                {detail.rec.confidence != null && <Badge variant="outline">confidence {Math.round(detail.rec.confidence * 100)}%</Badge>}
              </div>
              {detail.rec.ai_summary && <p className="text-muted-foreground">{detail.rec.ai_summary}</p>}
              {([["Problem", detail.rec.problem], ["Reason", detail.rec.reason], ["SEO impact", detail.rec.seo_impact],
                 ["Recommended solution", detail.rec.solution], ["Expected improvement", detail.rec.expected_improvement],
                 ["Target URL", detail.rec.target_url]] as [string, string | null][])
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k}>
                    <div className="text-xs font-semibold uppercase text-muted-foreground">{k}</div>
                    <div className="break-words">{v}</div>
                  </div>
                ))}
              {Array.isArray(detail.rec.sections) && detail.rec.sections.length > 0 && (
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Outdated sections</div>
                  <ul className="list-disc pl-5">
                    {detail.rec.sections.map((s: any, i: number) => <li key={i}>{String(s)}</li>)}
                  </ul>
                </div>
              )}
              {!!detail.rec.competing_urls?.length && (
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground">Competing / duplicate URLs</div>
                  <ul className="list-disc pl-5 break-all">
                    {detail.rec.competing_urls.map((u) => <li key={u}>{u}</li>)}
                  </ul>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>Words: {detail.page?.word_count ?? "—"}</div>
                <div>Days since update: {detail.page?.days_since_update ?? "—"}</div>
                <div>Internal links in/out: {detail.page?.internal_links_in ?? 0}/{detail.page?.internal_links_out ?? 0}</div>
                <div>Index state: {detail.page?.index_state ?? "unknown"}</div>
                <div>Clicks / impressions: {detail.page?.clicks ?? 0} / {detail.page?.impressions ?? 0}</div>
                <div>Avg position: {detail.page?.avg_position ?? "—"}</div>
              </div>
              {detail.rec.error && <p className="text-destructive text-xs">Last error: {detail.rec.error}</p>}
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={() => setStatus([detail.rec.id], "approved")}>
                  <ShieldCheck className="w-4 h-4 mr-2" />Approve
                </Button>
                <Button size="sm" variant="outline" onClick={() => setStatus([detail.rec.id], "rejected")}>Reject</Button>
                {detail.rec.recommendation === "delete" && (
                  <Button size="sm" variant="destructive" onClick={() => { setSelected(new Set([detail.rec.id])); }}>
                    <Trash2 className="w-4 h-4 mr-2" />Select for deletion
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminContentPruning;
