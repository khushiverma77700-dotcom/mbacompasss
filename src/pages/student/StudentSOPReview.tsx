import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Sparkles, FileText, Upload, Loader2, CheckCircle2, AlertTriangle,
  Download, RotateCcw, ArrowLeft, ArrowRight, ChevronRight, Wand2,
} from "lucide-react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from "recharts";
import jsPDF from "jspdf";

type Form = {
  sop_text: string;
  file_name: string | null;
  target_colleges: string;
  country_preference: string;
  deadline: string;
  experience_years: string;
  current_role: string;
  academic_background: string;
  major_achievements: string;
  target_course: string;
  specialization: string;
  why_course: string;
  short_term_goals: string;
  long_term_goals: string;
  why_college: string;
  strengths: string;
  weaknesses: string;
  highlight_focus: string[];
  tone_preference: string;
};

const empty: Form = {
  sop_text: "", file_name: null,
  target_colleges: "", country_preference: "", deadline: "",
  experience_years: "", current_role: "", academic_background: "", major_achievements: "",
  target_course: "MBA", specialization: "", why_course: "",
  short_term_goals: "", long_term_goals: "", why_college: "",
  strengths: "", weaknesses: "",
  highlight_focus: [], tone_preference: "Formal",
};

const HIGHLIGHTS = ["Leadership", "Career growth", "Technical skills", "Personal story"];
const TONES = ["Formal", "Storytelling", "Analytical"];
const COURSES = ["MBA", "MS", "MIM", "PhD", "Executive MBA", "Other"];

const PROCESSING_STEPS = [
  "Parsing your SOP",
  "Understanding your profile",
  "Evaluating structure & flow",
  "Generating detailed feedback",
  "Finalizing your report",
];

export default function StudentSOPReview() {
  const { user } = useAuth();
  const [step, setStep] = useState<"form" | "processing" | "report">("form");
  const [form, setForm] = useState<Form>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [processIndex, setProcessIndex] = useState(0);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const wordCount = useMemo(
    () => form.sop_text.trim().split(/\s+/).filter(Boolean).length,
    [form.sop_text]
  );

  useEffect(() => {
    if (!user) return;
    supabase.from("sop_reviews")
      .select("id, created_at, target_colleges, target_course, overall_score, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setHistory(data || []));
  }, [user, step]);

  useEffect(() => {
    if (step !== "processing") return;
    const t = setInterval(() => {
      setProcessIndex((i) => (i < PROCESSING_STEPS.length - 1 ? i + 1 : i));
    }, 1800);
    return () => clearInterval(t);
  }, [step]);

  const set = (k: keyof Form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const toggleHighlight = (h: string) => {
    setForm((f) => ({
      ...f,
      highlight_focus: f.highlight_focus.includes(h)
        ? f.highlight_focus.filter((x) => x !== h)
        : [...f.highlight_focus, h],
    }));
  };

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10 MB.", variant: "destructive" });
      return;
    }
    const name = file.name.toLowerCase();
    try {
      let text = "";
      if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
        text = await file.text();
      } else if (name.endsWith(".pdf") || file.type === "application/pdf") {
        toast({ title: "Parsing PDF...", description: "Extracting text, please wait." });
        const pdfjs: any = await import("pdfjs-dist");
        // @ts-ignore - worker URL
        const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
        const buf = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: buf }).promise;
        const parts: string[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          parts.push(content.items.map((it: any) => it.str).join(" "));
        }
        text = parts.join("\n\n").replace(/\s+\n/g, "\n").trim();
      } else if (name.endsWith(".docx")) {
        toast({ title: "Parsing DOCX...", description: "Extracting text, please wait." });
        const mammoth: any = await import("mammoth/mammoth.browser");
        const buf = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buf });
        text = (result.value || "").trim();
      } else if (name.endsWith(".doc")) {
        toast({
          title: "Legacy .doc not supported",
          description: "Please save as .docx or .pdf, or paste the text below.",
          variant: "destructive",
        });
        return;
      } else {
        toast({
          title: "Unsupported format",
          description: "Upload .pdf, .docx, .txt or .md — or paste text below.",
          variant: "destructive",
        });
        return;
      }

      if (!text || text.length < 50) {
        toast({
          title: "Could not extract text",
          description: "The file appears empty or scanned. Please paste the SOP text manually.",
          variant: "destructive",
        });
        set("file_name", file.name);
        return;
      }

      set("sop_text", text);
      set("file_name", file.name);
      toast({ title: "File loaded", description: `${file.name} parsed (${text.split(/\s+/).filter(Boolean).length} words).` });
    } catch (err: any) {
      console.error("File parse error", err);
      toast({
        title: "Failed to parse file",
        description: err?.message || "Please paste the SOP text manually.",
        variant: "destructive",
      });
    }
  };

  const submit = async () => {
    if (!user) {
      toast({ title: "Login required", variant: "destructive" });
      return;
    }
    if (wordCount < 200) {
      toast({ title: "SOP too short", description: "Minimum 200 words.", variant: "destructive" });
      return;
    }
    if (!form.target_course || !form.target_colleges.trim()) {
      toast({ title: "Missing required fields", description: "Target course & colleges required.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data: inserted, error: iErr } = await supabase
        .from("sop_reviews")
        .insert({
          user_id: user.id,
          sop_text: form.sop_text,
          file_name: form.file_name,
          target_colleges: form.target_colleges || null,
          country_preference: form.country_preference || null,
          deadline: form.deadline || null,
          experience_years: form.experience_years ? Number(form.experience_years) : null,
          current_role_text: form.current_role || null,
          academic_background: form.academic_background || null,
          major_achievements: form.major_achievements || null,
          target_course: form.target_course || null,
          specialization: form.specialization || null,
          why_course: form.why_course || null,
          short_term_goals: form.short_term_goals || null,
          long_term_goals: form.long_term_goals || null,
          why_college: form.why_college || null,
          strengths: form.strengths || null,
          weaknesses: form.weaknesses || null,
          highlight_focus: form.highlight_focus,
          tone_preference: form.tone_preference || null,
          status: "pending",
        })
        .select("id")
        .single();
      if (iErr || !inserted) throw iErr || new Error("Insert failed");

      setReviewId(inserted.id);
      setStep("processing");
      setProcessIndex(0);

      const { data, error } = await supabase.functions.invoke("sop-review", {
        body: { reviewId: inserted.id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      setEvaluation((data as any).evaluation);
      setStep("report");
    } catch (e: any) {
      console.error(e);
      toast({ title: "Review failed", description: e?.message || "Try again.", variant: "destructive" });
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setForm(empty);
    setEvaluation(null);
    setReviewId(null);
    setStep("form");
  };

  const downloadPdf = () => {
    if (!evaluation) return;
    const doc = new jsPDF();
    let y = 14;
    const line = (t: string, size = 11, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      const wrapped = doc.splitTextToSize(t, 180);
      wrapped.forEach((w: string) => {
        if (y > 280) { doc.addPage(); y = 14; }
        doc.text(w, 14, y);
        y += size * 0.5;
      });
      y += 2;
    };
    line("AI SOP Review Report", 18, true);
    line(`Overall Score: ${evaluation.overall_score}/100  —  ${evaluation.verdict}`, 13, true);
    line(" ");
    line("Section Scores", 14, true);
    Object.entries(evaluation.section_scores || {}).forEach(([k, v]) =>
      line(`${k.replace(/_/g, " ")}: ${v}/10`)
    );
    line(" ");
    line("Strengths", 14, true);
    (evaluation.strengths || []).forEach((s: string, i: number) => line(`${i + 1}. ${s}`));
    line(" ");
    line("Weaknesses", 14, true);
    (evaluation.weaknesses || []).forEach((s: string, i: number) => line(`${i + 1}. ${s}`));
    line(" ");
    line("Detailed Feedback", 14, true);
    Object.entries(evaluation.detailed_feedback || {}).forEach(([k, v]) => {
      line(k.replace(/_/g, " ").toUpperCase(), 12, true);
      line(String(v));
    });
    line("Improvement Suggestions", 14, true);
    (evaluation.improvement_suggestions || []).forEach((s: string, i: number) => line(`${i + 1}. ${s}`));
    doc.save("SOP-Review-Report.pdf");
  };

  // ---------- RENDER ----------
  if (step === "processing") return <Processing index={processIndex} />;
  if (step === "report" && evaluation) {
    return <Report evaluation={evaluation} onReset={reset} onDownload={downloadPdf} />;
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" /> AI-Powered
          </div>
          <h1 className="text-2xl font-bold">AI SOP Review</h1>
          <p className="text-sm text-muted-foreground">
            Get a deep, structured evaluation of your Statement of Purpose with section-wise scores and actionable feedback.
          </p>
        </div>
      </div>

      {/* Upload */}
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-sky-600" /> Your SOP</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex-1 border-2 border-dashed border-sky-200 rounded-lg p-4 text-center cursor-pointer hover:bg-sky-50 transition">
            <Upload className="h-5 w-5 text-sky-600 mx-auto mb-1" />
            <div className="text-sm font-medium">Upload SOP (.txt)</div>
            <div className="text-xs text-muted-foreground">For PDF/DOC, paste text on the right</div>
            <input
              type="file"
              accept=".txt,.md,text/plain"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
          <div className="flex-[2] space-y-2">
            <Textarea
              placeholder="Paste or write your SOP here (minimum 200 words)..."
              value={form.sop_text}
              onChange={(e) => set("sop_text", e.target.value)}
              className="min-h-[180px] text-sm"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{form.file_name ? `Loaded: ${form.file_name}` : "No file"}</span>
              <span className={wordCount < 200 ? "text-red-600" : "text-emerald-600 font-medium"}>
                {wordCount} words {wordCount < 200 && "(min 200)"}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Target college */}
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Target & Course</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Target College(s) *">
            <Input value={form.target_colleges} onChange={(e) => set("target_colleges", e.target.value)} placeholder="e.g. ISB, IIM-A, Wharton" />
          </Field>
          <Field label="Country preference">
            <Input value={form.country_preference} onChange={(e) => set("country_preference", e.target.value)} placeholder="e.g. India, USA" />
          </Field>
          <Field label="Application deadline">
            <Input type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
          </Field>
          <Field label="Target course *">
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.target_course} onChange={(e) => set("target_course", e.target.value)}>
              {COURSES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Specialization">
            <Input value={form.specialization} onChange={(e) => set("specialization", e.target.value)} placeholder="e.g. Finance, Marketing" />
          </Field>
          <Field label="Why this course?">
            <Input value={form.why_course} onChange={(e) => set("why_course", e.target.value)} placeholder="One-line reason" />
          </Field>
        </div>
      </Card>

      {/* Background */}
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Academic & Professional Background</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Years of experience">
            <Input type="number" min={0} step={0.5} value={form.experience_years} onChange={(e) => set("experience_years", e.target.value)} />
          </Field>
          <Field label="Current / last role">
            <Input value={form.current_role} onChange={(e) => set("current_role", e.target.value)} placeholder="e.g. Senior Analyst, Deloitte" />
          </Field>
          <Field label="Academic background" full>
            <Input value={form.academic_background} onChange={(e) => set("academic_background", e.target.value)} placeholder="Degree + College" />
          </Field>
          <Field label="Major achievements" full>
            <Textarea rows={2} value={form.major_achievements} onChange={(e) => set("major_achievements", e.target.value)} placeholder="Awards, promotions, leadership roles..." />
          </Field>
        </div>
      </Card>

      {/* Personal */}
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Goals & Personal Inputs</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Short-term goals">
            <Textarea rows={2} value={form.short_term_goals} onChange={(e) => set("short_term_goals", e.target.value)} />
          </Field>
          <Field label="Long-term goals">
            <Textarea rows={2} value={form.long_term_goals} onChange={(e) => set("long_term_goals", e.target.value)} />
          </Field>
          <Field label="Why this college?">
            <Textarea rows={2} value={form.why_college} onChange={(e) => set("why_college", e.target.value)} />
          </Field>
          <Field label="Strengths">
            <Textarea rows={2} value={form.strengths} onChange={(e) => set("strengths", e.target.value)} />
          </Field>
          <Field label="Weaknesses" full>
            <Textarea rows={2} value={form.weaknesses} onChange={(e) => set("weaknesses", e.target.value)} />
          </Field>
        </div>
      </Card>

      {/* Intent check */}
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">SOP Intent Check</h2>
        <div>
          <Label className="mb-2 block">What should your SOP highlight?</Label>
          <div className="flex flex-wrap gap-2">
            {HIGHLIGHTS.map((h) => {
              const on = form.highlight_focus.includes(h);
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => toggleHighlight(h)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    on ? "bg-sky-600 text-white border-sky-600" : "bg-white text-slate-700 border-slate-300 hover:border-sky-400"
                  }`}
                >
                  {h}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <Label className="mb-2 block">Tone preference</Label>
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => {
              const on = form.tone_preference === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("tone_preference", t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    on ? "bg-sky-600 text-white border-sky-600" : "bg-white text-slate-700 border-slate-300 hover:border-sky-400"
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="sticky bottom-2 z-10 bg-white/80 backdrop-blur border rounded-lg p-3 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Powered by GPT — typically takes 20-40 seconds.
        </div>
        <Button onClick={submit} disabled={submitting} size="lg" className="bg-sky-600 hover:bg-sky-700">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          Generate Review
        </Button>
      </div>

      {history.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Previous Reviews</h2>
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-b-0">
                <div>
                  <div className="font-medium">{h.target_colleges || "Untitled"} — {h.target_course || "—"}</div>
                  <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  {h.status === "completed" ? (
                    <span className="font-bold text-sky-700">{h.overall_score}/100</span>
                  ) : (
                    <span className="text-xs uppercase text-muted-foreground">{h.status}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <Label className="mb-1.5 block text-xs font-medium text-slate-700">{label}</Label>
      {children}
    </div>
  );
}

function Processing({ index }: { index: number }) {
  const pct = Math.round(((index + 1) / PROCESSING_STEPS.length) * 100);
  return (
    <div className="max-w-2xl mx-auto py-12">
      <Card className="p-8 text-center space-y-6">
        <div className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Analyzing your SOP</h2>
          <p className="text-sm text-muted-foreground">This usually takes 20-40 seconds.</p>
        </div>
        <Progress value={pct} className="h-2" />
        <div className="text-sm font-medium text-sky-700">{pct}% complete</div>
        <ul className="text-left space-y-2">
          {PROCESSING_STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2 text-sm">
              {i < index ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : i === index ? (
                <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
              ) : (
                <div className="h-4 w-4 rounded-full border border-slate-300" />
              )}
              <span className={i <= index ? "text-slate-900" : "text-slate-400"}>{s}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Report({ evaluation, onReset, onDownload }: { evaluation: any; onReset: () => void; onDownload: () => void }) {
  const radarData = Object.entries(evaluation.section_scores || {}).map(([k, v]) => ({
    metric: k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    score: Number(v),
  }));

  const score = evaluation.overall_score || 0;
  const verdictColor =
    score >= 85 ? "text-emerald-600 bg-emerald-50 border-emerald-200" :
    score >= 70 ? "text-sky-700 bg-sky-50 border-sky-200" :
    score >= 55 ? "text-amber-700 bg-amber-50 border-amber-200" :
    "text-red-700 bg-red-50 border-red-200";

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Your SOP Report</h1>
          <p className="text-sm text-muted-foreground">Detailed AI evaluation across 8 dimensions.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onDownload}><Download className="h-4 w-4" /> Download PDF</Button>
          <Button onClick={onReset} className="bg-sky-600 hover:bg-sky-700"><RotateCcw className="h-4 w-4" /> New Review</Button>
        </div>
      </div>

      {/* Overall + Radar */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6 flex flex-col items-center justify-center text-center">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Overall Score</div>
          <div className="relative">
            <svg viewBox="0 0 120 120" className="w-44 h-44 -rotate-90">
              <circle cx="60" cy="60" r="52" stroke="hsl(210 40% 92%)" strokeWidth="10" fill="none" />
              <circle
                cx="60" cy="60" r="52"
                stroke="hsl(199 89% 48%)"
                strokeWidth="10" fill="none" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 52}
                strokeDashoffset={2 * Math.PI * 52 * (1 - score / 100)}
              />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div>
                <div className="text-4xl font-extrabold text-slate-900">{score}</div>
                <div className="text-xs text-muted-foreground">/ 100</div>
              </div>
            </div>
          </div>
          <div className={`mt-3 inline-block px-3 py-1 rounded-full text-xs font-semibold border ${verdictColor}`}>
            {evaluation.verdict}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2 px-2">Section-wise Performance</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(210 40% 90%)" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "hsl(215 20% 35%)" }} />
              <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 9 }} />
              <Radar name="Score" dataKey="score" stroke="hsl(199 89% 48%)" fill="hsl(199 89% 48%)" fillOpacity={0.35} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Score bars */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Detailed Section Scores</h3>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
          {radarData.map((d) => (
            <div key={d.metric}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium">{d.metric}</span>
                <span className="text-muted-foreground">{d.score}/10</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-500 to-blue-600"
                  style={{ width: `${(d.score / 10) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Strengths & weaknesses */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-emerald-700">
            <CheckCircle2 className="h-4 w-4" /> Strengths
          </h3>
          <ul className="space-y-2">
            {(evaluation.strengths || []).map((s: string, i: number) => (
              <li key={i} className="text-sm flex gap-2">
                <ChevronRight className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-4 w-4" /> Weaknesses
          </h3>
          <ul className="space-y-2">
            {(evaluation.weaknesses || []).map((s: string, i: number) => (
              <li key={i} className="text-sm flex gap-2">
                <ChevronRight className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Detailed feedback */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Section-by-Section Feedback</h3>
        <div className="space-y-4">
          {Object.entries(evaluation.detailed_feedback || {}).map(([k, v]) => (
            <div key={k} className="border-l-4 border-sky-500 pl-3">
              <div className="text-xs font-bold uppercase tracking-wider text-sky-700 mb-1">
                {k.replace(/_/g, " ")}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{String(v)}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Line-level issues */}
      {evaluation.line_level_issues?.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Line-Level Issues</h3>
          <div className="space-y-3">
            {evaluation.line_level_issues.map((iss: any, i: number) => (
              <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div className="text-xs italic text-slate-600 mb-1">"{iss.quote}"</div>
                <div className="text-sm text-amber-700"><strong>Issue:</strong> {iss.issue}</div>
                <div className="text-sm text-emerald-700"><strong>Fix:</strong> {iss.suggestion}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Improvements */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3">Improvement Suggestions</h3>
        <ol className="space-y-2 list-decimal list-inside">
          {(evaluation.improvement_suggestions || []).map((s: string, i: number) => (
            <li key={i} className="text-sm">{s}</li>
          ))}
        </ol>
      </Card>

      {/* Rewrites */}
      {evaluation.rewrite_suggestions?.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Rewrite Suggestions</h3>
          <div className="space-y-4">
            {evaluation.rewrite_suggestions.map((r: any, i: number) => (
              <div key={i} className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-sky-700">{r.section}</div>
                <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-slate-700">
                  <strong className="text-red-700">Original:</strong> {r.original_excerpt}
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded p-2 text-sm text-slate-700">
                  <strong className="text-emerald-700">Rewritten:</strong> {r.rewritten}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex justify-center pt-2">
        <Button onClick={onReset} variant="outline" size="lg">
          <ArrowLeft className="h-4 w-4" /> Run Another Review
        </Button>
      </div>
    </div>
  );
}
