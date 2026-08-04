import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Loader2, Play, RefreshCw, Link2, Download, Undo2, ArrowUpRight, Network,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";

type Page = {
  id: string; url: string; path: string; page_type: string; page_name: string | null;
  topic: string | null; primary_keyword: string | null; word_count: number;
  is_commercial: boolean; links_in: number; links_out: number; unique_sources: number;
  pagerank: number; authority_score: number; anchor_diversity: number | null;
  is_orphan: boolean; is_hub: boolean; hub_score: number; opportunity_score: number;
  clicks: number; impressions: number; avg_position: number | null;
};

type Rec = {
  id: string; run_id: string; source_path: string; source_name: string | null;
  source_table: string | null; source_field: string | null;
  target_path: string; target_name: string | null; target_type: string | null;
  anchor_text: string; context_snippet: string | null; rationale: string | null;
  problem: string | null; seo_impact: string | null; priority: string;
  opportunity_score: number; authority_before: number | null; authority_after: number | null;
  expected_impact: string | null; status: string; auto_applied: boolean;
  applied_at: string | null; error: string | null;
};

type Action = {
  id: string; action: string; from_path: string | null; to_path: string | null;
  anchor_text: string | null; status: string; reverted_at: string | null;
  created_at: string; notes: string | null;
};

const CRAWL_GROUPS = 11;
const COLORS = ["hsl(210 80% 55%)", "hsl(150 60% 40%)", "hsl(35 85% 55%)", "hsl(280 60% 55%)", "hsl(0 75% 55%)"];

const priorityVariant = (p: string) =>
  p === "high" ? "default" : p === "low" ? "outline" : "secondary";

const AdminReverseSiloing = () => {
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState("");
  const [progress, setProgress] = useState(0);
  const [run, setRun] = useState<any>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [status, setStatusFilter] = useState("all");
  const [type, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Rec | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: runRow } = await supabase.from("silo_runs")
      .select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
    const [{ data: pageRows }, { data: recRows }, { data: actionRows }, { data: settingsRow }] = await Promise.all([
      runRow
        ? supabase.from("silo_pages").select("*").eq("run_id", runRow.id)
            .order("opportunity_score", { ascending: false }).limit(3000)
        : Promise.resolve({ data: [] as any[] }),
      runRow
        ? supabase.from("silo_link_recommendations").select("*").eq("run_id", runRow.id)
            .order("opportunity_score", { ascending: false }).limit(2000)
        : Promise.resolve({ data: [] as any[] }),
      supabase.from("silo_actions").select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("silo_settings").select("*").eq("id", true).maybeSingle(),
    ]);
    setRun(runRow ?? null);
    setPages((pageRows ?? []) as any);
    setRecs((recRows ?? []) as any);
    setActions((actionRows ?? []) as any);
    setSettings(settingsRow ?? null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [running, load]);

  const invoke = async (fn: string, body: any) => {
    const { data, error } = await supabase.functions.invoke(fn, { body });
    if (error) {
      let msg = error.message;
      try { msg = (await (error as any).context?.text?.()) ?? msg; } catch { /* noop */ }
      throw new Error(msg);
    }
    if ((data as any)?.error) throw new Error(`${(data as any).error}: ${(data as any).details ?? ""}`);
    return data as any;
  };

  const runEngine = async () => {
    setRunning(true);
    setProgress(3);
    try {
      setPhase("Crawling site content and internal links…");
      let runId: string | null = null;
      let group: number | null = 0;
      let guard = 0;
      while (group !== null && guard++ < 40) {
        const step = await invoke("silo-crawl", { run_id: runId, stage: "pages", group });
        runId = step.run_id;
        setPhase(`Crawling ${step.group_name ?? "content"}…`);
        setProgress(3 + Math.round(((group + 1) / (step.total_groups ?? CRAWL_GROUPS)) * 32));
        group = step.next_group ?? null;
      }

      setPhase("Computing internal PageRank and authority flow…");
      const graph = await invoke("silo-crawl", { run_id: runId, stage: "graph" });
      setProgress(45);
      await load();
      toast.success(`${graph.pages} pages · ${graph.edges} internal links · ${graph.orphans} orphans`);

      setPhase("Generating AI link recommendations…");
      let cursor: number | null = 0;
      let aGuard = 0;
      while (cursor !== null && aGuard++ < 120) {
        const step = await invoke("silo-analyze", { run_id: runId, cursor });
        cursor = step.done ? null : step.next_cursor;
        setProgress(Math.min(96, 45 + aGuard * 2));
        setPhase(`AI recommendations — ${step.recommendations ?? 0} link opportunities found`);
        if (aGuard % 3 === 0) await load();
      }

      if (settings?.auto_apply_links) {
        setPhase("Auto-applying high-confidence links…");
        const res = await invoke("silo-apply", { run_id: runId, auto: true });
        toast.success(`Auto-applied ${res.applied} link(s)`);
      }

      setProgress(100);
      setPhase("Complete — review link recommendations below");
      toast.success("Reverse siloing audit complete");
    } catch (e) {
      toast.error((e as Error).message);
      setPhase("Failed");
    } finally {
      setRunning(false);
      load();
    }
  };

  const setRecStatus = async (ids: string[], next: string) => {
    if (!ids.length) return;
    const { error } = await supabase.from("silo_link_recommendations")
      .update({ status: next }).in("id", ids);
    if (error) return toast.error(error.message);
    toast.success(`${ids.length} recommendation(s) ${next}`);
    setSelected(new Set());
    load();
  };

  const applySelected = async () => {
    const ids = recs.filter((r) => selected.has(r.id) && r.status !== "applied").map((r) => r.id);
    if (!ids.length) return toast.error("Select pending or approved recommendations first");
    try {
      const res = await invoke("silo-apply", { run_id: run?.id, recommendation_ids: ids });
      toast.success(`Applied ${res.applied}, failed ${res.failed}`);
      setSelected(new Set());
      load();
    } catch (e) { toast.error((e as Error).message); }
  };

  const revert = async (id: string) => {
    try {
      await invoke("silo-apply", { revert_action_id: id });
      toast.success("Link reverted");
      load();
    } catch (e) { toast.error((e as Error).message); }
  };

  const saveSettings = async (patch: Record<string, unknown>) => {
    const { error } = await supabase.from("silo_settings").update(patch).eq("id", true);
    if (error) return toast.error(error.message);
    setSettings((s: any) => ({ ...s, ...patch }));
    toast.success("Automation settings saved");
  };

  const stats = useMemo(() => {
    const commercial = pages.filter((p) => p.is_commercial);
    return {
      pages: pages.length,
      hubs: pages.filter((p) => p.is_hub).length,
      orphans: pages.filter((p) => p.is_orphan).length,
      starved: commercial.filter((p) => p.unique_sources < 3).length,
      avgAuthority: Math.round(pages.reduce((a, p) => a + Number(p.authority_score), 0) / Math.max(1, pages.length)),
      pending: recs.filter((r) => r.status === "pending").length,
      approved: recs.filter((r) => r.status === "approved").length,
      applied: recs.filter((r) => r.status === "applied").length,
      lowDiversity: pages.filter((p) => p.anchor_diversity !== null && Number(p.anchor_diversity) < 0.4).length,
    };
  }, [pages, recs]);

  const authorityBands = useMemo(() => {
    const bands = [0, 0, 0, 0, 0];
    for (const p of pages) {
      const a = Number(p.authority_score);
      bands[a >= 80 ? 4 : a >= 60 ? 3 : a >= 40 ? 2 : a >= 20 ? 1 : 0]++;
    }
    return [
      { band: "0-19", pages: bands[0] }, { band: "20-39", pages: bands[1] },
      { band: "40-59", pages: bands[2] }, { band: "60-79", pages: bands[3] },
      { band: "80-100", pages: bands[4] },
    ];
  }, [pages]);

  const statusMix = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of recs) counts.set(r.status, (counts.get(r.status) ?? 0) + 1);
    return Array.from(counts, ([name, value]) => ({ name, value }));
  }, [recs]);

  const filteredRecs = useMemo(() => recs.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (type !== "all" && r.target_type !== type) return false;
    if (search) {
      const q = search.toLowerCase();
      if (![r.source_path, r.target_path, r.anchor_text, r.source_name, r.target_name]
        .some((v) => (v ?? "").toLowerCase().includes(q))) return false;
    }
    return true;
  }), [recs, status, type, search]);

  const targetTypes = useMemo(
    () => Array.from(new Set(recs.map((r) => r.target_type).filter(Boolean))) as string[],
    [recs],
  );

  const exportCsv = () => {
    const head = ["source_path", "target_path", "anchor_text", "priority", "opportunity_score", "authority_before", "authority_after", "status", "rationale"];
    const rows = filteredRecs.map((r) => head.map((k) => `"${String((r as any)[k] ?? "").replace(/"/g, '""')}"`).join(","));
    const blob = new Blob([[head.join(","), ...rows].join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reverse-siloing-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const toggle = (id: string) => setSelected((s) => {
    const next = new Set(s);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Network className="h-6 w-6" /> Reverse Siloing Engine
          </h1>
          <p className="text-sm text-muted-foreground">
            Measures internal PageRank across every page, then routes authority from your strongest
            informational pages into the pages that convert.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button onClick={runEngine} disabled={running}>
            {running ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            Run Reverse Siloing
          </Button>
        </div>
      </div>

      {(running || phase) && (
        <Card>
          <CardContent className="space-y-2 pt-6">
            <div className="flex justify-between text-sm">
              <span className="text-foreground">{phase}</span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} />
            {run && (
              <p className="text-xs text-muted-foreground">
                Run {run.id.slice(0, 8)} · stage {run.stage ?? "—"} · {run.pages_scanned} pages ·{" "}
                {run.edges_found} links · {run.recommendations} recommendations · {run.applied} applied
                {run.error ? ` · error: ${run.error}` : ""}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {[
          { label: "Pages mapped", value: stats.pages },
          { label: "Authority hubs", value: stats.hubs },
          { label: "Orphan pages", value: stats.orphans },
          { label: "Starved money pages", value: stats.starved },
          { label: "Avg authority", value: stats.avgAuthority },
          { label: "Pending links", value: stats.pending },
          { label: "Approved", value: stats.approved },
          { label: "Applied", value: stats.applied },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5">
              <div className="text-2xl font-bold font-heading text-foreground">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="recommendations">
        <TabsList className="flex-wrap">
          <TabsTrigger value="recommendations">Link Recommendations</TabsTrigger>
          <TabsTrigger value="authority">Authority Flow</TabsTrigger>
          <TabsTrigger value="orphans">Orphans &amp; Weak Hubs</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
        </TabsList>

        {/* ------------------------- recommendations ------------------------- */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input placeholder="Search source, target or anchor…" value={search}
              onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
            <Select value={status} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["all", "pending", "approved", "rejected", "applied", "failed"].map((s) => (
                  <SelectItem key={s} value={s}>{s === "all" ? "All statuses" : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All target types</SelectItem>
                {targetTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="mr-2 h-4 w-4" /> CSV
              </Button>
              <Button variant="outline" size="sm" disabled={!selected.size}
                onClick={() => setRecStatus(Array.from(selected), "approved")}>Approve</Button>
              <Button variant="outline" size="sm" disabled={!selected.size}
                onClick={() => setRecStatus(Array.from(selected), "rejected")}>Reject</Button>
              <Button size="sm" disabled={!selected.size} onClick={applySelected}>
                <Link2 className="mr-2 h-4 w-4" /> Insert links
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Authority source → Money page</TableHead>
                    <TableHead>Anchor</TableHead>
                    <TableHead className="w-24">Priority</TableHead>
                    <TableHead className="w-24">Score</TableHead>
                    <TableHead className="w-32">Authority</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecs.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="truncate text-sm text-foreground">{r.source_name ?? r.source_path}</div>
                        <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          {r.source_path} <ArrowUpRight className="h-3 w-3" /> {r.target_path}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-sm">{r.anchor_text}</TableCell>
                      <TableCell><Badge variant={priorityVariant(r.priority)}>{r.priority}</Badge></TableCell>
                      <TableCell className="text-sm">{Math.round(Number(r.opportunity_score))}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.authority_before ?? "—"} → <span className="text-foreground">{r.authority_after ?? "—"}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.status === "applied" ? "default" : r.status === "failed" ? "destructive" : "secondary"}>
                          {r.status}{r.auto_applied ? " · auto" : ""}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filteredRecs.length && (
                    <TableRow><TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                      No link recommendations yet. Run the engine to map authority flow.
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --------------------------- authority ---------------------------- */}
        <TabsContent value="authority" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Authority distribution</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={authorityBands}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="band" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="pages" fill="hsl(210 80% 55%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Recommendation pipeline</CardTitle></CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusMix} dataKey="value" nameKey="name" outerRadius={90} label>
                      {statusMix.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Top authority hubs</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead><TableHead className="w-24">Type</TableHead>
                    <TableHead className="w-24">Authority</TableHead><TableHead className="w-20">In</TableHead>
                    <TableHead className="w-20">Out</TableHead><TableHead className="w-28">Anchor mix</TableHead>
                    <TableHead className="w-28">Impressions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.filter((p) => !p.is_commercial)
                    .sort((a, b) => Number(b.authority_score) - Number(a.authority_score))
                    .slice(0, 40).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="max-w-md">
                        <div className="truncate text-sm text-foreground">{p.page_name ?? p.path}</div>
                        <div className="truncate text-xs text-muted-foreground">{p.path}</div>
                      </TableCell>
                      <TableCell className="text-xs">{p.page_type}</TableCell>
                      <TableCell className="text-sm font-medium">{Math.round(Number(p.authority_score))}</TableCell>
                      <TableCell className="text-sm">{p.links_in}</TableCell>
                      <TableCell className="text-sm">{p.links_out}</TableCell>
                      <TableCell className="text-sm">{p.anchor_diversity ?? "—"}</TableCell>
                      <TableCell className="text-sm">{p.impressions}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------- orphans ----------------------------- */}
        <TabsContent value="orphans">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Orphans, starved money pages and low anchor diversity ({stats.orphans + stats.starved + stats.lowDiversity})
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead><TableHead className="w-28">Issue</TableHead>
                    <TableHead className="w-24">Sources</TableHead><TableHead className="w-24">Authority</TableHead>
                    <TableHead className="w-28">Opportunity</TableHead><TableHead className="w-28">Impressions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages
                    .filter((p) => p.is_orphan || (p.is_commercial && p.unique_sources < 3) ||
                      (p.anchor_diversity !== null && Number(p.anchor_diversity) < 0.4))
                    .sort((a, b) => Number(b.opportunity_score) - Number(a.opportunity_score))
                    .slice(0, 200).map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="max-w-md">
                        <div className="truncate text-sm text-foreground">{p.page_name ?? p.path}</div>
                        <div className="truncate text-xs text-muted-foreground">{p.path}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.is_orphan ? "destructive" : "secondary"}>
                          {p.is_orphan ? "orphan" : p.is_commercial && p.unique_sources < 3 ? "starved" : "anchor mix"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{p.unique_sources}</TableCell>
                      <TableCell className="text-sm">{Math.round(Number(p.authority_score))}</TableCell>
                      <TableCell className="text-sm">{Math.round(Number(p.opportunity_score))}</TableCell>
                      <TableCell className="text-sm">{p.impressions}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----------------------------- audit ----------------------------- */}
        <TabsContent value="audit">
          <Card>
            <CardHeader><CardTitle className="text-base">Applied link actions</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead><TableHead>Action</TableHead>
                    <TableHead>From → To</TableHead><TableHead>Anchor</TableHead>
                    <TableHead className="w-24">State</TableHead><TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actions.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs">{a.action}</TableCell>
                      <TableCell className="max-w-md truncate text-xs">
                        {a.from_path} → {a.to_path}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs">{a.anchor_text}</TableCell>
                      <TableCell>
                        <Badge variant={a.reverted_at ? "outline" : "default"}>
                          {a.reverted_at ? "reverted" : a.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!a.reverted_at && (
                          <Button size="sm" variant="ghost" onClick={() => revert(a.id)}>
                            <Undo2 className="mr-1 h-3 w-3" /> Undo
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!actions.length && (
                    <TableRow><TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No links inserted yet.
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --------------------------- automation --------------------------- */}
        <TabsContent value="automation">
          <Card>
            <CardHeader><CardTitle className="text-base">Automation policy</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Continuous automation</Label>
                  <p className="text-xs text-muted-foreground">
                    Scheduled audits re-map authority flow and queue link recommendations for new pages.
                  </p>
                </div>
                <Switch checked={Boolean(settings?.automation_enabled)}
                  onCheckedChange={(v) => saveSettings({ automation_enabled: v })} />
              </div>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <Label>Auto-insert high-confidence links</Label>
                  <p className="text-xs text-muted-foreground">
                    Applies links above the score threshold without approval. Every insertion is logged and revertible.
                  </p>
                </div>
                <Switch checked={Boolean(settings?.auto_apply_links)}
                  onCheckedChange={(v) => saveSettings({ auto_apply_links: v })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { key: "min_opportunity_score", label: "Min score to auto-apply" },
                  { key: "max_links_per_run", label: "Max links per run" },
                  { key: "max_links_per_page", label: "Max links per source page" },
                ].map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs">{f.label}</Label>
                    <Input type="number" value={settings?.[f.key] ?? ""}
                      onChange={(e) => setSettings((s: any) => ({ ...s, [f.key]: Number(e.target.value) }))}
                      onBlur={(e) => saveSettings({ [f.key]: Number(e.target.value) })} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Link recommendation</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground">Authority source</div>
                <div className="text-foreground">{detail.source_name ?? detail.source_path}</div>
                <div className="text-xs text-muted-foreground">{detail.source_path}</div>
              </div>
              <div className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground">Money page target</div>
                <div className="text-foreground">{detail.target_name ?? detail.target_path}</div>
                <div className="text-xs text-muted-foreground">{detail.target_path}</div>
              </div>
              <div><span className="text-muted-foreground">Anchor text: </span>{detail.anchor_text}</div>
              {detail.context_snippet && (
                <div className="rounded-md bg-muted p-3 text-xs">…{detail.context_snippet}…</div>
              )}
              {detail.problem && <div><span className="text-muted-foreground">Problem: </span>{detail.problem}</div>}
              {detail.rationale && <div><span className="text-muted-foreground">Why it passes authority: </span>{detail.rationale}</div>}
              {detail.seo_impact && <div><span className="text-muted-foreground">SEO impact: </span>{detail.seo_impact}</div>}
              {detail.expected_impact && <div><span className="text-muted-foreground">Expected outcome: </span>{detail.expected_impact}</div>}
              <div className="text-xs text-muted-foreground">
                Authority {detail.authority_before ?? "—"} → {detail.authority_after ?? "—"} · score{" "}
                {Math.round(Number(detail.opportunity_score))} · {detail.priority} priority
              </div>
              {detail.error && <div className="text-xs text-destructive">{detail.error}</div>}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setRecStatus([detail.id], "approved")}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => setRecStatus([detail.id], "rejected")}>Reject</Button>
                <Button size="sm" onClick={async () => {
                  await invoke("silo-apply", { run_id: detail.run_id, recommendation_ids: [detail.id] })
                    .then(() => { toast.success("Link inserted"); setDetail(null); load(); })
                    .catch((e) => toast.error((e as Error).message));
                }}>Insert link now</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReverseSiloing;
