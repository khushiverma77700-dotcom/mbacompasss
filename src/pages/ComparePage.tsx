import { useState, useEffect, useMemo, useRef } from "react";
import { X, Star, Tag, CheckCircle, ArrowRight, BarChart3, TrendingUp, Clock, Users, BookOpen, GraduationCap, Award, Sparkles, Scale, IndianRupee, ThumbsUp, Shield, Zap, HelpCircle, ChevronDown, ChevronUp, MapPin, Globe, Phone, ExternalLink, Building2, Target, Percent, Trophy, Medal } from "lucide-react";
import { motion } from "framer-motion";
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
  { q: "How do I compare MBA coaching courses on BestMBACoaching.com?", a: "Simply select up to 3 courses from the dropdown menus above. Our tool will automatically generate a detailed side-by-side comparison covering fees, curriculum, success rates, faculty, batch timings, and more." },
  { q: "What factors does the 'Best for You' algorithm consider?", a: "Our algorithm weighs three critical factors: Institute Rating (40%), Historical Success Rate (35%), and Value-for-Money based on fees (25%)." },
  { q: "Can I compare online and offline MBA coaching courses?", a: "Yes! Our comparison tool works across all teaching modes — online, offline, and hybrid. The 'Teaching Mode' row clearly indicates the delivery format." },
  { q: "How does the AI Coaching Finder work?", a: "Our AI Coaching Finder asks you a series of questions about your preferences — learning mode, budget, location, target exams, work experience, and preparation stage. It then uses AI to analyze our entire coaching database and recommends the best-fit institutes personalized for your profile." },
  { q: "Are the coaching fees shown inclusive of all charges?", a: "The fees displayed are the base course fees. Additional charges for premium study material, extra mock tests, or personal mentoring may apply separately." },
  { q: "How often is the comparison data updated?", a: "We update our coaching and college data regularly. Fees, batch information, and placement stats are verified periodically to ensure accuracy." },
];

const ComparePage = () => {
  const [courses, setCourses] = useState<DBCourse[]>([]);
  const [courseSelections, setCourseSelections] = useState<[DBCourse | null, DBCourse | null, DBCourse | null]>([null, null, null]);
  const [loading, setLoading] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
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

  const breadcrumbs = [{ name: "Home", url: "/" }, { name: "Compare MBA Coaching", url: "/compare" }];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Compare MBA Coaching Courses — Side by Side | BestMBACoaching"
        description="Compare top MBA coaching courses side by side. Analyze fees, curriculum, success rates & faculty. Use AI to find the best coaching for your profile."
        keywords={["compare MBA courses", "MBA coaching comparison", "CAT coaching compare", "MBA coaching fees", "best MBA coaching India", "AI coaching finder"]}
        canonical="https://bestmbacoaching.com/compare"
        jsonLd={generateComparisonSchema(activeCourses)}
      />

      {/* Breadcrumb */}
      <nav className="container mx-auto px-4 pt-4" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {breadcrumbs.map((item, i) => (
            <li key={i} className="flex items-center gap-1.5">
              {i > 0 && <span>/</span>}
              {i < breadcrumbs.length - 1 ? (
                <Link to={item.url} className="hover:text-primary transition-colors">{item.name}</Link>
              ) : (
                <span className="text-foreground font-medium">{item.name}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      {/* Hero */}
      <div className="hero-gradient py-10 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="bg-primary-foreground/20 text-primary-foreground border-none mb-4 text-xs px-3 py-1">
              <Scale className="w-3.5 h-3.5 mr-1.5" /> Smart Comparison Tool
            </Badge>
            <h1 className="font-heading text-3xl md:text-5xl font-bold text-primary-foreground mb-4">
              Compare MBA Coaching Courses
            </h1>
            <p className="text-primary-foreground/70 max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
              Find the perfect MBA coaching institute. Use our AI-powered finder or compare courses manually — fees, curriculum, success rates & faculty side by side.
            </p>

            {/* Quick stats */}
            <div className="flex items-center justify-center gap-6 mt-6 flex-wrap">
              {[
                { icon: BookOpen, label: `${courses.length}+ Courses` },
                { icon: Building2, label: `${new Set(courses.map(c => c.institutes?.name)).size}+ Institutes` },
                { icon: Sparkles, label: "AI Powered" },
              ].map((stat, i) => (
                <div key={i} className="flex items-center gap-1.5 text-primary-foreground/80 text-xs">
                  <stat.icon className="w-3.5 h-3.5" />
                  <span className="font-medium">{stat.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* AI Coaching Finder */}
      <div className="container mx-auto px-4 py-6 md:py-10">
        <div className="max-w-3xl mx-auto mb-8">
          <AICoachingFinder onTryManually={scrollToManualCompare} />
        </div>

        {/* Divider */}
        <div className="relative mb-8" ref={manualCompareRef}>
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center">
            <span className="bg-background px-5 text-sm text-muted-foreground font-medium flex items-center gap-2">
              <Scale className="w-4 h-4" /> Or compare manually
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-10 md:pb-14">
        {/* How It Works */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: "1", icon: BookOpen, title: "Select Courses", desc: "Choose up to 3 coaching courses to compare" },
              { step: "2", icon: BarChart3, title: "Compare Details", desc: "View fees, curriculum, ratings & success rates" },
              { step: "3", icon: Sparkles, title: "Find Best Fit", desc: "AI-powered recommendation based on your needs" },
            ].map((item, i) => (
              <Card key={i} className="bg-gradient-to-b from-secondary/30 to-background border-border/50">
                <CardContent className="pt-5 pb-5 text-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <span className="font-heading font-bold text-primary text-sm">{item.step}</span>
                  </div>
                  <h3 className="font-heading font-semibold text-foreground text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* Selection cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[0, 1, 2].map((i) => (
            <Card key={i} className={`border-2 transition-all ${courseSelections[i] ? "border-primary/40 bg-secondary/20 shadow-md" : "border-dashed border-muted-foreground/30 hover:border-primary/20"}`}>
              <CardContent className="pt-5 pb-5">
                {courseSelections[i] ? (
                  <div className="relative">
                    <button onClick={() => handleCourseRemove(i)} className="absolute -top-2 -right-2 w-7 h-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform z-10">
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="text-center">
                      {courseSelections[i]!.institutes?.logo_url ? (
                        <img src={courseSelections[i]!.institutes!.logo_url!} alt="" className="w-14 h-14 rounded-xl object-contain bg-muted p-1 mx-auto mb-2.5" />
                      ) : (
                        <div className="w-14 h-14 hero-gradient rounded-xl flex items-center justify-center mx-auto mb-2.5 text-primary-foreground font-bold text-lg">{courseSelections[i]!.institutes?.name?.charAt(0)}</div>
                      )}
                      <h3 className="font-heading font-semibold text-foreground text-sm">{courseSelections[i]!.institutes?.name}</h3>
                      <p className="text-xs text-primary font-medium mt-0.5">{courseSelections[i]!.name}</p>
                      <div className="flex items-center justify-center gap-2.5 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {courseSelections[i]!.institutes?.rating || "N/A"}</span>
                        <span>•</span>
                        <span>{courseSelections[i]!.institutes?.city || "India"}</span>
                      </div>
                      {courseSelections[i]!.fees && <div className="mt-2 font-heading font-bold text-primary text-lg">₹{Number(courseSelections[i]!.fees).toLocaleString()}</div>}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mx-auto mb-2.5"><BookOpen className="w-6 h-6 text-muted-foreground" /></div>
                    <p className="text-sm font-medium text-muted-foreground mb-2.5">Select Course {i + 1}</p>
                    <Select onValueChange={(v) => handleCourseSelect(i, v)}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Choose a course..." /></SelectTrigger>
                      <SelectContent>
                        {courses.filter(x => !courseSelections.some(s => s?.id === x.id)).map(x => (
                          <SelectItem key={x.id} value={x.id}>{x.institutes?.name} — {x.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {activeCourses.length >= 2 ? (
          <Tabs defaultValue="comparison" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 h-11">
              <TabsTrigger value="comparison" className="gap-1 text-xs sm:text-sm"><BarChart3 className="w-4 h-4" /> Overview</TabsTrigger>
              <TabsTrigger value="curriculum" className="gap-1 text-xs sm:text-sm"><BookOpen className="w-4 h-4" /> Curriculum</TabsTrigger>
              <TabsTrigger value="offers" className="gap-1 text-xs sm:text-sm"><Tag className="w-4 h-4" /> Offers</TabsTrigger>
              <TabsTrigger value="bestforyou" className="gap-1 text-xs sm:text-sm"><Sparkles className="w-4 h-4" /> Best for You</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="comparison">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: "Avg. Fees", icon: IndianRupee, value: `₹${Math.round(activeCourses.reduce((s, c) => s + (c.fees || 0), 0) / activeCourses.length).toLocaleString()}` },
                    { label: "Avg. Rating", icon: Star, value: (activeCourses.reduce((s, c) => s + (c.institutes?.rating || 0), 0) / activeCourses.length).toFixed(1) },
                    { label: "Avg. Success Rate", icon: TrendingUp, value: `${Math.round(activeCourses.reduce((s, c) => s + (c.institutes?.success_rate || 0), 0) / activeCourses.length)}%` },
                    { label: "Courses Compared", icon: Scale, value: String(activeCourses.length) },
                  ].map((stat, i) => (
                    <Card key={i} className="bg-secondary/30">
                      <CardContent className="pt-3 pb-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><stat.icon className="w-4 h-4 text-primary" /></div>
                        <div>
                          <div className="text-[11px] text-muted-foreground">{stat.label}</div>
                          <div className="font-heading font-bold text-foreground">{stat.value}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardHeader className="pb-3"><CardTitle className="font-heading text-lg flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Detailed Comparison</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-primary/20">
                          <th className="text-left py-3 px-3 font-heading font-semibold text-foreground min-w-[130px] bg-muted/30">Feature</th>
                          {activeCourses.map(s => (
                            <th key={s.id} className="text-left py-3 px-3 font-heading font-semibold text-primary min-w-[160px]">
                              <div className="text-foreground text-xs">{s.institutes?.name}</div>
                              <div className="text-[10px] font-normal text-muted-foreground">{s.name}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {([
                          { label: "Course Fees", render: (s: DBCourse) => <span className="font-heading font-bold text-primary">{s.fees ? `₹${Number(s.fees).toLocaleString()}` : "N/A"}</span> },
                          { label: "Duration", render: (s: DBCourse) => s.duration || "N/A" },
                          { label: "Batch Info", render: (s: DBCourse) => s.batch_info || "N/A" },
                          { label: "Teaching Mode", render: (s: DBCourse) => <Badge variant="secondary" className="text-[10px]">{s.institutes?.mode || "N/A"}</Badge> },
                          { label: "Rating", render: (s: DBCourse) => (
                            <div className="space-y-1">
                              <span className="flex items-center gap-1 font-semibold text-xs"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {s.institutes?.rating || "N/A"}/5</span>
                              <Progress value={((s.institutes?.rating || 0) / 5) * 100} className="h-1" />
                            </div>
                          )},
                          { label: "Reviews", render: (s: DBCourse) => `${s.institutes?.total_reviews || 0}` },
                          { label: "Success Rate", render: (s: DBCourse) => (
                            <div className="space-y-1">
                              <span className="font-semibold text-xs">{s.institutes?.success_rate || 0}%</span>
                              <Progress value={s.institutes?.success_rate || 0} className="h-1" />
                            </div>
                          )},
                          { label: "Students", render: (s: DBCourse) => `${s.institutes?.students_count || 0}+` },
                          { label: "Location", render: (s: DBCourse) => `${s.institutes?.city || "N/A"}, ${s.institutes?.state || ""}`.replace(/, $/, '') },
                          { label: "Curriculum", render: (s: DBCourse) => (
                            <div className="space-y-0.5">
                              {(s.curriculum || []).slice(0, 3).map((c, i) => (
                                <div key={i} className="text-[11px] flex items-start gap-1"><CheckCircle className="w-2.5 h-2.5 text-primary mt-0.5 flex-shrink-0" /><span className="line-clamp-1">{c}</span></div>
                              ))}
                              {(s.curriculum || []).length > 3 && <span className="text-[10px] text-primary">+{(s.curriculum || []).length - 3} more</span>}
                            </div>
                          )},
                          { label: "Features", render: (s: DBCourse) => (
                            <div className="space-y-0.5">
                              {(s.institutes?.features || []).slice(0, 3).map((f, i) => (
                                <div key={i} className="text-[11px] flex items-start gap-1"><CheckCircle className="w-2.5 h-2.5 text-primary mt-0.5 flex-shrink-0" /><span className="line-clamp-1">{f}</span></div>
                              ))}
                            </div>
                          )},
                        ] as { label: string; render: (s: DBCourse) => React.ReactNode }[]).map((row, idx) => (
                          <tr key={row.label} className={`border-b border-border ${idx % 2 === 0 ? "bg-muted/10" : ""}`}>
                            <td className="py-2.5 px-3 text-xs text-muted-foreground font-medium bg-muted/20">{row.label}</td>
                            {activeCourses.map(s => (<td key={s.id} className="py-2.5 px-3 text-foreground">{row.render(s)}</td>))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                {/* Fee Comparison Visual */}
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="font-heading text-lg">Fee Comparison</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {activeCourses.map((s, i) => (
                        <div key={s.id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-foreground text-xs">{s.institutes?.name}</span>
                            <span className="font-heading font-bold text-primary text-sm">₹{Number(s.fees || 0).toLocaleString()}</span>
                          </div>
                          <div className="relative h-7 bg-muted rounded-lg overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${((s.fees || 0) / maxFees) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.2 }} className="h-full hero-gradient rounded-lg flex items-center justify-end pr-2">
                              <span className="text-[10px] font-bold text-primary-foreground">₹{Number(s.fees || 0).toLocaleString()}</span>
                            </motion.div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Curriculum Tab */}
            <TabsContent value="curriculum">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeCourses.map(s => (
                  <Card key={s.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-heading text-sm">{s.institutes?.name} — {s.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-muted/50 rounded-lg p-2 text-center">
                          <div className="text-[10px] text-muted-foreground">Duration</div>
                          <div className="font-semibold text-foreground text-xs">{s.duration || "N/A"}</div>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2 text-center">
                          <div className="text-[10px] text-muted-foreground">Fees</div>
                          <div className="font-semibold text-primary text-xs">{s.fees ? `₹${Number(s.fees).toLocaleString()}` : "N/A"}</div>
                        </div>
                      </div>
                      <h4 className="font-semibold text-foreground text-xs mb-2">Curriculum ({(s.curriculum || []).length} topics)</h4>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {(s.curriculum || []).map((item, idx) => (
                          <div key={idx} className="flex items-start gap-1.5 text-xs"><CheckCircle className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" /><span className="text-muted-foreground">{item}</span></div>
                        ))}
                        {(s.curriculum || []).length === 0 && <p className="text-xs text-muted-foreground italic">Not available</p>}
                      </div>
                      {s.syllabus_url && (
                        <a href={s.syllabus_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="w-full mt-3 gap-1 text-xs"><BookOpen className="w-3 h-3" /> Download Syllabus</Button>
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Offers Tab */}
            <TabsContent value="offers">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeCourses.map(s => (
                  <Card key={s.id} className="border-primary/30 bg-gradient-to-b from-secondary/50 to-background overflow-hidden">
                    <div className="h-1 hero-gradient" />
                    <CardContent className="pt-5">
                      <div className="text-center mb-4">
                        <h3 className="font-heading font-semibold text-foreground text-sm">{s.institutes?.name}</h3>
                        <p className="text-xs text-primary">{s.name}</p>
                      </div>
                      <div className="space-y-2">
                        {s.institutes?.discount && (
                          <div className="bg-card rounded-lg p-3 border border-border">
                            <div className="flex items-center gap-1.5 mb-0.5"><Tag className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-semibold">Discount</span></div>
                            <p className="text-xs text-muted-foreground">{s.institutes.discount}</p>
                          </div>
                        )}
                        {s.institutes?.offer && (
                          <div className="bg-card rounded-lg p-3 border border-primary/30">
                            <div className="flex items-center gap-1.5 mb-0.5"><Sparkles className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-semibold">Special Offer</span></div>
                            <p className="text-xs text-muted-foreground">{s.institutes.offer}</p>
                          </div>
                        )}
                        {!s.institutes?.discount && !s.institutes?.offer && <div className="text-center py-3 text-xs text-muted-foreground">No active offers</div>}
                        <div className="text-center pt-2 border-t border-border">
                          <p className="text-xl font-heading font-bold text-primary mb-2">{s.fees ? `₹${Number(s.fees).toLocaleString()}` : "Contact"}</p>
                          <Link to={`/institute/${s.institutes?.slug}`}>
                            <Button size="sm" className="w-full gap-1 text-xs">View Details <ArrowRight className="w-3 h-3" /></Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Best for You Tab */}
            <TabsContent value="bestforyou">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="font-heading text-lg flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Personalized Recommendation</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 mb-5 text-center">
                    {[
                      { icon: Star, label: "Rating", weight: "40%" },
                      { icon: TrendingUp, label: "Success Rate", weight: "35%" },
                      { icon: IndianRupee, label: "Value", weight: "25%" },
                    ].map((w, i) => (
                      <div key={i} className="bg-muted/50 rounded-lg p-2.5">
                        <w.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                        <div className="text-[10px] text-muted-foreground">{w.label}</div>
                        <div className="font-heading font-bold text-foreground text-sm">{w.weight}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    {bestForYou.map((s, i) => {
                      const score = ((s.institutes?.rating || 0) * 20 + (s.institutes?.success_rate || 0) - ((s.fees || 0) / 10000)).toFixed(1);
                      return (
                        <div key={s.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 ${i === 0 ? "border-primary bg-secondary/50 shadow-md" : "border-border"}`}>
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${i === 0 ? "hero-gradient text-primary-foreground" : "bg-muted text-muted-foreground"}`}>#{i + 1}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-heading font-semibold text-foreground">{s.institutes?.name}</h3>
                              {i === 0 && <Badge className="bg-primary text-primary-foreground text-[10px]">🏆 Top Pick</Badge>}
                            </div>
                            <p className="text-xs text-primary">{s.name}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {s.institutes?.rating}</span>
                              <span>{s.institutes?.success_rate}% success</span>
                              <span className="font-bold text-foreground">{s.fees ? `₹${Number(s.fees).toLocaleString()}` : "N/A"}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-[10px] text-muted-foreground">Score</div>
                            <div className={`font-heading font-bold text-xl ${i === 0 ? "text-primary" : "text-foreground"}`}>{score}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-14">
            <Scale className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Select at least 2 courses to compare</h2>
            <p className="text-sm text-muted-foreground mb-4">Choose from {courses.length} available courses across {new Set(courses.map(c => c.institutes?.name)).size} institutes.</p>
            <p className="text-xs text-muted-foreground">Or use the <span className="text-primary font-semibold">AI Coaching Finder</span> above for personalized recommendations</p>
          </div>
        )}

        {/* FAQ Section */}
        <section className="mt-14 space-y-6">
          <Card className="bg-secondary/20">
            <CardContent className="pt-6 pb-6">
              <h2 className="font-heading text-xl font-bold text-foreground mb-5 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" /> Frequently Asked Questions
              </h2>
              <div className="space-y-2">
                {compareFaqs.map((faq, i) => (
                  <div key={i} className="bg-card rounded-xl border border-border overflow-hidden">
                    <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left">
                      <h3 className="font-heading font-semibold text-foreground text-sm pr-3">{faq.q}</h3>
                      {expandedFaq === i ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                    </button>
                    {expandedFaq === i && <div className="px-4 pb-4 -mt-1"><p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p></div>}
                  </div>
                ))}
              </div>
              <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(compareFaqs)) }} />
            </CardContent>
          </Card>

          {/* Internal Links */}
          <Card className="bg-secondary/20">
            <CardContent className="pt-6 pb-6">
              <h2 className="font-heading text-lg font-bold text-foreground mb-3">Explore More</h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Top MBA Colleges", path: "/colleges", desc: "Rankings & placements" },
                  { label: "MBA Blog", path: "/blog", desc: "Tips & career advice" },
                  { label: "Profile Analyzer", path: "/profile-analyzer", desc: "Check your chances" },
                  { label: "Contact Us", path: "/contact", desc: "Get guidance" },
                ].map((link, i) => (
                  <Link key={i} to={link.path} className="bg-card rounded-lg p-3 border border-border hover:border-primary/40 transition-colors group">
                    <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors text-xs">{link.label}</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{link.desc}</p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default ComparePage;
