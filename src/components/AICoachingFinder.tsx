import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Sparkles, MapPin, IndianRupee, Monitor, Building2, ChevronRight, ChevronDown, GraduationCap, Zap, Clock, Briefcase, BookOpen, Target, Star, Users, TrendingUp, ExternalLink, Award, Lightbulb, CheckCircle2, Search, Brain, Database, BarChart3, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";

type Step = "mode" | "budget" | "location_type" | "state" | "city" | "exam" | "experience" | "prep_stage" | "batch_pref" | "loading" | "result";

interface Recommendation {
  rank: number;
  institute_name: string;
  institute_slug: string;
  match_score: number;
  why_best_fit: string;
  key_strengths: string[];
  recommended_course: string;
  course_fees: string;
  course_duration: string;
  batch_info?: string;
  logo_url?: string;
  city?: string;
  state?: string;
  rating?: number;
  students_count?: number;
}

interface AIResult {
  summary: string;
  recommendations: Recommendation[];
  pro_tips: string[];
}

const STATES = [
  "Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "Uttar Pradesh",
  "Rajasthan", "Gujarat", "West Bengal", "Telangana", "Madhya Pradesh",
  "Kerala", "Bihar", "Haryana", "Punjab", "Odisha",
];

const CITIES: Record<string, string[]> = {
  Maharashtra: ["Mumbai", "Pune", "Nagpur", "Thane"],
  Delhi: ["New Delhi", "South Delhi", "North Delhi"],
  Karnataka: ["Bangalore", "Mysore", "Mangalore"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai"],
  "Uttar Pradesh": ["Lucknow", "Noida", "Varanasi", "Agra"],
  Rajasthan: ["Jaipur", "Jodhpur", "Udaipur"],
  Gujarat: ["Ahmedabad", "Surat", "Vadodara"],
  "West Bengal": ["Kolkata", "Howrah"],
  Telangana: ["Hyderabad", "Warangal"],
  "Madhya Pradesh": ["Indore", "Bhopal"],
  Kerala: ["Kochi", "Thiruvananthapuram"],
  Bihar: ["Patna"],
  Haryana: ["Gurgaon", "Faridabad"],
  Punjab: ["Chandigarh", "Ludhiana"],
  Odisha: ["Bhubaneswar"],
};

const EXAMS = ["CAT", "XAT", "GMAT", "MAT", "CMAT", "SNAP", "NMAT", "IIFT", "ATMA"];

const BUDGETS = [
  { label: "Below ₹5,000", value: "5000" },
  { label: "₹5K – ₹10K", value: "10000" },
  { label: "₹10K – ₹20K", value: "20000" },
  { label: "₹20K – ₹30K", value: "30000" },
  { label: "₹30K – ₹40K", value: "40000" },
  { label: "₹40K – ₹50K", value: "50000" },
  { label: "₹50K – ₹60K", value: "60000" },
  { label: "₹60K – ₹70K", value: "70000" },
  { label: "₹70K – ₹80K", value: "80000" },
  { label: "₹80K – ₹90K", value: "90000" },
  { label: "₹90K – ₹1 Lakh", value: "100000" },
  { label: "No Limit", value: "any" },
];

const LOADING_STAGES = [
  { icon: Search, text: "Scanning our coaching database...", duration: 1500 },
  { icon: Brain, text: "Analyzing your preferences & profile...", duration: 2000 },
  { icon: Database, text: "Matching with top-rated institutes...", duration: 2000 },
  { icon: BarChart3, text: "Calculating match scores...", duration: 1500 },
  { icon: Sparkles, text: "Crafting personalized recommendations...", duration: 2000 },
];

interface AICoachingFinderProps {
  onTryManually?: () => void;
}

const AICoachingFinder = ({ onTryManually }: AICoachingFinderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState("");
  const [budget, setBudget] = useState("");
  const [locationType, setLocationType] = useState<"specific" | "any">("any");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [selectedExams, setSelectedExams] = useState<string[]>([]);
  const [experience, setExperience] = useState("");
  const [prepStage, setPrepStage] = useState("");
  const [batchPref, setBatchPref] = useState("");
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [error, setError] = useState("");
  const [loadingStage, setLoadingStage] = useState(0);

  const reset = () => {
    setStep("mode");
    setMode("");
    setBudget("");
    setLocationType("any");
    setState("");
    setCity("");
    setSelectedExams([]);
    setExperience("");
    setPrepStage("");
    setBatchPref("");
    setAiResult(null);
    setError("");
    setLoadingStage(0);
  };

  const handleModeSelect = (val: string) => { setMode(val); setStep("budget"); };
  const handleBudgetSelect = (val: string) => {
    setBudget(val);
    setStep(mode === "Online" ? "exam" : "location_type");
  };
  const handleLocationTypeSelect = (val: "specific" | "any") => {
    setLocationType(val);
    setStep(val === "specific" ? "state" : "exam");
  };
  const handleStateSelect = (val: string) => { setState(val); setStep("city"); };
  const handleCitySelect = (val: string) => { setCity(val); setStep("exam"); };
  const handleExamsContinue = () => { setStep("experience"); };
  const handleExperienceSelect = (val: string) => { setExperience(val); setStep("prep_stage"); };
  const handlePrepStageSelect = (val: string) => { setPrepStage(val); setStep("batch_pref"); };
  const handleBatchPrefSelect = (val: string) => { setBatchPref(val); fetchRecommendations(val); };

  const toggleExam = (exam: string) => {
    setSelectedExams(prev =>
      prev.includes(exam) ? prev.filter(e => e !== exam) : [...prev, exam]
    );
  };

  useEffect(() => {
    if (step !== "loading") return;
    setLoadingStage(0);
    let stage = 0;
    const timers: NodeJS.Timeout[] = [];
    let cumulative = 0;
    LOADING_STAGES.forEach((s, i) => {
      cumulative += s.duration;
      if (i < LOADING_STAGES.length - 1) {
        timers.push(setTimeout(() => { stage = i + 1; setLoadingStage(stage); }, cumulative));
      }
    });
    return () => timers.forEach(clearTimeout);
  }, [step]);

  const fetchRecommendations = async (selectedBatchPref: string) => {
    setStep("loading");
    setAiResult(null);
    setError("");

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-coaching-finder`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          preferences: {
            mode: mode || "any",
            budget: budget || "any",
            state: state || "any",
            city: city || "any",
            targetExam: selectedExams.length > 0 ? selectedExams.join(", ") : "any",
            experience: experience || "any",
            prepStage: prepStage || "any",
            batchPreference: selectedBatchPref || "any",
          },
        }),
      });

      if (!resp.ok) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get recommendations");
      }

      const data: AIResult = await resp.json();
      setAiResult(data);
      setStep("result");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("result");
    }
  };

  const allSteps: Step[] = mode === "Online"
    ? ["mode", "budget", "exam", "experience", "prep_stage", "batch_pref"]
    : locationType === "any"
    ? ["mode", "budget", "location_type", "exam", "experience", "prep_stage", "batch_pref"]
    : ["mode", "budget", "location_type", "state", "city", "exam", "experience", "prep_stage", "batch_pref"];
  const currentIdx = allSteps.indexOf(step);
  const totalSteps = allSteps.length;

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 75) return "text-blue-600 bg-blue-50 border-blue-200";
    return "text-amber-600 bg-amber-50 border-amber-200";
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { label: "🥇 Best Match", className: "bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-800 border-amber-300" };
    if (rank === 2) return { label: "🥈 Great Fit", className: "bg-gradient-to-r from-gray-100 to-slate-100 text-slate-700 border-slate-300" };
    return { label: "🥉 Good Option", className: "bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 border-orange-200" };
  };

  const OptionBtn = ({ icon: Icon, label, desc, onClick }: { icon: any; label: string; desc: string; onClick: () => void }) => (
    <motion.button
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full p-3.5 rounded-xl border border-border hover:border-primary/50 hover:shadow-md bg-card text-left transition-all group flex items-center gap-3"
    >
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

  const GridBtn = ({ label, icon: Icon, onClick, dashed, active }: { label: string; icon?: any; onClick: () => void; dashed?: boolean; active?: boolean }) => (
    <motion.button
      whileHover={{ scale: 1.04, y: -1 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`p-3 rounded-xl border ${dashed ? "border-dashed border-muted-foreground/30" : active ? "border-primary bg-primary/10 shadow-sm" : "border-border"} hover:border-primary/50 hover:shadow-sm bg-card text-center transition-all`}
    >
      {Icon && <Icon className={`w-4 h-4 mx-auto mb-1 ${active ? "text-primary" : "text-primary/70"}`} />}
      <div className={`font-semibold text-xs ${active ? "text-primary" : "text-foreground"}`}>{label}</div>
    </motion.button>
  );

  const RecommendationCard = ({ rec }: { rec: Recommendation }) => {
    const rankBadge = getRankBadge(rec.rank);
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: rec.rank * 0.15 }}
      >
        <Card className={`overflow-hidden border-2 hover:shadow-xl transition-all duration-300 group ${rec.rank === 1 ? "border-primary/40 shadow-lg" : "border-border"}`}>
          <div className={`p-3.5 flex items-center justify-between border-b ${rec.rank === 1 ? "bg-gradient-to-r from-primary/10 via-primary/5 to-amber-50/50" : "bg-gradient-to-r from-muted/50 to-muted/20"}`}>
            <div className="flex items-center gap-2">
              <Badge className={`text-[10px] px-2.5 py-0.5 border font-semibold ${rankBadge.className}`}>
                {rankBadge.label}
              </Badge>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${getScoreColor(rec.match_score)}`}>
              <Target className="w-3.5 h-3.5" />
              {rec.match_score}% Match
            </div>
          </div>

          <CardContent className="p-4">
            <div className="flex items-start gap-3.5 mb-3.5">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                {rec.logo_url ? (
                  <img src={rec.logo_url} alt={rec.institute_name} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <GraduationCap className="w-7 h-7 text-primary" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-foreground text-sm leading-tight mb-1">{rec.institute_name}</h4>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {rec.city && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="w-3 h-3" /> {rec.city}{rec.state ? `, ${rec.state}` : ""}
                    </span>
                  )}
                  {rec.rating && (
                    <span className="flex items-center gap-0.5 text-[11px] text-amber-600 font-medium">
                      <Star className="w-3 h-3 fill-amber-500" /> {rec.rating}
                    </span>
                  )}
                  {rec.students_count ? (
                    <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                      <Users className="w-3 h-3" /> {rec.students_count.toLocaleString()}+
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-primary/5 to-primary/[0.02] rounded-xl p-3 mb-3.5 border border-primary/10">
              <p className="text-xs text-foreground/80 leading-relaxed">
                <Sparkles className="w-3.5 h-3.5 text-primary inline mr-1.5" />
                {rec.why_best_fit}
              </p>
            </div>

            <div className="mb-3.5">
              <h5 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Key Strengths</h5>
              <div className="space-y-1.5">
                {rec.key_strengths.map((s, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-xs text-foreground/80">{s}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-muted/40 rounded-xl p-2.5 border border-border/50">
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Course</div>
                <div className="text-xs font-semibold text-foreground truncate">{rec.recommended_course}</div>
              </div>
              <div className="bg-primary/5 rounded-xl p-2.5 border border-primary/10">
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Fees</div>
                <div className="text-xs font-bold text-primary">{rec.course_fees}</div>
              </div>
              <div className="bg-muted/40 rounded-xl p-2.5 border border-border/50">
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Duration</div>
                <div className="text-xs font-semibold text-foreground">{rec.course_duration}</div>
              </div>
              {rec.batch_info && (
                <div className="bg-muted/40 rounded-xl p-2.5 border border-border/50">
                  <div className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Batch</div>
                  <div className="text-xs font-semibold text-foreground truncate">{rec.batch_info}</div>
                </div>
              )}
            </div>

            <Link to={`/institute/${rec.institute_slug}`}>
              <Button size="sm" className="w-full gap-2 text-xs h-10 font-semibold group-hover:shadow-md transition-all">
                <ExternalLink className="w-3.5 h-3.5" />
                View Full Details & Enroll
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="border-2 border-primary/20 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/[0.03] via-background to-secondary/10 shadow-sm">
      {/* Collapsed header */}
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen && step === "mode") reset(); }}
        className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg">
              <Bot className="w-6 h-6 text-primary-foreground" />
            </div>
            <motion.div
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-background"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-foreground text-sm md:text-base flex items-center gap-2">
              AI Coaching Finder
              <Badge className="bg-primary/15 text-primary border-0 text-[9px] px-2 py-0.5"><Sparkles className="w-2.5 h-2.5 mr-0.5" />Powered by AI</Badge>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Answer quick questions → Get personalized coaching recommendations</p>
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
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
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
                {/* Step: Mode */}
                {step === "mode" && (
                  <motion.div key="mode" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-3 text-sm">How do you prefer to learn?</h4>
                    <div className="space-y-2">
                      <OptionBtn icon={Monitor} label="Online" desc="Study from anywhere, flexible timings" onClick={() => handleModeSelect("Online")} />
                      <OptionBtn icon={Building2} label="Offline (Classroom)" desc="In-person classes, structured environment" onClick={() => handleModeSelect("Offline")} />
                      <OptionBtn icon={Sparkles} label="Hybrid (Both)" desc="Mix of online & classroom learning" onClick={() => handleModeSelect("Hybrid")} />
                      <OptionBtn icon={ChevronRight} label="No Preference" desc="Show me all available options" onClick={() => handleModeSelect("any")} />
                    </div>
                  </motion.div>
                )}

                {/* Step: Budget */}
                {step === "budget" && (
                  <motion.div key="budget" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-3 text-sm">What's your budget range?</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {BUDGETS.map((b) => (
                        <GridBtn key={b.value} label={b.label} icon={IndianRupee} onClick={() => handleBudgetSelect(b.value)} />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step: Location Type */}
                {step === "location_type" && (
                  <motion.div key="loc" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-3 text-sm">Do you have a location preference?</h4>
                    <div className="space-y-2">
                      <OptionBtn icon={MapPin} label="Yes, specific location" desc="Filter by state and city" onClick={() => handleLocationTypeSelect("specific")} />
                      <OptionBtn icon={GraduationCap} label="No, best across India" desc="Show all locations" onClick={() => handleLocationTypeSelect("any")} />
                    </div>
                  </motion.div>
                )}

                {/* Step: State */}
                {step === "state" && (
                  <motion.div key="state" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-3 text-sm">Which state?</h4>
                    <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
                      {STATES.map((s) => <GridBtn key={s} label={s} icon={MapPin} onClick={() => handleStateSelect(s)} />)}
                    </div>
                  </motion.div>
                )}

                {/* Step: City */}
                {step === "city" && (
                  <motion.div key="city" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-3 text-sm">Which city in {state}?</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {(CITIES[state] || []).map((c) => <GridBtn key={c} label={c} icon={MapPin} onClick={() => handleCitySelect(c)} />)}
                      <GridBtn label="Any City" icon={GraduationCap} onClick={() => handleCitySelect("any")} dashed />
                    </div>
                  </motion.div>
                )}

                {/* Step: Exam - Multi Select */}
                {step === "exam" && (
                  <motion.div key="exam" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-1 text-sm">Which exams are you preparing for?</h4>
                    <p className="text-xs text-muted-foreground mb-3">Select one or more exams</p>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {EXAMS.map((e) => (
                        <motion.button
                          key={e}
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => toggleExam(e)}
                          className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                            selectedExams.includes(e)
                              ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20"
                              : "border-border bg-card hover:border-primary/50"
                          }`}
                        >
                          <GraduationCap className={`w-4 h-4 ${selectedExams.includes(e) ? "text-primary" : "text-primary/70"}`} />
                          <div className={`font-semibold text-xs ${selectedExams.includes(e) ? "text-primary" : "text-foreground"}`}>{e}</div>
                          {selectedExams.includes(e) && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          )}
                        </motion.button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleExamsContinue}
                        disabled={selectedExams.length === 0}
                        className="flex-1 gap-2"
                        size="sm"
                      >
                        Continue with {selectedExams.length > 0 ? selectedExams.join(", ") : "selection"}
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                      <Button
                        onClick={() => { setSelectedExams([]); handleExamsContinue(); }}
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground"
                      >
                        Skip
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Step: Experience */}
                {step === "experience" && (
                  <motion.div key="exp" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-3 text-sm">What's your work experience?</h4>
                    <div className="space-y-2">
                      <OptionBtn icon={GraduationCap} label="Fresher / College Student" desc="Currently studying or just graduated" onClick={() => handleExperienceSelect("fresher")} />
                      <OptionBtn icon={Briefcase} label="0-2 Years" desc="Early career professional" onClick={() => handleExperienceSelect("0-2 years")} />
                      <OptionBtn icon={Briefcase} label="2-5 Years" desc="Mid-level professional" onClick={() => handleExperienceSelect("2-5 years")} />
                      <OptionBtn icon={Award} label="5+ Years" desc="Senior professional" onClick={() => handleExperienceSelect("5+ years")} />
                    </div>
                  </motion.div>
                )}

                {/* Step: Prep Stage */}
                {step === "prep_stage" && (
                  <motion.div key="prep" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-3 text-sm">What's your current preparation stage?</h4>
                    <div className="space-y-2">
                      <OptionBtn icon={BookOpen} label="Just Starting Out" desc="Haven't started yet, need full guidance" onClick={() => handlePrepStageSelect("beginner")} />
                      <OptionBtn icon={Target} label="Basics Done" desc="Know fundamentals, need advanced prep" onClick={() => handlePrepStageSelect("intermediate")} />
                      <OptionBtn icon={Zap} label="Advanced / Retaker" desc="Attempted before, need intensive coaching" onClick={() => handlePrepStageSelect("advanced")} />
                    </div>
                  </motion.div>
                )}

                {/* Step: Batch Preference */}
                {step === "batch_pref" && (
                  <motion.div key="batch" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-3 text-sm">Preferred batch timing?</h4>
                    <div className="space-y-2">
                      <OptionBtn icon={Clock} label="Weekday (Morning/Afternoon)" desc="Suited for full-time students" onClick={() => handleBatchPrefSelect("weekday")} />
                      <OptionBtn icon={Clock} label="Weekend Batch" desc="Ideal for working professionals" onClick={() => handleBatchPrefSelect("weekend")} />
                      <OptionBtn icon={Monitor} label="Self-Paced / Flexible" desc="Study anytime, no fixed schedule" onClick={() => handleBatchPrefSelect("self-paced")} />
                      <OptionBtn icon={ChevronRight} label="No Preference" desc="Any batch timing works" onClick={() => handleBatchPrefSelect("any")} />
                    </div>
                  </motion.div>
                )}

                {/* Loading */}
                {step === "loading" && (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                      <motion.div
                        className="absolute inset-0 rounded-full bg-primary/10"
                        animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <motion.div
                        className="absolute inset-2 rounded-full bg-primary/15"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.7, 0.2, 0.7] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                      />
                      <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-xl">
                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                          <Brain className="w-8 h-8 text-primary-foreground" />
                        </motion.div>
                      </div>
                      {[0, 1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          className="absolute w-2.5 h-2.5 rounded-full bg-primary shadow-sm"
                          animate={{
                            x: [0, Math.cos((i * 2 * Math.PI) / 4) * 38, 0],
                            y: [0, Math.sin((i * 2 * Math.PI) / 4) * 38, 0],
                            opacity: [0.2, 1, 0.2],
                          }}
                          transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                          style={{ left: "calc(50% - 5px)", top: "calc(50% - 5px)" }}
                        />
                      ))}
                    </div>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={loadingStage}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-center mb-5"
                      >
                        <div className="flex items-center justify-center gap-2 mb-1.5">
                          {(() => {
                            const StageIcon = LOADING_STAGES[loadingStage]?.icon || Sparkles;
                            return <StageIcon className="w-4 h-4 text-primary" />;
                          })()}
                          <h4 className="font-semibold text-foreground text-sm">
                            {LOADING_STAGES[loadingStage]?.text || "Almost there..."}
                          </h4>
                        </div>
                        <p className="text-xs text-muted-foreground">AI is analyzing your profile for the best match</p>
                      </motion.div>
                    </AnimatePresence>

                    <div className="max-w-sm mx-auto">
                      <Progress value={((loadingStage + 1) / LOADING_STAGES.length) * 100} className="h-2" />
                      <div className="flex justify-between mt-2">
                        {LOADING_STAGES.map((_, i) => (
                          <motion.div
                            key={i}
                            className={`w-2 h-2 rounded-full transition-colors ${i <= loadingStage ? "bg-primary" : "bg-muted"}`}
                            animate={i === loadingStage ? { scale: [1, 1.5, 1] } : {}}
                            transition={{ duration: 0.5, repeat: Infinity }}
                          />
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Result */}
                {step === "result" && (
                  <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {error ? (
                      <div className="text-center py-8">
                        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                          <Bot className="w-7 h-7 text-destructive" />
                        </div>
                        <p className="text-sm text-destructive font-medium mb-2">{error}</p>
                        <p className="text-xs text-muted-foreground mb-4">Don't worry, you can try again or compare manually</p>
                        <div className="flex gap-2 justify-center">
                          <Button onClick={reset} variant="outline" size="sm" className="gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" /> Try Again with AI
                          </Button>
                          {onTryManually && (
                            <Button onClick={onTryManually} variant="secondary" size="sm" className="gap-1.5">
                              <ArrowDown className="w-3.5 h-3.5" /> Try Manually
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : aiResult ? (
                      <div>
                        {/* Header badges */}
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <Badge className="bg-gradient-to-r from-primary/20 to-primary/10 text-primary border-0 text-[10px] px-2.5 py-0.5 font-semibold">
                            <Sparkles className="w-3 h-3 mr-1" /> AI Recommendations
                          </Badge>
                          <Badge variant="outline" className="text-[10px] py-0.5 px-2">{aiResult.recommendations?.length || 0} matches found</Badge>
                        </div>

                        {/* Preferences summary */}
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {mode && mode !== "any" && <Badge variant="outline" className="text-[10px] py-0.5 px-2 bg-muted/50">{mode}</Badge>}
                          {budget && budget !== "any" && <Badge variant="outline" className="text-[10px] py-0.5 px-2 bg-muted/50">≤₹{parseInt(budget).toLocaleString()}</Badge>}
                          {state && state !== "any" && <Badge variant="outline" className="text-[10px] py-0.5 px-2 bg-muted/50">{state}</Badge>}
                          {city && city !== "any" && <Badge variant="outline" className="text-[10px] py-0.5 px-2 bg-muted/50">{city}</Badge>}
                          {selectedExams.length > 0 && selectedExams.map(e => (
                            <Badge key={e} variant="outline" className="text-[10px] py-0.5 px-2 bg-primary/5 border-primary/20 text-primary">{e}</Badge>
                          ))}
                          {experience && experience !== "any" && <Badge variant="outline" className="text-[10px] py-0.5 px-2 bg-muted/50">{experience}</Badge>}
                        </div>

                        {/* AI Summary */}
                        {aiResult.summary && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-r from-primary/5 via-primary/[0.03] to-secondary/5 border border-primary/15 rounded-xl p-4 mb-5"
                          >
                            <div className="flex items-start gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                <Bot className="w-4 h-4 text-primary" />
                              </div>
                              <p className="text-sm text-foreground/80 leading-relaxed">{aiResult.summary}</p>
                            </div>
                          </motion.div>
                        )}

                        {/* Recommendation cards */}
                        <div className="space-y-4 max-h-[550px] overflow-y-auto pr-1">
                          {aiResult.recommendations?.map((rec) => (
                            <RecommendationCard key={rec.rank} rec={rec} />
                          ))}
                        </div>

                        {/* Pro tips */}
                        {aiResult.pro_tips && aiResult.pro_tips.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5 }}
                            className="mt-5 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 rounded-xl p-4"
                          >
                            <div className="flex items-center gap-2 mb-2.5">
                              <Lightbulb className="w-4 h-4 text-amber-600" />
                              <h5 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">Pro Tips from AI</h5>
                            </div>
                            <ul className="space-y-1.5">
                              {aiResult.pro_tips.map((tip, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
                                  <TrendingUp className="w-3 h-3 mt-0.5 shrink-0" />
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </motion.div>
                        )}

                        {/* Actions */}
                        <div className="mt-5 pt-4 border-t border-border flex gap-2">
                          <Button onClick={reset} variant="outline" size="sm" className="gap-1.5 text-xs flex-1">
                            <Sparkles className="w-3.5 h-3.5" /> New Search
                          </Button>
                          {onTryManually && (
                            <Button onClick={onTryManually} variant="secondary" size="sm" className="gap-1.5 text-xs flex-1">
                              <ArrowDown className="w-3.5 h-3.5" /> Try Manually
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Back / Reset during steps */}
              {step !== "mode" && step !== "loading" && step !== "result" && (
                <div className="mt-4 pt-3 border-t border-border">
                  <button onClick={reset} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1.5 transition-colors">
                    <ChevronRight className="w-3 h-3 rotate-180" /> Start over
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AICoachingFinder;
