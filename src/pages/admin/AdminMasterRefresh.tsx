import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Rocket, ArrowLeft, RefreshCw, CheckCircle2, XCircle, Clock, Zap, Globe,
  Building2, GraduationCap, BookOpen, Newspaper, Loader2, PauseCircle, PlayCircle, StopCircle, ClipboardList, Cpu, Server,
} from "lucide-react";

type EntityType = "college" | "institute" | "course" | "article";

const TYPE_CFG: Record<EntityType, { table: string; label: string; icon: any; hasRefreshTs: boolean; color: string }> = {
  college:   { table: "colleges",   label: "Colleges",   icon: GraduationCap, hasRefreshTs: true,  color: "text-blue-600" },
  institute: { table: "institutes", label: "Institutes", icon: Building2,     hasRefreshTs: true,  color: "text-violet-600" },
  course:    { table: "courses",    label: "Courses",    icon: BookOpen,      hasRefreshTs: false, color: "text-emerald-600" },
  article:   { table: "articles",   label: "Articles",   icon: Newspaper,     hasRefreshTs: true,  color: "text-amber-600" },
};

const FRESHNESS = [
  { value: "all",  label: "Everything on the site" },
  { value: "30d",  label: "Stale (>30 days)" },
  { value: "90d",  label: "Very stale (>90 days)" },
  { value: "never",label: "Never refreshed" },
];

const MODELS = [
  { value: "openai/gpt-5-mini",    label: "GPT-5 Mini (fast, cheap — default)" },
  { value: "openai/gpt-5",         label: "GPT-5 (highest quality, slower)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash (fast, cheap)" },
  { value: "google/gemini-2.5-pro",   label: "Gemini 2.5 Pro (quality)" },
  { value: "anthropic/claude-sonnet-4.5", label: "Claude Sonnet 4.5 (quality)" },
];

const fmtDuration = (ms: number) => {
  if (ms < 0 || !isFinite(ms)) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};

interface Job {
  id: string; status: string; mode: string; model: string; freshness: string;
  entity_types: string[]; concurrency: number; paused: boolean;
  total: number; succeeded: number; failed: number; in_progress: number;
  last_activity: string | null; started_at: string | null; finished_at: string | null;
  created_at: string;
}

interface Item {
  id: string; entity_type: EntityType; entity_name: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "skipped";
  error: string | null; changed_fields: number | null; total_fields: number | null;
  started_at: string | null; finished_at: string | null;
}

const AdminMasterRefresh = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [counts, setCounts] = useState<Record<EntityType, number>>({ college: 0, institute: 0, course: 0, article: 0 });
  const [selectedTypes, setSelectedTypes] = useState<Record<EntityType, boolean>>({ college: true, institute: true, course: true, article: true });
  const [mode, setMode] = useState<"smart" | "full">("smart");
  const [model, setModel] = useState<string>("openai/gpt-5-mini");
  const [freshness, setFreshness] = useState<string>("all");
  const [concurrency, setConcurrency] = useState(4);
  const [loading, setLoading] = useState(true);
  const [enqueueing, setEnqueueing] = useState(false);

  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  // Load counts per type
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const cutoffFor = (f: string) => {
        if (f === "30d") return new Date(Date.now() - 30 * 86400000).toISOString();
        if (f === "90d") return new Date(Date.now() - 90 * 86400000).toISOString();
        return null;
      };
      const out: Record<EntityType, number> = { college: 0, institute: 0, course: 0, article: 0 };
      await Promise.all((Object.keys(TYPE_CFG) as EntityType[]).map(async (t) => {
        const cfg = TYPE_CFG[t];
        let q = supabase.from(cfg.table as any).select("id", { count: "exact", head: true });
        if (cfg.hasRefreshTs && freshness !== "all") {
          if (freshness === "never") q = q.is("last_seo_refresh", null);
          else {
            const cutoff = cutoffFor(freshness);
            if (cutoff) q = q.or(`last_seo_refresh.is.null,last_seo_refresh.lt.${cutoff}`);
          }
        }
        const { count } = await q;
        out[t] = count ?? 0;
      }));
      if (!cancelled) { setCounts(out); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [freshness]);

  // Poll active job + recents
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const { data: jobs } = await supabase.from("master_refresh_jobs")
        .select("*").order("created_at", { ascending: false }).limit(6);
      if (cancelled || !jobs) return;
      const active = jobs.find((j: any) => ["queued", "running", "paused"].includes(j.status));
      setActiveJob((active || jobs[0]) as any);
      setRecentJobs(jobs as any);
    };
    poll();
    const t = setInterval(poll, 3000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  // Poll items for active job
  useEffect(() => {
    if (!activeJob?.id) { setItems([]); return; }
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.from("master_refresh_items")
        .select("id, entity_type, entity_name, status, error, changed_fields, total_fields, started_at, finished_at")
        .eq("job_id", activeJob.id)
        .order("finished_at", { ascending: false, nullsFirst: false })
        .limit(50);
      if (!cancelled && data) setItems(data as any);
    };
    load();
    const t = setInterval(load, 3000);
    return () => { cancelled = true; clearInterval(t); };
  }, [activeJob?.id]);

  const totalSelected = useMemo(
    () => (Object.keys(TYPE_CFG) as EntityType[]).reduce((s, t) => s + (selectedTypes[t] ? counts[t] : 0), 0),
    [selectedTypes, counts]
  );

  const start = async () => {
    if (totalSelected === 0) { toast({ title: "Nothing to refresh", variant: "destructive" }); return; }
    const entity_types = (Object.keys(TYPE_CFG) as EntityType[]).filter(t => selectedTypes[t]);
    if (!confirm(
      `Queue ${totalSelected} items on the server (${mode === "full" ? "FULL REWRITE" : "smart"}) using ${model}?\n\n` +
      `Runs in the background — you can close this tab.\nResults land in Content Refresh Queue for approval.`
    )) return;
    setEnqueueing(true);
    const { data, error } = await supabase.functions.invoke("master-refresh-enqueue", {
      body: { mode, model, freshness, entity_types, concurrency },
    });
    setEnqueueing(false);
    if (error) return toast({ title: "Failed to start", description: error.message, variant: "destructive" });
    toast({ title: "Master refresh started", description: `Queued ${(data as any)?.total || 0} items server-side. Progress continues even if you close this page.` });
  };

  const setJobFlag = async (patch: Partial<Job>) => {
    if (!activeJob) return;
    const { error } = await supabase.from("master_refresh_jobs").update(patch).eq("id", activeJob.id);
    if (error) return toast({ title: "Failed", description: error.message, variant: "destructive" });
    setActiveJob({ ...activeJob, ...patch } as any);
    if ((patch as any).paused === false) {
      // Kick worker back into gear
      supabase.functions.invoke("master-refresh-worker", { body: { resume: true } }).catch(() => {});
    }
  };

  const cancel = () => setJobFlag({ status: "cancelled", paused: true, finished_at: new Date().toISOString() } as any);

  const done = activeJob ? activeJob.succeeded + activeJob.failed : 0;
  const overallPct = activeJob && activeJob.total > 0 ? Math.round((done / activeJob.total) * 100) : 0;
  const elapsed = activeJob?.started_at ? (activeJob.finished_at ? new Date(activeJob.finished_at).getTime() : Date.now()) - new Date(activeJob.started_at).getTime() : 0;
  const rate = elapsed > 0 ? done / (elapsed / 1000) : 0;
  const eta = rate > 0 && activeJob ? ((activeJob.total - done) / rate) * 1000 : 0;

  const perType = useMemo(() => {
    const map: Record<EntityType, { done: number; total: number; ok: number; fail: number }> =
      { college: {done:0,total:0,ok:0,fail:0}, institute: {done:0,total:0,ok:0,fail:0}, course: {done:0,total:0,ok:0,fail:0}, article: {done:0,total:0,ok:0,fail:0} };
    for (const it of items) {
      if (!map[it.entity_type]) continue;
      map[it.entity_type].total++;
      if (it.status === "succeeded") { map[it.entity_type].done++; map[it.entity_type].ok++; }
      else if (it.status === "failed") { map[it.entity_type].done++; map[it.entity_type].fail++; }
    }
    return map;
  }, [items]);

  const jobActive = activeJob && ["queued", "running", "paused"].includes(activeJob.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Rocket className="w-6 h-6 text-blue-600" /> Master Content Refresh
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl flex items-center gap-1.5">
            <Server className="w-4 h-4 text-emerald-600" />
            Runs entirely on the server — safe to close this tab or shut down your laptop. Cron continues progress every minute.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin/content-refreshes")}>
          <ClipboardList className="w-4 h-4 mr-2" /> Review Queue
        </Button>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1. Configure & queue a background job</CardTitle>
          <CardDescription>Pick entity types, freshness, model, and concurrency. Nothing goes live until approved.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.keys(TYPE_CFG) as EntityType[]).map(t => {
              const cfg = TYPE_CFG[t]; const Icon = cfg.icon;
              return (
                <label key={t} className={`border rounded-lg p-3 cursor-pointer transition ${selectedTypes[t] ? "border-blue-500 bg-blue-50/60" : "hover:bg-muted/40"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><Icon className={`w-5 h-5 ${cfg.color}`} /><span className="font-medium">{cfg.label}</span></div>
                    <Switch checked={selectedTypes[t]} onCheckedChange={(v) => setSelectedTypes(s => ({ ...s, [t]: v }))} disabled={enqueueing} />
                  </div>
                  <div className="text-2xl font-bold mt-2">{loading ? "…" : counts[t].toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">items match filter</div>
                </label>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-3 border-t">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Freshness</Label>
              <Select value={freshness} onValueChange={setFreshness} disabled={enqueueing}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FRESHNESS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Refresh Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as any)} disabled={enqueueing}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="smart">Smart (facts + reformat)</SelectItem>
                  <SelectItem value="full">Full rewrite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5" /> AI Model</Label>
              <Select value={model} onValueChange={setModel} disabled={enqueueing}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{MODELS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Concurrency: {concurrency}</Label>
              <input type="range" min={1} max={8} value={concurrency} onChange={(e) => setConcurrency(parseInt(e.target.value))} disabled={enqueueing} className="w-full h-10" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t flex-wrap gap-3">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              <strong className="text-foreground">{totalSelected.toLocaleString()}</strong> items ready • sources restricted to admin allowlist
            </div>
            <Button size="lg" onClick={start} disabled={totalSelected === 0 || loading || enqueueing || !!jobActive} className="gap-2 bg-blue-600 hover:bg-blue-700">
              {enqueueing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Rocket className="w-5 h-5" />}
              {jobActive ? "Job already running…" : "Start Background Refresh"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live dashboard for active/latest job */}
      {activeJob && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <StatCard icon={<Zap className="w-4 h-4" />} label="Progress" value={`${overallPct}%`} sub={`${done}/${activeJob.total}`} />
            <StatCard icon={<Loader2 className={`w-4 h-4 ${activeJob.status === "running" ? "animate-spin" : ""}`} />} label="Status" value={activeJob.status} sub={activeJob.paused ? "paused" : ""} />
            <StatCard icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />} label="Succeeded" value={activeJob.succeeded.toString()} sub="" />
            <StatCard icon={<XCircle className="w-4 h-4 text-red-600" />} label="Failed" value={activeJob.failed.toString()} sub="" />
            <StatCard icon={<Clock className="w-4 h-4" />} label="ETA" value={fmtDuration(eta)} sub={`elapsed ${fmtDuration(elapsed)}`} />
            <StatCard icon={<Cpu className="w-4 h-4" />} label="Model" value={activeJob.model.split("/").pop() || activeJob.model} sub={`${activeJob.mode} • ${activeJob.freshness}`} />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Live Job Progress</CardTitle>
                <CardDescription>{activeJob.last_activity || "Waiting for worker…"}</CardDescription>
              </div>
              {jobActive && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setJobFlag({ paused: !activeJob.paused, status: activeJob.paused ? "running" : "paused" } as any)}>
                    {activeJob.paused ? <><PlayCircle className="w-4 h-4 mr-1" /> Resume</> : <><PauseCircle className="w-4 h-4 mr-1" /> Pause</>}
                  </Button>
                  <Button variant="destructive" size="sm" onClick={cancel}><StopCircle className="w-4 h-4 mr-1" /> Cancel</Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <Progress value={overallPct} className="h-3" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {(Object.keys(TYPE_CFG) as EntityType[]).map(t => {
                  const pt = perType[t]; if (pt.total === 0) return null;
                  const pct = pt.total ? Math.round(pt.done / pt.total * 100) : 0;
                  const Icon = TYPE_CFG[t].icon;
                  return (
                    <div key={t} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 font-medium text-sm"><Icon className={`w-4 h-4 ${TYPE_CFG[t].color}`} />{TYPE_CFG[t].label}</div>
                        <div className="text-xs text-muted-foreground">{pt.done}/{pt.total} • {pct}%</div>
                      </div>
                      <Progress value={pct} className="h-2" />
                      <div className="flex gap-3 mt-2 text-xs">
                        <span className="text-emerald-700">✓ {pt.ok}</span>
                        <span className="text-red-700">✗ {pt.fail}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Live Activity</CardTitle>
              <CardDescription>Most recent refresh operations from the server worker</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md max-h-[420px] overflow-y-auto divide-y">
                {items.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">No activity yet — worker is picking up the queue.</div>}
                {items.map(item => {
                  const Icon = TYPE_CFG[item.entity_type]?.icon || RefreshCw;
                  const dur = item.started_at ? (item.finished_at ? new Date(item.finished_at).getTime() : Date.now()) - new Date(item.started_at).getTime() : 0;
                  return (
                    <div key={item.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <Icon className={`w-4 h-4 shrink-0 ${TYPE_CFG[item.entity_type]?.color || ""}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.entity_name}</div>
                        {item.status === "failed" && item.error && <div className="text-xs text-red-600 truncate">{item.error}</div>}
                        {item.status === "succeeded" && item.changed_fields !== null && <div className="text-xs text-muted-foreground">{item.changed_fields}/{item.total_fields} fields proposed</div>}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">{item.started_at ? fmtDuration(dur) : ""}</div>
                      <StatusBadge status={item.status} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {recentJobs.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Recent Jobs</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y border rounded-md">
              {recentJobs.map(j => (
                <div key={j.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <Badge variant="outline" className="capitalize">{j.status}</Badge>
                  <div className="flex-1 min-w-0 truncate">
                    <span className="font-mono text-xs text-muted-foreground">{j.id.slice(0, 8)}</span>
                    <span className="ml-2">{j.mode} • {j.model.split("/").pop()} • {j.entity_types.join(", ")}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{j.succeeded}✓ {j.failed}✗ / {j.total}</div>
                  <div className="text-xs text-muted-foreground">{new Date(j.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) => (
  <Card>
    <CardContent className="pt-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon} {label}</div>
      <div className="text-2xl font-bold mt-1 font-heading capitalize truncate">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5 truncate">{sub}</div>}
    </CardContent>
  </Card>
);

const StatusBadge = ({ status }: { status: Item["status"] }) => {
  if (status === "processing") return <Badge className="bg-blue-100 text-blue-800 border-blue-200 gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Running</Badge>;
  if (status === "succeeded") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1"><CheckCircle2 className="w-3 h-3" /> Done</Badge>;
  if (status === "failed") return <Badge className="bg-red-100 text-red-800 border-red-200 gap-1"><XCircle className="w-3 h-3" /> Failed</Badge>;
  return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
};

export default AdminMasterRefresh;
