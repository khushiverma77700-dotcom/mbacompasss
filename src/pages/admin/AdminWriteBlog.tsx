import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Sparkles, X, Plus, AlertCircle, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AIGenerationProgress, { type ProgressStep } from "@/components/admin/AIGenerationProgress";
import PrePublishReport from "@/components/admin/PrePublishReport";
import { checkSeoCompleteness, type CompletenessReport } from "@/lib/seoCompletenessChecker";
import { validateHtml, type HtmlValidationReport } from "@/lib/htmlValidator";
import { checkLatestCycle, type CycleReport } from "@/lib/cycleChecker";

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

const AdminWriteBlog = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const seed = useMemo(() => {
    // Try sessionStorage first, then query params
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
  const buildLatestDateContext = () => {
    const y = new Date().getFullYear();
    return `Use ONLY the most recent verified data: ${y}-${y + 1} admission cycle, ${y - 1}-${y} placement reports. All dates, exam cycles, fees, cutoffs and statistics MUST reflect the latest published year. Do NOT use outdated 2020-2023 figures unless explicitly historical context.`;
  };
  const [contentDateContext, setContentDateContext] = useState<string>(buildLatestDateContext());
  const [wordMin, setWordMin] = useState(2000);
  const [wordMax, setWordMax] = useState(2500);
  const [densityPct, setDensityPct] = useState(10);

  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const [progressCurrent, setProgressCurrent] = useState<string>("");
  const [seoReport, setSeoReport] = useState<CompletenessReport | null>(null);
  const [htmlReport, setHtmlReport] = useState<HtmlValidationReport | null>(null);
  const [cycleReport, setCycleReport] = useState<CycleReport | null>(null);

  const setStep = (key: string, status: ProgressStep["status"], error?: string) =>
    setProgressSteps(prev => prev.map(s => s.key === key ? { ...s, status, error } : s));

  // Auto-sync slug from title until user edits slug manually
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

  const validate = () => {
    if (!title.trim()) return "Title is required";
    if (!slug.trim()) return "Slug is required";
    if (!targetKeyword.trim()) return "Target keyword is required";
    if (wordMin < 500 || wordMax > 5000 || wordMin > wordMax) return "Word count range looks invalid";
    if (densityPct < 1 || densityPct > 15) return "Keyword density should be between 1% and 15%";
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
    setSeoReport(null);
    setHtmlReport(null);
    setCycleReport(null);
    setProgressSteps(BLOG_STEPS.map(s => ({ ...s, status: "pending" })));
    setProgressCurrent(BLOG_STEPS[0].label);
    setStep("brief", "ok");

    try {
      setStep("research", "running");
      setProgressCurrent("Researching topic");
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
        },
      });

      if (error) { setStep("research", "fail", error.message); throw error; }
      if (data?.error) { setStep("research", "fail", data.error); throw new Error(data.error); }
      if (!data?.article) { setStep("research", "fail", "Empty response"); throw new Error("AI returned an empty response"); }
      setStep("research", "ok");
      setStep("draft", "ok");
      setProgressCurrent("Saving draft");

      const a = data.article;
      setStats(data.stats);

      setStep("save", "running");
      let finalSlug = a.slug || slug;
      const { data: existing } = await supabase
        .from("articles")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();
      if (existing?.id) {
        finalSlug = `${finalSlug}-${Date.now().toString(36).slice(-4)}`;
      }

      const insertPayload = {
        title: a.title || title,
        slug: finalSlug,
        excerpt: a.excerpt || "",
        intro: a.intro || "",
        content: a.content || "",
        meta_title: a.metaTitle || metaTitle || a.title?.slice(0, 60) || title.slice(0, 60),
        meta_description: a.metaDescription || metaDescription || a.excerpt?.slice(0, 160) || "",
        keywords: Array.isArray(a.keywords) ? a.keywords : [],
        primary_keyword: a.primaryKeyword || targetKeyword,
        h1_tag: a.h1Tag || a.title || title,
        author: a.author || "MBAHub Editorial",
        category,
        status: "draft",
        published: false,
        featured: false,
        priority: 0,
      };

      const { data: inserted, error: insertErr } = await supabase
        .from("articles")
        .insert(insertPayload)
        .select("id")
        .single();

      if (insertErr) { setStep("save", "fail", insertErr.message); throw insertErr; }
      setStep("save", "ok");

      setStep("faqs", "running");
      const extractedFaqs = Array.isArray(data?.faqs) ? data.faqs : [];
      if (extractedFaqs.length > 0 && inserted?.id) {
        try {
          await supabase.functions.invoke("auto-seo-engine", {
            body: { mode: "seed_faqs", contentType: "article", pageId: inserted.id, faqs: extractedFaqs },
          });
          setStep("faqs", "ok");
        } catch (e) { console.warn("FAQ seed failed", e); setStep("faqs", "fail", "Schema injection failed"); }
      } else {
        setStep("faqs", "ok");
      }

      setStep("validate", "running");
      setProgressCurrent("Running pre-publish checks");
      const seoRep = checkSeoCompleteness({
        metaTitle: insertPayload.meta_title,
        metaDescription: insertPayload.meta_description,
        slug: finalSlug,
        primaryKeyword: insertPayload.primary_keyword,
        secondaryKeywords: secondaryKws,
        html: insertPayload.content,
        faqs: extractedFaqs,
        faqExpected: true,
      });
      const htmlRep = validateHtml(insertPayload.content, { context: "blog" });
      const cycleRep = checkLatestCycle(insertPayload.content);
      setSeoReport(seoRep);
      setHtmlReport(htmlRep);
      setCycleReport(cycleRep);
      setStep("validate", "ok");
      setProgressCurrent("");

      try { sessionStorage.removeItem(STORAGE_KEY); } catch {}

      const issues: string[] = [];
      if (seoRep.level !== "pass") issues.push(`SEO ${seoRep.summary.toLowerCase()}`);
      if (!htmlRep.ok) issues.push(`${htmlRep.issues.filter(i => i.level === "error").length} HTML blocker(s)`);
      if (!cycleRep.ok) issues.push("date mismatches found");

      toast({
        title: "Article generated!",
        description: `${data.stats?.actualWords ?? "~"} words${extractedFaqs.length ? ` · ${extractedFaqs.length} FAQs` : ""}${issues.length ? ` · Review: ${issues.join(", ")}` : " · All checks passed"}. Review below before opening editor.`,
      });
      setStats((prev: any) => ({ ...(prev || {}), insertedId: inserted.id }));
    } catch (e: any) {
      console.error("AI blog generation failed", e);
      setErrorMsg(e?.message || "Generation failed");
      toast({ title: "Generation failed", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="text-right">
          <h1 className="text-2xl font-bold flex items-center gap-2 justify-end">
            <Sparkles className="h-6 w-6 text-primary" /> Write Blog via AI
          </h1>
          <p className="text-sm text-muted-foreground">Review the brief, then generate a full SEO article with GPT-5</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" /> Article Brief
          </CardTitle>
          <CardDescription>
            Edit anything below before generation. The AI will write a {wordMin}-{wordMax} word article with
            ~{densityPct}% keyword density and the latest dates.
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
            <p className="text-[11px] text-muted-foreground mt-1">
              The AI will aim for ~{densityPct}% density of this exact phrase across the article.
            </p>
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
              <span className="text-[10px] text-muted-foreground">{metaTitle.length}/60</span>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Meta Description (auto if blank)</Label>
              <Input value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} maxLength={170} />
              <span className="text-[10px] text-muted-foreground">{metaDescription.length}/160</span>
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
                  toast({ title: "Reset to latest dates", description: `Refreshed to ${new Date().getFullYear()}-${new Date().getFullYear() + 1} cycle. Click Generate to regenerate.` });
                }}
              >
                <Sparkles className="h-3 w-3" /> Regenerate with latest dates
              </Button>
            </div>
            <Textarea
              value={contentDateContext}
              onChange={(e) => setContentDateContext(e.target.value)}
              rows={2}
              placeholder="Tell the AI which years/dates to use"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4 pt-2 border-t">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Min Words</Label>
              <Input type="number" min={500} max={5000} value={wordMin} onChange={(e) => setWordMin(parseInt(e.target.value) || 2000)} />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Max Words</Label>
              <Input type="number" min={500} max={5000} value={wordMax} onChange={(e) => setWordMax(parseInt(e.target.value) || 2500)} />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Keyword Density %</Label>
              <Input type="number" min={1} max={15} value={densityPct} onChange={(e) => setDensityPct(parseInt(e.target.value) || 10)} />
            </div>
          </div>
        </CardContent>
      </Card>

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
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3 sticky bottom-0 bg-background py-3 border-t">
        <Button
          size="lg"
          onClick={handleGenerate}
          disabled={generating}
          className="flex-1"
        >
          {generating ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Researching & writing... (45-90s)</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" /> Approve & Generate Article</>
          )}
        </Button>
        <Button variant="outline" size="lg" onClick={() => navigate(-1)} disabled={generating}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default AdminWriteBlog;
