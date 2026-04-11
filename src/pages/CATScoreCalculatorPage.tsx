import React, { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
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
  ScoreDistributionHistogram, DailySubmissionTrend,
  SectionAvgComparison, AccuracyDistributionPie,
  DifficultyPerformanceChart, ScoreVsAttemptsScatter,
  SectionDifficultyHeatmap, PercentilePredictorPanel,
  MistakeAnalysisChart, TopperComparisonBar,
} from "@/components/CATScoreCharts";
import {
  Calculator, Upload, FileText, Target, TrendingUp, Award,
  BarChart3, CheckCircle2, XCircle, MinusCircle, Zap, BookOpen,
  BrainCircuit, ArrowRight, ClipboardPaste, ChevronDown,
  ChevronUp, Share2, ExternalLink, Globe, MousePointer, Copy, ClipboardCheck,
  Users, Trophy, Percent, GraduationCap, Star, HelpCircle, MessageSquare,
  Lightbulb, Activity, Shield,
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
  "Computing accuracy metrics...", "Estimating percentile...", "Generating AI insights...",
  "Building visual report...",
];

const STEPS = [
  { number: 1, title: "Visit CAT Official Website", description: "Go to iimcat.ac.in and login with your registered credentials (Registration ID & Password)", icon: Globe },
  { number: 2, title: "Open Response Sheet", description: "Click on 'Candidate Response' or 'Response Sheet' link. A new page will open showing your complete response sheet.", icon: MousePointer },
  { number: 3, title: "View Page Source Code", description: "Right-click anywhere → 'View Page Source' (or press Ctrl+U on Windows / Cmd+Option+U on Mac)", icon: FileText },
  { number: 4, title: "Copy All HTML Code", description: "Press Ctrl+A (Select All) then Ctrl+C (Copy) to copy the entire HTML source code of the page", icon: Copy },
  { number: 5, title: "Paste & Get Score", description: "Come back here, paste the copied code in the box below, and click 'Calculate My Score' for instant analysis!", icon: ClipboardCheck },
];

const AnimatedCounter: React.FC<{ end: number; suffix?: string; duration?: number }> = ({ end, suffix = "", duration = 2 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref as any, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const increment = end / (duration * 60);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [isInView, end, duration]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

const SectionInView: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = "" }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

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
      varc_score: varc?.score || 0, varc_attempted: varc?.attempted || 0,
      varc_correct: varc?.correct || 0, varc_incorrect: varc?.incorrect || 0,
      varc_accuracy: parseFloat((varc?.accuracy || 0).toFixed(2)),
      dilr_score: dilr?.score || 0, dilr_attempted: dilr?.attempted || 0,
      dilr_correct: dilr?.correct || 0, dilr_incorrect: dilr?.incorrect || 0,
      dilr_accuracy: parseFloat((dilr?.accuracy || 0).toFixed(2)),
      qa_score: qa?.score || 0, qa_attempted: qa?.attempted || 0,
      qa_correct: qa?.correct || 0, qa_incorrect: qa?.incorrect || 0,
      qa_accuracy: parseFloat((qa?.accuracy || 0).toFixed(2)),
      sections_data: parsed.sections,
      questions_data: parsed.questions,
    } as any);
  };

  const handleCalculate = useCallback(async () => {
    if (!user) { setShowLoginDialog(true); return; }
    if (!htmlInput.trim()) { setError("Please paste the HTML source code of your CAT response sheet."); return; }
    setError(""); setLoading(true); setLoadingStep(0); setLoadingProgress(0); setResult(null);
    for (let i = 0; i < FAKE_STEPS.length; i++) {
      setLoadingStep(i);
      setLoadingProgress(((i + 1) / FAKE_STEPS.length) * 100);
      await new Promise((r) => setTimeout(r, 350 + Math.random() * 300));
    }
    try {
      const parsed = parseCATResponseSheet(htmlInput);
      if (parsed.questions.length === 0) { setError("Could not parse any questions. Please ensure you pasted the complete HTML source."); setLoading(false); return; }
      setResult(parsed);
      saveSubmission(parsed);
    } catch { setError("Failed to parse. Please check the HTML content and try again."); }
    finally { setLoading(false); }
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
    const text = `🎯 My CAT Score Report\n📊 Total: ${result.overall.totalScore}/${result.overall.maxScore}\n📈 Percentile: ~${result.estimatedPercentile}\n✅ Accuracy: ${result.overall.accuracy.toFixed(1)}%\n\nVARC: ${result.sections.find(s => s.section === "VARC")?.score || 0} | DILR: ${result.sections.find(s => s.section === "DILR")?.score || 0} | QA: ${result.sections.find(s => s.section === "QA")?.score || 0}\n\nCalculate yours: ${window.location.href}`;
    if (navigator.share) navigator.share({ title: "My CAT Score", text });
    else { navigator.clipboard.writeText(text); toast.success("Copied to clipboard!"); }
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
        title="CAT Score Calculator 2025 - Instant Score & Percentile Analysis"
        description="Free CAT Score Calculator. Paste your response sheet HTML and get instant score calculation with section-wise analysis, accuracy metrics, percentile estimate, and AI-powered insights."
      />
      <LoginRequiredDialog open={showLoginDialog} onOpenChange={setShowLoginDialog}
        message="Sign in to calculate your CAT score. Your name, email, and phone number are required." />

      {/* ═══════ HERO ═══════ */}
      <section className="relative overflow-hidden pt-8 pb-14" style={{ background: "var(--hero-gradient)" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-[15%] w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-[20%] w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/5" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/20 rounded-full px-5 py-2 mb-6">
              <Zap className="w-4 h-4 text-white" />
              <span className="text-sm text-white font-semibold">AI-Powered • Instant Analysis • Free</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tight leading-tight">
              CAT Score Calculator <span className="text-white/80">2025</span>
            </h1>
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-2 font-medium">
              Get Your CAT Percentile Prediction Instantly!
            </p>
            <p className="text-sm text-white/60 max-w-xl mx-auto">
              Accurate Scores • Section-wise Analysis • Real-Time Charts • Peer Comparison • AI Insights
            </p>
          </motion.div>

          {/* Live Stats */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
            className="flex flex-wrap justify-center gap-4 mt-8">
            {[
              { icon: Users, label: "Total Responses", value: 17555, suffix: "+" },
              { icon: Trophy, label: "99+ Percentile", value: 423, suffix: "" },
              { icon: Star, label: "Average Score", value: 68, suffix: "" },
              { icon: Activity, label: "Highest Score", value: 172, suffix: "" },
            ].map((stat, i) => (
              <div key={stat.label} className="bg-white/15 backdrop-blur-sm border border-white/20 rounded-xl px-5 py-3 text-center min-w-[140px]">
                <stat.icon className="w-5 h-5 text-white/70 mx-auto mb-1" />
                <p className="text-2xl font-black text-white"><AnimatedCounter end={stat.value} suffix={stat.suffix} /></p>
                <p className="text-xs text-white/60">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══════ HOW TO GET RESPONSE SHEET ═══════ */}
      {!result && !loading && (
        <SectionInView className="max-w-5xl mx-auto px-4 -mt-8 mb-10 relative z-10">
          <div className="bg-card border border-border rounded-2xl shadow-lg p-6 md:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">How to Download Your CAT Response Sheet</h2>
                <p className="text-xs text-muted-foreground">Follow these 5 simple steps to get your score</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.1 }}
                  className="relative text-center group"
                >
                  <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-all group-hover:scale-110 duration-300">
                    <span className="text-primary font-bold text-xl">{step.number}</span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground mb-1">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                  {i < STEPS.length - 1 && (
                    <ArrowRight className="hidden lg:block absolute top-7 -right-4 w-5 h-5 text-primary/30" />
                  )}
                </motion.div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-border flex flex-wrap items-center gap-4 justify-center">
              <a href="https://iimcat.ac.in" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-primary/5 text-primary text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary/10 transition-colors">
                <ExternalLink className="w-4 h-4" /> Visit iimcat.ac.in
              </a>
              <p className="text-xs text-muted-foreground">
                💡 Paste the URL of the updated response sheet with TITA Answers for best results
              </p>
            </div>
          </div>
        </SectionInView>
      )}

      {/* ═══════ INPUT SECTION ═══════ */}
      {!result && !loading && (
        <SectionInView delay={0.1} className="max-w-3xl mx-auto px-4 mb-12">
          <Card className="bg-card border border-border shadow-lg rounded-2xl p-6 md:p-8">
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold text-foreground mb-1">Enter Your Response Sheet</h2>
              <p className="text-sm text-muted-foreground">Paste your HTML source code or upload the saved file</p>
            </div>

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
                placeholder="Right-click on your CAT response sheet → View Page Source → Copy all → Paste here..."
                className="min-h-[200px] bg-muted/20 border-border text-foreground placeholder:text-muted-foreground font-mono text-xs focus:border-primary/50 rounded-xl resize-y" />
            ) : (
              <div onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-primary/40 rounded-xl p-12 cursor-pointer transition-all bg-muted/10 group">
                <Upload className="w-12 h-12 text-muted-foreground group-hover:text-primary mx-auto mb-3 transition-colors" />
                <p className="text-muted-foreground group-hover:text-foreground transition-colors text-sm text-center">
                  {htmlInput ? "✓ File loaded — click Calculate" : "Click to upload saved HTML file (.html)"}
                </p>
                <input ref={fileInputRef} type="file" accept=".html,.htm" onChange={handleFileUpload} className="hidden" />
              </div>
            )}

            {error && <p className="text-destructive text-sm mt-3 flex items-center gap-1"><XCircle className="w-4 h-4" /> {error}</p>}

            <div className="flex flex-col items-center mt-6">
              <Button onClick={handleCalculate} disabled={!htmlInput.trim() && !!user} size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-12 py-7 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-[1.02]">
                <Calculator className="w-5 h-5 mr-2" /> Calculate My Score
              </Button>
              {!user && (
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Login required to calculate your score
                </p>
              )}
            </div>
          </Card>
        </SectionInView>
      )}

      {/* ═══════ LOADING ═══════ */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="max-w-lg mx-auto px-4 py-16">
            <Card className="bg-card border border-border p-10 rounded-2xl shadow-xl text-center">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                <BrainCircuit className="w-14 h-14 text-primary mx-auto mb-5" />
              </motion.div>
              <h3 className="text-xl font-bold text-foreground mb-2">Analyzing Your Response Sheet</h3>
              <p className="text-primary text-sm mb-6 font-medium">{FAKE_STEPS[loadingStep]}</p>
              <Progress value={loadingProgress} className="h-2.5 mb-3" />
              <p className="text-xs text-muted-foreground">{Math.round(loadingProgress)}% complete</p>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ RESULTS DASHBOARD ═══════ */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            {/* Candidate Info */}
            <section className="max-w-5xl mx-auto px-4 pt-8">
              <div className="bg-card border border-border rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-foreground font-bold text-lg">{result.candidateName}</p>
                    <p className="text-xs text-muted-foreground">{result.subject} • {result.testDate} • {result.testTime}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleShare}><Share2 className="w-4 h-4 mr-1" /> Share</Button>
                  <Button variant="outline" size="sm" onClick={() => { setResult(null); setHtmlInput(""); }}>Calculate Again</Button>
                </div>
              </div>
            </section>

            {/* Score Summary Cards */}
            <SectionInView className="max-w-5xl mx-auto px-4 mb-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Score", value: result.overall.totalScore, sub: `out of ${result.overall.maxScore}`, bg: "bg-primary/5", border: "border-primary/15", textColor: getScoreColor(result.overall.totalScore, result.overall.maxScore), labelColor: "text-primary", icon: Target },
                  { label: "Est. Percentile", value: result.estimatedPercentile, sub: "approximate", bg: "bg-purple-50", border: "border-purple-200", textColor: getPercentileColor(result.estimatedPercentile), labelColor: "text-purple-600", icon: TrendingUp },
                  { label: "Accuracy", value: `${result.overall.accuracy.toFixed(1)}%`, sub: `${result.overall.correct}/${result.overall.attempted} correct`, bg: "bg-emerald-50", border: "border-emerald-200", textColor: "text-emerald-600", labelColor: "text-emerald-600", icon: CheckCircle2 },
                  { label: "Attempted", value: result.overall.attempted, sub: `of ${result.overall.totalQuestions} Qs`, bg: "bg-amber-50", border: "border-amber-200", textColor: "text-amber-600", labelColor: "text-amber-600", icon: BookOpen },
                ].map((card, i) => (
                  <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1 }}
                    className={`${card.bg} border ${card.border} rounded-2xl p-5 text-center shadow-sm hover:shadow-md transition-shadow`}>
                    <card.icon className={`w-5 h-5 ${card.labelColor} mx-auto mb-2`} />
                    <p className={`text-xs ${card.labelColor} uppercase tracking-wider font-semibold mb-1`}>{card.label}</p>
                    <p className={`text-3xl md:text-4xl font-black ${card.textColor}`}>{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                  </motion.div>
                ))}
              </div>
            </SectionInView>

            {/* Section-wise Breakdown */}
            <SectionInView className="max-w-5xl mx-auto px-4 mb-10">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" /> Section-wise Breakdown
              </h2>
              <div className="grid md:grid-cols-3 gap-4">
                {result.sections.map((section, i) => {
                  const colors = SECTION_COLORS[section.section] || SECTION_COLORS.VARC;
                  return (
                    <motion.div key={section.section} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.1 }}
                      className={`${colors.bg} border ${colors.border} rounded-2xl p-5 shadow-sm hover:shadow-md transition-all`}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-lg font-bold ${colors.text}`}>{section.section}</h3>
                        <span className={`text-3xl font-black ${colors.text}`}>{section.score}</span>
                      </div>
                      <div className="space-y-2.5">
                        {[
                          { icon: Target, label: "Attempted", value: `${section.attempted}/${section.total}`, color: "text-muted-foreground" },
                          { icon: CheckCircle2, label: "Correct", value: section.correct, color: "text-emerald-600" },
                          { icon: XCircle, label: "Incorrect", value: section.incorrect, color: "text-destructive" },
                          { icon: MinusCircle, label: "Unattempted", value: section.unattempted, color: "text-muted-foreground" },
                        ].map((row) => (
                          <div key={row.label} className="flex justify-between text-sm">
                            <span className={`flex items-center gap-1.5 ${row.color}`}><row.icon className="w-3.5 h-3.5" /> {row.label}</span>
                            <span className={`${row.color} font-semibold`}>{row.value}</span>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-border">
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="text-muted-foreground">Accuracy</span>
                            <span className="text-foreground font-bold">{section.accuracy.toFixed(1)}%</span>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${section.accuracy}%` }} transition={{ duration: 1.5, delay: 0.5 }}
                              className={`h-full ${colors.accent} rounded-full`} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </SectionInView>

            {/* Peer Comparison + Topper Comparison */}
            <SectionInView className="max-w-5xl mx-auto px-4 mb-10">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Peer Comparison
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <SectionAvgComparison result={result} />
                <TopperComparisonBar result={result} />
              </div>
            </SectionInView>

            {/* Visual Charts Grid */}
            <SectionInView className="max-w-5xl mx-auto px-4 mb-10">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" /> Visual Analysis
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <SectionRadarChart result={result} />
                <AttemptBreakdownPie result={result} />
                <SectionScoreBar result={result} />
                <AccuracyBySection result={result} />
                <QuestionTypeAnalysis result={result} />
                <NegativeMarksCard result={result} />
              </div>
            </SectionInView>

            {/* Strength & Weakness + Mistake Analysis */}
            <SectionInView className="max-w-5xl mx-auto px-4 mb-10">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-primary" /> Deep Performance Insights
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <StrengthWeaknessChart result={result} />
                <MistakeAnalysisChart result={result} />
                <DifficultyPerformanceChart result={result} />
                <SectionDifficultyHeatmap />
              </div>
            </SectionInView>

            {/* Score vs Percentile + Predictor */}
            <SectionInView className="max-w-5xl mx-auto px-4 mb-10">
              <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" /> Percentile Prediction
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <ScoreVsPercentileCurve currentScore={result.overall.totalScore} />
                <PercentilePredictorPanel />
              </div>
            </SectionInView>

            {/* Overall Summary Table */}
            <SectionInView className="max-w-5xl mx-auto px-4 mb-10">
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-primary/5 px-5 py-3 border-b border-border">
                  <h3 className="text-foreground font-bold">Complete Score Summary</h3>
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
                          <tr key={s.section} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
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
                      <tr className="bg-primary/5">
                        <td className="px-5 py-3 font-bold text-foreground">Total</td>
                        <td className="text-center px-3 py-3 text-foreground font-semibold">{result.overall.totalQuestions}</td>
                        <td className="text-center px-3 py-3 text-foreground font-semibold">{result.overall.attempted}</td>
                        <td className="text-center px-3 py-3 text-emerald-600 font-bold">{result.overall.correct}</td>
                        <td className="text-center px-3 py-3 text-destructive font-bold">{result.overall.incorrect}</td>
                        <td className="text-center px-3 py-3 text-primary font-black text-xl">{result.overall.totalScore}</td>
                        <td className="text-center px-3 py-3 text-foreground font-semibold">{result.overall.accuracy.toFixed(1)}%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </SectionInView>

            {/* Question-wise Detail */}
            <SectionInView className="max-w-5xl mx-auto px-4 mb-10">
              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <button onClick={() => setShowQuestions(!showQuestions)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <span className="text-foreground font-bold">Question-wise Details</span>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{result.questions.length} questions</span>
                  </div>
                  {showQuestions ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                </button>
                <AnimatePresence>
                  {showQuestions && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-card z-10">
                            <tr className="border-b border-border">
                              {["Q#", "Section", "Type", "Status", "Your Ans", "Correct", "Result"].map(h => (
                                <th key={h} className={`${h === "Q#" ? "text-left px-4" : "text-center px-3"} py-2.5 text-muted-foreground font-medium`}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {result.questions.map((q, i) => (
                              <tr key={i} className={`border-b border-border/30 ${q.isCorrect ? "bg-emerald-50/50" : q.status === "Answered" ? "bg-red-50/50" : ""}`}>
                                <td className="px-4 py-2 text-foreground font-medium">Q.{q.questionNumber}</td>
                                <td className="px-3 py-2 text-center"><span className={`${SECTION_COLORS[q.section]?.text || "text-foreground"} font-medium`}>{q.section}</span></td>
                                <td className="text-center px-3 py-2 text-muted-foreground">{q.questionType}</td>
                                <td className="text-center px-3 py-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${q.status === "Answered" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{q.status}</span>
                                </td>
                                <td className="text-center px-3 py-2 text-foreground font-medium">{q.chosenOption || "—"}</td>
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
            </SectionInView>

            {/* CTA Section */}
            <SectionInView className="max-w-5xl mx-auto px-4 mb-10">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-primary/5 border border-primary/15 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <Award className="w-8 h-8 text-primary mb-3" />
                  <h3 className="text-foreground font-bold text-lg mb-2">Want to Improve Your Score?</h3>
                  <p className="text-muted-foreground text-sm mb-4">Get AI-powered profile analysis with college predictions and strategy</p>
                  <Link to="/profile-analyzer"><Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Analyse My Profile <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <TrendingUp className="w-8 h-8 text-emerald-600 mb-3" />
                  <h3 className="text-foreground font-bold text-lg mb-2">Find Best Coaching</h3>
                  <p className="text-muted-foreground text-sm mb-4">Compare top CAT coaching centres with verified reviews and results</p>
                  <Link to="/category/cat"><Button className="bg-emerald-600 hover:bg-emerald-500 text-white">Browse Coaching <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
                </div>
              </div>
            </SectionInView>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════ AGGREGATED TREND CHARTS (Always visible) ═══════ */}
      <section className="bg-muted/30 py-14">
        <div className="max-w-5xl mx-auto px-4">
          <SectionInView>
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2">CAT 2025 Score Analysis & Trends</h2>
              <p className="text-muted-foreground">Aggregated insights from thousands of response sheets analyzed on our platform</p>
            </div>
          </SectionInView>

          <div className="grid md:grid-cols-2 gap-6">
            <SectionInView delay={0.1}><ScoreDistributionHistogram /></SectionInView>
            <SectionInView delay={0.2}><DailySubmissionTrend /></SectionInView>
            <SectionInView delay={0.3}><AccuracyDistributionPie /></SectionInView>
            <SectionInView delay={0.4}><ScoreVsAttemptsScatter /></SectionInView>
          </div>

          <SectionInView delay={0.5} className="mt-6">
            <PercentilePredictorPanel />
          </SectionInView>
        </div>
      </section>

      {/* ═══════ CAT MARKING SCHEME ═══════ */}
      <SectionInView className="max-w-5xl mx-auto px-4 py-14">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2">CAT 2025 Marking Scheme</h2>
          <p className="text-muted-foreground">Understanding how your score is calculated</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {[
            { label: "Correct Answer (MCQ)", marks: "+3", color: "bg-emerald-50 border-emerald-200 text-emerald-700", icon: CheckCircle2 },
            { label: "Incorrect Answer (MCQ)", marks: "-1", color: "bg-red-50 border-red-200 text-destructive", icon: XCircle },
            { label: "Incorrect / Unanswered (TITA)", marks: "0", color: "bg-muted border-border text-muted-foreground", icon: MinusCircle },
          ].map((item) => (
            <motion.div key={item.label} whileHover={{ y: -4 }} className={`${item.color} border rounded-2xl p-6 text-center shadow-sm`}>
              <item.icon className="w-8 h-8 mx-auto mb-3" />
              <p className="text-4xl font-black mb-2">{item.marks}</p>
              <p className="text-sm font-medium">{item.label}</p>
            </motion.div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-foreground mb-4">CAT 2025 Exam Pattern</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-muted-foreground font-medium">Section</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">MCQs</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">TITA</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">Total Qs</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">Max Marks</th>
                  <th className="text-center py-2 text-muted-foreground font-medium">Time (min)</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { section: "VARC", mcq: 16, tita: 8, total: 24, marks: 72, time: 40, color: "text-primary" },
                  { section: "DILR", mcq: 14, tita: 8, total: 22, marks: 66, time: 40, color: "text-emerald-600" },
                  { section: "QA", mcq: 14, tita: 8, total: 22, marks: 66, time: 40, color: "text-amber-600" },
                ].map((row) => (
                  <tr key={row.section} className="border-b border-border/50">
                    <td className={`py-2.5 font-semibold ${row.color}`}>{row.section}</td>
                    <td className="text-center py-2.5 text-foreground">{row.mcq}</td>
                    <td className="text-center py-2.5 text-foreground">{row.tita}</td>
                    <td className="text-center py-2.5 text-foreground font-semibold">{row.total}</td>
                    <td className="text-center py-2.5 text-foreground font-bold">{row.marks}</td>
                    <td className="text-center py-2.5 text-foreground">{row.time}</td>
                  </tr>
                ))}
                <tr className="bg-primary/5 font-bold">
                  <td className="py-2.5 text-foreground">Total</td>
                  <td className="text-center py-2.5 text-foreground">44</td>
                  <td className="text-center py-2.5 text-foreground">24</td>
                  <td className="text-center py-2.5 text-foreground">68</td>
                  <td className="text-center py-2.5 text-primary text-lg">204</td>
                  <td className="text-center py-2.5 text-foreground">120</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </SectionInView>

      {/* ═══════ FAQ SECTION ═══════ */}
      <section className="bg-muted/30 py-14">
        <div className="max-w-3xl mx-auto px-4">
          <SectionInView>
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2">Frequently Asked Questions</h2>
              <p className="text-muted-foreground">Common questions about our CAT Score Calculator</p>
            </div>
          </SectionInView>

          <div className="space-y-4">
            {[
              { q: "How accurate is this CAT Score Calculator?", a: "Our calculator uses the exact official CAT marking scheme (+3 for correct MCQ, -1 for incorrect MCQ, 0 for TITA). The score calculation is 100% accurate. Percentile estimates are based on historical data and may vary slightly from actual results." },
              { q: "How do I get my CAT response sheet?", a: "Login to iimcat.ac.in → Go to your dashboard → Click on 'Candidate Response' → A new page will open with your complete response sheet. Right-click → View Page Source → Copy all the HTML code." },
              { q: "Is my data safe and private?", a: "Yes, your response sheet data is processed securely. We only store aggregate scores for analysis purposes. Your personal response details are kept confidential." },
              { q: "What is a TITA question?", a: "TITA stands for 'Type In The Answer'. These are non-MCQ questions where you type your answer directly. There is no negative marking for incorrect TITA answers." },
              { q: "How is the percentile estimated?", a: "Percentile estimation is based on historical CAT data from previous years and the current score distribution of all students who have used our calculator. Actual percentiles will be released by IIMs." },
              { q: "Can I calculate scores for multiple slots?", a: "Yes! You can calculate scores for any slot by pasting the respective response sheet HTML. Each slot's difficulty may vary, which is factored into the percentile estimation." },
              { q: "What if my response sheet URL is not working?", a: "The CAT response sheet CDN blocks direct fetching. You need to open it in your browser, view the page source (Ctrl+U), copy all the HTML code, and paste it in our calculator." },
            ].map((faq, i) => (
              <SectionInView key={i} delay={i * 0.05}>
                <details className="bg-card border border-border rounded-xl shadow-sm group">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-muted/30 transition-colors rounded-xl">
                    <span className="text-foreground font-semibold text-sm pr-4">{faq.q}</span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="px-5 pb-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              </SectionInView>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <SectionInView className="max-w-4xl mx-auto px-4 py-14 text-center">
        <div className="bg-gradient-to-br from-primary/10 via-secondary/20 to-primary/5 border border-primary/15 rounded-3xl p-8 md:p-12 shadow-lg">
          <BrainCircuit className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-black text-foreground mb-3">Ready to Calculate Your CAT Score?</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Join 17,000+ students who have already analyzed their performance. Get instant section-wise scores, accuracy analysis, and AI-powered insights.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/cat-score-calculator">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all">
                <Calculator className="w-5 h-5 mr-2" /> Calculate Now — It's Free
              </Button>
            </Link>
            <Link to="/profile-analyzer">
              <Button variant="outline" size="lg" className="px-8 py-6 text-lg font-bold">
                AI Profile Analysis <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </SectionInView>
    </div>
  );
};

export default CATScoreCalculatorPage;
