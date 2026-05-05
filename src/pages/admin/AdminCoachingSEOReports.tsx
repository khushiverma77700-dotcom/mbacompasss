import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
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
  FileText, Loader2, Building2, BookOpen, ExternalLink, ArrowLeft,
  CheckCircle2, AlertCircle, Search, Download, Sparkles, RefreshCw, ChevronRight, Wand2,
} from "lucide-react";
import { buildStoredSeoSnapshot, saveSeoSnapshot } from "@/lib/seoAutomation";

/* ============================================================
   Coaching Detailed SEO Reports
   ------------------------------------------------------------
   For each coaching: 1 full SEO audit PER page (institute + every
   course). If a coaching has 10 pages, you get 10 detailed reports —
   each with score, meta, keyword buckets, technical issues, schema,
   competitor insights, etc.
   ============================================================ */

type InstituteRow = {
  id: string;
  name: string;
  slug: string | null;
  city: string | null;
  institute_type: "city" | "hybrid" | null;
};

type CourseRow = {
  id: string;
  name: string;
  slug: string | null;
  institute_id: string;
};

type PageItem = {
  type: "institute" | "course";
  id: string;
  name: string;
  slug: string | null;
  url: string;
};

type Report = {
  status: "idle" | "running" | "done" | "error";
  data?: any;            // suggestions
  assembled?: any;
  competitors?: any[];
  error?: string;
  applyStatus?: "idle" | "applying" | "applied" | "error";
  applyError?: string;
};

const AdminCoachingSEOReports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const focusInstituteId = params.get("institute");

  const [institutes, setInstitutes] = useState<InstituteRow[]>([]);
  const [coursesByInst, setCoursesByInst] = useState<Record<string, CourseRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "city" | "hybrid">("all");

  // reports[`${instituteId}:${pageKey}`] => Report
  const [reports, setReports] = useState<Record<string, Report>>({});
  const [runningInst, setRunningInst] = useState<string | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  const [withCompetitors, setWithCompetitors] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: insts }, { data: crs }] = await Promise.all([
      supabase.from("institutes")
        .select("id, name, slug, city, institute_type")
        .order("name").limit(2000),
      supabase.from("courses")
        .select("id, name, slug, institute_id")
        .order("name").limit(5000),
    ]);
    setInstitutes((insts as any) || []);
    const grouped: Record<string, CourseRow[]> = {};
    ((crs as any) || []).forEach((c: CourseRow) => {
      if (!c.institute_id) return;
      (grouped[c.institute_id] ||= []).push(c);
    });
    setCoursesByInst(grouped);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return institutes.filter(i => {
      if (tab !== "all" && (i.institute_type || "city") !== tab) return false;
      if (!q) return true;
      return i.name?.toLowerCase().includes(q)
        || i.slug?.toLowerCase().includes(q)
        || i.city?.toLowerCase().includes(q);
    });
  }, [institutes, search, tab]);

  const buildPages = (inst: InstituteRow): PageItem[] => {
    const courses = coursesByInst[inst.id] || [];
    return [
      {
        type: "institute", id: inst.id, name: inst.name, slug: inst.slug,
        url: `https://mbacompass.in/institute/${inst.slug}`,
      },
      ...courses.map<PageItem>(c => ({
        type: "course", id: c.id, name: c.name, slug: c.slug,
        url: `https://mbacompass.in/institute/${inst.slug}/course/${c.slug}`,
      })),
    ];
  };

  const reportKey = (instId: string, p: PageItem) => `${instId}:${p.type}:${p.id}`;

  const runOne = async (instId: string, p: PageItem) => {
    const key = reportKey(instId, p);
    setReports(prev => ({ ...prev, [key]: { status: "running" } }));
    try {
      const { data, error } = await supabase.functions.invoke("full-page-seo-audit", {
        body: { contentType: p.type, recordId: p.id, runCompetitorScan: withCompetitors },
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.error || "Audit failed");
      setReports(prev => ({
        ...prev,
        [key]: { status: "done", data: data.suggestions, assembled: data.assembled, competitors: data.competitors || [] },
      }));
    } catch (e) {
      setReports(prev => ({
        ...prev,
        [key]: { status: "error", error: e instanceof Error ? e.message : "Unknown error" },
      }));
    }
  };

  const runAllForInstitute = async (inst: InstituteRow) => {
    const pages = buildPages(inst);
    setRunningInst(inst.id);
    setBatchProgress({ done: 0, total: pages.length });
    let done = 0;
    for (const p of pages) {
      await runOne(inst.id, p);
      done++;
      setBatchProgress({ done, total: pages.length });
    }
    setRunningInst(null);
    setBatchProgress(null);
    toast({
      title: `${pages.length} SEO reports ready`,
      description: `Generated detailed reports for ${inst.name} and its ${pages.length - 1} course page${pages.length - 1 === 1 ? "" : "s"}.`,
    });
  };

  const applyFix = async (instId: string, p: PageItem) => {
    const key = reportKey(instId, p);
    const r = reports[key];
    if (!r?.data) return;
    setReports(prev => ({ ...prev, [key]: { ...prev[key]!, applyStatus: "applying", applyError: undefined } }));
    try {
      const s = r.data;
      const allKw: string[] = Array.from(new Set([
        ...(s.keywords?.primary || []),
        ...(s.keywords?.shortTail || []),
        ...(s.keywords?.longTail || []),
        ...(s.keywords?.lsi || []),
      ].filter(Boolean)));

      if (p.type === "institute") {
        const { error } = await supabase.from("institutes").update({
          meta_title: s.meta_title || null,
          meta_description: s.meta_description || null,
          h1_tag: s.h1_tag || null,
          keywords: allKw.length ? allKw : null,
          last_seo_refresh: new Date().toISOString(),
        }).eq("id", p.id);
        if (error) throw error;
      }

      const inst = institutes.find(i => i.id === instId);
      const item: Record<string, any> = p.type === "institute"
        ? { id: p.id, slug: p.slug }
        : { id: p.id, slug: p.slug, _institute_slug: inst?.slug };
      const snap = buildStoredSeoSnapshot(p.type, item, s);
      await saveSeoSnapshot(snap);

      setReports(prev => ({ ...prev, [key]: { ...prev[key]!, applyStatus: "applied" } }));
    } catch (e) {
      setReports(prev => ({
        ...prev,
        [key]: { ...prev[key]!, applyStatus: "error", applyError: e instanceof Error ? e.message : "Unknown" },
      }));
      toast({ title: "Apply failed", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" });
    }
  };

  const applyAllForInstitute = async (inst: InstituteRow) => {
    const pages = buildPages(inst);
    const ready = pages.filter(p => reports[reportKey(inst.id, p)]?.status === "done");
    if (!ready.length) {
      toast({ title: "Nothing to apply", description: "Generate reports first." });
      return;
    }
    if (!confirm(`Apply AI SEO fixes to ${ready.length} page${ready.length === 1 ? "" : "s"} of ${inst.name}?\n\nThis updates meta title, description, H1 and keywords live.`)) return;
    for (const p of ready) await applyFix(inst.id, p);
    toast({ title: "SEO fixes applied", description: `${ready.length} page${ready.length === 1 ? "" : "s"} updated for ${inst.name}.` });
  };

  const downloadJson = (inst: InstituteRow) => {
    const pages = buildPages(inst);
    const payload = pages.map(p => {
      const r = reports[reportKey(inst.id, p)];
      return {
        page_type: p.type,
        name: p.name,
        url: p.url,
        status: r?.status || "idle",
        report: r?.data || null,
        assembled: r?.assembled || null,
        competitors: r?.competitors || [],
      };
    });
    const blob = new Blob([JSON.stringify({ institute: inst, pages: payload }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seo-reports-${inst.slug || inst.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Auto-focus an institute if linked from hub
  useEffect(() => {
    if (focusInstituteId && institutes.length > 0) {
      const el = document.getElementById(`inst-${focusInstituteId}`);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [focusInstituteId, institutes.length]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2 gap-1">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-sky-600" /> Detailed SEO Reports — Coachings
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
            Generates one <strong>full SEO audit per page</strong> — institute page + every course page separately.
            10-page coaching = 10 detailed reports with score, meta, keyword buckets, technical issues,
            schema markup, competitor insights and content gaps.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate("/admin/coaching-refresh-hub")} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Coaching Refresh Hub
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="city">City</TabsTrigger>
                <TabsTrigger value="hybrid">Hybrid</TabsTrigger>
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
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={withCompetitors}
                onChange={(e) => setWithCompetitors(e.target.checked)}
              />
              Include live competitor scan
            </label>
            <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Reload
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {filtered.map(inst => {
            const pages = buildPages(inst);
            const myReports = pages.map(p => reports[reportKey(inst.id, p)]).filter(Boolean);
            const doneCount = myReports.filter(r => r.status === "done").length;
            const errorCount = myReports.filter(r => r.status === "error").length;
            const isBusy = runningInst === inst.id;
            return (
              <AccordionItem key={inst.id} value={inst.id} id={`inst-${inst.id}`} className="border rounded-lg bg-card">
                <div className="flex items-center gap-3 px-3 py-2">
                  <AccordionTrigger className="flex-1 hover:no-underline py-2">
                    <div className="flex items-center gap-3 text-left">
                      <Building2 className="w-4 h-4 text-sky-600 shrink-0" />
                      <div>
                        <div className="font-medium flex items-center gap-2 flex-wrap">
                          {inst.name}
                          <Badge variant="outline" className="text-[10px]">{inst.institute_type || "city"}</Badge>
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <BookOpen className="w-3 h-3" /> {pages.length} pages
                          </Badge>
                          {doneCount > 0 && (
                            <Badge className="text-[10px] bg-emerald-600 hover:bg-emerald-600">
                              {doneCount}/{pages.length} reports
                            </Badge>
                          )}
                          {errorCount > 0 && (
                            <Badge variant="destructive" className="text-[10px]">{errorCount} failed</Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {inst.city || "—"} • <span className="font-mono">/{inst.slug}</span>
                        </div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <div className="flex flex-wrap gap-2 pr-2">
                    <Button
                      size="sm"
                      className="bg-sky-600 hover:bg-sky-700 gap-1.5"
                      disabled={isBusy}
                      onClick={(e) => { e.stopPropagation(); runAllForInstitute(inst); }}
                    >
                      {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      Generate {pages.length} Reports
                    </Button>
                    {doneCount > 0 && (
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                        onClick={(e) => { e.stopPropagation(); applyAllForInstitute(inst); }}
                      >
                        <Wand2 className="w-3.5 h-3.5" /> Apply All Fixes ({doneCount})
                      </Button>
                    )}
                    {doneCount > 0 && (
                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); downloadJson(inst); }} className="gap-1.5">
                        <Download className="w-3.5 h-3.5" /> Export
                      </Button>
                    )}
                  </div>
                </div>

                {isBusy && batchProgress && (
                  <div className="px-4 pb-2 space-y-1">
                    <div className="text-xs text-muted-foreground">
                      Generating {batchProgress.done}/{batchProgress.total} reports…
                    </div>
                    <Progress value={(batchProgress.done / batchProgress.total) * 100} className="h-1.5" />
                  </div>
                )}

                <AccordionContent className="px-4 pb-4 space-y-3">
                  {pages.map(p => {
                    const r = reports[reportKey(inst.id, p)];
                    return (
                      <PageReportCard
                        key={p.id}
                        page={p}
                        report={r}
                        onRun={() => runOne(inst.id, p)}
                        onApply={() => applyFix(inst.id, p)}
                        disabled={isBusy}
                      />
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
};

/* ─────────── Single page report card ─────────── */

const scoreColor = (n?: number) => {
  if (n == null) return "text-muted-foreground";
  if (n >= 80) return "text-emerald-600";
  if (n >= 60) return "text-amber-600";
  return "text-red-600";
};

const PageReportCard = ({
  page, report, onRun, onApply, disabled,
}: { page: PageItem; report?: Report; onRun: () => void; onApply: () => void; disabled?: boolean }) => {
  const [open, setOpen] = useState(false);
  const s = report?.data;
  const a = report?.assembled;
  const overall = s?.seoScore?.overall;
  const projected = s?.seoScore?.projectedScore;

  return (
    <Card className="border-muted">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">
                {page.type === "institute" ? "Institute page" : "Course page"}
              </Badge>
              <span className="truncate">{page.name}</span>
            </CardTitle>
            <CardDescription className="text-xs flex items-center gap-2 mt-1">
              <a href={page.url} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline inline-flex items-center gap-1">
                {page.url} <ExternalLink className="w-3 h-3" />
              </a>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {report?.status === "done" && (
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">SEO score</div>
                <div className={`text-2xl font-bold leading-none ${scoreColor(overall)}`}>
                  {overall ?? "—"}<span className="text-xs text-muted-foreground">/100</span>
                </div>
                {projected != null && (
                  <div className="text-[10px] text-emerald-700">→ {projected} after fixes</div>
                )}
              </div>
            )}
            <Button
              size="sm"
              variant={report?.status === "done" ? "outline" : "default"}
              disabled={disabled || report?.status === "running"}
              onClick={onRun}
              className="gap-1.5"
            >
              {report?.status === "running" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {report?.status === "done" ? "Re-run" : "Generate report"}
            </Button>
            {report?.status === "done" && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                disabled={report?.applyStatus === "applying"}
                onClick={onApply}
              >
                {report?.applyStatus === "applying" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                 report?.applyStatus === "applied" ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                 <Wand2 className="w-3.5 h-3.5" />}
                {report?.applyStatus === "applied" ? "Applied" : report?.applyStatus === "applying" ? "Applying…" : "Apply Fix"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {report?.status === "error" && (
        <CardContent className="pt-0">
          <div className="text-xs rounded border border-red-200 bg-red-50/60 text-red-800 p-2 flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <div><strong>Failed:</strong> {report.error}</div>
          </div>
        </CardContent>
      )}

      {report?.status === "done" && s && (
        <CardContent className="pt-0 space-y-3">
          {/* Score breakdown */}
          {s.seoScore?.breakdown && (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center">
              {Object.entries<any>(s.seoScore.breakdown).map(([k, v]) => (
                <div key={k} className="rounded border bg-muted/30 p-2">
                  <div className="text-[10px] text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}</div>
                  <div className={`text-lg font-bold ${scoreColor(v)}`}>{v}</div>
                </div>
              ))}
            </div>
          )}

          {/* Meta */}
          <div className="rounded border p-3 bg-muted/20 space-y-2 text-sm">
            <div><span className="text-xs text-muted-foreground">Meta title ({s.meta_title?.length || 0}/60): </span><span className="font-medium">{s.meta_title}</span></div>
            <div><span className="text-xs text-muted-foreground">Meta description ({s.meta_description?.length || 0}/160): </span><span>{s.meta_description}</span></div>
            <div><span className="text-xs text-muted-foreground">H1: </span><span className="font-medium">{s.h1_tag}</span></div>
            <div><span className="text-xs text-muted-foreground">Primary keyword: </span><Badge variant="secondary">{s.primary_keyword}</Badge></div>
          </div>

          <Button variant="ghost" size="sm" onClick={() => setOpen(o => !o)} className="gap-1 -ml-2">
            <ChevronRight className={`w-4 h-4 transition-transform ${open ? "rotate-90" : ""}`} />
            {open ? "Hide" : "Show"} full report
          </Button>

          {open && (
            <div className="space-y-3 text-sm">
              {/* Critical / warnings / passed */}
              {s.seoScore?.criticalIssues?.length > 0 && (
                <Section title="Critical issues" tone="red">
                  <ul className="list-disc pl-5 space-y-0.5">
                    {s.seoScore.criticalIssues.map((x: string, i: number) => <li key={i}>{x}</li>)}
                  </ul>
                </Section>
              )}
              {s.seoScore?.warnings?.length > 0 && (
                <Section title="Warnings" tone="amber">
                  <ul className="list-disc pl-5 space-y-0.5">
                    {s.seoScore.warnings.map((x: string, i: number) => <li key={i}>{x}</li>)}
                  </ul>
                </Section>
              )}
              {s.seoScore?.passed?.length > 0 && (
                <Section title="Passed checks" tone="emerald">
                  <ul className="list-disc pl-5 space-y-0.5">
                    {s.seoScore.passed.map((x: string, i: number) => <li key={i}>{x}</li>)}
                  </ul>
                </Section>
              )}

              {/* Keyword buckets */}
              {s.keywords && (
                <Section title="Keywords">
                  {Object.entries<any>(s.keywords).map(([bucket, arr]) => (
                    <div key={bucket} className="mb-2">
                      <div className="text-xs font-semibold capitalize text-muted-foreground mb-1">{bucket}</div>
                      <div className="flex flex-wrap gap-1">
                        {(arr || []).map((k: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{k}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </Section>
              )}

              {s.onPageTips?.length > 0 && (
                <Section title="On-page tips">
                  <ul className="list-disc pl-5 space-y-0.5">
                    {s.onPageTips.map((x: string, i: number) => <li key={i}>{x}</li>)}
                  </ul>
                </Section>
              )}

              {s.technicalSEO && (
                <Section title="Technical SEO">
                  <div className="space-y-2">
                    {s.technicalSEO.contentLengthAnalysis && (
                      <div className="text-xs">
                        Word count: <strong>{s.technicalSEO.contentLengthAnalysis.currentWordCount}</strong> /
                        recommended ≥{s.technicalSEO.contentLengthAnalysis.recommendedMinimum}.
                        <em> {s.technicalSEO.contentLengthAnalysis.verdict}</em>
                      </div>
                    )}
                    {s.technicalSEO.pagespeedTips?.length > 0 && (
                      <div><div className="text-xs font-semibold mt-2">Pagespeed</div><ul className="list-disc pl-5">{s.technicalSEO.pagespeedTips.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></div>
                    )}
                    {s.technicalSEO.mobileTips?.length > 0 && (
                      <div><div className="text-xs font-semibold mt-2">Mobile</div><ul className="list-disc pl-5">{s.technicalSEO.mobileTips.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></div>
                    )}
                    {s.technicalSEO.imageAltTags?.length > 0 && (
                      <div><div className="text-xs font-semibold mt-2">Image alt suggestions</div><ul className="list-disc pl-5">{s.technicalSEO.imageAltTags.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></div>
                    )}
                    {s.technicalSEO.backlinkIdeas?.length > 0 && (
                      <div><div className="text-xs font-semibold mt-2">Backlink ideas</div><ul className="list-disc pl-5">{s.technicalSEO.backlinkIdeas.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></div>
                    )}
                  </div>
                </Section>
              )}

              {s.socialMeta && (
                <Section title="Social meta (OG / Twitter)">
                  <div className="text-xs space-y-1">
                    <div><strong>OG title:</strong> {s.socialMeta.ogTitle}</div>
                    <div><strong>OG description:</strong> {s.socialMeta.ogDescription}</div>
                    <div><strong>Twitter title:</strong> {s.socialMeta.twitterTitle}</div>
                    <div><strong>Twitter description:</strong> {s.socialMeta.twitterDescription}</div>
                  </div>
                </Section>
              )}

              {s.internalLinks?.suggested?.length > 0 && (
                <Section title="Internal links to add">
                  <ul className="list-disc pl-5 space-y-0.5">
                    {s.internalLinks.suggested.map((x: string, i: number) => <li key={i}>{x}{s.internalLinks.anchorTexts?.[i] ? ` — anchor: "${s.internalLinks.anchorTexts[i]}"` : ""}</li>)}
                  </ul>
                </Section>
              )}

              {s.contentSuggestions?.length > 0 && (
                <Section title="Content gaps & suggestions">
                  <ul className="list-disc pl-5 space-y-0.5">
                    {s.contentSuggestions.map((x: string, i: number) => <li key={i}>{x}</li>)}
                  </ul>
                </Section>
              )}

              {s.competitorInsights?.length > 0 && (
                <Section title="Competitor insights">
                  <ul className="list-disc pl-5 space-y-0.5">
                    {s.competitorInsights.map((x: string, i: number) => <li key={i}>{x}</li>)}
                  </ul>
                </Section>
              )}

              {report.competitors && report.competitors.length > 0 && (
                <Section title="Top competing pages (live)">
                  <ul className="space-y-1.5 text-xs">
                    {report.competitors.map((c: any, i: number) => (
                      <li key={i}>
                        <a href={c.url} target="_blank" rel="noreferrer" className="text-sky-700 hover:underline font-medium">{c.title}</a>
                        <div className="text-muted-foreground">{c.snippet}</div>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}

              {s.schemaMarkup?.length > 0 && (
                <Section title="Schema markup (JSON-LD)">
                  <pre className="text-[10px] bg-slate-900 text-slate-100 p-2 rounded overflow-auto max-h-64">
{JSON.stringify(s.schemaMarkup, null, 2)}
                  </pre>
                </Section>
              )}

              {a && (
                <div className="text-[10px] text-muted-foreground border-t pt-2">
                  Assembled {a.wordCount} words • {a.imageCount} images ({a.imagesMissingAlt} missing alt) •
                  {a.sectionsCount != null && ` ${a.sectionsCount} sections •`}
                  {a.coursesCount != null && ` ${a.coursesCount} courses •`}
                  {a.facultyCount != null && ` ${a.facultyCount} faculty`}
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};

const Section = ({ title, children, tone }: { title: string; children: React.ReactNode; tone?: "red" | "amber" | "emerald" }) => {
  const toneClass = tone === "red" ? "border-red-200 bg-red-50/40"
    : tone === "amber" ? "border-amber-200 bg-amber-50/40"
    : tone === "emerald" ? "border-emerald-200 bg-emerald-50/40"
    : "border-muted";
  return (
    <div className={`rounded border ${toneClass} p-3`}>
      <div className="text-xs font-semibold mb-1.5 flex items-center gap-1.5">
        {tone === "red" && <AlertCircle className="w-3.5 h-3.5 text-red-600" />}
        {tone === "emerald" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
        {title}
      </div>
      <div className="text-xs">{children}</div>
    </div>
  );
};

export default AdminCoachingSEOReports;
