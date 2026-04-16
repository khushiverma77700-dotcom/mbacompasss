import { useState, useEffect, useMemo, useRef } from "react";
import { X, Star, CheckCircle, BarChart3, TrendingUp, Users, BookOpen, GraduationCap, Award, Sparkles, Scale, IndianRupee, HelpCircle, ChevronDown, ChevronUp, MapPin, ExternalLink, Building2, Target, Trophy, Calendar, Ruler, Percent, Shield, Layers, Globe2, Landmark, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import SEOHead, { generateBreadcrumbSchema, generateFAQSchema } from "@/components/SEOHead";
import AICollegeFinder from "@/components/AICollegeFinder";
import React from "react";

type DBCollege = {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  fees: string | null;
  placement_avg: string | null;
  placement_highest: string | null;
  placement_median: string | null;
  ranking: number | null;
  type: string | null;
  established: number | null;
  accreditations: string[] | null;
  exams_accepted: string[] | null;
  courses: string[] | null;
  total_students: number | null;
  logo_url: string | null;
  banner_url: string | null;
  campus_size: string | null;
  top_recruiters: string[] | null;
};

const collegeFaqs = [
  { q: "How do I compare MBA colleges?", a: "Select up to 3 colleges from the dropdown menus. Our tool generates a detailed side-by-side comparison covering fees, placements, rankings, accreditations, and admission processes." },
  { q: "What does the AI College Finder consider?", a: "Our AI analyzes your target exam, expected score, budget, location preference, specialization interest, work experience, and career goals to recommend the best-fit MBA colleges from our verified database." },
  { q: "Can I compare IIMs with private B-Schools?", a: "Yes! Our tool works across all college types — IIMs, government, private, and autonomous. The comparison clearly shows each college's tier and accreditations." },
  { q: "How is the match score calculated?", a: "The AI weighs multiple factors: exam compatibility, score-cutoff alignment, budget fit, location preference, specialization strength, and career goal alignment." },
  { q: "Are the placement figures accurate?", a: "Placement data is sourced from official college reports and verified periodically. Figures represent average, median, and highest packages from the most recent placement season." },
  { q: "How often is the college data updated?", a: "We update college data regularly including fees, placement stats, cutoffs, and ranking information for accuracy." },
];

const parseNum = (v: string | null) => {
  if (!v) return 0;
  const n = parseFloat(v.replace(/[^\d.]/g, ""));
  return isNaN(n) ? 0 : n;
};

const calcROI = (c: DBCollege) => {
  const avg = parseNum(c.placement_avg);
  const fees = parseNum(c.fees);
  return fees > 0 && avg > 0 ? (avg / fees).toFixed(1) : "N/A";
};

const CollegeFinderPage = () => {
  const [colleges, setColleges] = useState<DBCollege[]>([]);
  const [collegeSelections, setCollegeSelections] = useState<[DBCollege | null, DBCollege | null, DBCollege | null]>([null, null, null]);
  const [loading, setLoading] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const manualCompareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAll = async () => {
      const { data } = await supabase
        .from("colleges")
        .select("id, name, slug, city, state, fees, placement_avg, placement_highest, placement_median, ranking, type, established, accreditations, exams_accepted, courses, total_students, logo_url, banner_url, campus_size, top_recruiters")
        .order("ranking", { ascending: true });
      if (data) setColleges(data as DBCollege[]);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const handleCollegeSelect = (index: number, value: string) => {
    const found = colleges.find(c => c.id === value);
    if (found) { const next = [...collegeSelections] as typeof collegeSelections; next[index] = found; setCollegeSelections(next); }
  };
  const handleCollegeRemove = (index: number) => { const next = [...collegeSelections] as typeof collegeSelections; next[index] = null; setCollegeSelections(next); };
  const activeColleges = collegeSelections.filter(Boolean) as DBCollege[];

  const bestForYou = useMemo(() => {
    if (activeColleges.length < 2) return [];
    return [...activeColleges].sort((a, b) => {
      const scoreA = parseNum(a.placement_avg) / Math.max(parseNum(a.fees), 1) * 100 + (a.ranking ? 100 - a.ranking : 0);
      const scoreB = parseNum(b.placement_avg) / Math.max(parseNum(b.fees), 1) * 100 + (b.ranking ? 100 - b.ranking : 0);
      return scoreB - scoreA;
    });
  }, [activeColleges]);

  const scrollToManualCompare = () => {
    manualCompareRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const breadcrumbs = [{ name: "Home", url: "/" }, { name: "College Finder & Compare", url: "/college-finder" }];

  // Color for college index
  const colColors = ["from-primary to-violet-600", "from-emerald-500 to-teal-600", "from-amber-500 to-orange-600"];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="AI MBA College Finder — Predict Best B-School Matches | BSchoolBuzz"
        description="Input your profile and exam scores into our AI-powered College Finder. Get a curated list of MBA colleges that fit your profile, budget, and location preference."
        keywords={[
          "MBA college finder", "B-school predictor", "AI college finder", "college search", "admission tool",
          "find MBA colleges based on my profile", "top MBA colleges according to CAT percentile",
          "AI tool for MBA college selection in India", "MBA college predictor for CMAT and MAT scores",
          "best B-school finder with placement filters", "admission chances in MBA colleges calculator",
          "personalized MBA college recommendation engine",
        ]}
        canonical="https://bschoolbuzz.com/college-finder"
        jsonLd={[generateBreadcrumbSchema(breadcrumbs), generateFAQSchema(collegeFaqs)]}
      />


      {/* Hero */}
      <header className="relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-background to-violet-500/[0.03]" />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, hsl(var(--primary) / 0.05) 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        
        <div className="relative container mx-auto px-4 py-10 md:py-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Left: Text content */}
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-xs font-semibold mb-4 border border-primary/20">
                  <Sparkles className="w-3.5 h-3.5" /> Trusted by 10,000+ MBA Aspirants
                </div>
                <h1 className="font-heading text-3xl md:text-4xl lg:text-5xl font-black text-foreground mb-4 leading-[1.15]">
                  MBA College Finder
                  <span className="block text-primary mt-1">&amp; Smart Comparison</span>
                </h1>
                <p className="text-muted-foreground max-w-lg text-sm md:text-base leading-relaxed mb-6">
                  Get AI-powered college recommendations matched to your profile — or compare B-Schools 
                  head-to-head across fees, placements, ROI, campus & 15+ parameters.
                </p>
                
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto md:mx-0">
                  {[
                    { value: `${colleges.length}+`, label: "MBA Colleges", icon: Building2 },
                    { value: "15+", label: "Parameters", icon: BarChart3 },
                    { value: "5", label: "Comparison Tabs", icon: Layers },
                  ].map((s, i) => (
                    <div key={i} className="bg-card rounded-xl p-3 border border-border text-center shadow-sm">
                      <s.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                      <div className="font-black text-foreground text-lg">{s.value}</div>
                      <div className="text-[10px] text-muted-foreground font-medium">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Feature highlights */}
              <div className="flex-shrink-0 w-full md:w-80 space-y-2.5">
                {[
                  { icon: Sparkles, title: "AI-Powered Matching", desc: "8-step wizard analyzes your profile for best-fit colleges", color: "from-primary/20 to-violet-500/10" },
                  { icon: Scale, title: "Side-by-Side Compare", desc: "Compare up to 3 colleges across all key metrics", color: "from-emerald-500/20 to-teal-500/10" },
                  { icon: TrendingUp, title: "ROI & Placement Data", desc: "Real placement stats, fees, and return on investment", color: "from-amber-500/20 to-orange-500/10" },
                  { icon: Shield, title: "Verified Database", desc: "80+ colleges with NIRF rankings & accreditations", color: "from-blue-500/20 to-indigo-500/10" },
                ].map((f, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }}
                    className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border shadow-sm hover:shadow-md transition-shadow">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center shrink-0`}>
                      <f.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-foreground text-xs">{f.title}</div>
                      <div className="text-[10px] text-muted-foreground leading-snug">{f.desc}</div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* AI College Finder — full width, not collapsible */}
      <section className="container mx-auto px-4 pb-8">
        <div className="max-w-3xl mx-auto">
          <AICollegeFinder onTryManually={scrollToManualCompare} />
        </div>
      </section>

      {/* Divider */}
      <div className="container mx-auto px-4" ref={manualCompareRef}>
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t-2 border-dashed border-border" /></div>
          <div className="relative flex justify-center">
            <span className="bg-background px-6 py-2 text-sm text-muted-foreground font-bold flex items-center gap-2 rounded-full border border-border">
              <Scale className="w-4 h-4 text-primary" /> Manual College Comparison
            </span>
          </div>
        </div>
      </div>

      <section className="container mx-auto px-4 pb-12 md:pb-16">
        {/* Selection cards — horizontal layout, more info */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {[0, 1, 2].map((i) => {
            const c = collegeSelections[i];
            return (
              <Card key={i} className={`overflow-hidden transition-all duration-300 ${c ? "border-2 border-primary/30 shadow-lg" : "border-2 border-dashed border-muted-foreground/20 hover:border-primary/20"}`}>
                {c && <div className={`h-1.5 bg-gradient-to-r ${colColors[i]}`} />}
                <CardContent className="pt-5 pb-5">
                  {c ? (
                    <div className="relative">
                      <button onClick={() => handleCollegeRemove(i)} className="absolute -top-2 -right-2 w-7 h-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-10" aria-label="Remove college">
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="flex items-center gap-3 mb-3">
                        {c.logo_url ? (
                          <img src={c.logo_url} alt={`${c.name} logo`} className="w-14 h-14 rounded-xl object-contain bg-muted p-1" loading="lazy" />
                        ) : (
                          <div className={`w-14 h-14 bg-gradient-to-br ${colColors[i]} rounded-xl flex items-center justify-center text-white font-bold text-lg`}>{c.name.charAt(0)}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground text-sm leading-tight">{c.name}</h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            {c.ranking && <span className="flex items-center gap-0.5"><Trophy className="w-3 h-3 text-amber-500" /> #{c.ranking}</span>}
                            <span>{c.city || "India"}</span>
                          </div>
                        </div>
                      </div>
                      {/* Mini stats */}
                      <div className="grid grid-cols-3 gap-1.5">
                        <div className="bg-primary/5 rounded-lg p-1.5 text-center border border-primary/10">
                          <div className="text-[8px] text-muted-foreground">Fees</div>
                          <div className="text-[10px] font-bold text-primary">{c.fees || "N/A"}</div>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-1.5 text-center border border-emerald-100">
                          <div className="text-[8px] text-muted-foreground">Avg CTC</div>
                          <div className="text-[10px] font-bold text-emerald-600">{c.placement_avg || "N/A"}</div>
                        </div>
                        <div className="bg-violet-50 rounded-lg p-1.5 text-center border border-violet-100">
                          <div className="text-[8px] text-muted-foreground">ROI</div>
                          <div className="text-[10px] font-bold text-violet-600">{calcROI(c)}x</div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-2">
                      <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mx-auto mb-2.5"><Landmark className="w-6 h-6 text-muted-foreground" /></div>
                      <p className="text-sm font-semibold text-muted-foreground mb-2.5">College {i + 1}</p>
                      <Select onValueChange={(v) => handleCollegeSelect(i, v)}>
                        <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Choose a college..." /></SelectTrigger>
                        <SelectContent>
                          {colleges.filter(x => !collegeSelections.some(s => s?.id === x.id)).map(x => (
                            <SelectItem key={x.id} value={x.id}>
                              {x.name} {x.city ? `— ${x.city}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {activeColleges.length >= 2 ? (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 h-12 rounded-xl">
              <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm rounded-lg"><BarChart3 className="w-4 h-4" /> Overview</TabsTrigger>
              <TabsTrigger value="placements" className="gap-1.5 text-xs sm:text-sm rounded-lg"><TrendingUp className="w-4 h-4" /> Placements</TabsTrigger>
              <TabsTrigger value="campus" className="gap-1.5 text-xs sm:text-sm rounded-lg"><Building2 className="w-4 h-4" /> Campus</TabsTrigger>
              <TabsTrigger value="admissions" className="gap-1.5 text-xs sm:text-sm rounded-lg"><BookOpen className="w-4 h-4" /> Admissions</TabsTrigger>
              <TabsTrigger value="bestforyou" className="gap-1.5 text-xs sm:text-sm rounded-lg"><Sparkles className="w-4 h-4" /> Verdict</TabsTrigger>
            </TabsList>

            {/* Overview Tab — comprehensive table */}
            <TabsContent value="overview">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="overflow-hidden border-2">
                  <CardHeader className="pb-3 bg-muted/30 border-b">
                    <CardTitle className="font-heading text-base flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Full Comparison Table</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-primary/20">
                          <th className="text-left py-3 px-4 font-bold text-foreground min-w-[140px] bg-muted/20 sticky left-0 z-10">Parameter</th>
                          {activeColleges.map((c, i) => (
                            <th key={c.id} className="text-left py-3 px-4 min-w-[180px]">
                              <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${colColors[i]}`} />
                                <div>
                                  <div className="font-bold text-foreground text-xs">{c.name}</div>
                                  <div className="text-[10px] font-normal text-muted-foreground">{c.type || "B-School"}</div>
                                </div>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {([
                          { label: "NIRF Ranking", icon: Trophy, render: (c: DBCollege) => c.ranking ? <span className="font-bold text-primary">#{c.ranking}</span> : "N/A" },
                          { label: "Established", icon: Calendar, render: (c: DBCollege) => c.established ? <span className="font-semibold">{c.established}</span> : "N/A" },
                          { label: "Type", icon: Building2, render: (c: DBCollege) => <Badge variant="secondary" className="text-[10px]">{c.type || "N/A"}</Badge> },
                          { label: "Total Fees", icon: IndianRupee, render: (c: DBCollege) => <span className="font-bold text-primary text-sm">{c.fees || "N/A"}</span> },
                          { label: "Avg Package", icon: TrendingUp, render: (c: DBCollege) => <span className="font-bold text-emerald-600">{c.placement_avg || "N/A"}</span> },
                          { label: "Highest Package", icon: ArrowUpRight, render: (c: DBCollege) => <span className="font-semibold text-blue-600">{c.placement_highest || "N/A"}</span> },
                          { label: "Median Package", icon: BarChart3, render: (c: DBCollege) => c.placement_median || "N/A" },
                          { label: "ROI (Avg/Fees)", icon: Percent, render: (c: DBCollege) => {
                            const roi = calcROI(c);
                            return <span className={`font-bold ${roi !== "N/A" && parseFloat(roi) >= 1.5 ? "text-emerald-600" : "text-foreground"}`}>{roi}x</span>;
                          }},
                          { label: "Campus Size", icon: Ruler, render: (c: DBCollege) => c.campus_size || "N/A" },
                          { label: "Total Students", icon: Users, render: (c: DBCollege) => c.total_students ? `${c.total_students.toLocaleString()}+` : "N/A" },
                          { label: "Location", icon: MapPin, render: (c: DBCollege) => `${c.city || "N/A"}, ${c.state || ""}`.replace(/, $/, "") },
                          { label: "Accreditations", icon: Shield, render: (c: DBCollege) => (
                            <div className="flex flex-wrap gap-1">
                              {(c.accreditations || []).slice(0, 3).map((a, i) => <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0">{a}</Badge>)}
                              {(!c.accreditations || c.accreditations.length === 0) && "N/A"}
                            </div>
                          )},
                          { label: "Exams Accepted", icon: BookOpen, render: (c: DBCollege) => (
                            <div className="flex flex-wrap gap-1">
                              {(c.exams_accepted || []).slice(0, 4).map((e, i) => <Badge key={i} className="bg-primary/10 text-primary border-0 text-[9px] px-1.5 py-0">{e}</Badge>)}
                              {(!c.exams_accepted || c.exams_accepted.length === 0) && "N/A"}
                            </div>
                          )},
                        ] as { label: string; icon: any; render: (c: DBCollege) => React.ReactNode }[]).map((row, idx) => (
                          <tr key={row.label} className={`border-b border-border ${idx % 2 === 0 ? "bg-muted/5" : ""} hover:bg-muted/20 transition-colors`}>
                            <td className="py-3 px-4 text-xs font-semibold text-muted-foreground bg-muted/10 sticky left-0 z-10">
                              <span className="flex items-center gap-1.5"><row.icon className="w-3.5 h-3.5 text-primary/60" /> {row.label}</span>
                            </td>
                            {activeColleges.map(c => (<td key={c.id} className="py-3 px-4 text-foreground text-xs">{row.render(c)}</td>))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Placements Tab — visual cards with ROI gauge */}
            <TabsContent value="placements">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeColleges.map((c, ci) => {
                    const roi = calcROI(c);
                    const roiNum = roi !== "N/A" ? parseFloat(roi) : 0;
                    return (
                      <Card key={c.id} className="overflow-hidden border-2 hover:shadow-xl transition-all">
                        <div className={`h-2 bg-gradient-to-r ${colColors[ci]}`} />
                        <CardContent className="pt-5">
                          <div className="flex items-center gap-3 mb-4">
                            {c.logo_url ? (
                              <img src={c.logo_url} alt={c.name} className="w-12 h-12 rounded-xl object-contain bg-muted p-1" loading="lazy" />
                            ) : (
                              <div className={`w-12 h-12 bg-gradient-to-br ${colColors[ci]} rounded-xl flex items-center justify-center text-white font-bold`}>{c.name.charAt(0)}</div>
                            )}
                            <div>
                              <h3 className="font-bold text-foreground text-sm">{c.name}</h3>
                              <p className="text-xs text-muted-foreground">{c.city}, {c.state}</p>
                            </div>
                          </div>

                          {/* Placement stats */}
                          <div className="space-y-2.5">
                            {[
                              { label: "Average Package", value: c.placement_avg, icon: BarChart3, color: "text-primary bg-primary/5 border-primary/10" },
                              { label: "Highest Package", value: c.placement_highest, icon: ArrowUpRight, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
                              { label: "Median Package", value: c.placement_median, icon: Target, color: "text-blue-600 bg-blue-50 border-blue-100" },
                            ].map((p) => (
                              <div key={p.label} className={`flex items-center justify-between rounded-xl px-3 py-2.5 border ${p.color}`}>
                                <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><p.icon className="w-3.5 h-3.5" /> {p.label}</span>
                                <span className="font-bold text-sm">{p.value || "N/A"}</span>
                              </div>
                            ))}
                          </div>

                          {/* ROI highlight */}
                          <div className="mt-3 bg-gradient-to-r from-violet-50 to-primary/5 rounded-xl p-4 border border-violet-100 text-center">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Return on Investment</div>
                            <div className={`font-black text-3xl ${roiNum >= 2 ? "text-emerald-600" : roiNum >= 1 ? "text-primary" : "text-amber-600"}`}>{roi}x</div>
                            <div className="text-[10px] text-muted-foreground mt-1">Avg Package ÷ Total Fees</div>
                            {/* Mini bar */}
                            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${roiNum >= 2 ? "bg-emerald-500" : roiNum >= 1 ? "bg-primary" : "bg-amber-500"}`}
                                style={{ width: `${Math.min(roiNum * 25, 100)}%` }} />
                            </div>
                          </div>

                          {/* Top recruiters */}
                          {c.top_recruiters && c.top_recruiters.length > 0 && (
                            <div className="mt-3">
                              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Top Recruiters</div>
                              <div className="flex flex-wrap gap-1">
                                {c.top_recruiters.slice(0, 6).map((r, i) => (
                                  <span key={i} className="text-[10px] bg-muted/60 text-foreground/80 rounded-lg px-2 py-0.5">{r}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          <Link to={`/college/${c.slug}`}>
                            <Button size="sm" className="w-full mt-4 gap-1.5 text-xs rounded-xl"><ExternalLink className="w-3 h-3" /> View Full Profile</Button>
                          </Link>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </motion.div>
            </TabsContent>

            {/* Campus Tab — NEW */}
            <TabsContent value="campus">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeColleges.map((c, ci) => (
                    <Card key={c.id} className="overflow-hidden border-2">
                      <div className={`h-2 bg-gradient-to-r ${colColors[ci]}`} />
                      <CardContent className="pt-5">
                        <h3 className="font-bold text-foreground text-sm mb-4">{c.name}</h3>
                        <div className="space-y-3">
                          {[
                            { label: "Established", value: c.established ? String(c.established) : "N/A", icon: Calendar, desc: c.established ? `${new Date().getFullYear() - c.established}+ years of legacy` : "" },
                            { label: "Campus Size", value: c.campus_size || "N/A", icon: Ruler, desc: "" },
                            { label: "Total Students", value: c.total_students ? `${c.total_students.toLocaleString()}+` : "N/A", icon: Users, desc: "" },
                            { label: "Type", value: c.type || "N/A", icon: Building2, desc: "" },
                            { label: "Location", value: `${c.city || "N/A"}, ${c.state || ""}`.replace(/, $/, ""), icon: MapPin, desc: "" },
                          ].map((item) => (
                            <div key={item.label} className="flex items-center gap-3 bg-muted/20 rounded-xl p-3 border border-border">
                              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <item.icon className="w-4 h-4 text-primary" />
                              </div>
                              <div className="flex-1">
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</div>
                                <div className="font-bold text-foreground text-sm">{item.value}</div>
                                {item.desc && <div className="text-[10px] text-muted-foreground">{item.desc}</div>}
                              </div>
                            </div>
                          ))}

                          {/* Accreditations */}
                          <div className="bg-muted/20 rounded-xl p-3 border border-border">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5 text-primary" /> Accreditations & Recognition
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {(c.accreditations || []).map((a, i) => (
                                <Badge key={i} className="bg-blue-50 text-blue-700 border-blue-100 text-[10px]">{a}</Badge>
                              ))}
                              {(!c.accreditations || c.accreditations.length === 0) && <span className="text-xs text-muted-foreground italic">Not specified</span>}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            </TabsContent>

            {/* Admissions Tab */}
            <TabsContent value="admissions">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeColleges.map((c, ci) => (
                    <Card key={c.id} className="overflow-hidden border-2">
                      <div className={`h-2 bg-gradient-to-r ${colColors[ci]}`} />
                      <CardContent className="pt-5">
                        <h3 className="font-bold text-foreground text-sm mb-4">{c.name}</h3>
                        <div className="space-y-3">
                          <div>
                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Exams Accepted</h4>
                            <div className="flex flex-wrap gap-1.5">
                              {(c.exams_accepted || []).map((e, i) => (
                                <Badge key={i} className="bg-primary/10 text-primary border-0 text-[10px] font-semibold">{e}</Badge>
                              ))}
                              {(!c.exams_accepted || c.exams_accepted.length === 0) && <span className="text-xs text-muted-foreground italic">Not specified</span>}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Courses Offered</h4>
                            <div className="space-y-1 max-h-36 overflow-y-auto">
                              {(c.courses || []).map((course, idx) => (
                                <div key={idx} className="flex items-start gap-1.5 text-xs">
                                  <CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                                  <span className="text-muted-foreground">{course}</span>
                                </div>
                              ))}
                              {(!c.courses || c.courses.length === 0) && <span className="text-xs text-muted-foreground italic">Not specified</span>}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-primary/5 rounded-xl p-3 text-center border border-primary/10">
                              <div className="text-[9px] text-muted-foreground uppercase">Total Fees</div>
                              <div className="font-bold text-primary text-sm mt-0.5">{c.fees || "N/A"}</div>
                            </div>
                            <div className="bg-muted/40 rounded-xl p-3 text-center">
                              <div className="text-[9px] text-muted-foreground uppercase">NIRF Rank</div>
                              <div className="font-bold text-foreground text-sm mt-0.5">{c.ranking ? `#${c.ranking}` : "N/A"}</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            </TabsContent>

            {/* Verdict / Best for You Tab */}
            <TabsContent value="bestforyou">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-2 overflow-hidden">
                  <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-violet-500/5 border-b">
                    <CardTitle className="font-heading text-base flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> AI Verdict — Best College for You</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-5">
                    {/* Scoring criteria */}
                    <div className="grid grid-cols-4 gap-2 mb-6">
                      {[
                        { icon: TrendingUp, label: "Placement ROI", weight: "35%", color: "bg-emerald-50 border-emerald-100 text-emerald-700" },
                        { icon: Trophy, label: "NIRF Ranking", weight: "25%", color: "bg-blue-50 border-blue-100 text-blue-700" },
                        { icon: IndianRupee, label: "Value for Money", weight: "20%", color: "bg-amber-50 border-amber-100 text-amber-700" },
                        { icon: Building2, label: "Infrastructure", weight: "20%", color: "bg-violet-50 border-violet-100 text-violet-700" },
                      ].map((w, i) => (
                        <div key={i} className={`rounded-xl p-3 text-center border ${w.color}`}>
                          <w.icon className="w-4 h-4 mx-auto mb-1" />
                          <div className="text-[9px] font-semibold uppercase">{w.label}</div>
                          <div className="font-black text-lg mt-0.5">{w.weight}</div>
                        </div>
                      ))}
                    </div>

                    {/* Rankings */}
                    <div className="space-y-3">
                      {bestForYou.map((c, i) => {
                        const roi = calcROI(c);
                        const rankEmoji = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
                        return (
                          <div key={c.id} className={`rounded-2xl border-2 p-4 transition-all ${i === 0 ? "border-primary bg-gradient-to-r from-primary/5 to-violet-500/5 shadow-lg" : "border-border hover:bg-muted/20"}`}>
                            <div className="flex items-center gap-4">
                              <div className="text-2xl">{rankEmoji}</div>
                              {c.logo_url ? (
                                <img src={c.logo_url} alt={c.name} className="w-12 h-12 rounded-xl object-contain bg-muted p-1" loading="lazy" />
                              ) : (
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${i === 0 ? "bg-gradient-to-br from-primary to-violet-600 text-white" : "bg-muted text-muted-foreground"}`}>{c.name.charAt(0)}</div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-bold text-foreground text-sm">{c.name}</h3>
                                  {i === 0 && <Badge className="bg-primary text-primary-foreground text-[10px]">🏆 Top Pick</Badge>}
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                                  {c.ranking && <span className="flex items-center gap-0.5"><Trophy className="w-3 h-3 text-amber-500" /> #{c.ranking}</span>}
                                  <span>{c.placement_avg || "N/A"} avg</span>
                                  <span className="font-semibold text-foreground">{c.fees || "N/A"}</span>
                                  {c.established && <span>{c.established} est.</span>}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-[10px] text-muted-foreground font-semibold">ROI</div>
                                <div className={`font-black text-2xl ${i === 0 ? "text-primary" : "text-foreground"}`}>{roi}x</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Scale className="w-10 h-10 text-muted-foreground/30" />
            </div>
            <h2 className="font-bold text-lg text-foreground mb-2">Select at least 2 colleges to compare</h2>
            <p className="text-sm text-muted-foreground mb-4">Choose from {colleges.length} colleges across India</p>
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5 text-primary" /> 13+ data points</span>
              <span className="flex items-center gap-1"><Layers className="w-3.5 h-3.5 text-primary" /> 5 comparison tabs</span>
              <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-primary" /> ROI analysis</span>
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <section className="mt-14" aria-label="Frequently asked questions">
          <Card className="border-2 overflow-hidden">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" /> Frequently Asked Questions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 pb-4">
              <div className="space-y-2">
                {collegeFaqs.map((faq, i) => (
                  <div key={i} className="rounded-xl border border-border overflow-hidden">
                    <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)} className="w-full flex items-center justify-between p-3.5 text-left hover:bg-muted/20 transition-colors" aria-expanded={expandedFaq === i}>
                      <h3 className="font-semibold text-foreground text-sm pr-3">{faq.q}</h3>
                      {expandedFaq === i ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                    </button>
                    {expandedFaq === i && <div className="px-3.5 pb-3.5 -mt-1"><p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p></div>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Internal Links */}
        <nav className="mt-8" aria-label="Related pages">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "All MBA Colleges", path: "/colleges", desc: "Browse full directory", icon: Building2 },
              { label: "Compare Coaching", path: "/compare", desc: "Coaching course comparison", icon: Scale },
              { label: "Profile Analyzer", path: "/profile-analyzer", desc: "Check your chances", icon: Target },
              { label: "MBA Blog", path: "/blog", desc: "Tips & career advice", icon: BookOpen },
            ].map((link, i) => (
              <Link key={i} to={link.path} className="bg-card rounded-xl p-4 border-2 border-border hover:border-primary/30 hover:shadow-md transition-all group">
                <link.icon className="w-5 h-5 text-primary mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-foreground group-hover:text-primary transition-colors text-xs">{link.label}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">{link.desc}</p>
              </Link>
            ))}
          </div>
        </nav>
      </section>
    </div>
  );
};

export default CollegeFinderPage;
