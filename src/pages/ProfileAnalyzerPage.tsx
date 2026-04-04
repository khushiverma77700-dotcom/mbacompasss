import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, GraduationCap, Briefcase, Target, ChevronRight, ChevronLeft, Lock, Phone, Mail,
  TrendingUp, Shield, Zap, BookOpen, Calendar, Star, AlertTriangle, CheckCircle2, ArrowRight,
  Sparkles, BarChart3, Lightbulb, User, FileText, Download, Save, MapPin, ClipboardList,
  Award, Users, Clock, ArrowUpRight, ChevronDown, Info, Search, Layers, Activity, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead, { generateBreadcrumbSchema, generateWebsiteSchema } from "@/components/SEOHead";

const STORAGE_KEY = "profile_analyzer_v2_draft";

const EXAM_OPTIONS = ["CAT", "XAT", "NMAT", "SNAP", "CMAT", "MAT", "GMAT", "IIFT", "TISSNET", "ATMA"];
const STREAM_OPTIONS = ["Engineering", "Commerce", "Science", "Arts", "Medical", "Law", "Other"];
const SPECIALIZATIONS = ["Finance", "Marketing", "Operations", "HR", "IT & Analytics", "Strategy", "General Management", "Entrepreneurship"];
const CATEGORY_OPTIONS = ["General", "OBC", "OBC-NCL", "SC", "ST", "EWS", "PwD"];
const COLLEGE_OPTIONS = [
  "IIM Ahmedabad", "IIM Bangalore", "IIM Calcutta", "IIM Lucknow", "IIM Kozhikode",
  "IIM Indore", "IIM Shillong", "IIM Rohtak", "IIM Ranchi", "IIM Kashipur",
  "IIM Trichy", "IIM Udaipur", "IIM Nagpur", "IIM Amritsar", "IIM Bodh Gaya",
  "IIM Jammu", "IIM Sambalpur", "IIM Sirmaur", "IIM Visakhapatnam",
  "FMS Delhi", "XLRI Jamshedpur", "IIFT Delhi", "MDI Gurgaon", "SPJIMR Mumbai",
  "NMIMS Mumbai", "SIBM Pune", "SCMHRD Pune", "IIT Bombay (SJMSOM)",
  "IIT Delhi (DMS)", "IIT Kharagpur (VGSoM)", "NITIE Mumbai", "JBIMS Mumbai",
  "TISS Mumbai", "Great Lakes Chennai", "IMT Ghaziabad", "TAPMI Manipal",
];
const WORK_EXP_OPTIONS = [
  { label: "Fresher (No Experience)", value: "0" },
  { label: "0 - 6 Months", value: "3" },
  { label: "6 - 12 Months", value: "9" },
  { label: "12 - 18 Months", value: "15" },
  { label: "18 - 24 Months", value: "21" },
  { label: "24 - 30 Months", value: "27" },
  { label: "30 - 36 Months", value: "33" },
  { label: "36 - 42 Months", value: "39" },
  { label: "42 - 48 Months", value: "45" },
  { label: "48 - 54 Months", value: "51" },
  { label: "54 - 60 Months", value: "57" },
  { label: "60+ Months", value: "66" },
];
const INDIAN_STATES = [
  "Pan India", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

interface CollegeTableRow {
  college_name: string;
  city: string;
  state: string;
  nirf_ranking?: number;
  avg_fees_lakhs: number;
  avg_package_lakhs: number;
  median_package_lakhs?: number;
  highest_package_lakhs?: number;
  required_cat_percentile: number;
  student_cat_target: number;
  acceptance_rate_percent?: number;
  your_admission_probability: number;
  difficulty: string;
  key_selection_criteria: string;
  recommendation: string;
  tier: string;
}

interface AnalysisResult {
  profile_id: string;
  profile_score: number;
  strengths: Array<{ title: string; description: string; impact: string }>;
  weaknesses: Array<{ title: string; description: string; severity: string; fix: string }>;
  college_predictions: {
    dream: Array<{ name: string; probability: number; cutoff_info: string; tip?: string }>;
    target: Array<{ name: string; probability: number; cutoff_info: string; tip?: string }>;
    safe: Array<{ name: string; probability: number; cutoff_info: string; tip?: string }>;
  };
  detailed_college_table: CollegeTableRow[];
  recommendations: Array<{ title: string; description: string; priority: string; timeline?: string }>;
  study_plan: Array<{ phase: string; duration: string; focus_areas: string[]; target_score?: string; daily_hours?: number }>;
  score_breakdown: {
    academics_score: number;
    work_experience_score: number;
    diversity_score: number;
    overall_competitiveness: string;
  };
  ai_summary: string;
}

interface FormData {
  name: string;
  email: string;
  tenth_score: string;
  twelfth_score: string;
  graduation_score: string;
  graduation_stream: string;
  is_pursuing_graduation: boolean;
  work_experience_months: string;
  category: string;
  gender: string;
  target_exams: string[];
  target_colleges: string[];
  preferred_specialization: string;
  target_states: string[];
}

const initialForm: FormData = {
  name: "", email: "",
  tenth_score: "", twelfth_score: "", graduation_score: "", graduation_stream: "",
  is_pursuing_graduation: false,
  work_experience_months: "", category: "General", gender: "",
  target_exams: [], target_colleges: [], preferred_specialization: "", target_states: [],
};

/* ──────────── HOW IT WORKS ANIMATION ──────────── */
const HowItWorksSection = () => {
  const steps = [
    { icon: ClipboardList, title: "Fill Your Profile", desc: "Enter academic scores, work experience, and target exams in a simple multi-step form." },
    { icon: Brain, title: "AI Analyses 10,000+ Data Points", desc: "Our engine cross-references your profile against historical admission data and current cutoffs." },
    { icon: BarChart3, title: "Get Detailed Report", desc: "Receive college-wise admission probability, difficulty ratings, target percentiles, and a personalised roadmap." },
    { icon: Sparkles, title: "Actionable Roadmap", desc: "Follow your AI-generated study plan, improvement tips, and mentorship recommendations." },
  ];
  return (
    <section className="py-16 px-4 max-w-6xl mx-auto">
      <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-3xl md:text-4xl font-bold text-center mb-4">
        How It Works
      </motion.h2>
      <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">Our AI-powered engine delivers personalised MBA admission insights in under 60 seconds.</p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
        {/* Connector line (desktop) */}
        <div className="hidden md:block absolute top-16 left-[12.5%] right-[12.5%] h-0.5 bg-border z-0" />
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15 }}
            className="relative z-10 flex flex-col items-center text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 border border-primary/20">
              <s.icon className="w-7 h-7 text-primary" />
            </div>
            <Badge variant="outline" className="mb-2 text-xs">{`Step ${i + 1}`}</Badge>
            <h3 className="font-bold mb-1">{s.title}</h3>
            <p className="text-sm text-muted-foreground">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

/* ──────────── MAIN COMPONENT ──────────── */
const ProfileAnalyzerPage = () => {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...initialForm, ...JSON.parse(saved) } : initialForm;
    } catch { return initialForm; }
  });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [leadPhone, setLeadPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savingReport, setSavingReport] = useState(false);
  const [collegeSortKey, setCollegeSortKey] = useState<string>("your_admission_probability");
  const [collegeSortAsc, setCollegeSortAsc] = useState(false);
  const [collegeFilter, setCollegeFilter] = useState<string>("all");
  const { toast } = useToast();
  const { user } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)); }, [form]);

  const updateField = (key: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const toggleArrayItem = (key: "target_exams" | "target_colleges" | "target_states", item: string) => {
    setForm(prev => ({
      ...prev,
      [key]: prev[key].includes(item) ? prev[key].filter(c => c !== item) : [...prev[key], item],
    }));
  };
  const toggleAllExams = () => {
    setForm(prev => ({
      ...prev,
      target_exams: prev.target_exams.length === EXAM_OPTIONS.length ? [] : [...EXAM_OPTIONS],
    }));
  };

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};
    if (s === 1) {
      if (!form.name.trim()) errs.name = "Enter your name";
      if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Enter a valid email";
    } else if (s === 2) {
      if (!form.tenth_score || +form.tenth_score < 1 || +form.tenth_score > 100) errs.tenth_score = "Enter valid percentage (1-100)";
      if (!form.twelfth_score || +form.twelfth_score < 1 || +form.twelfth_score > 100) errs.twelfth_score = "Enter valid percentage (1-100)";
      if (!form.graduation_score || +form.graduation_score < 1 || +form.graduation_score > 100) errs.graduation_score = "Enter valid percentage (1-100)";
      if (!form.graduation_stream) errs.graduation_stream = "Select your stream";
    } else if (s === 3) {
      if (!form.work_experience_months && form.work_experience_months !== "0") errs.work_experience_months = "Select work experience";
      if (!form.target_exams.length) errs.target_exams = "Select at least one exam";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => { if (validateStep(step)) setStep(step + 1); };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;
    setStep(5);
    setLoadingProgress(0);
    const interval = setInterval(() => {
      setLoadingProgress(prev => { if (prev >= 90) { clearInterval(interval); return 90; } return prev + Math.random() * 10; });
    }, 400);

    try {
      const { data, error } = await supabase.functions.invoke("profile-analyzer", {
        body: {
          name: form.name,
          email: form.email,
          tenth_score: +form.tenth_score,
          twelfth_score: +form.twelfth_score,
          graduation_score: +form.graduation_score,
          graduation_stream: form.graduation_stream,
          is_pursuing_graduation: form.is_pursuing_graduation,
          work_experience_months: +form.work_experience_months || 0,
          category: form.category,
          gender: form.gender || undefined,
          target_exams: form.target_exams,
          target_colleges: form.target_colleges,
          preferred_specialization: form.preferred_specialization || undefined,
          target_states: form.target_states,
        },
      });
      clearInterval(interval);
      setLoadingProgress(100);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      localStorage.removeItem(STORAGE_KEY);
      setTimeout(() => setStep(6), 600);
    } catch (e: any) {
      clearInterval(interval);
      toast({ title: "Analysis Failed", description: e.message || "Please try again.", variant: "destructive" });
      setStep(4);
    }
  };

  const handleUnlock = async () => {
    if (!leadPhone || leadPhone.length < 10) {
      toast({ title: "Phone Required", description: "Enter a valid 10-digit mobile number.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (result?.profile_id) {
        await supabase.from("profile_analyses").update({ phone: leadPhone, email: form.email || null, report_unlocked: true }).eq("id", result.profile_id);
      }
      setUnlocked(true);
      setShowLeadModal(false);
      setStep(7);
      toast({ title: "Report Unlocked", description: "Your personalised MBA roadmap is ready." });
    } catch {
      toast({ title: "Error", description: "Please try again.", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const handleSaveReport = async () => {
    if (!user) {
      toast({ title: "Sign In Required", description: "Please sign in to save your report to your dashboard.", variant: "destructive" });
      return;
    }
    setSavingReport(true);
    try {
      if (result?.profile_id) {
        await supabase.from("profile_analyses").update({ user_id: user.id }).eq("id", result.profile_id);
      }
      toast({ title: "Report Saved", description: "You can view this report anytime from your dashboard." });
    } catch {
      toast({ title: "Error", description: "Could not save report.", variant: "destructive" });
    } finally { setSavingReport(false); }
  };

  const scoreColor = (s: number) => s >= 8 ? "text-green-600" : s >= 6 ? "text-amber-600" : "text-red-600";
  const probColor = (p: number) => p >= 60 ? "bg-green-500" : p >= 30 ? "bg-amber-500" : "bg-red-500";
  const diffColor = (d: string) => {
    if (d === "Easy") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (d === "Medium") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    if (d === "Hard") return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  };

  const sortedColleges = React.useMemo(() => {
    if (!result?.detailed_college_table) return [];
    let arr = [...result.detailed_college_table];
    if (collegeFilter !== "all") arr = arr.filter(c => c.tier === collegeFilter);
    arr.sort((a: any, b: any) => {
      const va = a[collegeSortKey] ?? 0;
      const vb = b[collegeSortKey] ?? 0;
      return collegeSortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return arr;
  }, [result?.detailed_college_table, collegeSortKey, collegeSortAsc, collegeFilter]);

  const handleSort = (key: string) => {
    if (collegeSortKey === key) setCollegeSortAsc(!collegeSortAsc);
    else { setCollegeSortKey(key); setCollegeSortAsc(false); }
  };

  const jsonLd = [
    generateWebsiteSchema(),
    generateBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Profile Analyser", url: "/profile-analyzer" },
    ]),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <SEOHead
        title="AI-Powered MBA Profile Analyser by B School Buzz | Check IIM Chances Free"
        description="Analyse your MBA profile with AI. Get personalised IIM admission probability, college-wise comparison table with difficulty ratings, CAT percentile targets, and a detailed preparation roadmap. Free tool by B School Buzz."
        keywords={["MBA profile analyser", "IIM chances calculator", "CAT score predictor", "MBA admission probability", "B School Buzz profile analyser", "AI MBA tool", "IIM admission predictor", "MBA college comparison"]}
        canonical="https://bestmbacoaching.com/profile-analyzer"
        ogType="website"
        ogTitle="AI-Powered MBA Profile Analyser by B School Buzz"
        ogDescription="Get personalised college predictions, admission probability, and AI-powered preparation roadmap for IIM, XLRI, FMS and 50+ top MBA colleges."
        jsonLd={jsonLd}
      />

      <AnimatePresence mode="wait">
        {/* ────── LANDING ────── */}
        {step === 0 && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }}>
            {/* Hero */}
            <section className="min-h-[75vh] flex items-center justify-center px-4 relative overflow-hidden">
              {/* Floating animated elements */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                  className="absolute top-[15%] left-[8%] w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <GraduationCap className="w-8 h-8 text-primary/40" />
                </motion.div>
                <motion.div animate={{ y: [0, 15, 0], rotate: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 7, ease: "easeInOut", delay: 1 }}
                  className="absolute top-[25%] right-[10%] w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <BarChart3 className="w-7 h-7 text-primary/40" />
                </motion.div>
                <motion.div animate={{ y: [0, -15, 0] }} transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 2 }}
                  className="absolute bottom-[20%] left-[15%] w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Target className="w-6 h-6 text-primary/40" />
                </motion.div>
                <motion.div animate={{ y: [0, 20, 0], x: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 8, ease: "easeInOut", delay: 0.5 }}
                  className="absolute bottom-[30%] right-[12%] w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-primary/40" />
                </motion.div>
              </div>

              <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
                  className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-2xl">
                  <Brain className="w-10 h-10 text-primary-foreground" />
                </motion.div>
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
                  <Badge variant="secondary" className="text-sm px-4 py-1.5 mb-4">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" /> AI-Powered Tool by B School Buzz
                  </Badge>
                </motion.div>
                <motion.h1 initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
                  className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
                  AI-Powered MBA{" "}
                  <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Profile Analyser</span>
                </motion.h1>
                <motion.p initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                  className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                  Check your admission chances for IIMs and 50+ top MBA colleges in India. Get a detailed college comparison table with CAT percentile targets, difficulty ratings, and a personalised preparation roadmap.
                </motion.p>
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
                  className="flex flex-wrap justify-center gap-3 text-sm text-muted-foreground">
                  {[
                    { icon: Activity, label: "10,000+ Data Points" },
                    { icon: Brain, label: "AI-Powered Analysis" },
                    { icon: FileText, label: "Detailed College Table" },
                    { icon: Shield, label: "100% Free & Secure" },
                  ].map(t => (
                    <div key={t.label} className="flex items-center gap-2 bg-card border border-border/50 rounded-full px-4 py-2">
                      <t.icon className="w-4 h-4 text-primary" /> {t.label}
                    </div>
                  ))}
                </motion.div>
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6 }}>
                  <Button size="lg" onClick={() => setStep(1)} className="text-lg px-10 py-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all group">
                    Start Free Analysis <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </motion.div>

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8">
                  {[
                    { icon: GraduationCap, label: "50+ Colleges", sub: "Detailed Comparison" },
                    { icon: Brain, label: "AI Analysis", sub: "Personalised Insights" },
                    { icon: TrendingUp, label: "Accuracy", sub: "85%+ Match Rate" },
                    { icon: Users, label: "25,000+", sub: "Students Analysed" },
                  ].map(item => (
                    <div key={item.label} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border/50 hover:shadow-md transition-shadow">
                      <item.icon className="w-8 h-8 text-primary" />
                      <span className="font-bold text-sm">{item.label}</span>
                      <span className="text-xs text-muted-foreground">{item.sub}</span>
                    </div>
                  ))}
                </motion.div>
              </div>
            </section>

            {/* How It Works */}
            <HowItWorksSection />

            {/* What You Get */}
            <section className="py-16 px-4 bg-muted/30">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-3xl font-bold text-center mb-4">What Your Report Includes</h2>
                <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
                  A comprehensive, data-driven analysis tailored to your unique profile.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { icon: BarChart3, title: "College Comparison Table", desc: "15-25 colleges with fees, packages, required percentile, difficulty rating, and your admission probability." },
                    { icon: Target, title: "Admission Probability", desc: "AI-calculated chances for each college categorised as Dream, Target, and Safe with specific cutoff data." },
                    { icon: TrendingUp, title: "Profile Score & SWOT", desc: "Numeric scores for academics, work experience, and diversity. Detailed strengths and weaknesses analysis." },
                    { icon: Lightbulb, title: "AI Recommendations", desc: "6-8 actionable steps prioritised by impact with specific timelines to improve your profile." },
                    { icon: Calendar, title: "Study Plan", desc: "Phase-wise preparation schedule with daily hour targets, focus areas, and milestone scores." },
                    { icon: Save, title: "Save & Track", desc: "Save your report to your dashboard. Track progress over time and re-analyse as your profile improves." },
                  ].map((item, i) => (
                    <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                      <Card className="h-full hover:shadow-lg transition-shadow border-border/50">
                        <CardContent className="pt-6">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                            <item.icon className="w-6 h-6 text-primary" />
                          </div>
                          <h3 className="font-bold mb-2">{item.title}</h3>
                          <p className="text-sm text-muted-foreground">{item.desc}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            {/* Final CTA */}
            <section className="py-16 px-4">
              <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-3xl font-bold mb-4">Ready to Know Your MBA Chances?</h2>
                <p className="text-muted-foreground mb-8">Takes less than 2 minutes. No payment required.</p>
                <Button size="lg" onClick={() => setStep(1)} className="text-lg px-10 py-6 rounded-2xl">
                  Start Free Analysis <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </section>
          </motion.div>
        )}

        {/* ────── FORM STEPS 1-4 ────── */}
        {step >= 1 && step <= 4 && (
          <motion.div key={`step-${step}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="max-w-2xl mx-auto px-4 py-12">
            {/* Progress */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-muted-foreground">Step {step} of 4</span>
                <span className="text-sm text-muted-foreground">{Math.round((step / 4) * 100)}%</span>
              </div>
              <Progress value={(step / 4) * 100} className="h-2" />
              <div className="flex justify-between mt-2">
                {[
                  { icon: User, label: "Basic Info" },
                  { icon: GraduationCap, label: "Academics" },
                  { icon: Briefcase, label: "Profile" },
                  { icon: Target, label: "Aspirations" },
                ].map((s, i) => (
                  <div key={s.label} className={`flex items-center gap-1.5 text-xs ${i + 1 <= step ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                    <s.icon className="w-3.5 h-3.5" /> {s.label}
                  </div>
                ))}
              </div>
            </div>

            <Card className="border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  {step === 1 && <><User className="w-5 h-5 text-primary" /> Basic Information</>}
                  {step === 2 && <><GraduationCap className="w-5 h-5 text-primary" /> Academic Details</>}
                  {step === 3 && <><Briefcase className="w-5 h-5 text-primary" /> Profile Details</>}
                  {step === 4 && <><Target className="w-5 h-5 text-primary" /> Your Aspirations</>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {step === 1 && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Full Name <span className="text-destructive">*</span></Label>
                      <Input placeholder="Enter your full name" value={form.name} onChange={e => updateField("name", e.target.value)} className={errors.name ? "border-destructive" : ""} />
                      {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email Address <span className="text-destructive">*</span></Label>
                      <Input type="email" placeholder="your@email.com" value={form.email} onChange={e => updateField("email", e.target.value)} className={errors.email ? "border-destructive" : ""} />
                      {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    {([
                      { key: "tenth_score" as const, label: "10th Percentage", placeholder: "e.g., 92", icon: Award },
                      { key: "twelfth_score" as const, label: "12th Percentage", placeholder: "e.g., 88", icon: Award },
                    ] as const).map(f => (
                      <div key={f.key} className="space-y-1.5">
                        <Label className="flex items-center gap-1.5"><f.icon className="w-3.5 h-3.5" /> {f.label} <span className="text-destructive">*</span></Label>
                        <Input type="number" min="1" max="100" placeholder={f.placeholder} value={form[f.key]}
                          onChange={e => updateField(f.key, e.target.value)} className={errors[f.key] ? "border-destructive" : ""} />
                        {errors[f.key] && <p className="text-xs text-destructive">{errors[f.key]}</p>}
                      </div>
                    ))}
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> Graduation Percentage <span className="text-destructive">*</span></Label>
                      <Input type="number" min="1" max="100"
                        placeholder={form.is_pursuing_graduation ? "Percentage till last semester" : "e.g., 75"}
                        value={form.graduation_score}
                        onChange={e => updateField("graduation_score", e.target.value)}
                        className={errors.graduation_score ? "border-destructive" : ""} />
                      <label className="flex items-center gap-2 text-sm cursor-pointer mt-1">
                        <Checkbox checked={form.is_pursuing_graduation} onCheckedChange={v => updateField("is_pursuing_graduation", !!v)} />
                        Currently pursuing graduation (enter % till last semester)
                      </label>
                      {errors.graduation_score && <p className="text-xs text-destructive">{errors.graduation_score}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5" /> Graduation Stream <span className="text-destructive">*</span></Label>
                      <Select value={form.graduation_stream} onValueChange={v => updateField("graduation_stream", v)}>
                        <SelectTrigger className={errors.graduation_stream ? "border-destructive" : ""}><SelectValue placeholder="Select stream" /></SelectTrigger>
                        <SelectContent>{STREAM_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                      {errors.graduation_stream && <p className="text-xs text-destructive">{errors.graduation_stream}</p>}
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Work Experience <span className="text-destructive">*</span></Label>
                      <Select value={form.work_experience_months} onValueChange={v => updateField("work_experience_months", v)}>
                        <SelectTrigger className={errors.work_experience_months ? "border-destructive" : ""}><SelectValue placeholder="Select experience" /></SelectTrigger>
                        <SelectContent>{WORK_EXP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                      {errors.work_experience_months && <p className="text-xs text-destructive">{errors.work_experience_months}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Category <span className="text-destructive">*</span></Label>
                      <Select value={form.category} onValueChange={v => updateField("category", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Gender (optional)</Label>
                      <Select value={form.gender} onValueChange={v => updateField("gender", v)}>
                        <SelectTrigger><SelectValue placeholder="Prefer not to say" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5" /> Target Exams <span className="text-destructive">*</span></Label>
                      <div className="flex items-center gap-2 mb-2">
                        <Button type="button" variant="outline" size="sm" onClick={toggleAllExams}>
                          {form.target_exams.length === EXAM_OPTIONS.length ? "Deselect All" : "Select All"}
                        </Button>
                        <span className="text-xs text-muted-foreground">{form.target_exams.length} selected</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {EXAM_OPTIONS.map(exam => (
                          <label key={exam} className={`flex items-center gap-2 text-sm cursor-pointer rounded-lg border p-2.5 transition-colors ${form.target_exams.includes(exam) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                            <Checkbox checked={form.target_exams.includes(exam)} onCheckedChange={() => toggleArrayItem("target_exams", exam)} />
                            {exam}
                          </label>
                        ))}
                      </div>
                      {errors.target_exams && <p className="text-xs text-destructive">{errors.target_exams}</p>}
                    </div>
                  </>
                )}

                {step === 4 && (
                  <>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Preferred States for MBA</Label>
                      <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-3 grid grid-cols-2 gap-2">
                        {INDIAN_STATES.map(state => (
                          <label key={state} className={`flex items-center gap-2 text-sm cursor-pointer rounded p-1.5 ${form.target_states.includes(state) ? "bg-primary/5" : "hover:bg-muted/50"}`}>
                            <Checkbox checked={form.target_states.includes(state)} onCheckedChange={() => toggleArrayItem("target_states", state)} />
                            {state}
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">{form.target_states.length ? form.target_states.join(", ") : "No preference (Pan India)"}</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><GraduationCap className="w-3.5 h-3.5" /> Target Colleges (optional)</Label>
                      <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {COLLEGE_OPTIONS.map(c => (
                          <label key={c} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded p-1">
                            <Checkbox checked={form.target_colleges.includes(c)} onCheckedChange={() => toggleArrayItem("target_colleges", c)} />
                            {c}
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">{form.target_colleges.length} selected</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" /> Preferred Specialisation</Label>
                      <Select value={form.preferred_specialization} onValueChange={v => updateField("preferred_specialization", v)}>
                        <SelectTrigger><SelectValue placeholder="Select specialisation (optional)" /></SelectTrigger>
                        <SelectContent>{SPECIALIZATIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Navigation */}
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(step - 1)} disabled={step === 1}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  {step < 4 ? (
                    <Button onClick={handleNext}>Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
                  ) : (
                    <Button onClick={handleSubmit} className="bg-gradient-to-r from-primary to-primary/80">
                      <Sparkles className="w-4 h-4 mr-2" /> Analyse My Profile
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* ────── LOADING ────── */}
        {step === 5 && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="max-w-md mx-auto text-center space-y-8">
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="w-20 h-20 mx-auto rounded-full border-4 border-primary/20 border-t-primary" />
              <h2 className="text-2xl font-bold">Analysing Your Profile</h2>
              <p className="text-muted-foreground">Cross-referencing 10,000+ data points with AI to generate personalised insights...</p>
              <Progress value={loadingProgress} className="h-3" />
              <div className="space-y-2 text-sm text-muted-foreground">
                {loadingProgress > 10 && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Academic profile evaluated</motion.p>}
                {loadingProgress > 30 && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Work experience scored</motion.p>}
                {loadingProgress > 50 && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Matching against 50+ colleges</motion.p>}
                {loadingProgress > 70 && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Generating difficulty ratings</motion.p>}
                {loadingProgress > 85 && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Building your personalised roadmap</motion.p>}
              </div>
            </div>
          </motion.div>
        )}

        {/* ────── PARTIAL RESULT ────── */}
        {step === 6 && result && (
          <motion.div key="partial" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="max-w-4xl mx-auto px-4 py-10 space-y-8">
            <div className="text-center space-y-4">
              <Badge variant="secondary" className="text-sm"><Sparkles className="w-3.5 h-3.5 mr-1" /> AI Analysis Complete</Badge>
              <h2 className="text-3xl font-bold">Your Profile Analysis</h2>
              <div className="inline-flex items-center gap-6 bg-card border border-border rounded-2xl p-6 shadow-lg">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Profile Score</p>
                  <p className={`text-5xl font-bold ${scoreColor(result.profile_score)}`}>{result.profile_score}</p>
                  <p className="text-sm text-muted-foreground">/10</p>
                </div>
                {result.score_breakdown && (
                  <div className="border-l border-border pl-6 space-y-1.5 text-left">
                    <div className="flex items-center gap-2 text-sm"><Award className="w-4 h-4 text-primary" /> Academics: <strong>{result.score_breakdown.academics_score}/10</strong></div>
                    <div className="flex items-center gap-2 text-sm"><Briefcase className="w-4 h-4 text-primary" /> Experience: <strong>{result.score_breakdown.work_experience_score}/10</strong></div>
                    <div className="flex items-center gap-2 text-sm"><Layers className="w-4 h-4 text-primary" /> Diversity: <strong>{result.score_breakdown.diversity_score}/10</strong></div>
                    <Badge variant="outline" className="mt-1">{result.score_breakdown.overall_competitiveness}</Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Strengths */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-green-600"><CheckCircle2 className="w-5 h-5" /> Your Strengths</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {result.strengths?.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                    <Badge variant="outline" className="text-green-600 border-green-300 shrink-0">{s.impact}</Badge>
                    <div><p className="font-semibold text-sm">{s.title}</p><p className="text-sm text-muted-foreground">{s.description}</p></div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Weaknesses */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-amber-600"><AlertTriangle className="w-5 h-5" /> Areas to Improve</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {result.weaknesses?.map((w, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                    <Badge variant="outline" className="text-amber-600 border-amber-300 shrink-0">{w.severity}</Badge>
                    <div><p className="font-semibold text-sm">{w.title}</p><p className="text-sm text-muted-foreground">{w.description}</p>
                      <p className="text-sm text-primary mt-1 flex items-center gap-1"><Lightbulb className="w-3.5 h-3.5" /> {w.fix}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* LOCKED */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background z-10 flex flex-col items-center justify-center gap-4 pt-20">
                <Lock className="w-12 h-12 text-muted-foreground" />
                <h3 className="text-2xl font-bold">Unlock Your Full Report</h3>
                <p className="text-muted-foreground text-center max-w-md">Get the detailed college comparison table, admission probabilities, AI roadmap, and personalised study plan.</p>
                <Button size="lg" onClick={() => setShowLeadModal(true)} className="rounded-2xl px-8">
                  <Lock className="w-4 h-4 mr-2" /> Unlock Full Report
                </Button>
              </div>
              <div className="blur-sm pointer-events-none space-y-6">
                <Card><CardHeader><CardTitle>College Comparison Table</CardTitle></CardHeader><CardContent><div className="h-64 bg-muted rounded-lg" /></CardContent></Card>
                <Card><CardHeader><CardTitle>AI Recommendations</CardTitle></CardHeader><CardContent><div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-16 bg-muted rounded-lg" />)}</div></CardContent></Card>
              </div>
            </div>
          </motion.div>
        )}

        {/* ────── FULL DASHBOARD ────── */}
        {step === 7 && result && unlocked && (
          <motion.div key="full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} ref={reportRef}
            className="max-w-7xl mx-auto px-4 py-10 space-y-8">
            {/* Header */}
            <div className="text-center space-y-3">
              <Badge className="text-sm"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Full Report Unlocked</Badge>
              <h2 className="text-3xl font-bold">Your MBA Roadmap</h2>
              <p className="text-muted-foreground max-w-3xl mx-auto">{result.ai_summary}</p>
              <div className="flex flex-wrap justify-center gap-4 mt-4">
                <div className="inline-flex items-center gap-2 bg-card border rounded-xl p-4">
                  <span className="text-sm text-muted-foreground">Profile Score:</span>
                  <span className={`text-3xl font-bold ${scoreColor(result.profile_score)}`}>{result.profile_score}/10</span>
                </div>
                {result.score_breakdown && (
                  <>
                    {[
                      { label: "Academics", val: result.score_breakdown.academics_score },
                      { label: "Experience", val: result.score_breakdown.work_experience_score },
                      { label: "Diversity", val: result.score_breakdown.diversity_score },
                    ].map(s => (
                      <div key={s.label} className="inline-flex items-center gap-2 bg-card border rounded-xl p-4">
                        <span className="text-sm text-muted-foreground">{s.label}:</span>
                        <span className={`text-2xl font-bold ${scoreColor(s.val)}`}>{s.val}/10</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <Button variant="outline" onClick={handleSaveReport} disabled={savingReport} className="rounded-xl">
                  <Save className="w-4 h-4 mr-2" /> {savingReport ? "Saving..." : "Save to Dashboard"}
                </Button>
              </div>
            </div>

            {/* ─── DETAILED COLLEGE TABLE ─── */}
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-primary" /> Detailed College Comparison Table
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {result.detailed_college_table?.length || 0} colleges analysed with your specific admission data
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={collegeFilter} onValueChange={setCollegeFilter}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Tiers</SelectItem>
                        <SelectItem value="Dream">Dream</SelectItem>
                        <SelectItem value="Target">Target</SelectItem>
                        <SelectItem value="Safe">Safe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-6 px-6">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead className="min-w-[180px]">College</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort("avg_fees_lakhs")}>
                          Fees (L) {collegeSortKey === "avg_fees_lakhs" && (collegeSortAsc ? "↑" : "↓")}
                        </TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort("avg_package_lakhs")}>
                          Avg Pkg (LPA) {collegeSortKey === "avg_package_lakhs" && (collegeSortAsc ? "↑" : "↓")}
                        </TableHead>
                        <TableHead>Highest Pkg</TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort("required_cat_percentile")}>
                          Required %ile {collegeSortKey === "required_cat_percentile" && (collegeSortAsc ? "↑" : "↓")}
                        </TableHead>
                        <TableHead>Your Target %ile</TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort("your_admission_probability")}>
                          Your Chance {collegeSortKey === "your_admission_probability" && (collegeSortAsc ? "↑" : "↓")}
                        </TableHead>
                        <TableHead>Difficulty</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead className="min-w-[200px]">Selection Criteria</TableHead>
                        <TableHead className="min-w-[200px]">Recommendation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedColleges.map((c, i) => (
                        <TableRow key={i} className="text-xs">
                          <TableCell className="font-semibold">{c.college_name}{c.nirf_ranking ? <span className="text-muted-foreground ml-1">(#{c.nirf_ranking})</span> : ""}</TableCell>
                          <TableCell>{c.city}, {c.state}</TableCell>
                          <TableCell>{c.avg_fees_lakhs}L</TableCell>
                          <TableCell className="font-semibold">{c.avg_package_lakhs} LPA</TableCell>
                          <TableCell>{c.highest_package_lakhs ? `${c.highest_package_lakhs} LPA` : "—"}</TableCell>
                          <TableCell>{c.required_cat_percentile}%ile</TableCell>
                          <TableCell className="font-semibold text-primary">{c.student_cat_target}%ile</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <div className={`w-8 h-2 rounded-full ${probColor(c.your_admission_probability)}`} style={{ width: `${Math.max(c.your_admission_probability * 0.8, 8)}px` }} />
                              <span className="font-bold">{c.your_admission_probability}%</span>
                            </div>
                          </TableCell>
                          <TableCell><Badge className={`text-xs ${diffColor(c.difficulty)}`}>{c.difficulty}</Badge></TableCell>
                          <TableCell><Badge variant={c.tier === "Dream" ? "default" : c.tier === "Target" ? "secondary" : "outline"} className="text-xs">{c.tier}</Badge></TableCell>
                          <TableCell className="text-muted-foreground">{c.key_selection_criteria}</TableCell>
                          <TableCell className="text-muted-foreground">{c.recommendation}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {sortedColleges.length === 0 && <p className="text-center text-muted-foreground py-8">No colleges match the selected filter.</p>}
              </CardContent>
            </Card>

            {/* College Predictions Cards */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Target className="w-5 h-5 text-primary" /> College Shortlist</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {([
                    { key: "dream" as const, label: "Dream", color: "border-purple-300 bg-purple-50 dark:bg-purple-950/20", icon: Star },
                    { key: "target" as const, label: "Target", color: "border-blue-300 bg-blue-50 dark:bg-blue-950/20", icon: Target },
                    { key: "safe" as const, label: "Safe", color: "border-green-300 bg-green-50 dark:bg-green-950/20", icon: Shield },
                  ]).map(tier => (
                    <div key={tier.key} className={`rounded-xl border p-4 ${tier.color}`}>
                      <h4 className="font-bold text-lg mb-3 flex items-center gap-2"><tier.icon className="w-5 h-5" /> {tier.label}</h4>
                      <div className="space-y-3">
                        {result.college_predictions?.[tier.key]?.map((c, i) => (
                          <div key={i} className="bg-card rounded-lg p-3 border border-border/50">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-semibold text-sm">{c.name}</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${probColor(c.probability)}`}>{c.probability}%</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{c.cutoff_info}</p>
                            {c.tip && <p className="text-xs text-primary mt-1 flex items-center gap-1"><Lightbulb className="w-3 h-3" /> {c.tip}</p>}
                            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${probColor(c.probability)}`} style={{ width: `${c.probability}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-green-600"><CheckCircle2 className="w-5 h-5" /> Strengths</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {result.strengths?.map((s, i) => (
                    <div key={i} className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-1"><Badge className="bg-green-500 text-white text-xs">{s.impact}</Badge><span className="font-semibold text-sm">{s.title}</span></div>
                      <p className="text-sm text-muted-foreground">{s.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-amber-600"><AlertTriangle className="w-5 h-5" /> Weaknesses & Fixes</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {result.weaknesses?.map((w, i) => (
                    <div key={i} className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-1"><Badge className="bg-amber-500 text-white text-xs">{w.severity}</Badge><span className="font-semibold text-sm">{w.title}</span></div>
                      <p className="text-sm text-muted-foreground">{w.description}</p>
                      <p className="text-sm text-primary mt-1 font-medium flex items-center gap-1"><ArrowRight className="w-3 h-3" /> {w.fix}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* AI Recommendations */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Lightbulb className="w-5 h-5 text-primary" /> AI Recommendations</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.recommendations?.map((r, i) => (
                    <div key={i} className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={r.priority === "critical" ? "destructive" : r.priority === "high" ? "default" : "secondary"} className="text-xs">{r.priority}</Badge>
                        {r.timeline && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {r.timeline}</span>}
                      </div>
                      <h4 className="font-semibold text-sm mb-1">{r.title}</h4>
                      <p className="text-sm text-muted-foreground">{r.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Study Plan */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /> Personalised Study Plan</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.study_plan?.map((phase, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">{i + 1}</div>
                        {i < (result.study_plan?.length || 0) - 1 && <div className="w-0.5 h-full bg-border mt-1" />}
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold">{phase.phase}</h4>
                          <Badge variant="outline">{phase.duration}</Badge>
                          {phase.daily_hours && <span className="text-xs text-muted-foreground">{phase.daily_hours} hrs/day</span>}
                        </div>
                        {phase.target_score && <p className="text-sm text-primary mb-2">Target: {phase.target_score}</p>}
                        <div className="flex flex-wrap gap-2">{phase.focus_areas?.map((area, j) => <Badge key={j} variant="secondary" className="text-xs">{area}</Badge>)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* CTA */}
            <Card className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0">
              <CardContent className="text-center py-10 space-y-4">
                <h3 className="text-2xl font-bold">Ready to Start Your MBA Journey?</h3>
                <p className="opacity-90">Get expert guidance from top MBA mentors and accelerate your preparation.</p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Button size="lg" variant="secondary" className="rounded-2xl"><Phone className="w-4 h-4 mr-2" /> Book Free Mentorship Call</Button>
                  <Button size="lg" variant="outline" className="rounded-2xl bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"><BookOpen className="w-4 h-4 mr-2" /> Join Preparation Programme</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* LEAD CAPTURE MODAL */}
      <Dialog open={showLeadModal} onOpenChange={setShowLeadModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Lock className="w-5 h-5 text-primary" /> Unlock Your Full Report</DialogTitle>
            <DialogDescription>Enter your mobile number to access the detailed college table, admission probabilities, and personalised roadmap.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> Mobile Number <span className="text-destructive">*</span></Label>
              <Input type="tel" placeholder="Enter 10-digit mobile number" maxLength={10} value={leadPhone} onChange={e => setLeadPhone(e.target.value.replace(/\D/g, ""))} />
            </div>
            <Button onClick={handleUnlock} disabled={loading} className="w-full rounded-xl">
              {loading ? "Unlocking..." : "Unlock Full Report"}
            </Button>
            <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Your data is 100% secure. We never share your information.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileAnalyzerPage;
