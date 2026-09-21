import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Sparkles, X, Plus, AlertCircle, FileText, Link2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AIGenerationProgress, { type ProgressStep } from "@/components/admin/AIGenerationProgress";
import SeoLengthHint from "@/components/admin/SeoLengthHint";

const CATEGORIES = ["news", "exam-tips", "career", "success-stories", "reviews", "college-news", "coaching", "gd-pi", "placements", "scholarships"];

const BLOG_STEPS: { key: string; label: string }[] = [
  { key: "brief", label: "Validating brief" },
  { key: "research", label: "Researching topic" },
  { key: "draft", label: "Writing article" },
  { key: "save", label: "Saving as draft" },
  { key: "faqs", label: "Injecting FAQ schema" },
  { key: "validate", label: "Pre-publish checks" },
];

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

const STORAGE_KEY = "ai_blog_brief_draft";

const TOOL_URLS: { url: string; label: string }[] = [
  { url: "/mba-compass", label: "MBA Compass" },
  { url: "/college-shortlister", label: "College Shortlister" },
  { url: "/profile-analyzer", label: "Profile Analyzer" },
  { url: "/mba-roi-calculator", label: "MBA ROI Calculator" },
  { url: "/compare", label: "Compare Colleges" },
  { url: "/mocks", label: "Mock Tests" },
  { url: "/ai-coaching-finder", label: "AI Coaching Finder" },
  { url: "/courses", label: "Courses" },
];

type LinkOption = { url: string; label: string };
type FactCheckReportItem = {
  field?: string;
  severity?: "warn" | "error";
  rule?: string;
  matchedText?: string;
  message?: string;
  autoFixed?: boolean;
};

const AdminWriteBlog = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const seed = useMemo(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      title: params.get("title") || "",
      slug: params.get("slug") || "",
      targetKeyword: params.get("keyword") || "",
      metaTitle: params.get("metaTitle") || "",
      metaDescription: params.get("metaDesc") || "",
      category: params.get("category") || "news",
      secondaryKeywords: [] as string[],
    };
  }, [params]);

  const [title, setTitle] = useState<string>(seed.title || "");
  const [slug, setSlug] = useState<string>(seed.slug || (seed.title ? slugify(seed.title) : ""));
  const [targetKeyword, setTargetKeyword] = useState<string>(seed.targetKeyword || "");
  const [metaTitle, setMetaTitle] = useState<string>(seed.metaTitle || "");
  const [metaDescription, setMetaDescription] = useState<string>(seed.metaDescription || "");
  const [category, setCategory] = useState<string>(seed.category || "news");
  const [secondaryKws, setSecondaryKws] = useState<string[]>(seed.secondaryKeywords || []);
  const [secInput, setSecInput] = useState("");
  const [referenceUrls, setReferenceUrls] = useState<string[]>(seed.referenceUrls || []);
  const [refInput, setRefInput] = useState("");
  const buildLatestDateContext = () => {
    const y = new Date().getFullYear();
    return `Use ONLY the most recent verified data: ${y}-${y + 1} admission cycle, ${y - 1}-${y} placement reports. All dates, exam cycles, fees, cutoffs and statistics MUST reflect the latest published year. Do NOT use outdated 2020-2023 figures unless explicitly historical context.`;
  };
  const [contentDateContext, setContentDateContext] = useState<string>(buildLatestDateContext());
  const [wordMin, setWordMin] = useState(2500);
  const [wordMax, setWordMax] = useState(3500);
  const [densityPct, setDensityPct] = useState(2);

  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [progressCurrent, setProgressCurrent] = useState<string>("");

  // Internal-link pool
  const [colleges, setColleges] = useState<LinkOption[]>([]);
  const [exams, setExams] = useState<LinkOption[]>([]);
  const [articles, setArticles] = useState<LinkOption[]>([]);
  const [coachings, setCoachings] = useState<LinkOption[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Record<string, LinkOption>>(
    () => Object.fromEntries(TOOL_URLS.slice(0, 4).map(t => [t.url, t]))
  );
  const [linkSearch, setLinkSearch] = useState("");
  const [loadingLinks, setLoadingLinks] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoadingLinks(true);
      try {
        const [collRes, examRes, artRes, coachRes] = await Promise.all([
          supabase.from("colleges").select("name,slug").not("slug", "is", null).order("name").limit(300),
          supabase.from("exams").select("name,slug").not("slug", "is", null).order("name").limit(80),
          supabase.from("articles").select("title,slug").eq("published", true).order("created_at", { ascending: false }).limit(60),
          supabase.from("institutes").select("name,slug,institute_type").not("slug", "is", null).order("name").limit(200),
        ]);
        setColleges((collRes.data || []).filter((r: any) => r.slug && r.name).map((r: any) => ({ url: `/college/${r.slug}`, label: r.name })));
        setExams((examRes.data || []).filter((r: any) => r.slug && r.name).map((r: any) => ({ url: `/exams/${r.slug}`, label: r.name })));
        setArticles((artRes.data || []).filter((r: any) => r.slug && r.title).map((r: any) => ({ url: `/article/${r.slug}`, label: r.title })));
        setCoachings(
          (coachRes.data || [])
            .filter((r: any) => r.slug && r.name && (r.institute_type === "coaching" || /coaching/i.test(r.slug)))
            .map((r: any) => ({ url: `/coaching/${r.slug}`, label: r.name }))
        );
      } catch (e) {
        console.warn("Could not load link pool", e);
      } finally {
        setLoadingLinks(false);
      }
    };
    load();
  }, []);

  const setStep = (key: string, status: ProgressStep["status"], error?: string) =>
    setProgressSteps(prev => prev.map(s => s.key === key ? { ...s, status, error } : s));

  const [slugTouched, setSlugTouched] = useState<boolean>(Boolean(seed.slug));
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(title));
  }, [title, slugTouched]);

  const addSecKw = () => {
    const v = secInput.trim();
    if (v && !secondaryKws.includes(v)) setSecondaryKws([...secondaryKws, v]);
    setSecInput("");
  };
  const removeSecKw = (k: string) => setSecondaryKws(secondaryKws.filter(x => x !== k));

  const addReferenceUrls = () => {
    const raw = refInput.split(/[\s,]+/).map(v => v.trim()).filter(Boolean);
    if (raw.length === 0) return;
    const accepted: string[] = [];
    const rejected: string[] = [];
    raw.forEach((item) => {
      const candidate = /^https?:\/\//i.test(item) ? item : `https://${item}`;
      try {
        const u = new URL(candidate);
        if (!u.hostname.includes(".")) throw new Error("bad host");
        const clean = u.toString();
        if (!referenceUrls.includes(clean) && !accepted.includes(clean)) accepted.push(clean);
      } catch {
        rejected.push(item);
      }
    });
    if (accepted.length) setReferenceUrls([...referenceUrls, ...accepted].slice(0, 8));
    setRefInput("");
    if (rejected.length) {
      toast({
        title: "Some links were not added",
        description: `These do not look like web addresses: ${rejected.join(", ")}`,
        variant: "destructive",
      });
    }
  };
  const removeReferenceUrl = (u: string) => setReferenceUrls(referenceUrls.filter(x => x !== u));

  // Keep the brief (including reference links) across refreshes
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        title, slug, targetKeyword, metaTitle, metaDescription, category,
        secondaryKeywords: secondaryKws, referenceUrls,
      }));
    } catch { /* storage unavailable */ }
  }, [title, slug, targetKeyword, metaTitle, metaDescription, category, secondaryKws, referenceUrls]);

  const toggleUrl = (opt: LinkOption) => {
    setSelectedUrls(prev => {
      const next = { ...prev };
      if (next[opt.url]) delete next[opt.url];
      else next[opt.url] = opt;
      return next;
    });
  };

  const selectedCount = Object.keys(selectedUrls).length;

  const filterByQuery = (list: LinkOption[]) =>
    !linkSearch.trim() ? list : list.filter(o => o.label.toLowerCase().includes(linkSearch.toLowerCase()) || o.url.toLowerCase().includes(linkSearch.toLowerCase()));

  const selectAllVisible = (list: LinkOption[]) => {
    setSelectedUrls(prev => {
      const next = { ...prev };
      filterByQuery(list).forEach(o => { next[o.url] = o; });
      return next;
    });
  };

  const validate = () => {
    if (!title.trim()) return "Title is required";
    if (!slug.trim()) return "Slug is required";
    if (!targetKeyword.trim()) return "Target keyword is required";
    if (wordMin < 300) return "Min words must be at least 300";
    if (wordMax < wordMin) return "Max words must be greater than or equal to min words";
    if (densityPct < 0.5 || densityPct > 5) return "Keyword density should be between 0.5% and 5% (Google-safe range)";
    return null;
  };

  const handleGenerate = async () => {
    const err = validate();
    if (err) {
      toast({ title: "Please fix the brief", description: err, variant: "destructive" });
      return;
    }

    setGenerating(true);
    setErrorMsg(null);
    setStats(null);
    setProgressSteps(BLOG_STEPS.map(s => ({ ...s, status: "pending" })));
    setProgressCurrent(BLOG_STEPS[0].label);
    setStep("brief", "ok");

    try {
      setStep("research", "running");
      setStep("draft", "running");
      setStep("save", "running");
      setProgressCurrent("Researching, writing, and saving article");
      const { data, error } = await supabase.functions.invoke("ai-blog-writer", {
        body: {
          title: title.trim(),
          slug: slug.trim(),
          targetKeyword: targetKeyword.trim(),
          secondaryKeywords: secondaryKws,
          metaTitle: metaTitle.trim(),
          metaDescription: metaDescription.trim(),
          category,
          contentDateContext: contentDateContext.trim(),
          wordCountMin: wordMin,
          wordCountMax: wordMax,
          keywordDensityPct: densityPct,
          allowedInternalUrls: Object.values(selectedUrls),
          referenceUrls,
        },
      });

      if (error) { setStep("research", "fail", error.message); throw error; }
      if (data?.error) { setStep("research", "fail", data.error); throw new Error(data.error); }

      let finalData = data;
      if (data?.jobId && !data?.insertedId) {
        setProgressCurrent("AI writing in background");
        for (let attempt = 0; attempt < 900; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
          const { data: jobRes, error: jobErr } = await supabase.functions.invoke("ai-blog-writer", {
            body: { action: "status", jobId: data.jobId },
          });
          if (jobErr) throw jobErr;
          const job = jobRes?.job;
          if (job?.current_step) setProgressCurrent(job.current_step);
          if (job?.status === "completed") {
            finalData = { insertedId: job.article_id, stats: job.stats || {} };
            break;
          }
          if (job?.status === "failed") throw new Error(job.error_message || "Blog generation failed");
        }
      }

      if (!finalData?.insertedId) { setStep("save", "fail", "Article was not saved"); throw new Error("Generation is taking longer than expected. It will continue in the background; refresh this page in a few minutes."); }
      setStep("research", "ok");
      setStep("draft", "ok");
      setStep("save", "ok");
      setStep("faqs", "ok");
      setStep("validate", "ok");
      setProgressCurrent("");

      try { sessionStorage.removeItem(STORAGE_KEY); } catch {}

      toast({
        title: "Article generated!",
        description: `${finalData.stats?.actualWords ?? "~"} words. Saved successfully — open it in editor to review.`,
      });
      setStats({ ...(finalData.stats || {}), insertedId: finalData.insertedId });
    } catch (e: any) {
      console.error("AI blog generation failed", e);
      setErrorMsg(e?.message || "Generation failed");
      toast({ title: "Generation failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const renderLinkList = (list: LinkOption[], emptyMsg: string) => {
    const filtered = filterByQuery(list);
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{filtered.length} options · {Object.values(selectedUrls).filter(s => list.some(l => l.url === s.url)).length} selected</span>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => selectAllVisible(list)}>
            Select all visible
          </Button>
        </div>
        <ScrollArea className="h-64 rounded-md border bg-background">
          <div className="p-2 space-y-1">
            {filtered.length === 0 && <p className="text-xs text-muted-foreground p-3">{emptyMsg}</p>}
            {filtered.map(opt => (
              <label key={opt.url} className="flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60 cursor-pointer text-sm">
                <Checkbox checked={!!selectedUrls[opt.url]} onCheckedChange={() => toggleUrl(opt)} className="mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{opt.label}</p>
                  <p className="truncate text-xs text-muted-foreground font-mono">{opt.url}</p>
                </div>
              </label>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-6">
        <div className="flex items-start justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="text-right">
            <h1 className="text-3xl font-bold flex items-center gap-2 justify-end tracking-tight">
              <Sparkles className="h-7 w-7 text-primary" /> Write Blog via AI
            </h1>
            <p className="text-sm text-muted-foreground mt-1">SEO + GEO + AI-Search optimized · {wordMin}–{wordMax} words · text-only, uniform typography</p>
          </div>
        </div>
      </div>

      <Card className="shadow-xs">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Article Brief
          </CardTitle>
          <CardDescription>
            The AI will write a {wordMin}-{wordMax} word article with ~{densityPct}% keyword density.
            <strong className="block mt-0.5 text-foreground/80">No images will be inserted — typography stays uniform.</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Top 10 MBA Colleges in Bangalore 2026"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Slug</Label>
              <Input
                value={slug}
                onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }}
                placeholder="url-slug"
                className="font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Target Keyword (primary)</Label>
            <Input
              value={targetKeyword}
              onChange={(e) => setTargetKeyword(e.target.value)}
              placeholder="e.g. MBA colleges in Bangalore"
            />
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Reference Links (highest-priority sources)</Label>
            <p className="text-xs text-muted-foreground mb-1.5">
              Paste one or more web addresses (one per line). These pages are read first and every fact, number, date and ranking is taken from them before anything else. Extra sources are only searched if these pages do not cover the topic.
            </p>
            <div className="flex gap-2">
              <Textarea
                value={refInput}
                onChange={(e) => setRefInput(e.target.value)}
                onBlur={addReferenceUrls}
                rows={3}
                placeholder={"https://iimcat.ac.in/notification\nhttps://www.iima.ac.in/placement-report"}
              />
              <Button type="button" variant="outline" size="sm" onClick={addReferenceUrls}><Plus className="h-3 w-3" /></Button>
            </div>
            {referenceUrls.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {referenceUrls.map(u => (
                  <Badge key={u} variant="secondary" className="gap-1 text-xs max-w-full">
                    <Link2 className="h-3 w-3 shrink-0" />
                    <span className="truncate max-w-[22rem]">{u}</span>
                    <button type="button" onClick={() => removeReferenceUrl(u)} className="ml-0.5"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Secondary Keywords (optional)</Label>
            <div className="flex gap-2">
              <Input
                value={secInput}
                onChange={(e) => setSecInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSecKw(); } }}
                placeholder="Type a keyword and press Enter"
              />
              <Button type="button" variant="outline" size="sm" onClick={addSecKw}><Plus className="h-3 w-3" /></Button>
            </div>
            {secondaryKws.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {secondaryKws.map(k => (
                  <Badge key={k} variant="secondary" className="gap-1 text-xs">
                    {k}
                    <button onClick={() => removeSecKw(k)} className="ml-0.5"><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Meta Title (auto if blank)</Label>
              <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} maxLength={70} />
              <SeoLengthHint kind="title" value={metaTitle} />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Meta Description (auto if blank)</Label>
              <Input value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} maxLength={170} />
              <SeoLengthHint kind="description" value={metaDescription} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs font-semibold block">Date / Freshness Context</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => {
                  setContentDateContext(buildLatestDateContext());
                  toast({ title: "Reset to latest dates" });
                }}
              >
                <Sparkles className="h-3 w-3" /> Refresh
              </Button>
            </div>
            <Textarea
              value={contentDateContext}
              onChange={(e) => setContentDateContext(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4 pt-2 border-t">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Min Words</Label>
              <Input type="number" min={300} step={100} value={wordMin}
                onChange={(e) => setWordMin(parseInt(e.target.value, 10) || 0)} />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Max Words</Label>
              <Input type="number" min={300} step={100} value={wordMax}
                onChange={(e) => setWordMax(parseInt(e.target.value, 10) || 0)} />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Keyword Density %</Label>
              <Input type="number" min={0.5} max={5} step={0.1} value={densityPct}
                onChange={(e) => setDensityPct(parseFloat(e.target.value) || 2)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Internal Linking Pool */}
      <Card className="shadow-xs border-primary/20">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" /> Internal Linking Pool
              </CardTitle>
              <CardDescription>
                Pick the URLs the AI is allowed to link to. Links are inserted automatically in the right positions.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">{selectedCount} selected</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={linkSearch}
              onChange={(e) => setLinkSearch(e.target.value)}
              placeholder="Search across colleges, exams, articles, coaching, tools…"
              className="pl-9"
            />
          </div>

          <Tabs defaultValue="tools" className="w-full">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="tools">Tools</TabsTrigger>
              <TabsTrigger value="colleges">Colleges ({colleges.length})</TabsTrigger>
              <TabsTrigger value="exams">Exams ({exams.length})</TabsTrigger>
              <TabsTrigger value="articles">Blogs ({articles.length})</TabsTrigger>
              <TabsTrigger value="coaching">Coaching ({coachings.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="tools" className="mt-3">{renderLinkList(TOOL_URLS, "No tools")}</TabsContent>
            <TabsContent value="colleges" className="mt-3">{renderLinkList(colleges, loadingLinks ? "Loading…" : "No colleges found")}</TabsContent>
            <TabsContent value="exams" className="mt-3">{renderLinkList(exams, loadingLinks ? "Loading…" : "No exams")}</TabsContent>
            <TabsContent value="articles" className="mt-3">{renderLinkList(articles, loadingLinks ? "Loading…" : "No articles")}</TabsContent>
            <TabsContent value="coaching" className="mt-3">{renderLinkList(coachings, loadingLinks ? "Loading…" : "No coaching institutes")}</TabsContent>
          </Tabs>

          {selectedCount > 0 && (
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold">Selected URLs ({selectedCount})</p>
                <Button type="button" size="sm" variant="ghost" className="h-6 text-xs"
                  onClick={() => setSelectedUrls({})}>Clear all</Button>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {Object.values(selectedUrls).map(opt => (
                  <Badge key={opt.url} variant="outline" className="gap-1 text-xs font-normal">
                    {opt.label}
                    <button onClick={() => toggleUrl(opt)}><X className="h-3 w-3" /></button>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {(generating || progressSteps.length > 0) && (
        <AIGenerationProgress
          workflow="Blog generation"
          active={generating}
          total={progressSteps.length}
          done={progressSteps.filter(s => s.status === "ok" || s.status === "fail").length}
          ok={progressSteps.filter(s => s.status === "ok").length}
          fail={progressSteps.filter(s => s.status === "fail").length}
          current={progressCurrent}
          steps={progressSteps}
          onDismiss={() => setProgressSteps([])}
        />
      )}

      {errorMsg && (
        <Card className="border-destructive">
          <CardContent className="pt-4 flex gap-2 items-start text-sm">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <p className="text-destructive">{errorMsg}</p>
          </CardContent>
        </Card>
      )}

      {stats && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 text-xs space-y-1">
            <p><strong>Generation stats:</strong></p>
            <p>Words: {stats.actualWords} (target {stats.targetWordsRange?.[0]}-{stats.targetWordsRange?.[1]})</p>
            <p>Keyword density: {stats.actualDensityPct}% (target ~{stats.targetDensityPct}%)</p>
            <p>Primary keyword occurrences: {stats.actualOccurrences} (target ~{stats.targetOccurrences})</p>
            {typeof stats.tocEntries === "number" && stats.tocEntries > 0 && (
              <p>Table of contents entries: {stats.tocEntries}</p>
            )}
            {stats.sourceResearch && Array.isArray(stats.sourceResearch.sources) && stats.sourceResearch.sources.length > 0 && (
              <div className="mt-4 space-y-2 rounded-lg border bg-background p-3">
                <p className="font-semibold text-foreground">Sources used for research</p>
                {Array.isArray(stats.sourceResearch.toolsUsed) && stats.sourceResearch.toolsUsed.length > 0 && (
                  <p className="text-muted-foreground">Research tools: {stats.sourceResearch.toolsUsed.join(", ")}</p>
                )}
                <div className="space-y-1.5">
                  {stats.sourceResearch.sources.map((s: { url: string; title?: string; kind?: string; status?: string }, i: number) => (
                    <div key={`${s.url}-${i}`} className="rounded-md border bg-muted/30 p-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={s.kind === "primary" ? "default" : "secondary"}>
                          {s.kind === "primary" ? "Your link" : "Additional source"}
                        </Badge>
                        <Badge variant={s.status === "read" ? "outline" : "destructive"}>
                          {s.status === "read" ? "used" : "could not be read"}
                        </Badge>
                      </div>
                      <p className="mt-1 text-foreground break-words">{s.title || s.url}</p>
                      <p className="text-muted-foreground break-all font-mono text-xs">{s.url}</p>
                    </div>
                  ))}
                </div>
                {Array.isArray(stats.sourceResearch.notes) && stats.sourceResearch.notes.map((n: string, i: number) => (
                  <p key={`note-${i}`} className="text-muted-foreground">{n}</p>
                ))}
              </div>
            )}
            {stats.qualityAudit && Array.isArray(stats.qualityAudit.checks) && stats.qualityAudit.checks.length > 0 && (
              <div className="mt-4 space-y-2 rounded-lg border bg-background p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-foreground">SEO &amp; quality audit</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={stats.qualityAudit.score >= 85 ? "default" : stats.qualityAudit.score >= 70 ? "secondary" : "destructive"}>
                      Score {stats.qualityAudit.score}/100
                    </Badge>
                    <Badge variant="outline">Intent: {stats.qualityAudit.intentType}</Badge>
                    <Badge variant={stats.qualityAudit.stuffingRisk === "low" ? "outline" : "destructive"}>
                      Stuffing risk: {stats.qualityAudit.stuffingRisk}
                    </Badge>
                  </div>
                </div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {stats.qualityAudit.checks.map((c: { area: string; label: string; status: string; detail: string }, i: number) => (
                    <div key={`audit-${i}`} className="rounded-md border bg-muted/30 p-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={c.status === "pass" ? "outline" : "destructive"}>
                          {c.status === "pass" ? "OK" : "Check"}
                        </Badge>
                        <span className="font-medium text-foreground">{c.label}</span>
                      </div>
                      <p className="mt-1 text-muted-foreground">{c.area} — {c.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {Array.isArray(stats.factCheckReport) && stats.factCheckReport.length > 0 && (
              <div className="mt-4 space-y-2 rounded-lg border bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-foreground">Fact-check validation report</p>
                  <Badge variant={stats.factCheckReport.some((item: FactCheckReportItem) => item.severity === "error") ? "destructive" : "secondary"}>
                    {stats.factCheckReport.length} finding{stats.factCheckReport.length === 1 ? "" : "s"}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {stats.factCheckReport.map((item: FactCheckReportItem, index: number) => (
                    <div key={`${item.rule || "rule"}-${index}`} className="rounded-md border bg-muted/30 p-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={item.severity === "error" ? "destructive" : "outline"}>{item.severity || "warn"}</Badge>
                        <Badge variant="secondary">{item.field || "content"}</Badge>
                        <span className="font-mono text-xs text-muted-foreground">{item.rule || "quality_rule"}</span>
                        {item.autoFixed && <Badge variant="outline">auto-corrected</Badge>}
                      </div>
                      <p className="mt-1 text-muted-foreground">{item.message || "Validation warning"}</p>
                      <p className="mt-1 rounded-[0.25rem] border bg-background px-2 py-1 font-mono text-xs text-foreground break-words">
                        {item.matchedText || "Matched text was changed during sanitization."}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {stats.insertedId && (
              <Button size="sm" className="mt-2" onClick={() => navigate(`/admin/articles?edit=${stats.insertedId}`)}>
                Open in editor
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 sticky bottom-0 bg-background/95 backdrop-blur py-3 border-t -mx-1 px-1">
        <Button
          size="lg"
          onClick={handleGenerate}
          disabled={generating}
          className="flex-1 gap-2"
        >
          {generating ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Researching & writing... (45-90s)</>
          ) : (
            <><Sparkles className="h-4 w-4" /> Approve & Generate Article ({selectedCount} internal links)</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default AdminWriteBlog;
