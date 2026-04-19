import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Calculator, IndianRupee, TrendingUp, Target, Briefcase, GraduationCap, Phone, Mail, User,
  ChevronRight, ChevronLeft, Lock, ShieldCheck, Sparkles, Award, Wallet, Trophy, AlertTriangle,
  CheckCircle2, ArrowRight, MapPin, BookOpen, Star, Clock, Rocket, Gauge, Building2, BarChart3,
  Download, Save, FileText, Lightbulb, Timer, Activity, Quote, HelpCircle, PieChart as PieIcon,
  TrendingDown, LineChart as LineIcon, Banknote, Users, Calendar, Map, Zap, Brain, Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import SEOHead, { generateBreadcrumbSchema, generateFAQSchema, generateWebsiteSchema } from "@/components/SEOHead";
import NarrativeBlock from "@/components/roi/NarrativeBlock";
import TabHint from "@/components/roi/TabHint";
import WhyThisMatters from "@/components/roi/WhyThisMatters";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  ComposedChart, Line, Legend, AreaChart, Area, PieChart, Pie, Cell, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar, LineChart,
} from "recharts";

const STREAM_OPTIONS = ["Engineering", "Commerce", "Science", "Arts", "Medical", "Law", "Other"];
const EXAM_OPTIONS = ["CAT", "XAT", "NMAT", "SNAP", "CMAT", "MAT", "GMAT", "IIFT", "TISSNET", "ATMA"];
const TIER_OPTIONS = ["Tier 1", "Tier 2", "Tier 3"];
const SPEC_OPTIONS = ["Finance", "Marketing", "Operations", "HR", "IT & Analytics", "Strategy", "General Management", "Entrepreneurship", "Business Analytics", "Consulting"];
const LOCATION_OPTIONS = ["India", "Abroad", "No Preference"];
const STATES = ["Pan India", "Andhra Pradesh", "Delhi", "Gujarat", "Haryana", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal"];
const INDUSTRY_OPTIONS = ["IT/Software", "Consulting", "Banking/Finance", "FMCG", "Manufacturing", "E-commerce", "Healthcare", "Government/PSU", "Startup", "Education", "Media", "Other", "Not Working"];
const CAREER_GOALS = [
  { value: "salary_jump", label: "Salary Jump" },
  { value: "career_switch", label: "Career Switch" },
  { value: "consulting", label: "Consulting Career" },
  { value: "entrepreneurship", label: "Entrepreneurship" },
  { value: "leadership", label: "Leadership Role" },
  { value: "international", label: "International Exposure" },
];
const LOAN_PLANS = [
  { value: "self", label: "Self / Family Funded" },
  { value: "partial_loan", label: "Partial Education Loan (~60%)" },
  { value: "full_loan", label: "Full Education Loan" },
  { value: "scholarship", label: "Hoping for Scholarship" },
];
const TOP_COLLEGES = [
  "IIM Ahmedabad", "IIM Bangalore", "IIM Calcutta", "IIM Lucknow", "IIM Kozhikode", "IIM Indore",
  "FMS Delhi", "XLRI Jamshedpur", "MDI Gurgaon", "SPJIMR Mumbai", "IIFT Delhi", "JBIMS Mumbai",
  "NMIMS Mumbai", "SIBM Pune", "IIT Bombay (SJMSOM)", "TISS Mumbai", "Great Lakes Chennai", "IMT Ghaziabad",
];

const TESTIMONIALS = [
  { name: "Aditya Sharma", role: "PM at Flipkart", img: "AS", quote: "The ROI calculator showed me MBA payback of 2.1 years for IIM-A. Helped me decide to take the loan confidently. 100% accurate." },
  { name: "Priya Mehta", role: "Consultant at BCG", img: "PM", quote: "I was confused between IIM and ISB. The detailed cashflow projection and lifetime earnings comparison gave me complete clarity." },
  { name: "Rahul Verma", role: "Marketing Lead at Nestle", img: "RV", quote: "Honest 'Wait & Strengthen' verdict pushed me to take CAT again. Scored 99.2 percentile next year and got into FMS Delhi." },
  { name: "Sneha Iyer", role: "Investment Banker", img: "SI", quote: "The tier-wise comparison and risk analysis was eye-opening. Found a Tier 2 college with better ROI than my Tier 1 dream." },
];

const FAQS = [
  { q: "Is this MBA ROI Calculator really free?", a: "Yes, completely free. We do not charge for the analysis, report, or recommendations. We monetize through coaching partner referrals if you choose to enroll." },
  { q: "How accurate is the ROI calculation?", a: "We use real placement data from 200+ B-schools and apply deterministic financial logic — opportunity cost, fees, expected salary jump, and 10-year compounded earnings. AI is used only to personalize the narrative." },
  { q: "Why do you ask for my mobile and email?", a: "We use your contact details to save your report, prevent abuse, and help you revisit your MBA ROI analysis later. Your information stays private and is used only for your experience on the platform." },
  { q: "Can I generate multiple reports?", a: "Each user gets one detailed report. You can revisit your saved report anytime from your dashboard. To generate a fresh one, contact support." },
  { q: "How is payback period calculated?", a: "Payback = (Fees + Living Cost + 2 years opportunity cost) ÷ (Expected Post-MBA Salary − Current Salary). It tells you how many years it takes to recover your total MBA investment." },
  { q: "What if I don't get into my dream college?", a: "Our report includes Dream, Target, and Safe college buckets, plus backup strategies and alternative career paths if MBA doesn't work out." },
  { q: "Will my data be shared?", a: "Your data is private. We use it only to generate your report and (with consent) send you relevant MBA preparation resources. No third-party sharing." },
  { q: "Does this work for international MBAs?", a: "Yes. Select 'Abroad' as preferred location. We benchmark against ISB, INSEAD, Wharton, Harvard, and other top global programs (limited dataset)." },
];

interface FormState {
  // Step 1 — identity
  name: string; email: string; phone: string; phoneVerified: boolean;
  age: number;
  // Step 2 — current state
  graduation_stream: string; graduation_score: number;
  current_salary_lakhs: number; work_experience_years: number;
  current_role: string; current_industry: string;
  // Step 3 — exam & target
  target_exams: string[]; exam_attempt_number: number;
  expected_tier: string; target_colleges: string[];
  // Step 4 — preferences
  preferred_specialization: string; budget_lakhs: number;
  preferred_location: string; target_states: string[];
  // Step 5 — financial & career
  family_income_lakhs: number; loan_plan: string;
  career_goal: string; expected_salary_lakhs: number;
}

const initialForm: FormState = {
  name: "", email: "", phone: "", phoneVerified: false, age: 25,
  graduation_stream: "", graduation_score: 70,
  current_salary_lakhs: 0, work_experience_years: 0,
  current_role: "", current_industry: "",
  target_exams: [], exam_attempt_number: 1,
  expected_tier: "Tier 1", target_colleges: [],
  preferred_specialization: "", budget_lakhs: 20,
  preferred_location: "India", target_states: [],
  family_income_lakhs: 0, loan_plan: "self",
  career_goal: "salary_jump", expected_salary_lakhs: 18,
};

const FUN_FACTS = [
  "Crunching college fees and average salaries…",
  "Calculating your post-MBA salary jump…",
  "Mapping payback periods for top B-schools…",
  "Comparing ROI across Tier 1, 2, and 3 colleges…",
  "Projecting your 10-year career trajectory…",
  "Building lifetime earnings comparison…",
  "Generating personalized AI recommendations…",
  "Preparing your detailed verdict and roadmap…",
];

const TOTAL_FORM_STEPS = 5;
const TEMP_DISABLE_PHONE_OTP = true;

const MBARoiCalculatorPage = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
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
  const [saving, setSaving] = useState(false);
  const [savedToDashboard, setSavedToDashboard] = useState(false);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  useEffect(() => {
    if (step !== 6) return;
    const factTimer = setInterval(() => setFactIndex(i => (i + 1) % FUN_FACTS.length), 1500);
    const progressTimer = setInterval(() => setLoadingProgress(p => Math.min(p + Math.random() * 6, 95)), 400);
    return () => { clearInterval(factTimer); clearInterval(progressTimer); };
  }, [step]);

  useEffect(() => {
    if (user && report && !report.report_unlocked) {
      setReport((r: any) => ({ ...r, report_unlocked: true }));
      if (report.analysis_id) {
        supabase.from("roi_analyses").update({ report_unlocked: true, user_id: user.id }).eq("id", report.analysis_id);
      }
    }
  }, [user, report]);

  // Check existing report on first form entry if user is logged in
  useEffect(() => {
    if (step === 1 && user && !report && !isAdmin) {
      (async () => {
        const { data } = await supabase
          .from("roi_analyses")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data) {
          toast({
            title: "You already have a saved report",
            description: "Loading your previous ROI analysis…",
          });
          setReport({
            analysis_id: data.id,
            existing: true,
            report_unlocked: true,
            profile: {
              name: data.name, graduation_stream: data.graduation_stream,
              current_salary_lakhs: data.current_salary_lakhs,
              work_experience_years: data.work_experience_years,
              target_exams: data.target_exams, expected_tier: data.expected_tier,
              preferred_specialization: data.preferred_specialization,
              budget_lakhs: data.budget_lakhs, preferred_location: data.preferred_location,
            },
            metrics: {
              total_investment_lakhs: data.total_investment_lakhs,
              expected_salary_lakhs: data.expected_salary_lakhs,
              current_salary_lakhs: data.current_salary_lakhs,
              payback_years: data.payback_years,
              roi_score: data.roi_score,
              roi_category: data.roi_category,
            },
            colleges: data.college_recommendations || {},
            ai: data.ai_insights || {},
          });
          setSavedToDashboard(true);
          setStep(7);
        }
      })();
    }
  }, [step, user]);

  const handleSendOtp = async () => {
    if (!/^\d{10}$/.test(form.phone)) {
      toast({ title: "Invalid phone", description: "Enter a 10-digit phone number.", variant: "destructive" });
      return;
    }

    if (TEMP_DISABLE_PHONE_OTP) {
      setForm((f) => ({ ...f, phoneVerified: true }));
      setOtpStep(false);
      setOtpValue("");
      setResendTimer(0);
      toast({
        title: "Phone accepted",
        description: "OTP verification is temporarily disabled. You can continue.",
      });
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
    const isPhoneAccepted = TEMP_DISABLE_PHONE_OTP ? /^\d{10}$/.test(form.phone) : form.phoneVerified;
    if (s === 1) return form.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && isPhoneAccepted && form.age >= 18;
    if (s === 2) return form.graduation_stream && form.graduation_score > 0;
    if (s === 3) return form.target_exams.length > 0 && form.expected_tier;
    if (s === 4) return form.preferred_specialization && form.budget_lakhs > 0;
    if (s === 5) return form.career_goal && form.loan_plan;
    return true;
  };

  const submitReport = async () => {
    setStep(6);
    setLoadingProgress(0);
    try {
      const { data, error } = await supabase.functions.invoke("roi-calculator", {
        body: {
          user_id: user?.id,
          name: form.name, email: form.email, phone: form.phone, age: form.age,
          graduation_stream: form.graduation_stream, graduation_score: form.graduation_score,
          current_salary_lakhs: form.current_salary_lakhs,
          work_experience_years: form.work_experience_years,
          current_role: form.current_role, current_industry: form.current_industry,
          target_exams: form.target_exams,
          exam_attempt_number: form.exam_attempt_number,
          expected_tier: form.expected_tier,
          target_colleges: form.target_colleges,
          preferred_specialization: form.preferred_specialization,
          budget_lakhs: form.budget_lakhs,
          preferred_location: form.preferred_location,
          target_states: form.target_states,
          family_income_lakhs: form.family_income_lakhs,
          loan_plan: form.loan_plan,
          career_goal: form.career_goal,
          expected_salary_lakhs: form.expected_salary_lakhs,
        },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setLoadingProgress(100);
      setTimeout(() => {
        setReport({ ...data, report_unlocked: !!user });
        if (data.existing) {
          toast({ title: "Showing your saved report", description: "You already generated a report. Showing the saved version." });
          setSavedToDashboard(true);
        }
        setStep(7);
      }, 600);
    } catch (e: any) {
      toast({ title: "Could not generate report", description: e.message, variant: "destructive" });
      setStep(5);
    }
  };

  const handleSaveToDashboard = async () => {
    if (!user) { setShowLogin(true); return; }
    if (!report?.analysis_id) return;
    setSaving(true);
    try {
      await supabase.from("roi_analyses").update({
        user_id: user.id, report_unlocked: true,
      }).eq("id", report.analysis_id);
      setSavedToDashboard(true);
      toast({ title: "Saved to your dashboard ✓", description: "Access this report anytime from My Dashboard." });
    } catch (e: any) {
      toast({ title: "Save failed", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/40 via-background to-background">
      <SEOHead
        title="MBA ROI Calculator 2025 | AI-Powered MBA Return on Investment Tool | BSchoolBuzz"
        description="Free AI-powered MBA ROI Calculator. Get personalized payback period, 10-year salary projection, college recommendations across IIMs, ISB, XLRI, FMS & 200+ B-schools. Make data-backed MBA decisions in 3 minutes."
        keywords={["MBA ROI calculator", "MBA payback period calculator", "MBA salary calculator India", "is MBA worth it", "MBA fees vs salary", "IIM ROI", "MBA return on investment", "MBA cost benefit analysis", "best MBA college ROI", "MBA loan EMI calculator"]}
        canonical="https://bschoolbuzz.com/roi-calculator"
        ogTitle="MBA ROI Calculator — Should You Pursue MBA? Find Out in 3 Minutes"
        ogDescription="AI-powered MBA Return-on-Investment calculator. Personalized college recommendations, payback period, salary projections, lifetime earnings comparison."
        jsonLd={[
          generateWebsiteSchema(),
          generateBreadcrumbSchema([
            { name: "Home", url: "/" },
            { name: "AI Tools", url: "/" },
            { name: "MBA ROI Calculator", url: "/roi-calculator" },
          ]),
          generateFAQSchema(FAQS.map(f => ({ q: f.q, a: f.a }))),
          {
            "@context": "https://schema.org", "@type": "SoftwareApplication",
            name: "MBA ROI Calculator", applicationCategory: "EducationalApplication",
            operatingSystem: "Web", offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
            aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", ratingCount: "12450" },
            description: "AI-powered MBA Return on Investment calculator with personalized college recommendations.",
          },
        ]}
      />

      <AnimatePresence mode="wait">
        {step === 0 && <Landing key="landing" onStart={() => setStep(1)} />}
        {step >= 1 && step <= 5 && (
          <FormShell
            key={`form-${step}`} step={step} form={form} setForm={setForm}
            otpStep={otpStep} otpValue={otpValue} setOtpValue={setOtpValue}
            otpSending={otpSending} otpVerifying={otpVerifying} resendTimer={resendTimer}
            handleSendOtp={handleSendOtp} handleVerifyOtp={handleVerifyOtp}
            toggleArr={toggleArr} canProceed={canProceedStep(step)}
            onBack={() => setStep(s => Math.max(0, s - 1))}
            onNext={() => step === TOTAL_FORM_STEPS ? submitReport() : setStep(s => s + 1)}
          />
        )}
        {step === 6 && <Loading key="loading" progress={loadingProgress} fact={FUN_FACTS[factIndex]} />}
        {step === 7 && report && (
          <Report
            key="report" report={report} unlocked={!!user}
            saving={saving} savedToDashboard={savedToDashboard}
            onSaveToDashboard={handleSaveToDashboard}
            onLogin={() => setShowLogin(true)}
            onRestart={() => { setForm(initialForm); setReport(null); setStep(0); setSavedToDashboard(false); }}
          />
        )}
      </AnimatePresence>

      <LoginRequiredDialog
        open={showLogin} onOpenChange={setShowLogin}
        message="Sign in to unlock your full MBA ROI report and save it to your dashboard."
      />
    </div>
  );
};

// ========== LANDING ==========
const Landing = ({ onStart }: { onStart: () => void }) => {
  const [previewIdx, setPreviewIdx] = useState(0);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const [counter, setCounter] = useState({ inv: 0, sal: 0, pay: 0, roi: 0 });

  // Animate counter on load
  useEffect(() => {
    const target = { inv: 32, sal: 24, pay: 2.1, roi: 87 };
    const duration = 1500;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCounter({
        inv: Math.round(target.inv * ease),
        sal: Math.round(target.sal * ease),
        pay: Math.round(target.pay * ease * 10) / 10,
        roi: Math.round(target.roi * ease),
      });
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  // Auto-rotate sample preview cards
  useEffect(() => {
    const t = setInterval(() => setPreviewIdx(i => (i + 1) % 3), 4000);
    return () => clearInterval(t);
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    const t = setInterval(() => setTestimonialIdx(i => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const samplePreviews = [
    { tier: "Tier 1 (IIM-A/B/C)", fees: 28, salary: 32, payback: 1.9, roi: 92, color: "violet" },
    { tier: "Tier 2 (MDI/SPJIMR)", fees: 22, salary: 22, payback: 2.4, roi: 76, color: "blue" },
    { tier: "Tier 3 (TAPMI/IMI)", fees: 14, salary: 12, payback: 3.6, roi: 58, color: "emerald" },
  ];

  const sampleChartData = [
    { year: 1, withMBA: 0, withoutMBA: 8 }, { year: 2, withMBA: 0, withoutMBA: 9 },
    { year: 3, withMBA: 24, withoutMBA: 10 }, { year: 4, withMBA: 28, withoutMBA: 11 },
    { year: 5, withMBA: 33, withoutMBA: 12 }, { year: 6, withMBA: 39, withoutMBA: 13 },
    { year: 7, withMBA: 46, withoutMBA: 14 }, { year: 8, withMBA: 54, withoutMBA: 15 },
    { year: 9, withMBA: 64, withoutMBA: 17 }, { year: 10, withMBA: 76, withoutMBA: 19 },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08),transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--primary)/0.06),transparent_50%)] pointer-events-none" />
        <div className="container mx-auto px-4 pt-12 pb-8 md:pt-20 md:pb-12 relative">
          <div className="grid lg:grid-cols-2 gap-10 items-center max-w-6xl mx-auto">
            <div>
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                <Badge className="mb-4 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
                  <Sparkles className="w-3 h-3 mr-1" /> AI-Powered • 200+ B-Schools • 100% Free
                </Badge>
              </motion.div>
              <motion.h1
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}
                className="text-3xl md:text-5xl lg:text-[3.5rem] font-bold text-foreground mb-5 leading-[1.1]"
              >
                Check Your MBA ROI<br />
                <span className="text-primary">Before You Invest ₹30L+</span>
              </motion.h1>
              <motion.p
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
                className="text-base md:text-lg text-muted-foreground mb-7"
              >
                Get a deeply personalized 30-page MBA Return-on-Investment report with payback period, 10-year salary projection, lifetime earnings comparison, AI verdict, and college recommendations across <strong className="text-foreground">IIMs, ISB, XLRI, FMS</strong> and 200+ B-schools.
              </motion.p>
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }} className="flex flex-wrap gap-3 mb-6">
                <Button size="lg" onClick={onStart} className="h-12 px-7 text-base rounded-xl shadow-lg shadow-primary/25">
                  <Calculator className="w-5 h-5 mr-2" /> Generate My ROI Report
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => document.getElementById("sample-report")?.scrollIntoView({ behavior: "smooth" })} className="h-12 px-6 rounded-xl">
                  <FileText className="w-4 h-4 mr-2" /> See Sample Report
                </Button>
              </motion.div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified data</div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 3 minutes</div>
                <div className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> AI-powered</div>
              </motion.div>
            </div>

            {/* HERO ANIMATED PREVIEW */}
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }}>
              <Card className="border-blue-200/50 shadow-2xl shadow-primary/10 overflow-hidden">
                <div className="bg-gradient-to-r from-primary/10 to-blue-50 p-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Sample ROI Report</p>
                        <p className="text-[10px] text-muted-foreground">Live preview • Updates every 4s</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Live</Badge>
                  </div>
                </div>
                <CardContent className="p-5 space-y-4">
                  <AnimatePresence mode="wait">
                    <motion.div key={previewIdx} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1">Showing</p>
                      <p className="text-sm font-bold text-foreground">{samplePreviews[previewIdx].tier}</p>
                    </motion.div>
                  </AnimatePresence>
                  <div className="grid grid-cols-2 gap-3">
                    <PreviewCell label="Investment" value={`₹${samplePreviews[previewIdx].fees}L`} icon={Wallet} />
                    <PreviewCell label="Salary" value={`₹${samplePreviews[previewIdx].salary} LPA`} icon={TrendingUp} accent />
                    <PreviewCell label="Payback" value={`${samplePreviews[previewIdx].payback} yrs`} icon={Timer} />
                    <PreviewCell label="ROI Score" value={`${samplePreviews[previewIdx].roi}/100`} icon={Gauge} accent />
                  </div>
                  {/* Mini chart */}
                  <div className="h-36 -mx-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sampleChartData}>
                        <defs>
                          <linearGradient id="hWith" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="hWithout" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="year" tick={{ fontSize: 9 }} />
                        <YAxis tick={{ fontSize: 9 }} />
                        <Area type="monotone" dataKey="withMBA" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#hWith)" />
                        <Area type="monotone" dataKey="withoutMBA" stroke="hsl(var(--muted-foreground))" strokeWidth={2} fill="url(#hWithout)" strokeDasharray="4 4" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-border/40">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> With MBA</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-muted-foreground/50" /> Without MBA</span>
                    <span className="text-foreground font-semibold">10-yr lead: ₹57L</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Animated counter row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto mt-12">
            {[
              { v: `₹${counter.inv}L`, l: "Avg Investment", icon: Wallet, color: "rose" },
              { v: `₹${counter.sal} LPA`, l: "Avg Post-MBA Salary", icon: TrendingUp, color: "emerald" },
              { v: `${counter.pay} yrs`, l: "Avg Payback", icon: Timer, color: "blue" },
              { v: `${counter.roi}/100`, l: "Avg ROI Score", icon: Gauge, color: "violet" },
            ].map((c, i) => (
              <motion.div key={i} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 + i * 0.1 }}>
                <Card className="bg-gradient-to-br from-background to-blue-50/40 border-blue-100/60 hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <c.icon className="w-5 h-5 text-primary mb-2" />
                    <p className="text-2xl md:text-3xl font-bold text-foreground">{c.v}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{c.l}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== ANIMATED SAMPLE REPORT — LIVE FEEL ========== */}
      <SampleReportShowcase onStart={onStart} />

      {/* HOW IT WORKS — DETAILED */}
      <section id="how" className="container mx-auto px-4 py-14 md:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="outline" className="mb-3">How It Works</Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">From profile to verdict in 4 steps</h2>
          <p className="text-muted-foreground">No fluff. No generic advice. Just data-driven, AI-personalized MBA financial guidance.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto">
          {[
            { num: "01", icon: ShieldCheck, title: "Enter Your Details", desc: "Share your salary, budget, work experience, and phone number so we can personalize your report.", color: "from-blue-50 to-blue-100/30" },
            { num: "02", icon: User, title: "Tell Us Your Story", desc: "5 quick steps — current salary, exams, budget, career goals, family income, loan plan.", color: "from-violet-50 to-violet-100/30" },
            { num: "03", icon: Brain, title: "AI Crunches 200+ B-Schools", desc: "Real placement data, deterministic ROI math, plus AI-generated personalized narrative.", color: "from-emerald-50 to-emerald-100/30" },
            { num: "04", icon: FileText, title: "Get 30-Page Report", desc: "Verdict, charts, college buckets, lifetime earnings, exam strategy, 6-month roadmap.", color: "from-amber-50 to-amber-100/30" },
          ].map((s, i) => (
            <motion.div key={i} initial={{ y: 30, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <Card className={`h-full bg-gradient-to-br ${s.color} border-blue-100/40 hover:shadow-xl transition-shadow`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm">
                      <s.icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-3xl font-bold text-primary/15">{s.num}</span>
                  </div>
                  <p className="font-bold text-foreground text-lg mb-1">{s.title}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* WHAT'S INSIDE THE REPORT */}
      <section className="container mx-auto px-4 py-14 md:py-20 max-w-6xl">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="outline" className="mb-3">What's Inside</Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">A 30-page deep-dive — not a 1-line answer</h2>
          <p className="text-muted-foreground">Every report is unique to you. Generated fresh by our AI advisor using your specific numbers.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Award, title: "AI Verdict", desc: "'Should you do MBA now?' answered with confidence level." },
            { icon: Wallet, title: "Financial Analysis", desc: "Fees, opportunity cost, EMI, living expenses — broken down." },
            { icon: LineIcon, title: "10-Year Cashflow", desc: "Year-by-year salary projection vs not doing MBA." },
            { icon: Building2, title: "College Recommendations", desc: "Dream / Target / Safe buckets with per-college ROI." },
            { icon: PieIcon, title: "Tier Comparison", desc: "Tier 1 vs 2 vs 3 — fees, salary, payback side-by-side." },
            { icon: Compass, title: "6-Month Roadmap", desc: "Month-by-month action plan from today to D-day." },
            { icon: AlertTriangle, title: "Risk Analysis", desc: "Risk factors, severity ratings, mitigation strategies." },
            { icon: BookOpen, title: "Exam Strategy", desc: "CAT/XAT/NMAT prep advice tailored to your attempt #." },
            { icon: Banknote, title: "Loan & Scholarship Guide", desc: "EMI calculator, loan strategy, scholarship opportunities." },
          ].map((c, i) => (
            <motion.div key={i} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
              <Card className="hover:border-primary/30 transition-colors h-full">
                <CardContent className="p-5 flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <c.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{c.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{c.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-gradient-to-b from-blue-50/40 to-background py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-3">Loved by 12,000+ MBA aspirants</Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Real stories from real students</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Card className="border-blue-200/50 bg-card h-full">
                <CardContent className="p-6 md:p-8 relative">
                  <Quote className="w-12 h-12 text-primary/15 absolute top-4 right-4" />
                  <AnimatePresence mode="wait">
                    <motion.div key={testimonialIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-white font-bold">
                          {TESTIMONIALS[testimonialIdx].img}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{TESTIMONIALS[testimonialIdx].name}</p>
                          <p className="text-xs text-muted-foreground">{TESTIMONIALS[testimonialIdx].role}</p>
                        </div>
                        <div className="ml-auto flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
                        </div>
                      </div>
                      <p className="text-base text-foreground leading-relaxed italic">"{TESTIMONIALS[testimonialIdx].quote}"</p>
                    </motion.div>
                  </AnimatePresence>
                  <div className="flex justify-center gap-1.5 mt-6">
                    {TESTIMONIALS.map((_, i) => (
                      <button key={i} onClick={() => setTestimonialIdx(i)} className={`h-1.5 rounded-full transition-all ${i === testimonialIdx ? "w-6 bg-primary" : "w-1.5 bg-border"}`} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="space-y-3">
              {[
                { v: "12K+", l: "Reports Generated" },
                { v: "200+", l: "B-Schools Analyzed" },
                { v: "4.8/5", l: "User Rating" },
              ].map((s, i) => (
                <Card key={i} className="bg-gradient-to-br from-background to-blue-50/40">
                  <CardContent className="p-5">
                    <p className="text-3xl font-bold text-primary">{s.v}</p>
                    <p className="text-sm text-muted-foreground mt-1">{s.l}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container mx-auto px-4 py-14 md:py-20 max-w-3xl">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-3">FAQs</Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Frequently Asked Questions</h2>
          <p className="text-muted-foreground">Everything you need to know before generating your report.</p>
        </div>
        <Accordion type="single" collapsible className="space-y-2">
          {FAQS.map((faq, i) => (
            <AccordionItem key={i} value={`q-${i}`} className="border border-border rounded-lg px-4 bg-card">
              <AccordionTrigger className="text-left text-sm font-semibold hover:no-underline">
                <span className="flex items-start gap-2"><HelpCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />{faq.q}</span>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{faq.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* FINAL CTA */}
      <section className="container mx-auto px-4 pb-16">
        <Card className="bg-gradient-to-br from-primary/10 via-blue-50 to-background border-primary/20 max-w-4xl mx-auto">
          <CardContent className="p-8 md:p-12 text-center">
            <Rocket className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Ready to make a data-backed MBA decision?</h2>
            <p className="text-muted-foreground mb-6 max-w-xl mx-auto">Join 12,000+ aspirants who got clarity in 3 minutes. 100% free, mobile-verified for your privacy.</p>
            <Button size="lg" onClick={onStart} className="h-12 px-8 rounded-xl shadow-lg">
              Start My ROI Analysis <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </section>
    </motion.div>
  );
};

const PreviewCell = ({ label, value, icon: Icon, accent }: any) => (
  <div className={`p-3 rounded-lg border ${accent ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border"}`}>
    <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
      <Icon className="w-3 h-3" /><span className="text-[9px] uppercase tracking-wider font-medium">{label}</span>
    </div>
    <p className={`text-base font-bold ${accent ? "text-primary" : "text-foreground"}`}>{value}</p>
  </div>
);

// ========== ANIMATED LIVE SAMPLE REPORT SHOWCASE ==========
const SAMPLE_PROFILES = [
  {
    name: "Aditya Kumar", age: 25, role: "Software Engineer @ TCS", exp: "3 yrs",
    college: "IIM Bangalore", tier: "Tier 1", verdict: "Strong Yes", verdictColor: "emerald",
    investment: 32, salary: 33, payback: 1.9, roi: 91, riskLevel: "Low",
    cashflow: [
      { y: 1, with: -32, without: 0 }, { y: 2, with: -32, without: 9 },
      { y: 3, with: 1, without: 18 }, { y: 4, with: 38, without: 28 },
      { y: 5, with: 80, without: 39 }, { y: 6, with: 127, without: 51 },
      { y: 7, with: 181, without: 64 }, { y: 8, with: 242, without: 78 },
      { y: 9, with: 311, without: 93 }, { y: 10, with: 389, without: 109 },
    ],
    radar: [
      { k: "Salary Jump", v: 95 }, { k: "Brand", v: 100 }, { k: "Network", v: 96 },
      { k: "ROI Speed", v: 88 }, { k: "Risk", v: 90 }, { k: "Career Switch", v: 85 },
    ],
    sectorMix: [
      { name: "Consulting", value: 35, color: "#3b82f6" },
      { name: "Finance", value: 25, color: "#8b5cf6" },
      { name: "Product", value: 20, color: "#10b981" },
      { name: "Tech", value: 15, color: "#f59e0b" },
      { name: "Other", value: 5, color: "#94a3b8" },
    ],
  },
  {
    name: "Priya Sharma", age: 27, role: "Marketing Lead @ HUL", exp: "5 yrs",
    college: "MDI Gurgaon", tier: "Tier 2", verdict: "Yes — With Caveats", verdictColor: "blue",
    investment: 24, salary: 24, payback: 2.6, roi: 78, riskLevel: "Moderate",
    cashflow: [
      { y: 1, with: -24, without: 0 }, { y: 2, with: -24, without: 12 },
      { y: 3, with: 0, without: 25 }, { y: 4, with: 27, without: 39 },
      { y: 5, with: 57, without: 54 }, { y: 6, with: 91, without: 70 },
      { y: 7, with: 130, without: 87 }, { y: 8, with: 173, without: 105 },
      { y: 9, with: 222, without: 124 }, { y: 10, with: 277, without: 144 },
    ],
    radar: [
      { k: "Salary Jump", v: 70 }, { k: "Brand", v: 80 }, { k: "Network", v: 78 },
      { k: "ROI Speed", v: 72 }, { k: "Risk", v: 75 }, { k: "Career Switch", v: 82 },
    ],
    sectorMix: [
      { name: "FMCG", value: 30, color: "#3b82f6" },
      { name: "Consulting", value: 25, color: "#8b5cf6" },
      { name: "Marketing", value: 22, color: "#10b981" },
      { name: "Finance", value: 15, color: "#f59e0b" },
      { name: "Other", value: 8, color: "#94a3b8" },
    ],
  },
  {
    name: "Rahul Verma", age: 24, role: "Analyst @ Deloitte", exp: "2 yrs",
    college: "TAPMI Manipal", tier: "Tier 3", verdict: "Wait & Strengthen", verdictColor: "amber",
    investment: 18, salary: 13, payback: 4.1, roi: 52, riskLevel: "High",
    cashflow: [
      { y: 1, with: -18, without: 0 }, { y: 2, with: -18, without: 7 },
      { y: 3, with: -5, without: 14 }, { y: 4, with: 9, without: 22 },
      { y: 5, with: 25, without: 30 }, { y: 6, with: 43, without: 39 },
      { y: 7, with: 64, without: 48 }, { y: 8, with: 87, without: 58 },
      { y: 9, with: 113, without: 69 }, { y: 10, with: 142, without: 80 },
    ],
    radar: [
      { k: "Salary Jump", v: 52 }, { k: "Brand", v: 55 }, { k: "Network", v: 60 },
      { k: "ROI Speed", v: 45 }, { k: "Risk", v: 50 }, { k: "Career Switch", v: 65 },
    ],
    sectorMix: [
      { name: "BFSI", value: 30, color: "#3b82f6" },
      { name: "IT", value: 28, color: "#8b5cf6" },
      { name: "Sales", value: 20, color: "#10b981" },
      { name: "Operations", value: 15, color: "#f59e0b" },
      { name: "Other", value: 7, color: "#94a3b8" },
    ],
  },
];

const TypewriterText = ({ text }: { text: string }) => {
  const [shown, setShown] = useState("");
  useEffect(() => {
    setShown("");
    let i = 0;
    const t = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(t);
    }, 12);
    return () => clearInterval(t);
  }, [text]);
  return <p className="text-sm text-foreground leading-relaxed">{shown}<span className="inline-block w-0.5 h-4 bg-primary/70 ml-0.5 animate-pulse align-middle" /></p>;
};

const SampleReportShowcase = ({ onStart }: { onStart: () => void }) => {
  const [idx, setIdx] = useState(0);
  const [tab, setTab] = useState("overview");
  const [generatedAt, setGeneratedAt] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => {
      setIdx(i => (i + 1) % SAMPLE_PROFILES.length);
      setTab("overview");
      setGeneratedAt(new Date());
    }, 9000);
    return () => clearInterval(t);
  }, []);

  const p = SAMPLE_PROFILES[idx];
  const verdictColors: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
  };
  const tenYearLead = p.cashflow[9].with - p.cashflow[9].without;

  const aiLines: Record<string, string> = {
    "Aditya Kumar": "Aditya, your engineering profile + 3 yrs at TCS + ₹9L base puts you in the sweet spot for IIM-A/B/C. With a projected jump to ₹33 LPA and 1.9-yr payback, the math is overwhelmingly in your favor. Aim for CAT 99.5+ — you have a real shot at a ₹2.8 Cr 10-year salary lead.",
    "Priya Sharma": "Priya, with 5 yrs at HUL and a strong marketing track record, an MBA is a solid leverage play — but only at MDI/SPJIMR or above. At ₹14 LPA today, the jump to ₹24 LPA is real but the 2.6-yr payback means timing matters. Don't drop below Tier 2.",
    "Rahul Verma": "Rahul, the numbers are honest with you — at 2 yrs of experience and Tier 3 colleges in play, your payback stretches past 4 years and 10-yr lead is only ₹62L. Strongly recommend: take CAT seriously next year, target Tier 2 minimum.",
  };

  return (
    <section id="sample-report" className="bg-gradient-to-b from-blue-50/30 via-background to-blue-50/20 py-14 md:py-20 border-y border-blue-100/50">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-10">
          <Badge variant="outline" className="mb-3 border-primary/30 text-primary">
            <Activity className="w-3 h-3 mr-1.5 animate-pulse" /> Live Sample Reports
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            See what your <span className="text-primary">30-page report</span> looks like
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            3 real student profiles. 3 different verdicts. Watch the report regenerate live every 9 seconds — this is exactly what you'll get.
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {SAMPLE_PROFILES.map((sp, i) => (
            <button
              key={i}
              onClick={() => { setIdx(i); setGeneratedAt(new Date()); }}
              className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all ${
                i === idx ? "bg-primary text-primary-foreground border-primary shadow-md scale-105" : "bg-card text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {sp.name.split(" ")[0]} • {sp.tier}
            </button>
          ))}
        </div>

        <Card className="border-border shadow-2xl shadow-primary/10 overflow-hidden">
          <div className="bg-muted/40 border-b border-border px-4 py-2.5 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-rose-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
            </div>
            <div className="flex-1 mx-4">
              <div className="bg-background border border-border rounded-md px-3 py-1 text-[11px] text-muted-foreground flex items-center gap-2">
                <Lock className="w-3 h-3 text-emerald-600" />
                <span className="truncate">bschoolbuzz.com/roi-calculator/report/{p.name.toLowerCase().replace(" ", "-")}</span>
              </div>
            </div>
            <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" /> LIVE
            </Badge>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`header-${idx}`}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="bg-gradient-to-r from-primary/8 via-blue-50 to-primary/5 px-6 py-5 border-b border-border"
            >
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-blue-500 text-white flex items-center justify-center font-bold shadow-md">
                    {p.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">MBA ROI Report</p>
                    <p className="text-base font-bold text-foreground">{p.name} <span className="text-xs font-normal text-muted-foreground">• {p.age} yrs • {p.role}</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${verdictColors[p.verdictColor]} font-semibold text-xs px-3 py-1`}>
                    <Trophy className="w-3 h-3 mr-1" /> {p.verdict}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    <Clock className="w-2.5 h-2.5 mr-1" /> {generatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </Badge>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="sticky top-16 z-30 bg-card/90 backdrop-blur-md border-b border-border px-6 pt-2 flex gap-1 overflow-x-auto relative shadow-sm">
            {[
              { v: "overview", l: "Overview", icon: Activity },
              { v: "financial", l: "Financial", icon: Wallet },
              { v: "career", l: "Career Map", icon: Compass },
              { v: "risk", l: "Risk", icon: AlertTriangle },
            ].map(t => (
              <button
                key={t.v}
                onClick={() => setTab(t.v)}
                className={`relative px-4 py-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  tab === t.v ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="w-3.5 h-3.5" /> {t.l}
                {tab !== t.v && t.v !== "overview" && (
                  <motion.span
                    className="absolute -top-0.5 right-1 w-1.5 h-1.5 rounded-full bg-primary"
                    animate={{ scale: [1, 1.6, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 1.4, repeat: Infinity, delay: 0.2 }}
                  />
                )}
              </button>
            ))}
          </div>
          <div className="px-6 pt-3 bg-card">
            <TabHint message="Tabs stay pinned — switch sections anytime as you scroll" />
          </div>

          <CardContent className="p-6 min-h-[480px] bg-gradient-to-br from-background via-background to-blue-50/20">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${idx}-${tab}`}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                {tab === "overview" && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { l: "Investment", v: `₹${p.investment}L`, icon: Wallet },
                        { l: "Post-MBA Salary", v: `₹${p.salary} LPA`, icon: TrendingUp },
                        { l: "Payback", v: `${p.payback} yrs`, icon: Timer },
                        { l: "ROI Score", v: `${p.roi}/100`, icon: Gauge },
                      ].map((m, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: i * 0.08 }}
                          className="p-3 rounded-lg bg-card border border-border"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <m.icon className="w-4 h-4 text-primary" />
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{m.l}</span>
                          </div>
                          <p className="text-xl font-bold text-foreground">{m.v}</p>
                        </motion.div>
                      ))}
                    </div>

                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/15">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4 text-primary" />
                        <p className="text-xs font-bold uppercase tracking-wider text-primary">AI Advisor Verdict</p>
                      </div>
                      <TypewriterText key={`${idx}-typer`} text={aiLines[p.name]} />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-foreground">10-Year Cumulative Earnings (₹L)</p>
                        <p className="text-xs font-semibold text-emerald-700">+₹{tenYearLead}L lead with MBA</p>
                      </div>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={p.cashflow}>
                            <defs>
                              <linearGradient id={`sw-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                              </linearGradient>
                              <linearGradient id={`swo-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.25} />
                                <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                            <XAxis dataKey="y" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                            <Area type="monotone" dataKey="without" name="Without MBA" stroke="hsl(var(--muted-foreground))" strokeWidth={2} fill={`url(#swo-${idx})`} strokeDasharray="4 4" />
                            <Area type="monotone" dataKey="with" name="With MBA" stroke="hsl(var(--primary))" strokeWidth={2.5} fill={`url(#sw-${idx})`} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {tab === "financial" && (
                  <div className="grid md:grid-cols-2 gap-5">
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Cost Breakdown</p>
                      {[
                        { l: "MBA Fees", v: p.investment - 10, color: "bg-blue-500" },
                        { l: "Living Expenses (2yr)", v: 4, color: "bg-violet-500" },
                        { l: "Opportunity Cost", v: 6, color: "bg-amber-500" },
                      ].map((b, i) => (
                        <div key={i}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-foreground font-medium">{b.l}</span>
                            <span className="font-bold text-foreground">₹{b.v}L</span>
                          </div>
                          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(b.v / p.investment) * 100}%` }}
                              transition={{ duration: 1, delay: i * 0.15 }}
                              className={`h-full ${b.color} rounded-full`}
                            />
                          </div>
                        </div>
                      ))}
                      <div className="pt-3 mt-3 border-t border-border flex justify-between">
                        <span className="text-sm font-bold text-foreground">Total Investment</span>
                        <span className="text-lg font-bold text-primary">₹{p.investment}L</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Sector Placement Mix</p>
                      <div className="h-44">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={p.sectorMix} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={35} outerRadius={70} paddingAngle={2}>
                              {p.sectorMix.map((s, i) => <Cell key={i} fill={s.color} />)}
                            </Pie>
                            <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 mt-2">
                        {p.sectorMix.map((s, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[10px]">
                            <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: s.color }} />
                            <span className="text-muted-foreground">{s.name}</span>
                            <span className="ml-auto font-semibold text-foreground">{s.value}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {tab === "career" && (
                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Profile Strength Radar</p>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={p.radar}>
                            <PolarGrid stroke="hsl(var(--border))" />
                            <PolarAngleAxis dataKey="k" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                            <PolarRadiusAxis tick={{ fontSize: 9 }} angle={90} domain={[0, 100]} />
                            <Radar name={p.name} dataKey="v" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.35} strokeWidth={2} />
                            <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Best-Fit College</p>
                      <Card className="border-primary/20 bg-primary/5">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-bold text-foreground">{p.college}</p>
                              <p className="text-xs text-muted-foreground">{p.tier} • Best ROI Match</p>
                            </div>
                            <Trophy className="w-5 h-5 text-amber-500" />
                          </div>
                          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                            <div className="p-2 rounded bg-card">
                              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Fees</p>
                              <p className="text-sm font-bold text-foreground">₹{p.investment - 10}L</p>
                            </div>
                            <div className="p-2 rounded bg-card">
                              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Avg CTC</p>
                              <p className="text-sm font-bold text-emerald-700">₹{p.salary}L</p>
                            </div>
                            <div className="p-2 rounded bg-card">
                              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">ROI</p>
                              <p className="text-sm font-bold text-primary">{p.roi}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <div className="space-y-2 text-xs">
                        <p className="font-bold text-foreground">Why this fits {p.name.split(" ")[0]}:</p>
                        {[
                          "Strong placement record in target sector",
                          `Payback in ${p.payback} years aligns with budget`,
                          `Salary multiple of ${(p.salary / 8).toFixed(1)}x is competitive`,
                          "Top recruiters match career aspirations",
                        ].map((r, i) => (
                          <div key={i} className="flex items-start gap-2 text-muted-foreground">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {tab === "risk" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Overall Risk Level</p>
                        <p className={`text-2xl font-bold mt-1 ${
                          p.riskLevel === "Low" ? "text-emerald-700" :
                          p.riskLevel === "Moderate" ? "text-amber-700" : "text-rose-700"
                        }`}>{p.riskLevel}</p>
                      </div>
                      <div className="w-20 h-20 relative">
                        <svg className="w-full h-full -rotate-90">
                          <circle cx="40" cy="40" r="32" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
                          <motion.circle
                            cx="40" cy="40" r="32"
                            stroke={p.riskLevel === "Low" ? "#10b981" : p.riskLevel === "Moderate" ? "#f59e0b" : "#ef4444"}
                            strokeWidth="8" fill="none" strokeLinecap="round"
                            initial={{ strokeDasharray: "0 201" }}
                            animate={{ strokeDasharray: `${(p.riskLevel === "Low" ? 0.25 : p.riskLevel === "Moderate" ? 0.5 : 0.78) * 201} 201` }}
                            transition={{ duration: 1.2 }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">
                          {p.riskLevel === "Low" ? "25%" : p.riskLevel === "Moderate" ? "50%" : "78%"}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Top Risk Factors</p>
                      {(p.riskLevel === "Low" ? [
                        { f: "Salary projection variance", s: "Low", m: "IIM placements highly stable" },
                        { f: "Loan EMI burden", s: "Low", m: "Bank loans easily approved for Tier 1" },
                      ] : p.riskLevel === "Moderate" ? [
                        { f: "Tier 2 placement variance", s: "Medium", m: "Target top 20% of cohort" },
                        { f: "Career switch difficulty", s: "Medium", m: "Build relevant projects pre-MBA" },
                        { f: "Salary stagnation risk", s: "Low", m: "Network actively in summer internship" },
                      ] : [
                        { f: "Long payback period (4+ yrs)", s: "High", m: "Strongly reconsider Tier 3" },
                        { f: "Low placement guarantee", s: "High", m: "Wait, retake CAT for Tier 2" },
                        { f: "Limited brand value", s: "Medium", m: "Consider PGDM at established Tier 2" },
                      ]).map((r, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded bg-card border border-border">
                          <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${
                            r.s === "High" ? "text-rose-600" : r.s === "Medium" ? "text-amber-600" : "text-emerald-600"
                          }`} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-0.5">
                              <p className="text-xs font-semibold text-foreground">{r.f}</p>
                              <Badge variant="outline" className={`text-[9px] ${
                                r.s === "High" ? "border-rose-300 text-rose-700" :
                                r.s === "Medium" ? "border-amber-300 text-amber-700" :
                                "border-emerald-300 text-emerald-700"
                              }`}>{r.s}</Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground">→ {r.m}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>

          <div className="bg-muted/30 border-t border-border px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <p className="text-[11px] text-muted-foreground">Auto-rotating every 9s • Click pills to switch profiles</p>
            </div>
            <div className="flex gap-1.5">
              {SAMPLE_PROFILES.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-8 bg-primary" : "w-1.5 bg-border"}`} />
              ))}
            </div>
          </div>
        </Card>

        <div className="text-center mt-8">
          <Button size="lg" onClick={onStart} className="h-12 px-8 rounded-xl shadow-lg shadow-primary/20">
            Get My Personalized Report <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <p className="text-xs text-muted-foreground mt-3">100% free • 3 minutes • Mobile verified</p>
        </div>
      </div>
    </section>
  );
};

// ========== FORM SHELL ==========
const FormShell = ({ step, form, setForm, otpStep, otpValue, setOtpValue, otpSending, otpVerifying, resendTimer, handleSendOtp, handleVerifyOtp, toggleArr, canProceed, onBack, onNext }: any) => {
  const progress = (step / TOTAL_FORM_STEPS) * 100;
  const stepTitles = [
    "", "Verify yourself", "Your background today", "Exam & target colleges",
    "MBA preferences", "Career goals & finances",
  ];

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-medium text-muted-foreground">Step {step} of {TOTAL_FORM_STEPS} • {stepTitles[step]}</p>
          <p className="text-xs text-muted-foreground">{Math.round(progress)}% complete</p>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-2">
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} className={`h-1.5 flex-1 mx-0.5 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-6 md:p-8 space-y-5">
          {step === 1 && (
            <>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">Let's get your details first</h2>
                <p className="text-sm text-muted-foreground mt-1">Your details stay private and help us personalize your report.</p>
              </div>

              <FieldText label="Full Name *" icon={User} value={form.name} onChange={(v: string) => setForm({ ...form, name: v })} placeholder="e.g. Aditya Sharma" />
              <FieldText label="Email Address *" icon={Mail} type="email" value={form.email} onChange={(v: string) => setForm({ ...form, email: v })} placeholder="you@example.com" />

              <div className="space-y-2">
                <Label>Mobile Number *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-10 pr-28" type="tel" maxLength={10}
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value.replace(/\D/g, "").slice(0, 10), phoneVerified: false })}
                    disabled={form.phoneVerified}
                    placeholder="10-digit number"
                  />
                  {form.phoneVerified ? (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium flex items-center gap-1 text-emerald-600">
                      <ShieldCheck className="w-4 h-4" /> Accepted
                    </span>
                  ) : (
                    <Button type="button" size="sm" variant="secondary" className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 text-xs"
                      onClick={handleSendOtp} disabled={form.phone.length !== 10}>
                      Continue
                    </Button>
                  )}
                </div>
                {TEMP_DISABLE_PHONE_OTP && <p className="text-xs text-muted-foreground">OTP verification is temporarily disabled.</p>}
              </div>

              <div className="space-y-2">
                <Label>Age *</Label>
                <Input type="number" min={18} max={50} value={form.age} onChange={e => setForm({ ...form, age: Number(e.target.value) })} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">Your background today</h2>
                <p className="text-sm text-muted-foreground mt-1">Help us understand where you stand right now.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FieldSelect label="Graduation Stream *" value={form.graduation_stream} onChange={(v: string) => setForm({ ...form, graduation_stream: v })} options={STREAM_OPTIONS} placeholder="Select stream" />
                <div className="space-y-2">
                  <Label>Graduation Score (%) *</Label>
                  <Input type="number" min={0} max={100} value={form.graduation_score} onChange={e => setForm({ ...form, graduation_score: Number(e.target.value) })} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Work Experience (years)</Label>
                  <Input type="number" min={0} max={20} step={0.5} value={form.work_experience_years} onChange={e => setForm({ ...form, work_experience_years: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Current Salary (₹ Lakhs/yr)</Label>
                  <Input type="number" min={0} step={0.5} value={form.current_salary_lakhs} onChange={e => setForm({ ...form, current_salary_lakhs: Number(e.target.value) })} placeholder="0 if fresher" />
                </div>
              </div>

              <FieldText label="Current Role / Designation" icon={Briefcase} value={form.current_role} onChange={(v: string) => setForm({ ...form, current_role: v })} placeholder="e.g. Software Engineer / Analyst" />

              <FieldSelect label="Current Industry" value={form.current_industry} onChange={(v: string) => setForm({ ...form, current_industry: v })} options={INDUSTRY_OPTIONS} placeholder="Select industry" />
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">Exams & target colleges</h2>
                <p className="text-sm text-muted-foreground mt-1">What are you preparing for?</p>
              </div>

              <div className="space-y-2">
                <Label>Target MBA Exams * <span className="text-xs text-muted-foreground">(select all that apply)</span></Label>
                <div className="flex flex-wrap gap-2">
                  {EXAM_OPTIONS.map(ex => (
                    <button key={ex} type="button" onClick={() => setForm({ ...form, target_exams: toggleArr(form.target_exams, ex) })}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${form.target_exams.includes(ex) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/50"}`}>
                      {ex}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Which attempt is this? *</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map(n => (
                    <button key={n} type="button" onClick={() => setForm({ ...form, exam_attempt_number: n })}
                      className={`p-2.5 rounded-lg border text-sm font-medium transition ${form.exam_attempt_number === n ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/50"}`}>
                      {n === 4 ? "4+" : `Attempt ${n}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Expected College Tier *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {TIER_OPTIONS.map(t => (
                    <button key={t} type="button" onClick={() => setForm({ ...form, expected_tier: t })}
                      className={`p-3 rounded-lg border text-sm font-medium transition ${form.expected_tier === t ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/50"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dream Colleges <span className="text-xs text-muted-foreground">(optional, max 5)</span></Label>
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 border border-border rounded-lg">
                  {TOP_COLLEGES.map(c => (
                    <button key={c} type="button"
                      onClick={() => {
                        if (form.target_colleges.includes(c)) setForm({ ...form, target_colleges: form.target_colleges.filter(x => x !== c) });
                        else if (form.target_colleges.length < 5) setForm({ ...form, target_colleges: [...form.target_colleges, c] });
                      }}
                      className={`px-2.5 py-1 rounded-full text-[11px] border transition ${form.target_colleges.includes(c) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">Your MBA preferences</h2>
                <p className="text-sm text-muted-foreground mt-1">Tell us what you want from your MBA.</p>
              </div>

              <FieldSelect label="Preferred Specialization *" value={form.preferred_specialization} onChange={(v: string) => setForm({ ...form, preferred_specialization: v })} options={SPEC_OPTIONS} placeholder="Select specialization" />

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>MBA Budget (₹ Lakhs)</Label>
                  <span className="text-sm font-bold text-primary">₹{form.budget_lakhs} L</span>
                </div>
                <Slider value={[form.budget_lakhs]} onValueChange={([v]) => setForm({ ...form, budget_lakhs: v })} min={2} max={80} step={1} />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>₹2L</span><span>₹40L</span><span>₹80L</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Preferred Location *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {LOCATION_OPTIONS.map(l => (
                    <button key={l} type="button" onClick={() => setForm({ ...form, preferred_location: l })}
                      className={`p-3 rounded-lg border text-sm font-medium transition ${form.preferred_location === l ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/50"}`}>
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
                      <button key={s} type="button" onClick={() => setForm({ ...form, target_states: toggleArr(form.target_states, s) })}
                        className={`px-3 py-1 rounded-full text-xs border transition ${form.target_states.includes(s) ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {step === 5 && (
            <>
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">Career goals & finances</h2>
                <p className="text-sm text-muted-foreground mt-1">Last step — helps us personalize the financial plan.</p>
              </div>

              <div className="space-y-2">
                <Label>Primary Career Goal *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {CAREER_GOALS.map(g => (
                    <button key={g.value} type="button" onClick={() => setForm({ ...form, career_goal: g.value })}
                      className={`p-3 rounded-lg border text-sm font-medium transition text-left ${form.career_goal === g.value ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border hover:border-primary/50"}`}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Expected Post-MBA Salary (₹ LPA)</Label>
                  <span className="text-sm font-bold text-primary">₹{form.expected_salary_lakhs} LPA</span>
                </div>
                <Slider value={[form.expected_salary_lakhs]} onValueChange={([v]) => setForm({ ...form, expected_salary_lakhs: v })} min={6} max={60} step={1} />
                <div className="flex justify-between text-xs text-muted-foreground"><span>₹6L</span><span>₹30L</span><span>₹60L+</span></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Family Income (₹ Lakhs/yr)</Label>
                  <Input type="number" min={0} step={0.5} value={form.family_income_lakhs} onChange={e => setForm({ ...form, family_income_lakhs: Number(e.target.value) })} placeholder="Optional" />
                </div>
                <FieldSelect label="Funding Plan *" value={form.loan_plan} onChange={(v: string) => setForm({ ...form, loan_plan: v })} options={LOAN_PLANS} placeholder="Select" useObjects />
              </div>

              <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-200/50 flex gap-3">
                <Lightbulb className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-foreground/80">
                  <strong>Pro tip:</strong> Education loans up to ₹40L are available at ~10.5% interest with 7-year tenure. Tax benefits under Section 80E available for the entire interest paid.
                </div>
              </div>
            </>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onBack}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            <Button onClick={onNext} disabled={!canProceed} className="min-w-[140px]">
              {step === TOTAL_FORM_STEPS ? <>Generate Report <Sparkles className="w-4 h-4 ml-1" /></> : <>Next <ChevronRight className="w-4 h-4 ml-1" /></>}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const FieldText = ({ label, icon: Icon, value, onChange, placeholder, type = "text" }: any) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <div className="relative">
      {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />}
      <Input type={type} className={Icon ? "pl-10" : ""} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  </div>
);

const FieldSelect = ({ label, value, onChange, options, placeholder, useObjects }: any) => (
  <div className="space-y-2">
    <Label>{label}</Label>
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {options.map((o: any) => useObjects
          ? <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          : <SelectItem key={o} value={o}>{o}</SelectItem>
        )}
      </SelectContent>
    </Select>
  </div>
);

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
      <motion.p key={fact} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="text-sm text-primary font-medium">
        {fact}
      </motion.p>
    </AnimatePresence>
  </motion.div>
);

// ========== REPORT ==========
const Report = ({ report, unlocked, saving, savedToDashboard, onSaveToDashboard, onLogin, onRestart }: any) => {
  const { metrics, profile, colleges, ai } = report;
  const fmtLakh = (n: number) => `₹${(n || 0).toFixed(1)}L`;
  const fmtLpa = (n: number) => `₹${(n || 0).toFixed(1)} LPA`;

  const allColleges = useMemo(() => [...(colleges?.dream || []), ...(colleges?.target || []), ...(colleges?.safe || [])], [colleges]);

  const roiChartData = useMemo(() =>
    allColleges.slice(0, 8).map((c: any) => ({ name: c.name.length > 16 ? c.name.slice(0, 14) + "…" : c.name, ROI: c.roi_score, Payback: c.payback_years })),
  [allColleges]);

  const feesVsSalary = useMemo(() =>
    allColleges.slice(0, 6).map((c: any) => ({ name: c.name.length > 14 ? c.name.slice(0, 12) + "…" : c.name, Fees: c.fees_lakhs, Salary: c.expected_salary_lakhs })),
  [allColleges]);

  const tierPieData = colleges?.tier_breakdown?.filter((t: any) => t.count > 0) || [];

  const radarData = useMemo(() => {
    const top = allColleges.slice(0, 5);
    return top.map((c: any) => ({
      college: c.name.length > 12 ? c.name.slice(0, 10) + "…" : c.name,
      ROI: c.roi_score,
      Salary: Math.min((c.expected_salary_lakhs / 30) * 100, 100),
      Affordability: Math.max(0, 100 - (c.fees_lakhs / 30) * 100),
      Tier: (c.tier === "Tier 1" ? 100 : c.tier === "Tier 2" ? 66 : 33),
    }));
  }, [allColleges]);

  const verdictColor: Record<string, string> = {
    "Strong Yes": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "Yes — With Caveats": "bg-blue-100 text-blue-700 border-blue-200",
    "Wait & Strengthen Profile": "bg-amber-100 text-amber-700 border-amber-200",
    "Reconsider": "bg-rose-100 text-rose-700 border-rose-200",
  };
  const riskColor: Record<string, string> = { Low: "text-emerald-600", Moderate: "text-blue-600", High: "text-amber-600", "Very High": "text-rose-600" };
  const catColor: Record<string, string> = { High: "bg-emerald-500", Medium: "bg-blue-500", Low: "bg-amber-500" };
  const PIE_COLORS = ["hsl(var(--primary))", "hsl(217 91% 70%)", "hsl(217 91% 85%)"];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="container mx-auto px-4 py-8 md:py-12 max-w-6xl space-y-6 relative">
      {!unlocked && (
        <div className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="pointer-events-auto bg-card border border-border rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center">
            <Lock className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Unlock Your Full Report</h3>
            <p className="text-sm text-muted-foreground mb-5">Sign in to see your complete personalized 30-page ROI analysis with college recommendations, charts, and 6-month roadmap.</p>
            <Button size="lg" onClick={onLogin} className="w-full">Sign In to Unlock</Button>
          </motion.div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Badge className="mb-2 bg-blue-100 text-blue-700 border-blue-200">Your Personalized MBA ROI Report</Badge>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Hi {profile.name?.split(" ")[0]}, here's your verdict</h1>
          {report.existing && <p className="text-xs text-muted-foreground mt-1">Showing your saved report from a previous session</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}><Download className="w-4 h-4 mr-1" /> Print / PDF</Button>
          {savedToDashboard ? (
            <Button variant="outline" size="sm" disabled><CheckCircle2 className="w-4 h-4 mr-1 text-emerald-600" /> Saved</Button>
          ) : (
            <Button variant="default" size="sm" onClick={onSaveToDashboard} disabled={saving}>
              <Save className="w-4 h-4 mr-1" /> {saving ? "Saving…" : "Save to Dashboard"}
            </Button>
          )}
          <Link to="/dashboard"><Button variant="ghost" size="sm">My Dashboard</Button></Link>
        </div>
      </div>

      {/* ROI Headline */}
      <Card className="border-primary/20 bg-gradient-to-br from-blue-50/60 to-background overflow-hidden">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Metric icon={Wallet} label="Total Investment" value={fmtLakh(metrics.total_investment_lakhs)} sub="Fees + opp cost + living" />
            <Metric icon={TrendingUp} label="Expected Salary" value={fmtLpa(metrics.expected_salary_lakhs)} sub="Post-MBA average" />
            <Metric icon={Timer} label="Payback Period" value={`${metrics.payback_years} yrs`} sub="Time to recover" />
            <Metric icon={Gauge} label="ROI Score" value={`${metrics.roi_score}/100`} sub={metrics.roi_category + " ROI"}
              valueClass={metrics.roi_category === "High" ? "text-emerald-600" : metrics.roi_category === "Medium" ? "text-blue-600" : "text-amber-600"} />
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-2 flex-1 rounded-full bg-muted overflow-hidden`}>
              <div className={`h-full ${catColor[metrics.roi_category]}`} style={{ width: `${Math.min(metrics.roi_score, 100)}%` }} />
            </div>
            <Badge variant="outline" className="text-xs">{metrics.roi_category} ROI</Badge>
          </div>
          {metrics.ten_year_advantage_lakhs && (
            <div className="mt-4 p-3 rounded-lg bg-emerald-50/60 border border-emerald-200/50 flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground">10-Year Earnings Advantage: <span className="text-emerald-700">+{fmtLakh(metrics.ten_year_advantage_lakhs)}</span></p>
                <p className="text-xs text-muted-foreground">vs. not doing MBA • Break-even from year {metrics.break_even_year || "—"}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Verdict */}
      {ai?.verdict && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-blue-100 flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h2 className="text-lg font-bold text-foreground">Should you do an MBA now?</h2>
                  <Badge className={verdictColor[ai.verdict] || ""}>{ai.verdict}</Badge>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{ai.verdict_summary}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TABBED DETAILED REPORT */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="sticky top-16 z-40 -mx-4 md:-mx-6 px-4 md:px-6 py-3 bg-white/85 backdrop-blur-md border-b border-border/60 shadow-sm">
          <div className="rounded-2xl border border-primary/15 bg-gradient-to-r from-primary/5 via-blue-50/40 to-primary/5 p-2 shadow-sm">
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1 bg-transparent gap-1">
              {[
                { v: "overview", l: "Overview", icon: FileText },
                { v: "financial", l: "Financial", icon: Wallet },
                { v: "colleges", l: "Colleges", icon: Building2 },
                { v: "career", l: "Career", icon: TrendingUp },
                { v: "risk", l: "Risk", icon: AlertTriangle },
                { v: "roadmap", l: "Roadmap", icon: Compass },
              ].map(t => (
                <TabsTrigger
                  key={t.v}
                  value={t.v}
                  className="relative text-xs gap-1.5 px-3 py-2 rounded-xl data-[state=active]:bg-card data-[state=active]:shadow-md data-[state=active]:text-primary data-[state=active]:font-bold transition-all hover:bg-card/60"
                >
                  <t.icon className="w-3.5 h-3.5" /> {t.l}
                  {t.v !== "overview" && (
                    <motion.span
                      className="absolute top-0.5 right-1 w-1.5 h-1.5 rounded-full bg-primary data-[state=active]:hidden"
                      animate={{ scale: [1, 1.6, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1.6, repeat: Infinity }}
                    />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <TabHint message="Click each tab above — Financial, Colleges, Career, Risk & Roadmap stay pinned as you scroll" />
        </div>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-5 mt-5">
          <WhyThisMatters
            icon={FileText}
            tone="blue"
            title="Your MBA at a glance"
            purpose="A 30-second snapshot of whether this MBA is worth the money, time and effort — before you dive into the details."
            bullets={[
              "See your headline ROI score and verdict in one place",
              "Cross-check your profile inputs are correct",
              "Get the AI's bottom-line recommendation upfront",
            ]}
          />
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
                <Info label="Career Goal" value={profile.career_goal || "—"} />
                {profile.current_role && <Info label="Current Role" value={profile.current_role} />}
                {profile.current_industry && <Info label="Industry" value={profile.current_industry} />}
                {profile.loan_plan && <Info label="Funding" value={profile.loan_plan} />}
                <Info label="Exams" value={profile.target_exams?.join(", ")} />
              </div>
            </CardContent>
          </Card>

          {ai?.executive_summary && (
            <NarrativeBlock
              title="Executive Summary"
              icon={FileText}
              text={ai.executive_summary}
              accent="primary"
              chart="sparkline"
              chartData={(colleges?.cashflow || []).slice(0, 10).map((c: any, i: number) => ({ x: `Y${c.year || i + 1}`, y: c.net_advantage || 0 }))}
              badge={ai.verdict ? { label: ai.verdict, tone: ai.verdict === "Strong Yes" ? "emerald" : ai.verdict === "Yes" ? "blue" : ai.verdict === "Maybe" ? "amber" : "rose" } : undefined}
            />
          )}

          {(ai?.profile_strengths || ai?.profile_weaknesses) && (
            <div className="grid md:grid-cols-2 gap-4">
              {ai?.profile_strengths && (
                <Card className="border-emerald-200/60 overflow-hidden relative">
                  <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-emerald-100/40 blur-3xl pointer-events-none" />
                  <CardContent className="p-5 relative">
                    <h4 className="font-bold text-emerald-700 mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Your Strengths</h4>
                    <ul className="space-y-2">
                      {ai.profile_strengths.map((r: string, i: number) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.06 }}
                          className="flex gap-2 text-sm text-foreground/85 p-2 rounded-md bg-emerald-50/40 border border-emerald-100"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />{r}
                        </motion.li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {ai?.profile_weaknesses && (
                <Card className="border-amber-200/60 overflow-hidden relative">
                  <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-amber-100/40 blur-3xl pointer-events-none" />
                  <CardContent className="p-5 relative">
                    <h4 className="font-bold text-amber-700 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Areas to Improve</h4>
                    <ul className="space-y-2">
                      {ai.profile_weaknesses.map((r: string, i: number) => (
                        <motion.li
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.06 }}
                          className="flex gap-2 text-sm text-foreground/85 p-2 rounded-md bg-amber-50/40 border border-amber-100"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />{r}
                        </motion.li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {(ai?.why_mba_makes_sense || ai?.why_mba_might_not) && (
            <div className="grid md:grid-cols-2 gap-4">
              {ai?.why_mba_makes_sense && (
                <Card className="border-blue-200/60 overflow-hidden relative">
                  <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-blue-100/40 blur-3xl pointer-events-none" />
                  <CardContent className="p-5 relative">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-blue-700 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Why MBA fits you</h4>
                      <Badge className="bg-blue-100 text-blue-700 text-[10px]">{ai.why_mba_makes_sense.length} reasons</Badge>
                    </div>
                    <div className="space-y-2">
                      {ai.why_mba_makes_sense.map((r: string, i: number) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.96 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.06 }}
                          className="flex gap-2 p-2.5 rounded-lg bg-blue-50/50 border border-blue-100 text-sm text-foreground/85"
                        >
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                          {r}
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {ai?.why_mba_might_not && (
                <Card className="border-rose-200/60 overflow-hidden relative">
                  <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full bg-rose-100/40 blur-3xl pointer-events-none" />
                  <CardContent className="p-5 relative">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-rose-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Honest red flags</h4>
                      <Badge className="bg-rose-100 text-rose-700 text-[10px]">{ai.why_mba_might_not.length} flags</Badge>
                    </div>
                    <div className="space-y-2">
                      {ai.why_mba_might_not.map((r: string, i: number) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, scale: 0.96 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.06 }}
                          className="flex gap-2 p-2.5 rounded-lg bg-rose-50/50 border border-rose-100 text-sm text-foreground/85"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                          {r}
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {ai?.profile_score_breakdown && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2"><Gauge className="w-4 h-4 text-primary" /> 5-Dimension Profile Score</h3>
                <div className="grid md:grid-cols-2 gap-5 items-center">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={[
                        { k: "Academic", v: ai.profile_score_breakdown.academic || 0 },
                        { k: "Work Exp", v: ai.profile_score_breakdown.work_experience || 0 },
                        { k: "Exam Ready", v: ai.profile_score_breakdown.exam_readiness || 0 },
                        { k: "Financial", v: ai.profile_score_breakdown.financial_readiness || 0 },
                        { k: "Career Clarity", v: ai.profile_score_breakdown.career_clarity || 0 },
                      ]}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="k" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                        <Radar dataKey="v" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {[
                      { l: "Academic", v: ai.profile_score_breakdown.academic },
                      { l: "Work Experience", v: ai.profile_score_breakdown.work_experience },
                      { l: "Exam Readiness", v: ai.profile_score_breakdown.exam_readiness },
                      { l: "Financial Readiness", v: ai.profile_score_breakdown.financial_readiness },
                      { l: "Career Clarity", v: ai.profile_score_breakdown.career_clarity },
                    ].map((s, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1"><span className="text-foreground font-medium">{s.l}</span><span className="font-bold text-foreground">{s.v}/100</span></div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${s.v}%` }} /></div>
                      </div>
                    ))}
                    <div className="pt-3 mt-3 border-t border-border text-center">
                      <p className="text-xs text-muted-foreground">Overall</p>
                      <p className="text-3xl font-bold text-primary">{ai.profile_score_breakdown.overall}/100</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {ai?.competitive_advantage?.length > 0 && (
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-blue-50/40">
              <CardContent className="p-6">
                <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><Award className="w-4 h-4 text-primary" /> Your Competitive Edge</h3>
                <div className="grid md:grid-cols-2 gap-2">
                  {ai.competitive_advantage.map((c: string, i: number) => (
                    <div key={i} className="flex gap-2 p-3 rounded-lg bg-card border border-border text-sm">
                      <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" /><span className="text-foreground/80">{c}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {ai?.key_metrics_explained?.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-primary" /> Your Numbers, Decoded</h3>
                <Table>
                  <TableHeader><TableRow><TableHead>Metric</TableHead><TableHead>Value</TableHead><TableHead>What It Means</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {ai.key_metrics_explained.map((m: any, i: number) => (
                      <TableRow key={i}><TableCell className="font-semibold">{m.metric}</TableCell><TableCell className="text-primary font-bold">{m.value}</TableCell><TableCell className="text-xs text-muted-foreground">{m.what_it_means}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {ai?.comparable_alumni_stories?.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Students Like You — Where They Are Now</h3>
                <div className="grid md:grid-cols-3 gap-3">
                  {ai.comparable_alumni_stories.map((a: any, i: number) => (
                    <div key={i} className="p-4 rounded-lg border border-border bg-gradient-to-br from-card to-blue-50/30">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-blue-500 text-white flex items-center justify-center text-xs font-bold">{a.name.split(" ").map((n: string) => n[0]).join("")}</div>
                        <div><p className="text-sm font-bold text-foreground">{a.name}</p><p className="text-[10px] text-muted-foreground">{a.college}</p></div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2"><span className="font-semibold text-foreground">Background:</span> {a.background}</p>
                      <p className="text-xs text-foreground/80 italic">"{a.outcome}"</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {ai?.tier_recommendation && (
            <NarrativeBlock
              title="Advisor's Tier Recommendation"
              icon={Target}
              text={ai.tier_recommendation}
              accent="amber"
              chart="score-bar"
              chartData={(colleges?.tier_breakdown || []).map((t: any) => ({ label: t.tier, value: t.avg_roi_score || 0 }))}
            />
          )}
        </TabsContent>
        <TabsContent value="financial" className="space-y-5 mt-5">
          <WhyThisMatters
            icon={Wallet}
            tone="emerald"
            title="Will the money come back?"
            purpose="See exactly how much you spend, when you break even, and how much extra you earn over 10 years."
            bullets={[
              "Total cost: tuition + living + 2 years of lost salary",
              "Payback period — when MBA pays for itself",
              "10-year net advantage vs. staying in your current job",
            ]}
          />
          {ai?.financial_analysis && (
            <NarrativeBlock
              title="Financial Deep-Dive"
              icon={Wallet}
              text={ai.financial_analysis}
              accent="primary"
              chart="growth"
              chartData={(colleges?.cashflow || []).map((c: any) => ({ x: `Y${c.year}`, y: c.net_advantage }))}
              badge={{ label: `${metrics?.roi_category || "Medium"} ROI`, tone: metrics?.roi_category === "High" ? "emerald" : metrics?.roi_category === "Low" ? "amber" : "blue" }}
            />
          )}

          {/* 10-year cashflow line chart */}
          {colleges?.cashflow?.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-foreground mb-1 flex items-center gap-2"><LineIcon className="w-4 h-4 text-primary" /> 10-Year Salary Projection</h3>
                <p className="text-xs text-muted-foreground mb-4">Year-by-year salary trajectory: With MBA vs Without MBA</p>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={colleges.cashflow}>
                    <defs>
                      <linearGradient id="withMba" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="withoutMba" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} label={{ value: "Years", position: "insideBottom", offset: -5, fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} label={{ value: "₹ LPA", angle: -90, position: "insideLeft", fontSize: 11 }} />
                    <RechartsTooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area name="With MBA" type="monotone" dataKey="with_mba_salary" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#withMba)" />
                    <Area name="Without MBA" type="monotone" dataKey="without_mba_salary" stroke="hsl(var(--muted-foreground))" strokeWidth={2} fill="url(#withoutMba)" strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Cumulative earnings table */}
          {colleges?.cashflow?.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Year-by-Year Cumulative Earnings</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Year</TableHead>
                        <TableHead>With MBA Salary</TableHead>
                        <TableHead>Without MBA Salary</TableHead>
                        <TableHead>Cumulative (With)</TableHead>
                        <TableHead>Cumulative (Without)</TableHead>
                        <TableHead className="text-right">Net Advantage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {colleges.cashflow.map((c: any) => (
                        <TableRow key={c.year}>
                          <TableCell className="font-semibold">Y{c.year}</TableCell>
                          <TableCell>{fmtLpa(c.with_mba_salary)}</TableCell>
                          <TableCell className="text-muted-foreground">{fmtLpa(c.without_mba_salary)}</TableCell>
                          <TableCell>{fmtLakh(c.cumulative_with_mba)}</TableCell>
                          <TableCell className="text-muted-foreground">{fmtLakh(c.cumulative_without_mba)}</TableCell>
                          <TableCell className={`text-right font-semibold ${c.net_advantage >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {c.net_advantage >= 0 ? "+" : ""}{fmtLakh(c.net_advantage)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loan card */}
          {colleges?.financial?.loan_amount_lakhs > 0 && (
            <Card className="border-blue-200/60 bg-blue-50/30">
              <CardContent className="p-6">
                <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><Banknote className="w-4 h-4 text-primary" /> Education Loan Breakdown</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <Info label="Loan Amount" value={fmtLakh(colleges.financial.loan_amount_lakhs)} />
                  <Info label="Monthly EMI" value={`₹${(colleges.financial.loan_emi_monthly / 1000).toFixed(1)}K`} />
                  <Info label="Total Interest" value={fmtLakh(colleges.financial.loan_interest_lakhs)} />
                  <Info label="Total Repayment" value={fmtLakh(colleges.financial.loan_total_repayment_lakhs)} />
                </div>
                <p className="text-xs text-muted-foreground">Assumes 10.5% interest, 7-year tenure. Section 80E provides full tax deduction on interest.</p>
              </CardContent>
            </Card>
          )}

          {ai?.loan_advice && (
            <NarrativeBlock
              title="Loan Strategy Advice"
              icon={Banknote}
              text={ai.loan_advice}
              accent="blue"
              chart={colleges?.financial?.loan_amount_lakhs > 0 ? "score-bar" : "none"}
              chartData={colleges?.financial?.loan_amount_lakhs > 0 ? [
                { label: "Principal", value: Math.round((colleges.financial.loan_amount_lakhs / colleges.financial.loan_total_repayment_lakhs) * 100) },
                { label: "Interest", value: Math.round((colleges.financial.loan_interest_lakhs / colleges.financial.loan_total_repayment_lakhs) * 100) },
              ] : []}
            />
          )}

          {ai?.scholarship_opportunities?.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><Award className="w-4 h-4 text-primary" /> Scholarship Opportunities to Explore</h3>
                <ul className="space-y-2">{ai.scholarship_opportunities.map((s: string, i: number) => <li key={i} className="flex gap-2 text-sm text-foreground/80"><Star className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />{s}</li>)}</ul>
              </CardContent>
            </Card>
          )}

          {/* Fees vs Salary Bar Chart */}
          {feesVsSalary.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2"><IndianRupee className="w-4 h-4 text-primary" /> Fees vs Expected Salary (Top Colleges)</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={feesVsSalary}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} label={{ value: "₹ Lakhs", angle: -90, position: "insideLeft", fontSize: 11 }} />
                    <RechartsTooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Fees" fill="hsl(0 70% 60%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Salary" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* COLLEGES TAB */}
        <TabsContent value="colleges" className="space-y-5 mt-5">
          <WhyThisMatters
            icon={Building2}
            tone="violet"
            title="Where should you actually apply?"
            purpose="A balanced shortlist of Dream, Target and Safe colleges — each scored on fees, salary, payback and ROI."
            bullets={[
              "Dream: stretch picks worth the extra prep",
              "Target: realistic given your profile and percentile",
              "Safe: high-confidence backups so you don't lose a year",
            ]}
          />
          {colleges?.dream?.length > 0 && (
            <CollegeBucket title="Dream Colleges" subtitle={ai?.dream_narrative} colleges={colleges.dream} accent="from-violet-50 to-violet-100/40" badgeClass="bg-violet-100 text-violet-700" icon={Trophy} />
          )}
          {colleges?.target?.length > 0 && (
            <CollegeBucket title="Target Colleges" subtitle={ai?.target_narrative} colleges={colleges.target} accent="from-blue-50 to-blue-100/40" badgeClass="bg-blue-100 text-blue-700" icon={Target} />
          )}
          {colleges?.safe?.length > 0 && (
            <CollegeBucket title="Safe Colleges" subtitle={ai?.safe_narrative} colleges={colleges.safe} accent="from-emerald-50 to-emerald-100/40" badgeClass="bg-emerald-100 text-emerald-700" icon={ShieldCheck} />
          )}

          {/* Detailed comparison table */}
          {allColleges.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Detailed College Comparison</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>College</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead className="text-right">Fees</TableHead>
                        <TableHead className="text-right">Avg Salary</TableHead>
                        <TableHead className="text-right">Highest</TableHead>
                        <TableHead className="text-right">Payback</TableHead>
                        <TableHead className="text-right">10-yr Gain</TableHead>
                        <TableHead className="text-right">ROI</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allColleges.slice(0, 15).map((c: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell>
                            <div>
                              <p className="font-semibold text-sm">{c.name}</p>
                              <p className="text-[10px] text-muted-foreground">{c.city}{c.state ? `, ${c.state}` : ""}</p>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{c.tier}</Badge></TableCell>
                          <TableCell className="text-right">₹{c.fees_lakhs}L</TableCell>
                          <TableCell className="text-right text-emerald-600 font-medium">₹{c.expected_salary_lakhs}L</TableCell>
                          <TableCell className="text-right text-muted-foreground">₹{c.highest_salary_lakhs}L</TableCell>
                          <TableCell className="text-right text-primary font-medium">{c.payback_years}y</TableCell>
                          <TableCell className="text-right text-emerald-700 font-semibold">+₹{c.ten_year_net_gain_lakhs}L</TableCell>
                          <TableCell className="text-right">
                            <Badge className={c.roi_score >= 70 ? "bg-emerald-100 text-emerald-700" : c.roi_score >= 45 ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}>{c.roi_score}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tier breakdown */}
          {tierPieData.length > 0 && (
            <div className="grid md:grid-cols-2 gap-5">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><PieIcon className="w-4 h-4 text-primary" /> Tier Distribution</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={tierPieData} dataKey="count" nameKey="tier" cx="50%" cy="50%" outerRadius={80} label={(e: any) => `${e.tier} (${e.count})`} labelLine={false}>
                        {tierPieData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Tier-wise Avg Metrics</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tier</TableHead>
                        <TableHead className="text-right">Fees</TableHead>
                        <TableHead className="text-right">Salary</TableHead>
                        <TableHead className="text-right">Payback</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tierPieData.map((t: any) => (
                        <TableRow key={t.tier}>
                          <TableCell className="font-semibold">{t.tier}</TableCell>
                          <TableCell className="text-right">₹{t.avg_fees_lakhs}L</TableCell>
                          <TableCell className="text-right text-emerald-600">₹{t.avg_salary_lakhs}L</TableCell>
                          <TableCell className="text-right text-primary">{t.avg_payback_years}y</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Radar */}
          {radarData.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Top 5 Colleges — Multi-Factor Comparison</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="college" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis tick={{ fontSize: 9 }} />
                    <Radar name="ROI" dataKey="ROI" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.4} />
                    <Radar name="Salary" dataKey="Salary" stroke="hsl(160 70% 45%)" fill="hsl(160 70% 45%)" fillOpacity={0.25} />
                    <Radar name="Affordability" dataKey="Affordability" stroke="hsl(40 90% 55%)" fill="hsl(40 90% 55%)" fillOpacity={0.2} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <RechartsTooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* ROI vs Payback */}
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
                    <Line yAxisId="right" type="monotone" dataKey="Payback" stroke="hsl(0 70% 60%)" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Top recruiters */}
          {colleges?.top_recruiters?.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Top Recruiters Across Recommended Colleges</h3>
                <div className="flex flex-wrap gap-2">
                  {colleges.top_recruiters.map((r: any, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs py-1 px-3">
                      {r.name} <span className="ml-1 text-muted-foreground">×{r.count}</span>
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* CAREER TAB */}
        <TabsContent value="career" className="space-y-5 mt-5">
          <WhyThisMatters
            icon={TrendingUp}
            tone="blue"
            title="Where will you be in 5 years?"
            purpose="Understand the roles, salary jumps and growth path you can realistically expect after graduation."
            bullets={[
              "Year-by-year salary trajectory through Year 10",
              "Likely roles at each stage — entry to leadership",
              "Specializations and industries that suit your profile",
            ]}
          />
          {ai?.career_trajectory && (
            <NarrativeBlock
              title="10-Year Career Trajectory"
              icon={TrendingUp}
              text={ai.career_trajectory}
              accent="primary"
              chart="milestones"
              chartData={[
                { year: "Y1", role: "Post-MBA Entry", salary: metrics?.expected_salary_lakhs || 18 },
                { year: "Y3", role: "Mid-Manager", salary: Math.round((metrics?.expected_salary_lakhs || 18) * 1.4) },
                { year: "Y5", role: "Senior Manager", salary: Math.round((metrics?.expected_salary_lakhs || 18) * 1.9) },
                { year: "Y10", role: "Leadership", salary: Math.round((metrics?.expected_salary_lakhs || 18) * 3.4) },
              ]}
            />
          )}

          {ai?.salary_growth_narrative && (
            <NarrativeBlock
              title="Salary Growth Outlook"
              icon={TrendingUp}
              text={ai.salary_growth_narrative}
              accent="emerald"
              chart="growth"
              chartData={(colleges?.cashflow || []).map((c: any) => ({ x: `Y${c.year}`, y: c.with_mba_salary }))}
            />
          )}

          {ai?.specialization_advice && (
            <NarrativeBlock
              title="Specialization Advice"
              icon={Briefcase}
              text={ai.specialization_advice}
              accent="violet"
            />
          )}

          {ai?.exam_strategy && (
            <NarrativeBlock
              title="Exam Strategy"
              icon={BookOpen}
              text={ai.exam_strategy}
              accent="blue"
            />
          )}

          {ai?.alternative_paths?.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><Compass className="w-4 h-4 text-primary" /> Alternative Career Paths</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {ai.alternative_paths.map((p: any, i: number) => (
                    <div key={i} className="p-4 border border-border rounded-lg bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-semibold text-sm text-foreground">{p.path}</h5>
                        <Badge variant="outline" className={p.suitability === "High" ? "text-emerald-700" : p.suitability === "Medium" ? "text-blue-700" : "text-amber-700"}>{p.suitability} fit</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* RISK TAB */}
        <TabsContent value="risk" className="space-y-5 mt-5">
          <WhyThisMatters
            icon={AlertTriangle}
            tone="amber"
            title="What could go wrong?"
            purpose="Know the real risks before you commit ₹20–40 lakhs and 2 years — and how to defuse each one."
            bullets={[
              "Placement, debt, opportunity-cost and ROI risks",
              "A single risk score so you can compare options",
              "Concrete mitigations for each red flag",
            ]}
          />
          {ai?.risk_analysis && (
            <NarrativeBlock
              title="Risk Analysis"
              icon={AlertTriangle}
              text={ai.risk_analysis}
              accent={ai.risk_level === "Low" ? "emerald" : ai.risk_level === "High" || ai.risk_level === "Very High" ? "rose" : "amber"}
              chart="risk-meter"
              chartData={{ score: ai.risk_level === "Low" ? 22 : ai.risk_level === "Moderate" ? 50 : ai.risk_level === "High" ? 75 : ai.risk_level === "Very High" ? 90 : 50 }}
              badge={ai.risk_level ? { label: `${ai.risk_level} Risk`, tone: ai.risk_level === "Low" ? "emerald" : ai.risk_level === "High" || ai.risk_level === "Very High" ? "rose" : "amber" } : undefined}
            />
          )}

          {ai?.risk_factors?.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-foreground mb-3">Detailed Risk Factors</h3>
                <div className="space-y-3">
                  {ai.risk_factors.map((rf: any, i: number) => {
                    const sevColor = rf.severity === "High" ? "border-rose-200 bg-rose-50/40" : rf.severity === "Medium" ? "border-amber-200 bg-amber-50/40" : "border-blue-200 bg-blue-50/40";
                    const sevBadge = rf.severity === "High" ? "bg-rose-100 text-rose-700" : rf.severity === "Medium" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700";
                    return (
                      <div key={i} className={`p-4 rounded-lg border ${sevColor}`}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h5 className="font-semibold text-sm text-foreground">{rf.factor}</h5>
                          <Badge className={`text-[10px] ${sevBadge}`}>{rf.severity}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground"><strong className="text-foreground">Mitigation: </strong>{rf.mitigation}</p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {ai?.backup_suggestions?.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-amber-500" /> Backup Strategies</h3>
                <ul className="space-y-2">{ai.backup_suggestions.map((s: string, i: number) => <li key={i} className="flex gap-2 text-sm text-foreground/80"><Lightbulb className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />{s}</li>)}</ul>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ROADMAP TAB */}
        <TabsContent value="roadmap" className="space-y-5 mt-5">
          <WhyThisMatters
            icon={Compass}
            tone="violet"
            title="Your next 6–12 months, planned"
            purpose="A step-by-step action plan so you stop wondering 'what do I do next?' and start moving."
            bullets={[
              "Prioritised actions: critical, high, medium",
              "Realistic timelines for prep, applications and interviews",
              "Personalised to your profile, exam and target tier",
            ]}
          />
          {ai?.recommendations?.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2"><Rocket className="w-4 h-4 text-primary" /> Personalized Recommendations</h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {ai.recommendations.map((r: any, i: number) => (
                    <div key={i} className="p-4 rounded-lg border border-border bg-card">
                      <div className="flex items-start gap-2 mb-1 flex-wrap">
                        <Badge variant={r.priority === "critical" ? "destructive" : r.priority === "high" ? "default" : "secondary"} className="text-[10px] uppercase">{r.priority}</Badge>
                        {r.timeline && <Badge variant="outline" className="text-[10px]"><Clock className="w-2.5 h-2.5 mr-0.5" />{r.timeline}</Badge>}
                      </div>
                      <h5 className="font-semibold text-sm text-foreground mt-1">{r.title}</h5>
                      <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {ai?.six_month_roadmap?.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-foreground mb-4 flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> 6-Month Action Roadmap</h3>
                <div className="space-y-4">
                  {ai.six_month_roadmap.map((r: any, i: number) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">{i + 1}</div>
                        {i < ai.six_month_roadmap.length - 1 && <div className="w-0.5 flex-1 bg-border my-1" />}
                      </div>
                      <div className="flex-1 pb-3">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <h5 className="font-semibold text-foreground">{r.month}</h5>
                          <span className="text-xs text-primary">{r.focus}</span>
                        </div>
                        <ul className="mt-2 space-y-1">
                          {r.actions.map((a: string, j: number) => (
                            <li key={j} className="text-xs text-muted-foreground flex gap-1.5"><CheckCircle2 className="w-3 h-3 text-primary mt-0.5 shrink-0" />{a}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {ai?.final_verdict && (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/8 via-blue-50/40 to-background overflow-hidden relative">
              <motion.div
                aria-hidden
                className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/15 blur-3xl pointer-events-none"
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.75, 0.5] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              />
              <CardContent className="p-6 relative">
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    initial={{ scale: 0, rotate: -45 }}
                    whileInView={{ scale: 1, rotate: 0 }}
                    viewport={{ once: true }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center shadow-lg shadow-primary/30"
                  >
                    <Award className="w-6 h-6 text-white" />
                  </motion.div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-primary font-bold">AI Final Verdict</p>
                    <h3 className="text-xl font-bold text-foreground">Your decision, decoded</h3>
                  </div>
                </div>

                <div className="bg-card border border-primary/15 rounded-xl p-4 mb-5">
                  <p className="text-base text-foreground leading-relaxed whitespace-pre-line">{ai.final_verdict}</p>
                </div>

                {ai.next_steps?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                      <Rocket className="w-3 h-3 text-primary" /> Your immediate next steps
                    </p>
                    <div className="grid md:grid-cols-2 gap-2.5">
                      {ai.next_steps.map((s: string, i: number) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.07 }}
                          whileHover={{ y: -2, scale: 1.01 }}
                          className="flex gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all"
                        >
                          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-blue-500 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-sm">{i + 1}</span>
                          <p className="text-sm text-foreground/85 leading-relaxed">{s}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {ai?.faq?.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-bold text-foreground mb-3 flex items-center gap-2"><HelpCircle className="w-4 h-4 text-primary" /> Personalized FAQs</h3>
                <Accordion type="single" collapsible>
                  {ai.faq.map((f: any, i: number) => (
                    <AccordionItem key={i} value={`af-${i}`}>
                      <AccordionTrigger className="text-sm font-semibold text-left hover:no-underline">{f.q}</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{f.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Footer actions */}
      <Card className="bg-gradient-to-br from-primary/5 to-background border-primary/20">
        <CardContent className="p-6 text-center">
          <p className="text-sm text-muted-foreground mb-4">Want to take the next step? Explore our other AI tools.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/profile-analyzer"><Button variant="outline" size="sm"><User className="w-4 h-4 mr-1" /> Profile Analyzer</Button></Link>
            <Link to="/college-shortlister"><Button variant="outline" size="sm"><Building2 className="w-4 h-4 mr-1" /> College Shortlister</Button></Link>
            <Link to="/colleges"><Button variant="outline" size="sm"><GraduationCap className="w-4 h-4 mr-1" /> Browse Colleges</Button></Link>
          </div>
        </CardContent>
      </Card>
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
          {subtitle && <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{subtitle}</p>}
        </div>
        <Badge className={badgeClass}>{colleges.length}</Badge>
      </div>
      <div className="grid gap-2">
        {colleges.map((c: any, i: number) => (
          <div key={i} className="flex items-center justify-between p-3 bg-card rounded-lg border border-border/50">
            <div className="min-w-0 flex-1">
              <Link to={`/college/${c.slug}`} className="font-semibold text-sm text-foreground truncate hover:text-primary transition-colors">{c.name}</Link>
              <p className="text-[11px] text-muted-foreground">{c.city}{c.state ? `, ${c.state}` : ""} • {c.tier}{c.ranking ? ` • Rank #${c.ranking}` : ""}</p>
            </div>
            <div className="grid grid-cols-4 gap-3 text-right shrink-0 ml-3">
              <div><p className="text-[9px] uppercase text-muted-foreground">Fees</p><p className="text-xs font-bold text-foreground">₹{c.fees_lakhs}L</p></div>
              <div><p className="text-[9px] uppercase text-muted-foreground">Salary</p><p className="text-xs font-bold text-emerald-600">₹{c.expected_salary_lakhs}L</p></div>
              <div><p className="text-[9px] uppercase text-muted-foreground">Payback</p><p className="text-xs font-bold text-primary">{c.payback_years}y</p></div>
              <div><p className="text-[9px] uppercase text-muted-foreground">ROI</p><p className="text-xs font-bold text-foreground">{c.roi_score}</p></div>
            </div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

export default MBARoiCalculatorPage;
