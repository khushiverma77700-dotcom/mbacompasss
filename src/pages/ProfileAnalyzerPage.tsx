import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  GraduationCap, Briefcase, Target, ChevronRight, ChevronLeft, Lock, Phone, Mail,
  TrendingUp, Shield, Zap, BookOpen, Calendar, Star, AlertTriangle, CheckCircle2, ArrowRight,
  Sparkles, BarChart3, Lightbulb, User, FileText, Download, Save, MapPin, ClipboardList,
  Award, Users, Clock, ArrowUpRight, ChevronDown, Info, Search, Layers, Activity, Eye, IndianRupee,
  Trophy, Wallet, DollarSign, TrendingDown, Rocket, CircleCheck, Timer,
  Percent, Hash, Globe, Building2, Flame, CircleDot, Medal, PieChart, LineChart, Gauge
} from "lucide-react";
import bschoolLogo from "@/assets/bschoolbuzz-logo.png";
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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead, { generateBreadcrumbSchema, generateWebsiteSchema } from "@/components/SEOHead";
import ExecutiveSummary from "@/components/profile-report/ExecutiveSummary";
import RadarChartCard from "@/components/profile-report/RadarChartCard";
import CollegeFitHeatmap from "@/components/profile-report/CollegeFitHeatmap";
import ScenarioSimulator from "@/components/profile-report/ScenarioSimulator";
import BenchmarkPanel from "@/components/profile-report/BenchmarkPanel";
import ROIScatterCard from "@/components/profile-report/ROIScatterCard";
import PdfDownloadButton from "@/components/profile-report/PdfDownloadButton";
import ShareReportButton from "@/components/profile-report/ShareReportButton";
import type { CollegeRow, ProfileInputLite, ScoreBreakdown } from "@/lib/profileScoring";

interface PremiumNarrative {
  one_line_summary?: string;
  final_verdict?: string;
  top_advantages?: Array<{ title: string; why: string }>;
  top_risks?: Array<{ title: string; mitigation: string }>;
  section_insights?: Record<string, string>;
}

const STORAGE_KEY = "profile_analyzer_v2_draft";
const EXAM_OPTIONS = ["CAT", "XAT", "NMAT", "SNAP", "CMAT", "MAT", "GMAT", "IIFT", "TISSNET", "ATMA"];
const STREAM_OPTIONS = ["Engineering", "Commerce", "Science", "Arts", "Medical", "Law", "Other"];
const SPECIALIZATIONS = ["Finance", "Marketing", "Operations", "HR", "IT & Analytics", "Strategy", "General Management", "Entrepreneurship"];
const CATEGORY_OPTIONS = ["General", "OBC", "OBC-NCL", "SC", "ST", "EWS", "PwD"];
const EMPLOYER_TYPES = ["IT/Software", "Consulting", "FMCG", "Banking/Finance", "Manufacturing", "Government/PSU", "Startup", "Healthcare", "E-commerce", "Education", "Other"];
const CERTIFICATION_OPTIONS = ["CFA", "FRM", "Six Sigma", "PMP", "AWS/Cloud", "Data Science", "Digital Marketing", "CA/CS", "ACCA", "Other"];
const EXTRACURRICULAR_OPTIONS = ["Sports (National/State)", "NGO/Social Work", "Entrepreneurship", "Cultural Activities", "Technical Competitions", "Student Body Leadership", "Publications/Research", "International Exposure", "Other"];
const LEADERSHIP_OPTIONS = [
  { label: "None", value: "none" },
  { label: "Team Lead (2-5 people)", value: "team_lead" },
  { label: "Manager (5-15 people)", value: "manager" },
  { label: "Senior Manager (15+)", value: "senior_manager" },
  { label: "Founder/Co-founder", value: "founder" },
  { label: "Student Body President/Secretary", value: "student_leader" },
];
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
const FEE_BUDGET_OPTIONS = [
  { label: "Under ₹5 Lakhs", value: "5" },
  { label: "₹5 - 10 Lakhs", value: "10" },
  { label: "₹10 - 15 Lakhs", value: "15" },
  { label: "₹15 - 20 Lakhs", value: "20" },
  { label: "₹20 - 25 Lakhs", value: "25" },
  { label: "₹25 - 30 Lakhs", value: "30" },
  { label: "₹30+ Lakhs / No constraint", value: "50" },
];
const SALARY_EXPECTATION_OPTIONS = [
  { label: "₹8 - 12 LPA", value: "10" },
  { label: "₹12 - 16 LPA", value: "14" },
  { label: "₹16 - 20 LPA", value: "18" },
  { label: "₹20 - 25 LPA", value: "22" },
  { label: "₹25 - 30 LPA", value: "27" },
  { label: "₹30 - 40 LPA", value: "35" },
  { label: "₹40+ LPA", value: "45" },
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
  strengths: Array<{ title: string; description: string; impact: string; quantitative_impact?: string }>;
  weaknesses: Array<{ title: string; description: string; severity: string; fix: string; improvement_potential?: string; timeline_to_fix?: string }>;
  college_predictions: {
    dream: Array<{ name: string; probability: number; cutoff_info: string; tip?: string }>;
    target: Array<{ name: string; probability: number; cutoff_info: string; tip?: string }>;
    safe: Array<{ name: string; probability: number; cutoff_info: string; tip?: string }>;
  };
  detailed_college_table: CollegeTableRow[];
  recommendations: Array<{ title: string; description: string; priority: string; timeline?: string; expected_outcome?: string }>;
  study_plan: Array<{ phase: string; duration: string; focus_areas: string[]; target_score?: string; daily_hours?: number; mock_test_target?: string; key_milestones?: string[] }>;
  score_breakdown: {
    academics_score: number;
    work_experience_score: number;
    diversity_score: number;
    profile_consistency_score: number;
    leadership_potential_score: number;
    extracurricular_score?: number;
    overall_competitiveness: string;
    percentile_among_aspirants: number;
  };
  ai_summary: string;
  exam_strategy: Array<{ exam_name: string; recommended_score: string; preparation_months: number; difficulty_for_student: string; roi_rating: string; section_wise_strategy?: Array<{ section: string; target_score: string; current_estimate?: string; improvement_tips: string }> }>;
  peer_comparison: {
    total_students_analysed: number;
    average_score: number;
    your_rank_percentile: number;
    score_distribution: Array<{ range: string; count: number; is_yours: boolean }>;
  };
  roi_analysis?: Array<{
    college_name: string;
    total_investment_lakhs: number;
    expected_starting_salary_lakhs: number;
    payback_period_months: number;
    five_year_roi_percent: number;
    ten_year_earnings_advantage_lakhs?: number;
    roi_rating: string;
  }>;
  salary_benchmarking?: {
    current_estimated_salary_lakhs: number;
    post_mba_salary_range: {
      tier1_min: number; tier1_max: number;
      tier2_min: number; tier2_max: number;
      tier3_min: number; tier3_max: number;
    };
    sector_wise_salary: Array<{ sector: string; avg_salary_lakhs: number; top_salary_lakhs: number; growth_rate_percent: number }>;
    salary_growth_trajectory: Array<{ year: number; with_mba_lakhs: number; without_mba_lakhs: number }>;
  };
  improvement_roadmap?: Array<{
    month: number;
    milestone: string;
    target_percentile?: string;
    focus_areas: string[];
    mock_score_target?: string;
    profile_score_target: number;
  }>;
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
  fee_budget_lakhs: string;
  expected_salary_lakhs: string;
  current_employer_type: string[];
  other_certification: string;
  graduation_year: string;
  has_certifications: string[];
  extracurriculars: string[];
  leadership_roles: string;
  preparation_months_remaining: string;
  current_city: string;
  has_gap_years: boolean;
  gap_year_reason: string;
}

const initialForm: FormData = {
  name: "", email: "",
  tenth_score: "", twelfth_score: "", graduation_score: "", graduation_stream: "",
  is_pursuing_graduation: false,
  work_experience_months: "", category: "General", gender: "",
  target_exams: [], target_colleges: [], preferred_specialization: "", target_states: [],
  fee_budget_lakhs: "", expected_salary_lakhs: "", current_employer_type: [],
  other_certification: "",
  graduation_year: "", has_certifications: [], extracurriculars: [],
  leadership_roles: "", preparation_months_remaining: "", current_city: "",
  has_gap_years: false, gap_year_reason: "",
};

/* ──────────── 3D FLOATING ELEMENTS ──────────── */
const Float3DCard = ({ children, className = "", delay = 0, duration = 6 }: { children: React.ReactNode; className?: string; delay?: number; duration?: number }) => (
  <motion.div
    animate={{ y: [0, -18, 0], rotateX: [0, 8, 0], rotateY: [0, -6, 0] }}
    transition={{ repeat: Infinity, duration, ease: "easeInOut", delay }}
    style={{ perspective: "800px", transformStyle: "preserve-3d" }}
    className={className}
  >
    {children}
  </motion.div>
);

const GlowOrb = ({ className = "" }: { className?: string }) => (
  <motion.div
    animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
    className={`absolute rounded-full blur-3xl ${className}`}
  />
);

/* ──────────── ANIMATED SAMPLE REPORT PREVIEW (DETAILED) ──────────── */
const SampleReportPreview = () => {
  const sampleColleges = [
    { name: "IIM Ahmedabad", prob: 18, diff: "Very Hard", tier: "Dream", pkg: "32.5 LPA", fees: "23L", percentile: "99.5+", nirf: 1, highest: "1.2 Cr" },
    { name: "IIM Bangalore", prob: 22, diff: "Very Hard", tier: "Dream", pkg: "31.0 LPA", fees: "23L", percentile: "99.3+", nirf: 2, highest: "85 LPA" },
    { name: "IIM Lucknow", prob: 45, diff: "Hard", tier: "Target", pkg: "26.0 LPA", fees: "19.5L", percentile: "97+", nirf: 4, highest: "55 LPA" },
    { name: "IIM Kozhikode", prob: 52, diff: "Hard", tier: "Target", pkg: "25.5 LPA", fees: "19L", percentile: "96+", nirf: 5, highest: "50 LPA" },
    { name: "IIM Indore", prob: 58, diff: "Medium", tier: "Target", pkg: "24.8 LPA", fees: "18L", percentile: "95+", nirf: 6, highest: "48 LPA" },
    { name: "XLRI Jamshedpur", prob: 65, diff: "Medium", tier: "Safe", pkg: "26.5 LPA", fees: "25L", percentile: "95+ (XAT)", nirf: 8, highest: "52 LPA" },
    { name: "FMS Delhi", prob: 70, diff: "Medium", tier: "Safe", pkg: "32.4 LPA", fees: "2L", percentile: "98+", nirf: 7, highest: "1.1 Cr" },
    { name: "MDI Gurgaon", prob: 72, diff: "Easy", tier: "Safe", pkg: "22.0 LPA", fees: "21L", percentile: "93+", nirf: 12, highest: "42 LPA" },
  ];

  const sampleScores = [
    { label: "Academics", value: 82, color: "from-blue-500 to-blue-600" },
    { label: "Experience", value: 65, color: "from-violet-500 to-violet-600" },
    { label: "Diversity", value: 70, color: "from-amber-500 to-amber-600" },
    { label: "Consistency", value: 78, color: "from-emerald-500 to-emerald-600" },
    { label: "Leadership", value: 60, color: "from-rose-500 to-rose-600" },
  ];

  const sampleStrengths = [
    { title: "Strong Academic Record", impact: "High" },
    { title: "Engineering Background (Diverse)", impact: "Medium" },
  ];
  const sampleWeaknesses = [
    { title: "Limited Work Experience", severity: "High", fix: "Highlight internships & projects in applications" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, rotateX: 15 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: 0.2 }}
      style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
      className="relative max-w-6xl mx-auto"
    >
      <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-3xl blur-2xl opacity-60" />

      <div className="relative bg-card border-2 border-border/60 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header bar */}
        <div className="bg-gradient-to-r from-primary to-primary/80 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={bschoolLogo} alt="B School Buzz" className="w-6 h-6 rounded" />
            <span className="text-primary-foreground font-bold">Sample AI Report — Detailed Preview</span>
          </div>
          <Badge className="bg-primary-foreground/20 text-primary-foreground border-0">Live Preview</Badge>
        </div>

        <div className="p-6 space-y-6">
          {/* Score row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Profile Score", value: "7.8/10", color: "text-amber-500" },
              { label: "Academics", value: "8.2/10", color: "text-green-500" },
              { label: "Experience", value: "6.5/10", color: "text-amber-500" },
              { label: "Diversity", value: "7.0/10", color: "text-blue-500" },
              { label: "Peer Rank", value: "Top 32%", color: "text-primary" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="text-center p-3 rounded-xl bg-muted/50 border border-border/50"
              >
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              </motion.div>
            ))}
          </div>

          {/* 5-Dimension bars */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">5-Dimension Breakdown</p>
            {sampleScores.map((s, i) => (
              <div key={s.label} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-24 shrink-0">{s.label}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${s.value}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.08, duration: 0.5 }}
                    className={`h-full rounded-full bg-gradient-to-r ${s.color}`}
                  />
                </div>
                <span className="text-xs font-bold w-8">{(s.value / 10).toFixed(1)}</span>
              </div>
            ))}
          </div>

          {/* SWOT mini */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 p-3 space-y-2">
              <p className="text-xs font-bold text-green-700 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Strengths</p>
              {sampleStrengths.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.5 + i * 0.1 }}
                  className="text-xs flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-green-200 text-green-800 text-[9px] font-bold">{s.impact}</span>
                  {s.title}
                </motion.div>
              ))}
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-3 space-y-2">
              <p className="text-xs font-bold text-amber-700 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Areas to Improve</p>
              {sampleWeaknesses.map((w, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.6 + i * 0.1 }}
                  className="text-xs">
                  <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-800 text-[9px] font-bold mr-1">{w.severity}</span>
                  {w.title}
                  <p className="text-primary mt-0.5 text-[10px]">Fix: {w.fix}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* College table */}
          <div className="overflow-hidden rounded-xl border border-border/50">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground">
                  <th className="text-left p-2.5 font-medium">College</th>
                  <th className="text-center p-2.5 font-medium">NIRF</th>
                  <th className="text-center p-2.5 font-medium">Fees</th>
                  <th className="text-center p-2.5 font-medium">Avg Pkg</th>
                  <th className="text-center p-2.5 font-medium hidden md:table-cell">Highest</th>
                  <th className="text-center p-2.5 font-medium hidden md:table-cell">Required %ile</th>
                  <th className="text-center p-2.5 font-medium">Chance</th>
                  <th className="text-center p-2.5 font-medium">Difficulty</th>
                </tr>
              </thead>
              <tbody>
                {sampleColleges.map((c, i) => (
                  <motion.tr
                    key={c.name}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.06 }}
                    className="border-t border-border/30"
                  >
                    <td className="p-2.5 font-semibold">{c.name}</td>
                    <td className="p-2.5 text-center">#{c.nirf}</td>
                    <td className="p-2.5 text-center">{c.fees}</td>
                    <td className="p-2.5 text-center font-semibold">{c.pkg}</td>
                    <td className="p-2.5 text-center hidden md:table-cell">{c.highest}</td>
                    <td className="p-2.5 text-center hidden md:table-cell">{c.percentile}</td>
                    <td className="p-2.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            whileInView={{ width: `${c.prob}%` }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.7 + i * 0.06, duration: 0.6 }}
                            className={`h-full rounded-full ${c.prob >= 60 ? "bg-green-500" : c.prob >= 30 ? "bg-amber-500" : "bg-red-500"}`}
                          />
                        </div>
                        <span className="font-bold">{c.prob}%</span>
                      </div>
                    </td>
                    <td className="p-2.5 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        c.diff === "Easy" ? "bg-green-100 text-green-700" :
                        c.diff === "Medium" ? "bg-amber-100 text-amber-700" :
                        c.diff === "Hard" ? "bg-orange-100 text-orange-700" :
                        "bg-red-100 text-red-700"
                      }`}>{c.diff}</span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Blurred unlock CTA */}
          <div className="relative">
            <div className="blur-sm pointer-events-none opacity-50 space-y-3">
              <div className="h-16 bg-muted rounded-xl" />
              <div className="h-12 bg-muted rounded-xl" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Badge variant="outline" className="text-sm px-4 py-2 bg-card/90 backdrop-blur-sm">
                <Lock className="w-3.5 h-3.5 mr-2" /> + Exam Strategy, Study Plan, Peer Comparison & More
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/* ──────────── ANIMATED HOW IT WORKS ──────────── */
const HowItWorksAnimated = () => {
  const steps = [
    { icon: ClipboardList, title: "Fill Your Profile", desc: "Enter academic scores, work experience, and target exams in a simple multi-step form.", color: "from-blue-500 to-blue-600", lightBg: "bg-blue-50 dark:bg-blue-950/30", textColor: "text-blue-600" },
    { icon: Sparkles, title: "AI Analyses 10,000+ Data Points", desc: "Our engine cross-references your profile against historical admission data, cutoffs, and placement records.", color: "from-violet-500 to-violet-600", lightBg: "bg-violet-50 dark:bg-violet-950/30", textColor: "text-violet-600" },
    { icon: BarChart3, title: "Get Detailed Report", desc: "Receive college-wise admission probability, difficulty ratings, peer comparison, and numeric scores across 5 dimensions.", color: "from-amber-500 to-amber-600", lightBg: "bg-amber-50 dark:bg-amber-950/30", textColor: "text-amber-600" },
    { icon: Sparkles, title: "Actionable Roadmap", desc: "Follow your AI-generated study plan, exam strategy, improvement tips, and mentorship recommendations.", color: "from-emerald-500 to-emerald-600", lightBg: "bg-emerald-50 dark:bg-emerald-950/30", textColor: "text-emerald-600" },
  ];

  return (
    <section className="py-20 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-transparent to-muted/30" />
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 text-sm px-4 py-1.5"><Activity className="w-3.5 h-3.5 mr-1.5" /> Simple 4-Step Process</Badge>
          <h2 className="text-3xl md:text-5xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-lg">Our AI-powered engine delivers personalised MBA admission insights in under 60 seconds.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          {/* Animated connector line */}
          <div className="hidden md:block absolute top-20 left-[12.5%] right-[12.5%] h-0.5 overflow-hidden">
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="w-full h-full bg-gradient-to-r from-blue-400 via-violet-400 via-amber-400 to-emerald-400 origin-left"
            />
          </div>

          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2, type: "spring", stiffness: 100 }}
              className="relative z-10"
            >
              <div className="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-3 group h-full text-center">
                <div className="relative mx-auto mb-5">
                  <motion.div
                    whileHover={{ scale: 1.15, rotate: 5 }}
                    className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg relative z-10`}
                  >
                    <s.icon className="w-8 h-8 text-white" />
                  </motion.div>
                  <span className={`absolute -top-2 -right-2 w-8 h-8 rounded-full bg-card border-2 border-border ${s.textColor} text-xs font-extrabold flex items-center justify-center shadow-md z-20`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {/* Pulse ring */}
                  <motion.div
                    animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
                    transition={{ repeat: Infinity, duration: 2, delay: i * 0.3 }}
                    className={`absolute inset-0 mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br ${s.color} opacity-20`}
                  />
                </div>
                <h3 className="font-bold text-base md:text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ──────────── BELL CURVE / PEER COMPARISON ──────────── */
const PeerComparisonScale = ({ peerData, userScore }: { peerData: AnalysisResult["peer_comparison"]; userScore: number }) => {
  if (!peerData || !Array.isArray(peerData.score_distribution) || peerData.score_distribution.length === 0) return null;

  const maxCount = Math.max(...peerData.score_distribution.map(d => d.count));

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> Where You Stand Among {peerData.total_students_analysed?.toLocaleString()}+ Students</CardTitle>
        <CardDescription>Score distribution of all students who have used our Profile Analyser</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rank badge */}
        <div className="flex flex-wrap items-center justify-center gap-6">
          <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <p className="text-sm text-muted-foreground mb-1">Your Percentile Rank</p>
            <p className="text-4xl font-bold text-primary">Top {100 - (peerData.your_rank_percentile || 50)}%</p>
          </div>
          <div className="text-center p-4 rounded-2xl bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground mb-1">Average Score</p>
            <p className="text-3xl font-bold text-muted-foreground">{peerData.average_score}/10</p>
          </div>
          <div className="text-center p-4 rounded-2xl bg-muted/50 border border-border">
            <p className="text-sm text-muted-foreground mb-1">Your Score</p>
            <p className={`text-3xl font-bold ${userScore >= 8 ? "text-green-600" : userScore >= 6 ? "text-amber-600" : "text-red-600"}`}>{userScore}/10</p>
          </div>
        </div>

        {/* Distribution chart */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Score Distribution (Bell Curve)</p>
          <div className="flex items-end gap-1 h-40 p-4 bg-muted/30 rounded-xl border border-border/50">
            {peerData.score_distribution?.map((bucket, i) => {
              const height = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1 h-full">
                  <motion.div
                    initial={{ height: 0 }}
                    whileInView={{ height: `${height}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05, duration: 0.5 }}
                    className={`w-full rounded-t-md transition-colors ${
                      bucket.is_yours
                        ? "bg-primary shadow-lg ring-2 ring-primary/30"
                        : "bg-muted-foreground/20 hover:bg-muted-foreground/30"
                    }`}
                  />
                  <span className={`text-[9px] ${bucket.is_yours ? "text-primary font-bold" : "text-muted-foreground"}`}>{bucket.range}</span>
                  {bucket.is_yours && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-1">
                      <span className="text-[8px] bg-primary text-primary-foreground px-1 rounded">YOU</span>
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground px-4">
            <span>Low Scores</span>
            <span>High Scores</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/* ──────────── SCORE RADAR (MULTI-DIMENSION) ──────────── */
const ScoreRadar = ({ breakdown }: { breakdown: AnalysisResult["score_breakdown"] }) => {
  if (!breakdown) return null;
  const dimensions = [
    { label: "Academics", value: breakdown.academics_score, icon: GraduationCap, color: "from-blue-500 to-blue-600" },
    { label: "Work Experience", value: breakdown.work_experience_score, icon: Briefcase, color: "from-violet-500 to-violet-600" },
    { label: "Profile Diversity", value: breakdown.diversity_score, icon: Layers, color: "from-amber-500 to-amber-600" },
    { label: "Consistency", value: breakdown.profile_consistency_score || 0, icon: Target, color: "from-emerald-500 to-emerald-600" },
    { label: "Leadership", value: breakdown.leadership_potential_score || 0, icon: Flame, color: "from-rose-500 to-rose-600" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><PieChart className="w-5 h-5 text-primary" /> 5-Dimension Score Breakdown</CardTitle>
        <CardDescription>Your profile evaluated across key MBA admission dimensions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {dimensions.map((d, i) => (
            <motion.div
              key={d.label}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-4"
            >
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${d.color} flex items-center justify-center shrink-0`}>
                <d.icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">{d.label}</span>
                  <span className={`text-sm font-bold ${d.value >= 8 ? "text-green-600" : d.value >= 6 ? "text-amber-600" : "text-red-600"}`}>{d.value}/10</span>
                </div>
                <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${d.value * 10}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }}
                    className={`h-full rounded-full bg-gradient-to-r ${d.color}`}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border/50 text-center">
          <p className="text-sm text-muted-foreground mb-1">Overall Competitiveness</p>
          <Badge className="text-base px-4 py-1">{breakdown.overall_competitiveness}</Badge>
        </div>
      </CardContent>
    </Card>
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
  const [compareA, setCompareA] = useState<string>("");
  const [compareB, setCompareB] = useState<string>("");
  const [cooldownDate, setCooldownDate] = useState<Date | null>(null);
  const [existingReport, setExistingReport] = useState<any>(null);
  const [checkingCooldown, setCheckingCooldown] = useState(false);
  // Phone + OTP state for Step 1
  const [phone, setPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpStep, setOtpStep] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);
  const [narrative, setNarrative] = useState<PremiumNarrative | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  // Admin: force a fresh re-test, bypassing existing analysis + cooldown + AI cache
  const [forceRetest, setForceRetest] = useState(false);

  const handleAdminRetest = () => {
    setForceRetest(true);
    setResult(null);
    setUnlocked(false);
    setNarrative(null);
    setExistingReport(null);
    setCooldownDate(null);
    setStep(1);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast({ title: "Admin re-test mode", description: "Starting a fresh analysis. Cache & cooldown bypassed." });
  };

  // Fetch premium narrative once the report is unlocked
  useEffect(() => {
    if (!unlocked || !result?.profile_id || narrative || narrativeLoading) return;
    setNarrativeLoading(true);
    supabase.functions
      .invoke("premium-profile-report", {
        body: {
          profile_id: result.profile_id,
          profile_score: result.profile_score,
          rank_percentile: result.peer_comparison?.your_rank_percentile,
          strengths: result.strengths?.map((s) => ({ title: s.title, impact: s.impact })),
          weaknesses: result.weaknesses?.map((w) => ({ title: w.title, severity: w.severity })),
          top_colleges: result.detailed_college_table?.slice(0, 5).map((c) => c.college_name),
          target_exams: form.target_exams,
          force_refresh: forceRetest && isAdmin,
        },
      })
      .then(({ data, error }) => {
        if (error) { console.error("[premium-narrative]", error); return; }
        if (data && !data.error) setNarrative(data);
      })
      .finally(() => setNarrativeLoading(false));
  }, [unlocked, result?.profile_id]);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setInterval(() => setResendTimer(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendTimer]);

  const handleSendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      toast({ title: "Invalid phone", description: "Enter a valid 10-digit Indian mobile number.", variant: "destructive" });
      return;
    }
    setOtpSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", { body: { phone } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      toast({ title: "OTP Sent!", description: `A 6-digit OTP has been sent to +91 ${phone}` });
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
      const { data, error } = await supabase.functions.invoke("verify-otp", { body: { phone, otp: otpValue } });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.verified) {
        setPhoneVerified(true);
        setOtpStep(false);
        toast({ title: "Phone Verified ✓", description: "Your mobile has been verified." });
      }
    } catch (e: any) {
      toast({ title: "Verification failed", description: e.message, variant: "destructive" });
    } finally { setOtpVerifying(false); }
  };

  // Check if user already has an analysis — if so, load full results and show report
  // Skipped entirely when admin has triggered a forced re-test.
  useEffect(() => {
    const checkExistingAnalysis = async () => {
      if (forceRetest) return;
      if (!user) { setCooldownDate(null); setExistingReport(null); return; }
      setCheckingCooldown(true);
      try {
        const { data: profileData } = await supabase
          .from("profile_analyses")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (profileData) {
          setExistingReport(profileData);
          setCooldownDate(new Date(new Date(profileData.created_at).getTime() + 60 * 24 * 60 * 60 * 1000));

          // Fetch full analysis results
          const { data: analysisData } = await supabase
            .from("analysis_results")
            .select("*")
            .eq("profile_analysis_id", profileData.id)
            .maybeSingle();

          if (analysisData) {
            // Reconstruct the result object as it would have been returned by the edge function
            const reconstructed: any = {
              profile_id: profileData.id,
              profile_score: profileData.profile_score,
              strengths: Array.isArray(analysisData.strengths) ? analysisData.strengths : [],
              weaknesses: Array.isArray(analysisData.weaknesses) ? analysisData.weaknesses : [],
              college_predictions: analysisData.college_predictions,
              recommendations: Array.isArray(analysisData.recommendations) ? analysisData.recommendations : [],
              study_plan: Array.isArray(analysisData.study_plan) ? analysisData.study_plan : [],
              ai_summary: analysisData.ai_summary,
              // Extract nested fields from probability_scores
              score_breakdown: analysisData.probability_scores,
              exam_strategy: Array.isArray((analysisData.probability_scores as any)?.exam_strategy) ? (analysisData.probability_scores as any).exam_strategy : [],
              peer_comparison: (analysisData.probability_scores as any)?.peer_comparison || null,
              roi_analysis: Array.isArray((analysisData.probability_scores as any)?.roi_analysis) ? (analysisData.probability_scores as any).roi_analysis : [],
              salary_benchmarking: (analysisData.probability_scores as any)?.salary_benchmarking || null,
              improvement_roadmap: Array.isArray((analysisData.probability_scores as any)?.improvement_roadmap) ? (analysisData.probability_scores as any).improvement_roadmap : [],
              detailed_college_table: Array.isArray((analysisData.college_predictions as any)?.detailed_college_table) ? (analysisData.college_predictions as any).detailed_college_table : Array.isArray(analysisData.college_predictions) ? analysisData.college_predictions : [],
            };
            setResult(reconstructed);
            setUnlocked(true);
            // Always show full unlocked report
            setStep(8);
          }
        } else {
          setCooldownDate(null);
          setExistingReport(null);
        }
      } catch { /* ignore */ }
      setCheckingCooldown(false);
    };
    checkExistingAnalysis();
  }, [user, forceRetest]);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)); }, [form]);

  const updateField = (key: keyof FormData, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const toggleArrayItem = (key: "target_exams" | "target_colleges" | "target_states" | "has_certifications" | "extracurriculars" | "current_employer_type", item: string) => {
    setForm(prev => ({
      ...prev,
      [key]: (prev[key] as string[]).includes(item) ? (prev[key] as string[]).filter(c => c !== item) : [...(prev[key] as string[]), item],
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
      if (!/^[6-9]\d{9}$/.test(phone)) errs.phone = "Enter a valid 10-digit Indian mobile number";
      else if (!phoneVerified) errs.phone = "Please verify your mobile number with OTP";
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

  const handleNext = () => { if (validateStep(step)) { setStep(step + 1); window.scrollTo({ top: 0, behavior: "smooth" }); } };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;
    // Enforce 60-day cooldown for logged-in users (admins can bypass via Re-test)
    if (user && cooldownDate && cooldownDate > new Date() && !(isAdmin && forceRetest)) {
      toast({
        title: "Cooldown Active",
        description: `You can re-analyze after ${cooldownDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}. View your existing report on the dashboard.`,
        variant: "destructive",
      });
      return;
    }
    setStep(6);
    setLoadingProgress(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
    const loadingStages = [
      { target: 8, label: "Evaluating academic profile..." },
      { target: 16, label: "Scoring work experience..." },
      { target: 24, label: "Computing 5-dimension scores..." },
      { target: 32, label: "Matching against 50+ colleges..." },
      { target: 40, label: "Running peer comparison..." },
      { target: 48, label: "Building personalised roadmap..." },
      { target: 55, label: "Analysing additional datasets..." },
      { target: 62, label: "Cross-referencing admission data..." },
      { target: 68, label: "Generating ROI projections..." },
      { target: 73, label: "Calculating salary benchmarks..." },
      { target: 77, label: "Building improvement timeline..." },
      { target: 80, label: "Ranking college fit scores..." },
      { target: 83, label: "Comparing with peer cohorts..." },
      { target: 85, label: "Generating visual insights..." },
      { target: 87, label: "Polishing your report..." },
    ];
    let stageIndex = 0;
    let slowTick = 0;
    const interval = setInterval(() => {
      setLoadingProgress(prev => {
        if (stageIndex < loadingStages.length) {
          const target = loadingStages[stageIndex].target;
          if (prev >= target - 0.5) { stageIndex++; }
          return Math.min(prev + Math.random() * 1.2 + 0.3, stageIndex < loadingStages.length ? loadingStages[stageIndex].target : 87);
        }
        // After all stages, crawl very slowly — never exceed 95
        slowTick++;
        const crawl = 0.08 / (1 + slowTick * 0.05);
        return Math.min(prev + crawl, 95);
      });
    }, 600);

    try {
      const { data, error } = await supabase.functions.invoke("profile-analyzer", {
        body: {
          user_id: user?.id || undefined,
          name: form.name, email: form.email, phone: phone || undefined,
          tenth_score: +form.tenth_score, twelfth_score: +form.twelfth_score,
          graduation_score: +form.graduation_score, graduation_stream: form.graduation_stream,
          is_pursuing_graduation: form.is_pursuing_graduation,
          work_experience_months: +form.work_experience_months || 0,
          category: form.category, gender: form.gender || undefined,
          target_exams: form.target_exams, target_colleges: form.target_colleges,
          preferred_specialization: form.preferred_specialization || undefined,
          target_states: form.target_states,
          fee_budget_lakhs: form.fee_budget_lakhs ? +form.fee_budget_lakhs : undefined,
          expected_salary_lakhs: form.expected_salary_lakhs ? +form.expected_salary_lakhs : undefined,
          current_employer_type: (form.current_employer_type as string[]).length ? (form.current_employer_type as string[]) : undefined,
          graduation_year: form.graduation_year ? +form.graduation_year : undefined,
          has_certifications: form.has_certifications.length ? form.has_certifications : undefined,
          extracurriculars: form.extracurriculars.length ? form.extracurriculars : undefined,
          leadership_roles: form.leadership_roles || undefined,
          preparation_months_remaining: form.preparation_months_remaining ? +form.preparation_months_remaining : undefined,
          current_city: form.current_city || undefined,
          has_gap_years: form.has_gap_years,
          gap_year_reason: form.has_gap_years ? form.gap_year_reason : undefined,
        },
      });
      clearInterval(interval);
      setLoadingProgress(100);
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      // Persist verified phone immediately so the lead is captured
      try {
        if (data?.profile_id) {
          await supabase.from("profile_analyses").update({
            phone: phone || null,
            email: form.email || null,
            report_unlocked: true,
          }).eq("id", data.profile_id);
        }
      } catch { /* non-fatal */ }
      setUnlocked(true);
      localStorage.removeItem(STORAGE_KEY);
      setTimeout(() => { setStep(8); window.scrollTo({ top: 0, behavior: "smooth" }); }, 600);
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
      setStep(8);
      window.scrollTo({ top: 0, behavior: "smooth" });
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
  const normalizeProb = (p: number) => (p > 0 && p <= 1) ? Math.round(p * 100) : Math.round(p);
  const probColor = (p: number) => { const n = normalizeProb(p); return n >= 60 ? "bg-green-500" : n >= 30 ? "bg-amber-500" : "bg-red-500"; };
  const diffColor = (d: string) => {
    if (d === "Easy") return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (d === "Medium") return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    if (d === "Hard") return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  };

  const sortedColleges = useMemo(() => {
    if (!result?.detailed_college_table || !Array.isArray(result.detailed_college_table)) return [];
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
      { name: "AI Profile Analyser", url: "/profile-analyzer" },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "AI-Powered MBA Profile Analyser by B School Buzz",
      "applicationCategory": "EducationalApplication",
      "operatingSystem": "Web",
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "INR" },
      "description": "Free AI-powered tool to check your IIM admission chances. Get personalised college comparison, difficulty ratings, and preparation roadmap.",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "Is the MBA Profile Analyser really free?", "acceptedAnswer": { "@type": "Answer", "text": "Yes, our AI-powered MBA profile analyser is 100% free with no hidden charges." } },
        { "@type": "Question", "name": "How accurate is the IIM admission probability calculator?", "acceptedAnswer": { "@type": "Answer", "text": "Our tool is trained on data from 25,000+ MBA aspirants and historical admission trends from all IIMs, XLRI, FMS, and 50+ top B-schools." } },
        { "@type": "Question", "name": "Which MBA entrance exams does this tool support?", "acceptedAnswer": { "@type": "Answer", "text": "The profile analyser supports CAT, XAT, NMAT, SNAP, CMAT, MAT, GMAT, IIFT, TISSNET, and ATMA." } },
        { "@type": "Question", "name": "Can I retake the MBA profile analysis?", "acceptedAnswer": { "@type": "Answer", "text": "You can retake the analysis after a 60-day cooldown period." } },
        { "@type": "Question", "name": "What is the difference between Dream, Target, and Safe colleges?", "acceptedAnswer": { "@type": "Answer", "text": "Dream colleges have below 30% admission probability, Target colleges have 30-60%, and Safe colleges have above 60% probability." } },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <SEOHead
        title="AI MBA Profile Analyser — Check IIM Admission Chances Free | BSchoolBuzz"
        description="Analyse your MBA profile with AI. Get personalised IIM admission probability, 5-dimension score breakdown, peer comparison among 25,000+ students, college-wise difficulty ratings, and detailed preparation roadmap. 100% Free."
        keywords={[
          "MBA profile check", "B-school eligibility", "profile evaluation", "admission chances",
          "check profile for IIM admission eligibility", "MBA profile evaluation for study abroad",
          "is my academic profile good enough for CAT", "chances of getting into IIM with low academics",
          "how to build a strong profile for MBA", "profile evaluation for ISB and top private colleges",
          "MBA profile analyser", "IIM chances calculator", "CAT score predictor", "MBA admission probability",
          "free MBA profile evaluation", "check IIM chances", "IIM admission probability calculator",
        ]}
        canonical="https://bschoolbuzz.com/profile-analyzer"
        ogType="website"
        ogTitle="AI-Powered MBA Profile Analyser by BSchoolBuzz"
        ogDescription="Get personalised college predictions, 5-dimension scoring, peer ranking among 25,000+ students, and AI-powered preparation roadmap for IIM, XLRI, FMS and 50+ top MBA colleges."
        jsonLd={jsonLd}
      />

      <AnimatePresence mode="wait">
        {/* ════════════════ LANDING ════════════════ */}
        {step === 0 && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }}>

            {/* ──── HERO with 3D Elements ──── */}
            <section className="min-h-[90vh] flex items-center justify-center px-4 relative overflow-hidden">
              {/* Background glow orbs */}
              <GlowOrb className="w-72 h-72 bg-primary/20 top-[-5%] left-[-5%]" />
              <GlowOrb className="w-96 h-96 bg-primary/10 bottom-[-10%] right-[-8%]" />
              <GlowOrb className="w-48 h-48 bg-primary/15 top-[40%] right-[20%]" />

              {/* Animated dot grid */}
              <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

              {/* 3D floating elements */}
              <Float3DCard className="absolute top-[12%] left-[6%] hidden lg:block" delay={0} duration={6}>
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-300/30 flex items-center justify-center backdrop-blur-sm shadow-xl">
                  <GraduationCap className="w-10 h-10 text-blue-500/60" />
                </div>
              </Float3DCard>
              <Float3DCard className="absolute top-[20%] right-[8%] hidden lg:block" delay={1} duration={7}>
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-300/30 flex items-center justify-center backdrop-blur-sm shadow-xl">
                  <BarChart3 className="w-12 h-12 text-violet-500/60" />
                </div>
              </Float3DCard>
              <Float3DCard className="absolute bottom-[18%] left-[10%] hidden lg:block" delay={2} duration={5}>
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-300/30 flex items-center justify-center backdrop-blur-sm shadow-xl">
                  <Target className="w-8 h-8 text-amber-500/60" />
                </div>
              </Float3DCard>
              <Float3DCard className="absolute bottom-[25%] right-[12%] hidden lg:block" delay={0.5} duration={8}>
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-300/30 flex items-center justify-center backdrop-blur-sm shadow-xl">
                  <img src={bschoolLogo} alt="B School Buzz" className="w-8 h-8 rounded-lg" />
                </div>
              </Float3DCard>

              {/* Animated light streaks */}
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                className="absolute top-[30%] left-0 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"
              />
              <motion.div
                animate={{ x: ["200%", "-100%"] }}
                transition={{ repeat: Infinity, duration: 10, ease: "linear", delay: 3 }}
                className="absolute top-[60%] left-0 w-1/4 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent"
              />

              <div className="max-w-5xl mx-auto text-center space-y-8 relative z-10">
                {/* Animated logo icon */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 100, delay: 0.1 }}
                >
                  <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/60 flex items-center justify-center shadow-2xl relative overflow-hidden">
                    <img src={bschoolLogo} alt="B School Buzz" className="w-14 h-14 rounded-xl" />
                    <motion.div
                      animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute inset-0 rounded-3xl bg-primary/20"
                    />
                  </div>
                </motion.div>

                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                  <Badge variant="secondary" className="text-sm px-5 py-2 mb-4 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" /> AI-Powered Tool by B School Buzz
                  </Badge>
                </motion.div>

                <motion.h1
                  initial={{ y: 40, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, type: "spring", stiffness: 80 }}
                  className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]"
                >
                  <span className="block">AI-Powered MBA</span>
                  <span className="block bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                    Profile Analyser
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed"
                >
                  Check your admission chances for IIMs and 50+ top MBA colleges. Get a <strong>5-dimension score breakdown</strong>,{" "}
                  <strong>peer comparison</strong> among 25,000+ students, and a personalised preparation roadmap — all in 60 seconds.
                </motion.p>

                {/* Feature pills */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.55 }}
                  className="flex flex-wrap justify-center gap-3"
                >
                  {[
                    { icon: Activity, label: "10,000+ Data Points" },
                    { icon: Sparkles, label: "AI-Powered Analysis" },
                    { icon: Users, label: "Peer Comparison" },
                    { icon: PieChart, label: "5-Dimension Scoring" },
                    { icon: Shield, label: "100% Free" },
                  ].map((t, i) => (
                    <motion.div
                      key={t.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 + i * 0.08 }}
                      className="flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-border/50 rounded-full px-4 py-2 text-sm text-muted-foreground shadow-sm hover:shadow-md transition-shadow"
                    >
                      <t.icon className="w-4 h-4 text-primary" /> {t.label}
                    </motion.div>
                  ))}
                </motion.div>

                {/* Cooldown Banner */}
                {user && cooldownDate && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.65 }}>
                    <Card className="max-w-lg mx-auto border-amber-500/30 bg-amber-500/5">
                      <CardContent className="py-4 text-center space-y-2">
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center justify-center gap-2">
                          <Clock className="w-4 h-4" /> Cooldown Active
                        </p>
                        <p className="text-xs text-muted-foreground">
                          You can re-analyze your profile after <strong>{cooldownDate.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong>.
                          Your last report is available on your dashboard anytime.
                        </p>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => window.location.href = "/dashboard"}>
                            <Eye className="w-3.5 h-3.5 mr-1.5" /> View My Report
                          </Button>
                          {isAdmin && (
                            <Button size="sm" variant="default" onClick={handleAdminRetest}>
                              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Admin: Re-test (skip cache)
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* CTA */}
                <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}>
                  <Button
                    size="lg"
                    onClick={() => {
                      if (isAdmin && cooldownDate) handleAdminRetest();
                      else { setStep(1); window.scrollTo({ top: 0, behavior: "smooth" }); }
                    }}
                    disabled={!!(user && cooldownDate) && !isAdmin}
                    className="text-lg px-12 py-7 rounded-2xl shadow-2xl hover:shadow-3xl transition-all group relative overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      {user && cooldownDate
                        ? (isAdmin ? "Admin: Start Fresh Re-test" : "Analysis Cooldown Active")
                        : "Start Free Analysis"} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <motion.div
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/10 to-transparent"
                    />
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3">
                    {user && cooldownDate
                      ? (isAdmin ? "Admin mode: cache & cooldown will be bypassed" : "You can re-check after 60 days from last analysis")
                      : "100% free • Mobile verified • Instant AI report"}
                  </p>
                </motion.div>

                {/* Stats row */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6"
                >
                  {[
                    { icon: GraduationCap, value: "50+", label: "Colleges Compared", sub: "IIMs, XLRI, FMS & more" },
                    { icon: Sparkles, value: "AI", label: "Powered Analysis", sub: "Advanced AI Engine" },
                    { icon: TrendingUp, value: "85%+", label: "Match Accuracy", sub: "Data-driven predictions" },
                    { icon: Users, value: "25,000+", label: "Students Analysed", sub: "Growing community" },
                  ].map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1 + i * 0.1 }}
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50 shadow-sm hover:shadow-lg transition-all"
                    >
                      <item.icon className="w-8 h-8 text-primary" />
                      <span className="text-2xl font-bold">{item.value}</span>
                      <span className="text-xs font-medium">{item.label}</span>
                      <span className="text-[10px] text-muted-foreground">{item.sub}</span>
                    </motion.div>
                  ))}
                </motion.div>
              </div>

              {/* Bottom wave */}
              <div className="absolute bottom-0 left-0 right-0">
                <svg viewBox="0 0 1440 100" fill="none" className="w-full h-16 md:h-24">
                  <path d="M0,60 C360,90 720,20 1080,50 C1260,65 1380,80 1440,70 L1440,100 L0,100 Z" className="fill-muted/30" />
                </svg>
              </div>
            </section>

            {/* ──── How It Works (Animated) ──── */}
            <HowItWorksAnimated />

            {/* ──── Sample Report Preview ──── */}
            <section className="py-20 px-4">
              <div className="max-w-6xl mx-auto">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
                  <Badge variant="secondary" className="mb-4 text-sm px-4 py-1.5"><Eye className="w-3.5 h-3.5 mr-1.5" /> Live Preview</Badge>
                  <h2 className="text-3xl md:text-5xl font-bold mb-4">See What Your Report Looks Like</h2>
                  <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Here is a sample AI-generated report. Your report will be personalised based on your unique profile data.</p>
                </motion.div>
                <SampleReportPreview />
              </div>
            </section>

            {/* ──── What You Get (Enhanced) ──── */}
            <section className="py-20 px-4 bg-muted/30 relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
              <div className="max-w-6xl mx-auto relative z-10">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">What Your Report Includes</h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto text-lg">A comprehensive, data-driven analysis tailored to your unique profile — more detailed than any other MBA tool available.</p>
                </motion.div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { icon: BarChart3, title: "Detailed College Table", desc: "15-25 colleges with fees, packages, required percentile, difficulty rating, and your admission probability — all personalised.", color: "from-blue-500 to-blue-600" },
                    { icon: PieChart, title: "5-Dimension Scoring", desc: "Numeric scores for Academics, Experience, Diversity, Consistency, and Leadership Potential. See exactly where you excel.", color: "from-violet-500 to-violet-600" },
                    { icon: Users, title: "Peer Comparison Scale", desc: "See where you stand among 25,000+ students on a bell curve. Know your percentile rank instantly.", color: "from-emerald-500 to-emerald-600" },
                    { icon: Target, title: "College Shortlist (D/T/S)", desc: "Colleges categorised as Dream, Target, and Safe with probability bars, cutoff data, and specific tips.", color: "from-amber-500 to-amber-600" },
                    { icon: Flame, title: "Exam Strategy", desc: "Exam-wise recommendations with target scores, preparation time, difficulty rating, and ROI for each MBA entrance exam.", color: "from-rose-500 to-rose-600" },
                    { icon: Lightbulb, title: "AI Recommendations", desc: "6-8 actionable steps prioritised by impact with timelines. Personalised improvement roadmap for your specific profile.", color: "from-indigo-500 to-indigo-600" },
                    { icon: Calendar, title: "Phase-wise Study Plan", desc: "Month-by-month preparation schedule with daily hours, focus areas, milestone scores, and target percentiles.", color: "from-cyan-500 to-cyan-600" },
                    { icon: CheckCircle2, title: "SWOT Analysis", desc: "Detailed strengths and weaknesses with severity ratings and specific actionable fixes for each weakness.", color: "from-teal-500 to-teal-600" },
                    { icon: Save, title: "Save & Track", desc: "Save your report to your dashboard. Track progress over time and re-analyse as your profile improves.", color: "from-orange-500 to-orange-600" },
                  ].map((item, i) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.08 }}
                    >
                      <Card className="h-full hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-border/50 group">
                        <CardContent className="pt-6">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                            <item.icon className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="font-bold mb-2 text-base">{item.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </div>
            </section>

            {/* ──── Testimonials / Social Proof ──── */}
            <section className="py-20 px-4">
              <div className="max-w-4xl mx-auto text-center">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                  <h2 className="text-3xl md:text-4xl font-bold mb-6">Trusted by MBA Aspirants Across India</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    {[
                      { quote: "The college comparison table with difficulty ratings helped me focus my preparation on the right colleges.", author: "Priya S., CAT 98.2%ile" },
                      { quote: "I love the peer comparison feature. Knowing where I stand among 25,000+ students was eye-opening.", author: "Rahul M., IIM Lucknow" },
                      { quote: "The 5-dimension scoring showed me my leadership gap. I worked on it and it made a real difference in my PI.", author: "Ananya K., XLRI" },
                    ].map((t, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.15 }}
                        className="p-6 rounded-2xl bg-card border border-border/50 text-left"
                      >
                        <div className="flex gap-0.5 mb-3">{[1,2,3,4,5].map(s => <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />)}</div>
                        <p className="text-sm text-muted-foreground mb-3 italic">"{t.quote}"</p>
                        <p className="text-xs font-semibold">{t.author}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </section>

            {/* ──── Final CTA ──── */}
            <section className="py-20 px-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5" />
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mx-auto text-center relative z-10">
                <img src={bschoolLogo} alt="B School Buzz" className="w-16 h-16 mx-auto rounded-2xl shadow-lg mb-6" />
                <h2 className="text-3xl md:text-5xl font-bold mb-4">Ready to Know Your MBA Chances?</h2>
                <p className="text-muted-foreground text-lg mb-8">Takes less than 2 minutes. 100% free. Mobile verified for your privacy. Instant AI-powered results.</p>
                <Button size="lg" onClick={() => { setStep(1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-lg px-12 py-7 rounded-2xl shadow-2xl group">
                  Start Free Analysis <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            </section>

            {/* ──── SEO-RICH BOTTOM CONTENT ──── */}
            <section className="py-16 px-4 bg-muted/30">
              <div className="max-w-5xl mx-auto space-y-12">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                  <h2 className="text-2xl md:text-3xl font-bold mb-4">What is an MBA Profile Analyser?</h2>
                  <p className="text-muted-foreground leading-relaxed">
                    An MBA Profile Analyser is an AI-powered tool that evaluates your academic credentials, work experience, extracurricular achievements, and diversity factors to predict your admission chances at top MBA colleges in India. Our free MBA profile evaluation tool uses advanced machine learning algorithms trained on data from 25,000+ MBA aspirants to provide accurate IIM admission probability, personalised college recommendations, and a detailed preparation roadmap. Whether you're targeting IIM Ahmedabad, IIM Bangalore, IIM Calcutta, XLRI Jamshedpur, FMS Delhi, or any of the 50+ top B-schools in India, our AI-powered MBA profile checker gives you a comprehensive 5-dimension score breakdown covering academics, work experience, diversity, profile consistency, and leadership potential.
                  </p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                  <h3 className="text-xl font-bold mb-3">How Does the AI MBA Profile Evaluation Work?</h3>
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    Our MBA admission predictor analyses your profile across multiple parameters that top B-schools consider during their selection process. The tool evaluates your 10th and 12th percentage, graduation CGPA, entrance exam scores (CAT, XAT, NMAT, SNAP, GMAT, CMAT, MAT, IIFT), work experience quality, and diversity factors. It then compares your profile against historical admission data from IIMs, XLRI, FMS, MDI, SPJIMR, NMIMS, and other premier MBA institutions to generate personalised admission probability scores.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { title: "CAT Score Predictor & IIM Chances", desc: "Get your predicted CAT percentile range and admission probability at all 20 IIMs based on your academic profile, category, and work experience." },
                      { title: "MBA College Comparison with Difficulty Ratings", desc: "Compare colleges side-by-side with placement statistics, fees, NIRF rankings, required percentiles, and personalised difficulty ratings." },
                      { title: "Peer Comparison Among 25,000+ Aspirants", desc: "See where you stand among thousands of MBA aspirants. Know your percentile rank and identify areas for improvement." },
                      { title: "Personalised MBA Preparation Roadmap", desc: "Get a phase-wise study plan with daily hours, target scores, focus areas, and timeline customised to your profile strengths and weaknesses." },
                    ].map((item, i) => (
                      <div key={i} className="p-4 rounded-xl bg-card border border-border/50">
                        <h4 className="font-semibold text-sm mb-1">{item.title}</h4>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                  <h3 className="text-xl font-bold mb-3">Frequently Asked Questions About MBA Profile Analysis</h3>
                  <div className="space-y-4">
                    {[
                      { q: "Is the MBA Profile Analyser really free?", a: "Yes, our AI-powered MBA profile analyser is 100% free. You get a comprehensive 5-dimension score breakdown, college predictions, and peer comparison without any payment or hidden charges." },
                      { q: "How accurate is the IIM admission probability calculator?", a: "Our tool is trained on data from 25,000+ MBA aspirants and historical admission trends from all IIMs, XLRI, FMS, and 50+ top B-schools. The prediction accuracy improves continuously as more students use the tool." },
                      { q: "Which MBA entrance exams does this tool support?", a: "The profile analyser supports CAT, XAT, NMAT, SNAP, CMAT, MAT, GMAT, IIFT, TISSNET, and ATMA — covering all major MBA entrance exams in India." },
                      { q: "Can I retake the MBA profile analysis?", a: "You can retake the analysis after a 60-day cooldown period. This ensures you have time to work on your profile improvements before re-evaluating." },
                      { q: "What is the difference between Dream, Target, and Safe colleges?", a: "Dream colleges are where your admission chances are below 30%, Target colleges have 30-60% probability, and Safe colleges have above 60% admission probability based on your profile." },
                    ].map((faq, i) => (
                      <div key={i} className="p-4 rounded-xl bg-card border border-border/50">
                        <h4 className="font-semibold text-sm mb-1">{faq.q}</h4>
                        <p className="text-xs text-muted-foreground">{faq.a}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                  <h3 className="text-xl font-bold mb-3">Top MBA Colleges Covered in Our Analysis</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    IIM Ahmedabad • IIM Bangalore • IIM Calcutta • IIM Lucknow • IIM Kozhikode • IIM Indore • IIM Shillong • IIM Rohtak • IIM Ranchi • IIM Kashipur • IIM Trichy • IIM Udaipur • IIM Nagpur • IIM Amritsar • IIM Bodh Gaya • IIM Jammu • IIM Sambalpur • IIM Sirmaur • IIM Visakhapatnam • FMS Delhi • XLRI Jamshedpur • IIFT Delhi • MDI Gurgaon • SPJIMR Mumbai • NMIMS Mumbai • SIBM Pune • SCMHRD Pune • IIT Bombay SJMSOM • IIT Delhi DMS • IIT Kharagpur VGSoM • NITIE Mumbai • JBIMS Mumbai • TISS Mumbai • Great Lakes Chennai • IMT Ghaziabad • TAPMI Manipal
                  </p>
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>Related Searches:</strong> MBA profile checker, IIM admission chances calculator, CAT percentile predictor, MBA college predictor India, free MBA profile evaluation, B School Buzz profile analyser, check my IIM chances, MBA admission probability tool, best MBA coaching for CAT, XAT preparation profile analysis, NMAT score predictor, SNAP exam college predictor, should I do MBA, MBA after engineering chances, MBA for working professionals admission chances, IIM fees and placement comparison, MBA ROI calculator India, top MBA colleges accepting CAT score, MBA colleges in Mumbai Delhi Bangalore, MBA entrance exam difficulty comparison
                  </p>
                </motion.div>
              </div>
            </section>
          </motion.div>
        )}

        {/* ════════════════ FORM STEPS 1-4 ════════════════ */}
        {step >= 1 && step <= 5 && (
          <motion.div key={`step-${step}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="max-w-2xl mx-auto px-4 py-12">
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-muted-foreground">Step {step} of 5</span>
                <span className="text-sm text-muted-foreground">{Math.round((step / 5) * 100)}%</span>
              </div>
              <Progress value={(step / 5) * 100} className="h-2" />
              <div className="flex justify-between mt-2">
                {[
                  { icon: User, label: "Basic Info" },
                  { icon: GraduationCap, label: "Academics" },
                  { icon: Briefcase, label: "Profile" },
                  { icon: Target, label: "Aspirations" },
                  { icon: IndianRupee, label: "Financial & Extras" },
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
                  {step === 5 && <><IndianRupee className="w-5 h-5 text-primary" /> Financial & Profile Extras</>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {step === 1 && (
                  <>
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 mb-2">
                      <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                        <Mail className="w-4 h-4 shrink-0" />
                        Kindly enter your correct email — we will send your detailed report over your email.
                      </p>
                    </div>
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
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Mobile Number <span className="text-destructive">*</span></Label>
                      <div className="relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">+91</div>
                        <Input
                          type="tel"
                          inputMode="numeric"
                          maxLength={10}
                          placeholder="Enter 10-digit mobile number"
                          value={phone}
                          onChange={e => {
                            const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                            setPhone(v);
                            setPhoneVerified(false);
                            setOtpStep(false);
                            setOtpValue("");
                          }}
                          disabled={phoneVerified}
                          className={`pl-12 pr-28 ${errors.phone ? "border-destructive" : ""} ${phoneVerified ? "border-emerald-500" : ""}`}
                        />
                        {phoneVerified ? (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="w-4 h-4" /> Verified
                          </span>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 text-xs"
                            onClick={handleSendOtp}
                            disabled={phone.length !== 10 || otpSending}
                          >
                            {otpSending ? "Sending..." : otpStep ? "Resend" : "Send OTP"}
                          </Button>
                        )}
                      </div>
                      {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                      {otpStep && !phoneVerified && (
                        <div className="mt-3 space-y-2 p-3 rounded-md border border-border bg-muted/40">
                          <p className="text-xs text-muted-foreground">Enter the 6-digit OTP sent to +91 {phone}</p>
                          <div className="flex justify-center">
                            <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
                              <InputOTPGroup>
                                {[0,1,2,3,4,5].map((i) => <InputOTPSlot key={i} index={i} />)}
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              className="text-xs text-primary hover:underline disabled:opacity-50"
                              disabled={resendTimer > 0 || otpSending}
                              onClick={handleSendOtp}
                            >
                              {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                            </button>
                            <Button type="button" size="sm" onClick={handleVerifyOtp} disabled={otpVerifying || otpValue.length !== 6}>
                              {otpVerifying ? "Verifying..." : "Verify OTP"}
                            </Button>
                          </div>
                        </div>
                      )}
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

                {step === 5 && (
                  <>
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 mb-2">
                      <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
                        <IndianRupee className="w-4 h-4 shrink-0" />
                        These details help us provide ROI analysis, salary benchmarking, and personalised financial insights.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Fee Budget</Label>
                        <Select value={form.fee_budget_lakhs} onValueChange={v => updateField("fee_budget_lakhs", v)}>
                          <SelectTrigger><SelectValue placeholder="Max fees you can afford" /></SelectTrigger>
                          <SelectContent>{FEE_BUDGET_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Expected Post-MBA Salary</Label>
                        <Select value={form.expected_salary_lakhs} onValueChange={v => updateField("expected_salary_lakhs", v)}>
                          <SelectTrigger><SelectValue placeholder="Your salary expectation" /></SelectTrigger>
                          <SelectContent>{SALARY_EXPECTATION_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Current Employer Type(s)</Label>
                      <div className="flex flex-wrap gap-2">
                        {EMPLOYER_TYPES.map(t => (
                          <label key={t} className={`flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer rounded-full border px-3 py-1.5 transition-colors ${(form.current_employer_type as string[]).includes(t) ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:bg-muted/50"}`}>
                            <Checkbox className="w-3.5 h-3.5" checked={(form.current_employer_type as string[]).includes(t)} onCheckedChange={() => toggleArrayItem("current_employer_type" as any, t)} />
                            {t}
                          </label>
                        ))}
                      </div>
                      {(form.current_employer_type as string[]).length > 0 && (
                        <p className="text-xs text-muted-foreground">Selected: {(form.current_employer_type as string[]).join(", ")}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Graduation Year</Label>
                        <Select value={form.graduation_year} onValueChange={v => updateField("graduation_year", v)}>
                          <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 22 }, (_, i) => String(2014 + i)).map(y => (
                              <SelectItem key={y} value={y}>{y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Current City</Label>
                        <Input placeholder="e.g., Mumbai" value={form.current_city} onChange={e => updateField("current_city", e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5"><Timer className="w-3.5 h-3.5" /> Months Until Exam</Label>
                        <Input type="number" min="1" max="24" placeholder="e.g., 6" value={form.preparation_months_remaining} onChange={e => updateField("preparation_months_remaining", e.target.value)} />
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Info className="w-3 h-3 shrink-0" /> How many months are left before your target entrance exam (CAT/XAT/etc). This helps us plan your preparation roadmap.</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5" /> Leadership Experience</Label>
                      <Select value={form.leadership_roles} onValueChange={v => updateField("leadership_roles", v)}>
                        <SelectTrigger><SelectValue placeholder="Select leadership level" /></SelectTrigger>
                        <SelectContent>{LEADERSHIP_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5" /> Certifications <Badge variant="secondary" className="text-[10px] ml-1">Optional</Badge></Label>
                      <p className="text-xs text-muted-foreground">Select any professional certifications you hold. This boosts your profile diversity score.</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {CERTIFICATION_OPTIONS.map(cert => (
                          <label key={cert} className={`flex items-center gap-2 text-sm cursor-pointer rounded-lg border p-2 transition-colors ${form.has_certifications.includes(cert) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                            <Checkbox checked={form.has_certifications.includes(cert)} onCheckedChange={() => toggleArrayItem("has_certifications", cert)} />
                            {cert}
                          </label>
                        ))}
                      </div>
                      {form.has_certifications.includes("Other") && (
                        <div className="space-y-1.5 mt-2">
                          <Label className="text-sm">Specify Certification Name</Label>
                          <Input placeholder="e.g., Google Analytics, AWS Solutions Architect" value={form.other_certification} onChange={e => updateField("other_certification", e.target.value)} />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5" /> Extracurriculars</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {EXTRACURRICULAR_OPTIONS.map(ext => (
                          <label key={ext} className={`flex items-center gap-2 text-sm cursor-pointer rounded-lg border p-2 transition-colors ${form.extracurriculars.includes(ext) ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
                            <Checkbox checked={form.extracurriculars.includes(ext)} onCheckedChange={() => toggleArrayItem("extracurriculars", ext)} />
                            {ext}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox checked={form.has_gap_years} onCheckedChange={v => updateField("has_gap_years", !!v)} />
                        I have gap year(s) in my academic/career journey
                      </label>
                      {form.has_gap_years && (
                        <Input placeholder="Reason for gap (e.g., UPSC preparation, health, etc.)" value={form.gap_year_reason} onChange={e => updateField("gap_year_reason", e.target.value)} />
                      )}
                    </div>
                  </>
                )}

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => { setStep(step - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} disabled={step === 1}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Back
                  </Button>
                  {step < 5 ? (
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

        {/* ════════════════ LOADING ════════════════ */}
        {step === 6 && (() => {
          const funFacts = [
            { emoji: "📊", text: "IIM Ahmedabad receives 10,000+ applications for just 400 seats every year." },
            { emoji: "💰", text: "Average ROI of a top MBA is 300-500% within 5 years of graduating." },
            { emoji: "🎯", text: "A strong profile score can compensate for 5-10 percentile points in CAT." },
            { emoji: "🌍", text: "Over 60% of IIM graduates receive international placement offers." },
            { emoji: "📈", text: "Work experience of 2-4 years is considered ideal for top B-schools." },
            { emoji: "🏆", text: "Non-engineers have a higher acceptance rate at ISB Hyderabad." },
            { emoji: "🧠", text: "The average CAT 99%ile scorer practices 3,000+ questions during prep." },
            { emoji: "💼", text: "Consulting & Finance together account for 45% of all IIM placements." },
            { emoji: "🎓", text: "FMS Delhi offers the best ROI among all Indian B-schools." },
            { emoji: "📝", text: "Your SOPs and essays carry 20-30% weightage in IIM shortlisting." },
          ];
          const factIndex = Math.floor(loadingProgress / 10) % funFacts.length;
          return (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="min-h-[60vh] md:min-h-[80vh] flex items-start md:items-center justify-center px-4 py-8">
            <div className="max-w-lg mx-auto text-center space-y-6 md:space-y-8 w-full">
              {/* Main animated logo with orbital rings */}
              <div className="relative w-28 h-28 md:w-40 md:h-40 mx-auto">
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full bg-primary/10"
                />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                  className="absolute inset-2 rounded-full border-2 border-dashed border-primary/20"
                >
                  <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/50" />
                </motion.div>
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
                  className="absolute inset-6 rounded-full border-2 border-dashed border-primary/15"
                >
                  <div className="absolute -bottom-1 right-0 w-2.5 h-2.5 rounded-full bg-primary/70 shadow-lg shadow-primary/30" />
                </motion.div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                  className="absolute inset-10 rounded-full border border-primary/10"
                >
                  <div className="absolute top-0 right-2 w-2 h-2 rounded-full bg-primary/50" />
                </motion.div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
                    <img src={bschoolLogo} alt="B School Buzz" className="w-12 h-12 md:w-16 md:h-16 rounded-2xl shadow-2xl" />
                  </motion.div>
                </div>
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -20, 0], x: [0, (i % 2 === 0 ? 10 : -10), 0], opacity: [0, 1, 0] }}
                    transition={{ repeat: Infinity, duration: 2 + i * 0.3, delay: i * 0.4, ease: "easeInOut" }}
                    className="absolute w-1.5 h-1.5 rounded-full bg-primary/40"
                    style={{ top: `${20 + Math.sin(i * 60 * Math.PI / 180) * 40}%`, left: `${50 + Math.cos(i * 60 * Math.PI / 180) * 45}%` }}
                  />
                ))}
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl font-bold">AI is Analysing Your Profile</h2>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={Math.floor(loadingProgress / 7)}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-muted-foreground"
                  >
                    {loadingProgress < 8 ? "Evaluating your academic credentials..." :
                     loadingProgress < 16 ? "Scoring work experience & profile diversity..." :
                     loadingProgress < 24 ? "Computing 5-dimension profile scores..." :
                     loadingProgress < 32 ? "Matching against 50+ MBA colleges..." :
                     loadingProgress < 40 ? "Running peer comparison with 25,000+ students..." :
                     loadingProgress < 48 ? "Building your personalised roadmap..." :
                     loadingProgress < 55 ? "Analysing additional datasets & trends..." :
                     loadingProgress < 62 ? "Cross-referencing with admission data..." :
                     loadingProgress < 68 ? "Generating ROI & salary projections..." :
                     loadingProgress < 73 ? "Calculating sector-wise salary benchmarks..." :
                     loadingProgress < 77 ? "Building month-by-month improvement plan..." :
                     loadingProgress < 80 ? "Ranking college fit scores for your profile..." :
                     loadingProgress < 83 ? "Comparing with similar peer cohorts..." :
                     loadingProgress < 87 ? "Generating visual insights & charts..." :
                     "Polishing your comprehensive report..."}
                  </motion.p>
                </AnimatePresence>
              </div>

              {/* Progress bar */}
              <div className="relative">
                <div className="h-4 bg-muted rounded-full overflow-hidden relative">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary via-primary/80 to-primary relative overflow-hidden"
                    style={{ width: `${loadingProgress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  >
                    <motion.div
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    />
                  </motion.div>
                </div>
                <div className="flex justify-between mt-2">
                  <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="text-xs text-primary font-medium">
                    {loadingProgress < 35 ? "⚡ Processing..." : loadingProgress < 65 ? "🧠 Deep analysis in progress..." : loadingProgress < 85 ? "📊 Generating insights..." : "✨ Almost ready..."}
                  </motion.span>
                  <span className="text-xs text-muted-foreground font-mono font-bold">{Math.round(loadingProgress)}%</span>
                </div>
              </div>

              {/* Animated fun fact card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={factIndex}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.5 }}
                  className="bg-primary/5 border border-primary/15 rounded-2xl p-5 text-left"
                >
                  <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">💡 Did You Know?</p>
                  <p className="text-sm text-foreground leading-relaxed">
                    <span className="text-lg mr-2">{funFacts[factIndex].emoji}</span>
                    {funFacts[factIndex].text}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Step-by-step processing stages */}
              <div className="space-y-2 text-sm max-h-60 overflow-y-auto pr-1">
                {[
                  { threshold: 6, icon: GraduationCap, label: "Evaluating academic profile...", done: "Academic profile evaluated ✓" },
                  { threshold: 14, icon: Briefcase, label: "Scoring work experience...", done: "Work experience scored ✓" },
                  { threshold: 22, icon: PieChart, label: "Computing 5-dimension scores...", done: "5-dimension scores computed ✓" },
                  { threshold: 30, icon: Building2, label: "Matching against 50+ colleges...", done: "College matching complete ✓" },
                  { threshold: 38, icon: Users, label: "Running peer comparison...", done: "Peer comparison ready ✓" },
                  { threshold: 46, icon: Sparkles, label: "Building personalised roadmap...", done: "Roadmap generated ✓" },
                  { threshold: 53, icon: LineChart, label: "Analysing more datasets...", done: "Additional analysis complete ✓" },
                  { threshold: 60, icon: Gauge, label: "Cross-referencing your profile...", done: "Profile cross-referenced ✓" },
                  { threshold: 66, icon: BarChart3, label: "Generating ROI projections...", done: "ROI analysis complete ✓" },
                  { threshold: 71, icon: Target, label: "Calculating salary benchmarks...", done: "Salary benchmarks ready ✓" },
                  { threshold: 76, icon: Calendar, label: "Building improvement timeline...", done: "Timeline created ✓" },
                  { threshold: 81, icon: Award, label: "Ranking college fit scores...", done: "College rankings ready ✓" },
                  { threshold: 85, icon: TrendingUp, label: "Generating visual insights...", done: "Visual insights ready ✓" },
                ].map((stage, i) => {
                  const isActive = loadingProgress > stage.threshold - 4 && loadingProgress <= stage.threshold + 3;
                  const isDone = loadingProgress > stage.threshold + 3;
                  if (loadingProgress < stage.threshold - 4) return null;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex items-center gap-3 px-4 py-2 rounded-lg border transition-all ${
                        isDone ? "bg-green-500/5 border-green-500/20" : "bg-primary/5 border-primary/20"
                      }`}
                    >
                      {isDone ? (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        </motion.div>
                      ) : (
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                          <stage.icon className="w-4 h-4 text-primary shrink-0" />
                        </motion.div>
                      )}
                      <span className={isDone ? "text-green-600 dark:text-green-400" : "text-foreground"}>
                        {isDone ? stage.done : stage.label}
                      </span>
                      {isActive && (
                        <motion.span
                          animate={{ opacity: [1, 0.3, 1] }}
                          transition={{ repeat: Infinity, duration: 0.8 }}
                          className="ml-auto text-xs text-primary font-medium"
                        >Processing...</motion.span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
          );
        })()}

        {/* ════════════════ PARTIAL RESULT (LOCKED) ════════════════ */}
        {step === 7 && result && (
          <motion.div key="partial" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="max-w-4xl mx-auto px-4 py-10 space-y-8">
            
            {/* Personalized greeting */}
            <div className="text-center space-y-4">
              <Badge variant="secondary" className="text-sm"><Sparkles className="w-3.5 h-3.5 mr-1" /> AI Analysis Complete</Badge>
              <h2 className="text-3xl font-bold">
                {form.name ? `Hey ${form.name.split(" ")[0]}, here's your profile snapshot` : "Your Profile Analysis"}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
                Based on your <strong>{form.graduation_stream}</strong> background
                {form.work_experience_months && Number(form.work_experience_months) > 0
                  ? `, ${Number(form.work_experience_months)} months of work experience,`
                  : " as a fresher,"} and targets for <strong>{form.target_exams.join(", ")}</strong>
              </p>
              
              {/* Score card with gradient border */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="inline-block rounded-2xl p-[2px] ai-gist-border"
              >
                <div className="bg-background rounded-[14px] p-6 flex items-center gap-6">
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
              </motion.div>
            </div>

            {/* Strengths */}
            <Card className="border-green-200/50 dark:border-green-800/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  {form.name ? `${form.name.split(" ")[0]}, here's what makes you stand out` : "Your Strengths"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.strengths?.map((s, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30">
                    <Badge variant="outline" className="text-green-600 border-green-300 shrink-0 mt-0.5">{s.impact}</Badge>
                    <div><p className="font-semibold text-sm">{s.title}</p><p className="text-sm text-muted-foreground">{s.description}</p></div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            {/* Weaknesses */}
            <Card className="border-amber-200/50 dark:border-amber-800/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="w-5 h-5" />
                  Areas to improve — with actionable fixes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {result.weaknesses?.map((w, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 + 0.3 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                    <Badge variant="outline" className="text-amber-600 border-amber-300 shrink-0 mt-0.5">{w.severity}</Badge>
                    <div><p className="font-semibold text-sm">{w.title}</p><p className="text-sm text-muted-foreground">{w.description}</p>
                      <p className="text-sm text-primary mt-1 flex items-center gap-1"><Lightbulb className="w-3.5 h-3.5" /> {w.fix}</p>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            {/* LOCKED OVERLAY */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background z-10 flex flex-col items-center justify-center gap-4 pt-20">
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                  <Lock className="w-14 h-14 text-primary/60" />
                </motion.div>
                <h3 className="text-2xl font-bold">
                  {form.name ? `${form.name.split(" ")[0]}, unlock your complete MBA roadmap` : "Unlock Your Full Report"}
                </h3>
                <p className="text-muted-foreground text-center max-w-md">Get the detailed college comparison table, peer comparison, exam strategy, AI roadmap, and personalised study plan.</p>
                <Button size="lg" onClick={() => setShowLeadModal(true)} className="rounded-2xl px-8 shadow-xl">
                  <Lock className="w-4 h-4 mr-2" /> Unlock Full Report
                </Button>
              </div>
              <div className="blur-sm pointer-events-none space-y-6">
                <Card><CardHeader><CardTitle>College Comparison Table</CardTitle></CardHeader><CardContent><div className="h-64 bg-muted rounded-lg" /></CardContent></Card>
                <Card><CardHeader><CardTitle>Peer Comparison</CardTitle></CardHeader><CardContent><div className="h-32 bg-muted rounded-lg" /></CardContent></Card>
                <Card><CardHeader><CardTitle>Exam Strategy</CardTitle></CardHeader><CardContent><div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-16 bg-muted rounded-lg" />)}</div></CardContent></Card>
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════════ FULL DASHBOARD (UNLOCKED) ════════════════ */}
        {step === 8 && result && unlocked && (
          <motion.div key="full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} ref={reportRef}
            className="max-w-7xl mx-auto px-4 py-10 space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <Badge className="text-sm"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Full Report Unlocked</Badge>
              <h2 className="text-3xl md:text-4xl font-bold">
                {form.name ? `${form.name.split(" ")[0]}'s Complete MBA Roadmap` : "Your Complete MBA Roadmap"}
              </h2>
              <p className="text-muted-foreground max-w-3xl mx-auto">{result.ai_summary}</p>

              {/* Main score + breakdown */}
              <div className="flex flex-wrap justify-center gap-4 mt-6">
                <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="inline-flex items-center gap-3 bg-card border-2 border-primary/20 rounded-2xl p-5 shadow-lg">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-0.5">Overall Score</p>
                    <p className={`text-5xl font-bold ${scoreColor(result.profile_score)}`}>{result.profile_score}</p>
                    <p className="text-xs text-muted-foreground">/10</p>
                  </div>
                </motion.div>
                {result.peer_comparison && (
                  <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ delay: 0.1 }} className="inline-flex items-center gap-3 bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-5">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-0.5">Peer Rank</p>
                      <p className="text-3xl font-bold text-primary">Top {100 - (result.peer_comparison.your_rank_percentile || 50)}%</p>
                      <p className="text-xs text-muted-foreground">of {result.peer_comparison.total_students_analysed?.toLocaleString()}+ students</p>
                    </div>
                  </motion.div>
                )}
              </div>

              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button variant="outline" onClick={handleSaveReport} disabled={savingReport} className="rounded-xl">
                  <Save className="w-4 h-4 mr-2" /> {savingReport ? "Saving..." : "Save to Dashboard"}
                </Button>
                <PdfDownloadButton targetRef={reportRef} fileName={`${form.name?.split(" ")[0] || "profile"}-mba-report.pdf`} label="Download Premium PDF" />
                <ShareReportButton profileId={result.profile_id} />
              </div>
            </div>

            {/* ─── Premium Executive Summary (AI narrative) ─── */}
            <ExecutiveSummary
              oneLine={narrative?.one_line_summary}
              verdict={narrative?.final_verdict}
              strengths={result.strengths}
              weaknesses={result.weaknesses}
            />

            {/* ─── Premium Radar (you vs Top 1%) ─── */}
            <RadarChartCard breakdown={result.score_breakdown as ScoreBreakdown} />

            {/* ─── Benchmark vs Peers vs Top 1% ─── */}
            <BenchmarkPanel
              breakdown={result.score_breakdown as ScoreBreakdown}
              profile={{
                tenth_score: Number(form.tenth_score) || undefined,
                twelfth_score: Number(form.twelfth_score) || undefined,
                graduation_score: Number(form.graduation_score) || undefined,
                graduation_stream: form.graduation_stream,
                work_experience_months: Number(form.work_experience_months) || 0,
                category: form.category,
                gender: form.gender,
              }}
              rankPercentile={result.peer_comparison?.your_rank_percentile}
            />

            {/* ─── College Fit Heatmap ─── */}
            <CollegeFitHeatmap rows={result.detailed_college_table as unknown as CollegeRow[]} />

            {/* ─── Scenario Simulator (CAT 90/95/99 + Work Ex toggle) ─── */}
            <ScenarioSimulator
              rows={result.detailed_college_table as unknown as CollegeRow[]}
              profile={{
                tenth_score: Number(form.tenth_score) || undefined,
                twelfth_score: Number(form.twelfth_score) || undefined,
                graduation_score: Number(form.graduation_score) || undefined,
                graduation_stream: form.graduation_stream,
                work_experience_months: Number(form.work_experience_months) || 0,
              }}
            />

            {/* ─── ROI Scatter (Fees vs Salary) ─── */}
            <ROIScatterCard rows={result.detailed_college_table as unknown as CollegeRow[]} />

            {/* ─── Original 5-Dimension Score Radar (kept for continuity) ─── */}
            <ScoreRadar breakdown={result.score_breakdown} />

            {/* Peer Comparison Bell Curve */}
            <PeerComparisonScale peerData={result.peer_comparison} userScore={result.profile_score} />

            {/* ─── DETAILED COLLEGE TABLE ─── */}
            <Card className="border-2 border-primary/20">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Detailed College Comparison Table</CardTitle>
                    <CardDescription className="mt-1">{result.detailed_college_table?.length || 0} colleges analysed with your specific admission data</CardDescription>
                  </div>
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
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto -mx-6 px-6">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead className="min-w-[180px]">College</TableHead>
                        <TableHead>City</TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort("avg_fees_lakhs")}>Fees (L) {collegeSortKey === "avg_fees_lakhs" && (collegeSortAsc ? "↑" : "↓")}</TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort("avg_package_lakhs")}>Avg Pkg (LPA) {collegeSortKey === "avg_package_lakhs" && (collegeSortAsc ? "↑" : "↓")}</TableHead>
                        <TableHead>Highest Pkg</TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort("required_cat_percentile")}>Required %ile {collegeSortKey === "required_cat_percentile" && (collegeSortAsc ? "↑" : "↓")}</TableHead>
                        <TableHead>Your Target %ile</TableHead>
                        <TableHead className="cursor-pointer hover:text-primary" onClick={() => handleSort("your_admission_probability")}>Your Chance {collegeSortKey === "your_admission_probability" && (collegeSortAsc ? "↑" : "↓")}</TableHead>
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
                              <div className={`h-2 rounded-full ${probColor(c.your_admission_probability)}`} style={{ width: `${Math.max(normalizeProb(c.your_admission_probability) * 0.6, 6)}px` }} />
                              <span className="font-bold">{normalizeProb(c.your_admission_probability)}%</span>
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

            {/* ─── COLLEGE COMPARISON TOOL ─── */}
            <Card className="border-2 border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Layers className="w-5 h-5 text-primary" /> Compare Two Colleges Side-by-Side</CardTitle>
                <CardDescription>Select two colleges from your analysis to see a detailed head-to-head comparison.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">College A</Label>
                    <Select value={compareA} onValueChange={setCompareA}>
                      <SelectTrigger><SelectValue placeholder="Select first college" /></SelectTrigger>
                      <SelectContent>
                        {result.detailed_college_table?.map(c => (
                          <SelectItem key={c.college_name} value={c.college_name} disabled={c.college_name === compareB}>{c.college_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium mb-1.5 block">College B</Label>
                    <Select value={compareB} onValueChange={setCompareB}>
                      <SelectTrigger><SelectValue placeholder="Select second college" /></SelectTrigger>
                      <SelectContent>
                        {result.detailed_college_table?.map(c => (
                          <SelectItem key={c.college_name} value={c.college_name} disabled={c.college_name === compareA}>{c.college_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {compareA && compareB && (() => {
                  const a = result.detailed_college_table?.find(c => c.college_name === compareA);
                  const b = result.detailed_college_table?.find(c => c.college_name === compareB);
                  if (!a || !b) return null;

                  const metrics: { label: string; keyA: string | number; keyB: string | number; better: "higher" | "lower" | "none"; unit?: string }[] = [
                    { label: "NIRF Ranking", keyA: a.nirf_ranking ? `#${a.nirf_ranking}` : "N/A", keyB: b.nirf_ranking ? `#${b.nirf_ranking}` : "N/A", better: "none" },
                    { label: "Location", keyA: `${a.city}, ${a.state}`, keyB: `${b.city}, ${b.state}`, better: "none" },
                    { label: "Fees", keyA: a.avg_fees_lakhs, keyB: b.avg_fees_lakhs, better: "lower", unit: "L" },
                    { label: "Avg Package", keyA: a.avg_package_lakhs, keyB: b.avg_package_lakhs, better: "higher", unit: " LPA" },
                    { label: "Highest Package", keyA: a.highest_package_lakhs || 0, keyB: b.highest_package_lakhs || 0, better: "higher", unit: " LPA" },
                    { label: "Median Package", keyA: a.median_package_lakhs || 0, keyB: b.median_package_lakhs || 0, better: "higher", unit: " LPA" },
                    { label: "Required CAT %ile", keyA: a.required_cat_percentile, keyB: b.required_cat_percentile, better: "lower", unit: "%ile" },
                    { label: "Your Target %ile", keyA: a.student_cat_target, keyB: b.student_cat_target, better: "none", unit: "%ile" },
                    { label: "Your Admission Chance", keyA: normalizeProb(a.your_admission_probability), keyB: normalizeProb(b.your_admission_probability), better: "higher", unit: "%" },
                    { label: "Difficulty", keyA: a.difficulty, keyB: b.difficulty, better: "none" },
                    { label: "Tier", keyA: a.tier, keyB: b.tier, better: "none" },
                  ];

                  const getBetterClass = (metric: typeof metrics[0], side: "a" | "b") => {
                    if (metric.better === "none" || typeof metric.keyA === "string" || typeof metric.keyB === "string") return "";
                    const numA = Number(metric.keyA);
                    const numB = Number(metric.keyB);
                    if (numA === numB) return "";
                    if (metric.better === "higher") return (side === "a" ? numA > numB : numB > numA) ? "text-green-600 font-bold" : "";
                    return (side === "a" ? numA < numB : numB < numA) ? "text-green-600 font-bold" : "";
                  };

                  return (
                    <div className="rounded-xl border border-border overflow-hidden">
                      <div className="grid grid-cols-3 bg-muted/50 text-sm font-semibold">
                        <div className="p-3 text-center border-r border-border">{a.college_name}</div>
                        <div className="p-3 text-center border-r border-border text-muted-foreground">Metric</div>
                        <div className="p-3 text-center">{b.college_name}</div>
                      </div>
                      {metrics.map((m, i) => (
                        <div key={m.label} className={`grid grid-cols-3 text-sm ${i % 2 === 0 ? "bg-card" : "bg-muted/20"} border-t border-border/50`}>
                          <div className={`p-3 text-center ${getBetterClass(m, "a")}`}>
                            {typeof m.keyA === "number" ? `${m.keyA}${m.unit || ""}` : m.keyA}
                          </div>
                          <div className="p-3 text-center text-muted-foreground font-medium border-x border-border/50">{m.label}</div>
                          <div className={`p-3 text-center ${getBetterClass(m, "b")}`}>
                            {typeof m.keyB === "number" ? `${m.keyB}${m.unit || ""}` : m.keyB}
                          </div>
                        </div>
                      ))}
                      {/* Recommendations row */}
                      <div className="grid grid-cols-3 border-t border-border bg-primary/5">
                        <div className="p-3 text-xs text-muted-foreground">{a.recommendation}</div>
                        <div className="p-3 text-center text-xs font-semibold text-primary border-x border-border/50">AI Recommendation</div>
                        <div className="p-3 text-xs text-muted-foreground">{b.recommendation}</div>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

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
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${probColor(c.probability)}`}>{normalizeProb(c.probability)}%</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{c.cutoff_info}</p>
                            {c.tip && <p className="text-xs text-primary mt-1 flex items-center gap-1"><Lightbulb className="w-3 h-3" /> {c.tip}</p>}
                            <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${probColor(c.probability)}`} style={{ width: `${normalizeProb(c.probability)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Exam Strategy */}
            {Array.isArray(result.exam_strategy) && result.exam_strategy.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Card className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                  <CardTitle className="flex items-center gap-2"><Flame className="w-5 h-5 text-primary" /> Exam-wise Strategy</CardTitle>
                  <CardDescription>Your personalised difficulty rating and target scores for each exam</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {result.exam_strategy.map((ex, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                        className="p-5 rounded-2xl border border-border bg-gradient-to-br from-card to-muted/30 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-bold text-xl group-hover:text-primary transition-colors">{ex.exam_name}</h4>
                          <Badge className={`text-xs px-3 py-1 ${
                            ex.difficulty_for_student === "Easy" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                            ex.difficulty_for_student === "Medium" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                            "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          }`}>{ex.difficulty_for_student}</Badge>
                        </div>
                        <div className="space-y-3">
                          {[
                            { label: "Target Score", value: ex.recommended_score, icon: Target },
                            { label: "Prep Time", value: `${ex.preparation_months} months`, icon: Clock },
                            { label: "ROI Rating", value: ex.roi_rating, icon: TrendingUp },
                          ].map(item => (
                            <div key={item.label} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                              <span className="text-xs text-muted-foreground flex items-center gap-1.5"><item.icon className="w-3 h-3" />{item.label}</span>
                              <span className="text-sm font-bold">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            )}

            {/* Strengths & Weaknesses */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="overflow-hidden border-green-200/50 dark:border-green-800/50">
                <CardHeader className="bg-gradient-to-r from-green-50 to-transparent dark:from-green-950/20">
                  <CardTitle className="flex items-center gap-2 text-green-600"><CheckCircle2 className="w-5 h-5" /> Your Strengths</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {result.strengths?.map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                      className="p-4 rounded-xl bg-green-50/50 dark:bg-green-950/10 border border-green-200/50 dark:border-green-800/50 hover:shadow-md transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <motion.div whileHover={{ rotate: 10, scale: 1.1 }} className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </motion.div>
                        <div className="flex-1">
                          <span className="font-semibold text-sm">{s.title}</span>
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] ml-2">{s.impact} Impact</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground ml-10">{s.description}</p>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
              <Card className="overflow-hidden border-amber-200/50 dark:border-amber-800/50">
                <CardHeader className="bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-950/20">
                  <CardTitle className="flex items-center gap-2 text-amber-600"><AlertTriangle className="w-5 h-5" /> Areas to Improve</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {result.weaknesses?.map((w, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                      className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-800/50 hover:shadow-md transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <motion.div whileHover={{ rotate: -10, scale: 1.1 }} className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-4 h-4 text-white" />
                        </motion.div>
                        <div className="flex-1">
                          <span className="font-semibold text-sm">{w.title}</span>
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] ml-2">{w.severity}</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground ml-10 mb-2">{w.description}</p>
                      <div className="ml-10 p-2 rounded-lg bg-primary/5 border border-primary/10">
                        <p className="text-xs text-primary font-medium flex items-center gap-1"><Lightbulb className="w-3 h-3" /> Fix: {w.fix}</p>
                      </div>
                    </motion.div>
                  ))}
                </CardContent>
              </Card>
            </div>
            </motion.div>

            {/* AI Recommendations */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-2"><Lightbulb className="w-5 h-5 text-primary" /> AI Action Plan</CardTitle>
                <CardDescription>Prioritised steps to strengthen your MBA profile</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.recommendations?.map((r, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                      className="p-5 rounded-2xl border border-border bg-gradient-to-br from-card to-muted/20 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group">
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          r.priority === "critical" ? "bg-red-500" : r.priority === "high" ? "bg-primary" : "bg-muted-foreground/50"
                        }`}>
                          <span className="text-white text-xs font-bold">{i + 1}</span>
                        </div>
                        <Badge variant={r.priority === "critical" ? "destructive" : r.priority === "high" ? "default" : "secondary"} className="text-xs">{r.priority}</Badge>
                        {r.timeline && <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto"><Clock className="w-3 h-3" /> {r.timeline}</span>}
                      </div>
                      <h4 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors">{r.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{r.description}</p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
            </motion.div>

            {/* Study Plan */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /> Personalised Study Plan</CardTitle>
                <CardDescription>Your phase-wise preparation roadmap with daily targets</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {result.study_plan?.map((phase, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                      className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <motion.div whileHover={{ scale: 1.15 }} className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center font-bold text-sm shadow-lg">{i + 1}</motion.div>
                        {i < (result.study_plan?.length || 0) - 1 && (
                          <motion.div initial={{ height: 0 }} whileInView={{ height: "100%" }} viewport={{ once: true }} transition={{ delay: i * 0.1 + 0.2 }} className="w-0.5 bg-gradient-to-b from-primary/30 to-transparent mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-6 p-4 rounded-2xl bg-muted/30 border border-border/50 hover:shadow-md transition-all">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h4 className="font-bold">{phase.phase}</h4>
                          <Badge variant="outline" className="text-xs">{phase.duration}</Badge>
                          {phase.daily_hours && <Badge variant="secondary" className="text-xs">{phase.daily_hours} hrs/day</Badge>}
                        </div>
                        {phase.target_score && <p className="text-sm text-primary mb-2">Target: {phase.target_score}</p>}
                        <div className="flex flex-wrap gap-2">{phase.focus_areas?.map((area, j) => <Badge key={j} variant="secondary" className="text-xs">{area}</Badge>)}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
            </motion.div>

            {/* ─── ROI ANALYSIS ─── */}
            {Array.isArray(result.roi_analysis) && result.roi_analysis.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <Card className="border-2 border-primary/20 overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> ROI Analysis — College-wise Investment Returns</CardTitle>
                  <CardDescription>Total investment vs expected returns for each recommended college</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto -mx-6 px-6">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead>College</TableHead>
                          <TableHead>Total Investment</TableHead>
                          <TableHead>Expected Salary</TableHead>
                          <TableHead>Payback Period</TableHead>
                          <TableHead>5-Year ROI</TableHead>
                          <TableHead>ROI Rating</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.roi_analysis.map((r, i) => (
                          <TableRow key={i} className="text-xs">
                            <TableCell className="font-semibold">{r.college_name}</TableCell>
                            <TableCell>₹{r.total_investment_lakhs}L</TableCell>
                            <TableCell className="font-semibold text-primary">₹{r.expected_starting_salary_lakhs} LPA</TableCell>
                            <TableCell>{r.payback_period_months} months</TableCell>
                            <TableCell className="font-bold">{r.five_year_roi_percent}%</TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${r.roi_rating === "Excellent" ? "bg-green-100 text-green-700" : r.roi_rating === "Very Good" ? "bg-blue-100 text-blue-700" : r.roi_rating === "Good" ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                                {r.roi_rating}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            )}

            {/* ─── SALARY BENCHMARKING ─── */}
            {result.salary_benchmarking && (
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5 text-primary" /> Salary Benchmarking & Growth Trajectory</CardTitle>
                  <CardDescription>Pre-MBA vs Post-MBA salary comparison across college tiers and sectors</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Salary Range by Tier */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-muted/50 border border-border text-center">
                      <p className="text-xs text-muted-foreground mb-1">Current (Est.)</p>
                      <p className="text-2xl font-bold text-muted-foreground">₹{result.salary_benchmarking.current_estimated_salary_lakhs} LPA</p>
                    </div>
                    {[
                      { label: "Tier 1 (IIMs)", min: result.salary_benchmarking.post_mba_salary_range.tier1_min, max: result.salary_benchmarking.post_mba_salary_range.tier1_max, color: "text-green-600" },
                      { label: "Tier 2", min: result.salary_benchmarking.post_mba_salary_range.tier2_min, max: result.salary_benchmarking.post_mba_salary_range.tier2_max, color: "text-blue-600" },
                      { label: "Tier 3", min: result.salary_benchmarking.post_mba_salary_range.tier3_min, max: result.salary_benchmarking.post_mba_salary_range.tier3_max, color: "text-amber-600" },
                    ].map(t => (
                      <div key={t.label} className="p-4 rounded-xl bg-muted/50 border border-border text-center">
                        <p className="text-xs text-muted-foreground mb-1">{t.label}</p>
                        <p className={`text-2xl font-bold ${t.color}`}>₹{t.min}-{t.max} LPA</p>
                      </div>
                    ))}
                  </div>

                  {/* Sector-wise Table */}
                  {result.salary_benchmarking.sector_wise_salary?.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-3">Sector-wise Post-MBA Salary</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {result.salary_benchmarking.sector_wise_salary.map((s, i) => (
                          <div key={i} className="p-3 rounded-lg border border-border bg-card">
                            <p className="text-xs text-muted-foreground">{s.sector}</p>
                            <p className="text-lg font-bold">₹{s.avg_salary_lakhs} LPA</p>
                            <p className="text-xs text-muted-foreground">Top: ₹{s.top_salary_lakhs} LPA • Growth: {s.growth_rate_percent}%/yr</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Salary Growth Trajectory Chart */}
                  {Array.isArray(result.salary_benchmarking?.salary_growth_trajectory) && result.salary_benchmarking.salary_growth_trajectory.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold mb-3">10-Year Salary Growth: MBA vs No MBA</p>
                      <div className="space-y-2">
                        {result.salary_benchmarking.salary_growth_trajectory.map((pt, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-16 shrink-0">Year {pt.year}</span>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="h-2 rounded-full bg-gradient-to-r from-primary to-primary/70" style={{ width: `${Math.min((pt.with_mba_lakhs / Math.max(...result.salary_benchmarking!.salary_growth_trajectory.map(p => p.with_mba_lakhs))) * 100, 100)}%` }} />
                                <span className="text-xs font-bold text-primary whitespace-nowrap">₹{pt.with_mba_lakhs}L</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="h-2 rounded-full bg-muted-foreground/30" style={{ width: `${Math.min((pt.without_mba_lakhs / Math.max(...result.salary_benchmarking!.salary_growth_trajectory.map(p => p.with_mba_lakhs))) * 100, 100)}%` }} />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">₹{pt.without_mba_lakhs}L</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-primary" /> With MBA</span>
                          <span className="flex items-center gap-1"><div className="w-3 h-2 rounded bg-muted-foreground/30" /> Without MBA</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ─── IMPROVEMENT ROADMAP ─── */}
            {Array.isArray(result.improvement_roadmap) && result.improvement_roadmap.length > 0 && (
              <Card className="border-2 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Rocket className="w-5 h-5 text-primary" /> Month-by-Month Improvement Roadmap</CardTitle>
                  <CardDescription>Track your progress with specific milestones and score targets</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.improvement_roadmap.map((rm, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                        className="flex gap-4 items-start p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                          M{rm.month}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1 flex-wrap">
                            <h4 className="font-semibold text-sm">{rm.milestone}</h4>
                            {rm.target_percentile && <Badge variant="outline" className="text-xs">Target: {rm.target_percentile}</Badge>}
                            {rm.mock_score_target && <Badge variant="secondary" className="text-xs">Mock: {rm.mock_score_target}</Badge>}
                          </div>
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {rm.focus_areas.map((area, j) => <Badge key={j} variant="secondary" className="text-xs">{area}</Badge>)}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Profile Score Target:</span>
                            <div className="flex-1 max-w-[200px] h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70" style={{ width: `${rm.profile_score_target * 10}%` }} />
                            </div>
                            <span className="text-xs font-bold">{rm.profile_score_target}/10</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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
            <DialogDescription>Enter your mobile number to access the detailed college table, peer comparison, exam strategy, and personalised roadmap.</DialogDescription>
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
