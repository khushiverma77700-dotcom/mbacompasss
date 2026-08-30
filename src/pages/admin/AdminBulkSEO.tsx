import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Sparkles, Search, Loader2, RefreshCw, CheckCircle2, AlertTriangle,
  PlayCircle, ListChecks, Building2, BookOpen, Cpu, Coins, Clock, Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type TargetType = "institute" | "course";
type Row = { id: string; name: string; subtitle?: string };
type Job = { id: string; label: string | null; status: string; total_items: number; created_at: string; target_type: TargetType };
type Item = {
  id: string; target_id: string; target_name: string; status: string;
  progress_step: string | null; error_message: string | null; retry_count: number;
  started_at: string | null; finished_at: string | null; updated_at: string;
  seo_score: number | null; tokens_used: number | null; cost_credits: number | null; fields_filled: number | null;
};

const STATUS_TONE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  researching: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  generating: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  failed: "bg-rose-500/10 text-rose-700 border-rose-500/30",
};

const AdminBulkSEO = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const initialType = (searchParams.get("type") as TargetType) === "course" ? "course" : "institute";
  const [targetType, setTargetTypeState] = useState<TargetType>(initialType);
  const setTargetType = (t: TargetType) => {
    setTargetTypeState(t);
    setSearchParams((prev) => { const n = new URLSearchParams(prev); n.set("type", t); return n; }, { replace: true });
  };
  const [rows, setRows] = useState<Row[]>([]);
  const [loadingRows, setLoadingRows] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [starting, setStarting] = useState(false);

  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [items, setItems] = useState<Item[]>([]);

  const loadRows = useCallback(async () => {
    setLoadingRows(true);
    setSelectedIds(new Set());
    if (targetType === "institute") {
      let q = supabase.from("institutes")
        .select("id,name,city,state,meta_title,meta_description,schema_jsonld")
        .order("name").limit(10000);
      const { data } = await q;
      const filtered = (data || []).filter((r: any) => onlyMissing
        ? (!r.meta_title || !r.meta_description || !r.schema_jsonld)
        : true);
      setRows(filtered.map((r: any) => ({
        id: r.id, name: r.name, subtitle: [r.city, r.state].filter(Boolean).join(", "),
      })));
    } else {
      let q = supabase.from("courses")
        .select("id,name,meta_title,meta_description,schema_jsonld, institutes!inner(name,city)")
        .order("name").limit(10000);
      const { data } = await q;
      const filtered = (data || []).filter((r: any) => onlyMissing
        ? (!r.meta_title || !r.meta_description || !r.schema_jsonld)
        : true);
      setRows(filtered.map((r: any) => ({
        id: r.id, name: r.name,
        subtitle: [(r as any).institutes?.name, (r as any).institutes?.city].filter(Boolean).join(" · "),
      })));
    }
    setLoadingRows(false);
  }, [targetType, onlyMissing]);

  useEffect(() => { loadRows(); }, [loadRows]);

  const loadLatestJob = useCallback(async () => {
    const { data } = await supabase
      .from("bulk_seo_jobs").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (data) setActiveJob(data as any);
  }, []);
  useEffect(() => { loadLatestJob(); }, [loadLatestJob]);

  useEffect(() => {
    if (!activeJob?.id) return;
    let alive = true;
    const tick = async () => {
      const { data: jobRow } = await supabase
        .from("bulk_seo_jobs").select("*").eq("id", activeJob.id).maybeSingle();
      const { data: itemRows } = await supabase
        .from("bulk_seo_items").select("*").eq("job_id", activeJob.id).order("created_at", { ascending: true });
      if (!alive) return;
      if (jobRow) setActiveJob(jobRow as any);
      setItems((itemRows || []) as any);
    };
    tick();
    const id = setInterval(tick, 2500);
    return () => { alive = false; clearInterval(id); };
  }, [activeJob?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || (r.subtitle || "").toLowerCase().includes(q));
  }, [rows, search]);

  const toggleOne = (id: string) => setSelectedIds((p) => {
    const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const selectAllFiltered = () => setSelectedIds(new Set(filtered.map((r) => r.id)));
  const clearAll = () => setSelectedIds(new Set());

  const startBulk = async () => {
    if (selectedIds.size === 0) {
      toast({ title: "Select at least one item", variant: "destructive" });
      return;
    }
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("bulk-seo-worker", {
        body: {
          target_type: targetType,
          target_ids: Array.from(selectedIds),
          label: `Bulk SEO — ${selectedIds.size} ${targetType}(s)`,
          options: {},
        },
      });
      if (error) throw error;
      toast({
        title: "Bulk SEO started",
        description: `${data?.queued || selectedIds.size} ${targetType}(s) queued. You can close this tab — work continues on the server.`,
      });
      setSelectedIds(new Set());
      const { data: jobRow } = await supabase
        .from("bulk_seo_jobs").select("*").eq("id", data.job_id).maybeSingle();
      if (jobRow) setActiveJob(jobRow as any);
    } catch (e: any) {
      toast({ title: "Could not start", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  const retryItem = async (id: string) => {
    await supabase.functions.invoke("bulk-seo-worker", { body: { resume_item_id: id } });
    toast({ title: "Retry queued" });
  };
  const kickPump = async () => {
    await supabase.functions.invoke("bulk-seo-worker", { body: {} });
    toast({ title: "Worker kicked" });
  };

  // Derived metrics — done/pending/failed/throughput/avg time/cost/CPU load
  const metrics = useMemo(() => {
    const c = { pending: 0, researching: 0, generating: 0, completed: 0, failed: 0 };
    let tokens = 0, cost = 0, totalMs = 0, completedCount = 0;
    for (const it of items) {
      (c as any)[it.status] = ((c as any)[it.status] || 0) + 1;
      tokens += it.tokens_used || 0;
      cost += Number(it.cost_credits || 0);
      if (it.status === "completed" && it.started_at && it.finished_at) {
        totalMs += new Date(it.finished_at).getTime() - new Date(it.started_at).getTime();
        completedCount++;
      }
    }
    const done = c.completed + c.failed;
    const total = items.length || activeJob?.total_items || 0;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const avgSec = completedCount ? Math.round((totalMs / completedCount) / 1000) : 0;
    const inFlight = c.researching + c.generating;
    const cpuLoad = Math.min(100, Math.round((inFlight / 3) * 100));
    const etaSec = avgSec && c.pending ? Math.round((c.pending * avgSec) / Math.max(1, inFlight || 1)) : 0;
    return { ...c, done, total, pct, tokens, cost, avgSec, inFlight, cpuLoad, etaSec };
  }, [items, activeJob]);

  const fmtSec = (s: number) => s < 60 ? `${s}s` : s < 3600 ? `${Math.round(s/60)}m` : `${Math.round(s/3600)}h`;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" onClick={() => navigate("/admin/coaching-institutes")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
        <div className="mt-3">
          <h1 className="font-heading text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary" /> Bulk SEO Generator
          </h1>
          <p className="text-muted-foreground mt-1 max-w-3xl">
            Deep on-page + technical SEO for institutes and courses: meta title, meta description, H1,
            primary + short-tail + long-tail keywords, OG, Twitter, JSON-LD schema, FAQs and canonical —
            all researched and written per page. Runs on the server: close your laptop, come back anytime.
          </p>
        </div>
      </div>

      {/* LIVE PROGRESS */}
      {activeJob && (
        <Card className="border-primary/40">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <ListChecks className="w-5 h-5 text-primary" />
                  {activeJob.label || "Bulk SEO run"}
                </CardTitle>
                <CardDescription className="mt-1">
                  Started {new Date(activeJob.created_at).toLocaleString()} ·{" "}
                  <Badge variant="outline" className="ml-1 capitalize">{activeJob.status}</Badge>
                  <Badge variant="outline" className="ml-1 capitalize">{activeJob.target_type}</Badge>
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={kickPump}>
                  <PlayCircle className="w-4 h-4 mr-1" /> Run pump
                </Button>
                <Button size="sm" variant="ghost" onClick={loadLatestJob}>
                  <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{metrics.done} / {metrics.total} processed</span>
                <span className="text-muted-foreground">{metrics.pct}%</span>
              </div>
              <Progress value={metrics.pct} className="h-3" />
              <div className="flex flex-wrap gap-2 mt-3 text-xs">
                <Badge className={STATUS_TONE.pending}>Pending: {metrics.pending}</Badge>
                <Badge className={STATUS_TONE.researching}>Researching: {metrics.researching}</Badge>
                <Badge className={STATUS_TONE.generating}>Generating: {metrics.generating}</Badge>
                <Badge className={STATUS_TONE.completed}>Completed: {metrics.completed}</Badge>
                <Badge className={STATUS_TONE.failed}>Failed: {metrics.failed}</Badge>
              </div>
            </div>

            {/* Live telemetry */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1"><Cpu className="w-3 h-3"/>Worker load</div>
                <div className="text-lg font-bold tabular-nums">{metrics.cpuLoad}%</div>
                <Progress value={metrics.cpuLoad} className="h-1.5 mt-1" />
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1"><Zap className="w-3 h-3"/>In-flight</div>
                <div className="text-lg font-bold tabular-nums">{metrics.inFlight} / 3</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3"/>Avg / page</div>
                <div className="text-lg font-bold tabular-nums">{metrics.avgSec ? fmtSec(metrics.avgSec) : "—"}</div>
                {metrics.etaSec > 0 && <div className="text-xs text-muted-foreground">ETA ~{fmtSec(metrics.etaSec)}</div>}
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1"><Coins className="w-3 h-3"/>API cost</div>
                <div className="text-lg font-bold tabular-nums">{metrics.cost.toFixed(3)} cr</div>
                <div className="text-xs text-muted-foreground">{metrics.tokens.toLocaleString()} tokens</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/>SEO fields live</div>
                <div className="text-lg font-bold tabular-nums">
                  {items.reduce((s, i) => s + (i.fields_filled || 0), 0)}
                </div>
              </div>
            </div>

            {/* Item list */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold bg-muted/50 border-b">
                <div className="col-span-4">Target</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-4">Progress</div>
                <div className="col-span-1 text-right">Score</div>
                <div className="col-span-1 text-right">Cost</div>
              </div>
              <div className="max-h-[480px] overflow-y-auto divide-y">
                {items.map((it) => (
                  <div key={it.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm items-start hover:bg-muted/30">
                    <div className="col-span-4 font-medium truncate">{it.target_name}</div>
                    <div className="col-span-2">
                      <Badge className={`capitalize ${STATUS_TONE[it.status] || STATUS_TONE.pending}`}>
                        {(it.status === "researching" || it.status === "generating") && <Loader2 className="w-3 h-3 mr-1 animate-spin inline" />}
                        {it.status === "completed" && <CheckCircle2 className="w-3 h-3 mr-1 inline" />}
                        {it.status === "failed" && <AlertTriangle className="w-3 h-3 mr-1 inline" />}
                        {it.status}
                      </Badge>
                    </div>
                    <div className="col-span-4 text-xs text-muted-foreground">
                      <div className="line-clamp-2">{it.progress_step || "—"}</div>
                      {it.error_message && <div className="text-rose-600 mt-1 line-clamp-2">{it.error_message}</div>}
                    </div>
                    <div className="col-span-1 text-right tabular-nums">{it.seo_score ?? "—"}</div>
                    <div className="col-span-1 text-right">
                      <div className="text-xs tabular-nums">{Number(it.cost_credits || 0).toFixed(3)}</div>
                      {it.status === "failed" && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 mt-1 text-xs" onClick={() => retryItem(it.id)}>Retry</Button>
                      )}
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="px-3 py-6 text-sm text-muted-foreground text-center">No items yet.</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TARGET PICKER */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step 1 — Pick what to optimise</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={targetType} onValueChange={(v) => setTargetType(v as TargetType)}>
            <TabsList>
              <TabsTrigger value="institute"><Building2 className="w-4 h-4 mr-1.5" />Coaching Institutes</TabsTrigger>
              <TabsTrigger value="course"><BookOpen className="w-4 h-4 mr-1.5" />Courses</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2 mt-3">
            <Checkbox id="only-missing" checked={onlyMissing} onCheckedChange={(c) => setOnlyMissing(!!c)} />
            <label htmlFor="only-missing" className="text-sm cursor-pointer">
              Only show pages with missing SEO (recommended)
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step 2 — Select pages ({selectedIds.size} selected)</CardTitle>
          <CardDescription>Search, filter and pick any number — or hit "Select ALL filtered".</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name, city, institute…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Button variant="outline" size="sm" onClick={selectAllFiltered}>
              Select ALL filtered ({filtered.length})
            </Button>
            <Button variant="ghost" size="sm" onClick={clearAll}>Clear</Button>
            <Button onClick={startBulk} disabled={starting || selectedIds.size === 0}>
              {starting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Generate SEO for {selectedIds.size || "0"} pages
            </Button>
          </div>

          {loadingRows ? (
            <div className="py-10 text-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Loading…
            </div>
          ) : (
            <div className="rounded-lg border max-h-[520px] overflow-y-auto divide-y">
              {filtered.map((r) => (
                <label key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted/30 cursor-pointer">
                  <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleOne(r.id)} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{r.name}</div>
                    {r.subtitle && <div className="text-xs text-muted-foreground truncate">{r.subtitle}</div>}
                  </div>
                </label>
              ))}
              {filtered.length === 0 && (
                <div className="px-3 py-6 text-center text-muted-foreground text-sm">No matches.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBulkSEO;
