import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Sparkles, MapPin, IndianRupee, Monitor, Building2, ChevronRight, ChevronDown, Loader2, RotateCcw, GraduationCap, Zap, Clock, Briefcase, BookOpen, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";

type Step = "mode" | "budget" | "location_type" | "state" | "city" | "exam" | "experience" | "prep_stage" | "batch_pref" | "loading" | "result";

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
  { label: "Under ₹25K", value: "25000" },
  { label: "₹25K – ₹50K", value: "50000" },
  { label: "₹50K – ₹1L", value: "100000" },
  { label: "₹1L – ₹2L", value: "200000" },
  { label: "Above ₹2L", value: "500000" },
  { label: "No limit", value: "any" },
];

const AICoachingFinder = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("mode");
  const [mode, setMode] = useState("");
  const [budget, setBudget] = useState("");
  const [locationType, setLocationType] = useState<"specific" | "any">("any");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [exam, setExam] = useState("");
  const [experience, setExperience] = useState("");
  const [prepStage, setPrepStage] = useState("");
  const [batchPref, setBatchPref] = useState("");
  const [result, setResult] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const reset = () => {
    setStep("mode");
    setMode("");
    setBudget("");
    setLocationType("any");
    setState("");
    setCity("");
    setExam("");
    setExperience("");
    setPrepStage("");
    setBatchPref("");
    setResult("");
    setIsStreaming(false);
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
  const handleExamSelect = (val: string) => { setExam(val); setStep("experience"); };
  const handleExperienceSelect = (val: string) => { setExperience(val); setStep("prep_stage"); };
  const handlePrepStageSelect = (val: string) => { setPrepStage(val); setStep("batch_pref"); };
  const handleBatchPrefSelect = (val: string) => { setBatchPref(val); fetchRecommendations(val); };

  const fetchRecommendations = async (selectedBatchPref: string) => {
    setStep("loading");
    setResult("");
    setIsStreaming(true);

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
            targetExam: exam,
            experience: experience || "any",
            prepStage: prepStage || "any",
            batchPreference: selectedBatchPref || "any",
          },
        }),
      });

      if (!resp.ok || !resp.body) {
        const errorData = await resp.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to get recommendations");
      }

      setStep("result");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) { fullText += content; setResult(fullText); }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch (err) {
      console.error(err);
      setResult("Sorry, something went wrong. Please try again.");
      setStep("result");
    } finally {
      setIsStreaming(false);
    }
  };

  // Progress calculation
  const allSteps: Step[] = mode === "Online"
    ? ["mode", "budget", "exam", "experience", "prep_stage", "batch_pref"]
    : locationType === "any"
    ? ["mode", "budget", "location_type", "exam", "experience", "prep_stage", "batch_pref"]
    : ["mode", "budget", "location_type", "state", "city", "exam", "experience", "prep_stage", "batch_pref"];
  const currentIdx = allSteps.indexOf(step);
  const totalSteps = allSteps.length;

  const OptionBtn = ({ icon: Icon, label, desc, onClick }: { icon: any; label: string; desc: string; onClick: () => void }) => (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full p-3 rounded-lg border border-border hover:border-primary/50 bg-card text-left transition-all group flex items-center gap-3"
    >
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-foreground text-xs">{label}</div>
        <div className="text-[10px] text-muted-foreground truncate">{desc}</div>
      </div>
      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
    </motion.button>
  );

  const GridBtn = ({ label, icon: Icon, onClick, dashed }: { label: string; icon?: any; onClick: () => void; dashed?: boolean }) => (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`p-2.5 rounded-lg border ${dashed ? "border-dashed border-muted-foreground/30" : "border-border"} hover:border-primary/50 bg-card text-center transition-all`}
    >
      {Icon && <Icon className="w-3.5 h-3.5 text-primary mx-auto mb-0.5" />}
      <div className="font-semibold text-foreground text-[11px]">{label}</div>
    </motion.button>
  );

  return (
    <div className="border-2 border-primary/20 rounded-xl overflow-hidden bg-gradient-to-r from-primary/5 via-background to-secondary/10">
      {/* Collapsed header - always visible */}
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen && step === "mode") reset(); }}
        className="w-full flex items-center justify-between p-4 hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-md">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="text-left">
            <h3 className="font-bold text-foreground text-sm flex items-center gap-1.5">
              AI Coaching Finder
              <Badge className="bg-primary/15 text-primary border-0 text-[9px] px-1.5 py-0"><Sparkles className="w-2.5 h-2.5 mr-0.5" />AI</Badge>
            </h3>
            <p className="text-[11px] text-muted-foreground">Answer quick questions → Get personalized coaching recommendations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isOpen && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-primary font-medium">
              Try Now <Zap className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </div>
      </button>

      {/* Expandable content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">
              {/* Progress */}
              {step !== "result" && step !== "loading" && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Step {Math.min(currentIdx + 1, totalSteps)} of {totalSteps}</span>
                    <span>{Math.round(((currentIdx + 1) / totalSteps) * 100)}%</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <motion.div className="h-full bg-primary rounded-full" animate={{ width: `${((currentIdx + 1) / totalSteps) * 100}%` }} transition={{ duration: 0.3 }} />
                  </div>
                </div>
              )}

              <AnimatePresence mode="wait">
                {/* Step: Mode */}
                {step === "mode" && (
                  <motion.div key="mode" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-2 text-xs">How do you prefer to learn?</h4>
                    <div className="space-y-1.5">
                      <OptionBtn icon={Monitor} label="Online" desc="Study from anywhere, flexible timings" onClick={() => handleModeSelect("Online")} />
                      <OptionBtn icon={Building2} label="Offline (Classroom)" desc="In-person classes, structured environment" onClick={() => handleModeSelect("Offline")} />
                      <OptionBtn icon={Sparkles} label="Hybrid (Both)" desc="Mix of online & classroom" onClick={() => handleModeSelect("Hybrid")} />
                      <OptionBtn icon={ChevronRight} label="No Preference" desc="Show all options" onClick={() => handleModeSelect("any")} />
                    </div>
                  </motion.div>
                )}

                {/* Step: Budget */}
                {step === "budget" && (
                  <motion.div key="budget" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-2 text-xs">What's your budget range?</h4>
                    <div className="grid grid-cols-3 gap-1.5">
                      {BUDGETS.map((b) => (
                        <GridBtn key={b.value} label={b.label} icon={IndianRupee} onClick={() => handleBudgetSelect(b.value)} />
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step: Location Type */}
                {step === "location_type" && (
                  <motion.div key="loc" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-2 text-xs">Do you have a location preference?</h4>
                    <div className="space-y-1.5">
                      <OptionBtn icon={MapPin} label="Yes, specific location" desc="Filter by state and city" onClick={() => handleLocationTypeSelect("specific")} />
                      <OptionBtn icon={GraduationCap} label="No, best across India" desc="All locations included" onClick={() => handleLocationTypeSelect("any")} />
                    </div>
                  </motion.div>
                )}

                {/* Step: State */}
                {step === "state" && (
                  <motion.div key="state" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-2 text-xs">Which state?</h4>
                    <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
                      {STATES.map((s) => <GridBtn key={s} label={s} onClick={() => handleStateSelect(s)} />)}
                    </div>
                  </motion.div>
                )}

                {/* Step: City */}
                {step === "city" && (
                  <motion.div key="city" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-2 text-xs">Which city in {state}?</h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(CITIES[state] || []).map((c) => <GridBtn key={c} label={c} icon={MapPin} onClick={() => handleCitySelect(c)} />)}
                      <GridBtn label="Any City" icon={GraduationCap} onClick={() => handleCitySelect("any")} dashed />
                    </div>
                  </motion.div>
                )}

                {/* Step: Exam */}
                {step === "exam" && (
                  <motion.div key="exam" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-2 text-xs">Which exam are you preparing for?</h4>
                    <div className="grid grid-cols-3 gap-1.5">
                      {EXAMS.map((e) => <GridBtn key={e} label={e} icon={GraduationCap} onClick={() => handleExamSelect(e)} />)}
                    </div>
                  </motion.div>
                )}

                {/* Step: Experience */}
                {step === "experience" && (
                  <motion.div key="exp" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-2 text-xs">What's your work experience?</h4>
                    <div className="space-y-1.5">
                      <OptionBtn icon={GraduationCap} label="Fresher / College Student" desc="Currently studying or just graduated" onClick={() => handleExperienceSelect("fresher")} />
                      <OptionBtn icon={Briefcase} label="0-2 Years" desc="Early career professional" onClick={() => handleExperienceSelect("0-2 years")} />
                      <OptionBtn icon={Briefcase} label="2-5 Years" desc="Mid-level professional" onClick={() => handleExperienceSelect("2-5 years")} />
                      <OptionBtn icon={Briefcase} label="5+ Years" desc="Senior professional" onClick={() => handleExperienceSelect("5+ years")} />
                    </div>
                  </motion.div>
                )}

                {/* Step: Prep Stage */}
                {step === "prep_stage" && (
                  <motion.div key="prep" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-2 text-xs">What's your current preparation stage?</h4>
                    <div className="space-y-1.5">
                      <OptionBtn icon={BookOpen} label="Just Starting Out" desc="Haven't started yet, need full guidance" onClick={() => handlePrepStageSelect("beginner")} />
                      <OptionBtn icon={Target} label="Basics Done" desc="Know fundamentals, need advanced prep" onClick={() => handlePrepStageSelect("intermediate")} />
                      <OptionBtn icon={Zap} label="Advanced / Retaker" desc="Attempted before, need intensive coaching" onClick={() => handlePrepStageSelect("advanced")} />
                    </div>
                  </motion.div>
                )}

                {/* Step: Batch Preference */}
                {step === "batch_pref" && (
                  <motion.div key="batch" initial={{ opacity: 0, x: 15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -15 }}>
                    <h4 className="font-semibold text-foreground mb-2 text-xs">Preferred batch timing?</h4>
                    <div className="space-y-1.5">
                      <OptionBtn icon={Clock} label="Weekday (Morning/Afternoon)" desc="Suited for full-time students" onClick={() => handleBatchPrefSelect("weekday")} />
                      <OptionBtn icon={Clock} label="Weekend Batch" desc="Ideal for working professionals" onClick={() => handleBatchPrefSelect("weekend")} />
                      <OptionBtn icon={Monitor} label="Self-Paced / Flexible" desc="Study anytime, no fixed schedule" onClick={() => handleBatchPrefSelect("self-paced")} />
                      <OptionBtn icon={ChevronRight} label="No Preference" desc="Any batch timing works" onClick={() => handleBatchPrefSelect("any")} />
                    </div>
                  </motion.div>
                )}

                {/* Loading */}
                {step === "loading" && (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6">
                    <div className="relative w-12 h-12 mx-auto mb-3">
                      <div className="w-12 h-12 rounded-full border-3 border-muted animate-spin border-t-primary" />
                      <Bot className="w-5 h-5 text-primary absolute inset-0 m-auto" />
                    </div>
                    <h4 className="font-semibold text-foreground text-sm mb-1">AI is analyzing your profile...</h4>
                    <p className="text-[10px] text-muted-foreground">Matching with best coaching from our database</p>
                  </motion.div>
                )}

                {/* Result */}
                {step === "result" && (
                  <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-primary/10 text-primary border-0 text-[10px]">
                        <Sparkles className="w-2.5 h-2.5 mr-0.5" /> AI Recommendations
                      </Badge>
                      {isStreaming && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
                    </div>

                    {/* Prefs summary */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {mode && mode !== "any" && <Badge variant="outline" className="text-[9px] py-0 px-1.5">{mode}</Badge>}
                      {budget && budget !== "any" && <Badge variant="outline" className="text-[9px] py-0 px-1.5">≤₹{parseInt(budget).toLocaleString()}</Badge>}
                      {state && state !== "any" && <Badge variant="outline" className="text-[9px] py-0 px-1.5">{state}</Badge>}
                      {city && city !== "any" && <Badge variant="outline" className="text-[9px] py-0 px-1.5">{city}</Badge>}
                      {exam && <Badge variant="outline" className="text-[9px] py-0 px-1.5">{exam}</Badge>}
                      {experience && experience !== "any" && <Badge variant="outline" className="text-[9px] py-0 px-1.5">{experience}</Badge>}
                      {prepStage && prepStage !== "any" && <Badge variant="outline" className="text-[9px] py-0 px-1.5">{prepStage}</Badge>}
                      {batchPref && batchPref !== "any" && <Badge variant="outline" className="text-[9px] py-0 px-1.5">{batchPref}</Badge>}
                    </div>

                    <div className="prose prose-sm max-w-none text-foreground [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-semibold [&_h3]:text-xs [&_h3]:font-semibold [&_p]:text-xs [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_li]:text-xs [&_li]:text-muted-foreground [&_strong]:text-foreground [&_ul]:space-y-0.5 max-h-[400px] overflow-y-auto pr-2">
                      <ReactMarkdown>{result || "Generating recommendations..."}</ReactMarkdown>
                    </div>

                    <div className="mt-3 pt-2 border-t border-border">
                      <Button onClick={reset} variant="outline" size="sm" className="gap-1 text-[11px] w-full">
                        <RotateCcw className="w-3 h-3" /> Try Different Preferences
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Reset button during steps */}
              {step !== "mode" && step !== "loading" && step !== "result" && (
                <div className="mt-3 pt-2 border-t border-border">
                  <button onClick={reset} className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1">
                    <RotateCcw className="w-2.5 h-2.5" /> Start over
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
