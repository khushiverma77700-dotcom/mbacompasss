import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft, Loader2, Sparkles, Search, Plus, Trash2, AlertCircle,
  BookOpen, ShieldCheck, IndianRupee, CheckCircle2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type InstituteRow = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  mode: string | null;
  website: string | null;
  established?: number | null;
};

type DiscoveredCourse = {
  name: string;
  exam: string;
  mode: "Offline" | "Online" | "Hybrid";
  duration?: string;
  confidence: "Verified" | "Likely" | "Range";
  short_note?: string;
  _selected: boolean;
};

type GeneratedCourse = {
  name: string;
  short_description?: string;
  description_html: string;
  duration?: string;
  mode: "Offline" | "Online" | "Hybrid";
  start_date?: string;
  eligibility?: string;
  fees_inr: number;
  fees_text?: string;
  discount_text?: string;
  total_seats?: number;
  highlights: string[];
  curriculum: string[];
  batch_info?: string;
  exam: string;
  meta_title?: string;
  meta_description?: string;
  keywords?: string[];
  price_confidence: "Verified" | "Range" | "Unknown";
  accuracy_notes?: string;
  _save: boolean;
};

const EXAM_OPTIONS = [
  "CAT", "XAT", "GMAT", "NMAT", "SNAP", "CMAT", "MAT",
  "MAH-CET", "IIFT", "TISSNET", "MICAT", "GD-PI-WAT",
];

const buildLatestDateContext = () => {
  const y = new Date().getFullYear();
  return `Use ONLY the most recent verified data: ${y} CAT batch cycle and ${y - 1} CAT result selections. All fees, batch start dates, mock-series counts must reflect the latest published year. Do NOT use outdated 2020-2023 figures.`;
};

const AdminWriteCourses = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Step 1: institute selection
  const [institutes, setInstitutes] = useState<InstituteRow[]>([]);
  const [instSearch, setInstSearch] = useState("");
  const [selectedInstId, setSelectedInstId] = useState<string>("");
  const selectedInst = useMemo(
    () => institutes.find((i) => i.id === selectedInstId) || null,
    [institutes, selectedInstId]
  );

  const [examFocus, setExamFocus] = useState<string[]>(["CAT", "XAT"]);
  const [maxCourses, setMaxCourses] = useState<number>(15);
  const [contentDateContext, setContentDateContext] = useState(buildLatestDateContext());

  // Step 2: discovered courses (editable list)
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState<DiscoveredCourse[]>([]);
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseExam, setNewCourseExam] = useState("CAT");
  const [newCourseMode, setNewCourseMode] = useState<"Offline" | "Online" | "Hybrid">("Hybrid");

  // Step 3: generation
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState<GeneratedCourse[]>([]);

  // Step 4: save
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("institutes")
      .select("id, name, city, state, mode, website")
      .order("name")
      .then(({ data }) => setInstitutes(data || []));
  }, []);

  const filteredInst = useMemo(() => {
    const q = instSearch.trim().toLowerCase();
    if (!q) return institutes.slice(0, 50);
    return institutes
      .filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.city || "").toLowerCase().includes(q) ||
          (i.state || "").toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [institutes, instSearch]);

  const toggleExam = (e: string) =>
    setExamFocus((prev) => (prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]));

  const handleDiscover = async () => {
    if (!selectedInst) {
      toast({ title: "Select an institute first", variant: "destructive" });
      return;
    }
    setDiscovering(true);
    setErrorMsg(null);
    setDiscovered([]);
    setGenerated([]);
    try {
      const { data, error } = await supabase.functions.invoke("ai-course-writer", {
        body: {
          mode: "discover",
          max: maxCourses,
          contentDateContext,
          institute: {
            name: selectedInst.name,
            city: selectedInst.city || undefined,
            state: selectedInst.state || undefined,
            mode: selectedInst.mode || undefined,
            website: selectedInst.website || undefined,
            examFocus,
          },
        },
      });
      if (error) throw error;
      const courses = (data?.courses || []) as Omit<DiscoveredCourse, "_selected">[];
      setDiscovered(courses.map((c) => ({ ...c, _selected: true })));
      if (courses.length === 0) {
        toast({ title: "No courses discovered", description: "Try adding them manually below." });
      } else {
        toast({ title: `Found ${courses.length} courses`, description: "Review, add or remove, then Generate." });
      }
    } catch (e: any) {
      setErrorMsg(e?.message || "Discovery failed");
      toast({ title: "Discovery failed", description: e?.message, variant: "destructive" });
    } finally {
      setDiscovering(false);
    }
  };

  const addManualCourse = () => {
    const name = newCourseName.trim();
    if (!name) return;
    setDiscovered((prev) => [
      ...prev,
      { name, exam: newCourseExam, mode: newCourseMode, confidence: "Verified", _selected: true, short_note: "Manually added" },
    ]);
    setNewCourseName("");
  };

  const removeDiscovered = (idx: number) =>
    setDiscovered((prev) => prev.filter((_, i) => i !== idx));

  const updateDiscovered = (idx: number, patch: Partial<DiscoveredCourse>) =>
    setDiscovered((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));

  const handleGenerate = async () => {
    if (!selectedInst) return;
    const seeds = discovered.filter((c) => c._selected).map((c) => ({
      name: c.name,
      exam: c.exam,
      mode: c.mode,
    }));
    if (seeds.length === 0) {
      toast({ title: "Select at least 1 course to generate", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setErrorMsg(null);
    try {
      // Chunk to avoid edge function 150s timeout. Generate 2 courses per call.
      const CHUNK = 2;
      const chunks: typeof seeds[] = [];
      for (let i = 0; i < seeds.length; i += CHUNK) chunks.push(seeds.slice(i, i + CHUNK));
      const all: Omit<GeneratedCourse, "_save">[] = [];
      let idx = 0;
      for (const chunk of chunks) {
        idx += 1;
        toast({ title: `Generating ${idx}/${chunks.length}…`, description: `${chunk.length} course(s) in this batch` });
        const { data, error } = await supabase.functions.invoke("ai-course-writer", {
          body: {
            mode: "generate",
            contentDateContext,
            institute: {
              name: selectedInst.name,
              city: selectedInst.city || undefined,
              state: selectedInst.state || undefined,
              mode: selectedInst.mode || undefined,
              website: selectedInst.website || undefined,
              examFocus,
            },
            courses: chunk,
          },
        });
        if (error) throw error;
        const gen = (data?.courses || []) as Omit<GeneratedCourse, "_save">[];
        all.push(...gen);
        setGenerated((prev) => [...all].map((g) => ({ ...g, _save: true })));
      }
      toast({ title: `Generated ${all.length} courses`, description: "Review the results and save what you like." });
    } catch (e: any) {
      setErrorMsg(e?.message || "Generation failed");
      toast({ title: "Generation failed", description: e?.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAll = async () => {
    if (!selectedInstId) return;
    const toSave = generated.filter((g) => g._save);
    if (toSave.length === 0) {
      toast({ title: "Nothing selected to save", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const rows = toSave.map((g) => ({
        institute_id: selectedInstId,
        name: g.name,
        description: g.description_html, // rich HTML
        duration: g.duration || null,
        fees: typeof g.fees_inr === "number" && g.fees_inr > 0 ? g.fees_inr : null,
        batch_info: g.batch_info || null,
        curriculum: g.curriculum?.length ? g.curriculum : null,
        mode: g.mode || "Offline",
        start_date: g.start_date || null,
        total_seats: g.total_seats || null,
        highlights: g.highlights?.length ? g.highlights : [],
        eligibility: g.eligibility || null,
        discount_text: g.discount_text || null,
        rating: 0,
        enrolled_count: 0,
      }));
      const { error } = await supabase.from("courses").insert(rows);
      if (error) throw error;
      toast({ title: `Saved ${rows.length} courses`, description: "Visible immediately on the institute page." });
      navigate("/admin/courses");
    } catch (e: any) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const confidenceTone = (c: string) =>
    c === "Verified" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
      : c === "Likely" || c === "Range" ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
      : "bg-muted text-muted-foreground border-border";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <Button variant="ghost" onClick={() => navigate("/admin/courses")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Courses
        </Button>
        <div className="mt-3">
          <h1 className="font-heading text-3xl font-bold flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary" /> AI Course Generator
          </h1>
          <p className="text-muted-foreground mt-1">
            Pick an institute → discover its real MBA / Masters-in-Management courses → edit the list → deep-research and auto-generate accurate, ready-to-publish content with verified pricing.
          </p>
        </div>
      </div>

      {/* STEP 1: Institute */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
            Select Institute
          </CardTitle>
          <CardDescription>Search by name, city or state. The AI will only research MBA-entrance coaching from this institute.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search institutes…"
              value={instSearch}
              onChange={(e) => setInstSearch(e.target.value)}
            />
          </div>
          <div className="max-h-72 overflow-y-auto rounded-lg border border-border divide-y">
            {filteredInst.map((i) => (
              <button
                key={i.id}
                onClick={() => setSelectedInstId(i.id)}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  selectedInstId === i.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span>{i.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {[i.city, i.state].filter(Boolean).join(", ")}
                  </span>
                </div>
              </button>
            ))}
            {filteredInst.length === 0 && (
              <div className="px-4 py-6 text-sm text-muted-foreground text-center">No institutes match.</div>
            )}
          </div>

          {selectedInst && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
              <div className="font-semibold">{selectedInst.name}</div>
              <div className="text-muted-foreground text-xs mt-0.5">
                {[selectedInst.city, selectedInst.state, selectedInst.mode].filter(Boolean).join(" · ")}
              </div>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label>Exam Focus (optional hint)</Label>
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
              <Label>Max courses to discover</Label>
              <Select value={String(maxCourses)} onValueChange={(v) => setMaxCourses(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 25, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} courses</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">AI will list up to this many real courses for the institute.</p>
            </div>
          </div>

          <div>
            <Label>Freshness instructions</Label>
            <Textarea
              rows={2}
              value={contentDateContext}
              onChange={(e) => setContentDateContext(e.target.value)}
              className="mt-1.5 text-sm"
            />
          </div>

          <Button
            onClick={handleDiscover}
            disabled={!selectedInst || discovering}
            className="w-full sm:w-auto"
          >
            {discovering ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            Discover MBA Courses
          </Button>
        </CardContent>
      </Card>

      {/* STEP 2: Editable course list */}
      {discovered.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
              Review &amp; Edit Course List
              <Badge variant="secondary" className="ml-2">{discovered.filter(d => d._selected).length} selected</Badge>
            </CardTitle>
            <CardDescription>Uncheck or delete courses you don't want. Add any missing course manually. Only selected courses will be generated.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-border divide-y">
              {discovered.map((c, idx) => (
                <div key={idx} className="flex items-start sm:items-center gap-3 px-3 py-2.5 hover:bg-muted/40">
                  <Checkbox
                    checked={c._selected}
                    onCheckedChange={(v) => updateDiscovered(idx, { _selected: Boolean(v) })}
                    className="mt-1 sm:mt-0"
                  />
                  <div className="flex-1 min-w-0">
                    <Input
                      value={c.name}
                      onChange={(e) => updateDiscovered(idx, { name: e.target.value })}
                      className="h-8 text-sm font-medium"
                    />
                    {c.short_note && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{c.short_note}</p>
                    )}
                  </div>
                  <Select value={c.exam} onValueChange={(v) => updateDiscovered(idx, { exam: v })}>
                    <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXAM_OPTIONS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={c.mode} onValueChange={(v) => updateDiscovered(idx, { mode: v as any })}>
                    <SelectTrigger className="w-[100px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Offline">Offline</SelectItem>
                      <SelectItem value="Online">Online</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge variant="outline" className={`text-[10px] hidden md:inline-flex ${confidenceTone(c.confidence)}`}>
                    {c.confidence}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => removeDiscovered(idx)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Manual add row */}
            <div className="rounded-lg border border-dashed border-border p-3 bg-muted/20">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Add course manually</Label>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px_120px_auto] gap-2 mt-2">
                <Input
                  placeholder="e.g. CAT Weekend Classroom Program"
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                />
                <Select value={newCourseExam} onValueChange={setNewCourseExam}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXAM_OPTIONS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={newCourseMode} onValueChange={(v) => setNewCourseMode(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Offline">Offline</SelectItem>
                    <SelectItem value="Online">Online</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={addManualCourse} variant="outline">
                  <Plus className="w-4 h-4 mr-1.5" /> Add
                </Button>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generating || discovered.filter(d => d._selected).length === 0}
              className="w-full sm:w-auto"
              size="lg"
            >
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Deep-Research &amp; Generate Content
            </Button>

            {errorMsg && (
              <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-md p-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Generated content review */}
      {generated.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
              Review Generated Content
              <Badge variant="secondary" className="ml-2">{generated.filter(g => g._save).length} of {generated.length} will be saved</Badge>
            </CardTitle>
            <CardDescription>Each course was deep-researched. Inspect pricing confidence before saving.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {generated.map((g, idx) => (
              <div key={idx} className="rounded-lg border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/30">
                  <Checkbox
                    checked={g._save}
                    onCheckedChange={(v) =>
                      setGenerated(prev => prev.map((x, i) => i === idx ? { ...x, _save: Boolean(v) } : x))
                    }
                  />
                  <BookOpen className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{g.name}</div>
                    <div className="text-xs text-muted-foreground">{g.exam} · {g.mode} · {g.duration || "Duration TBD"}</div>
                  </div>
                  <Badge variant="outline" className={confidenceTone(g.price_confidence)}>
                    <IndianRupee className="w-3 h-3 mr-1" /> {g.price_confidence}
                  </Badge>
                </div>
                <div className="px-4 py-3 space-y-3">
                  <div className="grid sm:grid-cols-3 gap-3 text-xs">
                    <div className="rounded border border-border bg-background p-2">
                      <div className="text-muted-foreground">Fees</div>
                      <div className="font-semibold text-sm mt-0.5">
                        {g.fees_text || (g.fees_inr ? `INR ${g.fees_inr.toLocaleString("en-IN")}` : "—")}
                      </div>
                      {g.discount_text && <div className="text-emerald-600 mt-0.5">{g.discount_text}</div>}
                    </div>
                    <div className="rounded border border-border bg-background p-2">
                      <div className="text-muted-foreground">Batch</div>
                      <div className="text-sm mt-0.5">{g.batch_info || "—"}</div>
                      <div className="text-muted-foreground mt-0.5">{g.start_date}</div>
                    </div>
                    <div className="rounded border border-border bg-background p-2">
                      <div className="text-muted-foreground">Eligibility</div>
                      <div className="text-sm mt-0.5">{g.eligibility || "—"}</div>
                    </div>
                  </div>

                  {g.short_description && (
                    <p className="text-sm text-muted-foreground italic">{g.short_description}</p>
                  )}

                  {g.highlights?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Highlights</div>
                      <div className="flex flex-wrap gap-1.5">
                        {g.highlights.map((h, i) => (
                          <Badge key={i} variant="secondary" className="text-[11px]">{h}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {g.curriculum?.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Curriculum</div>
                      <ol className="grid sm:grid-cols-2 gap-x-4 gap-y-0.5 text-sm list-decimal pl-5">
                        {g.curriculum.map((c, i) => <li key={i}>{c}</li>)}
                      </ol>
                    </div>
                  )}

                  <details className="text-sm">
                    <summary className="cursor-pointer text-primary font-medium">View full description</summary>
                    <div
                      className="prose prose-sm max-w-none mt-2 p-3 rounded border border-border bg-muted/20"
                      dangerouslySetInnerHTML={{ __html: g.description_html }}
                    />
                  </details>

                  {g.accuracy_notes && (
                    <div className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <ShieldCheck className="w-3 h-3 mt-0.5 shrink-0 text-emerald-600" />
                      <span>{g.accuracy_notes}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between sticky bottom-0 bg-background/95 backdrop-blur border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">
                Saved courses appear instantly under <strong>{selectedInst?.name}</strong> on the institute page.
              </p>
              <Button onClick={handleSaveAll} disabled={saving} size="lg">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Save {generated.filter(g => g._save).length} Courses
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminWriteCourses;
