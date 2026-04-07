import { useState, useEffect, useMemo, useRef } from "react";
import { X, Star, Tag, CheckCircle, ArrowRight, BarChart3, TrendingUp, Users, BookOpen, GraduationCap, Award, Sparkles, Scale, IndianRupee, ThumbsUp, HelpCircle, ChevronDown, ChevronUp, MapPin, ExternalLink, Building2, Target, Trophy, Medal } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
};

const collegeFaqs = [
  { q: "How do I compare MBA colleges?", a: "Select up to 3 colleges from the dropdown menus. Our tool generates a detailed side-by-side comparison covering fees, placements, rankings, accreditations, and admission processes." },
  { q: "What does the AI College Finder consider?", a: "Our AI analyzes your target exam, expected score, budget, location preference, specialization interest, work experience, and career goals to recommend the best-fit MBA colleges from our verified database." },
  { q: "Can I compare IIMs with private B-Schools?", a: "Yes! Our tool works across all college types — IIMs, government, private, and autonomous. The comparison clearly shows each college's tier and accreditations." },
  { q: "How is the match score calculated?", a: "The AI weighs multiple factors: exam compatibility, score-cutoff alignment, budget fit, location preference, specialization strength, and career goal alignment." },
  { q: "Are the placement figures accurate?", a: "Placement data is sourced from official college reports and verified periodically. Figures represent average, median, and highest packages from the most recent placement season." },
  { q: "How often is the college data updated?", a: "We update college data regularly including fees, placement stats, cutoffs, and ranking information for accuracy." },
];

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
        .select("id, name, slug, city, state, fees, placement_avg, placement_highest, placement_median, ranking, type, established, accreditations, exams_accepted, courses, total_students, logo_url, banner_url")
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
      const parsePackage = (v: string | null) => { if (!v) return 0; const n = parseFloat(v.replace(/[^\d.]/g, "")); return isNaN(n) ? 0 : n; };
      const parseFees = (v: string | null) => { if (!v) return 0; const n = parseFloat(v.replace(/[^\d.]/g, "")); return isNaN(n) ? 0 : n; };
      const scoreA = parsePackage(a.placement_avg) / Math.max(parseFees(a.fees), 1) * 100 + (a.ranking ? 100 - a.ranking : 0);
      const scoreB = parsePackage(b.placement_avg) / Math.max(parseFees(b.fees), 1) * 100 + (b.ranking ? 100 - b.ranking : 0);
      return scoreB - scoreA;
    });
  }, [activeColleges]);

  const scrollToManualCompare = () => {
    manualCompareRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const breadcrumbs = [{ name: "Home", url: "/" }, { name: "College Finder & Compare", url: "/college-finder" }];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="AI MBA College Finder & Compare | BestMBACoaching"
        description="Find your perfect MBA college with AI-powered recommendations. Compare top B-Schools side by side — fees, placements, rankings, ROI & more."
        keywords={["MBA college finder", "compare MBA colleges", "best MBA college", "IIM comparison", "MBA placements comparison", "AI college recommendation", "MBA fees comparison"]}
        canonical="https://bestmbacoaching.com/college-finder"
        jsonLd={[generateBreadcrumbSchema(breadcrumbs), generateFAQSchema(collegeFaqs)]}
      />

      {/* Breadcrumb */}
      <nav className="container mx-auto px-4 pt-4" aria-label="Breadcrumb">
        <ol className="flex items-center gap-1.5 text-xs text-muted-foreground" itemScope itemType="https://schema.org/BreadcrumbList">
          {breadcrumbs.map((item, i) => (
            <li key={i} className="flex items-center gap-1.5" itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
              {i > 0 && <span aria-hidden="true">/</span>}
              {i < breadcrumbs.length - 1 ? (
                <Link to={item.url} className="hover:text-primary transition-colors" itemProp="item"><span itemProp="name">{item.name}</span></Link>
              ) : (
                <span className="text-foreground font-medium" itemProp="name">{item.name}</span>
              )}
              <meta itemProp="position" content={String(i + 1)} />
            </li>
          ))}
        </ol>
      </nav>

      {/* Hero */}
      <header className="hero-gradient py-8 md:py-12">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="bg-primary-foreground/20 text-primary-foreground border-none mb-3 text-xs px-3 py-1">
              <GraduationCap className="w-3.5 h-3.5 mr-1.5" /> AI College Finder & Comparison
            </Badge>
            <h1 className="font-heading text-2xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-3">
              Find & Compare MBA Colleges
            </h1>
            <p className="text-primary-foreground/70 max-w-xl mx-auto text-sm leading-relaxed">
              Use AI to discover your ideal B-School or compare colleges manually — fees, placements, rankings & ROI side by side.
            </p>
          </motion.div>
        </div>
      </header>

      {/* AI College Finder */}
      <section className="container mx-auto px-4 py-6 md:py-8">
        <div className="max-w-3xl mx-auto mb-6">
          <AICollegeFinder onTryManually={scrollToManualCompare} />
        </div>

        {/* Divider */}
        <div className="relative mb-6" ref={manualCompareRef}>
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center">
            <span className="bg-background px-4 text-sm text-muted-foreground font-medium flex items-center gap-2">
              <Scale className="w-4 h-4" /> Or compare colleges manually
            </span>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-10 md:pb-14">
        {/* Selection cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {[0, 1, 2].map((i) => (
            <Card key={i} className={`border-2 transition-all ${collegeSelections[i] ? "border-primary/40 bg-secondary/20 shadow-md" : "border-dashed border-muted-foreground/30 hover:border-primary/20"}`}>
              <CardContent className="pt-5 pb-5">
                {collegeSelections[i] ? (
                  <div className="relative">
                    <button onClick={() => handleCollegeRemove(i)} className="absolute -top-2 -right-2 w-7 h-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform z-10" aria-label="Remove college">
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <div className="text-center">
                      {collegeSelections[i]!.logo_url ? (
                        <img src={collegeSelections[i]!.logo_url!} alt={`${collegeSelections[i]!.name} logo`} className="w-14 h-14 rounded-xl object-contain bg-muted p-1 mx-auto mb-2.5" loading="lazy" />
                      ) : (
                        <div className="w-14 h-14 hero-gradient rounded-xl flex items-center justify-center mx-auto mb-2.5 text-primary-foreground font-bold text-lg">{collegeSelections[i]!.name?.charAt(0)}</div>
                      )}
                      <h3 className="font-heading font-semibold text-foreground text-sm">{collegeSelections[i]!.name}</h3>
                      <div className="flex items-center justify-center gap-2.5 mt-1.5 text-xs text-muted-foreground">
                        {collegeSelections[i]!.ranking && <span className="flex items-center gap-0.5"><Trophy className="w-3 h-3 text-amber-500" /> #{collegeSelections[i]!.ranking}</span>}
                        <span>•</span>
                        <span>{collegeSelections[i]!.city || "India"}</span>
                      </div>
                      {collegeSelections[i]!.fees && <div className="mt-2 font-heading font-bold text-primary text-lg">{collegeSelections[i]!.fees}</div>}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mx-auto mb-2.5"><GraduationCap className="w-6 h-6 text-muted-foreground" /></div>
                    <p className="text-sm font-medium text-muted-foreground mb-2.5">Select College {i + 1}</p>
                    <Select onValueChange={(v) => handleCollegeSelect(i, v)}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Choose a college..." /></SelectTrigger>
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
          ))}
        </div>

        {activeColleges.length >= 2 ? (
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 h-11">
              <TabsTrigger value="overview" className="gap-1 text-xs sm:text-sm"><BarChart3 className="w-4 h-4" /> Overview</TabsTrigger>
              <TabsTrigger value="placements" className="gap-1 text-xs sm:text-sm"><TrendingUp className="w-4 h-4" /> Placements</TabsTrigger>
              <TabsTrigger value="admissions" className="gap-1 text-xs sm:text-sm"><BookOpen className="w-4 h-4" /> Admissions</TabsTrigger>
              <TabsTrigger value="bestforyou" className="gap-1 text-xs sm:text-sm"><Sparkles className="w-4 h-4" /> Best for You</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Colleges", icon: Building2, value: String(activeColleges.length) },
                    { label: "Avg Ranking", icon: Trophy, value: `#${Math.round(activeColleges.reduce((s, c) => s + (c.ranking || 0), 0) / activeColleges.length)}` },
                    { label: "Avg Students", icon: Users, value: `${Math.round(activeColleges.reduce((s, c) => s + (c.total_students || 0), 0) / activeColleges.length).toLocaleString()}+` },
                    { label: "Compared", icon: Scale, value: String(activeColleges.length) },
                  ].map((stat, i) => (
                    <Card key={i} className="bg-secondary/30">
                      <CardContent className="pt-3 pb-3 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><stat.icon className="w-4 h-4 text-primary" /></div>
                        <div>
                          <div className="text-[10px] text-muted-foreground">{stat.label}</div>
                          <div className="font-heading font-bold text-foreground text-sm">{stat.value}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardHeader className="pb-3"><CardTitle className="font-heading text-base flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Detailed Comparison</CardTitle></CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-primary/20">
                          <th className="text-left py-3 px-3 font-heading font-semibold text-foreground min-w-[120px] bg-muted/30">Feature</th>
                          {activeColleges.map(c => (
                            <th key={c.id} className="text-left py-3 px-3 font-heading font-semibold text-primary min-w-[150px]">
                              <div className="text-foreground text-xs">{c.name}</div>
                              <div className="text-[10px] font-normal text-muted-foreground">{c.type || "B-School"}</div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {([
                          { label: "NIRF Ranking", render: (c: DBCollege) => c.ranking ? <span className="font-heading font-bold text-primary">#{c.ranking}</span> : "N/A" },
                          { label: "Established", render: (c: DBCollege) => c.established || "N/A" },
                          { label: "Type", render: (c: DBCollege) => <Badge variant="secondary" className="text-[10px]">{c.type || "N/A"}</Badge> },
                          { label: "Fees", render: (c: DBCollege) => <span className="font-heading font-bold text-primary">{c.fees || "N/A"}</span> },
                          { label: "Avg Package", render: (c: DBCollege) => <span className="font-semibold text-emerald-600">{c.placement_avg || "N/A"}</span> },
                          { label: "Highest Package", render: (c: DBCollege) => c.placement_highest || "N/A" },
                          { label: "Median Package", render: (c: DBCollege) => c.placement_median || "N/A" },
                          { label: "Total Students", render: (c: DBCollege) => c.total_students ? `${c.total_students.toLocaleString()}+` : "N/A" },
                          { label: "Location", render: (c: DBCollege) => `${c.city || "N/A"}, ${c.state || ""}`.replace(/, $/, "") },
                          { label: "Accreditations", render: (c: DBCollege) => (
                            <div className="flex flex-wrap gap-1">
                              {(c.accreditations || []).slice(0, 3).map((a, i) => (
                                <Badge key={i} variant="outline" className="text-[9px] px-1 py-0">{a}</Badge>
                              ))}
                              {(!c.accreditations || c.accreditations.length === 0) && "N/A"}
                            </div>
                          )},
                          { label: "Exams Accepted", render: (c: DBCollege) => (
                            <div className="flex flex-wrap gap-1">
                              {(c.exams_accepted || []).slice(0, 4).map((e, i) => (
                                <Badge key={i} className="bg-primary/10 text-primary border-0 text-[9px] px-1 py-0">{e}</Badge>
                              ))}
                              {(!c.exams_accepted || c.exams_accepted.length === 0) && "N/A"}
                            </div>
                          )},
                        ] as { label: string; render: (c: DBCollege) => React.ReactNode }[]).map((row, idx) => (
                          <tr key={row.label} className={`border-b border-border ${idx % 2 === 0 ? "bg-muted/10" : ""}`}>
                            <td className="py-2.5 px-3 text-xs text-muted-foreground font-medium bg-muted/20">{row.label}</td>
                            {activeColleges.map(c => (<td key={c.id} className="py-2.5 px-3 text-foreground">{row.render(c)}</td>))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Placements Tab */}
            <TabsContent value="placements">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeColleges.map(c => (
                    <Card key={c.id} className="border-primary/20 overflow-hidden">
                      <div className="h-1 hero-gradient" />
                      <CardContent className="pt-5">
                        <div className="text-center mb-4">
                          {c.logo_url ? (
                            <img src={c.logo_url} alt={c.name} className="w-12 h-12 rounded-xl object-contain bg-muted p-1 mx-auto mb-2" loading="lazy" />
                          ) : (
                            <div className="w-12 h-12 hero-gradient rounded-xl flex items-center justify-center mx-auto mb-2 text-primary-foreground font-bold">{c.name.charAt(0)}</div>
                          )}
                          <h3 className="font-heading font-semibold text-foreground text-sm">{c.name}</h3>
                          <p className="text-xs text-muted-foreground">{c.city}, {c.state}</p>
                        </div>
                        <div className="space-y-3">
                          {[
                            { label: "Average Package", value: c.placement_avg, icon: BarChart3, color: "text-primary" },
                            { label: "Highest Package", value: c.placement_highest, icon: TrendingUp, color: "text-emerald-600" },
                            { label: "Median Package", value: c.placement_median, icon: Target, color: "text-blue-600" },
                          ].map((p) => (
                            <div key={p.label} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                              <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><p.icon className="w-3.5 h-3.5" /> {p.label}</span>
                              <span className={`font-heading font-bold text-sm ${p.color}`}>{p.value || "N/A"}</span>
                            </div>
                          ))}
                          <div className="bg-primary/5 rounded-lg p-3 border border-primary/10 text-center">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">ROI (Avg Pkg / Fees)</div>
                            <div className="font-heading font-bold text-primary text-lg mt-0.5">
                              {(() => {
                                const avg = parseFloat((c.placement_avg || "0").replace(/[^\d.]/g, ""));
                                const fees = parseFloat((c.fees || "1").replace(/[^\d.]/g, ""));
                                return fees > 0 && avg > 0 ? `${(avg / fees).toFixed(1)}x` : "N/A";
                              })()}
                            </div>
                          </div>
                        </div>
                        <Link to={`/college/${c.slug}`}>
                          <Button size="sm" className="w-full mt-3 gap-1 text-xs"><ExternalLink className="w-3 h-3" /> View Full Details</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            </TabsContent>

            {/* Admissions Tab */}
            <TabsContent value="admissions">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeColleges.map(c => (
                  <Card key={c.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-heading text-sm">{c.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <h4 className="text-xs font-semibold text-foreground mb-1.5">Exams Accepted</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {(c.exams_accepted || []).map((e, i) => (
                              <Badge key={i} className="bg-primary/10 text-primary border-0 text-[10px]">{e}</Badge>
                            ))}
                            {(!c.exams_accepted || c.exams_accepted.length === 0) && <span className="text-xs text-muted-foreground italic">Not specified</span>}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-foreground mb-1.5">Courses Offered</h4>
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {(c.courses || []).map((course, idx) => (
                              <div key={idx} className="flex items-start gap-1.5 text-xs">
                                <CheckCircle className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-muted-foreground">{course}</span>
                              </div>
                            ))}
                            {(!c.courses || c.courses.length === 0) && <span className="text-xs text-muted-foreground italic">Not specified</span>}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-foreground mb-1.5">Accreditations</h4>
                          <div className="flex flex-wrap gap-1.5">
                            {(c.accreditations || []).map((a, i) => (
                              <Badge key={i} variant="outline" className="text-[10px]">{a}</Badge>
                            ))}
                            {(!c.accreditations || c.accreditations.length === 0) && <span className="text-xs text-muted-foreground italic">Not specified</span>}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-muted/50 rounded-lg p-2 text-center">
                            <div className="text-[10px] text-muted-foreground">Established</div>
                            <div className="font-semibold text-foreground text-xs">{c.established || "N/A"}</div>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-2 text-center">
                            <div className="text-[10px] text-muted-foreground">Students</div>
                            <div className="font-semibold text-foreground text-xs">{c.total_students ? `${c.total_students.toLocaleString()}+` : "N/A"}</div>
                          </div>
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
                <CardHeader className="pb-3"><CardTitle className="font-heading text-base flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Best College for You</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2 mb-5 text-center">
                    {[
                      { icon: TrendingUp, label: "Placement ROI", weight: "40%" },
                      { icon: Trophy, label: "NIRF Ranking", weight: "35%" },
                      { icon: IndianRupee, label: "Value for Money", weight: "25%" },
                    ].map((w, i) => (
                      <div key={i} className="bg-muted/50 rounded-lg p-2.5">
                        <w.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                        <div className="text-[10px] text-muted-foreground">{w.label}</div>
                        <div className="font-heading font-bold text-foreground text-sm">{w.weight}</div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    {bestForYou.map((c, i) => {
                      const avg = parseFloat((c.placement_avg || "0").replace(/[^\d.]/g, ""));
                      const fees = parseFloat((c.fees || "1").replace(/[^\d.]/g, ""));
                      const roi = fees > 0 && avg > 0 ? (avg / fees).toFixed(1) : "N/A";
                      return (
                        <div key={c.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 ${i === 0 ? "border-primary bg-secondary/50 shadow-md" : "border-border"}`}>
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${i === 0 ? "hero-gradient text-primary-foreground" : "bg-muted text-muted-foreground"}`}>#{i + 1}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-heading font-semibold text-foreground text-sm">{c.name}</h3>
                              {i === 0 && <Badge className="bg-primary text-primary-foreground text-[10px]">🏆 Top Pick</Badge>}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                              {c.ranking && <span className="flex items-center gap-0.5"><Trophy className="w-3 h-3 text-amber-500" /> #{c.ranking}</span>}
                              <span>{c.placement_avg || "N/A"} avg</span>
                              <span className="font-bold text-foreground">{c.fees || "N/A"}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-[10px] text-muted-foreground">ROI</div>
                            <div className={`font-heading font-bold text-xl ${i === 0 ? "text-primary" : "text-foreground"}`}>{roi}x</div>
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
          <div className="text-center py-12">
            <Scale className="w-14 h-14 text-muted-foreground/20 mx-auto mb-3" />
            <h2 className="font-heading text-lg font-semibold text-foreground mb-2">Select at least 2 colleges to compare</h2>
            <p className="text-sm text-muted-foreground">Choose from {colleges.length} colleges across India</p>
          </div>
        )}

        {/* FAQ Section */}
        <section className="mt-12" aria-label="Frequently asked questions">
          <Card className="bg-secondary/20">
            <CardContent className="pt-6 pb-6">
              <h2 className="font-heading text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary" /> Frequently Asked Questions
              </h2>
              <div className="space-y-2">
                {collegeFaqs.map((faq, i) => (
                  <div key={i} className="bg-card rounded-xl border border-border overflow-hidden">
                    <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)} className="w-full flex items-center justify-between p-3.5 text-left" aria-expanded={expandedFaq === i}>
                      <h3 className="font-heading font-semibold text-foreground text-sm pr-3">{faq.q}</h3>
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
        <nav className="mt-6" aria-label="Related pages">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "All MBA Colleges", path: "/colleges", desc: "Browse full directory" },
              { label: "Compare Coaching", path: "/compare", desc: "Coaching course comparison" },
              { label: "Profile Analyzer", path: "/profile-analyzer", desc: "Check your chances" },
              { label: "MBA Blog", path: "/blog", desc: "Tips & career advice" },
            ].map((link, i) => (
              <Link key={i} to={link.path} className="bg-card rounded-lg p-3 border border-border hover:border-primary/40 transition-colors group">
                <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors text-xs">{link.label}</h3>
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
