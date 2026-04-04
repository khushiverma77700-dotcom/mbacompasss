import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  GraduationCap, Briefcase, Target, ChevronRight, ChevronLeft, Lock, Phone, Mail,
  TrendingUp, Shield, Zap, BookOpen, Calendar, Star, AlertTriangle, CheckCircle2, ArrowRight,
  Sparkles, BarChart3, Lightbulb, User, FileText, Download, Save, MapPin, ClipboardList,
  Award, Users, Clock, ArrowUpRight, ChevronDown, Info, Search, Layers, Activity, Eye,
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
    profile_consistency_score: number;
    leadership_potential_score: number;
    overall_competitiveness: string;
    percentile_among_aspirants: number;
  };
  ai_summary: string;
  exam_strategy: Array<{ exam_name: string; recommended_score: string; preparation_months: number; difficulty_for_student: string; roi_rating: string }>;
  peer_comparison: {
    total_students_analysed: number;
    average_score: number;
    your_rank_percentile: number;
    score_distribution: Array<{ range: string; count: number; is_yours: boolean }>;
  };
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
  if (!peerData) return null;

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
          name: form.name, email: form.email,
          tenth_score: +form.tenth_score, twelfth_score: +form.twelfth_score,
          graduation_score: +form.graduation_score, graduation_stream: form.graduation_stream,
          is_pursuing_graduation: form.is_pursuing_graduation,
          work_experience_months: +form.work_experience_months || 0,
          category: form.category, gender: form.gender || undefined,
          target_exams: form.target_exams, target_colleges: form.target_colleges,
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

  const sortedColleges = useMemo(() => {
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
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <SEOHead
        title="AI-Powered MBA Profile Analyser by B School Buzz | Check IIM Chances Free"
        description="Analyse your MBA profile with AI. Get personalised IIM admission probability, 5-dimension score breakdown, peer comparison among 25,000+ students, college-wise comparison table with difficulty ratings, and detailed preparation roadmap. 100% Free tool by B School Buzz."
        keywords={["MBA profile analyser", "IIM chances calculator", "CAT score predictor", "MBA admission probability", "B School Buzz profile analyser", "AI MBA tool", "IIM admission predictor", "MBA college comparison", "CAT preparation", "MBA peer comparison"]}
        canonical="https://bestmbacoaching.com/profile-analyzer"
        ogType="website"
        ogTitle="AI-Powered MBA Profile Analyser by B School Buzz"
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

                {/* CTA */}
                <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}>
                  <Button size="lg" onClick={() => setStep(1)} className="text-lg px-12 py-7 rounded-2xl shadow-2xl hover:shadow-3xl transition-all group relative overflow-hidden">
                    <span className="relative z-10 flex items-center gap-2">
                      Start Free Analysis <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <motion.div
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/10 to-transparent"
                    />
                  </Button>
                  <p className="text-xs text-muted-foreground mt-3">No payment • No signup • Instant results</p>
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
                    { icon: Brain, value: "AI", label: "Powered Analysis", sub: "Gemini Intelligence" },
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
                <Brain className="w-16 h-16 mx-auto text-primary mb-6" />
                <h2 className="text-3xl md:text-5xl font-bold mb-4">Ready to Know Your MBA Chances?</h2>
                <p className="text-muted-foreground text-lg mb-8">Takes less than 2 minutes. No payment. No signup. Instant AI-powered results.</p>
                <Button size="lg" onClick={() => setStep(1)} className="text-lg px-12 py-7 rounded-2xl shadow-2xl group">
                  Start Free Analysis <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </motion.div>
            </section>
          </motion.div>
        )}

        {/* ════════════════ FORM STEPS 1-4 ════════════════ */}
        {step >= 1 && step <= 4 && (
          <motion.div key={`step-${step}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} className="max-w-2xl mx-auto px-4 py-12">
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

        {/* ════════════════ LOADING ════════════════ */}
        {step === 5 && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="min-h-[80vh] flex items-center justify-center px-4">
            <div className="max-w-md mx-auto text-center space-y-8">
              <div className="relative w-24 h-24 mx-auto">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="w-24 h-24 rounded-full border-4 border-primary/20 border-t-primary" />
                <Brain className="w-10 h-10 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h2 className="text-2xl font-bold">Analysing Your Profile</h2>
              <p className="text-muted-foreground">Cross-referencing 10,000+ data points with AI to generate personalised insights...</p>
              <Progress value={loadingProgress} className="h-3" />
              <div className="space-y-2 text-sm text-muted-foreground">
                {loadingProgress > 10 && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Academic profile evaluated</motion.p>}
                {loadingProgress > 25 && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Work experience scored</motion.p>}
                {loadingProgress > 40 && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Computing 5-dimension scores</motion.p>}
                {loadingProgress > 55 && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Matching against 50+ colleges</motion.p>}
                {loadingProgress > 70 && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Running peer comparison analysis</motion.p>}
                {loadingProgress > 85 && <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> Building personalised roadmap</motion.p>}
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════════════ PARTIAL RESULT (LOCKED) ════════════════ */}
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

            {/* LOCKED OVERLAY */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/80 to-background z-10 flex flex-col items-center justify-center gap-4 pt-20">
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
                  <Lock className="w-14 h-14 text-primary/60" />
                </motion.div>
                <h3 className="text-2xl font-bold">Unlock Your Full Report</h3>
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
        {step === 7 && result && unlocked && (
          <motion.div key="full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} ref={reportRef}
            className="max-w-7xl mx-auto px-4 py-10 space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <Badge className="text-sm"><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Full Report Unlocked</Badge>
              <h2 className="text-3xl md:text-4xl font-bold">Your Complete MBA Roadmap</h2>
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

              <div className="flex justify-center gap-3 pt-2">
                <Button variant="outline" onClick={handleSaveReport} disabled={savingReport} className="rounded-xl">
                  <Save className="w-4 h-4 mr-2" /> {savingReport ? "Saving..." : "Save to Dashboard"}
                </Button>
              </div>
            </div>

            {/* 5-Dimension Score Radar */}
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
                              <div className={`h-2 rounded-full ${probColor(c.your_admission_probability)}`} style={{ width: `${Math.max(c.your_admission_probability * 0.6, 6)}px` }} />
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
                    { label: "Your Admission Chance", keyA: a.your_admission_probability, keyB: b.your_admission_probability, better: "higher", unit: "%" },
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

            {/* Exam Strategy */}
            {result.exam_strategy && result.exam_strategy.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Flame className="w-5 h-5 text-primary" /> Exam-wise Strategy</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {result.exam_strategy.map((ex, i) => (
                      <div key={i} className="p-4 rounded-xl border border-border bg-card hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-lg">{ex.exam_name}</h4>
                          <Badge className={`text-xs ${
                            ex.difficulty_for_student === "Easy" ? "bg-green-100 text-green-700" :
                            ex.difficulty_for_student === "Medium" ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          }`}>{ex.difficulty_for_student}</Badge>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-muted-foreground">Target Score</span><span className="font-semibold">{ex.recommended_score}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Prep Time</span><span className="font-semibold">{ex.preparation_months} months</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">ROI Rating</span><span className="font-semibold">{ex.roi_rating}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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
