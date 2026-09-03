import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Sparkles, Search, Loader2, RefreshCw, CheckCircle2, AlertTriangle,
  PauseCircle, PlayCircle, ListChecks,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Institute = { id: string; name: string; city: string | null; state: string | null; mode: string | null };
type Job = { id: string; label: string | null; status: string; total_institutes: number; created_at: string; options: any };
type Item = {
  id: string; institute_id: string; institute_name: string; status: string;
  progress_step: string | null; courses_found: number; courses_saved: number; courses_failed: number;
  course_names: string[] | null; error_message: string | null; retry_count: number;
  started_at: string | null; finished_at: string | null;
};

const EXAM_OPTIONS = ["CAT", "XAT", "GMAT", "NMAT", "SNAP", "CMAT", "MAT", "MAH-CET", "IIFT", "MICAT", "GD-PI-WAT"];

const STATUS_TONE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  discovering: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  generating: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  completed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  skipped: "bg-slate-200 text-slate-700 border-slate-300",
  failed: "bg-rose-500/10 text-rose-700 border-rose-500/30",
};

const AdminBulkGenerateCourses = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [loadingInst, setLoadingInst] = useState(true);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [examFocus, setExamFocus] = useState<string[]>(["CAT", "XAT", "NMAT", "SNAP"]);
  const [maxCoursesPerInstitute, setMaxCoursesPerInstitute] = useState(12);
  const [skipIfHasCourses, setSkipIfHasCourses] = useState(true);
  const [contentDateContext, setContentDateContext] = useState(
    `Use only the most recent verified data (active ${new Date().getFullYear()} batch cycle). Fees, batch dates and seats must reflect the latest published year.`
  );

  const [starting, setStarting] = useState(false);

  // Active job state
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [items, setItems] = useState<Item[]>([]);

  const loadInstitutes = useCallback(async () => {
    setLoadingInst(true);
    const { data } = await supabase
      .from("institutes")
      .select("id,name,city,state,mode")
      .order("name")
      .limit(10000);
    setInstitutes(data || []);
    setLoadingInst(false);
  }, []);

  useEffect(() => { loadInstitutes(); }, [loadInstitutes]);

  // Load the most recent running/recent job on mount so we always see live progress.
  const loadLatestJob = useCallback(async () => {
    const { data } = await supabase
      .from("bulk_course_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) setActiveJob(data as any);
  }, []);

  useEffect(() => { loadLatestJob(); }, [loadLatestJob]);

  // Poll items every 3 seconds while a job exists.
  useEffect(() => {
    if (!activeJob?.id) return;
    let alive = true;
    const tick = async () => {
      const { data: jobRow } = await supabase
        .from("bulk_course_jobs").select("*").eq("id", activeJob.id).maybeSingle();
      const { data: itemRows } = await supabase
        .from("bulk_course_items").select("*").eq("job_id", activeJob.id).order("created_at", { ascending: true });
      if (!alive) return;
      if (jobRow) setActiveJob(jobRow as any);
      setItems((itemRows || []) as any);
    };
    tick();
    const id = setInterval(tick, 3000);
    return () => { alive = false; clearInterval(id); };
  }, [activeJob?.id]);

  const states = useMemo(() => {
    const set = new Set<string>();
    institutes.forEach((i) => { if (i.state) set.add(i.state); });
    return Array.from(set).sort();
  }, [institutes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return institutes.filter((i) => {
      if (stateFilter !== "all" && i.state !== stateFilter) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        (i.city || "").toLowerCase().includes(q) ||
        (i.state || "").toLowerCase().includes(q)
      );
    });
  }, [institutes, search, stateFilter]);

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectAllFiltered = () => setSelectedIds(new Set(filtered.map((i) => i.id)));
  const clearAll = () => setSelectedIds(new Set());
  const selectEverything = () => setSelectedIds(new Set(institutes.map((i) => i.id)));

  const toggleExam = (e: string) =>
    setExamFocus((p) => (p.includes(e) ? p.filter((x) => x !== e) : [...p, e]));

  const startBulk = async () => {
    if (selectedIds.size === 0) {
      toast({ title: "Select at least one institute", variant: "destructive" });
      return;
    }
    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke("bulk-course-worker", {
        body: {
          institute_ids: Array.from(selectedIds),
          label: `Bulk courses — ${selectedIds.size} institute(s)`,
          options: {
            examFocus,
            maxCoursesPerInstitute,
            skipIfHasCourses,
            autoPublish: true,
            contentDateContext,
          },
        },
      });
      if (error) throw error;
      toast({
        title: "Bulk generation started",
        description: `${data?.queued || selectedIds.size} institutes queued. You can close this tab — work continues on the server.`,
      });
      setSelectedIds(new Set());
      // load the new job
      const { data: jobRow } = await supabase
        .from("bulk_course_jobs").select("*").eq("id", data.job_id).maybeSingle();
      if (jobRow) setActiveJob(jobRow as any);
    } catch (e: any) {
      toast({ title: "Could not start", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setStarting(false);
    }
  };

  const retryItem = async (id: string) => {
    await supabase.functions.invoke("bulk-course-worker", { body: { resume_item_id: id } });
    toast({ title: "Retry queued" });
  };

  const kickPump = async () => {
    await supabase.functions.invoke("bulk-course-worker", { body: {} });
    toast({ title: "Worker kicked" });
  };

  // Derived progress
  const counts = useMemo(() => {
    const c = { pending: 0, discovering: 0, generating: 0, completed: 0, skipped: 0, failed: 0 };
    for (const it of items) (c as any)[it.status] = ((c as any)[it.status] || 0) + 1;
    return c;
  }, [items]);
  const done = counts.completed + counts.skipped + counts.failed;
  const total = items.length || activeJob?.total_institutes || 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const coursesSaved = items.reduce((s, i) => s + (i.courses_saved || 0), 0);
  const coursesFound = items.reduce((s, i) => s + (i.courses_found || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" onClick={() => navigate("/admin/courses")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Courses
        </Button>
        <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-heading text-3xl font-bold flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-primary" /> Bulk AI Course Generator
            </h1>
            <p className="text-muted-foreground mt-1 max-w-3xl">
              Pick any number of institutes (or all of them). For each one we auto-discover real MBA courses, generate
              full content, and publish them live. The job keeps running on the server — close your laptop, come back
              anytime.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/admin/courses/generate-ai")}>
            Single-institute mode
          </Button>
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
                  {activeJob.label || "Bulk run"}
                </CardTitle>
                <CardDescription className="mt-1">
                  Started {new Date(activeJob.created_at).toLocaleString()} ·{" "}
                  <Badge variant="outline" className="ml-1 capitalize">{activeJob.status}</Badge>
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={kickPump}>
                  <PlayCircle className="w-4 h-4 mr-1" /> Run pump now
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
                <span className="font-medium">{done} / {total} institutes processed</span>
                <span className="text-muted-foreground">{pct}%</span>
              </div>
              <Progress value={pct} className="h-3" />
              <div className="flex flex-wrap gap-2 mt-3 text-xs">
                <Badge className={STATUS_TONE.pending}>Pending: {counts.pending}</Badge>
                <Badge className={STATUS_TONE.discovering}>Discovering: {counts.discovering}</Badge>
                <Badge className={STATUS_TONE.generating}>Generating: {counts.generating}</Badge>
                <Badge className={STATUS_TONE.completed}>Completed: {counts.completed}</Badge>
                <Badge className={STATUS_TONE.skipped}>Skipped: {counts.skipped}</Badge>
                <Badge className={STATUS_TONE.failed}>Failed: {counts.failed}</Badge>
                <Badge variant="secondary">Courses published: {coursesSaved} / {coursesFound} found</Badge>
              </div>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-semibold bg-muted/50 border-b">
                <div className="col-span-4">Institute</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-4">Progress</div>
                <div className="col-span-1 text-right">Found</div>
                <div className="col-span-1 text-right">Saved</div>
              </div>
              <div className="max-h-[420px] overflow-y-auto divide-y">
                {items.map((it) => (
                  <div key={it.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-sm items-start hover:bg-muted/30">
                    <div className="col-span-4">
                      <div className="font-medium truncate">{it.institute_name}</div>
                      {it.course_names && it.course_names.length > 0 && (
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {it.course_names.slice(0, 4).join(" · ")}
                          {it.course_names.length > 4 ? ` +${it.course_names.length - 4} more` : ""}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2">
                      <Badge className={`capitalize ${STATUS_TONE[it.status] || STATUS_TONE.pending}`}>
                        {it.status === "discovering" || it.status === "generating" ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin inline" />
                        ) : it.status === "completed" ? (
                          <CheckCircle2 className="w-3 h-3 mr-1 inline" />
                        ) : it.status === "failed" ? (
                          <AlertTriangle className="w-3 h-3 mr-1 inline" />
                        ) : it.status === "skipped" ? (
                          <PauseCircle className="w-3 h-3 mr-1 inline" />
                        ) : null}
                        {it.status}
                      </Badge>
                    </div>
                    <div className="col-span-4 text-xs text-muted-foreground">
                      <div className="line-clamp-2">{it.progress_step || "—"}</div>
                      {it.error_message && (
                        <div className="text-rose-600 mt-1 line-clamp-2">{it.error_message}</div>
                      )}
                    </div>
                    <div className="col-span-1 text-right tabular-nums">{it.courses_found}</div>
                    <div className="col-span-1 text-right">
                      <div className="tabular-nums">{it.courses_saved}</div>
                      {it.status === "failed" && (
                        <Button size="sm" variant="ghost" className="h-6 px-2 mt-1 text-xs" onClick={() => retryItem(it.id)}>
                          Retry
                        </Button>
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

      {/* CONFIG / START */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
            Generation settings
          </CardTitle>
          <CardDescription>Applied to every selected institute.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Max courses per institute</Label>
              <Select value={String(maxCoursesPerInstitute)} onValueChange={(v) => setMaxCoursesPerInstitute(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 8, 10, 12, 15, 20, 25, 35, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} courses</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <Checkbox
                id="skip-existing"
                checked={skipIfHasCourses}
                onCheckedChange={(c) => setSkipIfHasCourses(!!c)}
              />
              <Label htmlFor="skip-existing" className="cursor-pointer">
                Skip institutes that already have courses
              </Label>
            </div>
          </div>

          <div>
            <Label>Exam focus hint</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {EXAM_OPTIONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => toggleExam(e)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition ${
                    examFocus.includes(e)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border hover:border-primary/40"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>Freshness instructions</Label>
            <Textarea rows={2} value={contentDateContext} onChange={(e) => setContentDateContext(e.target.value)} className="mt-1.5 text-sm" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
            Select institutes ({selectedIds.size} selected)
          </CardTitle>
          <CardDescription>Search, filter and pick any number — or hit "Select ALL".</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search institutes…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All states</SelectItem>
                {states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={selectAllFiltered}>Select filtered ({filtered.length})</Button>
            <Button size="sm" variant="outline" onClick={selectEverything}>Select ALL ({institutes.length})</Button>
            <Button size="sm" variant="ghost" onClick={clearAll}>Clear</Button>
          </div>

          <div className="rounded-lg border border-border max-h-[380px] overflow-y-auto divide-y">
            {loadingInst && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 mr-1 animate-spin inline" /> Loading…
              </div>
            )}
            {!loadingInst && filtered.slice(0, 500).map((i) => (
              <label key={i.id} className="flex items-center gap-3 px-4 py-2 text-sm cursor-pointer hover:bg-muted/40">
                <Checkbox checked={selectedIds.has(i.id)} onCheckedChange={() => toggleOne(i.id)} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{i.name}</div>
                  <div className="text-xs text-muted-foreground">{[i.city, i.state, i.mode].filter(Boolean).join(" · ")}</div>
                </div>
              </label>
            ))}
            {!loadingInst && filtered.length === 0 && (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">No institutes match.</div>
            )}
            {!loadingInst && filtered.length > 500 && (
              <div className="px-4 py-2 text-xs text-muted-foreground text-center bg-muted/30">
                Showing first 500 of {filtered.length}. Narrow the search or use "Select filtered".
              </div>
            )}
          </div>

          <Button onClick={startBulk} disabled={starting || selectedIds.size === 0} size="lg" className="w-full sm:w-auto">
            {starting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Start bulk generation ({selectedIds.size} institutes)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBulkGenerateCourses;
