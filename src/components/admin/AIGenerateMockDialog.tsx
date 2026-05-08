import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, CheckCircle2, AlertTriangle, ListPlus, Trash2, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MockGenerationProgressPanel from "@/components/admin/MockGenerationProgressPanel";
import { useMockGenerationProgress } from "@/hooks/useMockGenerationProgress";
import { Progress } from "@/components/ui/progress";

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
      { code: "DILR", name: "Data Interpretation & Logical Reasoning", duration: 40, questions: 20 },
      { code: "QA", name: "Quantitative Aptitude", duration: 40, questions: 22 },
    ],
  },
  XAT: {
    name: "XAT — Xavier Aptitude Test",
    default_total: 95,
    sections: [
      { code: "VALR", name: "Verbal & Logical Ability", duration: 50, questions: 26 },
      { code: "DM", name: "Decision Making", duration: 50, questions: 21 },
      { code: "QADI", name: "Quantitative Ability & Data Interpretation", duration: 50, questions: 28 },
      { code: "GK", name: "General Knowledge", duration: 15, questions: 20 },
    ],
  },
  SNAP: {
    name: "SNAP — Symbiosis",
    default_total: 60,
    sections: [
      { code: "GE", name: "General English", duration: 15, questions: 15 },
      { code: "AR", name: "Analytical & Logical Reasoning", duration: 25, questions: 25 },
      { code: "QADS", name: "Quantitative, Data Interpretation & Data Sufficiency", duration: 20, questions: 20 },
    ],
  },
  NMAT: {
    name: "NMAT by GMAC",
    default_total: 108,
    sections: [
      { code: "LS", name: "Language Skills", duration: 28, questions: 36 },
      { code: "LR", name: "Logical Reasoning", duration: 40, questions: 36 },
      { code: "QS", name: "Quantitative Skills", duration: 52, questions: 36 },
    ],
  },
  CMAT: {
    name: "CMAT",
    default_total: 100,
    sections: [
      { code: "QADI", name: "Quantitative Techniques & Data Interpretation", duration: 36, questions: 20 },
      { code: "LR", name: "Logical Reasoning", duration: 36, questions: 20 },
      { code: "LC", name: "Language Comprehension", duration: 36, questions: 20 },
      { code: "GA", name: "General Awareness", duration: 36, questions: 20 },
      { code: "IE", name: "Innovation & Entrepreneurship", duration: 36, questions: 20 },
    ],
  },
  IIFT: {
    name: "IIFT",
    default_total: 110,
    sections: [
      { code: "VARC", name: "Verbal Ability & Reading Comprehension", duration: 40, questions: 35 },
      { code: "QA", name: "Quantitative Analysis", duration: 35, questions: 25 },
      { code: "DILR", name: "Data Interpretation & Logical Reasoning", duration: 40, questions: 30 },
      { code: "GK", name: "General Knowledge & Current Affairs", duration: 25, questions: 20 },
    ],
  },
  MAT: {
    name: "MAT",
    default_total: 150,
    sections: [
      { code: "LC", name: "Language Comprehension", duration: 30, questions: 30 },
      { code: "ICR", name: "Intelligence & Critical Reasoning", duration: 30, questions: 30 },
      { code: "DA", name: "Data Analysis & Sufficiency", duration: 30, questions: 30 },
      { code: "MS", name: "Mathematical Skills", duration: 30, questions: 30 },
      { code: "IGE", name: "Indian & Global Environment", duration: 30, questions: 30 },
    ],
  },
};

const EXAMS = Object.entries(EXAM_PROFILES).map(([code, p]) => ({ code, name: p.name, default_total: p.default_total }));

const DAILY_MIX_LABELS: Record<string, string> = {
  CAT: "VARC, DILR and QA",
  XAT: "VALR, Decision Making and Quantitative Ability & DI",
  SNAP: "General English, Analytical Reasoning and Quant/DI",
  NMAT: "Language Skills, Logical Reasoning and Quantitative Skills",
  CMAT: "Quant/DI, Logical Reasoning and Language Comprehension",
  IIFT: "VARC, DILR and Quantitative Analysis",
  MAT: "Language Comprehension, Intelligence & Critical Reasoning and Data Analysis",
};

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
  { value: "very_hard", label: "Very Hard" },
  { value: "extremely_hard", label: "Extremely Hard" },
  { value: "cat_pyq", label: "CAT Level (Based on PYQ, values changed)" },
  { value: "mixed", label: "Mixed" },
];

const SECTION_CODES = [
  { value: "VARC", label: "VARC — Verbal & RC" },
  { value: "DILR", label: "DILR — DI & LR" },
  { value: "QA", label: "QA — Quantitative" },
  { value: "VALR", label: "VALR — Verbal & Logical Ability" },
  { value: "DM", label: "DM — Decision Making" },
  { value: "QADI", label: "QADI — Quant & DI" },
  { value: "LS", label: "LS — Language Skills" },
  { value: "LR", label: "LR — Logical Reasoning" },
  { value: "QS", label: "QS — Quantitative Skills" },
  { value: "GE", label: "GE — General English" },
  { value: "AR", label: "AR — Analytical Reasoning" },
  { value: "QADS", label: "QADS — Quant, DI & Sufficiency" },
  { value: "GK", label: "GK — General Awareness" },
  { value: "GA", label: "GA — General Awareness" },
  { value: "IE", label: "IE — Innovation & Entrepreneurship" },
  { value: "LC", label: "LC — Language Comprehension" },
  { value: "MS", label: "MS — Mathematical Skills" },
  { value: "DA", label: "DA — Data Analysis" },
  { value: "ICR", label: "ICR — Intelligence & Critical Reasoning" },
  { value: "IGE", label: "IGE — Indian & Global Environment" },
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
  sets: number; // passage/caselet sets (RCs in VARC, caselets in DILR, 0 for standalone-only sections like QA)
};

// Default number of sets (passages/caselets) per section per exam.
// 0 means questions are standalone (no shared passage/caselet).
const DEFAULT_SETS: Record<string, Record<string, number>> = {
  CAT:  { VARC: 3, DILR: 4, QA: 0 },
  XAT:  { VALR: 3, DM: 0, QADI: 0, GK: 0 },
  SNAP: { GE: 0, AR: 0, QADS: 0 },
  NMAT: { LS: 0, LR: 0, QS: 0 },
  CMAT: { QADI: 0, LR: 0, LC: 0, GA: 0, IE: 0 },
  IIFT: { VARC: 3, QA: 0, DILR: 4, GK: 0 },
  MAT: { LC: 0, ICR: 0, DA: 0, MS: 0, IGE: 0 },
};

type BatchDraft = {
  uid: string;
  label: string; // human summary
  exam_code: string;
  category: string;
  level: string;
  section_code: string | null;
  topic: string | null;
  questions_per_set: number;
  sets: number;
  test_name_prefix: string | null;
};

type BatchItemRow = {
  id: string;
  exam_code: string;
  category: string;
  level: string;
  section_code: string | null;
  topic: string | null;
  questions_per_set: number;
  sets: number;
  status: string;
  total_requested: number | null;
  total_generated: number | null;
  error_message: string | null;
  generation_id: string | null;
  started_at: string | null;
  finished_at: string | null;
};

export default function AIGenerateMockDialog({ open, onOpenChange, onCreated }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const progress = useMockGenerationProgress(step === 3 ? generationId : null);

  // ---------------- Batch (queue multiple generations) ----------------
  const [batch, setBatch] = useState<BatchDraft[]>([]);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchRequestId, setBatchRequestId] = useState<string | null>(null);
  const [batchItems, setBatchItems] = useState<BatchItemRow[]>([]);

  // When live generation completes, finalize result + advance step
  useEffect(() => {
    if (step !== 3 || !generationId || !progress.isComplete) return;
    (async () => {
      const { data: row } = await supabase
        .from("ai_mock_generations")
        .select("status, total_generated, total_rejected_duplicate, total_rejected_web_match, result_summary, error_message")
        .eq("id", generationId)
        .maybeSingle();
      if (!row) return;
      const summary = (row.result_summary || {}) as any;
      // Prefer authoritative totals from the row (updated by the worker rollup)
      // over summary.stats which is written once at queue time and stays at 0.
      setResult({
        ok: row.status === "completed",
        tests: summary.tests || [],
        stats: {
          generated: row.total_generated ?? summary.stats?.generated ?? 0,
          rejected_dup_db: row.total_rejected_duplicate ?? summary.stats?.rejected_dup_db ?? 0,
          rejected_dup_internet: row.total_rejected_web_match ?? summary.stats?.rejected_dup_internet ?? 0,
        },
      });
      toast({
        title: row.status === "completed" ? "Mock generation complete" : "Generation finished with errors",
        description: `${row.total_generated || 0} questions generated.`,
        variant: row.status === "completed" ? undefined : "destructive",
      });
      onCreated?.();
      setStep(2);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, generationId, progress.isComplete]);

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
  const [verifyInternet, setVerifyInternet] = useState(false);

  // NEW: per-section plan for Full-Length mocks
  const [sectionPlan, setSectionPlan] = useState<SectionRow[]>([]);

  const buildDefaultSectionPlan = (examCode: string): SectionRow[] => {
    const p = EXAM_PROFILES[examCode];
    if (!p) return [];
    const setsMap = DEFAULT_SETS[examCode] || {};
    // Exam-specific MCQ/TITA splits (CAT pattern)
    const splits: Record<string, Record<string, { mcq: number; tita: number }>> = {
      CAT: {
        VARC: { mcq: 19, tita: 5 },   // 24 total
        DILR: { mcq: 14, tita: 6 },   // 20 total
        QA:   { mcq: 15, tita: 7 },   // 22 total
      },
    };
    return p.sections.map((s) => {
      const override = splits[examCode]?.[s.code];
      const m = override ? override.mcq : Math.round(s.questions * 0.85);
      const t = override ? override.tita : Math.max(0, s.questions - m);
      return {
        code: s.code,
        name: s.name,
        duration: s.duration,
        questions: s.questions,
        mcq: m,
        tita: t,
        sets: setsMap[s.code] ?? 0,
      };
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
    if (category === "sectional" && !sectionCode) {
      toast({ title: "Please select a section for the Sectional Test", variant: "destructive" });
      return;
    }
    if (category === "topic" && !topic.trim()) {
      toast({ title: "Topic is required for Topic-wise Tests", description: "Every question will be strictly from this topic.", variant: "destructive" });
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
        // Daily tests are always mixed across QA/VARC/DILR — no single section.
        section_code: (category === "sectional" || category === "topic" || category === "practice") ? sectionCode : null,
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
          sets: Math.max(0, Number(r.sets) || 0),
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

      const newGenId = data?.generation_id;
      if (!newGenId) {
        // Legacy synchronous response
        setResult(data);
        setStep(2);
        toast({ title: "Mock generation complete", description: `${data?.stats?.generated || 0} questions generated.` });
        onCreated?.();
        return;
      }

      setGenerationId(newGenId);
      setStep(3);
      toast({
        title: "Generation started",
        description: "AI is writing your questions in the background. Watch progress below.",
      });
    } catch (e: any) {
      toast({ title: "Generation failed", description: e?.message || "Try again", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------- Batch helpers ----------------
  const validateCurrentForm = (): string | null => {
    if (category === "full_length") {
      // bulk-mock-worker uses default exam pattern; custom section_plan is not preserved.
      // Allow it but inform.
    } else if (mcq + tita !== perSet) {
      return "MCQ + TITA must equal Questions per set";
    }
    if (category === "sectional" && !sectionCode) return "Please select a section";
    if (category === "topic" && !topic.trim()) return "Topic is required for Topic-wise Tests";
    return null;
  };

  const summariseDraft = (d: Omit<BatchDraft, "uid" | "label">): string => {
    const parts: string[] = [d.exam_code, d.category.replace("_", " ")];
    if (d.section_code) parts.push(d.section_code);
    if (d.topic) parts.push(`"${d.topic}"`);
    parts.push(d.level);
    parts.push(`${d.questions_per_set}Q × ${d.sets} set${d.sets > 1 ? "s" : ""}`);
    return parts.join(" · ");
  };

  const addToBatch = () => {
    const err = validateCurrentForm();
    if (err) { toast({ title: err, variant: "destructive" }); return; }
    const draft: Omit<BatchDraft, "uid" | "label"> = {
      exam_code: exam,
      category,
      level,
      section_code: (category === "sectional" || category === "topic" || category === "practice") ? sectionCode : null,
      topic: topic || null,
      questions_per_set: category === "full_length" ? sectionPlanTotal : perSet,
      sets,
      test_name_prefix: namePrefix || null,
    };
    const item: BatchDraft = { ...draft, uid: crypto.randomUUID(), label: summariseDraft(draft) };
    setBatch((b) => [...b, item]);
    toast({ title: "Added to batch", description: item.label });
  };

  const removeFromBatch = (uid: string) => setBatch((b) => b.filter((x) => x.uid !== uid));

  const runBatch = async () => {
    if (!batch.length) return;
    setBatchSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("bulk-mock-worker", {
        body: {
          label: `${batch.length} mock${batch.length > 1 ? "s" : ""} from AI dialog`,
          items: batch.map((b) => ({
            exam_code: b.exam_code,
            category: b.category,
            level: b.level,
            section_code: b.section_code,
            topic: b.topic,
            questions_per_set: b.questions_per_set,
            sets: b.sets,
            test_name_prefix: b.test_name_prefix,
          })),
        },
      });
      if (error) throw error;
      const reqId = (data as any)?.request_id;
      if (!reqId) throw new Error("No request id returned");
      setBatchRequestId(reqId);
      setStep(4);
      toast({
        title: "Batch started",
        description: `${batch.length} requests queued. Generating in the background — live report below.`,
      });
    } catch (e: any) {
      toast({ title: "Batch start failed", description: e?.message || "Try again", variant: "destructive" });
    } finally {
      setBatchSubmitting(false);
    }
  };

  // Poll batch items + trigger reconcile while step 4 is open
  useEffect(() => {
    if (step !== 4 || !batchRequestId) return;
    let alive = true;
    const fetchItems = async () => {
      const { data } = await supabase
        .from("bulk_mock_request_items")
        .select("id, exam_code, category, level, section_code, topic, questions_per_set, sets, status, total_requested, total_generated, error_message, generation_id, started_at, finished_at")
        .eq("request_id", batchRequestId)
        .order("created_at", { ascending: true });
      if (!alive) return;
      setBatchItems((data ?? []) as BatchItemRow[]);
    };
    fetchItems();
    const t1 = setInterval(fetchItems, 3500);
    const t2 = setInterval(() => {
      // best-effort reconcile (ignored if not admin from edge runtime)
      supabase.functions.invoke("bulk-mock-worker", { body: { reconcile: true } }).catch(() => {});
    }, 6000);
    return () => { alive = false; clearInterval(t1); clearInterval(t2); };
  }, [step, batchRequestId]);

  const batchDone = batchItems.length > 0 && batchItems.every(
    (i) => i.status === "completed" || i.status === "failed" || i.status === "needs_review"
  );
  const batchProgressPct = batchItems.length === 0 ? 0
    : Math.round((batchItems.filter((i) => i.status !== "pending" && i.status !== "processing").length / batchItems.length) * 100);

  const close = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStep(1); setResult(null); setGenerationId(null);
      setBatch([]); setBatchRequestId(null); setBatchItems([]);
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
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
                  Daily Tests are always a balanced 3-section mix for {exam}: <strong>{DAILY_MIX_LABELS[exam] || "the first three exam sections"}</strong>. Section selection is disabled.
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
                      Set questions, MCQ/TITA split, sets (passages/caselets) and duration per section. AI generates accordingly. Use <strong>Sets = 0</strong> for sections with only standalone questions (e.g. QA).
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
                        <th className="px-2 py-2 font-medium w-20" title="Number of passages (VARC) / caselets (DILR) sharing context. 0 = standalone questions only.">Sets</th>
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
                              <Input type="number" min={0} className="h-8 text-xs"
                                value={row.sets}
                                onChange={(e) => updateSectionRow(idx, { sets: parseInt(e.target.value) || 0 })} />
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
                        <td className="px-2 py-1.5">{sectionPlan.reduce((s, r) => s + (r.sets || 0), 0)}</td>
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

            {/* ---------------- Batch queue (multi-request) ---------------- */}
            <Card className="p-3 border-primary/30 bg-primary/5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <ListPlus className="w-4 h-4 text-primary" /> Batch queue
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Configure each request above, then "Add to batch". Click "Run batch" to generate all in the background with a live report.
                  </p>
                </div>
                <Badge variant={batch.length ? "default" : "outline"}>{batch.length} queued</Badge>
              </div>

              {batch.length > 0 && (
                <div className="space-y-1.5 max-h-44 overflow-y-auto">
                  {batch.map((b, i) => (
                    <div key={b.uid} className="flex items-center justify-between gap-2 text-xs bg-background border rounded px-2 py-1.5">
                      <span className="text-muted-foreground w-5 text-right">{i + 1}.</span>
                      <span className="flex-1 truncate font-medium">{b.label}</span>
                      <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0"
                        onClick={() => removeFromBatch(b.uid)} title="Remove">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="button" size="sm" variant="outline" onClick={addToBatch}>
                  <ListPlus className="w-3.5 h-3.5 mr-1.5" /> Add to batch
                </Button>
                <Button type="button" size="sm" onClick={runBatch}
                  disabled={!batch.length || batchSubmitting}>
                  {batchSubmitting
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Starting…</>
                    : <><Play className="w-3.5 h-3.5 mr-1.5" /> Run batch ({batch.length})</>}
                </Button>
                {batch.length > 0 && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => setBatch([])}>
                    Clear
                  </Button>
                )}
              </div>
              {category === "full_length" && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  Note: batch runs use the standard exam pattern for Full-Length mocks. For a custom section plan, use Generate (single).
                </p>
              )}
            </Card>
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

        {step === 3 && (
          <div className="space-y-3">
            <MockGenerationProgressPanel
              key={generationId || "none"}
              generationId={generationId}
              onEdit={() => { setStep(1); }}
              onClosed={() => { setStep(1); setGenerationId(null); }}
            />
            <p className="text-[11px] text-muted-foreground">
              You can safely close this dialog — generation continues in the background and will appear in the Mock Tests list as it finishes.
              Use <strong>Pause</strong> to temporarily stop new questions, <strong>Cancel</strong> to stop entirely (already-saved questions are kept), or <strong>Edit settings</strong> to tweak the form and start a new run.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Play className="w-4 h-4 text-primary" /> Batch live report
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {batchItems.filter((i) => i.status === "completed").length} completed ·
                  {" "}{batchItems.filter((i) => i.status === "processing").length} processing ·
                  {" "}{batchItems.filter((i) => i.status === "pending").length} pending ·
                  {" "}{batchItems.filter((i) => i.status === "failed").length} failed ·
                  {" "}{batchItems.filter((i) => i.status === "needs_review").length} needs review
                </p>
              </div>
              <Badge variant={batchDone ? "outline" : "default"}>
                {batchDone ? "Done" : "Running"}
              </Badge>
            </div>
            <Progress value={batchProgressPct} className="h-2" />
            <div className="space-y-2 max-h-[55vh] overflow-y-auto">
              {batchItems.map((it, i) => {
                const generated = it.total_generated ?? 0;
                const requested = it.total_requested ?? (it.questions_per_set * it.sets);
                const pct = requested > 0 ? Math.min(100, Math.round((generated / requested) * 100)) : 0;
                const statusColor =
                  it.status === "completed" ? "text-emerald-700 border-emerald-300 bg-emerald-50" :
                  it.status === "failed" ? "text-destructive border-destructive/30 bg-destructive/5" :
                  it.status === "needs_review" ? "text-amber-700 border-amber-300 bg-amber-50" :
                  it.status === "processing" ? "text-primary border-primary/30 bg-primary/5" :
                  "text-muted-foreground border-border bg-muted/30";
                return (
                  <Card key={it.id} className="p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          #{i + 1}. {it.exam_code} · {it.category.replace("_", " ")}
                          {it.section_code ? ` · ${it.section_code}` : ""}
                          {it.topic ? ` · "${it.topic}"` : ""}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Level: {it.level} · {it.questions_per_set}Q × {it.sets} set{it.sets > 1 ? "s" : ""} · Generated {generated}/{requested}
                        </div>
                      </div>
                      <Badge variant="outline" className={`shrink-0 text-[10px] ${statusColor}`}>
                        {it.status}
                      </Badge>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                    {it.error_message && (
                      <p className="text-[11px] text-destructive">{it.error_message}</p>
                    )}
                    {/* Rich live telemetry — only for the currently processing item to keep it focused */}
                    {it.status === "processing" && it.generation_id && (
                      <div className="mt-2">
                        <MockGenerationProgressPanel generationId={it.generation_id} />
                      </div>
                    )}
                  </Card>
                );
              })}
              {batchItems.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Loading queued items…</p>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Generation runs in the background. You can close this dialog — the batch keeps running and finished mocks appear in the Mock Tests list.
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 1 && (
            <>
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button onClick={handleGenerate} disabled={submitting || (category === "full_length" ? !sectionPlanValid : mcq + tita !== perSet)}>
                {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting…</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate</>}
              </Button>
            </>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => { setStep(1); setResult(null); setGenerationId(null); }}>Generate More</Button>
              <Button onClick={close}>Done</Button>
            </>
          )}
          {step === 3 && (
            <Button variant="outline" onClick={close}>Run in background</Button>
          )}
          {step === 4 && (
            <>
              <Button variant="outline" onClick={() => { setStep(1); setBatchRequestId(null); setBatchItems([]); }}>
                Add more
              </Button>
              <Button onClick={close}>{batchDone ? "Done" : "Run in background"}</Button>
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
