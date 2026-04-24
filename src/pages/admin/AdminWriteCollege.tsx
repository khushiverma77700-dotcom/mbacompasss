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
import { ArrowLeft, Loader2, Sparkles, X, Plus, AlertCircle, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import StateCitySelect from "@/components/admin/StateCitySelect";
import AIGenerationProgress, { type ProgressStep } from "@/components/admin/AIGenerationProgress";
import PrePublishReport from "@/components/admin/PrePublishReport";
import { checkSeoCompleteness, type CompletenessReport } from "@/lib/seoCompletenessChecker";
import { validateHtml, type HtmlValidationReport } from "@/lib/htmlValidator";
import { checkLatestCycle, type CycleReport } from "@/lib/cycleChecker";

const COLLEGE_STEPS: { key: string; label: string }[] = [
  { key: "brief", label: "Validating brief" },
  { key: "research", label: "Researching college" },
  { key: "draft", label: "Writing profile" },
  { key: "factcheck", label: "Factuality check" },
  { key: "save", label: "Saving as draft" },
  { key: "faqs", label: "Injecting FAQ schema" },
  { key: "validate", label: "Pre-publish checks" },
];

const TYPE_OPTIONS = ["IIM", "Private", "Government", "Deemed", "Autonomous", "University"];
const TIER_OPTIONS = ["Tier 1", "Tier 2", "Tier 3", "Tier 4"];
const CATEGORY_OPTIONS = ["IIM", "Non-IIM"];

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

const AdminWriteCollege = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const seed = useMemo(() => ({
    name: params.get("name") || "",
    slug: params.get("slug") || "",
    targetKeyword: params.get("keyword") || "",
  }), [params]);

  const [name, setName] = useState(seed.name);
  const [slug, setSlug] = useState(seed.slug || (seed.name ? slugify(seed.name) : ""));
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [type, setType] = useState("Private");
  const [tier, setTier] = useState("Tier 2");
  const [category, setCategory] = useState("Non-IIM");
  const [targetKeyword, setTargetKeyword] = useState(seed.targetKeyword);
  const [secondaryKws, setSecondaryKws] = useState<string[]>([]);
  const [secInput, setSecInput] = useState("");
  const buildLatestDateContext = () => {
    const y = new Date().getFullYear();
    return `Use ONLY the most recent verified data: ${y}-${y + 1} admission cycle, ${y - 1}-${y} placement reports. All fees, placement figures, ranking and seat numbers MUST reflect the latest published year. Do NOT use outdated 2020-2023 figures unless the field is explicitly historical (e.g. founding year).`;
  };
  const [contentDateContext, setContentDateContext] = useState<string>(buildLatestDateContext());

  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<{ insertedId: string; factCheck: any; faqsCount: number } | null>(null);

  const [seoReport, setSeoReport] = useState<CompletenessReport | null>(null);
  const [htmlReport, setHtmlReport] = useState<HtmlValidationReport | null>(null);
  const [cycleReport, setCycleReport] = useState<CycleReport | null>(null);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>(
    COLLEGE_STEPS.map(s => ({ ...s, status: "pending" as const }))
  );
  const [progressCurrent, setProgressCurrent] = useState<string>("");
  const setStep = (key: string, status: ProgressStep["status"]) => {
    setProgressSteps(prev => prev.map(s => (s.key === key ? { ...s, status } : s)));
  };

  // Auto-sync slug from name until user edits slug manually
  const [slugTouched, setSlugTouched] = useState<boolean>(Boolean(seed.slug));
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  const addSecKw = () => {
    const v = secInput.trim();
    if (v && !secondaryKws.includes(v)) setSecondaryKws([...secondaryKws, v]);
    setSecInput("");
  };
  const removeSecKw = (k: string) => setSecondaryKws(secondaryKws.filter(x => x !== k));

  const validate = () => {
    if (!name.trim()) return "College name is required";
    if (!slug.trim()) return "Slug is required";
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
    setSeoReport(null); setHtmlReport(null); setCycleReport(null);
    setProgressSteps(COLLEGE_STEPS.map(s => ({ ...s, status: "pending" })));
    setProgressCurrent("Researching college");
    setStep("brief", "ok");
    setStep("research", "running");

    try {
      const { data, error } = await supabase.functions.invoke("ai-college-writer", {
        body: {
          name: name.trim(),
          slug: slug.trim(),
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          type,
          tier,
          category,
          targetKeyword: targetKeyword.trim() || name.trim(),
          secondaryKeywords: secondaryKws,
          contentDateContext: contentDateContext.trim(),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.college) throw new Error("AI returned an empty response");

      const c = data.college;

      // Ensure slug uniqueness
      let finalSlug = c.slug || slug;
      const { data: existing } = await supabase
        .from("colleges")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();
      if (existing?.id) {
        finalSlug = `${finalSlug}-${Date.now().toString(36).slice(-4)}`;
      }

      // Coerce AI-returned values into safe integer/numeric values.
      // The model sometimes returns strings like "15-18 (NIRF Management 2026)"
      // or "2,500 students" — we extract the first number so Postgres int
      // columns don't error out.
      const toInt = (v: any): number | null => {
        if (v === null || v === undefined || v === "") return null;
        if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
        const m = String(v).replace(/,/g, "").match(/-?\d+/);
        if (!m) return null;
        const n = parseInt(m[0], 10);
        return Number.isFinite(n) ? n : null;
      };
      const toNum = (v: any): number | null => {
        if (v === null || v === undefined || v === "") return null;
        if (typeof v === "number" && Number.isFinite(v)) return v;
        const m = String(v).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
        if (!m) return null;
        const n = parseFloat(m[0]);
        return Number.isFinite(n) ? n : null;
      };

      const insertPayload: any = {
        name: c.name || name,
        slug: finalSlug,
        description: c.description || null,
        city: c.city || null,
        state: c.state || null,
        type: c.type || type,
        tier: c.tier || tier,
        college_category: c.college_category || category,
        established: toInt(c.established),
        ranking: toInt(c.ranking),
        fees: c.fees || null,
        fees_lakhs: toNum(c.fees_lakhs),
        website: c.website || null,
        placement_avg: c.placement_avg || null,
        placement_highest: c.placement_highest || null,
        placement_median: c.placement_median || null,
        campus_size: c.campus_size || null,
        total_students: toInt(c.total_students),
        admission_process: c.admission_process || null,
        courses: Array.isArray(c.courses) && c.courses.length ? c.courses : null,
        accreditations: Array.isArray(c.accreditations) && c.accreditations.length ? c.accreditations : null,
        exams_accepted: Array.isArray(c.exams_accepted) && c.exams_accepted.length ? c.exams_accepted : null,
        top_recruiters: Array.isArray(c.top_recruiters) && c.top_recruiters.length ? c.top_recruiters : null,
        specializations: Array.isArray(c.specializations) && c.specializations.length ? c.specializations : null,
        meta_title: c.meta_title || null,
        meta_description: c.meta_description || null,
        keywords: Array.isArray(c.keywords) && c.keywords.length ? c.keywords : null,
        primary_keyword: c.primary_keyword || targetKeyword || name,
        h1_tag: c.h1_tag || c.name || name,
        funnel_stage: c.funnel_stage || "consideration",
        last_seo_refresh: new Date().toISOString(),
      };

      const { data: inserted, error: insertErr } = await supabase
        .from("colleges")
        .insert(insertPayload)
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      // Auto-seed FAQ schema snapshot from extracted FAQs
      const faqs = Array.isArray(data?.faqs) ? data.faqs : [];
      if (faqs.length > 0 && inserted?.id) {
        try {
          await supabase.functions.invoke("auto-seo-engine", {
            body: { mode: "seed_faqs", contentType: "college", pageId: inserted.id, faqs },
          });
        } catch (e) { console.warn("FAQ seed failed", e); }
      }

      const factCheck = data?.factCheck || { confidence: {}, warnings: [], omit_fields: [] };
      setReviewData({ insertedId: inserted.id, factCheck, faqsCount: faqs.length });
      toast({
        title: "College generated!",
        description: `Review the factuality report below before opening the editor.${faqs.length ? ` ${faqs.length} FAQs schema-injected.` : ""}`,
      });
    } catch (e: any) {
      console.error("AI college generation failed", e);
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
            <Sparkles className="h-6 w-6 text-primary" /> Generate College via AI
          </h1>
          <p className="text-sm text-muted-foreground">Enter the basics — AI will research and write a full college profile.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" /> College Brief
          </CardTitle>
          <CardDescription>
            Review and edit before generation. The AI will fill description, placements, admission process, courses, recruiters, SEO, and more.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">College Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. IIM Bangalore"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Slug *</Label>
              <Input
                value={slug}
                onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }}
                placeholder="iim-bangalore"
                className="font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Target Keyword (primary)</Label>
              <Input
                value={targetKeyword}
                onChange={(e) => setTargetKeyword(e.target.value)}
                placeholder="e.g. IIM Bangalore admission 2026"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <StateCitySelect
              state={state}
              city={city}
              onStateChange={(s) => { setState(s); setCity(""); }}
              onCityChange={setCity}
              showLabels
            />
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Tier</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIER_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
                  toast({ title: "Reset to latest dates", description: `Refreshed to ${new Date().getFullYear()}-${new Date().getFullYear() + 1} cycle. Click Generate to refresh fees, placements & admission details.` });
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

      {reviewData && (
        <Card className="border-amber-300 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-amber-900">
              <AlertCircle className="h-4 w-4" /> Pre-publish Factuality Review
            </CardTitle>
            <CardDescription className="text-amber-800">
              Review confidence on each high-risk field and any flagged inconsistencies before opening the editor.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <div className="font-semibold mb-2">Source confidence</div>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(reviewData.factCheck?.confidence || {}).map(([k, v]: any) => {
                  const cls = v === "Verified" ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : v === "Range" ? "bg-blue-100 text-blue-800 border-blue-300"
                    : "bg-red-100 text-red-800 border-red-300";
                  return (
                    <Badge key={k} variant="outline" className={`text-xs ${cls}`}>
                      {k}: {v as string}
                    </Badge>
                  );
                })}
                {Object.keys(reviewData.factCheck?.confidence || {}).length === 0 && (
                  <span className="text-xs text-muted-foreground">No confidence data returned.</span>
                )}
              </div>
            </div>

            {Array.isArray(reviewData.factCheck?.warnings) && reviewData.factCheck.warnings.length > 0 ? (
              <div>
                <div className="font-semibold mb-2">Likely inconsistencies</div>
                <ul className="space-y-1.5">
                  {reviewData.factCheck.warnings.map((w: any, i: number) => (
                    <li key={i} className="flex gap-2 items-start">
                      <Badge variant="outline" className={`text-[10px] ${w.severity === "high" ? "bg-red-100 text-red-800 border-red-300" : w.severity === "medium" ? "bg-amber-100 text-amber-800 border-amber-300" : "bg-muted"}`}>
                        {w.severity}
                      </Badge>
                      <span><strong>{w.field}:</strong> {w.message}{w.suggested ? ` → suggested: ${w.suggested}` : ""}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-emerald-800 text-xs">No inconsistencies flagged. Safe to publish after a quick visual check.</p>
            )}

            {Array.isArray(reviewData.factCheck?.omit_fields) && reviewData.factCheck.omit_fields.length > 0 && (
              <p className="text-xs text-muted-foreground">
                The following fields were auto-omitted (set to null) because the AI was not confident:{" "}
                <strong>{reviewData.factCheck.omit_fields.join(", ")}</strong>
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={() => navigate(`/admin/colleges?edit=${reviewData.insertedId}`)}>
                Open in Editor
              </Button>
              <Button size="sm" variant="outline" onClick={() => setReviewData(null)}>
                Dismiss
              </Button>
            </div>
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
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Researching, writing & fact-checking... (60-120s)</>
          ) : (
            <><Sparkles className="h-4 w-4 mr-2" /> Approve & Generate College</>
          )}
        </Button>
        <Button variant="outline" size="lg" onClick={() => navigate(-1)} disabled={generating}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default AdminWriteCollege;
