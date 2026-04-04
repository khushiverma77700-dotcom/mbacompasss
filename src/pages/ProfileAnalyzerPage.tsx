import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, GraduationCap, Briefcase, Target, ChevronRight, ChevronLeft, Lock, Phone, Mail, TrendingUp, Shield, Zap, BookOpen, Calendar, Star, AlertTriangle, CheckCircle2, ArrowRight, Sparkles, BarChart3, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";

const STORAGE_KEY = "profile_analyzer_draft";

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
  recommendations: Array<{ title: string; description: string; priority: string; timeline?: string }>;
  study_plan: Array<{ phase: string; duration: string; focus_areas: string[]; target_score?: string; daily_hours?: number }>;
  ai_summary: string;
}

interface FormData {
  tenth_score: string;
  twelfth_score: string;
  graduation_score: string;
  graduation_stream: string;
  work_experience_months: string;
  category: string;
  gender: string;
  target_exam: string;
  target_colleges: string[];
  preferred_specialization: string;
}

const initialForm: FormData = {
  tenth_score: "",
  twelfth_score: "",
  graduation_score: "",
  graduation_stream: "",
  work_experience_months: "",
  category: "General",
  gender: "",
  target_exam: "",
  target_colleges: [],
  preferred_specialization: "",
};

const ProfileAnalyzerPage = () => {
  const [step, setStep] = useState(0); // 0=landing, 1-3=form steps, 4=loading, 5=partial, 6=full
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
  const [leadEmail, setLeadEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Auto-save
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  const updateField = (key: keyof FormData, value: string | string[]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const toggleCollege = (college: string) => {
    setForm(prev => ({
      ...prev,
      target_colleges: prev.target_colleges.includes(college)
        ? prev.target_colleges.filter(c => c !== college)
        : [...prev.target_colleges, college],
    }));
  };

  const validateStep = (s: number): boolean => {
    const errs: Record<string, string> = {};
    if (s === 1) {
      if (!form.tenth_score || +form.tenth_score < 1 || +form.tenth_score > 100) errs.tenth_score = "Enter valid percentage (1-100)";
      if (!form.twelfth_score || +form.twelfth_score < 1 || +form.twelfth_score > 100) errs.twelfth_score = "Enter valid percentage (1-100)";
      if (!form.graduation_score || +form.graduation_score < 1 || +form.graduation_score > 100) errs.graduation_score = "Enter valid percentage (1-100)";
      if (!form.graduation_stream) errs.graduation_stream = "Select your stream";
    } else if (s === 2) {
      if (!form.work_experience_months && form.work_experience_months !== "0") errs.work_experience_months = "Enter work experience";
      if (!form.target_exam) errs.target_exam = "Select target exam";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) setStep(step + 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;
    setStep(4);
    setLoadingProgress(0);

    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) { clearInterval(interval); return 90; }
        return prev + Math.random() * 12;
      });
    }, 400);

    try {
      const { data, error } = await supabase.functions.invoke("profile-analyzer", {
        body: {
          tenth_score: +form.tenth_score,
          twelfth_score: +form.twelfth_score,
          graduation_score: +form.graduation_score,
          graduation_stream: form.graduation_stream,
          work_experience_months: +form.work_experience_months || 0,
          category: form.category,
          gender: form.gender || undefined,
          target_exam: form.target_exam,
          target_colleges: form.target_colleges,
          preferred_specialization: form.preferred_specialization || undefined,
        },
      });

      clearInterval(interval);
      setLoadingProgress(100);

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data);
      localStorage.removeItem(STORAGE_KEY);
      setTimeout(() => setStep(5), 600);
    } catch (e: any) {
      clearInterval(interval);
      console.error(e);
      toast({ title: "Analysis Failed", description: e.message || "Please try again.", variant: "destructive" });
      setStep(3);
    }
  };

  const handleUnlock = async () => {
    if (!leadPhone || leadPhone.length < 10) {
      toast({ title: "Phone Required", description: "Please enter a valid 10-digit mobile number.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (result?.profile_id) {
        await supabase.from("profile_analyses").update({
          phone: leadPhone,
          email: leadEmail || null,
          report_unlocked: true,
        }).eq("id", result.profile_id);
      }
      setUnlocked(true);
      setShowLeadModal(false);
      setStep(6);
      toast({ title: "Report Unlocked! 🎉", description: "Your personalized MBA roadmap is ready." });
    } catch {
      toast({ title: "Error", description: "Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-red-600";
  };

  const probColor = (p: number) => {
    if (p >= 60) return "bg-green-500";
    if (p >= 30) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <SEOHead
        title="MBA Profile Analyzer - Check Your IIM Chances | Free Tool"
        description="Get personalized MBA college predictions, admission probability, and AI-powered preparation roadmap. Analyze your profile for IIM, XLRI, FMS and more."
        keywords={["MBA profile analyzer", "IIM chances calculator", "CAT score predictor", "MBA admission probability", "IIM admission chances"]}
      />

      <AnimatePresence mode="wait">
        {/* LANDING */}
        {step === 0 && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="min-h-[80vh] flex items-center justify-center px-4"
          >
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-2xl"
              >
                <Brain className="w-12 h-12 text-primary-foreground" />
              </motion.div>

              <motion.h1
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-4xl md:text-6xl font-bold tracking-tight"
              >
                Check Your Chances for{" "}
                <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  IIMs in 60 Seconds
                </span>
              </motion.h1>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xl text-muted-foreground max-w-2xl mx-auto"
              >
                Get a personalized college shortlist, admission probability scores, and an AI-powered preparation roadmap — completely free.
              </motion.p>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground"
              >
                {["10,000+ Data Points", "AI-Powered Analysis", "Personalized Roadmap", "Free & Instant"].map((t) => (
                  <div key={t} className="flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    {t}
                  </div>
                ))}
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <Button
                  size="lg"
                  onClick={() => setStep(1)}
                  className="text-lg px-10 py-6 rounded-2xl shadow-xl hover:shadow-2xl transition-all group"
                >
                  Start Free Analysis
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8"
              >
                {[
                  { icon: GraduationCap, label: "50+ Colleges", sub: "Covered" },
                  { icon: Brain, label: "AI Analysis", sub: "Personalized" },
                  { icon: TrendingUp, label: "Accuracy", sub: "85%+" },
                  { icon: Shield, label: "Data", sub: "100% Secure" },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border/50">
                    <item.icon className="w-8 h-8 text-primary" />
                    <span className="font-bold text-sm">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.sub}</span>
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* FORM STEPS 1-3 */}
        {step >= 1 && step <= 3 && (
          <motion.div
            key={`step-${step}`}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="max-w-2xl mx-auto px-4 py-12"
          >
            {/* Progress */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-muted-foreground">Step {step} of 3</span>
                <span className="text-sm text-muted-foreground">{Math.round((step / 3) * 100)}%</span>
              </div>
              <Progress value={(step / 3) * 100} className="h-2" />
              <div className="flex justify-between mt-2">
                {[
                  { icon: GraduationCap, label: "Academics" },
                  { icon: Briefcase, label: "Profile" },
                  { icon: Target, label: "Aspirations" },
                ].map((s, i) => (
                  <div key={s.label} className={`flex items-center gap-1.5 text-xs ${i + 1 <= step ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                    <s.icon className="w-3.5 h-3.5" />
                    {s.label}
                  </div>
                ))}
              </div>
            </div>

            <Card className="border-border/50 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">
                  {step === 1 && "📚 Academic Details"}
                  {step === 2 && "👤 Profile Details"}
                  {step === 3 && "🎯 Your Aspirations"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {step === 1 && (
                  <>
                    {[
                      { key: "tenth_score" as const, label: "10th Percentage", placeholder: "e.g., 92" },
                      { key: "twelfth_score" as const, label: "12th Percentage", placeholder: "e.g., 88" },
                      { key: "graduation_score" as const, label: "Graduation Percentage / CGPA (%)", placeholder: "e.g., 75" },
                    ].map((f) => (
                      <div key={f.key} className="space-y-1.5">
                        <Label>{f.label} <span className="text-destructive">*</span></Label>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          placeholder={f.placeholder}
                          value={form[f.key]}
                          onChange={(e) => updateField(f.key, e.target.value)}
                          className={errors[f.key] ? "border-destructive" : ""}
                        />
                        {errors[f.key] && <p className="text-xs text-destructive">{errors[f.key]}</p>}
                      </div>
                    ))}
                    <div className="space-y-1.5">
                      <Label>Graduation Stream <span className="text-destructive">*</span></Label>
                      <Select value={form.graduation_stream} onValueChange={(v) => updateField("graduation_stream", v)}>
                        <SelectTrigger className={errors.graduation_stream ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select stream" />
                        </SelectTrigger>
                        <SelectContent>
                          {STREAM_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {errors.graduation_stream && <p className="text-xs text-destructive">{errors.graduation_stream}</p>}
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div className="space-y-1.5">
                      <Label>Work Experience (months) <span className="text-destructive">*</span></Label>
                      <Input
                        type="number"
                        min="0"
                        max="360"
                        placeholder="e.g., 24"
                        value={form.work_experience_months}
                        onChange={(e) => updateField("work_experience_months", e.target.value)}
                        className={errors.work_experience_months ? "border-destructive" : ""}
                      />
                      {errors.work_experience_months && <p className="text-xs text-destructive">{errors.work_experience_months}</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label>Category <span className="text-destructive">*</span></Label>
                      <Select value={form.category} onValueChange={(v) => updateField("category", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Gender (optional)</Label>
                      <Select value={form.gender} onValueChange={(v) => updateField("gender", v)}>
                        <SelectTrigger><SelectValue placeholder="Prefer not to say" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Target Exam <span className="text-destructive">*</span></Label>
                      <Select value={form.target_exam} onValueChange={(v) => updateField("target_exam", v)}>
                        <SelectTrigger className={errors.target_exam ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select exam" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXAM_OPTIONS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {errors.target_exam && <p className="text-xs text-destructive">{errors.target_exam}</p>}
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div className="space-y-2">
                      <Label>Target Colleges (select all that interest you)</Label>
                      <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {COLLEGE_OPTIONS.map((c) => (
                          <label key={c} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded p-1">
                            <Checkbox
                              checked={form.target_colleges.includes(c)}
                              onCheckedChange={() => toggleCollege(c)}
                            />
                            {c}
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">{form.target_colleges.length} selected</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Preferred Specialization</Label>
                      <Select value={form.preferred_specialization} onValueChange={(v) => updateField("preferred_specialization", v)}>
                        <SelectTrigger><SelectValue placeholder="Select specialization (optional)" /></SelectTrigger>
                        <SelectContent>
                          {SPECIALIZATIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {/* Navigation */}
                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    disabled={step === 1}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  {step < 3 ? (
                    <Button onClick={handleNext}>
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button onClick={handleSubmit} className="bg-gradient-to-r from-primary to-primary/80">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analyze My Profile
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* LOADING */}
        {step === 4 && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-[80vh] flex items-center justify-center px-4"
          >
            <div className="max-w-md mx-auto text-center space-y-8">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                className="w-20 h-20 mx-auto rounded-full border-4 border-primary/20 border-t-primary"
              />
              <h2 className="text-2xl font-bold">Analyzing Your Profile</h2>
              <p className="text-muted-foreground">Using 10,000+ data points and AI to generate personalized insights…</p>
              <Progress value={loadingProgress} className="h-3" />
              <div className="space-y-2 text-sm text-muted-foreground">
                {loadingProgress > 10 && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}>✓ Academic profile evaluated</motion.p>}
                {loadingProgress > 30 && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}>✓ Work experience scored</motion.p>}
                {loadingProgress > 50 && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}>✓ College matching in progress</motion.p>}
                {loadingProgress > 70 && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}>✓ Generating AI recommendations</motion.p>}
                {loadingProgress > 85 && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}>✓ Building your roadmap</motion.p>}
              </div>
            </div>
          </motion.div>
        )}

        {/* PARTIAL RESULT */}
        {step === 5 && result && (
          <motion.div
            key="partial"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-4xl mx-auto px-4 py-10 space-y-8"
          >
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-bold">Your Profile Analysis</h2>
              <div className="inline-flex items-center gap-4 bg-card border border-border rounded-2xl p-6 shadow-lg">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Profile Score</p>
                  <p className={`text-5xl font-bold ${scoreColor(result.profile_score)}`}>
                    {result.profile_score}
                  </p>
                  <p className="text-sm text-muted-foreground">/10</p>
                </div>
              </div>
            </div>

            {/* Strengths - Visible */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" /> Your Strengths
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.strengths?.map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                    <Badge variant="outline" className="text-green-600 border-green-300 shrink-0">{s.impact}</Badge>
                    <div>
                      <p className="font-semibold text-sm">{s.title}</p>
                      <p className="text-sm text-muted-foreground">{s.description}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Weaknesses - Visible */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="w-5 h-5" /> Areas to Improve
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.weaknesses?.map((w, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                    <Badge variant="outline" className="text-amber-600 border-amber-300 shrink-0">{w.severity}</Badge>
                    <div>
                      <p className="font-semibold text-sm">{w.title}</p>
                      <p className="text-sm text-muted-foreground">{w.description}</p>
                      <p className="text-sm text-primary mt-1">💡 {w.fix}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* LOCKED SECTIONS */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background z-10 flex flex-col items-center justify-center gap-4 pt-20">
                <Lock className="w-12 h-12 text-muted-foreground" />
                <h3 className="text-2xl font-bold">Unlock Your Full Report</h3>
                <p className="text-muted-foreground text-center max-w-md">Get detailed college predictions, admission probabilities, AI roadmap, and personalized study plan.</p>
                <Button size="lg" onClick={() => setShowLeadModal(true)} className="rounded-2xl px-8">
                  <Lock className="w-4 h-4 mr-2" /> Unlock Full Report
                </Button>
              </div>

              <div className="blur-sm pointer-events-none space-y-6">
                <Card>
                  <CardHeader><CardTitle>🎯 College Predictions</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      {["Dream", "Target", "Safe"].map((t) => (
                        <div key={t} className="p-4 rounded-lg bg-muted/50">
                          <h4 className="font-bold mb-2">{t}</h4>
                          <div className="space-y-2">
                            <div className="h-4 bg-muted rounded w-full" />
                            <div className="h-4 bg-muted rounded w-3/4" />
                            <div className="h-4 bg-muted rounded w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle>📈 AI Recommendations</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-muted rounded-lg" />)}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        )}

        {/* FULL DASHBOARD */}
        {step === 6 && result && unlocked && (
          <motion.div
            key="full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-6xl mx-auto px-4 py-10 space-y-8"
          >
            {/* Header */}
            <div className="text-center space-y-3">
              <Badge className="text-sm">Full Report Unlocked 🎉</Badge>
              <h2 className="text-3xl font-bold">Your MBA Roadmap</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">{result.ai_summary}</p>
              <div className="inline-flex items-center gap-2 bg-card border rounded-xl p-4">
                <span className="text-sm text-muted-foreground">Profile Score:</span>
                <span className={`text-3xl font-bold ${scoreColor(result.profile_score)}`}>{result.profile_score}/10</span>
              </div>
            </div>

            {/* College Predictions */}
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" /> College Shortlist & Admission Probability
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { key: "dream" as const, label: "🌟 Dream", color: "border-purple-300 bg-purple-50 dark:bg-purple-950/20" },
                    { key: "target" as const, label: "🎯 Target", color: "border-blue-300 bg-blue-50 dark:bg-blue-950/20" },
                    { key: "safe" as const, label: "✅ Safe", color: "border-green-300 bg-green-50 dark:bg-green-950/20" },
                  ].map((tier) => (
                    <div key={tier.key} className={`rounded-xl border p-4 ${tier.color}`}>
                      <h4 className="font-bold text-lg mb-3">{tier.label}</h4>
                      <div className="space-y-3">
                        {result.college_predictions?.[tier.key]?.map((c, i) => (
                          <div key={i} className="bg-card rounded-lg p-3 border border-border/50">
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-semibold text-sm">{c.name}</span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${probColor(c.probability)}`}>
                                {c.probability}%
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{c.cutoff_info}</p>
                            {c.tip && <p className="text-xs text-primary mt-1">💡 {c.tip}</p>}
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

            {/* Strengths & Weaknesses side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="w-5 h-5" /> Strengths
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.strengths?.map((s, i) => (
                    <div key={i} className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-green-500 text-white text-xs">{s.impact}</Badge>
                        <span className="font-semibold text-sm">{s.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{s.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="w-5 h-5" /> Weaknesses & Fixes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.weaknesses?.map((w, i) => (
                    <div key={i} className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-amber-500 text-white text-xs">{w.severity}</Badge>
                        <span className="font-semibold text-sm">{w.title}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{w.description}</p>
                      <p className="text-sm text-primary mt-1 font-medium">→ {w.fix}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* AI Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" /> AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.recommendations?.map((r, i) => (
                    <div key={i} className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={r.priority === "critical" ? "destructive" : r.priority === "high" ? "default" : "secondary"} className="text-xs">
                          {r.priority}
                        </Badge>
                        {r.timeline && <span className="text-xs text-muted-foreground">⏱ {r.timeline}</span>}
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
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" /> Personalized Study Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {result.study_plan?.map((phase, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                          {i + 1}
                        </div>
                        {i < (result.study_plan?.length || 0) - 1 && <div className="w-0.5 h-full bg-border mt-1" />}
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-bold">{phase.phase}</h4>
                          <Badge variant="outline">{phase.duration}</Badge>
                          {phase.daily_hours && <span className="text-xs text-muted-foreground">{phase.daily_hours} hrs/day</span>}
                        </div>
                        {phase.target_score && <p className="text-sm text-primary mb-2">Target: {phase.target_score}</p>}
                        <div className="flex flex-wrap gap-2">
                          {phase.focus_areas?.map((area, j) => (
                            <Badge key={j} variant="secondary" className="text-xs">{area}</Badge>
                          ))}
                        </div>
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
                  <Button size="lg" variant="secondary" className="rounded-2xl">
                    📞 Book Free Mentorship Call
                  </Button>
                  <Button size="lg" variant="outline" className="rounded-2xl bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                    📚 Join Preparation Program
                  </Button>
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
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" /> Unlock Your Full Report
            </DialogTitle>
            <DialogDescription>
              Enter your mobile number to access detailed college predictions, admission probabilities, and your personalized AI roadmap.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" /> Mobile Number <span className="text-destructive">*</span>
              </Label>
              <Input
                type="tel"
                placeholder="Enter 10-digit mobile number"
                maxLength={10}
                value={leadPhone}
                onChange={(e) => setLeadPhone(e.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" /> Email (optional)
              </Label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={leadEmail}
                onChange={(e) => setLeadEmail(e.target.value)}
              />
            </div>
            <Button onClick={handleUnlock} disabled={loading} className="w-full rounded-xl">
              {loading ? "Unlocking..." : "Unlock Full Report →"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              🔒 Your data is 100% secure. We never share your information.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfileAnalyzerPage;
