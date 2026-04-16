import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator, IndianRupee, TrendingUp, Target, Briefcase, GraduationCap, Phone, Mail, User,
  ChevronRight, ChevronLeft, Lock, ShieldCheck, Sparkles, Award, Wallet, Trophy, AlertTriangle,
  CheckCircle2, ArrowRight, MapPin, BookOpen, Star, Clock, Rocket, Gauge, Building2, BarChart3,
  Download, Save, FileText, Lightbulb, Timer, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import SEOHead from "@/components/SEOHead";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  ComposedChart, Line, Legend,
} from "recharts";

const STREAM_OPTIONS = ["Engineering", "Commerce", "Science", "Arts", "Medical", "Law", "Other"];
const EXAM_OPTIONS = ["CAT", "XAT", "NMAT", "SNAP", "CMAT", "MAT", "GMAT", "IIFT", "TISSNET", "ATMA"];
const TIER_OPTIONS = ["Tier 1", "Tier 2", "Tier 3"];
const SPEC_OPTIONS = ["Finance", "Marketing", "Operations", "HR", "IT & Analytics", "Strategy", "General Management", "Entrepreneurship"];
const LOCATION_OPTIONS = ["India", "Abroad", "No Preference"];
const STATES = [
  "Pan India", "Andhra Pradesh", "Delhi", "Gujarat", "Haryana", "Karnataka", "Kerala",
  "Madhya Pradesh", "Maharashtra", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana",
  "Uttar Pradesh", "West Bengal",
];

interface FormState {
  name: string;
  email: string;
  phone: string;
  phoneVerified: boolean;
  graduation_stream: string;
  current_salary_lakhs: number;
  work_experience_years: number;
  target_exams: string[];
  expected_tier: string;
  preferred_specialization: string;
  budget_lakhs: number;
  preferred_location: string;
  target_states: string[];
}

const initialForm: FormState = {
  name: "", email: "", phone: "", phoneVerified: false,
  graduation_stream: "", current_salary_lakhs: 0, work_experience_years: 0,
  target_exams: [], expected_tier: "Tier 1", preferred_specialization: "",
  budget_lakhs: 20, preferred_location: "India", target_states: [],
};

const FUN_FACTS = [
  "Crunching college fees and average salaries…",
  "Calculating your post-MBA salary jump…",
  "Mapping payback periods for top B-schools…",
  "Comparing ROI across Tier 1, 2, and 3 colleges…",
  "Generating personalized recommendations…",
  "Building your detailed ROI report…",
];

const MBARoiCalculatorPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0); // 0=landing, 1-3=form, 4=loading, 5=report
  const [form, setForm] = useState<FormState>(initialForm);
  const [otpStep, setOtpStep] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [factIndex, setFactIndex] = useState(0);
  const [report, setReport] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);

  // Resend timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  // Loading animation
  useEffect(() => {
    if (step !== 4) return;
    const factTimer = setInterval(() => setFactIndex(i => (i + 1) % FUN_FACTS.length), 1500);
    const progressTimer = setInterval(() => {
      setLoadingProgress(p => Math.min(p + Math.random() * 7, 95));
    }, 400);
    return () => { clearInterval(factTimer); clearInterval(progressTimer); };
  }, [step]);

  // Auto-unlock report when authenticated
  useEffect(() => {
    if (user && report && !report.report_unlocked) {
      setReport((r: any) => ({ ...r, report_unlocked: true }));
      if (report.analysis_id) {
        supabase.from("roi_analyses").update({ report_unlocked: true, user_id: user.id }).eq("id", report.analysis_id);
      }
    }
  }, [user, report]);

  const handleSendOtp = async () => {
    if (!/^\d{10}$/.test(form.phone)) {
      toast({ title: "Invalid phone", description: "Enter a 10-digit phone number.", variant: "destructive" });
      return;
    }
    setOtpSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", { body: { phone: form.phone } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast({ title: "OTP sent", description: `6-digit OTP sent to ${form.phone}` });
      setOtpStep(true);
      setResendTimer(30);
    } catch (e: any) {
      toast({ title: "Failed to send OTP", description: e.message, variant: "destructive" });
    } finally { setOtpSending(false); }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) return;
    setOtpVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", { body: { phone: form.phone, otp: otpValue } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.verified) {
        setForm(f => ({ ...f, phoneVerified: true }));
        setOtpStep(false);
        toast({ title: "Phone verified ✓" });
      }
    } catch (e: any) {
      toast({ title: "Verification failed", description: e.message, variant: "destructive" });
    } finally { setOtpVerifying(false); }
  };

  const toggleArr = (arr: string[], v: string) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

  const canProceedStep = (s: number) => {
    if (s === 1) return form.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && form.phoneVerified;
    if (s === 2) return form.graduation_stream && form.target_exams.length > 0 && form.expected_tier;
    if (s === 3) return form.preferred_specialization && form.budget_lakhs > 0;
    return true;
  };

  const submitReport = async () => {
    setStep(4);
    setLoadingProgress(0);
    try {
      const { data, error } = await supabase.functions.invoke("roi-calculator", {
        body: {
          user_id: user?.id,
          name: form.name, email: form.email, phone: form.phone,
          graduation_stream: form.graduation_stream,
          current_salary_lakhs: form.current_salary_lakhs,
          work_experience_years: form.work_experience_years,
          target_exams: form.target_exams,
          expected_tier: form.expected_tier,
          preferred_specialization: form.preferred_specialization,
          budget_lakhs: form.budget_lakhs,
          preferred_location: form.preferred_location,
          target_states: form.target_states,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setLoadingProgress(100);
      setTimeout(() => {
        setReport({ ...data, report_unlocked: !!user });
        setStep(5);
      }, 600);
    } catch (e: any) {
      toast({ title: "Could not generate report", description: e.message, variant: "destructive" });
      setStep(3);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/50 via-background to-background">
      <SEOHead
        title="MBA ROI Calculator | Check Your MBA Return on Investment | BSchoolBuzz"
        description="Calculate your MBA ROI, payback period, expected post-MBA salary, and get personalized AI college recommendations. Make data-backed MBA decisions."
        keywords={["MBA ROI calculator", "MBA payback period", "MBA salary calculator", "MBA worth it", "MBA fees vs salary"]}
      />

      <AnimatePresence mode="wait">
        {step === 0 && <Landing key="landing" onStart={() => setStep(1)} />}
        {step >= 1 && step <= 3 && (
          <FormShell
            key={`form-${step}`}
            step={step}
            form={form}
            setForm={setForm}
            otpStep={otpStep}
            otpValue={otpValue}
            setOtpValue={setOtpValue}
            otpSending={otpSending}
            otpVerifying={otpVerifying}
            resendTimer={resendTimer}
            handleSendOtp={handleSendOtp}
            handleVerifyOtp={handleVerifyOtp}
            toggleArr={toggleArr}
            canProceed={canProceedStep(step)}
            onBack={() => setStep(s => Math.max(0, s - 1))}
            onNext={() => step === 3 ? submitReport() : setStep(s => s + 1)}
          />
        )}
        {step === 4 && <Loading key="loading" progress={loadingProgress} fact={FUN_FACTS[factIndex]} />}
        {step === 5 && report && (
          <Report key="report" report={report} unlocked={!!user} onLogin={() => setShowLogin(true)} onRestart={() => { setForm(initialForm); setReport(null); setStep(0); }} />
        )}
      </AnimatePresence>

      <LoginRequiredDialog
        open={showLogin}
        onOpenChange={setShowLogin}
        message="Sign in to unlock your full MBA ROI report with personalized college recommendations."
      />
    </div>
  );
};

// ========== LANDING ==========
const Landing = ({ onStart }: { onStart: () => void }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="container mx-auto px-4 py-12 md:py-20">
    {/* Hero */}
    <div className="text-center max-w-4xl mx-auto mb-16">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
        <Badge className="mb-4 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
          <Sparkles className="w-3 h-3 mr-1" /> AI-Powered ROI Analysis
        </Badge>
      </motion.div>
      <motion.h1
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
        className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground mb-5 leading-tight"
      >
        Check Your MBA ROI <br className="hidden md:block" /><span className="text-primary">Before You Invest</span>
      </motion.h1>
      <motion.p
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}
        className="text-base md:text-lg text-muted-foreground mb-8 max-w-2xl mx-auto"
      >
        Get a deeply personalized MBA Return-on-Investment report with payback period, salary projections, and AI-matched college recommendations across Tier 1, 2 & 3 B-schools.
      </motion.p>
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
        <Button size="lg" onClick={onStart} className="h-12 px-8 text-base rounded-xl shadow-lg shadow-primary/20">
          <Calculator className="w-5 h-5 mr-2" /> Generate My ROI Report
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <p className="text-xs text-muted-foreground mt-3">Free • Takes 2 minutes • Verified report</p>
      </motion.div>
    </div>

    {/* Sample preview */}
    <motion.div
      initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}
      className="grid md:grid-cols-3 gap-4 mb-16 max-w-5xl mx-auto"
    >
      {[
        { icon: Wallet, label: "Total Investment", value: "₹28 L", sub: "Fees + Opportunity Cost", color: "from-rose-50 to-rose-100/50 border-rose-200" },
        { icon: TrendingUp, label: "Expected Salary", value: "₹24 LPA", sub: "Post-MBA Average", color: "from-emerald-50 to-emerald-100/50 border-emerald-200" },
        { icon: Timer, label: "Payback Period", value: "2.1 yrs", sub: "Time to recover", color: "from-blue-50 to-blue-100/50 border-blue-200" },
      ].map((c, i) => (
        <Card key={i} className={`bg-gradient-to-br ${c.color}`}>
          <CardContent className="p-5">
            <c.icon className="w-7 h-7 text-foreground/70 mb-3" />
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{c.label}</p>
            <p className="text-3xl font-bold text-foreground mt-1">{c.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
          </CardContent>
        </Card>
      ))}
    </motion.div>

    {/* How it works */}
    <div className="max-w-5xl mx-auto mb-16">
      <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-10">How It Works</h2>
      <div className="grid md:grid-cols-4 gap-4">
        {[
          { icon: User, title: "Verify You", desc: "Email + Mobile OTP" },
          { icon: BookOpen, title: "Tell Us About You", desc: "Salary, exams, budget" },
          { icon: Activity, title: "We Crunch Numbers", desc: "Real college dataset" },
          { icon: FileText, title: "Get Detailed Report", desc: "AI-powered insights" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
            <Card className="h-full">
              <CardContent className="p-5 text-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                  <s.icon className="w-6 h-6 text-primary" />
                </div>
                <p className="font-semibold text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>

    {/* Trust */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-16">
      {[
        { value: "200+", label: "B-Schools Analyzed" },
        { value: "12K+", label: "Reports Generated" },
        { value: "100%", label: "Free Forever" },
        { value: "AI", label: "Powered Analysis" },
      ].map((s, i) => (
        <div key={i} className="text-center p-4 rounded-xl bg-card border border-border">
          <p className="text-2xl md:text-3xl font-bold text-primary">{s.value}</p>
          <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
        </div>
      ))}
    </div>

    {/* Final CTA */}
    <div className="text-center">
      <Button size="lg" onClick={onStart} className="h-12 px-8 rounded-xl shadow-lg">
        Start My ROI Analysis <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  </motion.div>
);

// ========== FORM SHELL ==========
const FormShell = ({ step, form, setForm, otpStep, otpValue, setOtpValue, otpSending, otpVerifying, resendTimer, handleSendOtp, handleVerifyOtp, toggleArr, canProceed, onBack, onNext }: any) => {
  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-medium text-muted-foreground">Step {step} of {totalSteps}</p>
          <p className="text-xs text-muted-foreground">{Math.round(progress)}% complete</p>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card>
        <CardContent className="p-6 md:p-8 space-y-6">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">Let's verify you first</h2>
                <p className="text-sm text-muted-foreground mt-1">Your details are kept private and used only to send your report.</p>
              </div>

              <div className="space-y-2">
                <Label>Full Name *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input className="pl-10" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Aditya Sharma" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email Address *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" className="pl-10" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Mobile Number * <span className="text-xs text-muted-foreground">(OTP verification required)</span></Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-10 pr-28"
                    type="tel"
                    maxLength={10}
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10), phoneVerified: false })}
                    disabled={form.phoneVerified}
                    placeholder="10-digit number"
                  />
                  {form.phoneVerified ? (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium flex items-center gap-1 text-emerald-600">
                      <ShieldCheck className="w-4 h-4" /> Verified
                    </span>
                  ) : (
                    <Button
                      type="button" size="sm" variant="secondary"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 text-xs"
                      onClick={handleSendOtp}
                      disabled={otpSending || form.phone.length !== 10 || resendTimer > 0}
                    >
                      {otpSending ? "Sending..." : resendTimer > 0 ? `Resend (${resendTimer}s)` : otpStep ? "Resend OTP" : "Send OTP"}
                    </Button>
                  )}
                </div>

                {otpStep && !form.phoneVerified && (
                  <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/50 space-y-3">
                    <p className="text-xs text-muted-foreground">Enter the 6-digit OTP sent to <span className="font-medium text-foreground">{form.phone}</span></p>
                    <div className="flex justify-center">
                      <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
                        <InputOTPGroup>
                          {[0, 1, 2, 3, 4, 5].map(i => <InputOTPSlot key={i} index={i} />)}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    <Button size="sm" className="w-full" onClick={handleVerifyOtp} disabled={otpVerifying || otpValue.length !== 6}>
                      {otpVerifying ? "Verifying..." : "Verify OTP"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">Your background</h2>
                <p className="text-sm text-muted-foreground mt-1">Help us understand where you stand today.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Graduation Stream *</Label>
                  <Select value={form.graduation_stream} onValueChange={v => setForm({ ...form, graduation_stream: v })}>
                    <SelectTrigger><SelectValue placeholder="Select stream" /></SelectTrigger>
                    <SelectContent>{STREAM_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Work Experience (years)</Label>
                  <Input type="number" min={0} max={20} value={form.work_experience_years} onChange={e => setForm({ ...form, work_experience_years: Number(e.target.value) })} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Current Annual Salary (₹ Lakhs) <span className="text-xs text-muted-foreground">— enter 0 if fresher</span></Label>
                <Input type="number" min={0} step={0.5} value={form.current_salary_lakhs} onChange={e => setForm({ ...form, current_salary_lakhs: Number(e.target.value) })} placeholder="e.g. 8" />
              </div>

              <div className="space-y-2">
                <Label>Target MBA Exams * <span className="text-xs text-muted-foreground">(select all that apply)</span></Label>
                <div className="flex flex-wrap gap-2">
                  {EXAM_OPTIONS.map(ex => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setForm({ ...form, target_exams: toggleArr(form.target_exams, ex) })}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                        form.target_exams.includes(ex)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Expected College Tier *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {TIER_OPTIONS.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm({ ...form, expected_tier: t })}
                      className={`p-3 rounded-lg border text-sm font-medium transition ${
                        form.expected_tier === t ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/50"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">Your MBA preferences</h2>
                <p className="text-sm text-muted-foreground mt-1">Tell us what you want from your MBA.</p>
              </div>

              <div className="space-y-2">
                <Label>Preferred Specialization *</Label>
                <Select value={form.preferred_specialization} onValueChange={v => setForm({ ...form, preferred_specialization: v })}>
                  <SelectTrigger><SelectValue placeholder="Select specialization" /></SelectTrigger>
                  <SelectContent>{SPEC_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>MBA Budget (₹ Lakhs)</Label>
                  <span className="text-sm font-bold text-primary">₹{form.budget_lakhs} L</span>
                </div>
                <Slider
                  value={[form.budget_lakhs]}
                  onValueChange={([v]) => setForm({ ...form, budget_lakhs: v })}
                  min={2} max={80} step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>₹2L</span><span>₹40L</span><span>₹80L</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Preferred Location *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {LOCATION_OPTIONS.map(l => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setForm({ ...form, preferred_location: l })}
                      className={`p-3 rounded-lg border text-sm font-medium transition ${
                        form.preferred_location === l ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/50"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {form.preferred_location === "India" && (
                <div className="space-y-2">
                  <Label>Target States <span className="text-xs text-muted-foreground">(optional)</span></Label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                    {STATES.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm({ ...form, target_states: toggleArr(form.target_states, s) })}
                        className={`px-3 py-1 rounded-full text-xs border transition ${
                          form.target_states.includes(s) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nav */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onBack}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button onClick={onNext} disabled={!canProceed} className="min-w-[140px]">
              {step === 3 ? <>Generate Report <Sparkles className="w-4 h-4 ml-1" /></> : <>Next <ChevronRight className="w-4 h-4 ml-1" /></>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ========== LOADING ==========
const Loading = ({ progress, fact }: { progress: number; fact: string }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="container mx-auto px-4 py-20 max-w-xl text-center">
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="inline-block mb-6">
      <Calculator className="w-16 h-16 text-primary" />
    </motion.div>
    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Building your ROI report…</h2>
    <p className="text-sm text-muted-foreground mb-8">Our AI advisor is analyzing 200+ B-schools for your profile.</p>
    <Progress value={progress} className="h-2 mb-3" />
    <p className="text-xs text-muted-foreground mb-8">{Math.round(progress)}%</p>
    <AnimatePresence mode="wait">
      <motion.p
        key={fact}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="text-sm text-primary font-medium"
      >
        {fact}
      </motion.p>
    </AnimatePresence>
  </motion.div>
);

// ========== REPORT ==========
const Report = ({ report, unlocked, onLogin, onRestart }: any) => {
  const { metrics, profile, colleges, ai } = report;
  const fmtLakh = (n: number) => `₹${n.toFixed(1)}L`;
  const fmtLpa = (n: number) => `₹${n.toFixed(1)} LPA`;

  // Charts data
  const roiChartData = useMemo(() =>
    [...(colleges?.dream || []), ...(colleges?.target || []), ...(colleges?.safe || [])]
      .slice(0, 8)
      .map((c: any) => ({ name: c.name.length > 16 ? c.name.slice(0, 14) + "…" : c.name, ROI: c.roi_score, Payback: c.payback_years }))
  , [colleges]);

  const feesVsSalary = useMemo(() =>
    [...(colleges?.dream || []), ...(colleges?.target || []), ...(colleges?.safe || [])]
      .slice(0, 6)
      .map((c: any) => ({ name: c.name.length > 14 ? c.name.slice(0, 12) + "…" : c.name, Fees: c.fees_lakhs, Salary: c.expected_salary_lakhs }))
  , [colleges]);

  const verdictColor: Record<string, string> = {
    "Strong Yes": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "Yes — With Caveats": "bg-blue-100 text-blue-700 border-blue-200",
    "Wait & Strengthen Profile": "bg-amber-100 text-amber-700 border-amber-200",
    "Reconsider": "bg-rose-100 text-rose-700 border-rose-200",
  };
  const riskColor: Record<string, string> = {
    Low: "text-emerald-600", Moderate: "text-blue-600", High: "text-amber-600", "Very High": "text-rose-600",
  };
  const catColor: Record<string, string> = {
    High: "bg-emerald-500", Medium: "bg-blue-500", Low: "bg-amber-500",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 py-8 md:py-12 max-w-6xl space-y-6 relative">
      {!unlocked && (
        <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="pointer-events-auto bg-card border border-border rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center">
            <Lock className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Unlock Your Full Report</h3>
            <p className="text-sm text-muted-foreground mb-5">Sign in to see your complete personalized ROI analysis with 16+ college recommendations.</p>
            <Button size="lg" onClick={onLogin} className="w-full">Sign In to Unlock</Button>
          </motion.div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Badge className="mb-2 bg-blue-100 text-blue-700 border-blue-200">Your Personalized MBA ROI Report</Badge>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Hi {profile.name?.split(" ")[0]}, here's your verdict</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}><Download className="w-4 h-4 mr-1" /> Download</Button>
          <Button variant="outline" size="sm" onClick={onRestart}><Calculator className="w-4 h-4 mr-1" /> New Analysis</Button>
        </div>
      </div>

      {/* ROI Headline */}
      <Card className="border-primary/20 bg-gradient-to-br from-blue-50/60 to-background">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Metric icon={Wallet} label="Total Investment" value={fmtLakh(metrics.total_investment_lakhs)} sub="Fees + opportunity cost" />
            <Metric icon={TrendingUp} label="Expected Salary" value={fmtLpa(metrics.expected_salary_lakhs)} sub="Post-MBA average" />
            <Metric icon={Timer} label="Payback Period" value={`${metrics.payback_years} yrs`} sub="Time to recover" />
            <Metric icon={Gauge} label="ROI Score" value={`${metrics.roi_score}/100`} sub={metrics.roi_category + " ROI"} valueClass={metrics.roi_category === "High" ? "text-emerald-600" : metrics.roi_category === "Medium" ? "text-blue-600" : "text-amber-600"} />
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-2 flex-1 rounded-full ${catColor[metrics.roi_category]}/20`}>
              <div className={`h-full rounded-full ${catColor[metrics.roi_category]}`} style={{ width: `${Math.min(metrics.roi_score, 100)}%` }} />
            </div>
            <Badge variant="outline" className="text-xs">{metrics.roi_category} ROI</Badge>
          </div>
        </CardContent>
      </Card>

      {/* AI Verdict */}
      {ai?.verdict && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-lg font-bold text-foreground">Should you do an MBA now?</h2>
                  <Badge className={verdictColor[ai.verdict] || ""}>{ai.verdict}</Badge>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{ai.verdict_summary}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile summary */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Profile Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Info label="Stream" value={profile.graduation_stream} />
            <Info label="Experience" value={`${profile.work_experience_years} yrs`} />
            <Info label="Current Salary" value={fmtLpa(profile.current_salary_lakhs || 0)} />
            <Info label="Budget" value={fmtLakh(profile.budget_lakhs)} />
            <Info label="Target Tier" value={profile.expected_tier} />
            <Info label="Specialization" value={profile.preferred_specialization || "Open"} />
            <Info label="Location" value={profile.preferred_location || "India"} />
            <Info label="Exams" value={profile.target_exams?.join(", ")} />
          </div>
        </CardContent>
      </Card>

      {/* Executive summary */}
      {ai?.executive_summary && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> Executive Summary</h3>
            <p className="text-sm text-foreground/80 leading-relaxed">{ai.executive_summary}</p>
          </CardContent>
        </Card>
      )}

      {/* Why MBA / Why not */}
      {(ai?.why_mba_makes_sense || ai?.why_mba_might_not) && (
        <div className="grid md:grid-cols-2 gap-4">
          {ai?.why_mba_makes_sense && (
            <Card className="border-emerald-200">
              <CardContent className="p-5">
                <h4 className="font-bold text-emerald-700 mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Why MBA fits you</h4>
                <ul className="space-y-2">
                  {ai.why_mba_makes_sense.map((r: string, i: number) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground/80"><span className="text-emerald-500 mt-1">•</span>{r}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {ai?.why_mba_might_not && (
            <Card className="border-amber-200">
              <CardContent className="p-5">
                <h4 className="font-bold text-amber-700 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Honest red flags</h4>
                <ul className="space-y-2">
                  {ai.why_mba_might_not.map((r: string, i: number) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground/80"><span className="text-amber-500 mt-1">•</span>{r}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* College Recommendations */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-foreground flex items-center gap-2"><Building2 className="w-5 h-5 text-primary" /> Your College Recommendations</h3>

        {colleges?.dream?.length > 0 && (
          <CollegeBucket title="Dream Colleges" subtitle={ai?.dream_narrative} colleges={colleges.dream} accent="from-violet-50 to-violet-100/40" badgeClass="bg-violet-100 text-violet-700" icon={Trophy} />
        )}
        {colleges?.target?.length > 0 && (
          <CollegeBucket title="Target Colleges" subtitle={ai?.target_narrative} colleges={colleges.target} accent="from-blue-50 to-blue-100/40" badgeClass="bg-blue-100 text-blue-700" icon={Target} />
        )}
        {colleges?.safe?.length > 0 && (
          <CollegeBucket title="Safe Colleges" subtitle={ai?.safe_narrative} colleges={colleges.safe} accent="from-emerald-50 to-emerald-100/40" badgeClass="bg-emerald-100 text-emerald-700" icon={ShieldCheck} />
        )}
      </div>

      {/* ROI vs Payback Chart */}
      {roiChartData.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> ROI Score vs Payback Years</h3>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={roiChartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <RechartsTooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="ROI" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="Payback" stroke="hsl(var(--destructive))" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Fees vs Salary */}
      {feesVsSalary.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2"><IndianRupee className="w-4 h-4 text-primary" /> Fees vs Expected Salary</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={feesVsSalary}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11 }} label={{ value: "₹ Lakhs", angle: -90, position: "insideLeft", fontSize: 11 }} />
                <RechartsTooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Fees" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Salary" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Risk Analysis */}
      {ai?.risk_analysis && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-foreground flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-primary" /> Risk Analysis</h3>
              {ai.risk_level && <Badge variant="outline" className={riskColor[ai.risk_level]}>Risk: {ai.risk_level}</Badge>}
            </div>
            <p className="text-sm text-foreground/80 leading-relaxed mb-4">{ai.risk_analysis}</p>
            {ai.backup_suggestions?.length > 0 && (
              <div className="p-4 bg-muted/40 rounded-lg">
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Backup Strategies</p>
                <ul className="space-y-1.5">
                  {ai.backup_suggestions.map((s: string, i: number) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground/80"><Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {ai?.recommendations?.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2"><Rocket className="w-4 h-4 text-primary" /> Personalized Recommendations</h3>
            <div className="grid md:grid-cols-2 gap-3">
              {ai.recommendations.map((r: any, i: number) => (
                <div key={i} className="p-4 rounded-lg border border-border bg-card">
                  <div className="flex items-start gap-2 mb-1">
                    <Badge variant={r.priority === "critical" ? "destructive" : r.priority === "high" ? "default" : "secondary"} className="text-[10px] uppercase">{r.priority}</Badge>
                    <h5 className="font-semibold text-sm text-foreground">{r.title}</h5>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final Verdict */}
      {ai?.final_verdict && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2"><Award className="w-5 h-5 text-primary" /> Final Verdict</h3>
            <p className="text-base text-foreground leading-relaxed mb-5">{ai.final_verdict}</p>
            {ai.next_steps?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Your next steps</p>
                <ol className="space-y-1.5">
                  {ai.next_steps.map((s: string, i: number) => (
                    <li key={i} className="flex gap-2 text-sm text-foreground/80">
                      <span className="font-bold text-primary">{i + 1}.</span>{s}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
};

const Metric = ({ icon: Icon, label, value, sub, valueClass }: any) => (
  <div>
    <div className="flex items-center gap-2 text-muted-foreground mb-1">
      <Icon className="w-3.5 h-3.5" /><span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
    </div>
    <p className={`text-xl md:text-2xl font-bold ${valueClass || "text-foreground"}`}>{value}</p>
    <p className="text-[10px] text-muted-foreground">{sub}</p>
  </div>
);

const Info = ({ label, value }: { label: string; value?: string }) => (
  <div>
    <p className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</p>
    <p className="text-sm font-medium text-foreground truncate">{value || "—"}</p>
  </div>
);

const CollegeBucket = ({ title, subtitle, colleges, accent, badgeClass, icon: Icon }: any) => (
  <Card className={`bg-gradient-to-br ${accent}`}>
    <CardContent className="p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-bold text-foreground flex items-center gap-2"><Icon className="w-4 h-4" /> {title}</h4>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <Badge className={badgeClass}>{colleges.length}</Badge>
      </div>
      <div className="grid gap-2">
        {colleges.map((c: any, i: number) => (
          <div key={i} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border/50">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm text-foreground truncate">{c.name}</p>
              <p className="text-[11px] text-muted-foreground">{c.city}{c.state ? `, ${c.state}` : ""} • {c.tier}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-right shrink-0 ml-3">
              <div>
                <p className="text-[9px] uppercase text-muted-foreground">Fees</p>
                <p className="text-xs font-bold text-foreground">₹{c.fees_lakhs}L</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-muted-foreground">Salary</p>
                <p className="text-xs font-bold text-emerald-600">₹{c.expected_salary_lakhs}L</p>
              </div>
              <div>
                <p className="text-[9px] uppercase text-muted-foreground">Payback</p>
                <p className="text-xs font-bold text-primary">{c.payback_years}y</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export default MBARoiCalculatorPage;
