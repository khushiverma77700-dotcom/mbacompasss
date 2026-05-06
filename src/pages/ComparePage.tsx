import { useState, useEffect, useMemo, useRef } from "react";
import { X, Star, Tag, CheckCircle, ArrowRight, BarChart3, TrendingUp, Clock, Users, BookOpen, GraduationCap, Award, Sparkles, Scale, IndianRupee, ThumbsUp, Shield, Zap, HelpCircle, ChevronDown, ChevronUp, MapPin, Globe, Phone, ExternalLink, Building2, Target, Percent, Trophy, Medal, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import SEOHead, { generateComparisonSchema, generateFAQSchema, generateBreadcrumbSchema } from "@/components/SEOHead";
import AICoachingFinder from "@/components/AICoachingFinder";
import React from "react";

type DBCourse = {
  id: string; name: string; duration: string | null; fees: number | null;
  batch_info: string | null; curriculum: string[] | null; description: string | null;
  syllabus_url: string | null; institute_id: string;
  institutes: { id: string; name: string; slug: string; city: string | null; state: string | null; rating: number | null; total_reviews: number | null; students_count: number | null; success_rate: number | null; mode: string | null; discount: string | null; offer: string | null; logo_url: string | null; features: string[] | null; } | null;
};

const compareFaqs = [
  { q: "How do I compare MBA coaching courses?", a: "Select up to 3 courses from the dropdown menus. Our tool generates a detailed side-by-side comparison covering fees, curriculum, success rates, faculty, and batch timings." },
  { q: "What does the AI Coaching Finder consider?", a: "Our AI analyzes your learning mode, budget, location, target exams, work experience, and preparation stage to recommend the best-fit coaching institutes from our verified database." },
  { q: "Can I compare online and offline courses?", a: "Yes! Our tool works across all teaching modes — online, offline, and hybrid. The comparison clearly shows each course's delivery format." },
  { q: "How is the 'Best for You' score calculated?", a: "The algorithm weighs Institute Rating (40%), Historical Success Rate (35%), and Value-for-Money based on fees (25%) to rank courses." },
  { q: "Are the fees shown inclusive of all charges?", a: "Fees displayed are base course fees. Additional charges for premium materials, extra mock tests, or mentoring may apply." },
  { q: "How often is the data updated?", a: "We update coaching data regularly. Fees, batch info, and placement stats are verified periodically for accuracy." },
];

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const ComparePage = () => {
  const [courses, setCourses] = useState<DBCourse[]>([]);
  const [courseSelections, setCourseSelections] = useState<[DBCourse | null, DBCourse | null, DBCourse | null]>([null, null, null]);
  const [loading, setLoading] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("comparison");
  const manualCompareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await supabase.from("courses").select("*, institutes(id, name, slug, city, state, rating, total_reviews, students_count, success_rate, mode, discount, offer, logo_url, features)").order("name");
      if (data) setCourses(data as any);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const handleCourseSelect = (index: number, value: string) => {
    const found = courses.find(c => c.id === value);
    if (found) { const next = [...courseSelections] as typeof courseSelections; next[index] = found; setCourseSelections(next); }
  };
  const handleCourseRemove = (index: number) => { const next = [...courseSelections] as typeof courseSelections; next[index] = null; setCourseSelections(next); };
  const activeCourses = courseSelections.filter(Boolean) as DBCourse[];

  const bestForYou = useMemo(() => {
    if (activeCourses.length < 2) return [];
    return [...activeCourses].sort((a, b) => {
      const scoreA = (a.institutes?.rating || 0) * 20 + (a.institutes?.success_rate || 0) - ((a.fees || 0) / 10000);
      const scoreB = (b.institutes?.rating || 0) * 20 + (b.institutes?.success_rate || 0) - ((b.fees || 0) / 10000);
      return scoreB - scoreA;
    });
  }, [activeCourses]);

  const maxFees = Math.max(...activeCourses.map(c => c.fees || 0), 1);

  const scrollToManualCompare = () => {
    manualCompareRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const breadcrumbs = [{ name: "Home", url: "/" }, { name: "Compare Coaching", url: "/compare" }];

  const cardColors = ["139, 92, 246", "59, 130, 246", "16, 185, 129"];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Compare MBA Coaching Courses Side by Side — Fees, Faculty & Success Rate | MBA Compass"
        description="Compare top MBA coaching courses side by side. Analyze fees, curriculum, success rates, faculty ratings. AI-powered coaching finder for personalized recommendations."
        keywords={[
          "compare MBA colleges", "B-school comparison", "college vs college", "MBA fees comparison", "placement comparison",
          "compare IIM Ahmedabad vs IIM Bangalore placements", "MBA college comparison tool for ROI",
          "comparison of top private MBA colleges in India", "detailed comparison of MBA curriculum and faculty",
          "compare MBA colleges in Delhi vs Mumbai", "B-school side-by-side comparison for admission",
        ]}
        canonical="https://mbacompass.in/compare"
        jsonLd={[
          generateComparisonSchema(activeCourses),
          generateBreadcrumbSchema(breadcrumbs),
          generateFAQSchema(compareFaqs),
        ]}
      />


      {/* Hero — immersive gradient with floating elements */}
      <header className="relative overflow-hidden hero-gradient py-12 md:py-20">
        {/* Floating decorative elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            className="absolute top-8 left-[10%] w-16 h-16 rounded-2xl bg-primary-foreground/5 backdrop-blur-sm border border-primary-foreground/10"
            animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute top-16 right-[15%] w-10 h-10 rounded-full bg-primary-foreground/5 backdrop-blur-sm border border-primary-foreground/10"
            animate={{ y: [0, 12, 0], rotate: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          <motion.div
            className="absolute bottom-8 left-[25%] w-12 h-12 rounded-xl bg-primary-foreground/5 backdrop-blur-sm border border-primary-foreground/10"
            animate={{ y: [0, -10, 0], x: [0, 5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          />
          <motion.div
            className="absolute bottom-12 right-[10%] w-20 h-20 rounded-3xl bg-primary-foreground/[0.03] backdrop-blur-sm border border-primary-foreground/5"
            animate={{ y: [0, 8, 0], rotate: [0, 3, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          {/* Radial glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary-foreground/[0.03] rounded-full blur-[100px]" />
        </div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <Badge className="bg-primary-foreground/15 text-primary-foreground border border-primary-foreground/20 mb-4 text-xs px-4 py-1.5 backdrop-blur-sm">
                <Scale className="w-3.5 h-3.5 mr-1.5" /> Smart Comparison Tool
              </Badge>
            </motion.div>
            <h1 className="font-heading text-3xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-4 leading-tight">
              <motion.span
                className="inline-block"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                Compare MBA Coaching
              </motion.span>
              <br />
              <motion.span
                className="inline-block bg-gradient-to-r from-primary-foreground via-primary-foreground/80 to-primary-foreground bg-clip-text"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.5 }}
              >
                Courses
              </motion.span>
            </h1>
            <motion.p
              className="text-primary-foreground/60 max-w-xl mx-auto text-sm md:text-base leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              Find the perfect coaching institute. Use AI or compare courses manually — fees, curriculum & success rates side by side.
            </motion.p>

            {/* Animated stats row */}
            <motion.div
              className="flex flex-wrap items-center justify-center gap-6 mt-8"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
            >
              {[
                { icon: Building2, value: `${new Set(courses.map(c => c.institutes?.name)).size}+`, label: "Institutes" },
                { icon: BookOpen, value: `${courses.length}+`, label: "Courses" },
                { icon: Users, value: "25K+", label: "Students Helped" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  variants={staggerItem}
                  className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/10"
                >
                  <stat.icon className="w-4 h-4 text-primary-foreground/70" />
                  <div className="text-left">
                    <div className="font-heading font-bold text-primary-foreground text-sm">{stat.value}</div>
                    <div className="text-[10px] text-primary-foreground/50">{stat.label}</div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </header>

      {/* AI Coaching Finder */}
      <section className="container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto mb-8">
          <AICoachingFinder onTryManually={scrollToManualCompare} />
        </div>

        {/* Animated Divider */}
        <div className="relative mb-8" ref={manualCompareRef}>
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center">
            <motion.span
              className="bg-background px-5 py-1.5 text-sm text-muted-foreground font-medium flex items-center gap-2 rounded-full border border-border"
              whileHover={{ scale: 1.05 }}
            >
              <Scale className="w-4 h-4 text-primary" /> Or compare manually
            </motion.span>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-14 md:pb-20">
        {/* Selection Cards — glassmorphism style */}
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div key={i} variants={staggerItem}>
              <Card className={`relative overflow-hidden transition-all duration-300 ${courseSelections[i] ? "border-primary/40 shadow-lg" : "border-dashed border-muted-foreground/30 hover:border-primary/30 hover:shadow-md"}`}>
                {/* Colored top bar */}
                {courseSelections[i] && (
                  <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, rgba(${cardColors[i]}, 0.8), rgba(${cardColors[i]}, 0.3))` }} />
                )}

                <CardContent className="pt-6 pb-6">
                  <AnimatePresence mode="wait">
                    {courseSelections[i] ? (
                      <motion.div
                        key="selected"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                        className="relative"
                      >
                        <motion.button
                          onClick={() => handleCourseRemove(i)}
                          className="absolute -top-2 -right-2 w-7 h-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-lg z-10"
                          whileHover={{ scale: 1.15, rotate: 90 }}
                          whileTap={{ scale: 0.9 }}
                          aria-label="Remove course"
                        >
                          <X className="w-3.5 h-3.5" />
                        </motion.button>
                        <div className="text-center">
                          {courseSelections[i]!.institutes?.logo_url ? (
                            <motion.img
                              src={courseSelections[i]!.institutes!.logo_url!}
                              alt={`${courseSelections[i]!.institutes?.name} logo`}
                              className="w-16 h-16 rounded-2xl object-contain bg-muted p-1.5 mx-auto mb-3 ring-2 ring-border"
                              loading="lazy"
                              initial={{ rotate: -5 }}
                              animate={{ rotate: 0 }}
                              transition={{ duration: 0.3 }}
                            />
                          ) : (
                            <div
                              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 text-white font-bold text-xl"
                              style={{ background: `linear-gradient(135deg, rgba(${cardColors[i]}, 0.9), rgba(${cardColors[i]}, 0.5))` }}
                            >
                              {courseSelections[i]!.institutes?.name?.charAt(0)}
                            </div>
                          )}
                          <h3 className="font-heading font-bold text-foreground text-sm">{courseSelections[i]!.institutes?.name}</h3>
                          <p className="text-xs font-medium mt-0.5" style={{ color: `rgba(${cardColors[i]}, 1)` }}>{courseSelections[i]!.name}</p>
                          <div className="flex items-center justify-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {courseSelections[i]!.institutes?.rating || "N/A"}</span>
                            <span className="w-1 h-1 rounded-full bg-border" />
                            <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {courseSelections[i]!.institutes?.city || "India"}</span>
                          </div>
                          {courseSelections[i]!.fees && (
                            <motion.div
                              className="mt-3 font-heading font-bold text-xl"
                              style={{ color: `rgba(${cardColors[i]}, 1)` }}
                              initial={{ scale: 0.5 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 300 }}
                            >
                              ₹{Number(courseSelections[i]!.fees).toLocaleString()}
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center"
                      >
                        <div
                          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 border-2 border-dashed"
                          style={{ borderColor: `rgba(${cardColors[i]}, 0.3)`, background: `rgba(${cardColors[i]}, 0.05)` }}
                        >
                          <Plus className="w-6 h-6" style={{ color: `rgba(${cardColors[i]}, 0.5)` }} />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground mb-3">Select Course {i + 1}</p>
                        <Select onValueChange={(v) => handleCourseSelect(i, v)}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Choose a course..." /></SelectTrigger>
                          <SelectContent>
                            {courses.filter(x => !courseSelections.some(s => s?.id === x.id)).map(x => (
                              <SelectItem key={x.id} value={x.id}>{x.institutes?.name} — {x.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {activeCourses.length >= 2 ? (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 h-12 bg-muted/50 p-1 rounded-xl">
                {[
                  { value: "comparison", label: "Overview", icon: BarChart3 },
                  { value: "curriculum", label: "Curriculum", icon: BookOpen },
                  { value: "offers", label: "Offers", icon: Tag },
                  { value: "bestforyou", label: "Best for You", icon: Sparkles },
                ].map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="gap-1.5 text-xs sm:text-sm data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg transition-all"
                  >
                    <tab.icon className="w-4 h-4" /> <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="comparison">
                <motion.div
                  className="space-y-6"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                >
                  {/* Quick Stats */}
                  <motion.div variants={staggerItem} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Avg. Fees", icon: IndianRupee, value: `₹${Math.round(activeCourses.reduce((s, c) => s + (c.fees || 0), 0) / activeCourses.length).toLocaleString()}`, color: "139, 92, 246" },
                      { label: "Avg. Rating", icon: Star, value: (activeCourses.reduce((s, c) => s + (c.institutes?.rating || 0), 0) / activeCourses.length).toFixed(1), color: "245, 158, 11" },
                      { label: "Avg. Success", icon: TrendingUp, value: `${Math.round(activeCourses.reduce((s, c) => s + (c.institutes?.success_rate || 0), 0) / activeCourses.length)}%`, color: "16, 185, 129" },
                      { label: "Compared", icon: Scale, value: String(activeCourses.length), color: "59, 130, 246" },
                    ].map((stat, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ scale: 1.03, y: -2 }}
                        className="rounded-xl border border-border bg-card p-3.5 shadow-sm"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center"
                            style={{ background: `rgba(${stat.color}, 0.1)` }}
                          >
                            <stat.icon className="w-4 h-4" style={{ color: `rgba(${stat.color}, 1)` }} />
                          </div>
                          <div>
                            <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                            <div className="font-heading font-bold text-foreground text-sm">{stat.value}</div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>

                  {/* Comparison Table */}
                  <motion.div variants={staggerItem}>
                    <Card className="overflow-hidden">
                      <CardHeader className="pb-0 bg-muted/30 border-b border-border">
                        <CardTitle className="font-heading text-base flex items-center gap-2 pb-3">
                          <BarChart3 className="w-5 h-5 text-primary" /> Detailed Comparison
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/20">
                              <th className="text-left py-3.5 px-4 font-heading font-semibold text-foreground min-w-[130px] sticky left-0 bg-muted/40 backdrop-blur-sm z-10">Feature</th>
                              {activeCourses.map((s, idx) => (
                                <th key={s.id} className="text-left py-3.5 px-4 min-w-[170px]">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-2 h-8 rounded-full flex-shrink-0"
                                      style={{ background: `rgba(${cardColors[idx]}, 0.8)` }}
                                    />
                                    <div>
                                      <div className="font-heading font-semibold text-foreground text-xs">{s.institutes?.name}</div>
                                      <div className="text-[10px] font-normal text-muted-foreground">{s.name}</div>
                                    </div>
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {([
                              { label: "Course Fees", icon: IndianRupee, render: (s: DBCourse, idx: number) => (
                                <span className="font-heading font-bold" style={{ color: `rgba(${cardColors[idx]}, 1)` }}>
                                  {s.fees ? `₹${Number(s.fees).toLocaleString()}` : "N/A"}
                                </span>
                              )},
                              { label: "Duration", icon: Clock, render: (s: DBCourse) => s.duration || "N/A" },
                              { label: "Batch Info", icon: Users, render: (s: DBCourse) => s.batch_info || "N/A" },
                              { label: "Mode", icon: Globe, render: (s: DBCourse) => <Badge variant="secondary" className="text-[10px]">{s.institutes?.mode || "N/A"}</Badge> },
                              { label: "Rating", icon: Star, render: (s: DBCourse) => (
                                <div className="space-y-1.5">
                                  <span className="flex items-center gap-1 font-semibold text-xs"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {s.institutes?.rating || "N/A"}/5</span>
                                  <Progress value={((s.institutes?.rating || 0) / 5) * 100} className="h-1.5 rounded-full" />
                                </div>
                              )},
                              { label: "Success Rate", icon: TrendingUp, render: (s: DBCourse) => (
                                <div className="space-y-1.5">
                                  <span className="font-semibold text-xs">{s.institutes?.success_rate || 0}%</span>
                                  <Progress value={s.institutes?.success_rate || 0} className="h-1.5 rounded-full" />
                                </div>
                              )},
                              { label: "Students", icon: Users, render: (s: DBCourse) => <span className="font-medium">{s.institutes?.students_count || 0}+</span> },
                              { label: "Location", icon: MapPin, render: (s: DBCourse) => `${s.institutes?.city || "N/A"}, ${s.institutes?.state || ""}`.replace(/, $/, '') },
                              { label: "Features", icon: CheckCircle, render: (s: DBCourse) => (
                                <div className="space-y-1">
                                  {(s.institutes?.features || []).slice(0, 3).map((f, j) => (
                                    <div key={j} className="text-[11px] flex items-start gap-1.5"><CheckCircle className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><span className="line-clamp-1">{f}</span></div>
                                  ))}
                                </div>
                              )},
                            ] as { label: string; icon: any; render: (s: DBCourse, idx: number) => React.ReactNode }[]).map((row, idx) => (
                              <tr key={row.label} className={`border-b border-border/50 transition-colors hover:bg-muted/20 ${idx % 2 === 0 ? "bg-muted/5" : ""}`}>
                                <td className="py-3 px-4 sticky left-0 bg-card z-10">
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                    <row.icon className="w-3.5 h-3.5 text-primary/60" />
                                    {row.label}
                                  </div>
                                </td>
                                {activeCourses.map((s, cIdx) => (<td key={s.id} className="py-3 px-4 text-foreground">{row.render(s, cIdx)}</td>))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Fee Comparison Visual */}
                  <motion.div variants={staggerItem}>
                    <Card>
                      <CardHeader className="pb-3"><CardTitle className="font-heading text-base flex items-center gap-2"><IndianRupee className="w-5 h-5 text-primary" /> Fee Comparison</CardTitle></CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {activeCourses.map((s, i) => (
                            <div key={s.id} className="space-y-1.5">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-foreground text-xs flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ background: `rgba(${cardColors[i]}, 0.8)` }} />
                                  {s.institutes?.name}
                                </span>
                                <span className="font-heading font-bold text-sm" style={{ color: `rgba(${cardColors[i]}, 1)` }}>₹{Number(s.fees || 0).toLocaleString()}</span>
                              </div>
                              <div className="relative h-8 bg-muted/50 rounded-xl overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${((s.fees || 0) / maxFees) * 100}%` }}
                                  transition={{ duration: 1, delay: i * 0.15, ease: "easeOut" }}
                                  className="h-full rounded-xl flex items-center justify-end pr-3"
                                  style={{ background: `linear-gradient(90deg, rgba(${cardColors[i]}, 0.7), rgba(${cardColors[i]}, 0.9))` }}
                                >
                                  <span className="text-[10px] font-bold text-white drop-shadow-sm">₹{Number(s.fees || 0).toLocaleString()}</span>
                                </motion.div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              </TabsContent>

              {/* Curriculum Tab */}
              <TabsContent value="curriculum">
                <motion.div
                  className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                >
                  {activeCourses.map((s, i) => (
                    <motion.div key={s.id} variants={staggerItem}>
                      <Card className="overflow-hidden h-full">
                        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, rgba(${cardColors[i]}, 0.8), rgba(${cardColors[i]}, 0.3))` }} />
                        <CardHeader className="pb-3">
                          <CardTitle className="font-heading text-sm flex items-center gap-2">
                            <div className="w-2 h-5 rounded-full" style={{ background: `rgba(${cardColors[i]}, 0.8)` }} />
                            {s.institutes?.name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">{s.name}</p>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-2 mb-4">
                            <div className="rounded-lg p-2.5 text-center border border-border bg-muted/30">
                              <Clock className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                              <div className="text-[10px] text-muted-foreground">Duration</div>
                              <div className="font-semibold text-foreground text-xs">{s.duration || "N/A"}</div>
                            </div>
                            <div className="rounded-lg p-2.5 text-center border border-border bg-muted/30">
                              <IndianRupee className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
                              <div className="text-[10px] text-muted-foreground">Fees</div>
                              <div className="font-semibold text-xs" style={{ color: `rgba(${cardColors[i]}, 1)` }}>{s.fees ? `₹${Number(s.fees).toLocaleString()}` : "N/A"}</div>
                            </div>
                          </div>
                          <h4 className="font-semibold text-foreground text-xs mb-2.5 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-primary" />
                            Curriculum ({(s.curriculum || []).length} topics)
                          </h4>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {(s.curriculum || []).map((item, idx) => (
                              <motion.div
                                key={idx}
                                className="flex items-start gap-1.5 text-xs"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.03 }}
                              >
                                <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: `rgba(${cardColors[i]}, 0.7)` }} />
                                <span className="text-muted-foreground">{item}</span>
                              </motion.div>
                            ))}
                            {(s.curriculum || []).length === 0 && <p className="text-xs text-muted-foreground italic">Not available</p>}
                          </div>
                          {s.syllabus_url && (
                            <a href={s.syllabus_url} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm" className="w-full mt-4 gap-1.5 text-xs"><BookOpen className="w-3 h-3" /> Download Syllabus</Button>
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              </TabsContent>

              {/* Offers Tab */}
              <TabsContent value="offers">
                <motion.div
                  className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                >
                  {activeCourses.map((s, i) => (
                    <motion.div key={s.id} variants={staggerItem}>
                      <Card className="overflow-hidden h-full relative">
                        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, rgba(${cardColors[i]}, 0.8), rgba(${cardColors[i]}, 0.3))` }} />
                        {/* Decorative glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none" style={{ background: `radial-gradient(circle, rgba(${cardColors[i]}, 0.05) 0%, transparent 70%)` }} />
                        <CardContent className="pt-6 relative">
                          <div className="text-center mb-5">
                            <h3 className="font-heading font-bold text-foreground">{s.institutes?.name}</h3>
                            <p className="text-xs" style={{ color: `rgba(${cardColors[i]}, 1)` }}>{s.name}</p>
                          </div>
                          <div className="space-y-3">
                            {s.institutes?.discount && (
                              <motion.div
                                className="rounded-xl p-3.5 border"
                                style={{ borderColor: `rgba(${cardColors[i]}, 0.2)`, background: `rgba(${cardColors[i]}, 0.03)` }}
                                whileHover={{ scale: 1.02 }}
                              >
                                <div className="flex items-center gap-1.5 mb-1"><Tag className="w-3.5 h-3.5" style={{ color: `rgba(${cardColors[i]}, 0.8)` }} /><span className="text-xs font-semibold text-foreground">Discount</span></div>
                                <p className="text-xs text-muted-foreground">{s.institutes.discount}</p>
                              </motion.div>
                            )}
                            {s.institutes?.offer && (
                              <motion.div
                                className="rounded-xl p-3.5 border"
                                style={{ borderColor: `rgba(${cardColors[i]}, 0.3)`, background: `rgba(${cardColors[i]}, 0.05)` }}
                                whileHover={{ scale: 1.02 }}
                              >
                                <div className="flex items-center gap-1.5 mb-1"><Sparkles className="w-3.5 h-3.5" style={{ color: `rgba(${cardColors[i]}, 0.9)` }} /><span className="text-xs font-semibold text-foreground">Special Offer</span></div>
                                <p className="text-xs text-muted-foreground">{s.institutes.offer}</p>
                              </motion.div>
                            )}
                            {!s.institutes?.discount && !s.institutes?.offer && <div className="text-center py-4 text-xs text-muted-foreground">No active offers</div>}
                            <div className="text-center pt-3 border-t border-border">
                              <p className="text-2xl font-heading font-bold mb-3" style={{ color: `rgba(${cardColors[i]}, 1)` }}>
                                {s.fees ? `₹${Number(s.fees).toLocaleString()}` : "Contact"}
                              </p>
                              <Link to={`/institute/${s.institutes?.slug}`}>
                                <Button
                                  size="sm"
                                  className="w-full gap-1.5 text-xs text-white"
                                  style={{ background: `rgba(${cardColors[i]}, 0.85)` }}
                                >
                                  View Details <ArrowRight className="w-3 h-3" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              </TabsContent>

              {/* Best for You Tab */}
              <TabsContent value="bestforyou">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
                  <Card className="overflow-hidden">
                    <CardHeader className="pb-3 bg-muted/20 border-b border-border">
                      <CardTitle className="font-heading text-base flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" /> AI-Powered Recommendation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {/* Scoring weights */}
                      <div className="grid grid-cols-3 gap-3 mb-6">
                        {[
                          { icon: Star, label: "Rating", weight: "40%", color: "245, 158, 11" },
                          { icon: TrendingUp, label: "Success Rate", weight: "35%", color: "16, 185, 129" },
                          { icon: IndianRupee, label: "Value", weight: "25%", color: "139, 92, 246" },
                        ].map((w, i) => (
                          <motion.div
                            key={i}
                            className="rounded-xl p-3 text-center border border-border"
                            whileHover={{ y: -2 }}
                          >
                            <div className="w-8 h-8 rounded-lg mx-auto mb-1.5 flex items-center justify-center" style={{ background: `rgba(${w.color}, 0.1)` }}>
                              <w.icon className="w-4 h-4" style={{ color: `rgba(${w.color}, 1)` }} />
                            </div>
                            <div className="text-[10px] text-muted-foreground">{w.label}</div>
                            <div className="font-heading font-bold text-foreground text-sm">{w.weight}</div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Rankings */}
                      <div className="space-y-3">
                        {bestForYou.map((s, i) => {
                          const score = ((s.institutes?.rating || 0) * 20 + (s.institutes?.success_rate || 0) - ((s.fees || 0) / 10000)).toFixed(1);
                          const rankEmoji = ["🥇", "🥈", "🥉"][i] || "";
                          return (
                            <motion.div
                              key={s.id}
                              className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${i === 0 ? "border-primary/40 bg-primary/[0.03] shadow-lg" : "border-border hover:border-primary/20"}`}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.1 }}
                              whileHover={{ scale: 1.01 }}
                            >
                              <div
                                className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg flex-shrink-0 text-white"
                                style={{ background: i === 0 ? `linear-gradient(135deg, rgba(${cardColors[0]}, 0.9), rgba(${cardColors[1]}, 0.9))` : `rgba(${cardColors[i] || cardColors[2]}, 0.15)`, color: i === 0 ? 'white' : `rgba(${cardColors[i] || cardColors[2]}, 0.9)` }}
                              >
                                <span className="text-xl">{rankEmoji || `#${i + 1}`}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-heading font-bold text-foreground">{s.institutes?.name}</h3>
                                  {i === 0 && <Badge className="bg-primary text-primary-foreground text-[10px] px-2">🏆 Top Pick</Badge>}
                                </div>
                                <p className="text-xs text-primary font-medium">{s.name}</p>
                                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                                  <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {s.institutes?.rating}</span>
                                  <span className="flex items-center gap-0.5"><TrendingUp className="w-3 h-3 text-primary" /> {s.institutes?.success_rate}%</span>
                                  <span className="font-bold text-foreground">{s.fees ? `₹${Number(s.fees).toLocaleString()}` : "N/A"}</span>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-[10px] text-muted-foreground mb-0.5">Score</div>
                                <motion.div
                                  className={`font-heading font-bold text-2xl ${i === 0 ? "text-primary" : "text-foreground"}`}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring", delay: i * 0.15 }}
                                >
                                  {score}
                                </motion.div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </TabsContent>
            </Tabs>
          </motion.div>
        ) : (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Scale className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            </motion.div>
            <h2 className="font-heading text-xl font-bold text-foreground mb-2">Select at least 2 courses to compare</h2>
            <p className="text-sm text-muted-foreground">Choose from {courses.length} courses across {new Set(courses.map(c => c.institutes?.name)).size} institutes</p>
          </motion.div>
        )}

        {/* FAQ Section */}
        <section className="mt-14" aria-label="Frequently asked questions">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center mb-6">
              <h2 className="font-heading text-xl md:text-2xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                <HelpCircle className="w-6 h-6 text-primary" /> Frequently Asked Questions
              </h2>
              <p className="text-sm text-muted-foreground">Everything you need to know about comparing coaching courses</p>
            </div>
            <div className="max-w-2xl mx-auto space-y-2.5">
              {compareFaqs.map((faq, i) => (
                <motion.div
                  key={i}
                  className="bg-card rounded-xl border border-border overflow-hidden transition-all hover:shadow-sm"
                  initial={false}
                >
                  <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left group" aria-expanded={expandedFaq === i}>
                    <h3 className="font-heading font-semibold text-foreground text-sm pr-3 group-hover:text-primary transition-colors">{faq.q}</h3>
                    <motion.div
                      animate={{ rotate: expandedFaq === i ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {expandedFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className="px-4 pb-4 -mt-1"><p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p></div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Internal Links */}
        <nav className="mt-8" aria-label="Related pages">
          <motion.div
            className="grid sm:grid-cols-2 md:grid-cols-4 gap-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {[
              { label: "Top MBA Colleges", path: "/colleges", desc: "Rankings & placements", icon: GraduationCap },
              { label: "MBA Blog", path: "/blog", desc: "Tips & career advice", icon: BookOpen },
              { label: "Profile Analyzer", path: "/profile-analyzer", desc: "Check your chances", icon: Target },
              { label: "Contact Us", path: "/contact", desc: "Get guidance", icon: Phone },
            ].map((link, i) => (
              <motion.div key={i} variants={staggerItem}>
                <Link to={link.path} className="block bg-card rounded-xl p-4 border border-border hover:border-primary/40 hover:shadow-md transition-all group">
                  <div className="flex items-center gap-2 mb-1">
                    <link.icon className="w-4 h-4 text-primary" />
                    <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors text-xs">{link.label}</h3>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{link.desc}</p>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </nav>
      </section>
    </div>
  );
};

export default ComparePage;
