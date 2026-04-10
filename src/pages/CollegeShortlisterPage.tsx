import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  GraduationCap, Target, Shield, Star, TrendingUp, IndianRupee, MapPin,
  ChevronRight, Sparkles, BookOpen, Briefcase, User, Lock, ArrowRight,
  CheckCircle2, BarChart3, Building2, Zap, Award, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import SEOHead from "@/components/SEOHead";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import ReactMarkdown from "react-markdown";
import PageKeywords from "@/components/PageKeywords";

const EXAMS = ["CAT", "XAT", "NMAT", "SNAP", "GMAT", "MAT", "CMAT"];
const STREAMS = ["Engineering", "Commerce", "Science", "Arts/Humanities", "BBA/BMS", "Economics", "Law", "Medical", "Other"];
const SPECIALIZATIONS = ["Finance", "Marketing", "Operations", "HR", "IT/Analytics", "General Management", "Consulting", "Entrepreneurship", "Open to All"];
const CITIES = ["Mumbai", "Delhi", "Bangalore", "Kolkata", "Chennai", "Hyderabad", "Pune", "Ahmedabad", "Lucknow", "Jaipur", "Indore", "Chandigarh"];
const TIER_OPTIONS = ["Only IIMs", "Tier 1", "Tier 2", "All Tiers"];

const FAQS = [
  { q: "How accurate is the AI shortlisting?", a: "Our simulator uses real college data including cutoffs, placements, and fees combined with AI analysis. While no tool can guarantee admissions, our recommendations are data-backed and regularly updated." },
  { q: "What data does the simulator use?", a: "We analyze your exam scores, academic profile, work experience against our database of 100+ MBA colleges including their cutoff trends, placement records, fee structures, and admission criteria." },
  { q: "Is my data safe?", a: "Yes. Your profile data is only used for generating recommendations and is not shared with any third party. We may store anonymized data to improve our algorithms." },
  { q: "Can I use this for GMAT-based admissions?", a: "Yes! The simulator supports CAT, XAT, NMAT, SNAP, GMAT, MAT, and CMAT. Select your exam and score type accordingly." },
  { q: "What do Dream, Target, and Safe mean?", a: "Dream colleges (20-40% chance) are aspirational picks where your profile is a stretch. Target colleges (40-70% chance) are competitive but within reach. Safe colleges (70-90% chance) strongly align with your profile." },
];

interface CollegeResult {
  id: string; name: string; slug: string; city: string | null; state: string | null;
  fees: string | null; placement_avg: string | null; placement_highest: string | null;
  ranking: number | null; type: string | null; established: number | null;
  logo_url: string | null; chancePercent: number; bucket: "dream" | "target" | "safe";
  whyFit: string; compositeScore: number; accreditations: string[] | null;
}

interface FormData {
  exam: string; scoreType: "percentile" | "score"; overallScore: string;
  sectionalVARC: string; sectionalDILR: string; sectionalQuant: string;
  tenth: string; twelfth: string; graduation: string; graduationStream: string;
  workExperienceMonths: string; gender: string;
  budgetRange: [number, number]; preferredCities: string[];
  collegeTier: string[]; specialization: string;
}

const initialForm: FormData = {
  exam: "", scoreType: "percentile", overallScore: "",
  sectionalVARC: "", sectionalDILR: "", sectionalQuant: "",
  tenth: "", twelfth: "", graduation: "", graduationStream: "",
  workExperienceMonths: "", gender: "",
  budgetRange: [200000, 2500000], preferredCities: [],
  collegeTier: [], specialization: "",
};

const bucketConfig = {
  dream: { label: "Dream Colleges", icon: Star, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", chance: "20-40%" },
  target: { label: "Target Colleges", icon: Target, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", chance: "40-70%" },
  safe: { label: "Safe Colleges", icon: Shield, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300", chance: "70-90%" },
};

const CollegeShortlisterPage = () => {
  const [step, setStep] = useState(0); // 0=landing, 1-3=form, 4=loading, 5=results
  const [form, setForm] = useState<FormData>(initialForm);
  const [results, setResults] = useState<CollegeResult[]>([]);
  const [aiInsights, setAiInsights] = useState("");
  const [strategy, setStrategy] = useState("");
  const [stats, setStats] = useState({ totalAnalyzed: 0, dreamCount: 0, targetCount: 0, safeCount: 0 });
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [insightsUnlocked, setInsightsUnlocked] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const updateField = <K extends keyof FormData>(key: K, val: FormData[K]) => setForm(prev => ({ ...prev, [key]: val }));

  const toggleCity = (city: string) => {
    setForm(prev => ({
      ...prev,
      preferredCities: prev.preferredCities.includes(city)
        ? prev.preferredCities.filter(c => c !== city)
        : [...prev.preferredCities, city],
    }));
  };

  const toggleTier = (tier: string) => {
    setForm(prev => ({
      ...prev,
      collegeTier: prev.collegeTier.includes(tier)
        ? prev.collegeTier.filter(t => t !== tier)
        : [...prev.collegeTier, tier],
    }));
  };

  const validateStep = (s: number): boolean => {
    if (s === 1) {
      if (!form.exam) { toast({ title: "Select your exam", variant: "destructive" }); return false; }
      if (!form.overallScore || parseFloat(form.overallScore) <= 0) { toast({ title: "Enter your score/percentile", variant: "destructive" }); return false; }
    }
    if (s === 2) {
      if (!form.tenth || !form.twelfth || !form.graduation) { toast({ title: "Enter all academic scores", variant: "destructive" }); return false; }
      if (!form.graduationStream) { toast({ title: "Select graduation stream", variant: "destructive" }); return false; }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    setStep(4);
    setLoading(true);

    try {
      const payload = {
        exam: form.exam,
        scoreType: form.scoreType,
        overallScore: parseFloat(form.overallScore),
        sectionalScores: form.sectionalVARC ? {
          varc: parseFloat(form.sectionalVARC) || 0,
          dilr: parseFloat(form.sectionalDILR) || 0,
          quant: parseFloat(form.sectionalQuant) || 0,
        } : undefined,
        tenth: parseFloat(form.tenth),
        twelfth: parseFloat(form.twelfth),
        graduation: parseFloat(form.graduation),
        graduationStream: form.graduationStream,
        workExperienceMonths: parseInt(form.workExperienceMonths) || 0,
        gender: form.gender || undefined,
        budgetMin: form.budgetRange[0],
        budgetMax: form.budgetRange[1],
        preferredCities: form.preferredCities,
        collegeTier: form.collegeTier,
        specialization: form.specialization,
      };

      const { data, error } = await supabase.functions.invoke("college-shortlister", { body: payload });
      if (error) throw error;

      setResults(data.colleges || []);
      setAiInsights(data.aiInsights || "");
      setStrategy(data.strategy || "");
      setStats(data.stats || { totalAnalyzed: 0, dreamCount: 0, targetCount: 0, safeCount: 0 });
      setStep(5);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.message || "Failed to generate recommendations", variant: "destructive" });
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockInsights = () => {
    if (user) {
      setInsightsUnlocked(true);
    } else {
      setShowLogin(true);
    }
  };

  const dream = useMemo(() => results.filter(r => r.bucket === "dream"), [results]);
  const target = useMemo(() => results.filter(r => r.bucket === "target"), [results]);
  const safe = useMemo(() => results.filter(r => r.bucket === "safe"), [results]);

  const formatBudget = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
    return `₹${(val / 100000).toFixed(0)}L`;
  };

  // ─── LANDING ──────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead
          title="AI College Shortlister — Dream, Target & Safe MBA Colleges"
          description="Get AI-powered MBA college recommendations in 30 seconds. Our simulator analyzes your profile against 100+ colleges to find Dream, Target, and Safe picks."
          keywords={["MBA college shortlisting", "AI college finder", "CAT college predictor", "MBA admission chances"]}
          canonical="https://bestmbacoaching.com/college-shortlister"
        />

        {/* Hero */}
        <section className="relative overflow-hidden" style={{ background: "var(--hero-gradient)" }}>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.06%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30" />
          <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Badge className="mb-4 bg-white/20 text-white border-white/30 backdrop-blur-sm text-sm px-4 py-1.5">
                  <Sparkles className="w-4 h-4 mr-1.5" /> AI-Powered • 100+ Colleges Analyzed
                </Badge>
                <h1 className="text-3xl md:text-5xl font-heading font-bold text-white mb-4 leading-tight">
                  Find Your Dream, Target & Safe
                  <span className="block text-white/90">MBA Colleges in 30 Seconds</span>
                </h1>
                <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                  Our AI analyzes your exam scores, academic profile & preferences to shortlist colleges where you have the best chances — like a personal mentor.
                </p>
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 font-semibold text-lg px-8 py-6 rounded-xl shadow-lg"
                  onClick={() => setStep(1)}
                >
                  Start Free Shortlisting <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <p className="text-white/60 text-sm mt-3">No signup required • Results in 30 seconds</p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="container mx-auto px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-center text-foreground mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { icon: BookOpen, title: "Enter Your Profile", desc: "Exam scores, academics, work experience & preferences — takes 60 seconds.", color: "text-blue-500 bg-blue-50" },
              { icon: Zap, title: "AI Analyzes 100+ Colleges", desc: "Our algorithm scores each college based on your unique profile and real admission data.", color: "text-amber-500 bg-amber-50" },
              { icon: GraduationCap, title: "Get Dream/Target/Safe List", desc: "Receive categorized recommendations with chance percentages and personalized strategy.", color: "text-emerald-500 bg-emerald-50" },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}>
                <Card className="text-center h-full border-border/50 hover:shadow-md transition-shadow">
                  <CardContent className="pt-8 pb-6">
                    <div className={`w-14 h-14 rounded-2xl ${item.color} flex items-center justify-center mx-auto mb-4`}>
                      <item.icon className="w-7 h-7" />
                    </div>
                    <div className="text-xs font-bold text-muted-foreground mb-2">STEP {i + 1}</div>
                    <h3 className="font-heading font-semibold text-foreground text-lg mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm">{item.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Sample Output Preview */}
        <section className="bg-muted/50 py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-center text-foreground mb-4">Sample Output</h2>
            <p className="text-muted-foreground text-center mb-10 max-w-lg mx-auto">Here's what your personalized shortlist looks like</p>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {(["dream", "target", "safe"] as const).map((bucket) => {
                const cfg = bucketConfig[bucket];
                const Icon = cfg.icon;
                return (
                  <Card key={bucket} className={`${cfg.bg} ${cfg.border} border-2`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon className={`w-5 h-5 ${cfg.color}`} />
                        {cfg.label}
                        <Badge variant="outline" className="ml-auto text-xs">{cfg.chance}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-background/60">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="h-3 bg-muted rounded w-3/4 mb-1.5" />
                            <div className="h-2 bg-muted rounded w-1/2" />
                          </div>
                          <Badge className={cfg.badge + " text-xs"}>{bucket === "dream" ? "32%" : bucket === "target" ? "58%" : "82%"}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="container mx-auto px-4 py-16 max-w-3xl">
          <h2 className="text-2xl font-heading font-bold text-foreground mb-8 text-center">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {FAQS.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border rounded-xl px-4">
                <AccordionTrigger className="text-left font-medium text-foreground hover:no-underline">{faq.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* CTA */}
        <section className="py-12 mb-8">
          <div className="container mx-auto px-4 text-center">
            <Button size="lg" className="font-semibold text-lg px-10 py-6 rounded-xl" onClick={() => setStep(1)}>
              Start Your Free Shortlisting <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </section>

        <PageKeywords contentType="static" recordId="college-shortlister" fallbackKeywords={["MBA college shortlisting", "CAT college predictor"]} />
      </div>
    );
  }

  // ─── FORM STEPS 1-3 ────────────────────────────────────────
  if (step >= 1 && step <= 3) {
    const progress = (step / 3) * 100;
    return (
      <div className="min-h-screen bg-background">
        <SEOHead title={`Step ${step} — AI College Shortlister`} description="Enter your profile for personalized MBA college recommendations." />
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          {/* Progress */}
          <div className="mb-8">
            <div className="flex justify-between text-sm font-medium text-muted-foreground mb-2">
              {["Exam Details", "Profile Details", "Preferences"].map((label, i) => (
                <span key={i} className={step >= i + 1 ? "text-primary font-semibold" : ""}>
                  {i + 1}. {label}
                </span>
              ))}
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
              {/* Step 1: Exam Details */}
              {step === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-heading flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" /> Exam Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Which exam did you take? <span className="text-destructive">*</span></label>
                      <div className="grid grid-cols-4 gap-2">
                        {EXAMS.map(exam => (
                          <button
                            key={exam}
                            onClick={() => updateField("exam", exam)}
                            className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${form.exam === exam ? "bg-primary text-primary-foreground border-primary shadow-md" : "border-border hover:border-primary/50 text-foreground"}`}
                          >
                            {exam}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Score Type</label>
                        <Select value={form.scoreType} onValueChange={(v) => updateField("scoreType", v as "percentile" | "score")}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentile">Percentile</SelectItem>
                            <SelectItem value="score">Raw Score</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Overall {form.scoreType === "percentile" ? "Percentile" : "Score"} <span className="text-destructive">*</span>
                        </label>
                        <Input
                          type="number"
                          placeholder={form.scoreType === "percentile" ? "e.g. 92.5" : "e.g. 180"}
                          value={form.overallScore}
                          onChange={e => updateField("overallScore", e.target.value)}
                          max={form.scoreType === "percentile" ? 100 : undefined}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">Sectional Scores (optional — improves accuracy)</label>
                      <div className="grid grid-cols-3 gap-3">
                        <Input placeholder="VARC" type="number" value={form.sectionalVARC} onChange={e => updateField("sectionalVARC", e.target.value)} />
                        <Input placeholder="DILR" type="number" value={form.sectionalDILR} onChange={e => updateField("sectionalDILR", e.target.value)} />
                        <Input placeholder="Quant" type="number" value={form.sectionalQuant} onChange={e => updateField("sectionalQuant", e.target.value)} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Profile Details */}
              {step === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-heading flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" /> Profile Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">10th % <span className="text-destructive">*</span></label>
                        <Input type="number" placeholder="e.g. 92" value={form.tenth} onChange={e => updateField("tenth", e.target.value)} max={100} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">12th % <span className="text-destructive">*</span></label>
                        <Input type="number" placeholder="e.g. 88" value={form.twelfth} onChange={e => updateField("twelfth", e.target.value)} max={100} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Grad % <span className="text-destructive">*</span></label>
                        <Input type="number" placeholder="e.g. 75" value={form.graduation} onChange={e => updateField("graduation", e.target.value)} max={100} />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Graduation Stream <span className="text-destructive">*</span></label>
                      <div className="grid grid-cols-3 gap-2">
                        {STREAMS.map(stream => (
                          <button
                            key={stream}
                            onClick={() => updateField("graduationStream", stream)}
                            className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${form.graduationStream === stream ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50 text-foreground"}`}
                          >
                            {stream}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Work Experience (months)</label>
                        <Input type="number" placeholder="e.g. 24" value={form.workExperienceMonths} onChange={e => updateField("workExperienceMonths", e.target.value)} />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Gender (optional)</label>
                        <Select value={form.gender} onValueChange={(v) => updateField("gender", v)}>
                          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 3: Preferences */}
              {step === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="font-heading flex items-center gap-2">
                      <Target className="w-5 h-5 text-primary" /> Your Preferences
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-3 block">
                        Budget Range: {formatBudget(form.budgetRange[0])} – {formatBudget(form.budgetRange[1])}
                      </label>
                      <Slider
                        min={100000}
                        max={3000000}
                        step={100000}
                        value={form.budgetRange}
                        onValueChange={(v) => updateField("budgetRange", v as [number, number])}
                        className="mt-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>₹1L</span><span>₹30L</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Preferred Cities</label>
                      <div className="flex flex-wrap gap-2">
                        {CITIES.map(city => (
                          <button
                            key={city}
                            onClick={() => toggleCity(city)}
                            className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${form.preferredCities.includes(city) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50 text-foreground"}`}
                          >
                            {city}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Skip to consider all cities</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">College Tier</label>
                      <div className="grid grid-cols-2 gap-2">
                        {TIER_OPTIONS.map(tier => (
                          <button
                            key={tier}
                            onClick={() => toggleTier(tier)}
                            className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${form.collegeTier.includes(tier) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50 text-foreground"}`}
                          >
                            {tier}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Preferred Specialization</label>
                      <div className="grid grid-cols-3 gap-2">
                        {SPECIALIZATIONS.map(spec => (
                          <button
                            key={spec}
                            onClick={() => updateField("specialization", spec)}
                            className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${form.specialization === spec ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50 text-foreground"}`}
                          >
                            {spec}
                          </button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Nav Buttons */}
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => setStep(step === 1 ? 0 : step - 1)}>
              {step === 1 ? "← Back to Home" : "← Previous"}
            </Button>
            {step < 3 ? (
              <Button onClick={() => { if (validateStep(step)) setStep(step + 1); }}>
                Next Step <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} className="px-8">
                <Sparkles className="w-4 h-4 mr-2" /> Generate My Shortlist
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── LOADING ───────────────────────────────────────────────
  if (step === 4) {
    const stages = ["Scanning 100+ colleges...", "Matching your profile...", "Calculating admission chances...", "Generating AI insights..."];
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-6 rounded-full border-4 border-primary border-t-transparent"
          />
          <h2 className="font-heading text-xl font-bold text-foreground mb-3">Analyzing Your Profile</h2>
          <div className="space-y-2">
            {stages.map((stage, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 1.5 }}
                className="text-sm text-muted-foreground"
              >
                <CheckCircle2 className="w-4 h-4 inline mr-1.5 text-primary" />
                {stage}
              </motion.p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── RESULTS ───────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Your MBA College Shortlist — AI Results" description="Personalized MBA college recommendations based on your profile." />

      {/* Results Header */}
      <section className="relative overflow-hidden" style={{ background: "var(--hero-gradient)" }}>
        <div className="container mx-auto px-4 py-10 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-white mb-2">Your Personalized College Shortlist</h1>
            <p className="text-white/70">Based on {form.exam} {form.scoreType === "percentile" ? "Percentile" : "Score"}: {form.overallScore} • {stats.totalAnalyzed} colleges analyzed</p>
            <div className="flex justify-center gap-6 mt-4">
              {[
                { label: "Dream", count: stats.dreamCount, color: "text-amber-200" },
                { label: "Target", count: stats.targetCount, color: "text-blue-200" },
                { label: "Safe", count: stats.safeCount, color: "text-emerald-200" },
              ].map(s => (
                <div key={s.label} className="text-center">
                  <div className={`text-2xl font-bold ${s.color}`}>{s.count}</div>
                  <div className="text-white/60 text-xs">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* College Buckets */}
        {(["dream", "target", "safe"] as const).map((bucket) => {
          const colleges = bucket === "dream" ? dream : bucket === "target" ? target : safe;
          if (colleges.length === 0) return null;
          const cfg = bucketConfig[bucket];
          const Icon = cfg.icon;

          return (
            <motion.div
              key={bucket}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: bucket === "dream" ? 0.1 : bucket === "target" ? 0.25 : 0.4 }}
              className="mb-8"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl ${cfg.bg} ${cfg.border} border flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div>
                  <h2 className="font-heading font-bold text-lg text-foreground">{cfg.label}</h2>
                  <p className="text-xs text-muted-foreground">{cfg.chance} admission probability</p>
                </div>
                <Badge className={cfg.badge + " ml-auto"}>{colleges.length} colleges</Badge>
              </div>

              <div className="grid gap-3">
                {colleges.map((college, i) => (
                  <Card key={college.id} className={`${cfg.border} border hover:shadow-md transition-all`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                          {college.logo_url ? (
                            <img src={college.logo_url} alt={college.name} className="w-10 h-10 rounded-lg object-contain" />
                          ) : (
                            <Building2 className={`w-6 h-6 ${cfg.color}`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <Link to={`/college/${college.slug}`} className="font-heading font-semibold text-foreground hover:text-primary transition-colors text-sm md:text-base">
                                {college.name}
                              </Link>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {college.city && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                    <MapPin className="w-3 h-3" /> {college.city}{college.state ? `, ${college.state}` : ""}
                                  </span>
                                )}
                                {college.ranking && (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">Rank #{college.ranking}</Badge>
                                )}
                                {college.accreditations?.slice(0, 2).map(a => (
                                  <Badge key={a} variant="outline" className="text-[10px] px-1.5 py-0">{a}</Badge>
                                ))}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className={`text-xl font-bold ${cfg.color}`}>{college.chancePercent}%</div>
                              <div className="text-[10px] text-muted-foreground">chance</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border/50">
                            <div className="text-center">
                              <div className="text-xs text-muted-foreground flex items-center justify-center gap-0.5"><IndianRupee className="w-3 h-3" />Fees</div>
                              <div className="text-sm font-semibold text-foreground">{college.fees || "N/A"}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-muted-foreground flex items-center justify-center gap-0.5"><TrendingUp className="w-3 h-3" />Avg Pkg</div>
                              <div className="text-sm font-semibold text-foreground">{college.placement_avg || "N/A"}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xs text-muted-foreground flex items-center justify-center gap-0.5"><Award className="w-3 h-3" />Top Pkg</div>
                              <div className="text-sm font-semibold text-foreground">{college.placement_highest || "N/A"}</div>
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground mt-2 italic">"{ college.whyFit }"</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          );
        })}

        {/* AI Insights — Gated */}
        {(aiInsights || strategy) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-10 space-y-6">
            {/* Always show partial insights */}
            {aiInsights && (
              <Card className="border-primary/20 overflow-hidden">
                <CardContent className="p-6 relative">
                  {!insightsUnlocked && !user && (
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-transparent z-10 flex flex-col items-center justify-end pb-8">
                      <Lock className="w-8 h-8 text-primary mb-3" />
                      <h3 className="font-heading font-bold text-foreground text-lg mb-1">Unlock AI Insights & Strategy</h3>
                      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">Sign in to get personalized mentor advice, action plan, and detailed analysis</p>
                      <Button onClick={handleUnlockInsights} className="px-6">
                        <Sparkles className="w-4 h-4 mr-2" /> Unlock Full Report
                      </Button>
                    </div>
                  )}
                  <div className={!insightsUnlocked && !user ? "max-h-40 overflow-hidden" : ""}>
                    <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                      <ReactMarkdown>{aiInsights}</ReactMarkdown>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {(insightsUnlocked || user) && strategy && (
              <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/20">
                <CardContent className="p-6">
                  <div className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                    <ReactMarkdown>{strategy}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Retry Button */}
        <div className="text-center mt-10 mb-8">
          <Button variant="outline" size="lg" onClick={() => { setStep(0); setResults([]); setForm(initialForm); }}>
            Try Again with Different Profile
          </Button>
        </div>
      </div>

      <LoginRequiredDialog
        open={showLogin}
        onOpenChange={(open) => {
          setShowLogin(open);
          if (!open && user) setInsightsUnlocked(true);
        }}
        message="Sign in to unlock your personalized AI insights, strategy advice, and full college analysis."
      />

      <PageKeywords contentType="static" recordId="college-shortlister" fallbackKeywords={["MBA college shortlisting", "CAT college predictor"]} />
    </div>
  );
};

export default CollegeShortlisterPage;
