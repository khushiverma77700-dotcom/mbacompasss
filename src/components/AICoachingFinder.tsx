import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Sparkles, MapPin, IndianRupee, Monitor, Building2, ChevronRight, Loader2, RotateCcw, GraduationCap, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";

type Step = "welcome" | "mode" | "budget" | "location_type" | "state" | "city" | "exam" | "loading" | "result";

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
  { label: "Under ₹25,000", value: "25000" },
  { label: "₹25,000 – ₹50,000", value: "50000" },
  { label: "₹50,000 – ₹1,00,000", value: "100000" },
  { label: "₹1,00,000 – ₹2,00,000", value: "200000" },
  { label: "Above ₹2,00,000", value: "500000" },
  { label: "No budget constraint", value: "any" },
];

const AICoachingFinder = () => {
  const [step, setStep] = useState<Step>("welcome");
  const [mode, setMode] = useState("");
  const [budget, setBudget] = useState("");
  const [locationType, setLocationType] = useState<"specific" | "any">("any");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [exam, setExam] = useState("");
  const [result, setResult] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const reset = () => {
    setStep("welcome");
    setMode("");
    setBudget("");
    setLocationType("any");
    setState("");
    setCity("");
    setExam("");
    setResult("");
    setIsStreaming(false);
  };

  const handleModeSelect = (val: string) => {
    setMode(val);
    setStep("budget");
  };

  const handleBudgetSelect = (val: string) => {
    setBudget(val);
    if (mode === "online") {
      setStep("exam");
    } else {
      setStep("location_type");
    }
  };

  const handleLocationTypeSelect = (val: "specific" | "any") => {
    setLocationType(val);
    if (val === "specific") {
      setStep("state");
    } else {
      setStep("exam");
    }
  };

  const handleStateSelect = (val: string) => {
    setState(val);
    setStep("city");
  };

  const handleCitySelect = (val: string) => {
    setCity(val);
    setStep("exam");
  };

  const handleExamSelect = (val: string) => {
    setExam(val);
    fetchRecommendations(val);
  };

  const fetchRecommendations = async (selectedExam: string) => {
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
            targetExam: selectedExam,
          },
        }),
      });

      if (!resp.ok || !resp.body) {
        throw new Error("Failed to get recommendations");
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
            if (content) {
              fullText += content;
              setResult(fullText);
            }
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

  const progressSteps = ["mode", "budget", "location_type", "state", "city", "exam"];
  const currentProgress = progressSteps.indexOf(step as string);
  const totalSteps = mode === "online" ? 3 : locationType === "any" ? 4 : 6;

  const OptionButton = ({ icon: Icon, label, description, onClick, gradient }: { icon: any; label: string; description: string; onClick: () => void; gradient?: boolean }) => (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full p-4 rounded-xl border-2 border-border hover:border-primary/50 bg-card text-left transition-all group ${gradient ? "hover:shadow-lg" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <div className="font-heading font-semibold text-foreground text-sm">{label}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </motion.button>
  );

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-background to-secondary/20 overflow-hidden relative">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <CardContent className="pt-6 pb-6 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl hero-gradient flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-foreground text-sm flex items-center gap-1.5">
                AI Coaching Finder <Badge className="bg-primary/10 text-primary border-0 text-[10px]"><Sparkles className="w-3 h-3 mr-0.5" /> Powered by AI</Badge>
              </h3>
              <p className="text-[11px] text-muted-foreground">Answer a few questions to find your perfect coaching</p>
            </div>
          </div>
          {step !== "welcome" && step !== "loading" && (
            <Button variant="ghost" size="sm" onClick={reset} className="text-xs gap-1">
              <RotateCcw className="w-3 h-3" /> Start Over
            </Button>
          )}
        </div>

        {/* Progress bar */}
        {step !== "welcome" && step !== "result" && step !== "loading" && (
          <div className="mb-5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
              <span>Step {Math.min(currentProgress + 1, totalSteps)} of {totalSteps}</span>
              <span>{Math.round(((currentProgress + 1) / totalSteps) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full hero-gradient rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentProgress + 1) / totalSteps) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Welcome */}
          {step === "welcome" && (
            <motion.div key="welcome" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-center py-4">
              <div className="w-16 h-16 rounded-2xl hero-gradient flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Zap className="w-8 h-8 text-primary-foreground" />
              </div>
              <h4 className="font-heading text-lg font-bold text-foreground mb-2">Find Your Perfect MBA Coaching</h4>
              <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
                Our AI will analyze your preferences and match you with the best coaching institute. Just answer a few quick questions!
              </p>
              <Button onClick={() => setStep("mode")} className="gap-2 hero-gradient text-primary-foreground hover:opacity-90 px-6">
                <Sparkles className="w-4 h-4" /> Let's Get Started
              </Button>
            </motion.div>
          )}

          {/* Mode Selection */}
          {step === "mode" && (
            <motion.div key="mode" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h4 className="font-heading font-semibold text-foreground mb-3 text-sm">How do you prefer to learn?</h4>
              <div className="space-y-2">
                <OptionButton icon={Monitor} label="Online" description="Study from anywhere, flexible timings" onClick={() => handleModeSelect("Online")} />
                <OptionButton icon={Building2} label="Offline (Classroom)" description="In-person classes, structured environment" onClick={() => handleModeSelect("Offline")} />
                <OptionButton icon={Sparkles} label="Hybrid (Both)" description="Mix of online & classroom sessions" onClick={() => handleModeSelect("Hybrid")} />
                <OptionButton icon={ChevronRight} label="No Preference" description="Show me all available options" onClick={() => handleModeSelect("any")} />
              </div>
            </motion.div>
          )}

          {/* Budget */}
          {step === "budget" && (
            <motion.div key="budget" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h4 className="font-heading font-semibold text-foreground mb-3 text-sm">What's your budget range?</h4>
              <div className="grid grid-cols-2 gap-2">
                {BUDGETS.map((b) => (
                  <motion.button
                    key={b.value}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleBudgetSelect(b.value)}
                    className="p-3 rounded-xl border-2 border-border hover:border-primary/50 bg-card text-left transition-all group"
                  >
                    <IndianRupee className="w-4 h-4 text-primary mb-1" />
                    <div className="font-heading font-semibold text-foreground text-xs">{b.label}</div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Location Type (for offline/hybrid) */}
          {step === "location_type" && (
            <motion.div key="loc_type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h4 className="font-heading font-semibold text-foreground mb-3 text-sm">Do you have a location preference?</h4>
              <div className="space-y-2">
                <OptionButton icon={MapPin} label="Yes, I have a specific location" description="Filter by state and city" onClick={() => handleLocationTypeSelect("specific")} />
                <OptionButton icon={GraduationCap} label="No, show me best options across India" description="All locations included" onClick={() => handleLocationTypeSelect("any")} />
              </div>
            </motion.div>
          )}

          {/* State */}
          {step === "state" && (
            <motion.div key="state" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h4 className="font-heading font-semibold text-foreground mb-3 text-sm">Which state are you looking for?</h4>
              <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                {STATES.map((s) => (
                  <motion.button
                    key={s}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleStateSelect(s)}
                    className="p-2.5 rounded-xl border-2 border-border hover:border-primary/50 bg-card text-center transition-all text-xs font-medium text-foreground hover:text-primary"
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* City */}
          {step === "city" && (
            <motion.div key="city" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h4 className="font-heading font-semibold text-foreground mb-3 text-sm">Which city in {state}?</h4>
              <div className="grid grid-cols-2 gap-2">
                {(CITIES[state] || ["Any City"]).map((c) => (
                  <motion.button
                    key={c}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleCitySelect(c)}
                    className="p-3 rounded-xl border-2 border-border hover:border-primary/50 bg-card text-center transition-all"
                  >
                    <MapPin className="w-4 h-4 text-primary mx-auto mb-1" />
                    <div className="font-heading font-semibold text-foreground text-xs">{c}</div>
                  </motion.button>
                ))}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleCitySelect("any")}
                  className="p-3 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 bg-card text-center transition-all"
                >
                  <GraduationCap className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                  <div className="font-heading font-semibold text-muted-foreground text-xs">Any City</div>
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Exam */}
          {step === "exam" && (
            <motion.div key="exam" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h4 className="font-heading font-semibold text-foreground mb-3 text-sm">Which exam are you preparing for?</h4>
              <div className="grid grid-cols-3 gap-2">
                {EXAMS.map((e) => (
                  <motion.button
                    key={e}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleExamSelect(e)}
                    className="p-3 rounded-xl border-2 border-border hover:border-primary/50 bg-card text-center transition-all group"
                  >
                    <GraduationCap className="w-5 h-5 text-primary mx-auto mb-1 group-hover:scale-110 transition-transform" />
                    <div className="font-heading font-bold text-foreground text-sm">{e}</div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Loading */}
          {step === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="w-16 h-16 rounded-full border-4 border-muted animate-spin border-t-primary" />
                <Bot className="w-6 h-6 text-primary absolute inset-0 m-auto" />
              </div>
              <h4 className="font-heading font-semibold text-foreground mb-1">AI is analyzing...</h4>
              <p className="text-xs text-muted-foreground">Finding the best coaching match for your profile</p>
              <div className="flex justify-center gap-1 mt-3">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {/* Result */}
          {step === "result" && (
            <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-primary/10 text-primary border-0 text-xs">
                  <Sparkles className="w-3 h-3 mr-1" /> AI Recommendations
                </Badge>
                {isStreaming && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />}
              </div>
              
              {/* Preferences summary */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {mode && mode !== "any" && <Badge variant="outline" className="text-[10px]"><Monitor className="w-3 h-3 mr-1" />{mode}</Badge>}
                {budget && budget !== "any" && <Badge variant="outline" className="text-[10px]"><IndianRupee className="w-3 h-3 mr-1" />Under ₹{parseInt(budget).toLocaleString()}</Badge>}
                {state && state !== "any" && <Badge variant="outline" className="text-[10px]"><MapPin className="w-3 h-3 mr-1" />{state}</Badge>}
                {city && city !== "any" && <Badge variant="outline" className="text-[10px]">{city}</Badge>}
                {exam && <Badge variant="outline" className="text-[10px]"><GraduationCap className="w-3 h-3 mr-1" />{exam}</Badge>}
              </div>

              <div className="prose prose-sm max-w-none text-foreground [&_h1]:font-heading [&_h1]:text-lg [&_h1]:font-bold [&_h2]:font-heading [&_h2]:text-base [&_h2]:font-semibold [&_h3]:font-heading [&_h3]:text-sm [&_h3]:font-semibold [&_p]:text-xs [&_p]:text-muted-foreground [&_p]:leading-relaxed [&_li]:text-xs [&_li]:text-muted-foreground [&_strong]:text-foreground [&_ul]:space-y-0.5 max-h-[500px] overflow-y-auto pr-2">
                <ReactMarkdown>{result || "Generating recommendations..."}</ReactMarkdown>
              </div>

              <div className="flex gap-2 mt-4 pt-3 border-t border-border">
                <Button onClick={reset} variant="outline" size="sm" className="gap-1 text-xs flex-1">
                  <RotateCcw className="w-3 h-3" /> Try Different Preferences
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default AICoachingFinder;
