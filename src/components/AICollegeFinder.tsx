import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MapPin, IndianRupee, ChevronRight, GraduationCap, Zap, Clock, Briefcase, BookOpen, Target, Star, Users, TrendingUp, ExternalLink, Award, CheckCircle2, Search, Brain, Database, BarChart3, ArrowDown, AlertCircle, Trophy, Building2, Lightbulb, Landmark, Calendar, Ruler, BadgeCheck, ArrowUpRight, Percent, Medal, Shield, Globe2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";

type Step = "tier" | "exam" | "score" | "budget" | "location" | "specialization" | "experience" | "career" | "loading" | "result";

interface CollegeRecommendation {
  rank: number;
  college_name: string;
  college_slug: string;
  tier: string;
  match_score: number;
  why_best_fit: string;
  key_strengths: string[];
  fees: string;
  avg_package: string;
  highest_package: string;
  median_package?: string;
  roi: string;
  location: string;
  exams_accepted: string[];
  specialization_strength: string;
  logo_url?: string;
  established?: string;
  campus_size?: string;
  total_students?: string;
  accreditations?: string[];
  top_recruiters?: string[];
  type?: string;
}

interface AICollegeResult {
  summary: string;
  recommendations: CollegeRecommendation[];
  pro_tips: string[];
  strategy?: {
    priority_targets: string;
    if_score_improves: string;
    budget_alternatives: string;
  };
}

const EXAMS = ["CAT", "XAT", "GMAT", "MAT", "CMAT", "SNAP", "NMAT", "IIFT", "ATMA"];

const LOADING_STAGES = [
  { icon: Search, text: "Scanning 80+ MBA colleges...", duration: 1500 },
  { icon: Brain, text: "Analyzing your profile match...", duration: 2000 },
  { icon: Database, text: "Computing ROI & placement data...", duration: 2000 },
  { icon: BarChart3, text: "Ranking best-fit B-Schools...", duration: 1500 },
  { icon: Sparkles, text: "Building your personalized report...", duration: 2000 },
];

const STEP_CONFIG: Record<string, { title: string; icon: any; color: string }> = {
  tier: { title: "College Type", icon: Building2, color: "from-blue-500 to-indigo-600" },
  exam: { title: "Target Exams", icon: BookOpen, color: "from-violet-500 to-purple-600" },
  score: { title: "Expected Score", icon: Target, color: "from-emerald-500 to-teal-600" },
  budget: { title: "Budget", icon: IndianRupee, color: "from-amber-500 to-orange-600" },
  location: { title: "Location", icon: MapPin, color: "from-rose-500 to-pink-600" },
  specialization: { title: "Specialization", icon: Layers, color: "from-cyan-500 to-blue-600" },
  experience: { title: "Experience", icon: Briefcase, color: "from-lime-500 to-green-600" },
  career: { title: "Career Goal", icon: Trophy, color: "from-fuchsia-500 to-purple-600" },
};

interface AICollegeFinderProps {
  onTryManually?: () => void;
}

const AICollegeFinder = ({ onTryManually }: AICollegeFinderProps) => {
  const [step, setStep] = useState<Step>("tier");
  const [collegeTier, setCollegeTier] = useState("");
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [expectedScore, setExpectedScore] = useState("");
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [experience, setExperience] = useState("");
  const [careerGoal, setCareerGoal] = useState("");
  const [aiResult, setAiResult] = useState<AICollegeResult | null>(null);
  const [error, setError] = useState("");
  const [loadingStage, setLoadingStage] = useState(0);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  const reset = () => {
    setStep("tier"); setCollegeTier(""); setSelectedExams([]); setExpectedScore("");
    setBudget(""); setLocation(""); setSpecialization(""); setExperience("");
    setCareerGoal(""); setAiResult(null); setError(""); setLoadingStage(0); setExpandedCard(null);
  };

  const allSteps: Step[] = ["tier", "exam", "score", "budget", "location", "specialization", "experience", "career"];
  const currentIdx = allSteps.indexOf(step);
  const totalSteps = allSteps.length;

  const toggleExam = (exam: string) => {
    setSelectedExams(prev => prev.includes(exam) ? prev.filter(e => e !== exam) : [...prev, exam]);
  };

  useEffect(() => {
    if (step !== "loading") return;
    setLoadingStage(0);
    const timers: NodeJS.Timeout[] = [];
    let cumulative = 0;
    LOADING_STAGES.forEach((s, i) => {
      cumulative += s.duration;
      if (i < LOADING_STAGES.length - 1) {
        timers.push(setTimeout(() => setLoadingStage(i + 1), cumulative));
      }
    });
    return () => timers.forEach(clearTimeout);
  }, [step]);

  const fetchRecommendations = async (selectedCareer: string) => {
    setStep("loading");
    setAiResult(null);
    setError("");
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mba-college-finder`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          preferences: {
            collegeTier: collegeTier || "any",
            targetExams: selectedExams.length > 0 ? selectedExams.join(", ") : "any",
            expectedScore: expectedScore || "not specified",
            budget: budget || "any",
            location: location || "any",
            specialization: specialization || "any",
            experience: experience || "any",
            careerGoal: selectedCareer || "any",
          },
        }),
      });
      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get recommendations");
      }
      const data: AICollegeResult = await resp.json();
      setAiResult(data);
      setStep("result");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("result");
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 90) return { bg: "bg-emerald-500", text: "text-emerald-700", ring: "ring-emerald-200", light: "bg-emerald-50" };
    if (score >= 75) return { bg: "bg-blue-500", text: "text-blue-700", ring: "ring-blue-200", light: "bg-blue-50" };
    return { bg: "bg-amber-500", text: "text-amber-700", ring: "ring-amber-200", light: "bg-amber-50" };
  };

  // --- Step UI Components ---
  const StepCard = ({ icon: Icon, title, subtitle, onClick, accent }: { icon: any; title: string; subtitle: string; onClick: () => void; accent?: string }) => (
    <motion.button whileHover={{ scale: 1.015, y: -2 }} whileTap={{ scale: 0.98 }} onClick={onClick}
      className="w-full p-4 rounded-2xl border border-border hover:border-primary/40 bg-card hover:bg-secondary/30 text-left transition-all group flex items-center gap-4 shadow-sm hover:shadow-md">
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${accent || "from-primary/20 to-primary/5"} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-foreground text-sm">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>
      </div>
      <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </motion.button>
  );

  const ChipBtn = ({ label, icon: Icon, onClick, active }: { label: string; icon?: any; onClick: () => void; active?: boolean }) => (
    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onClick}
      className={`px-4 py-2.5 rounded-2xl border-2 font-semibold text-xs transition-all ${active
        ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/20"
        : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-secondary/20"
      }`}>
      <span className="flex items-center gap-1.5">
        {Icon && <Icon className={`w-3.5 h-3.5 ${active ? "" : "text-muted-foreground"}`} />}
        {label}
      </span>
    </motion.button>
  );

  // --- Recommendation Card (completely different from coaching) ---
  const RecommendationCard = ({ rec }: { rec: CollegeRecommendation }) => {
    const colors = getMatchColor(rec.match_score);
    const isExpanded = expandedCard === rec.rank;
    const rankEmoji = rec.rank === 1 ? "🥇" : rec.rank === 2 ? "🥈" : rec.rank === 3 ? "🥉" : `#${rec.rank}`;

    return (
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: rec.rank * 0.1, type: "spring", stiffness: 180 }}>
        <div className={`rounded-2xl border-2 overflow-hidden transition-all duration-300 bg-card ${rec.rank === 1 ? "border-primary/50 shadow-xl shadow-primary/10" : "border-border shadow-md hover:shadow-lg"}`}>
          {/* Top ribbon */}
          <div className={`h-1.5 w-full ${rec.rank === 1 ? "bg-gradient-to-r from-amber-400 via-primary to-violet-500" : rec.rank === 2 ? "bg-gradient-to-r from-slate-300 via-slate-400 to-slate-300" : "bg-gradient-to-r from-amber-600 via-amber-700 to-amber-600"}`} />

          {/* Header row */}
          <div className="p-4 pb-0 flex items-start gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl border-2 border-border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {rec.logo_url ? (
                  <img src={rec.logo_url} alt={rec.college_name} className="w-full h-full object-contain p-1" loading="lazy" />
                ) : (
                  <Landmark className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <span className="absolute -top-2 -left-2 text-lg">{rankEmoji}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-foreground text-base leading-tight">{rec.college_name}</h4>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-semibold">{rec.tier}</Badge>
                {rec.type && <Badge variant="outline" className="text-[10px] px-2 py-0.5">{rec.type}</Badge>}
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" /> {rec.location}
                </span>
              </div>
            </div>
            {/* Match score circle */}
            <div className="shrink-0 text-center">
              <div className={`w-14 h-14 rounded-full ${colors.light} border-2 ${colors.ring} flex flex-col items-center justify-center`}>
                <span className={`text-lg font-black ${colors.text}`}>{rec.match_score}</span>
                <span className="text-[8px] font-semibold text-muted-foreground -mt-0.5">MATCH</span>
              </div>
            </div>
          </div>

          {/* AI Insight */}
          <div className="px-4 pt-3">
            <div className="bg-gradient-to-r from-primary/[0.06] via-primary/[0.03] to-transparent rounded-xl p-3 border border-primary/10">
              <p className="text-xs text-foreground/80 leading-relaxed">
                <Sparkles className="w-3.5 h-3.5 text-primary inline mr-1.5" />
                {rec.why_best_fit}
              </p>
            </div>
          </div>

          {/* 6-column metrics dashboard */}
          <div className="px-4 pt-3">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { label: "Fees", value: rec.fees, icon: IndianRupee, accent: "text-primary", bg: "bg-primary/5 border-primary/10" },
                { label: "Avg CTC", value: rec.avg_package, icon: TrendingUp, accent: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
                { label: "Highest CTC", value: rec.highest_package, icon: ArrowUpRight, accent: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
                { label: "ROI", value: `${rec.roi}x`, icon: Percent, accent: "text-violet-600", bg: "bg-violet-50 border-violet-100" },
                { label: "Est.", value: rec.established || "—", icon: Calendar, accent: "text-amber-600", bg: "bg-amber-50 border-amber-100" },
                { label: "Campus", value: rec.campus_size || "—", icon: Ruler, accent: "text-rose-600", bg: "bg-rose-50 border-rose-100" },
              ].map((m) => (
                <div key={m.label} className={`rounded-xl p-2 text-center border ${m.bg}`}>
                  <m.icon className={`w-3.5 h-3.5 mx-auto mb-0.5 ${m.accent}`} />
                  <div className="text-[8px] text-muted-foreground uppercase tracking-wider font-medium">{m.label}</div>
                  <div className={`text-[10px] font-bold mt-0.5 ${m.accent}`}>{m.value || "N/A"}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Accreditations row */}
          <div className="px-4 pt-3 flex flex-wrap gap-1.5">
            {rec.key_strengths?.slice(0, 4).map((s, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2.5 py-0.5 font-medium">
                <CheckCircle2 className="w-2.5 h-2.5" /> {s}
              </span>
            ))}
            {rec.accreditations?.slice(0, 3).map((a, i) => (
              <span key={`acc-${i}`} className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 border border-blue-100 rounded-full px-2.5 py-0.5 font-medium">
                <Shield className="w-2.5 h-2.5" /> {a}
              </span>
            ))}
          </div>

          {/* Expandable details */}
          <div className="px-4 pt-3">
            <button onClick={() => setExpandedCard(isExpanded ? null : rec.rank)}
              className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              {isExpanded ? "Show less" : "Show full details"}
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
            </button>
          </div>

          <AnimatePresence>
            {isExpanded && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="px-4 pt-3 space-y-3">
                  {/* Extra metrics row */}
                  <div className="grid grid-cols-3 gap-2">
                    {rec.median_package && (
                      <div className="bg-muted/40 rounded-xl p-2.5 text-center">
                        <div className="text-[9px] text-muted-foreground uppercase">Median CTC</div>
                        <div className="text-xs font-bold text-foreground mt-0.5">{rec.median_package}</div>
                      </div>
                    )}
                    {rec.total_students && (
                      <div className="bg-muted/40 rounded-xl p-2.5 text-center">
                        <div className="text-[9px] text-muted-foreground uppercase">Students</div>
                        <div className="text-xs font-bold text-foreground mt-0.5">{rec.total_students}</div>
                      </div>
                    )}
                    <div className="bg-muted/40 rounded-xl p-2.5 text-center">
                      <div className="text-[9px] text-muted-foreground uppercase">Exams</div>
                      <div className="text-xs font-bold text-foreground mt-0.5">{rec.exams_accepted?.length || 0}+</div>
                    </div>
                  </div>

                  {/* Exams */}
                  {rec.exams_accepted?.length > 0 && (
                    <div>
                      <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Accepted Exams</div>
                      <div className="flex flex-wrap gap-1">
                        {rec.exams_accepted.map((e, i) => (
                          <Badge key={i} variant="outline" className="text-[9px] px-2 py-0.5">{e}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top Recruiters */}
                  {rec.top_recruiters && rec.top_recruiters.length > 0 && (
                    <div>
                      <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1.5">Top Recruiters</div>
                      <div className="flex flex-wrap gap-1">
                        {rec.top_recruiters.slice(0, 8).map((r, i) => (
                          <span key={i} className="text-[10px] bg-muted/60 text-foreground/80 rounded-lg px-2 py-0.5">{r}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {rec.specialization_strength && (
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs text-muted-foreground">Strong in: </span>
                      <Badge className="bg-primary/10 text-primary border-0 text-[10px]">{rec.specialization_strength}</Badge>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer CTA */}
          <div className="p-4 pt-3">
            <Link to={`/college/${rec.college_slug}`}>
              <Button size="sm" className="w-full gap-2 text-xs h-10 font-semibold rounded-xl">
                <ExternalLink className="w-3.5 h-3.5" /> View Full College Profile
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    );
  };

  // --- MAIN RENDER ---
  if (step === "result" || step === "loading") {
    return (
      <div className="space-y-4">
        {step === "loading" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-12">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <motion.div className="absolute inset-0 rounded-full border-4 border-primary/20" animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
              <motion.div className="absolute inset-2 rounded-full border-2 border-primary/30" animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.1, 0.6] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }} />
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary via-primary/80 to-violet-600 flex items-center justify-center shadow-2xl shadow-primary/30">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                  <Brain className="w-8 h-8 text-primary-foreground" />
                </motion.div>
              </div>
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={loadingStage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center mb-5">
                <div className="flex items-center justify-center gap-2 mb-1.5">
                  {(() => { const StageIcon = LOADING_STAGES[loadingStage]?.icon || Sparkles; return <StageIcon className="w-5 h-5 text-primary" />; })()}
                  <h4 className="font-bold text-foreground text-base">{LOADING_STAGES[loadingStage]?.text || "Almost there..."}</h4>
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="max-w-sm mx-auto">
              <Progress value={((loadingStage + 1) / LOADING_STAGES.length) * 100} className="h-2" />
              <p className="text-center text-[11px] text-muted-foreground mt-2">Analyzing {totalSteps} preference dimensions</p>
            </div>
          </motion.div>
        )}

        {step === "result" && error && (
          <div className="text-center py-10">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <p className="text-sm text-destructive font-semibold mb-3">{error}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={reset} variant="outline" size="sm" className="gap-1.5"><Sparkles className="w-3.5 h-3.5" /> Try Again</Button>
              {onTryManually && <Button onClick={onTryManually} variant="secondary" size="sm" className="gap-1.5"><ArrowDown className="w-3.5 h-3.5" /> Compare Manually</Button>}
            </div>
          </div>
        )}

        {step === "result" && aiResult && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Results header */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-violet-500/5 rounded-2xl p-5 border border-primary/15 mb-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center shadow-lg">
                    <Sparkles className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-base">Your AI College Report</h3>
                    <p className="text-[11px] text-muted-foreground">{aiResult.recommendations?.length || 0} colleges matched from 80+ database</p>
                  </div>
                </div>
                <Button onClick={reset} variant="outline" size="sm" className="gap-1.5 text-xs rounded-xl">
                  <Sparkles className="w-3.5 h-3.5" /> New Search
                </Button>
              </div>

              {/* Preference pills */}
              <div className="flex flex-wrap gap-1.5">
                {collegeTier && collegeTier !== "any" && <Badge className="bg-blue-100 text-blue-800 border-0 text-[10px]"><Building2 className="w-2.5 h-2.5 mr-1" />{collegeTier}</Badge>}
                {selectedExams.map(e => <Badge key={e} className="bg-violet-100 text-violet-800 border-0 text-[10px]"><BookOpen className="w-2.5 h-2.5 mr-1" />{e}</Badge>)}
                {expectedScore && <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px]"><Target className="w-2.5 h-2.5 mr-1" />{expectedScore}%ile</Badge>}
                {budget && budget !== "any" && <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px]"><IndianRupee className="w-2.5 h-2.5 mr-1" />{budget}</Badge>}
                {location && location !== "any" && <Badge className="bg-rose-100 text-rose-800 border-0 text-[10px]"><MapPin className="w-2.5 h-2.5 mr-1" />{location}</Badge>}
                {specialization && specialization !== "any" && <Badge className="bg-cyan-100 text-cyan-800 border-0 text-[10px]"><Layers className="w-2.5 h-2.5 mr-1" />{specialization}</Badge>}
              </div>
            </div>

            {/* Summary */}
            {aiResult.summary && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="bg-card rounded-2xl p-4 border border-border mb-5 shadow-sm">
                <p className="text-sm text-foreground/85 leading-relaxed">
                  <Brain className="w-4 h-4 text-primary inline mr-2" />
                  {aiResult.summary}
                </p>
              </motion.div>
            )}

            {/* Recommendation cards */}
            <div className="space-y-4">
              {aiResult.recommendations?.map((rec) => (
                <RecommendationCard key={rec.rank} rec={rec} />
              ))}
            </div>

            {/* Strategy Panel */}
            {aiResult.strategy && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="mt-5 bg-gradient-to-br from-primary/[0.04] to-violet-500/[0.04] rounded-2xl p-5 border border-primary/15">
                <h4 className="font-bold text-foreground text-sm mb-3 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" /> Your Personalized Strategy
                </h4>
                <div className="grid sm:grid-cols-3 gap-3">
                  {[
                    { icon: Target, label: "Priority Targets", text: aiResult.strategy.priority_targets, color: "border-primary/20 bg-primary/5" },
                    { icon: TrendingUp, label: "Score Improvement", text: aiResult.strategy.if_score_improves, color: "border-emerald-200 bg-emerald-50" },
                    { icon: IndianRupee, label: "Budget Alternatives", text: aiResult.strategy.budget_alternatives, color: "border-amber-200 bg-amber-50" },
                  ].filter(s => s.text).map((s, i) => (
                    <div key={i} className={`rounded-xl p-3 border ${s.color}`}>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <s.icon className="w-3.5 h-3.5 text-foreground" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">{s.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{s.text}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Pro Tips */}
            {aiResult.pro_tips?.length > 0 && (
              <div className="mt-4 bg-muted/30 rounded-2xl p-4 border border-border">
                <h4 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500" /> Pro Tips
                </h4>
                <div className="space-y-1.5">
                  {aiResult.pro_tips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Lightbulb className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                      <span>{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom CTAs */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              {onTryManually && (
                <Button onClick={onTryManually} variant="outline" size="lg" className="gap-2 text-xs rounded-xl h-11">
                  <ArrowDown className="w-4 h-4" /> Compare Manually
                </Button>
              )}
              <Link to="/profile-analyzer" className={onTryManually ? "" : "col-span-2"}>
                <Button size="lg" className="w-full gap-2 text-xs rounded-xl h-11">
                  <Target className="w-4 h-4" /> Get Profile Analysis
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  // --- WIZARD STEPS ---
  return (
    <div className="bg-card rounded-2xl border-2 border-primary/15 overflow-hidden shadow-lg">
      {/* Wizard header */}
      <div className="bg-gradient-to-r from-primary via-primary/90 to-violet-600 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">AI College Finder</h3>
            <p className="text-white/70 text-[11px]">Answer {totalSteps} quick questions for personalized picks</p>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1">
          {allSteps.map((s, i) => {
            const config = STEP_CONFIG[s];
            const isActive = i === currentIdx;
            const isDone = i < currentIdx;
            return (
              <div key={s} className="flex-1">
                <div className={`h-1.5 rounded-full transition-all duration-300 ${isDone ? "bg-white" : isActive ? "bg-white/80" : "bg-white/20"}`} />
                {isActive && (
                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1 mt-1.5">
                    <config.icon className="w-3 h-3 text-white/80" />
                    <span className="text-[9px] text-white/80 font-medium">{config.title}</span>
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="p-5">
        <AnimatePresence mode="wait">
          {step === "tier" && (
            <motion.div key="tier" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h4 className="font-bold text-foreground mb-1 text-sm">What type of colleges are you targeting?</h4>
              <p className="text-xs text-muted-foreground mb-4">Choose your preferred tier of B-Schools</p>
              <div className="space-y-2.5">
                <StepCard icon={Trophy} title="Only IIMs" subtitle="Top Indian Institutes of Management — for the elite" onClick={() => { setCollegeTier("Only IIMs"); setStep("exam"); }} accent="from-amber-400/30 to-amber-500/10" />
                <StepCard icon={Award} title="Tier 1 B-Schools" subtitle="IIMs + XLRI, FMS, ISB, MDI, SPJIMR and top 20" onClick={() => { setCollegeTier("Tier 1"); setStep("exam"); }} accent="from-blue-400/30 to-blue-500/10" />
                <StepCard icon={Building2} title="Tier 2 Colleges" subtitle="Good B-Schools with strong ROI & placements" onClick={() => { setCollegeTier("Tier 2"); setStep("exam"); }} accent="from-emerald-400/30 to-emerald-500/10" />
                <StepCard icon={Globe2} title="Open to All Options" subtitle="Show me everything that matches my profile" onClick={() => { setCollegeTier("Open to all"); setStep("exam"); }} accent="from-violet-400/30 to-violet-500/10" />
              </div>
            </motion.div>
          )}

          {step === "exam" && (
            <motion.div key="exam" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h4 className="font-bold text-foreground mb-1 text-sm">Which entrance exams are you targeting?</h4>
              <p className="text-xs text-muted-foreground mb-4">Select one or more exams</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {EXAMS.map((e) => (
                  <ChipBtn key={e} label={e} icon={BookOpen} onClick={() => toggleExam(e)} active={selectedExams.includes(e)} />
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setStep("score")} disabled={selectedExams.length === 0} className="flex-1 gap-2 rounded-xl h-10" size="sm">
                  Continue <ChevronRight className="w-4 h-4" />
                </Button>
                <Button onClick={() => { setSelectedExams([]); setStep("score"); }} variant="ghost" size="sm" className="text-xs text-muted-foreground">Skip</Button>
              </div>
            </motion.div>
          )}

          {step === "score" && (
            <motion.div key="score" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h4 className="font-bold text-foreground mb-1 text-sm">What's your expected percentile?</h4>
              <p className="text-xs text-muted-foreground mb-4">This helps match you with realistic options</p>
              <div className="space-y-2.5">
                <StepCard icon={Trophy} title="99+ Percentile" subtitle="Top 1% — IIM A/B/C/L caliber" onClick={() => { setExpectedScore("99+"); setStep("budget"); }} accent="from-amber-400/30 to-amber-500/10" />
                <StepCard icon={Award} title="95-99 Percentile" subtitle="Other IIMs, XLRI, FMS, IIFT" onClick={() => { setExpectedScore("95-99"); setStep("budget"); }} accent="from-blue-400/30 to-blue-500/10" />
                <StepCard icon={Star} title="90-95 Percentile" subtitle="New IIMs, good Tier 1 colleges" onClick={() => { setExpectedScore("90-95"); setStep("budget"); }} accent="from-emerald-400/30 to-emerald-500/10" />
                <StepCard icon={Target} title="80-90 Percentile" subtitle="Tier 2 B-Schools with strong placements" onClick={() => { setExpectedScore("80-90"); setStep("budget"); }} accent="from-violet-400/30 to-violet-500/10" />
                <StepCard icon={BookOpen} title="Below 80 / Not Sure" subtitle="Still exploring — show all viable options" onClick={() => { setExpectedScore("Below 80"); setStep("budget"); }} accent="from-rose-400/30 to-rose-500/10" />
              </div>
            </motion.div>
          )}

          {step === "budget" && (
            <motion.div key="budget" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h4 className="font-bold text-foreground mb-1 text-sm">What's your budget for MBA?</h4>
              <p className="text-xs text-muted-foreground mb-4">Include tuition + living expenses</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Under ₹10L", value: "Under 10L" },
                  { label: "₹10 – ₹20L", value: "10-20L" },
                  { label: "₹20 – ₹30L", value: "20-30L" },
                  { label: "₹30L+", value: "30L+" },
                  { label: "No Limit", value: "any" },
                ].map((b) => (
                  <ChipBtn key={b.value} label={b.label} icon={IndianRupee} onClick={() => { setBudget(b.value); setStep("location"); }} />
                ))}
              </div>
            </motion.div>
          )}

          {step === "location" && (
            <motion.div key="location" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h4 className="font-bold text-foreground mb-1 text-sm">Preferred location?</h4>
              <p className="text-xs text-muted-foreground mb-4">Where would you like to study?</p>
              <div className="flex flex-wrap gap-2">
                {["Mumbai", "Delhi NCR", "Bangalore", "Kolkata", "Chennai", "Hyderabad", "Pune", "Ahmedabad", "Lucknow", "Indore", "Jaipur", "Any Location"].map((c) => (
                  <ChipBtn key={c} label={c} icon={MapPin} onClick={() => { setLocation(c === "Any Location" ? "any" : c); setStep("specialization"); }} />
                ))}
              </div>
            </motion.div>
          )}

          {step === "specialization" && (
            <motion.div key="spec" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h4 className="font-bold text-foreground mb-1 text-sm">Interested specialization?</h4>
              <p className="text-xs text-muted-foreground mb-4">Pick your area of interest</p>
              <div className="space-y-2.5">
                <StepCard icon={TrendingUp} title="Finance" subtitle="Investment banking, financial analysis, corporate finance" onClick={() => { setSpecialization("Finance"); setStep("experience"); }} accent="from-emerald-400/30 to-emerald-500/10" />
                <StepCard icon={Users} title="Marketing" subtitle="Brand management, digital marketing, advertising" onClick={() => { setSpecialization("Marketing"); setStep("experience"); }} accent="from-blue-400/30 to-blue-500/10" />
                <StepCard icon={Lightbulb} title="Consulting" subtitle="Strategy, management consulting, McKinsey/BCG/Bain" onClick={() => { setSpecialization("Consulting"); setStep("experience"); }} accent="from-violet-400/30 to-violet-500/10" />
                <StepCard icon={Briefcase} title="Operations / HR" subtitle="Supply chain, operations, human resources" onClick={() => { setSpecialization("Operations/HR"); setStep("experience"); }} accent="from-amber-400/30 to-amber-500/10" />
                <StepCard icon={Layers} title="Not Sure Yet" subtitle="I'm exploring all specializations" onClick={() => { setSpecialization("any"); setStep("experience"); }} accent="from-rose-400/30 to-rose-500/10" />
              </div>
            </motion.div>
          )}

          {step === "experience" && (
            <motion.div key="exp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h4 className="font-bold text-foreground mb-1 text-sm">Your work experience?</h4>
              <p className="text-xs text-muted-foreground mb-4">This impacts college fit and interview readiness</p>
              <div className="space-y-2.5">
                <StepCard icon={GraduationCap} title="Fresher / Student" subtitle="Currently studying or just graduated" onClick={() => { setExperience("Fresher"); setStep("career"); }} />
                <StepCard icon={Briefcase} title="1-2 Years" subtitle="Early career professional" onClick={() => { setExperience("1-2 years"); setStep("career"); }} />
                <StepCard icon={Briefcase} title="2-4 Years" subtitle="Mid-level professional — ideal for most MBA programs" onClick={() => { setExperience("2-4 years"); setStep("career"); }} />
                <StepCard icon={Award} title="4+ Years" subtitle="Senior professional — great for executive MBA programs" onClick={() => { setExperience("4+ years"); setStep("career"); }} />
              </div>
            </motion.div>
          )}

          {step === "career" && (
            <motion.div key="career" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h4 className="font-bold text-foreground mb-1 text-sm">What's your primary career goal?</h4>
              <p className="text-xs text-muted-foreground mb-4">Final step! This shapes your recommendations</p>
              <div className="space-y-2.5">
                <StepCard icon={IndianRupee} title="High-Paying Job" subtitle="Top packages, blue-chip corporate placements" onClick={() => { setCareerGoal("High-paying job"); fetchRecommendations("High-paying job"); }} accent="from-emerald-400/30 to-emerald-500/10" />
                <StepCard icon={Lightbulb} title="Management Consulting" subtitle="McKinsey, BCG, Bain, Deloitte, Accenture" onClick={() => { setCareerGoal("Consulting"); fetchRecommendations("Consulting"); }} accent="from-blue-400/30 to-blue-500/10" />
                <StepCard icon={Zap} title="Startup / Entrepreneurship" subtitle="Launch or scale your own venture" onClick={() => { setCareerGoal("Startup"); fetchRecommendations("Startup"); }} accent="from-amber-400/30 to-amber-500/10" />
                <StepCard icon={Globe2} title="Abroad Opportunities" subtitle="Global placements, international exposure" onClick={() => { setCareerGoal("Abroad"); fetchRecommendations("Abroad"); }} accent="from-violet-400/30 to-violet-500/10" />
                <StepCard icon={Layers} title="Not Sure Yet" subtitle="Open to all career paths" onClick={() => { setCareerGoal("any"); fetchRecommendations("any"); }} accent="from-rose-400/30 to-rose-500/10" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AICollegeFinder;
