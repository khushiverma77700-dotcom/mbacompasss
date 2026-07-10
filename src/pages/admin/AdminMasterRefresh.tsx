import { useEffect, useMemo, useRef, useState } from "react";
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
  Building2, GraduationCap, BookOpen, Newspaper, Loader2, PauseCircle, PlayCircle, StopCircle, ClipboardList,
} from "lucide-react";

type EntityType = "college" | "institute" | "course" | "article";
type ItemStatus = "pending" | "running" | "succeeded" | "failed";

interface QueueItem {
  id: string;
  name: string;
  type: EntityType;
  status: ItemStatus;
  startedAt?: number;
  finishedAt?: number;
  error?: string;
  changed?: number;
  total?: number;
}

const TYPE_CFG: Record<EntityType, { table: string; nameField: string; label: string; icon: any; hasRefreshTs: boolean; color: string }> = {
  college:   { table: "colleges",   nameField: "name",  label: "Colleges",   icon: GraduationCap, hasRefreshTs: true,  color: "text-blue-600" },
  institute: { table: "institutes", nameField: "name",  label: "Institutes", icon: Building2,     hasRefreshTs: true,  color: "text-violet-600" },
  course:    { table: "courses",    nameField: "name",  label: "Courses",    icon: BookOpen,      hasRefreshTs: false, color: "text-emerald-600" },
  article:   { table: "articles",   nameField: "title", label: "Articles",   icon: Newspaper,     hasRefreshTs: true,  color: "text-amber-600" },
};

const FRESHNESS = [
  { value: "all",  label: "Everything on the site" },
  { value: "30d",  label: "Stale (>30 days)" },
  { value: "90d",  label: "Very stale (>90 days)" },
  { value: "never",label: "Never refreshed" },
];

const fmtDuration = (ms: number) => {
  if (ms < 0 || !isFinite(ms)) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return `${m}m ${r}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
};

const AdminMasterRefresh = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [counts, setCounts] = useState<Record<EntityType, number>>({ college: 0, institute: 0, course: 0, article: 0 });
  const [selectedTypes, setSelectedTypes] = useState<Record<EntityType, boolean>>({ college: true, institute: true, course: true, article: true });
  const [mode, setMode] = useState<"smart" | "full">("smart");
  const [freshness, setFreshness] = useState<string>("all");
  const [concurrency, setConcurrency] = useState(4);
  const [loading, setLoading] = useState(true);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const stopRef = useRef(false);
  const pauseRef = useRef(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load counts per type honoring freshness filter
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

  const totalSelected = useMemo(
    () => (Object.keys(TYPE_CFG) as EntityType[]).reduce((s, t) => s + (selectedTypes[t] ? counts[t] : 0), 0),
    [selectedTypes, counts]
  );

  const stats = useMemo(() => {
    const total = queue.length;
    const succeeded = queue.filter(q => q.status === "succeeded").length;
    const failed = queue.filter(q => q.status === "failed").length;
    const runningNow = queue.filter(q => q.status === "running").length;
    const done = succeeded + failed;
    const elapsed = startedAt ? now - startedAt : 0;
    const rate = elapsed > 0 ? done / (elapsed / 1000) : 0;
    const eta = rate > 0 ? ((total - done) / rate) * 1000 : 0;
    const perType: Record<EntityType, { done: number; total: number; ok: number; fail: number }> = {
      college: { done: 0, total: 0, ok: 0, fail: 0 },
      institute: { done: 0, total: 0, ok: 0, fail: 0 },
      course: { done: 0, total: 0, ok: 0, fail: 0 },
      article: { done: 0, total: 0, ok: 0, fail: 0 },
    };
    for (const q of queue) {
      perType[q.type].total++;
      if (q.status === "succeeded") { perType[q.type].done++; perType[q.type].ok++; }
      else if (q.status === "failed") { perType[q.type].done++; perType[q.type].fail++; }
    }
    return { total, succeeded, failed, runningNow, done, elapsed, rate, eta, perType };
  }, [queue, startedAt, now]);

  const buildQueue = async (): Promise<QueueItem[]> => {
    const items: QueueItem[] = [];
    const cutoffFor = (f: string) => {
      if (f === "30d") return new Date(Date.now() - 30 * 86400000).toISOString();
      if (f === "90d") return new Date(Date.now() - 90 * 86400000).toISOString();
      return null;
    };
    for (const t of Object.keys(TYPE_CFG) as EntityType[]) {
      if (!selectedTypes[t]) continue;
      const cfg = TYPE_CFG[t];
      let q = supabase.from(cfg.table as any).select(`id, ${cfg.nameField}`).limit(5000);
      if (cfg.hasRefreshTs && freshness !== "all") {
        if (freshness === "never") q = q.is("last_seo_refresh", null);
        else {
          const cutoff = cutoffFor(freshness);
          if (cutoff) q = q.or(`last_seo_refresh.is.null,last_seo_refresh.lt.${cutoff}`);
        }
      }
      const { data, error } = await q;
      if (error) { toast({ title: `Failed to load ${cfg.label}`, description: error.message, variant: "destructive" }); continue; }
      (data || []).forEach((r: any) => items.push({ id: r.id, type: t, name: r[cfg.nameField] || "Untitled", status: "pending" }));
    }
    return items;
  };

  const start = async () => {
    if (totalSelected === 0) { toast({ title: "Nothing to refresh", variant: "destructive" }); return; }
    if (!confirm(
      `Refresh ${totalSelected} items from the internet (${mode === "full" ? "FULL REWRITE" : "smart refresh"})?\n\n` +
      `• AI re-researches each item from official websites & regulators (NIRF, AICTE, exam bodies)\n` +
      `• Results land in Content Refresh Queue for your approval\n` +
      `• Concurrency: ${concurrency}\n\n` +
      `Estimated: ~${fmtDuration(Math.ceil(totalSelected * 8 / concurrency) * 1000)}`
    )) return;

    const items = await buildQueue();
    if (items.length === 0) { toast({ title: "Queue empty", variant: "destructive" }); return; }

    setQueue(items);
    setRunning(true); setPaused(false); stopRef.current = false; pauseRef.current = false;
    setStartedAt(Date.now());

    const { data: { user } } = await supabase.auth.getUser();
    const idx = { i: 0 };

    const worker = async () => {
      while (true) {
        while (pauseRef.current && !stopRef.current) await new Promise(r => setTimeout(r, 300));
        if (stopRef.current) return;
        const myIdx = idx.i++;
        if (myIdx >= items.length) return;
        const item = items[myIdx];
        setQueue(prev => prev.map(x => x.id === item.id && x.type === item.type ? { ...x, status: "running", startedAt: Date.now() } : x));
        try {
          const { data, error } = await supabase.functions.invoke("refresh-content", {
            body: { entity_type: item.type, entity_id: item.id, mode, requested_by: user?.id },
          });
          if (error) throw error;
          const changed = (data as any)?.changed_fields ?? 0;
          const total = (data as any)?.total_fields ?? 0;
          setQueue(prev => prev.map(x => x.id === item.id && x.type === item.type
            ? { ...x, status: "succeeded", finishedAt: Date.now(), changed, total } : x));
        } catch (e: any) {
          setQueue(prev => prev.map(x => x.id === item.id && x.type === item.type
            ? { ...x, status: "failed", finishedAt: Date.now(), error: e?.message || "Unknown error" } : x));
        }
      }
    };

    await Promise.all(Array.from({ length: concurrency }, () => worker()));
    setRunning(false);
    toast({ title: "Master refresh complete", description: "Review updates in Content Refresh Queue." });
  };

  const togglePause = () => { pauseRef.current = !pauseRef.current; setPaused(pauseRef.current); };
  const stop = () => { stopRef.current = true; pauseRef.current = false; setPaused(false); setRunning(false); };

  const recentActivity = useMemo(() =>
    [...queue].sort((a, b) => (b.finishedAt || b.startedAt || 0) - (a.finishedAt || a.startedAt || 0)).slice(0, 25),
    [queue]
  );

  const overallPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

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
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            One-click site-wide refresh. AI re-researches colleges, institutes, courses & articles from official sources
            (college websites, NIRF, AICTE, NAAC, exam bodies) and reformats content. All updates land in the Content
            Refresh Queue for your approval — nothing goes live automatically.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin/content-refreshes")}>
          <ClipboardList className="w-4 h-4 mr-2" /> Review Queue
        </Button>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1. What should we refresh?</CardTitle>
          <CardDescription>Pick entity types and freshness. Data is pulled from official websites only.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(Object.keys(TYPE_CFG) as EntityType[]).map(t => {
              const cfg = TYPE_CFG[t];
              const Icon = cfg.icon;
              return (
                <label key={t} className={`border rounded-lg p-3 cursor-pointer transition ${selectedTypes[t] ? "border-blue-500 bg-blue-50/60" : "hover:bg-muted/40"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                      <span className="font-medium">{cfg.label}</span>
                    </div>
                    <Switch checked={selectedTypes[t]} onCheckedChange={(v) => setSelectedTypes(s => ({ ...s, [t]: v }))} disabled={running} />
                  </div>
                  <div className="text-2xl font-bold mt-2">{loading ? "…" : counts[t].toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">items match filter</div>
                </label>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t">
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Freshness</Label>
              <Select value={freshness} onValueChange={setFreshness} disabled={running}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FRESHNESS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Refresh Mode</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as any)} disabled={running}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="smart">Smart (fees, placements, rankings, dates)</SelectItem>
                  <SelectItem value="full">Full rewrite (all fields + reformat)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Concurrency: {concurrency}</Label>
              <input type="range" min={1} max={8} value={concurrency} onChange={(e) => setConcurrency(parseInt(e.target.value))}
                disabled={running} className="w-full h-10" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t flex-wrap gap-3">
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              <strong className="text-foreground">{totalSelected.toLocaleString()}</strong> items ready • sources restricted to official websites & regulators
            </div>
            <div className="flex gap-2">
              {!running ? (
                <Button size="lg" onClick={start} disabled={totalSelected === 0 || loading} className="gap-2 bg-blue-600 hover:bg-blue-700">
                  <Rocket className="w-5 h-5" /> Refresh Everything Now
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={togglePause} className="gap-2">
                    {paused ? <><PlayCircle className="w-4 h-4" /> Resume</> : <><PauseCircle className="w-4 h-4" /> Pause</>}
                  </Button>
                  <Button variant="destructive" onClick={stop} className="gap-2">
                    <StopCircle className="w-4 h-4" /> Stop
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Dashboard */}
      {queue.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard icon={<Zap className="w-4 h-4" />} label="Progress" value={`${overallPct}%`} sub={`${stats.done}/${stats.total}`} />
            <StatCard icon={<Loader2 className={`w-4 h-4 ${running && !paused ? "animate-spin" : ""}`} />} label="Running" value={stats.runningNow.toString()} sub={paused ? "paused" : running ? "live" : "idle"} />
            <StatCard icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />} label="Succeeded" value={stats.succeeded.toString()} sub={stats.total ? `${Math.round(stats.succeeded / stats.total * 100)}%` : ""} />
            <StatCard icon={<XCircle className="w-4 h-4 text-red-600" />} label="Failed" value={stats.failed.toString()} sub={stats.total ? `${Math.round(stats.failed / stats.total * 100)}%` : ""} />
            <StatCard icon={<Clock className="w-4 h-4" />} label="ETA" value={fmtDuration(stats.eta)} sub={`elapsed ${fmtDuration(stats.elapsed)} • ${stats.rate.toFixed(2)}/s`} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-lg">Overall Progress</CardTitle></CardHeader>
            <CardContent>
              <Progress value={overallPct} className="h-3" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {(Object.keys(TYPE_CFG) as EntityType[]).map(t => {
                  const pt = stats.perType[t];
                  if (pt.total === 0) return null;
                  const pct = pt.total ? Math.round(pt.done / pt.total * 100) : 0;
                  const Icon = TYPE_CFG[t].icon;
                  return (
                    <div key={t} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 font-medium text-sm">
                          <Icon className={`w-4 h-4 ${TYPE_CFG[t].color}`} />
                          {TYPE_CFG[t].label}
                        </div>
                        <div className="text-xs text-muted-foreground">{pt.done}/{pt.total} • {pct}%</div>
                      </div>
                      <Progress value={pct} className="h-2" />
                      <div className="flex gap-3 mt-2 text-xs">
                        <span className="text-emerald-700">✓ {pt.ok}</span>
                        <span className="text-red-700">✗ {pt.fail}</span>
                        <span className="text-muted-foreground">pending {pt.total - pt.done}</span>
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
              <CardDescription>Most recent refresh operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md max-h-[420px] overflow-y-auto divide-y">
                {recentActivity.map(item => {
                  const Icon = TYPE_CFG[item.type].icon;
                  const dur = item.startedAt ? (item.finishedAt || now) - item.startedAt : 0;
                  return (
                    <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${TYPE_CFG[item.type].color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.name}</div>
                        {item.status === "failed" && item.error && (
                          <div className="text-xs text-red-600 truncate">{item.error}</div>
                        )}
                        {item.status === "succeeded" && (item.changed !== undefined) && (
                          <div className="text-xs text-muted-foreground">{item.changed}/{item.total} fields proposed</div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">{fmtDuration(dur)}</div>
                      <StatusBadge status={item.status} />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

const StatCard = ({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) => (
  <Card>
    <CardContent className="pt-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon} {label}</div>
      <div className="text-2xl font-bold mt-1 font-heading">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </CardContent>
  </Card>
);

const StatusBadge = ({ status }: { status: ItemStatus }) => {
  if (status === "running") return <Badge className="bg-blue-100 text-blue-800 border-blue-200 gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Running</Badge>;
  if (status === "succeeded") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1"><CheckCircle2 className="w-3 h-3" /> Done</Badge>;
  if (status === "failed") return <Badge className="bg-red-100 text-red-800 border-red-200 gap-1"><XCircle className="w-3 h-3" /> Failed</Badge>;
  return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" /> Pending</Badge>;
};

export default AdminMasterRefresh;
