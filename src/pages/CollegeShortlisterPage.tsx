import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  GraduationCap, Target, Shield, Star, TrendingUp, IndianRupee, MapPin,
  ChevronRight, Sparkles, BookOpen, Briefcase, User, Lock, ArrowRight,
  CheckCircle2, BarChart3, Building2, Zap, Award, ChevronDown, Rocket,
  LayoutGrid, List, Table2, ArrowUpDown, Filter, Eye, Trophy, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import SEOHead from "@/components/SEOHead";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import ReactMarkdown from "react-markdown";
import PageKeywords from "@/components/PageKeywords";

const EXAMS = ["CAT", "XAT", "NMAT", "SNAP", "GMAT", "MAT", "CMAT"];
const SCORE_EXAMS = ["CAT", "XAT", "NMAT", "SNAP"]; // Exams that need individual scores
const STREAMS = ["Engineering", "Commerce", "Science", "Arts/Humanities", "BBA/BMS", "Economics", "Law", "Medical", "Other"];
const SPECIALIZATIONS = ["Finance", "Marketing", "Operations", "HR", "IT/Analytics", "General Management", "Consulting", "Entrepreneurship", "Open to All"];
const STATES = ["Pan India", "Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "Telangana", "West Bengal", "Gujarat", "Rajasthan", "Uttar Pradesh", "Madhya Pradesh", "Punjab", "Haryana", "Kerala", "Odisha", "Jharkhand", "Andhra Pradesh"];
const TIER_OPTIONS = ["Only IIMs", "Tier 1", "Tier 2", "All Tiers"];
const ROI_OPTIONS = [
  { value: "high_roi", label: "High ROI", desc: "Best return on investment" },
  { value: "premium", label: "Premium Colleges", desc: "Top-ranked institutions" },
  { value: "balanced", label: "Balanced", desc: "Mix of quality & value" },
];

const BENEFITS = [
  { icon: Zap, title: "AI-Powered Analysis", desc: "Advanced scoring using real college data, cutoffs & placements", color: "from-blue-500 to-cyan-500" },
  { icon: Target, title: "Personalized Results", desc: "Dream, Target & Safe colleges matched to YOUR exact profile", color: "from-amber-500 to-orange-500" },
  { icon: TrendingUp, title: "ROI Intelligence", desc: "Compare fees vs placement returns to maximize your investment", color: "from-emerald-500 to-green-500" },
  { icon: Rocket, title: "Strategy & Tips", desc: "AI mentor advice on applications, WAT/PI prep & backup plans", color: "from-purple-500 to-pink-500" },
];

const FAQS = [
  { q: "How accurate is the AI shortlisting?", a: "Our simulator uses real college data including cutoffs, placements, and fees combined with AI analysis. While no tool can guarantee admissions, our recommendations are data-backed and regularly updated." },
  { q: "What data does the simulator use?", a: "We analyze your exam scores, academic profile, work experience against our database of 100+ MBA colleges including their cutoff trends, placement records, fee structures, and admission criteria." },
  { q: "Is my data safe?", a: "Yes. Your profile data is only used for generating recommendations and is not shared with any third party." },
  { q: "Can I use this for GMAT-based admissions?", a: "Yes! The simulator supports CAT, XAT, NMAT, SNAP, GMAT, MAT, and CMAT." },
  { q: "What do Dream, Target, and Safe mean?", a: "Dream colleges (20-40% chance) are aspirational. Target (40-70%) are competitive but within reach. Safe (70-90%) strongly align with your profile." },
];

interface ScoreComponent {
  yours: number; required: number; max: number; label: string;
}

interface ScoreBreakdown {
  examScore: ScoreComponent;
  academicScore: ScoreComponent;
  workExScore: ScoreComponent;
  budgetFit: ScoreComponent;
  overallYours: number;
  overallRequired: number;
  overallMax: number;
  improvements: string[];
}

interface CollegeResult {
  id: string; name: string; slug: string; city: string | null; state: string | null;
  fees: string | null; feesNum: number; placement_avg: string | null; placement_highest: string | null;
  avgPkgNum: number; highestPkgNum: number; ranking: number | null; type: string | null;
  tier: string | null; college_category: string | null;
  established: number | null; logo_url: string | null; chancePercent: number;
  bucket: "dream" | "target" | "safe"; whyFit: string; tips: string;
  compositeScore: number; accreditations: string[] | null; exams_accepted: string[] | null;
  roi: number | null; badges: string[]; scoreBreakdown?: ScoreBreakdown;
  specializations: string[]; courses: string[] | null; campus_size: string | null; total_students: number | null;
}

interface FormData {
  exams: string[]; scoreType: "percentile" | "score"; overallScore: string;
  examScores: Record<string, string>;
  sectionalVARC: string; sectionalDILR: string; sectionalQuant: string;
  tenth: string; twelfth: string; graduation: string; graduationStream: string;
  graduationPursuing: boolean;
  workExperienceMonths: string; gender: string;
  budgetRange: [number, number]; expectedSalaryRange: [number, number];
  preferredStates: string[]; preferredColleges: string;
  collegeTier: string[]; specialization: string; roiPreference: string;
}

const initialForm: FormData = {
  exams: [], scoreType: "percentile", overallScore: "",
  examScores: {},
  sectionalVARC: "", sectionalDILR: "", sectionalQuant: "",
  tenth: "", twelfth: "", graduation: "", graduationStream: "",
  graduationPursuing: false,
  workExperienceMonths: "", gender: "",
  budgetRange: [200000, 2500000], expectedSalaryRange: [500000, 3000000],
  preferredStates: [], preferredColleges: "",
  collegeTier: [], specialization: "", roiPreference: "balanced",
};

const bucketConfig = {
  dream: { label: "Dream Colleges", desc: "Aspirational — aim high!", icon: Star, color: "text-amber-500", gradient: "from-amber-500 to-orange-500", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", chance: "20-40%", ring: "ring-amber-500/20", progressColor: "bg-amber-500" },
  target: { label: "Target Colleges", desc: "Competitive but within reach", icon: Target, color: "text-blue-500", gradient: "from-blue-500 to-indigo-500", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", chance: "40-70%", ring: "ring-blue-500/20", progressColor: "bg-blue-500" },
  safe: { label: "Safe Colleges", desc: "Strong profile match", icon: Shield, color: "text-emerald-500", gradient: "from-emerald-500 to-green-500", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300", chance: "70-90%", ring: "ring-emerald-500/20", progressColor: "bg-emerald-500" },
};

const badgeColors: Record<string, string> = {
  "High ROI": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
  "Best ROI": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "Top Tier": "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  "Elite": "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  "Fast Growing": "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  "Well Accredited": "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
};

const CollegeShortlisterPage = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialForm);
  const [results, setResults] = useState<CollegeResult[]>([]);
  const [aiInsights, setAiInsights] = useState("");
  const [strategy, setStrategy] = useState("");
  const [stats, setStats] = useState({ totalAnalyzed: 0, dreamCount: 0, targetCount: 0, safeCount: 0 });
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [insightsUnlocked, setInsightsUnlocked] = useState(false);
  const [viewMode, setViewMode] = useState<"section" | "detail" | "table">("section");
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [tableSort, setTableSort] = useState<{ col: string; asc: boolean }>({ col: "chancePercent", asc: false });
  const [tableFilter, setTableFilter] = useState<{ bucket: string; exam: string }>({ bucket: "all", exam: "all" });
  const { user } = useAuth();
  const { toast } = useToast();

  const updateField = <K extends keyof FormData>(key: K, val: FormData[K]) => setForm(prev => ({ ...prev, [key]: val }));

  const toggleExam = (exam: string) => {
    setForm(prev => ({
      ...prev,
      exams: prev.exams.includes(exam) ? prev.exams.filter(e => e !== exam) : [...prev.exams, exam],
    }));
  };

  const updateExamScore = (exam: string, value: string) => {
    setForm(prev => ({ ...prev, examScores: { ...prev.examScores, [exam]: value } }));
  };

  const toggleState = (state: string) => {
    if (state === "Pan India") {
      setForm(prev => ({ ...prev, preferredStates: prev.preferredStates.includes("Pan India") ? [] : ["Pan India"] }));
      return;
    }
    setForm(prev => ({
      ...prev,
      preferredStates: prev.preferredStates.filter(s => s !== "Pan India").includes(state)
        ? prev.preferredStates.filter(s => s !== state)
        : [...prev.preferredStates.filter(s => s !== "Pan India"), state],
    }));
  };

  const toggleTier = (tier: string) => {
    setForm(prev => ({
      ...prev,
      collegeTier: prev.collegeTier.includes(tier) ? prev.collegeTier.filter(t => t !== tier) : [...prev.collegeTier, tier],
    }));
  };

  // Which exams need individual scores
  const scoreExamsSelected = form.exams.filter(e => SCORE_EXAMS.includes(e));
  const needsPerExamScores = scoreExamsSelected.length > 1;

  const validateStep = (s: number): boolean => {
    if (s === 1) {
      if (form.exams.length === 0) { toast({ title: "Select at least one exam", variant: "destructive" }); return false; }
      if (!needsPerExamScores && (!form.overallScore || parseFloat(form.overallScore) <= 0)) {
        toast({ title: "Enter your score/percentile", variant: "destructive" }); return false;
      }
      if (needsPerExamScores) {
        const hasAtLeastOne = scoreExamsSelected.some(e => form.examScores[e] && parseFloat(form.examScores[e]) > 0);
        if (!hasAtLeastOne) { toast({ title: "Enter at least one exam score", variant: "destructive" }); return false; }
      }
    }
    if (s === 2) {
      if (!form.tenth || !form.twelfth) { toast({ title: "Enter 10th and 12th scores", variant: "destructive" }); return false; }
      if (!form.graduation) { toast({ title: "Enter graduation percentage", variant: "destructive" }); return false; }
      if (!form.graduationStream) { toast({ title: "Select graduation stream", variant: "destructive" }); return false; }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep(3)) return;
    setStep(4);
    setLoading(true);
    try {
      // Calculate best overall score from per-exam scores
      let bestScore = parseFloat(form.overallScore) || 0;
      const examScoresNumeric: Record<string, number> = {};
      if (needsPerExamScores) {
        for (const exam of scoreExamsSelected) {
          const val = parseFloat(form.examScores[exam] || "0");
          if (val > 0) {
            examScoresNumeric[exam] = val;
            if (val > bestScore) bestScore = val;
          }
        }
      }

      const payload = {
        exams: form.exams,
        scoreType: form.scoreType,
        overallScore: bestScore,
        examScores: Object.keys(examScoresNumeric).length > 0 ? examScoresNumeric : undefined,
        sectionalScores: form.sectionalVARC ? {
          varc: parseFloat(form.sectionalVARC) || 0,
          dilr: parseFloat(form.sectionalDILR) || 0,
          quant: parseFloat(form.sectionalQuant) || 0,
        } : undefined,
        tenth: parseFloat(form.tenth),
        twelfth: parseFloat(form.twelfth),
        graduation: parseFloat(form.graduation),
        graduationStream: form.graduationStream,
        graduationPursuing: form.graduationPursuing,
        workExperienceMonths: parseInt(form.workExperienceMonths) || 0,
        gender: form.gender || undefined,
        budgetMin: form.budgetRange[0],
        budgetMax: form.budgetRange[1],
        expectedSalaryMin: form.expectedSalaryRange[0],
        expectedSalaryMax: form.expectedSalaryRange[1],
        preferredStates: form.preferredStates.filter(s => s !== "Pan India"),
        preferredColleges: form.preferredColleges ? form.preferredColleges.split(",").map(c => c.trim()).filter(Boolean) : [],
        collegeTier: form.collegeTier,
        specialization: form.specialization,
        roiPreference: form.roiPreference,
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
    if (user) { setInsightsUnlocked(true); } else { setShowLogin(true); }
  };

  const dream = useMemo(() => results.filter(r => r.bucket === "dream"), [results]);
  const target = useMemo(() => results.filter(r => r.bucket === "target"), [results]);
  const safe = useMemo(() => results.filter(r => r.bucket === "safe"), [results]);

  const formatBudget = (val: number) => val >= 10000000 ? `₹${(val / 10000000).toFixed(1)}Cr` : `₹${(val / 100000).toFixed(0)}L`;
  const formatSalary = (val: number) => val >= 10000000 ? `₹${(val / 10000000).toFixed(1)}Cr` : `₹${(val / 100000).toFixed(0)}L`;

  const tableData = useMemo(() => {
    let data = [...results];
    if (tableFilter.bucket !== "all") data = data.filter(r => r.bucket === tableFilter.bucket);
    if (tableFilter.exam !== "all") data = data.filter(r => r.exams_accepted?.some(e => e.toLowerCase().includes(tableFilter.exam.toLowerCase())));
    data.sort((a, b) => {
      let av: number, bv: number;
      switch (tableSort.col) {
        case "fees": av = a.feesNum; bv = b.feesNum; break;
        case "roi": av = a.roi || 0; bv = b.roi || 0; break;
        case "avgPkg": av = a.avgPkgNum; bv = b.avgPkgNum; break;
        case "ranking": av = a.ranking || 999; bv = b.ranking || 999; break;
        default: av = a.chancePercent; bv = b.chancePercent;
      }
      return tableSort.asc ? av - bv : bv - av;
    });
    return data;
  }, [results, tableSort, tableFilter]);

  const toggleSort = (col: string) => setTableSort(prev => ({ col, asc: prev.col === col ? !prev.asc : false }));

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

        {/* Premium Hero */}
        <section className="relative overflow-hidden min-h-[90vh] flex items-center">
          <div className="absolute inset-0 hero-gradient" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-40 pointer-events-none" />
          <div className="absolute w-72 h-72 -top-20 -right-20 bg-white/5 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDuration: '5s' }} />

          <div className="relative container mx-auto px-4 py-16 md:py-24 z-10">
            <div className="max-w-4xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
                  <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-full px-4 py-1.5 mb-6 border border-white/20">
                    <Sparkles className="w-4 h-4 text-yellow-300" />
                    <span className="text-sm font-semibold text-primary-foreground">AI-Powered • 100+ Colleges</span>
                  </div>
                  <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-extrabold text-primary-foreground mb-4 leading-[1.1]">
                    Find Your Best-Fit
                    <span className="block bg-gradient-to-r from-yellow-200 to-amber-300 bg-clip-text text-transparent">MBA Colleges</span>
                  </h1>
                  <p className="text-primary-foreground/75 text-lg md:text-xl mb-8 leading-relaxed">
                    Get your Dream, Target & Safe colleges shortlisted in 30 seconds using AI — like having a personal mentor.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-bold text-lg px-8 py-6 rounded-xl shadow-xl" onClick={() => setStep(1)}>
                      Start Shortlisting <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                    <Button size="lg" variant="outline" className="border-white/30 text-primary-foreground hover:bg-white/10 font-semibold px-6 py-6 rounded-xl"
                      onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>
                      See How It Works
                    </Button>
                  </div>
                  <div className="flex items-center gap-6 mt-8">
                    <div className="flex -space-x-2">
                      {[1,2,3,4].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-white/70" />
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="text-primary-foreground font-bold text-sm">25,000+ Students</div>
                      <div className="text-primary-foreground/60 text-xs">used this tool successfully</div>
                    </div>
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="hidden lg:block">
                  <div className="space-y-3">
                    {(["dream", "target", "safe"] as const).map((bucket, i) => {
                      const cfg = bucketConfig[bucket];
                      const Icon = cfg.icon;
                      return (
                        <motion.div key={bucket} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.15 }}
                          className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 hover:bg-white/15 transition-all">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow-lg`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="text-primary-foreground font-semibold text-sm">{cfg.label}</div>
                              <div className="text-primary-foreground/50 text-xs">{cfg.desc}</div>
                            </div>
                            <Badge className="bg-white/20 text-white border-0 text-xs">{cfg.chance}</Badge>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none">
            <svg viewBox="0 0 1440 60" fill="none" className="w-full h-full" preserveAspectRatio="none">
              <path d="M0,30 C240,60 480,0 720,30 C960,60 1200,0 1440,30 L1440,60 L0,60 Z" fill="hsl(var(--background))" />
            </svg>
          </div>
        </section>

        {/* Benefits */}
        <section className="container mx-auto px-4 py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-3">Why Students Trust Our Shortlister</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">Data-backed recommendations powered by real college data and advanced AI</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {BENEFITS.map((b, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <Card className="h-full border-border/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
                  <CardContent className="pt-6 pb-5 text-center">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${b.color} flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                      <b.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-heading font-semibold text-foreground mb-1.5">{b.title}</h3>
                    <p className="text-muted-foreground text-sm">{b.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How it Works */}
        <section id="how-it-works" className="bg-muted/40 py-16">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-3">How It Works</h2>
              <p className="text-muted-foreground">3 simple steps to your personalized shortlist</p>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                { icon: BookOpen, title: "Enter Your Profile", desc: "Exam scores, academics, work experience & preferences — takes 60 seconds.", step: "01" },
                { icon: Zap, title: "AI Analyzes Colleges", desc: "Our algorithm scores each college using cutoffs, placements, ROI & your profile.", step: "02" },
                { icon: GraduationCap, title: "Get Your Shortlist", desc: "Receive Dream/Target/Safe colleges with chance %, ROI, tips & AI strategy.", step: "03" },
              ].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}>
                  <div className="relative text-center">
                    <div className="text-6xl font-heading font-extrabold text-primary/10 absolute -top-4 left-1/2 -translate-x-1/2">{item.step}</div>
                    <div className="relative pt-8">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <item.icon className="w-7 h-7 text-primary" />
                      </div>
                      <h3 className="font-heading font-semibold text-foreground text-lg mb-2">{item.title}</h3>
                      <p className="text-muted-foreground text-sm">{item.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Sample Output */}
        <section className="container mx-auto px-4 py-16">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-3">What You'll Get</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">A rich, interactive report with multiple views</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {(["dream", "target", "safe"] as const).map((bucket, bi) => {
              const cfg = bucketConfig[bucket];
              const Icon = cfg.icon;
              return (
                <motion.div key={bucket} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: bi * 0.1 }}>
                  <Card className={`${cfg.bg} ${cfg.border} border-2 hover:shadow-lg transition-all`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${cfg.gradient} flex items-center justify-center`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        {cfg.label}
                        <Badge variant="outline" className="ml-auto text-xs">{cfg.chance}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2.5">
                      {[1, 2].map(i => (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-background/60">
                          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center"><Building2 className="w-4 h-4 text-muted-foreground" /></div>
                          <div className="flex-1">
                            <div className="h-3 bg-muted rounded w-3/4 mb-1.5" />
                            <div className="h-2 bg-muted rounded w-1/2" />
                          </div>
                          <Badge className={cfg.badge + " text-xs"}>{bucket === "dream" ? "32%" : bucket === "target" ? "58%" : "82%"}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Testimonials */}
        <section className="bg-muted/40 py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-3">Trusted by MBA Aspirants</h2>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-5">
              {[
                { text: "This tool saved me hours of research. Got my shortlist in seconds and it was spot-on!", name: "Priya S.", tag: "CAT 95.6 %ile" },
                { text: "The Dream/Target/Safe bucketing is genius. I knew exactly where to focus my applications.", name: "Rahul M.", tag: "XAT 92.1 %ile" },
                { text: "AI strategy advice was like having a personal mentor. Recommended to all my friends.", name: "Ananya K.", tag: "CAT 88.3 %ile" },
              ].map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                  <Card className="h-full border-border/50">
                    <CardContent className="pt-5">
                      <div className="flex gap-0.5 mb-3">{[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}</div>
                      <p className="text-foreground text-sm mb-4 italic">"{t.text}"</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">{t.name}</span>
                        <Badge variant="outline" className="text-xs">{t.tag}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
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

        {/* Bottom CTA */}
        <section className="py-12 mb-8">
          <div className="container mx-auto px-4 text-center">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-4">Ready to Find Your Best-Fit Colleges?</h2>
              <Button size="lg" className="font-bold text-lg px-10 py-6 rounded-xl shadow-lg" onClick={() => setStep(1)}>
                Start Free Shortlisting <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <p className="text-muted-foreground text-sm mt-3">No signup required • Results in 30 seconds</p>
            </motion.div>
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
            <div className="flex justify-between text-sm font-medium text-muted-foreground mb-3">
              {["Exam & Score", "Academic Profile", "Preferences & Budget"].map((label, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step > i + 1 ? "bg-primary text-primary-foreground" : step === i + 1 ? "bg-primary text-primary-foreground ring-4 ring-primary/20" : "bg-muted text-muted-foreground"}`}>
                    {step > i + 1 ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`hidden sm:inline ${step >= i + 1 ? "text-foreground font-semibold" : ""}`}>{label}</span>
                </div>
              ))}
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
              {/* Step 1: Exam Details */}
              {step === 1 && (
                <Card className="shadow-lg border-border/50">
                  <CardHeader>
                    <CardTitle className="font-heading flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><BookOpen className="w-5 h-5 text-primary" /></div>
                      Exam & Score Details
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Select your exams and enter your score</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2.5 block">Which exams are you targeting? <span className="text-destructive">*</span> <span className="text-muted-foreground font-normal">(multi-select)</span></label>
                      <div className="grid grid-cols-4 gap-2">
                        {EXAMS.map(exam => (
                          <button key={exam} onClick={() => toggleExam(exam)}
                            className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${form.exams.includes(exam) ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]" : "border-border hover:border-primary/50 hover:bg-muted/50 text-foreground"}`}>
                            {exam}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Score Type</label>
                      <Select value={form.scoreType} onValueChange={(v) => updateField("scoreType", v as "percentile" | "score")}>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentile">Percentile (Expected/Actual)</SelectItem>
                          <SelectItem value="score">Raw Score</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Per-exam scores when multiple exams selected */}
                    {needsPerExamScores ? (
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Enter {form.scoreType === "percentile" ? "Expected/Actual Percentile" : "Score"} for each exam <span className="text-destructive">*</span>
                        </label>
                        <p className="text-xs text-muted-foreground mb-3">Fill in scores for exams you've appeared for or expect to appear</p>
                        <div className="grid grid-cols-2 gap-3">
                          {scoreExamsSelected.map(exam => (
                            <div key={exam}>
                              <label className="text-xs font-medium text-muted-foreground mb-1 block">{exam}</label>
                              <Input
                                type="number"
                                placeholder={form.scoreType === "percentile" ? `${exam} percentile` : `${exam} score`}
                                value={form.examScores[exam] || ""}
                                onChange={e => updateExamScore(exam, e.target.value)}
                                max={form.scoreType === "percentile" ? 100 : undefined}
                                className="rounded-xl"
                              />
                            </div>
                          ))}
                        </div>
                        {/* Also show exams that aren't in SCORE_EXAMS */}
                        {form.exams.filter(e => !SCORE_EXAMS.includes(e)).length > 0 && (
                          <div className="mt-3">
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Other Exams</label>
                            <div className="grid grid-cols-2 gap-3">
                              {form.exams.filter(e => !SCORE_EXAMS.includes(e)).map(exam => (
                                <div key={exam}>
                                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{exam}</label>
                                  <Input
                                    type="number"
                                    placeholder={`${exam} score`}
                                    value={form.examScores[exam] || ""}
                                    onChange={e => updateExamScore(exam, e.target.value)}
                                    className="rounded-xl"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          {form.exams.length > 0 ? form.exams[0] : "Overall"} {form.scoreType === "percentile" ? "Percentile (Expected/Actual)" : "Score"} <span className="text-destructive">*</span>
                        </label>
                        <Input
                          type="number"
                          placeholder={form.scoreType === "percentile" ? "e.g. 92.5" : "e.g. 180"}
                          value={form.overallScore}
                          onChange={e => updateField("overallScore", e.target.value)}
                          max={form.scoreType === "percentile" ? 100 : undefined}
                          className="rounded-xl"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Enter expected score if you haven't given the exam yet</p>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">Sectional Scores <span className="text-xs">(optional — improves accuracy for CAT)</span></label>
                      <div className="grid grid-cols-3 gap-3">
                        <Input placeholder="VARC" type="number" value={form.sectionalVARC} onChange={e => updateField("sectionalVARC", e.target.value)} className="rounded-xl" />
                        <Input placeholder="DILR" type="number" value={form.sectionalDILR} onChange={e => updateField("sectionalDILR", e.target.value)} className="rounded-xl" />
                        <Input placeholder="Quant" type="number" value={form.sectionalQuant} onChange={e => updateField("sectionalQuant", e.target.value)} className="rounded-xl" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Step 2: Profile */}
              {step === 2 && (
                <Card className="shadow-lg border-border/50">
                  <CardHeader>
                    <CardTitle className="font-heading flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><User className="w-5 h-5 text-primary" /></div>
                      Academic Profile
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Your academic scores and work experience</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">10th % <span className="text-destructive">*</span></label>
                        <Input type="number" placeholder="92" value={form.tenth} onChange={e => updateField("tenth", e.target.value)} max={100} className="rounded-xl" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">12th % <span className="text-destructive">*</span></label>
                        <Input type="number" placeholder="88" value={form.twelfth} onChange={e => updateField("twelfth", e.target.value)} max={100} className="rounded-xl" />
                      </div>
                    </div>

                    {/* Graduation with Pursuing toggle */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-foreground">Graduation % <span className="text-destructive">*</span></label>
                        <button
                          onClick={() => updateField("graduationPursuing", !form.graduationPursuing)}
                          className={`text-xs px-3 py-1 rounded-full border transition-all ${form.graduationPursuing ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                        >
                          {form.graduationPursuing ? "✓ Pursuing" : "Pursuing?"}
                        </button>
                      </div>
                      <Input
                        type="number"
                        placeholder={form.graduationPursuing ? "e.g. 78 (till last semester)" : "e.g. 75"}
                        value={form.graduation}
                        onChange={e => updateField("graduation", e.target.value)}
                        max={100}
                        className="rounded-xl"
                      />
                      {form.graduationPursuing && (
                        <p className="text-xs text-muted-foreground mt-1">Enter your percentage/CGPA average till the last completed semester</p>
                      )}
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2.5 block">Graduation Stream <span className="text-destructive">*</span></label>
                      <div className="grid grid-cols-3 gap-2">
                        {STREAMS.map(stream => (
                          <button key={stream} onClick={() => updateField("graduationStream", stream)}
                            className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all duration-200 ${form.graduationStream === stream ? "bg-primary text-primary-foreground border-primary shadow-md" : "border-border hover:border-primary/50 text-foreground"}`}>
                            {stream}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Work Experience (months)</label>
                        <Input type="number" placeholder="e.g. 24" value={form.workExperienceMonths} onChange={e => updateField("workExperienceMonths", e.target.value)} className="rounded-xl" />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">Gender (optional)</label>
                        <Select value={form.gender} onValueChange={(v) => updateField("gender", v)}>
                          <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
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
                <Card className="shadow-lg border-border/50">
                  <CardHeader>
                    <CardTitle className="font-heading flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><Target className="w-5 h-5 text-primary" /></div>
                      Preferences & Budget
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Help us narrow down the best colleges for you</p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">
                        Fee Budget: {formatBudget(form.budgetRange[0])} – {formatBudget(form.budgetRange[1])}
                      </label>
                      <Slider min={0} max={6000000} step={100000} value={form.budgetRange} onValueChange={(v) => updateField("budgetRange", v as [number, number])} className="mt-3" />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>₹0</span><span>₹60L</span></div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-1 block">
                        Expected Post-MBA Salary: {formatSalary(form.expectedSalaryRange[0])} – {formatSalary(form.expectedSalaryRange[1])}
                      </label>
                      <Slider min={300000} max={5000000} step={100000} value={form.expectedSalaryRange} onValueChange={(v) => updateField("expectedSalaryRange", v as [number, number])} className="mt-3" />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>₹3L</span><span>₹50L</span></div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2.5 block">State Preference <span className="text-xs text-muted-foreground">(multi-select)</span></label>
                      <div className="flex flex-wrap gap-2">
                        {STATES.map(state => (
                          <button key={state} onClick={() => toggleState(state)}
                            className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200 ${form.preferredStates.includes(state) ? "bg-primary text-primary-foreground border-primary" : state === "Pan India" ? "border-primary/30 text-primary hover:bg-primary/10" : "border-border hover:border-primary/50 text-foreground"}`}>
                            {state === "Pan India" && <Globe className="w-3 h-3 inline mr-1" />}{state}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2.5 block">College Tier</label>
                      <div className="grid grid-cols-2 gap-2">
                        {TIER_OPTIONS.map(tier => (
                          <button key={tier} onClick={() => toggleTier(tier)}
                            className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${form.collegeTier.includes(tier) ? "bg-primary text-primary-foreground border-primary shadow-md" : "border-border hover:border-primary/50 text-foreground"}`}>
                            {tier}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2.5 block">Preferred Specialization</label>
                      <div className="grid grid-cols-3 gap-2">
                        {SPECIALIZATIONS.map(spec => (
                          <button key={spec} onClick={() => updateField("specialization", spec)}
                            className={`px-3 py-2 rounded-xl border text-xs font-medium transition-all duration-200 ${form.specialization === spec ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50 text-foreground"}`}>
                            {spec}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2.5 block">ROI Preference</label>
                      <div className="grid grid-cols-3 gap-2">
                        {ROI_OPTIONS.map(opt => (
                          <button key={opt.value} onClick={() => updateField("roiPreference", opt.value)}
                            className={`p-3 rounded-xl border text-center transition-all duration-200 ${form.roiPreference === opt.value ? "bg-primary text-primary-foreground border-primary shadow-md" : "border-border hover:border-primary/50"}`}>
                            <div className={`text-sm font-semibold ${form.roiPreference === opt.value ? "" : "text-foreground"}`}>{opt.label}</div>
                            <div className={`text-[11px] mt-0.5 ${form.roiPreference === opt.value ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{opt.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Preferred Colleges <span className="text-xs text-muted-foreground">(optional, comma-separated)</span></label>
                      <Input placeholder="e.g. IIM Ahmedabad, XLRI, MDI" value={form.preferredColleges} onChange={e => updateField("preferredColleges", e.target.value)} className="rounded-xl" />
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Nav Buttons */}
          <div className="flex justify-between mt-6">
            <Button variant="outline" className="rounded-xl" onClick={() => setStep(step === 1 ? 0 : step - 1)}>
              {step === 1 ? "← Back" : "← Previous"}
            </Button>
            {step < 3 ? (
              <Button className="rounded-xl" onClick={() => { if (validateStep(step)) setStep(step + 1); }}>
                Next Step <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} className="px-8 rounded-xl shadow-lg hover:shadow-xl transition-all">
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
    const stages = [
      { text: "Scanning 100+ MBA colleges...", icon: Building2 },
      { text: "Matching your profile against cutoffs...", icon: Target },
      { text: "Calculating admission probabilities...", icon: BarChart3 },
      { text: "Computing ROI for each college...", icon: TrendingUp },
      { text: "Generating AI mentor insights...", icon: Sparkles },
    ];
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 mx-auto mb-8 rounded-full border-4 border-primary border-t-transparent shadow-lg shadow-primary/20" />
          <h2 className="font-heading text-2xl font-bold text-foreground mb-2">Analyzing Your Profile</h2>
          <p className="text-muted-foreground text-sm mb-6">This takes about 15-30 seconds</p>
          <div className="space-y-3">
            {stages.map((stage, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 1.2 }}
                className="flex items-center gap-3 text-left p-3 rounded-xl bg-muted/50">
                <stage.icon className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm text-foreground">{stage.text}</span>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 1.2 + 1 }}>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto flex-shrink-0" />
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── RESULTS ───────────────────────────────────────────────

  const renderCollegeCard = (college: CollegeResult, cfg: typeof bucketConfig.dream) => {
    const isExpanded = expandedCard === college.id;
    return (
      <motion.div key={college.id} layout>
        <Card className={`${cfg.border} border hover:shadow-lg transition-all duration-300 group overflow-hidden`}>
          <CardContent className="p-4 md:p-5">
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                {college.logo_url ? <img src={college.logo_url} alt={college.name} className="w-11 h-11 rounded-lg object-contain" /> : <Building2 className={`w-7 h-7 ${cfg.color}`} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link to={`/college/${college.slug}`} className="font-heading font-semibold text-foreground hover:text-primary transition-colors text-sm md:text-base">
                      {college.name}
                    </Link>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {college.city && <span className="text-xs text-muted-foreground flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {college.city}{college.state ? `, ${college.state}` : ""}</span>}
                      {college.ranking && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Rank #{college.ranking}</Badge>}
                      {college.tier && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{college.tier}</Badge>}
                    </div>
                    {college.badges.length > 0 && (
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {college.badges.map(b => (
                          <Badge key={b} className={`text-[10px] px-2 py-0.5 ${badgeColors[b] || "bg-muted text-foreground"}`}>
                            {(b === "High ROI" || b === "Best ROI") && <Trophy className="w-3 h-3 mr-0.5" />}{b}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Chance visual */}
                  <div className="text-right flex-shrink-0">
                    <div className="relative w-16 h-16">
                      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/30" />
                        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4"
                          strokeDasharray={`${(college.chancePercent / 100) * 175.9} 175.9`}
                          className={cfg.color} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className={`text-base font-bold ${cfg.color}`}>{college.chancePercent}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-3 mt-3 pt-3 border-t border-border/50">
                  <div className="text-center">
                    <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5"><IndianRupee className="w-2.5 h-2.5" />Fees</div>
                    <div className="text-xs font-semibold text-foreground">{college.fees || "N/A"}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5"><TrendingUp className="w-2.5 h-2.5" />Avg CTC</div>
                    <div className="text-xs font-semibold text-foreground">{college.placement_avg || "N/A"}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5"><Award className="w-2.5 h-2.5" />Top CTC</div>
                    <div className="text-xs font-semibold text-foreground">{college.placement_highest || "N/A"}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5"><BarChart3 className="w-2.5 h-2.5" />ROI</div>
                    <div className={`text-xs font-bold ${college.roi && college.roi >= 2 ? "text-emerald-600" : "text-foreground"}`}>{college.roi ? `${college.roi}x` : "N/A"}</div>
                  </div>
                </div>

                {/* Why fit - styled with icon */}
                <div className={`mt-3 p-3 rounded-xl ${cfg.bg} border ${cfg.border}`}>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${cfg.color} flex-shrink-0 mt-0.5`} />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Why You Fit</span>
                      <p className="text-xs text-foreground mt-0.5 leading-relaxed">{college.whyFit}</p>
                    </div>
                  </div>
                </div>

                {/* Expand for tips */}
                <button onClick={() => setExpandedCard(isExpanded ? null : college.id)}
                  className={`text-xs font-semibold mt-2.5 flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${isExpanded ? `${cfg.bg} ${cfg.color}` : "text-primary hover:bg-primary/5"}`}>
                  <Sparkles className="w-3 h-3" />
                  {isExpanded ? "Hide Strategy" : "Tips & Strategy"} <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="mt-2 p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border/30 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Rocket className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Action Plan</span>
                            <p className="text-xs text-foreground mt-1 leading-relaxed">{college.tips}</p>
                          </div>
                        </div>
                        {college.exams_accepted && (
                          <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                            <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-[10px] font-medium text-muted-foreground">Exams:</span>
                            <div className="flex gap-1 flex-wrap">
                              {college.exams_accepted.map((e, i) => (
                                <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0">{e}</Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {college.specializations?.length > 0 && (
                          <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                            <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-[10px] font-medium text-muted-foreground">Courses:</span>
                            <span className="text-xs text-foreground">{college.specializations.slice(0, 5).join(", ")}</span>
                          </div>
                        )}
                        <div className="pt-2 border-t border-border/30">
                          <Link to={`/college/${college.slug}`} className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline">
                            View Full College Profile <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Your MBA College Shortlist — AI Results" description="Personalized MBA college recommendations based on your profile." />

      {/* Results Header */}
      <section className="relative overflow-hidden" style={{ background: "var(--hero-gradient)" }}>
        <div className="container mx-auto px-4 py-10 md:py-14 relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="mb-3 bg-white/20 text-white border-white/30 backdrop-blur-sm"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Analysis Complete</Badge>
            <h1 className="text-2xl md:text-4xl font-heading font-bold text-white mb-2">Your Personalized College Shortlist</h1>
            <p className="text-white/70 text-sm md:text-base">
              {form.exams.join(", ")} • {stats.totalAnalyzed} colleges analyzed
            </p>
            <div className="flex justify-center gap-8 mt-5">
              {([
                { label: "Dream", count: stats.dreamCount, color: "text-amber-200", icon: Star },
                { label: "Target", count: stats.targetCount, color: "text-blue-200", icon: Target },
                { label: "Safe", count: stats.safeCount, color: "text-emerald-200", icon: Shield },
              ] as const).map(s => (
                <div key={s.label} className="text-center">
                  <div className={`text-3xl font-bold ${s.color}`}>{s.count}</div>
                  <div className="text-white/60 text-xs flex items-center gap-1 justify-center"><s.icon className="w-3 h-3" />{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* View Mode Tabs */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex bg-muted rounded-xl p-1 gap-1">
            {([
              { value: "section" as const, icon: LayoutGrid, label: "Section View" },
              { value: "detail" as const, icon: List, label: "Detailed View" },
              { value: "table" as const, icon: Table2, label: "Table View" },
            ]).map(v => (
              <button key={v.value} onClick={() => setViewMode(v.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${viewMode === v.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                <v.icon className="w-3.5 h-3.5" /> <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => { setStep(0); setResults([]); setForm(initialForm); }}>
            New Analysis
          </Button>
        </div>

        {/* ═══ SECTION VIEW ═══ */}
        {viewMode === "section" && (
          <div className="space-y-8">
            {(["dream", "target", "safe"] as const).map((bucket) => {
              const colleges = bucket === "dream" ? dream : bucket === "target" ? target : safe;
              const cfg = bucketConfig[bucket];
              const Icon = cfg.icon;
              return (
                <motion.div key={bucket} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: bucket === "dream" ? 0.1 : bucket === "target" ? 0.25 : 0.4 }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cfg.gradient} flex items-center justify-center shadow-md`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-heading font-bold text-lg text-foreground">{cfg.label}</h2>
                      <p className="text-xs text-muted-foreground">{cfg.chance} admission probability</p>
                    </div>
                    <Badge className={cfg.badge + " ml-auto"}>{colleges.length} colleges</Badge>
                  </div>
                  {colleges.length > 0 ? (
                    <div className="grid gap-3">
                      {colleges.map(college => renderCollegeCard(college, cfg))}
                    </div>
                  ) : (
                    <div className={`p-6 rounded-xl border-2 border-dashed ${cfg.border} text-center`}>
                      <Icon className={`w-8 h-8 mx-auto mb-2 ${cfg.color} opacity-40`} />
                      <p className="text-sm text-muted-foreground">
                        {bucket === "dream" ? "No dream colleges found — your profile may already match well with top colleges!" :
                         bucket === "target" ? "No target colleges in this range." :
                         "No safe colleges found — try adjusting your preferences."}
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ═══ DETAILED VIEW ═══ */}
        {viewMode === "detail" && (
          <div className="grid gap-4">
            {results.map(college => {
              const cfg = bucketConfig[college.bucket];
              return renderCollegeCard(college, cfg);
            })}
          </div>
        )}

        {/* ═══ TABLE VIEW ═══ */}
        {viewMode === "table" && (
          <div>
            <div className="flex gap-3 mb-4 flex-wrap">
              <Select value={tableFilter.bucket} onValueChange={v => setTableFilter(prev => ({ ...prev, bucket: v }))}>
                <SelectTrigger className="w-[140px] rounded-xl text-xs"><Filter className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Buckets</SelectItem>
                  <SelectItem value="dream">Dream</SelectItem>
                  <SelectItem value="target">Target</SelectItem>
                  <SelectItem value="safe">Safe</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tableFilter.exam} onValueChange={v => setTableFilter(prev => ({ ...prev, exam: v }))}>
                <SelectTrigger className="w-[120px] rounded-xl text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exams</SelectItem>
                  {EXAMS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">College</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs cursor-pointer hover:text-primary" onClick={() => toggleSort("chancePercent")}>
                      Chance % <ArrowUpDown className="w-3 h-3 inline ml-0.5" />
                    </TableHead>
                    <TableHead className="text-xs cursor-pointer hover:text-primary" onClick={() => toggleSort("fees")}>
                      Fees <ArrowUpDown className="w-3 h-3 inline ml-0.5" />
                    </TableHead>
                    <TableHead className="text-xs cursor-pointer hover:text-primary" onClick={() => toggleSort("avgPkg")}>
                      Avg CTC <ArrowUpDown className="w-3 h-3 inline ml-0.5" />
                    </TableHead>
                    <TableHead className="text-xs cursor-pointer hover:text-primary" onClick={() => toggleSort("roi")}>
                      ROI <ArrowUpDown className="w-3 h-3 inline ml-0.5" />
                    </TableHead>
                    <TableHead className="text-xs">Exams</TableHead>
                    <TableHead className="text-xs text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map(college => {
                    const cfg = bucketConfig[college.bucket];
                    return (
                      <TableRow key={college.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-8 rounded-full bg-gradient-to-b ${cfg.gradient}`} />
                            <div>
                              <Link to={`/college/${college.slug}`} className="font-medium text-xs text-foreground hover:text-primary transition-colors">{college.name}</Link>
                              <div className="text-[10px] text-muted-foreground">{college.city}{college.state ? `, ${college.state}` : ""}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${cfg.badge} text-[10px]`}>{college.bucket}</Badge>
                        </TableCell>
                        <TableCell><span className={`font-bold text-sm ${cfg.color}`}>{college.chancePercent}%</span></TableCell>
                        <TableCell className="text-xs">{college.fees || "N/A"}</TableCell>
                        <TableCell className="text-xs">{college.placement_avg || "N/A"}</TableCell>
                        <TableCell className={`text-xs font-bold ${college.roi && college.roi >= 2 ? "text-emerald-600" : ""}`}>{college.roi ? `${college.roi}x` : "N/A"}</TableCell>
                        <TableCell className="text-[10px]">{college.exams_accepted?.slice(0, 3).join(", ") || "—"}</TableCell>
                        <TableCell className="text-right">
                          <Link to={`/college/${college.slug}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs"><Eye className="w-3 h-3 mr-1" /> View</Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* AI Insights — Gated */}
        {(aiInsights || strategy) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mt-10 space-y-6">
            {aiInsights && (
              <Card className="border-primary/20 overflow-hidden shadow-lg relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-primary/20" />
                <CardContent className="p-6 relative">
                  {!insightsUnlocked && !user && (
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-transparent z-10 flex flex-col items-center justify-end pb-8">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <Lock className="w-7 h-7 text-primary" />
                      </div>
                      <h3 className="font-heading font-bold text-foreground text-lg mb-1">Unlock Your Personalized Strategy</h3>
                      <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">Sign in to get your mentor-style assessment, action plan, and detailed guidance</p>
                      <Button onClick={handleUnlockInsights} size="lg" className="px-8 rounded-xl shadow-lg">
                        <Sparkles className="w-4 h-4 mr-2" /> Unlock Full Report
                      </Button>
                    </div>
                  )}
                  <div className={!insightsUnlocked && !user ? "max-h-40 overflow-hidden" : ""}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Target className="w-4 h-4 text-primary" />
                      </div>
                      <h3 className="font-heading font-bold text-foreground">Profile Assessment</h3>
                    </div>
                    <div className="prose prose-sm max-w-none text-foreground dark:prose-invert prose-p:leading-relaxed prose-li:leading-relaxed prose-headings:font-heading">
                      <ReactMarkdown>{aiInsights}</ReactMarkdown>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {(insightsUnlocked || user) && strategy && (
              <Card className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50/40 to-emerald-50/10 dark:from-emerald-950/30 dark:to-emerald-950/10 shadow-lg overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300" />
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Rocket className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h3 className="font-heading font-bold text-foreground">Your Action Plan</h3>
                  </div>
                  <div className="prose prose-sm max-w-none text-foreground dark:prose-invert prose-p:leading-relaxed prose-li:leading-relaxed prose-headings:font-heading">
                    <ReactMarkdown>{strategy}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {/* Retry */}
        <div className="text-center mt-10 mb-8">
          <Button variant="outline" size="lg" className="rounded-xl" onClick={() => { setStep(0); setResults([]); setForm(initialForm); }}>
            Try Again with Different Profile
          </Button>
        </div>
      </div>

      <LoginRequiredDialog
        open={showLogin}
        onOpenChange={(open) => { setShowLogin(open); if (!open && user) setInsightsUnlocked(true); }}
        message="Sign in to unlock your personalized AI insights, strategy advice, and full college analysis."
      />

      <PageKeywords contentType="static" recordId="college-shortlister" fallbackKeywords={["MBA college shortlisting", "CAT college predictor"]} />
    </div>
  );
};

export default CollegeShortlisterPage;
