import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw, Sparkles, Loader2, Building2, BookOpen, ExternalLink,
  CheckCircle2, AlertCircle, ClipboardList, Wand2, Search,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

/* ============================================================
   Coaching Refresh Hub
   ------------------------------------------------------------
   One screen, one click to refresh:
     • Institute content (fees, batches, highlights, copy)
     • Every Course it offers (price, batch dates, eligibility…)
     • Advanced SEO (meta title/description/keywords/H1) per item
   All proposals land in the Content Refresh Queue → admin approves →
   only then it goes live on the public site.
   ============================================================ */

type InstituteRow = {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  institute_type: "city" | "hybrid" | null;
  last_seo_refresh: string | null;
};

type CourseRow = {
  id: string;
  name: string;
  slug: string | null;
  institute_id: string;
  fees: number | null;
};

type Mode = "full" | "smart";

type LiveStatus = {
  total: number;
  done: number;
  succeeded: number;
  failed: number;
  current?: string;
  errors: { name: string; error: string }[];
};

const empty: LiveStatus = { total: 0, done: 0, succeeded: 0, failed: 0, errors: [] };

const AdminCoachingRefreshHub = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [institutes, setInstitutes] = useState<InstituteRow[]>([]);
  const [coursesByInst, setCoursesByInst] = useState<Record<string, CourseRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "city" | "hybrid">("all");
  const [pendingByEntity, setPendingByEntity] = useState<Record<string, number>>({});

  // Per-institute running state
  const [running, setRunning] = useState<Record<string, { mode: Mode; status: LiveStatus } | null>>({});
  const [globalRunning, setGlobalRunning] = useState<{ mode: Mode; status: LiveStatus } | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: insts }, { data: crs }, { data: refs }] = await Promise.all([
      supabase
        .from("institutes")
        .select("id, name, slug, city, institute_type, last_seo_refresh")
        .order("name", { ascending: true })
        .limit(2000),
      supabase
        .from("courses")
        .select("id, name, slug, institute_id, fees")
        .order("name", { ascending: true })
        .limit(5000),
      supabase
        .from("content_refreshes")
        .select("entity_id")
        .eq("status", "pending"),
    ]);
    setInstitutes((insts as any) || []);
    const grouped: Record<string, CourseRow[]> = {};
    ((crs as any) || []).forEach((c: CourseRow) => {
      if (!c.institute_id) return;
      (grouped[c.institute_id] ||= []).push(c);
    });
    setCoursesByInst(grouped);

    const counts: Record<string, number> = {};
    ((refs as any) || []).forEach((r: any) => {
      counts[r.entity_id] = (counts[r.entity_id] || 0) + 1;
    });
    setPendingByEntity(counts);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return institutes.filter(i => {
      if (tab !== "all" && (i.institute_type || "city") !== tab) return false;
      if (!q) return true;
      return (
        i.name?.toLowerCase().includes(q) ||
        i.slug?.toLowerCase().includes(q) ||
        i.city?.toLowerCase().includes(q)
      );
    });
  }, [institutes, search, tab]);

  const totalCourses = useMemo(
    () => Object.values(coursesByInst).reduce((a, b) => a + b.length, 0),
    [coursesByInst]
  );

  const queueRefresh = async (
    entityType: "institute" | "course",
    entityId: string,
    mode: Mode,
    userId?: string
  ) => {
    const { error } = await supabase.functions.invoke("refresh-content", {
      body: { entity_type: entityType, entity_id: entityId, mode, requested_by: userId },
    });
    if (error) throw new Error(error.message);
  };

  const refreshInstitute = async (inst: InstituteRow, mode: Mode) => {
    const courses = coursesByInst[inst.id] || [];
    const items: { type: "institute" | "course"; id: string; name: string }[] = [
      { type: "institute", id: inst.id, name: inst.name },
      ...courses.map(c => ({ type: "course" as const, id: c.id, name: c.name })),
    ];
    const status: LiveStatus = { ...empty, total: items.length, errors: [] };
    setRunning(prev => ({ ...prev, [inst.id]: { mode, status } }));
    const { data: { user } } = await supabase.auth.getUser();
    let succeeded = 0, failed = 0;
    for (const it of items) {
      setRunning(prev => ({
        ...prev,
        [inst.id]: { mode, status: { ...status, current: it.name, done: succeeded + failed } },
      }));
      try {
        await queueRefresh(it.type, it.id, mode, user?.id);
        succeeded++;
      } catch (e) {
        failed++;
        status.errors.push({ name: `${it.type}: ${it.name}`, error: e instanceof Error ? e.message : "Unknown" });
      }
    }
    const finalStatus: LiveStatus = {
      ...status, done: items.length, succeeded, failed, current: undefined,
    };
    setRunning(prev => ({ ...prev, [inst.id]: { mode, status: finalStatus } }));
    toast({
      title: `${mode === "full" ? "Content" : "SEO"} refresh queued`,
      description: `${succeeded}/${items.length} proposals queued for ${inst.name}. Review them in the Approval Queue.`,
    });
    load();
  };

  const refreshAllVisible = async (mode: Mode) => {
    if (!filtered.length) return;
    const totalUnits = filtered.reduce((sum, i) => sum + 1 + (coursesByInst[i.id]?.length || 0), 0);
    if (!confirm(
      `Queue ${mode === "full" ? "FULL CONTENT REFRESH" : "ADVANCED SEO REFRESH"} for ALL ${filtered.length} visible coaching institutes (${totalUnits} total items including their courses)?\n\n` +
      `Nothing goes live until you approve each proposal in the queue.`
    )) return;

    const { data: { user } } = await supabase.auth.getUser();
    const status: LiveStatus = { ...empty, total: totalUnits, errors: [] };
    setGlobalRunning({ mode, status });
    let succeeded = 0, failed = 0, done = 0;
    for (const inst of filtered) {
      const courses = coursesByInst[inst.id] || [];
      const items: { type: "institute" | "course"; id: string; name: string }[] = [
        { type: "institute", id: inst.id, name: inst.name },
        ...courses.map(c => ({ type: "course" as const, id: c.id, name: c.name })),
      ];
      for (const it of items) {
        setGlobalRunning({ mode, status: { ...status, succeeded, failed, done, current: `${inst.name} → ${it.name}` } });
        try { await queueRefresh(it.type, it.id, mode, user?.id); succeeded++; }
        catch (e) { failed++; status.errors.push({ name: `${inst.name} → ${it.name}`, error: e instanceof Error ? e.message : "Unknown" }); }
        done++;
      }
    }
    setGlobalRunning({ mode, status: { ...status, done, succeeded, failed, current: undefined } });
    toast({
      title: "All-coaching refresh queued",
      description: `${succeeded}/${totalUnits} proposals queued. Open the Approval Queue to review.`,
    });
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-sky-600" /> Coaching Refresh Hub
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            One click refreshes a coaching institute <strong>and every course</strong> it offers — fees,
            new batches, dates, eligibility — using AI. Same one-click power for advanced SEO
            (meta title, description, keywords, H1). Every change waits for your approval before going live.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate("/admin/coaching-seo-reports")} className="gap-2">
            <Sparkles className="w-4 h-4" /> Detailed SEO Reports
          </Button>
          <Button variant="outline" onClick={() => navigate("/admin/content-studio")} className="gap-2">
            <ClipboardList className="w-4 h-4" /> Approval Queue
          </Button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Coaching institutes</div>
          <div className="text-2xl font-bold">{institutes.length}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Courses tracked</div>
          <div className="text-2xl font-bold">{totalCourses}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Pending in queue</div>
          <div className="text-2xl font-bold text-amber-600">
            {Object.values(pendingByEntity).reduce((a, b) => a + b, 0)}
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Filtered now</div>
          <div className="text-2xl font-bold">{filtered.length}</div>
        </CardContent></Card>
      </div>

      {/* Master one-click bar */}
      <Card className="border-sky-200 bg-gradient-to-br from-sky-50/60 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-sky-600" /> One-click for everything visible
          </CardTitle>
          <CardDescription>
            Runs across the {filtered.length} coaching institutes shown below + every course they offer. Sends proposals to the queue — nothing goes live without your approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => refreshAllVisible("full")}
              disabled={!!globalRunning || loading}
              className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            >
              {globalRunning?.mode === "full"
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <RefreshCw className="w-4 h-4" />}
              Refresh All Content (institutes + courses)
            </Button>
            <Button
              onClick={() => refreshAllVisible("smart")}
              disabled={!!globalRunning || loading}
              className="bg-violet-600 hover:bg-violet-700 gap-2"
            >
              {globalRunning?.mode === "smart"
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Sparkles className="w-4 h-4" />}
              Advanced SEO Refresh (per institute + per course)
            </Button>
          </div>

          {globalRunning && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">
                  {globalRunning.status.done}/{globalRunning.status.total}
                  {globalRunning.status.current && <> — currently: <span className="text-sky-700">{globalRunning.status.current}</span></>}
                </span>
                <span className="flex gap-3">
                  <span className="text-emerald-700">✓ {globalRunning.status.succeeded}</span>
                  {globalRunning.status.failed > 0 && <span className="text-red-700">✗ {globalRunning.status.failed}</span>}
                </span>
              </div>
              <Progress value={globalRunning.status.total ? (globalRunning.status.done / globalRunning.status.total) * 100 : 0} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="city">City coachings</TabsTrigger>
                <TabsTrigger value="hybrid">Hybrid / Online</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, slug or city…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Reload
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Per-institute list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Per-institute control</CardTitle>
          <CardDescription>Expand any institute to see its courses and trigger refresh just for that one.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">No coaching institutes match your filters.</div>
          ) : (
            <Accordion type="multiple" className="divide-y">
              {filtered.map(inst => {
                const courses = coursesByInst[inst.id] || [];
                const live = running[inst.id];
                const pending = pendingByEntity[inst.id] || 0;
                const ageDays = inst.last_seo_refresh
                  ? Math.floor((Date.now() - new Date(inst.last_seo_refresh).getTime()) / 86400000)
                  : null;
                return (
                  <AccordionItem value={inst.id} key={inst.id} className="border-0">
                    <div className="flex items-center gap-3 py-2">
                      <AccordionTrigger className="flex-1 hover:no-underline py-2">
                        <div className="flex items-center gap-3 text-left">
                          <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
                          <div>
                            <div className="font-medium flex items-center gap-2 flex-wrap">
                              {inst.name}
                              <Badge variant="outline" className="text-[10px]">
                                {inst.institute_type || "city"}
                              </Badge>
                              {courses.length > 0 && (
                                <Badge variant="secondary" className="text-[10px] gap-1">
                                  <BookOpen className="w-3 h-3" /> {courses.length} courses
                                </Badge>
                              )}
                              {pending > 0 && (
                                <Badge className="text-[10px] bg-amber-500 hover:bg-amber-500">
                                  {pending} pending
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {inst.city || "—"} • <span className="font-mono">/{inst.slug}</span>
                              {inst.last_seo_refresh && (
                                <> • last refreshed {formatDistanceToNow(new Date(inst.last_seo_refresh))} ago</>
                              )}
                              {!inst.last_seo_refresh && <> • <span className="text-amber-600">never refreshed</span></>}
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <div className="flex flex-wrap gap-2 pr-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 gap-1.5"
                          disabled={!!live}
                          onClick={() => refreshInstitute(inst, "full")}
                        >
                          {live?.mode === "full" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          Refresh content
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-violet-300 text-violet-700 hover:bg-violet-50 gap-1.5"
                          disabled={!!live}
                          onClick={() => refreshInstitute(inst, "smart")}
                        >
                          {live?.mode === "smart" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                          Advanced SEO
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-sky-300 text-sky-700 hover:bg-sky-50 gap-1.5"
                          onClick={() => navigate(`/admin/coaching-seo-reports?institute=${inst.id}`)}
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Detailed SEO Report
                        </Button>
                        <Button asChild size="sm" variant="ghost" className="gap-1">
                          <Link to={`/institute/${inst.slug}`} target="_blank">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                    <AccordionContent>
                      {live && (
                        <div className="space-y-2 pb-3 px-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium">
                              {live.status.done}/{live.status.total}
                              {live.status.current && <> — <span className="text-sky-700">{live.status.current}</span></>}
                            </span>
                            <span className="flex gap-3">
                              <span className="text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {live.status.succeeded}</span>
                              {live.status.failed > 0 && <span className="text-red-700 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {live.status.failed}</span>}
                            </span>
                          </div>
                          <Progress value={live.status.total ? (live.status.done / live.status.total) * 100 : 0} className="h-1.5" />
                        </div>
                      )}

                      {courses.length === 0 ? (
                        <div className="text-xs text-muted-foreground px-2 pb-3">No courses yet for this institute.</div>
                      ) : (
                        <div className="rounded-md border bg-muted/20 divide-y">
                          {courses.map(c => (
                            <div key={c.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                              <div className="min-w-0">
                                <div className="font-medium truncate">{c.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {c.fees ? `₹${c.fees.toLocaleString("en-IN")}` : "Fees not set"}
                                  {c.slug && <> • <span className="font-mono">/{c.slug}</span></>}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground text-center pt-2">
        Tip: every refresh proposal lands in the <button className="underline" onClick={() => navigate("/admin/content-studio")}>Approval Queue</button> with a side-by-side diff. Approve only the rows you trust — the rest stay parked.
      </div>
    </div>
  );
};

export default AdminCoachingRefreshHub;
