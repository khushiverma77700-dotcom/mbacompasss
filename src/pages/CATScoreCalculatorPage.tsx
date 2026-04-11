import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { parseCATResponseSheet, type CATResult } from "@/lib/catParser";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SEOHead from "@/components/SEOHead";
import {
  Calculator,
  Upload,
  FileText,
  Target,
  TrendingUp,
  Award,
  BarChart3,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Zap,
  BookOpen,
  BrainCircuit,
  ArrowRight,
  ClipboardPaste,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Link } from "react-router-dom";

const SECTION_COLORS: Record<string, { bg: string; text: string; accent: string; border: string }> = {
  VARC: {
    bg: "from-blue-500/10 to-blue-600/5",
    text: "text-blue-400",
    accent: "bg-blue-500",
    border: "border-blue-500/30",
  },
  DILR: {
    bg: "from-emerald-500/10 to-emerald-600/5",
    text: "text-emerald-400",
    accent: "bg-emerald-500",
    border: "border-emerald-500/30",
  },
  QA: {
    bg: "from-amber-500/10 to-amber-600/5",
    text: "text-amber-400",
    accent: "bg-amber-500",
    border: "border-amber-500/30",
  },
};

const FAKE_STEPS = [
  "Fetching response sheet...",
  "Identifying sections...",
  "Parsing VARC answers...",
  "Parsing DILR answers...",
  "Parsing QA answers...",
  "Calculating section scores...",
  "Computing accuracy metrics...",
  "Estimating percentile...",
  "Generating report...",
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCalculate = useCallback(async () => {
    if (!htmlInput.trim()) {
      setError("Please paste the HTML source code of your CAT response sheet.");
      return;
    }

    setError("");
    setLoading(true);
    setLoadingStep(0);
    setLoadingProgress(0);
    setResult(null);

    // Animated loading sequence
    for (let i = 0; i < FAKE_STEPS.length; i++) {
      setLoadingStep(i);
      setLoadingProgress(((i + 1) / FAKE_STEPS.length) * 100);
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 300));
    }

    try {
      const parsed = parseCATResponseSheet(htmlInput);
      if (parsed.questions.length === 0) {
        setError(
          "Could not parse any questions. Please ensure you pasted the complete HTML source of the CAT response sheet."
        );
        setLoading(false);
        return;
      }
      setResult(parsed);
    } catch {
      setError("Failed to parse the response sheet. Please check the HTML content and try again.");
    } finally {
      setLoading(false);
    }
  }, [htmlInput]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      setHtmlInput(content);
    };
    reader.readAsText(file);
  }, []);

  const getScoreColor = (score: number, max: number) => {
    const pct = max > 0 ? (score / max) * 100 : 0;
    if (pct >= 60) return "text-emerald-400";
    if (pct >= 40) return "text-amber-400";
    return "text-red-400";
  };

  const getPercentileColor = (p: number) => {
    if (p >= 99) return "text-emerald-400";
    if (p >= 95) return "text-blue-400";
    if (p >= 85) return "text-amber-400";
    return "text-red-400";
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      <SEOHead
        title="CAT Score Calculator - Calculate Your CAT 2025 Score Instantly"
        description="Paste your CAT response sheet and get instant score calculation with section-wise analysis, accuracy metrics, and percentile estimate."
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/40 to-transparent" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-1/4 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-blue-300 font-medium">Free • Instant • No Login Required</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight">
              CAT Score{" "}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Calculator
              </span>
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
              Paste your CAT response sheet HTML and get instant section-wise score,
              accuracy analysis & estimated percentile
            </p>
          </motion.div>

          {/* Input Section */}
          {!result && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="max-w-3xl mx-auto"
            >
              {/* Mode Toggle */}
              <div className="flex justify-center gap-3 mb-6">
                <button
                  onClick={() => setInputMode("paste")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    inputMode === "paste"
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  <ClipboardPaste className="w-4 h-4" />
                  Paste HTML
                </button>
                <button
                  onClick={() => setInputMode("upload")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    inputMode === "upload"
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/25"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload File
                </button>
              </div>

              {inputMode === "paste" ? (
                <div className="relative">
                  <Textarea
                    value={htmlInput}
                    onChange={(e) => setHtmlInput(e.target.value)}
                    placeholder="Right-click on your CAT response sheet page → View Page Source → Copy all → Paste here"
                    className="min-h-[200px] bg-[#111128] border-white/10 text-gray-200 placeholder:text-gray-600 font-mono text-xs focus:border-blue-500/50 rounded-xl resize-y"
                  />
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/10 hover:border-blue-500/40 rounded-xl p-12 cursor-pointer transition-all bg-[#111128] group"
                >
                  <Upload className="w-12 h-12 text-gray-600 group-hover:text-blue-400 mx-auto mb-3 transition-colors" />
                  <p className="text-gray-400 group-hover:text-gray-300 transition-colors">
                    {htmlInput ? "✓ File loaded — click Calculate" : "Click to upload saved HTML file"}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".html,.htm"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}

              {error && (
                <p className="text-red-400 text-sm mt-3">{error}</p>
              )}

              <Button
                onClick={handleCalculate}
                disabled={!htmlInput.trim()}
                className="mt-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold px-10 py-6 text-lg rounded-xl shadow-xl shadow-blue-600/20 disabled:opacity-40"
              >
                <Calculator className="w-5 h-5 mr-2" />
                Calculate My Score
              </Button>

              {/* How-to Guide */}
              <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-5 text-left">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-white">How to get your response sheet HTML</span>
                </div>
                <ol className="space-y-2 text-sm text-gray-400">
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-bold">1.</span>
                    Open your CAT response sheet link in Chrome/Firefox
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-bold">2.</span>
                    Right-click anywhere → Click <strong className="text-gray-300">"View Page Source"</strong> (or press Ctrl+U)
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-bold">3.</span>
                    Press <strong className="text-gray-300">Ctrl+A</strong> to select all → <strong className="text-gray-300">Ctrl+C</strong> to copy
                  </li>
                  <li className="flex gap-2">
                    <span className="text-blue-400 font-bold">4.</span>
                    Paste it above and click <strong className="text-gray-300">"Calculate My Score"</strong>
                  </li>
                </ol>
              </div>
            </motion.div>
          )}

          {/* Loading Animation */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-lg mx-auto"
              >
                <Card className="bg-[#111128] border-white/10 p-8 rounded-2xl">
                  <BrainCircuit className="w-12 h-12 text-blue-400 mx-auto mb-4 animate-pulse" />
                  <h3 className="text-xl font-bold text-white mb-2">Analyzing Your Response Sheet</h3>
                  <p className="text-blue-300 text-sm mb-6">{FAKE_STEPS[loadingStep]}</p>
                  <Progress value={loadingProgress} className="h-2 bg-white/10" />
                  <p className="text-xs text-gray-500 mt-3">{Math.round(loadingProgress)}% complete</p>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Results Dashboard */}
      <AnimatePresence>
        {result && (
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-5xl mx-auto px-4 pb-16"
          >
            {/* Candidate Info Bar */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">{result.candidateName}</p>
                  <p className="text-xs text-gray-500">
                    {result.subject} • {result.testDate} • {result.testTime}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setResult(null);
                  setHtmlInput("");
                }}
                className="border-white/20 text-gray-300 hover:bg-white/10"
              >
                Calculate Again
              </Button>
            </div>

            {/* Big Score Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-gradient-to-br from-blue-600/20 to-blue-900/10 border border-blue-500/20 rounded-2xl p-5 text-center"
              >
                <p className="text-xs text-blue-300 uppercase tracking-wider mb-1">Total Score</p>
                <p className={`text-4xl font-black ${getScoreColor(result.overall.totalScore, result.overall.maxScore)}`}>
                  {result.overall.totalScore}
                </p>
                <p className="text-xs text-gray-500 mt-1">out of {result.overall.maxScore}</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-purple-600/20 to-purple-900/10 border border-purple-500/20 rounded-2xl p-5 text-center"
              >
                <p className="text-xs text-purple-300 uppercase tracking-wider mb-1">Est. Percentile</p>
                <p className={`text-4xl font-black ${getPercentileColor(result.estimatedPercentile)}`}>
                  {result.estimatedPercentile}
                </p>
                <p className="text-xs text-gray-500 mt-1">approximate</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-emerald-600/20 to-emerald-900/10 border border-emerald-500/20 rounded-2xl p-5 text-center"
              >
                <p className="text-xs text-emerald-300 uppercase tracking-wider mb-1">Accuracy</p>
                <p className="text-4xl font-black text-emerald-400">
                  {result.overall.accuracy.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {result.overall.correct}/{result.overall.attempted} correct
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-gradient-to-br from-amber-600/20 to-amber-900/10 border border-amber-500/20 rounded-2xl p-5 text-center"
              >
                <p className="text-xs text-amber-300 uppercase tracking-wider mb-1">Attempted</p>
                <p className="text-4xl font-black text-amber-400">
                  {result.overall.attempted}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  of {result.overall.totalQuestions} questions
                </p>
              </motion.div>
            </div>

            {/* Section-wise Breakdown */}
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Section-wise Breakdown
            </h2>

            <div className="grid md:grid-cols-3 gap-4 mb-8">
              {result.sections.map((section, i) => {
                const colors = SECTION_COLORS[section.section] || SECTION_COLORS.VARC;
                return (
                  <motion.div
                    key={section.section}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.15 }}
                    className={`bg-gradient-to-br ${colors.bg} border ${colors.border} rounded-2xl p-5`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-lg font-bold ${colors.text}`}>{section.section}</h3>
                      <span className={`text-2xl font-black ${colors.text}`}>{section.score}</span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Questions</span>
                        <span className="text-white font-medium">{section.total}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-gray-400">
                          <Target className="w-3.5 h-3.5" /> Attempted
                        </span>
                        <span className="text-white font-medium">{section.attempted}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                        </span>
                        <span className="text-emerald-400 font-medium">{section.correct}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-red-400">
                          <XCircle className="w-3.5 h-3.5" /> Incorrect
                        </span>
                        <span className="text-red-400 font-medium">{section.incorrect}</span>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-gray-500">
                          <MinusCircle className="w-3.5 h-3.5" /> Unattempted
                        </span>
                        <span className="text-gray-500 font-medium">{section.unattempted}</span>
                      </div>

                      <div className="pt-2 border-t border-white/10">
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="text-gray-400">Accuracy</span>
                          <span className="text-white font-semibold">{section.accuracy.toFixed(1)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${colors.accent} rounded-full transition-all duration-1000`}
                            style={{ width: `${section.accuracy}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Overall Stats Table */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-8">
              <div className="bg-white/5 px-5 py-3 border-b border-white/10">
                <h3 className="text-white font-bold">Overall Summary</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left px-5 py-3 text-gray-400 font-medium">Section</th>
                      <th className="text-center px-3 py-3 text-gray-400 font-medium">Total</th>
                      <th className="text-center px-3 py-3 text-gray-400 font-medium">Attempted</th>
                      <th className="text-center px-3 py-3 text-emerald-400/70 font-medium">Correct</th>
                      <th className="text-center px-3 py-3 text-red-400/70 font-medium">Incorrect</th>
                      <th className="text-center px-3 py-3 text-gray-400 font-medium">Score</th>
                      <th className="text-center px-3 py-3 text-gray-400 font-medium">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.sections.map((s) => {
                      const colors = SECTION_COLORS[s.section] || SECTION_COLORS.VARC;
                      return (
                        <tr key={s.section} className="border-b border-white/5">
                          <td className={`px-5 py-3 font-semibold ${colors.text}`}>{s.section}</td>
                          <td className="text-center px-3 py-3 text-gray-300">{s.total}</td>
                          <td className="text-center px-3 py-3 text-white">{s.attempted}</td>
                          <td className="text-center px-3 py-3 text-emerald-400 font-medium">{s.correct}</td>
                          <td className="text-center px-3 py-3 text-red-400 font-medium">{s.incorrect}</td>
                          <td className="text-center px-3 py-3 text-white font-bold">{s.score}</td>
                          <td className="text-center px-3 py-3 text-gray-300">{s.accuracy.toFixed(1)}%</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-white/5">
                      <td className="px-5 py-3 font-bold text-white">Total</td>
                      <td className="text-center px-3 py-3 text-white font-semibold">
                        {result.overall.totalQuestions}
                      </td>
                      <td className="text-center px-3 py-3 text-white font-semibold">
                        {result.overall.attempted}
                      </td>
                      <td className="text-center px-3 py-3 text-emerald-400 font-bold">
                        {result.overall.correct}
                      </td>
                      <td className="text-center px-3 py-3 text-red-400 font-bold">
                        {result.overall.incorrect}
                      </td>
                      <td className="text-center px-3 py-3 text-blue-400 font-black text-lg">
                        {result.overall.totalScore}
                      </td>
                      <td className="text-center px-3 py-3 text-white font-semibold">
                        {result.overall.accuracy.toFixed(1)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Question-wise Detail (Collapsible) */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mb-8">
              <button
                onClick={() => setShowQuestions(!showQuestions)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-bold">Question-wise Details</span>
                  <span className="text-xs text-gray-500">({result.questions.length} questions)</span>
                </div>
                {showQuestions ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              <AnimatePresence>
                {showQuestions && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-[#0a0a1a]">
                          <tr className="border-b border-white/10">
                            <th className="text-left px-4 py-2 text-gray-400">Q#</th>
                            <th className="text-left px-3 py-2 text-gray-400">Section</th>
                            <th className="text-center px-3 py-2 text-gray-400">Type</th>
                            <th className="text-center px-3 py-2 text-gray-400">Status</th>
                            <th className="text-center px-3 py-2 text-gray-400">Your Ans</th>
                            <th className="text-center px-3 py-2 text-gray-400">Correct</th>
                            <th className="text-center px-3 py-2 text-gray-400">Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.questions.map((q, i) => (
                            <tr
                              key={i}
                              className={`border-b border-white/5 ${
                                q.isCorrect
                                  ? "bg-emerald-500/5"
                                  : q.status === "Answered"
                                  ? "bg-red-500/5"
                                  : ""
                              }`}
                            >
                              <td className="px-4 py-2 text-gray-300 font-medium">Q.{q.questionNumber}</td>
                              <td className="px-3 py-2">
                                <span
                                  className={`${
                                    SECTION_COLORS[q.section]?.text || "text-gray-300"
                                  } font-medium`}
                                >
                                  {q.section}
                                </span>
                              </td>
                              <td className="text-center px-3 py-2 text-gray-400">{q.questionType}</td>
                              <td className="text-center px-3 py-2">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full ${
                                    q.status === "Answered"
                                      ? "bg-blue-500/10 text-blue-400"
                                      : "bg-gray-500/10 text-gray-500"
                                  }`}
                                >
                                  {q.status}
                                </span>
                              </td>
                              <td className="text-center px-3 py-2 text-white">{q.chosenOption || "—"}</td>
                              <td className="text-center px-3 py-2 text-gray-400">{q.correctOption || "—"}</td>
                              <td className="text-center px-3 py-2">
                                {q.status !== "Answered" ? (
                                  <MinusCircle className="w-4 h-4 text-gray-600 mx-auto" />
                                ) : q.isCorrect ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                                )}
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
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-2xl p-6"
              >
                <Award className="w-8 h-8 text-blue-400 mb-3" />
                <h3 className="text-white font-bold text-lg mb-2">Want to Improve Your Score?</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Get a detailed AI-powered profile analysis with college predictions and personalized strategy
                </p>
                <Link to="/profile-analyzer">
                  <Button className="bg-blue-600 hover:bg-blue-500 text-white">
                    Analyse My Profile <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-gradient-to-br from-emerald-600/10 to-teal-600/10 border border-emerald-500/20 rounded-2xl p-6"
              >
                <TrendingUp className="w-8 h-8 text-emerald-400 mb-3" />
                <h3 className="text-white font-bold text-lg mb-2">Find Best Coaching Institutes</h3>
                <p className="text-gray-400 text-sm mb-4">
                  Compare top CAT coaching centres near you with verified reviews and results
                </p>
                <Link to="/category/cat">
                  <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
                    Browse Coaching <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
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
