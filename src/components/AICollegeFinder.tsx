import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, MapPin, IndianRupee, ChevronRight, ChevronDown, GraduationCap, Zap, Clock, Briefcase, BookOpen, Target, Star, Users, TrendingUp, ExternalLink, Award, CheckCircle2, Search, Brain, Database, BarChart3, ArrowDown, AlertCircle, Trophy, Building2, Lightbulb } from "lucide-react";
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
  roi: string;
  location: string;
  exams_accepted: string[];
  specialization_strength: string;
  logo_url?: string;
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
  { icon: Search, text: "Scanning college database...", duration: 1500 },
  { icon: Brain, text: "Analyzing your profile...", duration: 2000 },
  { icon: Database, text: "Matching top B-Schools...", duration: 2000 },
  { icon: BarChart3, text: "Calculating match scores & ROI...", duration: 1500 },
  { icon: Sparkles, text: "Crafting personalized picks...", duration: 2000 },
];

interface AICollegeFinderProps {
  onTryManually?: () => void;
}

const AICollegeFinder = ({ onTryManually }: AICollegeFinderProps) => {
  const [isOpen, setIsOpen] = useState(false);
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

  const reset = () => {
    setStep("tier"); setCollegeTier(""); setSelectedExams([]); setExpectedScore("");
    setBudget(""); setLocation(""); setSpecialization(""); setExperience("");
    setCareerGoal(""); setAiResult(null); setError(""); setLoadingStage(0);
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

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-700 bg-emerald-50 border-emerald-200";
    if (score >= 75) return "text-blue-700 bg-blue-50 border-blue-200";
    return "text-amber-700 bg-amber-50 border-amber-200";
  };
  const getScoreGradient = (score: number) => {
    if (score >= 90) return "from-emerald-500 to-emerald-600";
    if (score >= 75) return "from-blue-500 to-blue-600";
    return "from-amber-500 to-amber-600";
  };
  const getRankStyle = (rank: number) => {
    if (rank === 1) return { badge: "🥇 #1 Best Match", border: "border-primary/50 shadow-lg shadow-primary/10", header: "bg-gradient-to-r from-primary/15 via-primary/8 to-amber-50/30" };
    if (rank === 2) return { badge: "🥈 #2 Great Fit", border: "border-border shadow-md", header: "bg-gradient-to-r from-muted/60 to-muted/20" };
    if (rank === 3) return { badge: "🥉 #3 Good Option", border: "border-border shadow-sm", header: "bg-gradient-to-r from-muted/40 to-muted/10" };
    return { badge: `#${rank} Option`, border: "border-border", header: "bg-muted/20" };
  };

  const OptionBtn = ({ icon: Icon, label, desc, onClick }: { icon: any; label: string; desc: string; onClick: () => void }) => (
    <motion.button whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} onClick={onClick}
      className="w-full p-3.5 rounded-xl border border-border hover:border-primary/50 hover:shadow-md bg-card text-left transition-all group flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 group-hover:from-primary/25 group-hover:to-primary/10 transition-all">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-foreground text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
    </motion.button>
  );

  const GridBtn = ({ label, icon: Icon, onClick, active }: { label: string; icon?: any; onClick: () => void; active?: boolean }) => (
    <motion.button whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.96 }} onClick={onClick}
      className={`p-3 rounded-xl border ${active ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20" : "border-border"} hover:border-primary/50 hover:shadow-sm bg-card text-center transition-all`}>
      {Icon && <Icon className={`w-4 h-4 mx-auto mb-1 ${active ? "text-primary" : "text-primary/70"}`} />}
      <div className={`font-semibold text-xs ${active ? "text-primary" : "text-foreground"}`}>{label}</div>
    </motion.button>
  );

  const RecommendationCard = ({ rec }: { rec: CollegeRecommendation }) => {
    const rankStyle = getRankStyle(rec.rank);
    return (
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: rec.rank * 0.12, type: "spring", stiffness: 200 }}>
        <Card className={`overflow-hidden border-2 hover:shadow-xl transition-all duration-300 ${rankStyle.border}`}>
          <div className={`px-4 py-3 flex items-center justify-between border-b ${rankStyle.header}`}>
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 font-bold border-primary/20 bg-background/80">{rankStyle.badge}</Badge>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${getScoreColor(rec.match_score)}`}>
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${getScoreGradient(rec.match_score)}`} />
              {rec.match_score}% Match
            </div>
          </div>
          <CardContent className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                {rec.logo_url ? (
                  <img src={rec.logo_url} alt={rec.college_name} className="w-full h-full object-cover rounded-xl" loading="lazy" />
                ) : (
                  <GraduationCap className="w-7 h-7 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-foreground text-sm leading-tight">{rec.college_name}</h4>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{rec.tier}</Badge>
                  {rec.location && (
                    <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                      <MapPin className="w-3 h-3" /> {rec.location}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* AI Insight */}
            <div className="bg-gradient-to-r from-primary/[0.06] to-primary/[0.02] rounded-lg p-3 mb-3 border border-primary/10">
              <p className="text-xs text-foreground/80 leading-relaxed">
                <Sparkles className="w-3 h-3 text-primary inline mr-1" />
                {rec.why_best_fit}
              </p>
            </div>

            {/* Key Strengths */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {rec.key_strengths.slice(0, 4).map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full px-2 py-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" /> {s}
                </span>
              ))}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              <div className="bg-primary/5 rounded-lg p-2 text-center border border-primary/10">
                <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Fees</div>
                <div className="text-[10px] font-bold text-primary mt-0.5">{rec.fees}</div>
              </div>
              <div className="bg-muted/40 rounded-lg p-2 text-center">
                <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Avg Pkg</div>
                <div className="text-[10px] font-semibold text-foreground mt-0.5">{rec.avg_package}</div>
              </div>
              <div className="bg-muted/40 rounded-lg p-2 text-center">
                <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Highest</div>
                <div className="text-[10px] font-semibold text-foreground mt-0.5">{rec.highest_package}</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-2 text-center border border-emerald-100">
                <div className="text-[8px] text-muted-foreground uppercase tracking-wider">ROI</div>
                <div className="text-[10px] font-bold text-emerald-700 mt-0.5">{rec.roi}x</div>
              </div>
            </div>

            {/* Exams & Specialization */}
            <div className="flex flex-wrap gap-1 mb-3">
              {rec.exams_accepted?.slice(0, 4).map((e, i) => (
                <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0">{e}</Badge>
              ))}
              {rec.specialization_strength && (
                <Badge className="bg-primary/10 text-primary border-0 text-[9px] px-1.5 py-0">{rec.specialization_strength}</Badge>
              )}
            </div>

            <Link to={`/college/${rec.college_slug}`}>
              <Button size="sm" className="w-full gap-2 text-xs h-9 font-semibold">
                <ExternalLink className="w-3.5 h-3.5" /> View College Details
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="border-2 border-primary/20 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/[0.03] via-background to-secondary/10 shadow-sm">
      <button onClick={() => { setIsOpen(!isOpen); if (!isOpen && step === "tier") reset(); }}
        className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-primary/5 transition-colors">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl hero-gradient flex items-center justify-center shadow-lg">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <motion.div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-background"
              animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-foreground text-sm flex items-center gap-2">
              AI College Finder
              <Badge className="bg-primary/15 text-primary border-0 text-[9px] px-2 py-0.5"><Sparkles className="w-2.5 h-2.5 mr-0.5" />AI</Badge>
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Get personalized MBA college recommendations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isOpen && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-primary font-semibold bg-primary/10 px-3 py-1.5 rounded-full">
              Try Now <Zap className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
            <div className="px-4 md:px-5 pb-5 pt-0">
              {/* Progress */}
              {step !== "result" && step !== "loading" && (
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span className="font-medium">Step {Math.min(currentIdx + 1, totalSteps)} of {totalSteps}</span>
                    <span className="font-semibold text-primary">{Math.round(((currentIdx + 1) / totalSteps) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full" animate={{ width: `${((currentIdx + 1) / totalSteps) * 100}%` }} transition={{ duration: 0.3 }} />
                  </div>
                </div>
              )}

              <AnimatePresence mode="wait">
                {/* Step 1: College Tier */}
                {step === "tier" && (
                  <motion.div key="tier" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-3 text-sm">What type of colleges are you targeting?</h4>
                    <div className="space-y-2">
                      <OptionBtn icon={Trophy} label="Only IIMs" desc="Top Indian Institutes of Management" onClick={() => { setCollegeTier("Only IIMs"); setStep("exam"); }} />
                      <OptionBtn icon={Award} label="Tier 1 B-Schools" desc="IIMs + Top 20 B-Schools (XLRI, FMS, ISB...)" onClick={() => { setCollegeTier("Tier 1"); setStep("exam"); }} />
                      <OptionBtn icon={Building2} label="Tier 2 Colleges" desc="Good B-Schools with strong placements" onClick={() => { setCollegeTier("Tier 2"); setStep("exam"); }} />
                      <OptionBtn icon={GraduationCap} label="Open to All" desc="Show me all options based on my profile" onClick={() => { setCollegeTier("Open to all"); setStep("exam"); }} />
                    </div>
                  </motion.div>
                )}

                {/* Step 2: Exams */}
                {step === "exam" && (
                  <motion.div key="exam" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-1 text-sm">Which entrance exams are you targeting?</h4>
                    <p className="text-xs text-muted-foreground mb-3">Select one or more</p>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {EXAMS.map((e) => (
                        <motion.button key={e} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => toggleExam(e)}
                          className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${selectedExams.includes(e) ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20" : "border-border bg-card hover:border-primary/50"}`}>
                          <GraduationCap className={`w-4 h-4 ${selectedExams.includes(e) ? "text-primary" : "text-primary/70"}`} />
                          <div className={`font-semibold text-xs ${selectedExams.includes(e) ? "text-primary" : "text-foreground"}`}>{e}</div>
                          {selectedExams.includes(e) && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                        </motion.button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => setStep("score")} disabled={selectedExams.length === 0} className="flex-1 gap-2" size="sm">
                        Continue <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button onClick={() => { setSelectedExams([]); setStep("score"); }} variant="ghost" size="sm" className="text-xs text-muted-foreground">Skip</Button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Expected Score */}
                {step === "score" && (
                  <motion.div key="score" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-3 text-sm">What's your expected score/percentile?</h4>
                    <div className="space-y-2">
                      <OptionBtn icon={Trophy} label="99+ Percentile" desc="Top 1% — IIM A/B/C caliber" onClick={() => { setExpectedScore("99+"); setStep("budget"); }} />
                      <OptionBtn icon={Award} label="95-99 Percentile" desc="Strong profile — Other IIMs, XLRI, FMS" onClick={() => { setExpectedScore("95-99"); setStep("budget"); }} />
                      <OptionBtn icon={Star} label="90-95 Percentile" desc="Good — New IIMs, Tier 1 colleges" onClick={() => { setExpectedScore("90-95"); setStep("budget"); }} />
                      <OptionBtn icon={Target} label="80-90 Percentile" desc="Decent — Tier 2 B-Schools" onClick={() => { setExpectedScore("80-90"); setStep("budget"); }} />
                      <OptionBtn icon={BookOpen} label="Below 80 / Not Sure" desc="Still exploring options" onClick={() => { setExpectedScore("Below 80"); setStep("budget"); }} />
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Budget */}
                {step === "budget" && (
                  <motion.div key="budget" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-3 text-sm">What's your budget for MBA?</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Under ₹10 Lakhs", value: "Under 10L", icon: IndianRupee },
                        { label: "₹10 – ₹20 Lakhs", value: "10-20L", icon: IndianRupee },
                        { label: "₹20 – ₹30 Lakhs", value: "20-30L", icon: IndianRupee },
                        { label: "₹30 Lakhs+", value: "30L+", icon: IndianRupee },
                        { label: "No Budget Limit", value: "any", icon: Sparkles },
                      ].map((b) => (
                        <GridBtn key={b.value} label={b.label} icon={b.icon} onClick={() => { setBudget(b.value); setStep("location"); }} />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 5: Location */}
                {step === "location" && (
                  <motion.div key="location" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-3 text-sm">Preferred location?</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {["Mumbai", "Delhi NCR", "Bangalore", "Kolkata", "Chennai", "Hyderabad", "Pune", "Ahmedabad", "Lucknow", "Indore", "Jaipur"].map((c) => (
                        <GridBtn key={c} label={c} icon={MapPin} onClick={() => { setLocation(c); setStep("specialization"); }} />
                      ))}
                      <GridBtn label="Any Location" icon={GraduationCap} onClick={() => { setLocation("any"); setStep("specialization"); }} />
                    </div>
                  </motion.div>
                )}

                {/* Step 6: Specialization */}
                {step === "specialization" && (
                  <motion.div key="spec" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-3 text-sm">Interested specialization?</h4>
                    <div className="space-y-2">
                      <OptionBtn icon={TrendingUp} label="Finance" desc="Investment banking, financial analysis" onClick={() => { setSpecialization("Finance"); setStep("experience"); }} />
                      <OptionBtn icon={Users} label="Marketing" desc="Brand management, digital marketing" onClick={() => { setSpecialization("Marketing"); setStep("experience"); }} />
                      <OptionBtn icon={Lightbulb} label="Consulting" desc="Strategy consulting, management" onClick={() => { setSpecialization("Consulting"); setStep("experience"); }} />
                      <OptionBtn icon={Briefcase} label="Operations / HR" desc="Supply chain, human resources" onClick={() => { setSpecialization("Operations/HR"); setStep("experience"); }} />
                      <OptionBtn icon={ChevronRight} label="Not Sure Yet" desc="I'm exploring all options" onClick={() => { setSpecialization("any"); setStep("experience"); }} />
                    </div>
                  </motion.div>
                )}

                {/* Step 7: Experience */}
                {step === "experience" && (
                  <motion.div key="exp" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-3 text-sm">Your work experience?</h4>
                    <div className="space-y-2">
                      <OptionBtn icon={GraduationCap} label="Fresher / College Student" desc="Currently studying or just graduated" onClick={() => { setExperience("Fresher"); setStep("career"); }} />
                      <OptionBtn icon={Briefcase} label="1-2 Years" desc="Early career professional" onClick={() => { setExperience("1-2 years"); setStep("career"); }} />
                      <OptionBtn icon={Briefcase} label="2-4 Years" desc="Mid-level professional" onClick={() => { setExperience("2-4 years"); setStep("career"); }} />
                      <OptionBtn icon={Award} label="4+ Years" desc="Senior professional" onClick={() => { setExperience("4+ years"); setStep("career"); }} />
                    </div>
                  </motion.div>
                )}

                {/* Step 8: Career Goal */}
                {step === "career" && (
                  <motion.div key="career" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-3 text-sm">What's your primary career goal?</h4>
                    <div className="space-y-2">
                      <OptionBtn icon={IndianRupee} label="High-Paying Job" desc="Top packages, corporate placements" onClick={() => { setCareerGoal("High-paying job"); fetchRecommendations("High-paying job"); }} />
                      <OptionBtn icon={Lightbulb} label="Management Consulting" desc="McKinsey, BCG, Bain & Co." onClick={() => { setCareerGoal("Consulting"); fetchRecommendations("Consulting"); }} />
                      <OptionBtn icon={Zap} label="Startup / Entrepreneurship" desc="Launch or scale my own venture" onClick={() => { setCareerGoal("Startup"); fetchRecommendations("Startup"); }} />
                      <OptionBtn icon={ExternalLink} label="Abroad Opportunities" desc="Global placements, international MBA" onClick={() => { setCareerGoal("Abroad"); fetchRecommendations("Abroad"); }} />
                      <OptionBtn icon={ChevronRight} label="Not Sure Yet" desc="Open to explore all paths" onClick={() => { setCareerGoal("any"); fetchRecommendations("any"); }} />
                    </div>
                  </motion.div>
                )}

                {/* Loading */}
                {step === "loading" && (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8">
                    <div className="relative w-20 h-20 mx-auto mb-5">
                      <motion.div className="absolute inset-0 rounded-full bg-primary/10" animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} />
                      <motion.div className="absolute inset-2 rounded-full bg-primary/15" animate={{ scale: [1, 1.2, 1], opacity: [0.7, 0.2, 0.7] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }} />
                      <div className="absolute inset-3 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-xl">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                          <Brain className="w-7 h-7 text-primary-foreground" />
                        </motion.div>
                      </div>
                    </div>
                    <AnimatePresence mode="wait">
                      <motion.div key={loadingStage} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="text-center mb-4">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          {(() => { const StageIcon = LOADING_STAGES[loadingStage]?.icon || Sparkles; return <StageIcon className="w-4 h-4 text-primary" />; })()}
                          <h4 className="font-semibold text-foreground text-sm">{LOADING_STAGES[loadingStage]?.text || "Almost there..."}</h4>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                    <div className="max-w-xs mx-auto">
                      <Progress value={((loadingStage + 1) / LOADING_STAGES.length) * 100} className="h-1.5" />
                    </div>
                  </motion.div>
                )}

                {/* Result */}
                {step === "result" && (
                  <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {error ? (
                      <div className="text-center py-6">
                        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                          <AlertCircle className="w-6 h-6 text-destructive" />
                        </div>
                        <p className="text-sm text-destructive font-medium mb-2">{error}</p>
                        <div className="flex gap-2 justify-center">
                          <Button onClick={reset} variant="outline" size="sm" className="gap-1.5 text-xs"><Sparkles className="w-3.5 h-3.5" /> Try Again</Button>
                          {onTryManually && <Button onClick={onTryManually} variant="secondary" size="sm" className="gap-1.5 text-xs"><ArrowDown className="w-3.5 h-3.5" /> Compare Manually</Button>}
                        </div>
                      </div>
                    ) : aiResult ? (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <Badge className="bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-0 text-[10px] px-2 py-0.5 font-semibold">
                            <Sparkles className="w-3 h-3 mr-1" /> AI Picks
                          </Badge>
                          <span className="text-[11px] text-muted-foreground font-medium">{aiResult.recommendations?.length || 0} colleges recommended</span>
                        </div>

                        {/* Preference tags */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {collegeTier && collegeTier !== "any" && <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-muted/50">{collegeTier}</Badge>}
                          {selectedExams.map(e => <Badge key={e} variant="outline" className="text-[9px] py-0 px-1.5 bg-primary/5 border-primary/20 text-primary">{e}</Badge>)}
                          {expectedScore && <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-muted/50">{expectedScore}%ile</Badge>}
                          {budget && budget !== "any" && <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-muted/50">{budget}</Badge>}
                          {specialization && specialization !== "any" && <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-muted/50">{specialization}</Badge>}
                        </div>

                        {/* Summary */}
                        {aiResult.summary && (
                          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-r from-primary/5 to-secondary/5 border border-primary/10 rounded-lg p-3 mb-4">
                            <p className="text-xs text-foreground/80 leading-relaxed">
                              <Sparkles className="w-3.5 h-3.5 text-primary inline mr-1.5" />{aiResult.summary}
                            </p>
                          </motion.div>
                        )}

                        {/* Cards */}
                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                          {aiResult.recommendations?.map((rec) => (
                            <RecommendationCard key={rec.rank} rec={rec} />
                          ))}
                        </div>

                        {/* Strategy */}
                        {aiResult.strategy && (
                          <div className="mt-4 bg-muted/30 rounded-xl p-4 border border-border">
                            <h4 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                              <Lightbulb className="w-4 h-4 text-primary" /> AI Strategy
                            </h4>
                            <div className="space-y-2 text-xs text-muted-foreground">
                              {aiResult.strategy.priority_targets && (
                                <p><span className="font-semibold text-foreground">🎯 Priority:</span> {aiResult.strategy.priority_targets}</p>
                              )}
                              {aiResult.strategy.if_score_improves && (
                                <p><span className="font-semibold text-foreground">📈 If score improves:</span> {aiResult.strategy.if_score_improves}</p>
                              )}
                              {aiResult.strategy.budget_alternatives && (
                                <p><span className="font-semibold text-foreground">💰 Budget alternatives:</span> {aiResult.strategy.budget_alternatives}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Pro Tips */}
                        {aiResult.pro_tips?.length > 0 && (
                          <div className="mt-3 space-y-1.5">
                            {aiResult.pro_tips.map((tip, i) => (
                              <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <Lightbulb className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                                <span>{tip}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 mt-4">
                          <Button onClick={reset} variant="outline" size="sm" className="flex-1 gap-1.5 text-xs">
                            <Sparkles className="w-3.5 h-3.5" /> Start Over
                          </Button>
                          {onTryManually && (
                            <Button onClick={onTryManually} variant="secondary" size="sm" className="flex-1 gap-1.5 text-xs">
                              <ArrowDown className="w-3.5 h-3.5" /> Compare Manually
                            </Button>
                          )}
                          <Link to="/profile-analyzer" className="flex-1">
                            <Button size="sm" className="w-full gap-1.5 text-xs">
                              <Target className="w-3.5 h-3.5" /> Profile Analysis
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AICollegeFinder;
