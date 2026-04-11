import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { parseCATResponseSheet, type CATResult } from "@/lib/catParser";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SEOHead from "@/components/SEOHead";
import {
  SectionRadarChart, AttemptBreakdownPie, SectionScoreBar,
  AccuracyBySection, QuestionTypeAnalysis, NegativeMarksCard,
  StrengthWeaknessChart, ScoreVsPercentileCurve,
} from "@/components/CATScoreCharts";
import {
  Calculator, Upload, FileText, Target, TrendingUp, Award,
  BarChart3, CheckCircle2, XCircle, MinusCircle, Zap, BookOpen,
  BrainCircuit, ArrowRight, ClipboardPaste, ChevronDown,
  ChevronUp, Share2, ExternalLink, Globe, MousePointer, Copy, ClipboardCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const SECTION_COLORS: Record<string, { bg: string; text: string; accent: string; border: string }> = {
  VARC: { bg: "bg-blue-50", text: "text-primary", accent: "bg-primary", border: "border-primary/20" },
  DILR: { bg: "bg-emerald-50", text: "text-emerald-600", accent: "bg-emerald-500", border: "border-emerald-200" },
  QA: { bg: "bg-amber-50", text: "text-amber-600", accent: "bg-amber-500", border: "border-amber-200" },
};

const FAKE_STEPS = [
  "Fetching response sheet...", "Identifying sections...", "Parsing VARC answers...",
  "Parsing DILR answers...", "Parsing QA answers...", "Calculating section scores...",
  "Computing accuracy metrics...", "Estimating percentile...", "Generating report...",
];

const STEPS = [
  {
    number: 1,
    title: "Visit Official CAT Website",
    description: "Go to iimcat.ac.in and log in with your registered credentials",
    icon: Globe,
  },
  {
    number: 2,
    title: "Navigate to Response Sheet",
    description: "Click on 'Response Sheet' link in your dashboard. A new page will open with your response sheet.",
    icon: MousePointer,
  },
  {
    number: 3,
    title: "View Page Source",
    description: "Right-click anywhere on the response sheet page → Click 'View Page Source' (or press Ctrl+U on PC / Cmd+Option+U on Mac)",
    icon: FileText,
  },
  {
    number: 4,
    title: "Copy the Entire HTML",
    description: "Press Ctrl+A (Select All) → Ctrl+C (Copy) to copy the entire page source code",
    icon: Copy,
  },
  {
    number: 5,
    title: "Paste & Calculate",
    description: "Paste the copied HTML in the box below and click 'Calculate My Score' to get your detailed analysis",
    icon: ClipboardCheck,
  },
];

const CATScoreCalculatorPage: React.FC = () => {
  const [htmlInput, setHtmlInput] = useState("");
  const [result, setResult] = useState<CATResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState("");
  const [inputMode, setInputMode] = useState<"paste" | "upload">("paste");
  const [showQuestions, setShowQuestions] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const saveSubmission = async (parsed: CATResult) => {
    const getSectionData = (name: string) => parsed.sections.find((s) => s.section === name);
    const varc = getSectionData("VARC");
    const dilr = getSectionData("DILR");
    const qa = getSectionData("QA");

    const mcqWrong = parsed.questions.filter(
      (q) => q.questionType === "MCQ" && !q.isCorrect &&
        (q.status === "Answered" || q.status === "Answered & Marked for Review")
    ).length;

    await supabase.from("cat_score_submissions").insert({
      candidate_name: parsed.candidateName,
      application_no: parsed.applicationNo || null,
      test_date: parsed.testDate || null,
      test_time: parsed.testTime || null,
      subject: parsed.subject || "CAT",
      email: user?.email || null,
      phone: user?.user_metadata?.phone || null,
      state: null,
      user_id: user?.id || null,
      total_score: parsed.overall.totalScore,
      max_score: parsed.overall.maxScore,
      estimated_percentile: parsed.estimatedPercentile,
      total_questions: parsed.overall.totalQuestions,
      attempted: parsed.overall.attempted,
      correct: parsed.overall.correct,
      incorrect: parsed.overall.incorrect,
      unattempted: parsed.overall.unattempted,
      accuracy: parseFloat(parsed.overall.accuracy.toFixed(2)),
      negative_marks: mcqWrong,
      varc_score: varc?.score || 0,
      varc_attempted: varc?.attempted || 0,
      varc_correct: varc?.correct || 0,
      varc_incorrect: varc?.incorrect || 0,
      varc_accuracy: parseFloat((varc?.accuracy || 0).toFixed(2)),
      dilr_score: dilr?.score || 0,
      dilr_attempted: dilr?.attempted || 0,
      dilr_correct: dilr?.correct || 0,
      dilr_incorrect: dilr?.incorrect || 0,
      dilr_accuracy: parseFloat((dilr?.accuracy || 0).toFixed(2)),
      qa_score: qa?.score || 0,
      qa_attempted: qa?.attempted || 0,
      qa_correct: qa?.correct || 0,
      qa_incorrect: qa?.incorrect || 0,
      qa_accuracy: parseFloat((qa?.accuracy || 0).toFixed(2)),
      sections_data: parsed.sections,
      questions_data: parsed.questions,
    } as any);
  };

  const handleCalculate = useCallback(async () => {
    if (!user) {
      setShowLoginDialog(true);
      return;
    }
    if (!htmlInput.trim()) {
      setError("Please paste the HTML source code of your CAT response sheet.");
      return;
    }
    setError("");
    setLoading(true);
    setLoadingStep(0);
    setLoadingProgress(0);
    setResult(null);

    for (let i = 0; i < FAKE_STEPS.length; i++) {
      setLoadingStep(i);
      setLoadingProgress(((i + 1) / FAKE_STEPS.length) * 100);
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));
    }

    try {
      const parsed = parseCATResponseSheet(htmlInput);
      if (parsed.questions.length === 0) {
        setError("Could not parse any questions. Please ensure you pasted the complete HTML source of the CAT response sheet.");
        setLoading(false);
        return;
      }
      setResult(parsed);
      saveSubmission(parsed);
    } catch {
      setError("Failed to parse the response sheet. Please check the HTML content and try again.");
    } finally {
      setLoading(false);
    }
  }, [htmlInput, user]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setHtmlInput(ev.target?.result as string);
    reader.readAsText(file);
  }, []);

  const handleShare = () => {
    if (!result) return;
    const text = `🎯 My CAT Score Report\n\n📊 Total Score: ${result.overall.totalScore}/${result.overall.maxScore}\n📈 Est. Percentile: ${result.estimatedPercentile}\n✅ Accuracy: ${result.overall.accuracy.toFixed(1)}%\n\nVARC: ${result.sections.find(s => s.section === "VARC")?.score || 0} | DILR: ${result.sections.find(s => s.section === "DILR")?.score || 0} | QA: ${result.sections.find(s => s.section === "QA")?.score || 0}\n\nCalculate yours at: ${window.location.href}`;
    if (navigator.share) {
      navigator.share({ title: "My CAT Score", text });
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Score report copied to clipboard!");
    }
  };

  const getScoreColor = (score: number, max: number) => {
    const pct = max > 0 ? (score / max) * 100 : 0;
    if (pct >= 60) return "text-emerald-600";
    if (pct >= 40) return "text-amber-600";
    return "text-destructive";
  };

  const getPercentileColor = (p: number) => {
    if (p >= 99) return "text-emerald-600";
    if (p >= 95) return "text-primary";
    if (p >= 85) return "text-amber-600";
    return "text-destructive";
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="CAT Score Calculator - Calculate Your CAT 2025 Score Instantly"
        description="Paste your CAT response sheet and get instant score calculation with section-wise analysis, accuracy metrics, and percentile estimate."
      />

      <LoginRequiredDialog
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
        message="Sign in to calculate your CAT score. Your name, email, and phone number are required."
      />

      {/* Hero */}
      <section className="relative overflow-hidden pt-6 pb-10 bg-gradient-to-br from-primary/5 via-background to-secondary/30">
        <div className="absolute top-10 left-1/4 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-32 right-1/4 w-64 h-64 bg-sky-300/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-5">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">AI-Powered • Instant Analysis</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-foreground mb-3 tracking-tight">
              CAT Score <span className="text-primary">Calculator 2025</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-2">
              Get Your CAT Percentile Prediction!
            </p>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Accurate Scores • Real-Time Insights • Section-wise Analysis
            </p>
          </motion.div>
        </div>
      </section>

      {/* Quick Guide Steps */}
      {!result && !loading && (
        <section className="max-w-5xl mx-auto px-4 -mt-2 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="bg-card border border-border rounded-2xl shadow-sm p-6">
              <h2 className="text-lg font-bold text-foreground mb-5 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                How to Download & Use Your CAT Response Sheet
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {STEPS.map((step, i) => (
                  <motion.div
                    key={step.number}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="relative flex flex-col items-center text-center"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mb-3">
                      <span className="text-primary font-bold text-lg">{step.number}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">{step.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                    {i < STEPS.length - 1 && (
                      <ArrowRight className="hidden md:block absolute top-6 -right-3 w-5 h-5 text-primary/40" />
                    )}
                  </motion.div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-border flex flex-wrap items-center gap-3 justify-center">
                <a
                  href="https://iimcat.ac.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary font-medium hover:underline"
                >
                  <ExternalLink className="w-4 h-4" /> Visit iimcat.ac.in
                </a>
                <span className="text-muted-foreground text-xs">|</span>
                <p className="text-xs text-muted-foreground">
                  Paste the URL of the updated response sheet with TITA Answers
                </p>
              </div>
            </div>
          </motion.div>
        </section>
      )}

      {/* Input Section */}
      {!result && !loading && (
        <section className="max-w-3xl mx-auto px-4 mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card className="bg-card border border-border shadow-md rounded-2xl p-6">
              {/* Mode Toggle */}
              <div className="flex justify-center gap-3 mb-5">
                <button onClick={() => setInputMode("paste")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${inputMode === "paste" ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                  <ClipboardPaste className="w-4 h-4" /> Paste HTML
                </button>
                <button onClick={() => setInputMode("upload")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${inputMode === "upload" ? "bg-primary text-primary-foreground shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                  <Upload className="w-4 h-4" /> Upload File
                </button>
              </div>

              {inputMode === "paste" ? (
                <Textarea value={htmlInput} onChange={(e) => setHtmlInput(e.target.value)}
                  placeholder="Right-click on your CAT response sheet page → View Page Source → Copy all → Paste here"
                  className="min-h-[180px] bg-muted/30 border-border text-foreground placeholder:text-muted-foreground font-mono text-xs focus:border-primary/50 rounded-xl resize-y" />
              ) : (
                <div onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-primary/40 rounded-xl p-10 cursor-pointer transition-all bg-muted/20 group">
                  <Upload className="w-10 h-10 text-muted-foreground group-hover:text-primary mx-auto mb-3 transition-colors" />
                  <p className="text-muted-foreground group-hover:text-foreground transition-colors text-sm text-center">
                    {htmlInput ? "✓ File loaded — click Calculate" : "Click to upload saved HTML file (.html)"}
                  </p>
                  <input ref={fileInputRef} type="file" accept=".html,.htm" onChange={handleFileUpload} className="hidden" />
                </div>
              )}

              {error && <p className="text-destructive text-sm mt-3">{error}</p>}

              <div className="flex flex-col items-center mt-5">
                <Button onClick={handleCalculate} disabled={!htmlInput.trim() && !!user}
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-10 py-6 text-lg rounded-xl shadow-lg">
                  <Calculator className="w-5 h-5 mr-2" /> Calculate My Score
                </Button>
                {!user && (
                  <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                    🔒 Login required to calculate your score
                  </p>
                )}
              </div>
            </Card>
          </motion.div>
        </section>
      )}

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="max-w-lg mx-auto px-4 py-12">
            <Card className="bg-card border border-border p-8 rounded-2xl shadow-lg text-center">
              <BrainCircuit className="w-12 h-12 text-primary mx-auto mb-4 animate-pulse" />
              <h3 className="text-xl font-bold text-foreground mb-2">Analyzing Your Response Sheet</h3>
              <p className="text-primary text-sm mb-6">{FAKE_STEPS[loadingStep]}</p>
              <Progress value={loadingProgress} className="h-2" />
              <p className="text-xs text-muted-foreground mt-3">{Math.round(loadingProgress)}% complete</p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Dashboard */}
      <AnimatePresence>
        {result && (
          <motion.section initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-5xl mx-auto px-4 pb-16">
            {/* Candidate Info */}
            <div className="bg-card border border-border rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-foreground font-semibold">{result.candidateName}</p>
                  <p className="text-xs text-muted-foreground">{result.subject} • {result.testDate} • {result.testTime}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="w-4 h-4 mr-1" /> Share
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setResult(null); setHtmlInput(""); }}>
                  Calculate Again
                </Button>
              </div>
            </div>

            {/* Big Score Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Total Score", value: result.overall.totalScore, sub: `out of ${result.overall.maxScore}`, bg: "bg-primary/5", border: "border-primary/15", textColor: getScoreColor(result.overall.totalScore, result.overall.maxScore), labelColor: "text-primary" },
                { label: "Est. Percentile", value: result.estimatedPercentile, sub: "approximate", bg: "bg-purple-50", border: "border-purple-200", textColor: getPercentileColor(result.estimatedPercentile), labelColor: "text-purple-600" },
                { label: "Accuracy", value: `${result.overall.accuracy.toFixed(1)}%`, sub: `${result.overall.correct}/${result.overall.attempted} correct`, bg: "bg-emerald-50", border: "border-emerald-200", textColor: "text-emerald-600", labelColor: "text-emerald-600" },
                { label: "Attempted", value: result.overall.attempted, sub: `of ${result.overall.totalQuestions} questions`, bg: "bg-amber-50", border: "border-amber-200", textColor: "text-amber-600", labelColor: "text-amber-600" },
              ].map((card, i) => (
                <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1 }}
                  className={`${card.bg} border ${card.border} rounded-2xl p-5 text-center shadow-sm`}>
                  <p className={`text-xs ${card.labelColor} uppercase tracking-wider font-semibold mb-1`}>{card.label}</p>
                  <p className={`text-3xl md:text-4xl font-black ${card.textColor}`}>{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                </motion.div>
              ))}
            </div>

            {/* Section-wise Breakdown Cards */}
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> Section-wise Breakdown
            </h2>
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              {result.sections.map((section, i) => {
                const colors = SECTION_COLORS[section.section] || SECTION_COLORS.VARC;
                return (
                  <motion.div key={section.section} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.15 }}
                    className={`${colors.bg} border ${colors.border} rounded-2xl p-5 shadow-sm`}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-lg font-bold ${colors.text}`}>{section.section}</h3>
                      <span className={`text-2xl font-black ${colors.text}`}>{section.score}</span>
                    </div>
                    <div className="space-y-3">
                      {[
                        { icon: Target, label: "Attempted", value: section.attempted, color: "text-muted-foreground" },
                        { icon: CheckCircle2, label: "Correct", value: section.correct, color: "text-emerald-600" },
                        { icon: XCircle, label: "Incorrect", value: section.incorrect, color: "text-destructive" },
                        { icon: MinusCircle, label: "Unattempted", value: section.unattempted, color: "text-muted-foreground/60" },
                      ].map((row) => (
                        <div key={row.label} className="flex justify-between text-sm">
                          <span className={`flex items-center gap-1.5 ${row.color}`}><row.icon className="w-3.5 h-3.5" /> {row.label}</span>
                          <span className={`${row.color} font-medium`}>{row.value}</span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-border">
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-muted-foreground">Accuracy</span>
                          <span className="text-foreground font-semibold">{section.accuracy.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${colors.accent} rounded-full transition-all duration-1000`} style={{ width: `${section.accuracy}%` }} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Charts Grid */}
            <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" /> Visual Analysis
            </h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <SectionRadarChart result={result} />
              <AttemptBreakdownPie result={result} />
              <SectionScoreBar result={result} />
              <AccuracyBySection result={result} />
              <QuestionTypeAnalysis result={result} />
              <NegativeMarksCard result={result} />
              <StrengthWeaknessChart result={result} />
              <ScoreVsPercentileCurve currentScore={result.overall.totalScore} />
            </div>

            {/* Overall Stats Table */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden mb-8 shadow-sm">
              <div className="bg-muted/50 px-5 py-3 border-b border-border">
                <h3 className="text-foreground font-bold">Overall Summary</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-5 py-3 text-muted-foreground font-medium">Section</th>
                      <th className="text-center px-3 py-3 text-muted-foreground font-medium">Total</th>
                      <th className="text-center px-3 py-3 text-muted-foreground font-medium">Attempted</th>
                      <th className="text-center px-3 py-3 text-emerald-600 font-medium">Correct</th>
                      <th className="text-center px-3 py-3 text-destructive font-medium">Incorrect</th>
                      <th className="text-center px-3 py-3 text-muted-foreground font-medium">Score</th>
                      <th className="text-center px-3 py-3 text-muted-foreground font-medium">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.sections.map((s) => {
                      const c = SECTION_COLORS[s.section] || SECTION_COLORS.VARC;
                      return (
                        <tr key={s.section} className="border-b border-border/50">
                          <td className={`px-5 py-3 font-semibold ${c.text}`}>{s.section}</td>
                          <td className="text-center px-3 py-3 text-foreground">{s.total}</td>
                          <td className="text-center px-3 py-3 text-foreground">{s.attempted}</td>
                          <td className="text-center px-3 py-3 text-emerald-600 font-medium">{s.correct}</td>
                          <td className="text-center px-3 py-3 text-destructive font-medium">{s.incorrect}</td>
                          <td className="text-center px-3 py-3 text-foreground font-bold">{s.score}</td>
                          <td className="text-center px-3 py-3 text-foreground">{s.accuracy.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-muted/30">
                      <td className="px-5 py-3 font-bold text-foreground">Total</td>
                      <td className="text-center px-3 py-3 text-foreground font-semibold">{result.overall.totalQuestions}</td>
                      <td className="text-center px-3 py-3 text-foreground font-semibold">{result.overall.attempted}</td>
                      <td className="text-center px-3 py-3 text-emerald-600 font-bold">{result.overall.correct}</td>
                      <td className="text-center px-3 py-3 text-destructive font-bold">{result.overall.incorrect}</td>
                      <td className="text-center px-3 py-3 text-primary font-black text-lg">{result.overall.totalScore}</td>
                      <td className="text-center px-3 py-3 text-foreground font-semibold">{result.overall.accuracy.toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Question-wise Detail */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden mb-8 shadow-sm">
              <button onClick={() => setShowQuestions(!showQuestions)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <span className="text-foreground font-bold">Question-wise Details</span>
                  <span className="text-xs text-muted-foreground">({result.questions.length} questions)</span>
                </div>
                {showQuestions ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
              </button>
              <AnimatePresence>
                {showQuestions && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-card">
                          <tr className="border-b border-border">
                            <th className="text-left px-4 py-2 text-muted-foreground">Q#</th>
                            <th className="text-left px-3 py-2 text-muted-foreground">Section</th>
                            <th className="text-center px-3 py-2 text-muted-foreground">Type</th>
                            <th className="text-center px-3 py-2 text-muted-foreground">Status</th>
                            <th className="text-center px-3 py-2 text-muted-foreground">Your Ans</th>
                            <th className="text-center px-3 py-2 text-muted-foreground">Correct</th>
                            <th className="text-center px-3 py-2 text-muted-foreground">Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.questions.map((q, i) => (
                            <tr key={i} className={`border-b border-border/30 ${q.isCorrect ? "bg-emerald-50" : q.status === "Answered" ? "bg-red-50" : ""}`}>
                              <td className="px-4 py-2 text-foreground font-medium">Q.{q.questionNumber}</td>
                              <td className="px-3 py-2"><span className={`${SECTION_COLORS[q.section]?.text || "text-foreground"} font-medium`}>{q.section}</span></td>
                              <td className="text-center px-3 py-2 text-muted-foreground">{q.questionType}</td>
                              <td className="text-center px-3 py-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${q.status === "Answered" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{q.status}</span>
                              </td>
                              <td className="text-center px-3 py-2 text-foreground">{q.chosenOption || "—"}</td>
                              <td className="text-center px-3 py-2 text-muted-foreground">{q.correctOption || "—"}</td>
                              <td className="text-center px-3 py-2">
                                {q.status !== "Answered" ? <MinusCircle className="w-4 h-4 text-muted-foreground mx-auto" /> :
                                  q.isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto" /> :
                                    <XCircle className="w-4 h-4 text-destructive mx-auto" />}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* CTA Section */}
            <div className="grid md:grid-cols-2 gap-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="bg-primary/5 border border-primary/15 rounded-2xl p-6 shadow-sm">
                <Award className="w-8 h-8 text-primary mb-3" />
                <h3 className="text-foreground font-bold text-lg mb-2">Want to Improve Your Score?</h3>
                <p className="text-muted-foreground text-sm mb-4">Get a detailed AI-powered profile analysis with college predictions and personalized strategy</p>
                <Link to="/profile-analyzer">
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Analyse My Profile <ArrowRight className="w-4 h-4 ml-1" /></Button>
                </Link>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
                className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-sm">
                <TrendingUp className="w-8 h-8 text-emerald-600 mb-3" />
                <h3 className="text-foreground font-bold text-lg mb-2">Find Best Coaching Institutes</h3>
                <p className="text-muted-foreground text-sm mb-4">Compare top CAT coaching centres near you with verified reviews and results</p>
                <Link to="/category/cat">
                  <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">Browse Coaching <ArrowRight className="w-4 h-4 ml-1" /></Button>
                </Link>
              </motion.div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CATScoreCalculatorPage;
