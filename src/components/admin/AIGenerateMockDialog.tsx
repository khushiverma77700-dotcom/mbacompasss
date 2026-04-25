import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, CheckCircle2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const EXAMS = [
  { code: "CAT", name: "CAT — Common Admission Test", default_total: 66 },
  { code: "XAT", name: "XAT — Xavier Aptitude Test", default_total: 100 },
  { code: "SNAP", name: "SNAP — Symbiosis", default_total: 60 },
  { code: "NMAT", name: "NMAT by GMAC", default_total: 108 },
  { code: "CMAT", name: "CMAT", default_total: 100 },
];

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

  const handleGenerate = async () => {
    if (mcq + tita !== perSet) {
      toast({ title: "MCQ + TITA must equal Questions per set", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-mock-questions", {
        body: {
          exam_code: exam,
          category,
          level,
          total_questions: perSet,
          questions_per_set: perSet,
          total_mcq: mcq,
          total_tita: tita,
          sets,
          launch_date: launchDate || null,
          test_name_prefix: namePrefix || null,
          topic: topic || null,
          section_code: (category === "sectional" || category === "topic" || category === "daily" || category === "practice") ? sectionCode : null,
          verify_internet: verifyInternet,
        },
      });
      if (error) throw error;
      setResult(data);
      setStep(2);
      toast({ title: "Mock generation complete", description: `${data?.stats?.generated || 0} questions generated.` });
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

            {(category === "sectional" || category === "topic" || category === "daily" || category === "practice") && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Section</Label>
                  <Select value={sectionCode} onValueChange={setSectionCode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SECTION_CODES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {(category === "topic" || category === "practice" || category === "daily") && (
                  <div>
                    <Label className="text-xs">Topic (optional)</Label>
                    <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Time Speed Distance, RC, Syllogism" />
                  </div>
                )}
              </div>
            )}

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
                <Input type="number" min={0} value={mcq} onChange={(e) => setMcq(parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <Label className="text-xs">TITA per set</Label>
                <Input type="number" min={0} value={tita} onChange={(e) => setTita(parseInt(e.target.value) || 0)} />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-2">
              MCQ + TITA must equal {perSet}. Currently: <strong>{mcq + tita}</strong>
            </p>

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
              <Button onClick={handleGenerate} disabled={submitting || mcq + tita !== perSet}>
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
