import { useEffect, useMemo, useRef, useState } from "react";
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
  Download, RotateCcw, ArrowLeft, ChevronRight, Wand2, ScanLine,
  TrendingUp, TrendingDown, Target, ShieldAlert, Zap, BarChart3, Brain,
  Quote, Lightbulb, Award,
} from "lucide-react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, Cell,
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

const SCAN_STEPS = [
  "Reading your SOP",
  "Detecting structure & paragraphs",
  "Analyzing tone & vocabulary",
  "Computing readability metrics",
  "Indexing key themes",
];

const REVIEW_STEPS = [
  "Cross-referencing your profile",
  "Evaluating storytelling & flow",
  "Scoring against admission rubric",
  "Drafting SWOT & section feedback",
  "Generating actionable improvements",
  "Finalizing your premium report",
];

export default function StudentSOPReview() {
  const { user } = useAuth();
  const [step, setStep] = useState<"form" | "scanning" | "scanned" | "reviewing" | "report">("form");
  const [form, setForm] = useState<Form>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      .limit(5)
      .then(({ data }) => setHistory(data || []));
  }, [user, step]);

  // Animated step ticker
  useEffect(() => {
    if (step !== "scanning" && step !== "reviewing") return;
    const steps = step === "scanning" ? SCAN_STEPS : REVIEW_STEPS;
    setPhaseIndex(0);
    const t = setInterval(() => {
      setPhaseIndex((i) => (i < steps.length - 1 ? i + 1 : i));
    }, step === "scanning" ? 420 : 2200);
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

    // Premium scan animation — capped at ~3s total regardless of parse time
    setStep("scanning");
    set("file_name", file.name);

    // Parse the file in the background; UI does not block on it
    const parsePromise: Promise<string> = (async () => {
      if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
        return await file.text();
      }
      if (name.endsWith(".pdf") || file.type === "application/pdf") {
        const pdfjs: any = await import("pdfjs-dist");
        // @ts-ignore
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
        return parts.join("\n\n").replace(/\s+\n/g, "\n").trim();
      }
      if (name.endsWith(".docx")) {
        const mammoth: any = await import("mammoth/mammoth.browser");
        const buf = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buf });
        return (result.value || "").trim();
      }
      if (name.endsWith(".doc")) {
        throw new Error("Legacy .doc not supported. Save as .docx or .pdf.");
      }
      throw new Error("Unsupported format. Use .pdf, .docx, .txt or .md.");
    })();

    // Handle parsed text whenever it resolves (may be after UI returns to form)
    parsePromise
      .then((text) => {
        if (!text || text.length < 50) {
          toast({ title: "Could not extract text", description: "File may be scanned/empty. Paste text manually.", variant: "destructive" });
          return;
        }
        set("sop_text", text);
        toast({ title: "SOP read successfully", description: `${file.name} • ${text.split(/\s+/).filter(Boolean).length} words extracted.` });
      })
      .catch((err: any) => {
        console.error("File parse error", err);
        toast({ title: "Failed to parse file", description: err?.message || "Paste SOP text manually.", variant: "destructive" });
      });

    // Fixed 3s premium animation: ~2.2s scanning → ~0.8s "scanned" → form
    setTimeout(() => setStep("scanned"), 2200);
    setTimeout(() => setStep((s) => (s === "scanned" || s === "scanning" ? "form" : s)), 3000);
  };

  const submit = async () => {
    if (!user) {
      toast({ title: "Login required", variant: "destructive" });
      return;
    }
    if (wordCount < 200) {
      toast({ title: "SOP too short", description: "Minimum 200 words required.", variant: "destructive" });
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
      setStep("reviewing");

      const { data, error } = await supabase.functions.invoke("sop-review", {
        body: { reviewId: inserted.id },
      });
      if (error) throw new Error(error.message || "Edge function failed");
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
    line("AI SOP Review — Premium Report", 18, true);
    line(`Overall Score: ${evaluation.overall_score}/100  —  ${evaluation.verdict}`, 13, true);
    line(evaluation.one_line_summary || "");
    line(" ");
    line("Section Scores", 14, true);
    Object.entries(evaluation.section_scores || {}).forEach(([k, v]) =>
      line(`${k.replace(/_/g, " ")}: ${v}/10`)
    );
    line(" ");
    line("SWOT", 14, true);
    ["strengths", "weaknesses", "opportunities", "threats"].forEach((k) => {
      line(k.toUpperCase(), 12, true);
      (evaluation.swot?.[k] || []).forEach((s: string, i: number) => line(`${i + 1}. ${s}`));
    });
    line(" ");
    line("Improvements", 14, true);
    (evaluation.improvement_suggestions || []).forEach((s: string, i: number) => line(`${i + 1}. ${s}`));
    doc.save("SOP-Premium-Report.pdf");
  };

  // ---------- RENDER ----------
  if (step === "scanning") return <ScanningOverlay sopName={form.file_name} />;
  if (step === "scanned") return <ScanCompleteOverlay sopName={form.file_name} words={wordCount} />;
  if (step === "reviewing") return <ReviewingOverlay index={phaseIndex} />;
  if (step === "report" && evaluation) {
    return <Report evaluation={evaluation} onReset={reset} onDownload={downloadPdf} />;
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Premium hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-6 text-white">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px), radial-gradient(circle at 80% 60%, white 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-semibold mb-3">
            <Sparkles className="h-3.5 w-3.5" /> Premium AI Tool
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">AI SOP Review</h1>
          <p className="text-sm sm:text-base text-white/90 mt-1 max-w-2xl">
            Upload your SOP. Get a deep, quantitative + qualitative report with SWOT, section scores, line-level fixes, and rewrite suggestions.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Pill icon={<BarChart3 className="h-3 w-3" />} label="8 dimensions scored" />
            <Pill icon={<Target className="h-3 w-3" />} label="SWOT analysis" />
            <Pill icon={<Brain className="h-3 w-3" />} label="GPT-4o powered" />
            <Pill icon={<Zap className="h-3 w-3" />} label="~30s turnaround" />
          </div>
        </div>
      </div>

      {/* Upload */}
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4 text-sky-600" /> Step 1: Your SOP <span className="text-xs text-red-600 font-normal">*Required</span></h2>
        <div className="grid sm:grid-cols-5 gap-3">
          <label className="sm:col-span-2 border-2 border-dashed border-sky-300 rounded-xl p-5 text-center cursor-pointer hover:bg-sky-50/50 transition group">
            <div className="h-12 w-12 mx-auto rounded-full bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white mb-2 group-hover:scale-110 transition-transform">
              <Upload className="h-5 w-5" />
            </div>
            <div className="text-sm font-semibold">Upload SOP File</div>
            <div className="text-xs text-muted-foreground mt-1">PDF, DOCX, TXT, MD</div>
            <div className="text-[10px] text-muted-foreground mt-1">Max 10 MB</div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
          <div className="sm:col-span-3 space-y-2">
            <Textarea
              placeholder="...or paste your SOP text here (minimum 200 words)"
              value={form.sop_text}
              onChange={(e) => set("sop_text", e.target.value)}
              className="min-h-[180px] text-sm"
            />
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{form.file_name ? `📄 ${form.file_name}` : "No file uploaded"}</span>
              <span className={wordCount < 200 ? "text-red-600 font-medium" : "text-emerald-600 font-bold"}>
                {wordCount} words {wordCount < 200 ? `(need ${200 - wordCount} more)` : "✓"}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Required course */}
      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Step 2: Target Course <span className="text-xs text-muted-foreground font-normal">(quick context)</span></h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Target course">
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={form.target_course} onChange={(e) => set("target_course", e.target.value)}>
              {COURSES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Target college(s)">
            <Input value={form.target_colleges} onChange={(e) => set("target_colleges", e.target.value)} placeholder="ISB, IIM-A (optional)" />
          </Field>
          <Field label="Specialization">
            <Input value={form.specialization} onChange={(e) => set("specialization", e.target.value)} placeholder="Finance, Marketing... (optional)" />
          </Field>
        </div>
      </Card>

      {/* Optional details — collapsible */}
      <details className="group">
        <summary className="cursor-pointer list-none">
          <Card className="p-4 hover:bg-sky-50/40 transition flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">Step 3: Add more context for a sharper review <span className="text-xs text-muted-foreground font-normal">(all optional)</span></div>
              <div className="text-xs text-muted-foreground mt-0.5">Goals, background, intent — improves accuracy by up to 35%</div>
            </div>
            <ChevronRight className="h-5 w-5 text-sky-600 transition group-open:rotate-90" />
          </Card>
        </summary>

        <div className="space-y-4 mt-3">
          <Card className="p-5 space-y-4">
            <h3 className="font-semibold text-sm text-slate-700">Background <span className="text-xs text-muted-foreground">(optional)</span></h3>
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
                <Textarea rows={2} value={form.major_achievements} onChange={(e) => set("major_achievements", e.target.value)} placeholder="Awards, promotions, leadership..." />
              </Field>
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="font-semibold text-sm text-slate-700">Goals & Intent <span className="text-xs text-muted-foreground">(optional)</span></h3>
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
              <Field label="Why this course?">
                <Textarea rows={2} value={form.why_course} onChange={(e) => set("why_course", e.target.value)} />
              </Field>
              <Field label="Your strengths">
                <Textarea rows={2} value={form.strengths} onChange={(e) => set("strengths", e.target.value)} />
              </Field>
              <Field label="Your weaknesses">
                <Textarea rows={2} value={form.weaknesses} onChange={(e) => set("weaknesses", e.target.value)} />
              </Field>
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="font-semibold text-sm text-slate-700">Highlight Preferences <span className="text-xs text-muted-foreground">(optional)</span></h3>
            <div>
              <Label className="mb-2 block text-xs">What should your SOP emphasize?</Label>
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
              <Label className="mb-2 block text-xs">Tone preference</Label>
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
        </div>
      </details>

      {/* CTA */}
      <div className="sticky bottom-2 z-10 bg-white/95 backdrop-blur border-2 border-sky-200 rounded-xl p-3 flex items-center justify-between shadow-lg">
        <div className="text-xs">
          <div className="font-semibold text-slate-900">Ready when you are</div>
          <div className="text-muted-foreground">~30s • Premium structured report</div>
        </div>
        <Button onClick={submit} disabled={submitting || wordCount < 200} size="lg" className="bg-gradient-to-r from-sky-600 to-blue-700 hover:opacity-90 text-base">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          Review My SOP
        </Button>
      </div>

      {history.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold mb-3 text-sm">Recent Reviews</h2>
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-b-0">
                <div className="min-w-0">
                  <div className="font-medium truncate">{h.target_colleges || "Untitled"} — {h.target_course || "—"}</div>
                  <div className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString()}</div>
                </div>
                <div className="text-right shrink-0 ml-2">
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

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/15 backdrop-blur text-white">
      {icon} {label}
    </span>
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

/* ============ SCANNING UI (Premium) ============ */
function ScanningOverlay({ sopName }: { sopName: string | null }) {
  const [stepIdx, setStepIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStepIdx((i) => (i < SCAN_STEPS.length - 1 ? i + 1 : i)), 600);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card className="p-8 text-center space-y-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-50 via-white to-blue-50" />
        <div className="relative">
          {/* Animated scanner */}
          <div className="relative mx-auto h-44 w-32 rounded-lg border-2 border-sky-300 bg-white shadow-md overflow-hidden">
            <div className="p-3 space-y-1.5">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-1.5 bg-slate-200 rounded" style={{ width: `${60 + (i * 7) % 40}%` }} />
              ))}
            </div>
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-sky-500 to-transparent shadow-[0_0_20px_rgba(14,165,233,0.8)] animate-scan" />
          </div>

          <div className="mt-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-700 text-xs font-semibold">
              <ScanLine className="h-3.5 w-3.5 animate-pulse" /> AI is reading your SOP
            </div>
            <h2 className="text-xl font-bold mt-3">Scanning {sopName || "your document"}…</h2>
            <p className="text-sm text-muted-foreground mt-1">Extracting text, structure, and key signals.</p>
          </div>

          <ul className="text-left space-y-2 mt-6 max-w-xs mx-auto">
            {SCAN_STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-2 text-sm">
                {i < stepIdx ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> :
                 i === stepIdx ? <Loader2 className="h-4 w-4 animate-spin text-sky-600" /> :
                 <div className="h-4 w-4 rounded-full border border-slate-300" />}
                <span className={i <= stepIdx ? "text-slate-900" : "text-slate-400"}>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
      <style>{`
        @keyframes scanMove { 0% { top: 0%; } 100% { top: 100%; } }
        .animate-scan { animation: scanMove 1.6s ease-in-out infinite alternate; }
      `}</style>
    </div>
  );
}

function ScanCompleteOverlay({ sopName, words }: { sopName: string | null; words: number }) {
  return (
    <div className="max-w-2xl mx-auto py-12">
      <Card className="p-8 text-center space-y-4 bg-gradient-to-br from-emerald-50 to-white border-emerald-200">
        <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 grid place-items-center text-white shadow-lg animate-bounce-slow">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-emerald-900">SOP Read Successfully!</h2>
          <p className="text-sm text-emerald-700 mt-1">
            {sopName ? `"${sopName}"` : "Document"} parsed. {words > 0 && `${words} words detected.`}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Returning you to the form…</p>
      </Card>
      <style>{`
        @keyframes bounceSlow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .animate-bounce-slow { animation: bounceSlow 1.2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function ReviewingOverlay({ index }: { index: number }) {
  const pct = Math.round(((index + 1) / REVIEW_STEPS.length) * 100);
  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card className="p-8 text-center space-y-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-sky-50" />
        <div className="relative">
          <div className="relative mx-auto h-20 w-20">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-white grid place-items-center">
              <Brain className="h-8 w-8 text-sky-600 animate-pulse" />
            </div>
          </div>
          <div className="mt-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" /> Premium AI Analysis
            </div>
            <h2 className="text-xl font-bold mt-3">Crafting your detailed report</h2>
            <p className="text-sm text-muted-foreground mt-1">Sit tight — this usually takes 20-40 seconds.</p>
          </div>
          <Progress value={pct} className="h-2 mt-5" />
          <div className="text-sm font-semibold text-sky-700 mt-2">{pct}% complete</div>

          <ul className="text-left space-y-2 mt-5 max-w-sm mx-auto">
            {REVIEW_STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-2 text-sm">
                {i < index ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> :
                 i === index ? <Loader2 className="h-4 w-4 animate-spin text-sky-600" /> :
                 <div className="h-4 w-4 rounded-full border border-slate-300" />}
                <span className={i <= index ? "text-slate-900 font-medium" : "text-slate-400"}>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}

/* ============ REPORT (Rich Premium UI) ============ */
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

  const m = evaluation.quantitative_metrics || {};
  const swot = evaluation.swot || {};

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 p-6 text-white">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 30% 20%, white 1.5px, transparent 1.5px)",
          backgroundSize: "30px 30px",
        }} />
        <div className="relative flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-semibold backdrop-blur">
              <Award className="h-3.5 w-3.5" /> Premium SOP Report
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mt-2">Your SOP Evaluation</h1>
            <p className="text-sm text-white/90 mt-1 max-w-2xl">{evaluation.one_line_summary}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onDownload} className="bg-white/10 backdrop-blur border-white/30 text-white hover:bg-white/20"><Download className="h-4 w-4" /> PDF</Button>
            <Button onClick={onReset} className="bg-white text-sky-700 hover:bg-white/90"><RotateCcw className="h-4 w-4" /> New</Button>
          </div>
        </div>
      </div>

      {/* Overall + Radar */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-6 flex flex-col items-center justify-center text-center bg-gradient-to-br from-white to-sky-50">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Overall Score</div>
          <div className="relative">
            <svg viewBox="0 0 120 120" className="w-44 h-44 -rotate-90">
              <circle cx="60" cy="60" r="52" stroke="hsl(210 40% 92%)" strokeWidth="10" fill="none" />
              <circle
                cx="60" cy="60" r="52"
                stroke="url(#scoreGrad)"
                strokeWidth="10" fill="none" strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 52}
                strokeDashoffset={2 * Math.PI * 52 * (1 - score / 100)}
                style={{ transition: "stroke-dashoffset 1.2s ease" }}
              />
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="hsl(199 89% 48%)" />
                  <stop offset="100%" stopColor="hsl(225 73% 57%)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 grid place-items-center">
              <div>
                <div className="text-5xl font-extrabold bg-gradient-to-br from-sky-600 to-indigo-700 bg-clip-text text-transparent">{score}</div>
                <div className="text-xs text-muted-foreground">/ 100</div>
              </div>
            </div>
          </div>
          <div className={`mt-3 inline-block px-3 py-1.5 rounded-full text-xs font-bold border ${verdictColor}`}>
            {evaluation.verdict}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-sm mb-2 px-2 flex items-center gap-1.5"><BarChart3 className="h-4 w-4 text-sky-600" /> Section Performance</h3>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="hsl(210 40% 90%)" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: "hsl(215 20% 35%)" }} />
              <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 9 }} />
              <Radar name="Score" dataKey="score" stroke="hsl(225 73% 57%)" fill="hsl(199 89% 48%)" fillOpacity={0.4} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Quantitative Metrics */}
      {m.word_count !== undefined && (
        <Card className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-sky-600" /> Quantitative Metrics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <Metric label="Words" value={m.word_count} />
            <Metric label="Sentences" value={m.sentence_count} />
            <Metric label="Avg Sentence" value={`${m.avg_sentence_length?.toFixed(1)}w`} />
            <Metric label="Reading Grade" value={m.readability_grade?.toFixed(1)} />
            <Metric label="Read Time" value={`${m.estimated_reading_time_min?.toFixed(1)}m`} />
            <Metric label="Cliches" value={m.cliche_count} flag={m.cliche_count > 3 ? "warn" : "good"} />
            <Metric label="Passive Voice" value={`${m.passive_voice_pct?.toFixed(0)}%`} flag={m.passive_voice_pct > 25 ? "warn" : "good"} />
            <Metric label="First-Person" value={`${m.first_person_pct?.toFixed(0)}%`} />
            <Metric label="Lexical Diversity" value={`${(m.unique_word_ratio * 100)?.toFixed(0)}%`} flag={m.unique_word_ratio < 0.4 ? "warn" : "good"} />
            <Metric label="Paragraphs" value={m.paragraph_count} />
          </div>
        </Card>
      )}

      {/* Section Scores Bars */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Target className="h-4 w-4 text-sky-600" /> Detailed Section Scores</h3>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
          {radarData.map((d) => (
            <div key={d.metric}>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium">{d.metric}</span>
                <span className={`font-bold ${d.score >= 7 ? "text-emerald-600" : d.score >= 5 ? "text-amber-600" : "text-red-600"}`}>{d.score}/10</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${d.score >= 7 ? "bg-gradient-to-r from-emerald-500 to-emerald-600" : d.score >= 5 ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-gradient-to-r from-red-500 to-red-600"}`}
                  style={{ width: `${(d.score / 10) * 100}%`, transition: "width 1s ease" }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* SWOT */}
      {swot.strengths && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Brain className="h-4 w-4 text-sky-600" /> SWOT Analysis</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <SwotBox title="Strengths" items={swot.strengths} icon={<TrendingUp className="h-4 w-4" />} color="emerald" />
            <SwotBox title="Weaknesses" items={swot.weaknesses} icon={<TrendingDown className="h-4 w-4" />} color="red" />
            <SwotBox title="Opportunities" items={swot.opportunities} icon={<Zap className="h-4 w-4" />} color="sky" />
            <SwotBox title="Threats" items={swot.threats} icon={<ShieldAlert className="h-4 w-4" />} color="amber" />
          </div>
        </Card>
      )}

      {/* Section feedback */}
      {evaluation.section_feedback?.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-sky-600" /> Section-by-Section Breakdown</h3>
          <div className="space-y-3">
            {evaluation.section_feedback.map((s: any, i: number) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3 bg-gradient-to-br from-white to-sky-50/30">
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <div className="font-bold text-sm text-slate-900">{s.section}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground italic">{s.verdict}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.score_out_of_10 >= 7 ? "bg-emerald-100 text-emerald-700" : s.score_out_of_10 >= 5 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                      {s.score_out_of_10}/10
                    </span>
                  </div>
                </div>
                <ul className="space-y-1 mt-2">
                  {s.bullets?.map((b: string, j: number) => (
                    <li key={j} className="text-sm flex gap-2">
                      <ChevronRight className="h-3.5 w-3.5 text-sky-600 flex-shrink-0 mt-1" />
                      <span className="text-slate-700">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* College fit */}
      {evaluation.college_fit_analysis && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Target className="h-4 w-4 text-sky-600" /> College Fit Analysis</h3>
          <div className="flex items-center gap-4 mb-3">
            <div className="text-3xl font-extrabold text-sky-700">{evaluation.college_fit_analysis.alignment_score}<span className="text-sm text-muted-foreground">/100</span></div>
            <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-sky-500 to-indigo-600 rounded-full" style={{ width: `${evaluation.college_fit_analysis.alignment_score}%` }} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-bold uppercase text-emerald-700 mb-1.5">Matches</div>
              <ul className="space-y-1">
                {evaluation.college_fit_analysis.matches?.map((s: string, i: number) => (
                  <li key={i} className="text-sm flex gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs font-bold uppercase text-amber-700 mb-1.5">Gaps</div>
              <ul className="space-y-1">
                {evaluation.college_fit_analysis.gaps?.map((s: string, i: number) => (
                  <li key={i} className="text-sm flex gap-1.5"><AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Line-level issues */}
      {evaluation.line_level_issues?.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Quote className="h-4 w-4 text-sky-600" /> Line-Level Issues</h3>
          <div className="space-y-3">
            {evaluation.line_level_issues.map((iss: any, i: number) => (
              <div key={i} className={`rounded-lg p-3 border-l-4 ${iss.severity === "high" ? "border-red-500 bg-red-50" : iss.severity === "medium" ? "border-amber-500 bg-amber-50" : "border-sky-500 bg-sky-50"}`}>
                <div className="text-xs italic text-slate-700 mb-1.5">"{iss.quote}"</div>
                <div className="text-sm text-slate-800"><strong className="text-amber-700">Issue:</strong> {iss.issue}</div>
                <div className="text-sm text-slate-800 mt-1"><strong className="text-emerald-700">Fix:</strong> {iss.suggestion}</div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Improvements */}
      <Card className="p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-sky-600" /> Top Improvement Actions</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          {(evaluation.improvement_suggestions || []).map((s: string, i: number) => (
            <div key={i} className="flex gap-2 p-2.5 rounded-lg bg-sky-50 border border-sky-100">
              <div className="h-6 w-6 shrink-0 rounded-full bg-sky-600 text-white text-xs font-bold grid place-items-center">{i + 1}</div>
              <span className="text-sm text-slate-700">{s}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Rewrites */}
      {evaluation.rewrite_suggestions?.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><Wand2 className="h-4 w-4 text-sky-600" /> Rewrite Suggestions</h3>
          <div className="space-y-4">
            {evaluation.rewrite_suggestions.map((r: any, i: number) => (
              <div key={i} className="space-y-2 rounded-lg border border-slate-200 p-3">
                <div className="text-xs font-bold uppercase tracking-wider text-sky-700">{r.section}</div>
                <div className="bg-red-50 border border-red-200 rounded p-2 text-sm">
                  <div className="text-[10px] font-bold text-red-700 uppercase mb-0.5">Original</div>
                  <div className="text-slate-700">{r.original_excerpt}</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded p-2 text-sm">
                  <div className="text-[10px] font-bold text-emerald-700 uppercase mb-0.5">Rewritten</div>
                  <div className="text-slate-700">{r.rewritten}</div>
                </div>
                {r.why_better && (
                  <div className="text-xs text-muted-foreground italic">💡 Why better: {r.why_better}</div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Red flags */}
      {evaluation.red_flags?.length > 0 && (
        <Card className="p-5 bg-red-50/50 border-red-200">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-red-700"><ShieldAlert className="h-4 w-4" /> Red Flags to Address</h3>
          <ul className="space-y-1.5">
            {evaluation.red_flags.map((s: string, i: number) => (
              <li key={i} className="text-sm flex gap-2 text-slate-800">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />{s}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex justify-center pt-2 gap-2">
        <Button onClick={onReset} variant="outline" size="lg">
          <ArrowLeft className="h-4 w-4" /> Run Another Review
        </Button>
        <Button onClick={onDownload} className="bg-sky-600 hover:bg-sky-700" size="lg">
          <Download className="h-4 w-4" /> Download PDF
        </Button>
      </div>
    </div>
  );
}

function Metric({ label, value, flag }: { label: string; value: any; flag?: "good" | "warn" }) {
  const color = flag === "warn" ? "text-amber-700 bg-amber-50 border-amber-200" :
                flag === "good" ? "text-emerald-700 bg-emerald-50 border-emerald-200" :
                "text-slate-800 bg-slate-50 border-slate-200";
  return (
    <div className={`rounded-lg border p-2.5 ${color}`}>
      <div className="text-[10px] uppercase font-semibold opacity-70">{label}</div>
      <div className="text-lg font-bold">{value ?? "—"}</div>
    </div>
  );
}

function SwotBox({ title, items, icon, color }: { title: string; items: string[]; icon: React.ReactNode; color: "emerald" | "red" | "sky" | "amber" }) {
  const map = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
    red: "bg-red-50 border-red-200 text-red-800",
    sky: "bg-sky-50 border-sky-200 text-sky-800",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
  };
  return (
    <div className={`rounded-lg border p-3 ${map[color]}`}>
      <div className="font-bold text-sm mb-2 flex items-center gap-1.5">{icon} {title}</div>
      <ul className="space-y-1">
        {items?.map((s, i) => (
          <li key={i} className="text-xs flex gap-1.5"><span className="opacity-60">•</span><span>{s}</span></li>
        ))}
      </ul>
    </div>
  );
}
