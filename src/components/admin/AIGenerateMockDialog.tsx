import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Mirrors EXAM_PROFILES on the backend so the per-section editor
// for Full-Length mocks can prefill defaults.
const EXAM_PROFILES: Record<string, {
  name: string;
  default_total: number;
  sections: { code: string; name: string; duration: number; questions: number }[];
}> = {
  CAT: {
    name: "CAT — Common Admission Test",
    default_total: 66,
    sections: [
      { code: "VARC", name: "Verbal Ability & Reading Comprehension", duration: 40, questions: 24 },
      { code: "DILR", name: "Data Interpretation & Logical Reasoning", duration: 40, questions: 22 },
      { code: "QA", name: "Quantitative Aptitude", duration: 40, questions: 22 },
    ],
  },
  XAT: {
    name: "XAT — Xavier Aptitude Test",
    default_total: 100,
    sections: [
      { code: "VARC", name: "Verbal & Logical Ability", duration: 50, questions: 26 },
      { code: "DILR", name: "Decision Making", duration: 50, questions: 22 },
      { code: "QA", name: "Quantitative Ability & DI", duration: 50, questions: 28 },
      { code: "GK", name: "General Knowledge", duration: 15, questions: 24 },
    ],
  },
  SNAP: {
    name: "SNAP — Symbiosis",
    default_total: 60,
    sections: [
      { code: "VARC", name: "General English", duration: 20, questions: 15 },
      { code: "DILR", name: "Analytical & Logical Reasoning", duration: 30, questions: 25 },
      { code: "QA", name: "Quant, DI & Sufficiency", duration: 10, questions: 20 },
    ],
  },
  NMAT: {
    name: "NMAT by GMAC",
    default_total: 108,
    sections: [
      { code: "VARC", name: "Language Skills", duration: 28, questions: 36 },
      { code: "DILR", name: "Logical Reasoning", duration: 40, questions: 36 },
      { code: "QA", name: "Quantitative Skills", duration: 52, questions: 36 },
    ],
  },
  CMAT: {
    name: "CMAT",
    default_total: 100,
    sections: [
      { code: "QA", name: "Quantitative Techniques & DI", duration: 45, questions: 20 },
      { code: "DILR", name: "Logical Reasoning", duration: 45, questions: 20 },
      { code: "VARC", name: "Language Comprehension", duration: 45, questions: 20 },
      { code: "GK", name: "General Awareness", duration: 30, questions: 20 },
      { code: "QA-IE", name: "Innovation & Entrepreneurship", duration: 15, questions: 20 },
    ],
  },
};

const EXAMS = Object.entries(EXAM_PROFILES).map(([code, p]) => ({ code, name: p.name, default_total: p.default_total }));

const CATEGORIES = [
  { value: "sectional", label: "Sectional Test" },
  { value: "topic", label: "Topic-wise Test" },
  { value: "full_length", label: "Full Length" },
  { value: "daily", label: "Daily Test" },
  { value: "practice", label: "Practice Questions" },
];

const LEVELS = [
  { value: "easy", label: "Easy" },
  { value: "moderate", label: "Moderate" },
  { value: "hard", label: "Hard" },
  { value: "mixed", label: "Mixed" },
];

const SECTION_CODES = [
  { value: "VARC", label: "VARC — Verbal & RC" },
  { value: "DILR", label: "DILR — DI & LR" },
  { value: "QA", label: "QA — Quantitative" },
  { value: "GK", label: "GK — General Awareness" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}

type SectionRow = {
  code: string;
  name: string;
  duration: number;
  questions: number;
  mcq: number;
  tita: number;
};

export default function AIGenerateMockDialog({ open, onOpenChange, onCreated }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [exam, setExam] = useState("CAT");
  const [category, setCategory] = useState("full_length");
  const [level, setLevel] = useState("mixed");
  const [totalQ, setTotalQ] = useState(66);
  const [sets, setSets] = useState(1);
  const [perSet, setPerSet] = useState(66);
  const [mcq, setMcq] = useState(56);
  const [tita, setTita] = useState(10);
  const [launchDate, setLaunchDate] = useState<string>("");
  const [namePrefix, setNamePrefix] = useState("");
  const [topic, setTopic] = useState("");
  const [sectionCode, setSectionCode] = useState("QA");
  const [verifyInternet, setVerifyInternet] = useState(true);

  // NEW: per-section plan for Full-Length mocks
  const [sectionPlan, setSectionPlan] = useState<SectionRow[]>([]);

  const buildDefaultSectionPlan = (examCode: string): SectionRow[] => {
    const p = EXAM_PROFILES[examCode];
    if (!p) return [];
    return p.sections.map((s) => {
      const m = Math.round(s.questions * 0.85);
      return { code: s.code, name: s.name, duration: s.duration, questions: s.questions, mcq: m, tita: Math.max(0, s.questions - m) };
    });
  };

  // Initialise section plan when exam or category changes to full_length
  useEffect(() => {
    if (category === "full_length") {
      setSectionPlan(buildDefaultSectionPlan(exam));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, category]);

  // Auto-fill defaults when exam changes
  const onExamChange = (code: string) => {
    setExam(code);
    const e = EXAMS.find((x) => x.code === code);
    if (e) {
      setTotalQ(e.default_total);
      setPerSet(e.default_total);
      setMcq(Math.round(e.default_total * 0.85));
      setTita(e.default_total - Math.round(e.default_total * 0.85));
    }
  };

  const onPerSetChange = (n: number) => {
    setPerSet(n);
    setTotalQ(n);
    const m = Math.round(n * 0.85);
    setMcq(m);
    setTita(Math.max(0, n - m));
  };

  // Keep MCQ + TITA in sync with perSet — when user edits one, auto-adjust the other.
  const onMcqChange = (n: number) => {
    const clamped = Math.max(0, Math.min(perSet, n));
    setMcq(clamped);
    setTita(Math.max(0, perSet - clamped));
  };
  const onTitaChange = (n: number) => {
    const clamped = Math.max(0, Math.min(perSet, n));
    setTita(clamped);
    setMcq(Math.max(0, perSet - clamped));
  };
  const autoBalance = () => {
    const m = Math.round(perSet * 0.85);
    setMcq(m);
    setTita(Math.max(0, perSet - m));
  };

  // ---------------- Section-plan editing helpers (Full Length only) ----------------
  const updateSectionRow = (idx: number, patch: Partial<SectionRow>) => {
    setSectionPlan((prev) => prev.map((row, i) => {
      if (i !== idx) return row;
      let next: SectionRow = { ...row, ...patch };
      // If questions changed, auto-rebalance mcq/tita to keep sum equal.
      if (patch.questions !== undefined) {
        const q = Math.max(0, Number(patch.questions) || 0);
        const m = Math.min(q, Math.round(q * 0.85));
        next = { ...next, questions: q, mcq: m, tita: Math.max(0, q - m) };
      }
      // If mcq edited, force tita = questions - mcq
      if (patch.mcq !== undefined) {
        const m = Math.max(0, Math.min(next.questions, Number(patch.mcq) || 0));
        next = { ...next, mcq: m, tita: Math.max(0, next.questions - m) };
      }
      // If tita edited, force mcq = questions - tita
      if (patch.tita !== undefined) {
        const t = Math.max(0, Math.min(next.questions, Number(patch.tita) || 0));
        next = { ...next, tita: t, mcq: Math.max(0, next.questions - t) };
      }
      return next;
    }));
  };

  const sectionPlanTotal = sectionPlan.reduce((s, r) => s + (Number(r.questions) || 0), 0);
  const sectionPlanValid = category !== "full_length" || (sectionPlan.length > 0 && sectionPlan.every(r => r.mcq + r.tita === r.questions && r.questions > 0));

  const handleGenerate = async () => {
    if (category !== "full_length" && mcq + tita !== perSet) {
      toast({ title: "MCQ + TITA must equal Questions per set", variant: "destructive" });
      return;
    }
    if (category === "full_length" && !sectionPlanValid) {
      toast({ title: "Each section must have MCQ + TITA equal to Questions", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const isFullLength = category === "full_length";
      const payload: any = {
        exam_code: exam,
        category,
        level,
        sets,
        launch_date: launchDate || null,
        test_name_prefix: namePrefix || null,
        topic: topic || null,
        section_code: (category === "sectional" || category === "topic" || category === "daily" || category === "practice") ? sectionCode : null,
        verify_internet: verifyInternet,
      };
      if (isFullLength) {
        payload.section_plan = sectionPlan.map((r, idx) => ({
          code: r.code,
          name: r.name,
          duration: Number(r.duration) || 40,
          questions: Number(r.questions) || 0,
          mcq: Number(r.mcq) || 0,
          tita: Number(r.tita) || 0,
          sort: idx,
        }));
        payload.total_questions = sectionPlanTotal;
        payload.questions_per_set = sectionPlanTotal;
        payload.total_mcq = sectionPlan.reduce((s, r) => s + (Number(r.mcq) || 0), 0);
        payload.total_tita = sectionPlan.reduce((s, r) => s + (Number(r.tita) || 0), 0);
      } else {
        payload.total_questions = perSet;
        payload.questions_per_set = perSet;
        payload.total_mcq = mcq;
        payload.total_tita = tita;
      }

      const { data, error } = await supabase.functions.invoke("generate-mock-questions", { body: payload });
      if (error) throw error;

      const generationId = data?.generation_id;
      if (!generationId) {
        // Legacy synchronous response
        setResult(data);
        setStep(2);
        toast({ title: "Mock generation complete", description: `${data?.stats?.generated || 0} questions generated.` });
        onCreated?.();
        return;
      }

      toast({
        title: "Generation started",
        description: "AI is writing your questions in the background. This may take a few minutes.",
      });

      // Poll the ai_mock_generations row until completion (max ~10 minutes)
      const start = Date.now();
      const maxMs = 10 * 60 * 1000;
      let finalRow: any = null;
      while (Date.now() - start < maxMs) {
        await new Promise((r) => setTimeout(r, 4000));
        const { data: row } = await supabase
          .from("ai_mock_generations")
          .select("status, total_generated, total_rejected_duplicate, total_rejected_web_match, result_summary, error_message")
          .eq("id", generationId)
          .maybeSingle();
        if (!row) continue;
        if (row.status === "completed" || row.status === "failed") {
          finalRow = row;
          break;
        }
      }

      if (!finalRow) {
        toast({
          title: "Still generating",
          description: "Taking longer than expected. Check the Mock Tests list shortly.",
        });
        onCreated?.();
        return;
      }

      if (finalRow.status === "failed") {
        throw new Error(finalRow.error_message || "Generation failed");
      }

      const summary = (finalRow.result_summary || {}) as any;
      setResult({
        ok: true,
        tests: summary.tests || [],
        stats: summary.stats || {
          generated: finalRow.total_generated || 0,
          rejected_dup_db: finalRow.total_rejected_duplicate || 0,
          rejected_dup_internet: finalRow.total_rejected_web_match || 0,
        },
      });
      setStep(2);
      toast({
        title: "Mock generation complete",
        description: `${finalRow.total_generated || 0} questions generated.`,
      });
      onCreated?.();
    } catch (e: any) {
      toast({ title: "Generation failed", description: e?.message || "Try again", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    onOpenChange(false);
    setTimeout(() => { setStep(1); setResult(null); }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Generate Mocks From AI
          </DialogTitle>
          <DialogDescription>
            AI generates 100% original questions with detailed step-by-step explanations.
            Each question is hash-checked against your DB and (optionally) verified against the public web.
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Exam *</Label>
                <Select value={exam} onValueChange={onExamChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EXAMS.map((e) => <SelectItem key={e.code} value={e.code}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Category of Mock *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(category === "sectional" || category === "topic" || category === "practice") && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">
                    Section <span className="text-destructive">*</span>
                  </Label>
                  <Select value={sectionCode} onValueChange={setSectionCode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SECTION_CODES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {category === "sectional"
                      ? "All questions will come from this section only."
                      : category === "topic"
                      ? "Parent section for the chosen topic."
                      : "Section to draw practice questions from."}
                  </p>
                </div>
                {(category === "topic" || category === "practice") && (
                  <div>
                    <Label className="text-xs">
                      Topic {category === "topic" && <span className="text-destructive">*</span>}
                    </Label>
                    <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Time Speed Distance, RC, Syllogism" />
                    {category === "topic" && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Every question will be strictly from this topic — no mixing.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {category === "daily" && (
              <Card className="p-3 bg-primary/5 border-primary/20">
                <Label className="text-sm font-semibold">Daily Test mix</Label>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Daily Tests are always a balanced mix: <strong>~33% Quant</strong>, <strong>~33% VARC</strong> and <strong>~33% DILR</strong>. Section selection is disabled.
                </p>
              </Card>
            )}

            {/* Full-Length: per-section editor */}
            {category === "full_length" && (
              <Card className="p-3 border-primary/20 bg-primary/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-semibold">Section-wise plan ({exam})</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Set questions, MCQ/TITA split and duration for each section. AI will generate accordingly.
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs"
                    onClick={() => setSectionPlan(buildDefaultSectionPlan(exam))}>
                    Reset to {exam} pattern
                  </Button>
                </div>

                <div className="overflow-x-auto rounded border bg-background">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40">
                      <tr className="text-left">
                        <th className="px-2 py-2 font-medium">Section</th>
                        <th className="px-2 py-2 font-medium w-20">Questions</th>
                        <th className="px-2 py-2 font-medium w-20">MCQ</th>
                        <th className="px-2 py-2 font-medium w-20">TITA</th>
                        <th className="px-2 py-2 font-medium w-24">Duration (m)</th>
                        <th className="px-2 py-2 font-medium w-20">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sectionPlan.map((row, idx) => {
                        const ok = row.mcq + row.tita === row.questions && row.questions > 0;
                        return (
                          <tr key={`${row.code}-${idx}`} className="border-t">
                            <td className="px-2 py-1.5">
                              <div className="font-medium">{row.code}</div>
                              <div className="text-[10px] text-muted-foreground line-clamp-1">{row.name}</div>
                            </td>
                            <td className="px-2 py-1.5">
                              <Input type="number" min={0} className="h-8 text-xs"
                                value={row.questions}
                                onChange={(e) => updateSectionRow(idx, { questions: parseInt(e.target.value) || 0 })} />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input type="number" min={0} max={row.questions} className="h-8 text-xs"
                                value={row.mcq}
                                onChange={(e) => updateSectionRow(idx, { mcq: parseInt(e.target.value) || 0 })} />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input type="number" min={0} max={row.questions} className="h-8 text-xs"
                                value={row.tita}
                                onChange={(e) => updateSectionRow(idx, { tita: parseInt(e.target.value) || 0 })} />
                            </td>
                            <td className="px-2 py-1.5">
                              <Input type="number" min={1} className="h-8 text-xs"
                                value={row.duration}
                                onChange={(e) => updateSectionRow(idx, { duration: parseInt(e.target.value) || 1 })} />
                            </td>
                            <td className="px-2 py-1.5">
                              {ok
                                ? <Badge variant="outline" className="text-emerald-700 border-emerald-300">OK</Badge>
                                : <Badge variant="destructive" className="text-[10px]">Mismatch</Badge>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-muted/30">
                      <tr className="border-t font-medium">
                        <td className="px-2 py-1.5">Totals</td>
                        <td className="px-2 py-1.5">{sectionPlanTotal}</td>
                        <td className="px-2 py-1.5">{sectionPlan.reduce((s, r) => s + r.mcq, 0)}</td>
                        <td className="px-2 py-1.5">{sectionPlan.reduce((s, r) => s + r.tita, 0)}</td>
                        <td className="px-2 py-1.5">{sectionPlan.reduce((s, r) => s + r.duration, 0)} min</td>
                        <td className="px-2 py-1.5"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </Card>
            )}

            {/* Non-full-length: simple total controls */}
            {category !== "full_length" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Number of Questions (per set)</Label>
                    <Input type="number" min={1} value={perSet} onChange={(e) => onPerSetChange(parseInt(e.target.value) || 1)} />
                    <p className="text-[11px] text-muted-foreground mt-1">Auto-filled from exam pattern, editable.</p>
                  </div>
                  <div>
                    <Label className="text-xs">Level of Question</Label>
                    <Select value={level} onValueChange={setLevel}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Number of Sets</Label>
                    <Input type="number" min={1} max={10} value={sets} onChange={(e) => setSets(parseInt(e.target.value) || 1)} />
                  </div>
                  <div>
                    <Label className="text-xs">MCQs per set</Label>
                    <Input type="number" min={0} max={perSet} value={mcq} onChange={(e) => onMcqChange(parseInt(e.target.value) || 0)} />
                  </div>
                  <div>
                    <Label className="text-xs">TITA per set</Label>
                    <Input type="number" min={0} max={perSet} value={tita} onChange={(e) => onTitaChange(parseInt(e.target.value) || 0)} />
                  </div>
                </div>
                <div className="flex items-center justify-between -mt-2">
                  <p className="text-[11px] text-muted-foreground">
                    MCQ + TITA must equal {perSet}. Currently: <strong className={mcq + tita === perSet ? "text-emerald-600" : "text-destructive"}>{mcq + tita}</strong>
                  </p>
                  {mcq + tita !== perSet && (
                    <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={autoBalance}>
                      Auto-balance
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* Full-Length still needs Sets + Level */}
            {category === "full_length" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Number of Sets</Label>
                  <Input type="number" min={1} max={10} value={sets} onChange={(e) => setSets(parseInt(e.target.value) || 1)} />
                  <p className="text-[11px] text-muted-foreground mt-1">Each set is a separate full-length mock.</p>
                </div>
                <div>
                  <Label className="text-xs">Level of Question</Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Date of Launch</Label>
                <Input type="date" value={launchDate} onChange={(e) => setLaunchDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Test Name Prefix (optional)</Label>
                <Input value={namePrefix} onChange={(e) => setNamePrefix(e.target.value)} placeholder="e.g. CAT 2026 Series A" />
              </div>
            </div>

            <Card className="p-3 bg-muted/30 border-primary/20">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold">Verify against the public web</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Uses Firecrawl to search exact-phrase matches. Slower (~+1s/question) but enforces uniqueness.
                  </p>
                </div>
                <Switch checked={verifyInternet} onCheckedChange={setVerifyInternet} />
              </div>
            </Card>

            <div className="bg-primary/5 rounded-md p-3 text-xs space-y-1">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Quality guarantees
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                <li>All questions match the chosen difficulty level</li>
                <li>Hash-deduplicated against your existing question bank</li>
                <li>Verified unique against the public web (when enabled)</li>
                <li>Every question includes a 200–400 word step-by-step explanation</li>
                <li>Tagged with topic and subtopic for analytics</li>
              </ul>
            </div>
          </div>
        )}

        {step === 2 && result && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Generated" value={result?.stats?.generated ?? 0} ok />
              <Stat label="DB Duplicates Rejected" value={result?.stats?.rejected_dup_db ?? 0} />
              <Stat label="Web Match Rejected" value={result?.stats?.rejected_dup_internet ?? 0} />
            </div>
            <div>
              <Label className="text-xs">Created Mock Tests</Label>
              <div className="space-y-2 mt-2">
                {(result?.tests || []).map((t: any) => (
                  <Card key={t.id} className="p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{t.name}</div>
                      <div className="text-xs text-muted-foreground">/{t.slug}</div>
                    </div>
                    <Badge variant="outline">Draft</Badge>
                  </Card>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex items-start gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              Tests are created as <strong>Draft</strong>. Review questions in the Builder, then publish.
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 1 && (
            <>
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button onClick={handleGenerate} disabled={submitting || (category === "full_length" ? !sectionPlanValid : mcq + tita !== perSet)}>
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating… (may take 1–3 min)</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate</>}
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => { setStep(1); setResult(null); }}>Generate More</Button>
              <Button onClick={close}>Done</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, ok }: { label: string; value: number; ok?: boolean }) {
  return (
    <Card className={`p-3 ${ok ? "border-emerald-200 bg-emerald-50/50" : ""}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${ok ? "text-emerald-700" : "text-foreground"}`}>{value}</div>
    </Card>
  );
}
