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

const MODE_OPTIONS = ["Offline", "Online", "Hybrid"];
const EXAM_OPTIONS = ["CAT", "XAT", "GMAT", "NMAT", "SNAP", "CMAT", "MAT", "MAH-CET", "IIFT", "TISSNET", "MICAT"];

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);

const AdminWriteInstitute = () => {
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
  const [mode, setMode] = useState("Hybrid");
  const [targetKeyword, setTargetKeyword] = useState(seed.targetKeyword);
  const [secondaryKws, setSecondaryKws] = useState<string[]>([]);
  const [secInput, setSecInput] = useState("");
  const [examFocus, setExamFocus] = useState<string[]>(["CAT"]);
  const [flagshipPrograms, setFlagshipPrograms] = useState<string[]>([]);
  const [flagshipInput, setFlagshipInput] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  const buildLatestDateContext = () => {
    const y = new Date().getFullYear();
    return `Use ONLY the most recent verified data: ${y} CAT batch cycle and ${y - 1} CAT result selections. All fees, batch start dates, mock-series counts and success-story numbers MUST reflect the latest published year. Do NOT use outdated 2020-2023 figures.`;
  };
  const [contentDateContext, setContentDateContext] = useState<string>(buildLatestDateContext());

  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<{ insertedId: string; factCheck: any; faqsCount: number; programsCount: number; facultyCount: number; resultsCount: number } | null>(null);

  // Auto-sync slug
  const [slugTouched, setSlugTouched] = useState<boolean>(Boolean(seed.slug));
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(name));
  }, [name, slugTouched]);

  // Load categories for institute
  useEffect(() => {
    supabase.from("categories").select("id, name").order("name").then(({ data }) => {
      setCategories(data || []);
    });
  }, []);

  const addSecKw = () => {
    const v = secInput.trim();
    if (v && !secondaryKws.includes(v)) setSecondaryKws([...secondaryKws, v]);
    setSecInput("");
  };
  const removeSecKw = (k: string) => setSecondaryKws(secondaryKws.filter(x => x !== k));

  const addFlagship = () => {
    const v = flagshipInput.trim();
    if (v && !flagshipPrograms.includes(v)) setFlagshipPrograms([...flagshipPrograms, v]);
    setFlagshipInput("");
  };
  const removeFlagship = (k: string) => setFlagshipPrograms(flagshipPrograms.filter(x => x !== k));

  const toggleExam = (ex: string) => {
    setExamFocus(prev => prev.includes(ex) ? prev.filter(e => e !== ex) : [...prev, ex]);
  };

  const validate = () => {
    if (!name.trim()) return "Coaching / institute name is required";
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

    try {
      const { data, error } = await supabase.functions.invoke("ai-institute-writer", {
        body: {
          name: name.trim(),
          slug: slug.trim(),
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          mode,
          targetKeyword: targetKeyword.trim() || name.trim(),
          secondaryKeywords: secondaryKws,
          contentDateContext: contentDateContext.trim(),
          examFocus,
          flagshipPrograms,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.institute) throw new Error("AI returned an empty response");

      const i = data.institute;

      // Ensure slug uniqueness
      let finalSlug = i.slug || slug;
      const { data: existing } = await supabase
        .from("institutes")
        .select("id")
        .eq("slug", finalSlug)
        .maybeSingle();
      if (existing?.id) {
        finalSlug = `${finalSlug}-${Date.now().toString(36).slice(-4)}`;
      }

      const insertPayload: any = {
        name: i.name || name,
        slug: finalSlug,
        description: i.description || null,
        city: i.city || null,
        state: i.state || null,
        address: i.address || null,
        mode: i.mode || mode,
        category_id: categoryId || null,
        phone: i.phone || null,
        whatsapp: i.whatsapp || null,
        email: i.email || null,
        website: i.website || null,
        discount: i.discount || null,
        offer: i.offer || null,
        features: Array.isArray(i.features) && i.features.length ? i.features : null,
        fees_lakhs: typeof i.fees_lakhs === "number" ? i.fees_lakhs : null,
        success_rate: typeof i.success_rate === "number" ? i.success_rate : null,
        students_count: typeof i.students_count === "number" ? i.students_count : null,
        specializations: Array.isArray(i.specializations) && i.specializations.length ? i.specializations : null,
        meta_title: i.meta_title || null,
        meta_description: i.meta_description || null,
        keywords: Array.isArray(i.keywords) && i.keywords.length ? i.keywords : null,
        primary_keyword: i.primary_keyword || targetKeyword || name,
        h1_tag: i.h1_tag || i.name || name,
        funnel_stage: i.funnel_stage || "consideration",
        last_seo_refresh: new Date().toISOString(),
      };

      const { data: inserted, error: insertErr } = await supabase
        .from("institutes")
        .insert(insertPayload)
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      // Insert child rows: programs (courses), faculty, results
      const programs = Array.isArray(i.programs) ? i.programs : [];
      const faculty = Array.isArray(i.faculty_highlights) ? i.faculty_highlights : [];
      const results = Array.isArray(i.results) ? i.results : [];

      if (programs.length && inserted?.id) {
        const courseRows = programs.map((p: any) => ({
          institute_id: inserted.id,
          name: p.name || "Untitled program",
          duration: p.duration || null,
          mode: p.mode || mode,
          fees: typeof p.fees === "string"
            ? Number(String(p.fees).replace(/[^0-9.]/g, "")) || null
            : (typeof p.fees === "number" ? p.fees : null),
          description: p.description || null,
        }));
        await supabase.from("courses").insert(courseRows);
      }

      if (faculty.length && inserted?.id) {
        const facRows = faculty.map((f: any) => ({
          institute_id: inserted.id,
          name: f.name || "Faculty",
          designation: f.designation || null,
          qualification: f.qualification || null,
          experience: f.experience || null,
          specialization: f.specialization || null,
          bio: f.bio || null,
        }));
        await supabase.from("faculty").insert(facRows);
      }

      if (results.length && inserted?.id) {
        const curYear = new Date().getFullYear();
        const resRows = results
          .filter((r: any) => r && (r.year || r.college_name))
          .map((r: any) => ({
            institute_id: inserted.id,
            year: typeof r.year === "number" ? r.year : curYear - 1,
            college_name: r.college_name || "Top B-school",
            students_selected: typeof r.students_selected === "number" ? r.students_selected : 0,
            description: r.description || null,
          }));
        if (resRows.length) await supabase.from("institute_results").insert(resRows);
      }

      // Auto-seed FAQ schema
      const faqs = Array.isArray(data?.faqs) ? data.faqs : [];
      if (faqs.length > 0 && inserted?.id) {
        try {
          await supabase.functions.invoke("auto-seo-engine", {
            body: { mode: "seed_faqs", contentType: "institute", pageId: inserted.id, faqs },
          });
        } catch (e) { console.warn("FAQ seed failed", e); }
      }

      const factCheck = data?.factCheck || { confidence: {}, warnings: [], omit_fields: [] };
      setReviewData({
        insertedId: inserted.id,
        factCheck,
        faqsCount: faqs.length,
        programsCount: programs.length,
        facultyCount: faculty.length,
        resultsCount: results.length,
      });
      toast({
        title: "Coaching institute generated!",
        description: `Saved with ${programs.length} programs, ${faculty.length} faculty, ${results.length} result years${faqs.length ? `, ${faqs.length} FAQs` : ""}. Review factuality below.`,
      });
    } catch (e: any) {
      console.error("AI institute generation failed", e);
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
            <Sparkles className="h-6 w-6 text-primary" /> Generate Coaching Institute via AI
          </h1>
          <p className="text-sm text-muted-foreground">
            Just enter the coaching name — AI will research and write the full profile, programs, faculty, results & SEO.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Coaching Brief
          </CardTitle>
          <CardDescription>
            Review and edit before generation. The AI will fill description, flagship programs, faculty, success record, offers, SEO and more.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Coaching / Institute Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. TIME Hyderabad, IMS Mumbai, 2IIM Online"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Slug *</Label>
              <Input
                value={slug}
                onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }}
                placeholder="time-hyderabad"
                className="font-mono text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Target Keyword (primary)</Label>
              <Input
                value={targetKeyword}
                onChange={(e) => setTargetKeyword(e.target.value)}
                placeholder="e.g. TIME CAT coaching Hyderabad"
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
              <Label className="text-xs font-semibold mb-1.5 block">Mode</Label>
              <Select value={mode} onValueChange={setMode}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MODE_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {categories.length > 0 && (
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Category (optional)</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Choose category — e.g. CAT, GMAT" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Exam Focus</Label>
            <div className="flex flex-wrap gap-1.5">
              {EXAM_OPTIONS.map(ex => {
                const active = examFocus.includes(ex);
                return (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => toggleExam(ex)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-muted-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {ex}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Flagship Programs (optional seed)</Label>
            <div className="flex gap-2">
              <Input
                value={flagshipInput}
                onChange={(e) => setFlagshipInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFlagship(); } }}
                placeholder="e.g. AIMCAT, SimCAT, CAT Crash Course"
              />
              <Button type="button" variant="outline" size="sm" onClick={addFlagship}><Plus className="h-3 w-3" /></Button>
            </div>
            {flagshipPrograms.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {flagshipPrograms.map(k => (
                  <Badge key={k} variant="secondary" className="gap-1 text-xs">
                    {k}
                    <button onClick={() => removeFlagship(k)} className="ml-0.5"><X className="h-3 w-3" /></button>
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
                  toast({ title: "Reset to latest cycle", description: `Refreshed to ${new Date().getFullYear()} CAT cycle.` });
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
              {reviewData.programsCount} programs · {reviewData.facultyCount} faculty · {reviewData.resultsCount} result years · {reviewData.faqsCount} FAQs schema-injected.
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
                Auto-omitted fields:{" "}
                <strong>{reviewData.factCheck.omit_fields.join(", ")}</strong>
              </p>
            )}

            <div className="flex gap-2 pt-2">
              <Button size="sm" onClick={() => navigate(`/admin/institutes`)}>
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
            <><Sparkles className="h-4 w-4 mr-2" /> Approve & Generate Coaching</>
          )}
        </Button>
        <Button variant="outline" size="lg" onClick={() => navigate(-1)} disabled={generating}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default AdminWriteInstitute;
