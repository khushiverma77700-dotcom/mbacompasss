import { useState, useEffect, useMemo } from "react";
import { X, Star, Tag, CheckCircle, ArrowRight, BarChart3, TrendingUp, Clock, Users, BookOpen, GraduationCap, Award, Sparkles, Scale, IndianRupee, ThumbsUp, Shield, Zap, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
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

type DBCourse = {
  id: string; name: string; duration: string | null; fees: number | null;
  batch_info: string | null; curriculum: string[] | null; description: string | null;
  syllabus_url: string | null; institute_id: string;
  institutes: { id: string; name: string; slug: string; city: string | null; state: string | null; rating: number | null; total_reviews: number | null; students_count: number | null; success_rate: number | null; mode: string | null; discount: string | null; offer: string | null; logo_url: string | null; features: string[] | null; } | null;
};

type Selection = DBCourse | null;

const compareFaqs = [
  { q: "How do I compare MBA coaching courses on BestMBACoaching.com?", a: "Simply select up to 3 courses from the dropdown menus above. Our tool will automatically generate a detailed side-by-side comparison covering fees, curriculum, success rates, faculty, batch timings, and more. You can switch between Overview, Curriculum, Offers, and Best for You tabs for different perspectives." },
  { q: "What factors does the 'Best for You' algorithm consider?", a: "Our proprietary algorithm weighs three critical factors: Institute Rating (40%), Historical Success Rate (35%), and Value-for-Money based on fees (25%). This gives you a personalized recommendation based on which coaching institute offers the best overall package for your MBA preparation." },
  { q: "Are the coaching fees shown inclusive of all charges?", a: "The fees displayed are the base course fees as listed by the coaching institutes. Additional charges for premium study material, extra mock tests, personal mentoring sessions, or optional modules like GD-PI preparation may apply separately. We recommend contacting the institute directly for a complete fee breakdown." },
  { q: "Can I compare online and offline MBA coaching courses?", a: "Yes! Our comparison tool works across all teaching modes — online, offline, and hybrid. You can compare a Delhi-based classroom course with a Bangalore online course seamlessly. The 'Teaching Mode' row in the comparison table clearly indicates the delivery format." },
  { q: "How often is the comparison data updated?", a: "We update our coaching data regularly. Fees, batch information, and success rates are verified periodically with the coaching institutes to ensure accuracy. However, we recommend confirming the latest fees directly with the institute before enrollment." },
  { q: "Which MBA entrance exams do these coaching courses prepare for?", a: "Most coaching courses listed on our platform prepare students for major MBA entrance exams including CAT, XAT, GMAT, SNAP, NMAT, IIFT, CMAT, and MAT. Each course listing specifies which exams it covers." },
];

const ComparePage = () => {
  const [courses, setCourses] = useState<DBCourse[]>([]);
  const [selections, setSelections] = useState<[Selection, Selection, Selection]>([null, null, null]);
  const [loading, setLoading] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("courses")
        .select("*, institutes(id, name, slug, city, state, rating, total_reviews, students_count, success_rate, mode, discount, offer, logo_url, features)")
        .order("name");
      if (data) setCourses(data as any);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSelect = (index: number, value: string) => {
    const found = courses.find(c => c.id === value);
    if (found) {
      const next = [...selections] as [Selection, Selection, Selection];
      next[index] = found;
      setSelections(next);
    }
  };

  const handleRemove = (index: number) => {
    const next = [...selections] as [Selection, Selection, Selection];
    next[index] = null;
    setSelections(next);
  };

  const active = selections.filter(Boolean) as DBCourse[];

  const bestForYou = useMemo(() => {
    if (active.length < 2) return [];
    return [...active].sort((a, b) => {
      const scoreA = (a.institutes?.rating || 0) * 20 + (a.institutes?.success_rate || 0) - ((a.fees || 0) / 10000);
      const scoreB = (b.institutes?.rating || 0) * 20 + (b.institutes?.success_rate || 0) - ((b.fees || 0) / 10000);
      return scoreB - scoreA;
    });
  }, [active]);

  const maxFees = Math.max(...active.map(c => c.fees || 0), 1);

  const breadcrumbs = [
    { name: "Home", url: "/" },
    { name: "Compare MBA Courses", url: "/compare" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Compare MBA Coaching Courses — Fees, Curriculum, Success Rates | BestMBACoaching.com"
        description="Compare top MBA coaching courses side by side. Analyze fees, curriculum, success rates, faculty strength, batch sizes & student reviews across India's best CAT, GMAT, XAT coaching institutes."
        keywords={["compare MBA courses", "MBA coaching comparison", "CAT coaching compare", "best MBA coaching fees", "coaching institute comparison", "MBA course fees comparison", "CAT coaching success rate", "GMAT coaching comparison India", "best coaching for CAT", "MBA coaching reviews comparison"]}
        canonical="https://bestmbacoaching.com/compare"
        jsonLd={generateComparisonSchema(active)}
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
      <div className="hero-gradient py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Badge className="bg-primary-foreground/20 text-primary-foreground border-none mb-4">
              <Scale className="w-3.5 h-3.5 mr-1" /> Smart Comparison Tool
            </Badge>
            <h1 className="font-heading text-3xl md:text-5xl font-bold text-primary-foreground mb-3">
              Compare MBA Coaching Courses
            </h1>
            <p className="text-primary-foreground/70 max-w-3xl mx-auto text-lg mb-6">
              Make an informed decision — compare fees, curriculum, success rates, faculty strength, batch sizes, and student reviews of India's top MBA coaching institutes side by side.
            </p>
            <div className="flex flex-wrap justify-center gap-3 text-sm">
              {[
                { icon: Shield, text: "Verified Data" },
                { icon: Zap, text: "Instant Results" },
                { icon: ThumbsUp, text: "Unbiased Comparison" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-primary-foreground/10 rounded-full px-4 py-1.5 text-primary-foreground/80">
                  <item.icon className="w-3.5 h-3.5" /> {item.text}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Selection cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className={`border-2 ${selections[i] ? "border-primary/40 bg-secondary/20" : "border-dashed border-muted-foreground/30"} h-full`}>
                <CardContent className="pt-6 pb-6">
                  {selections[i] ? (
                    <div className="relative">
                      <button
                        onClick={() => handleRemove(i)}
                        className="absolute -top-2 -right-2 w-7 h-7 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="text-center">
                        {selections[i]!.institutes?.logo_url ? (
                          <img src={selections[i]!.institutes!.logo_url!} alt={`${selections[i]!.institutes?.name} logo`} className="w-14 h-14 rounded-xl object-contain bg-muted p-1 mx-auto mb-3" />
                        ) : (
                          <div className="w-14 h-14 hero-gradient rounded-xl flex items-center justify-center mx-auto mb-3 text-primary-foreground font-bold text-lg">
                            {selections[i]!.institutes?.name?.charAt(0) || "?"}
                          </div>
                        )}
                        <h3 className="font-heading font-semibold text-foreground">{selections[i]!.institutes?.name}</h3>
                        <p className="text-sm text-primary font-medium mt-1">{selections[i]!.name}</p>
                        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-0.5"><Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {selections[i]!.institutes?.rating || "N/A"}</span>
                          <span>•</span>
                          <span>{selections[i]!.institutes?.city || "India"}</span>
                        </div>
                        {selections[i]!.fees && (
                          <div className="mt-2 font-heading font-bold text-primary text-lg">₹{Number(selections[i]!.fees).toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3">
                        <BookOpen className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">Select Course {i + 1}</p>
                      <Select onValueChange={(v) => handleSelect(i, v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a course..." />
                        </SelectTrigger>
                        <SelectContent>
                          {courses
                            .filter(x => !selections.some(s => s?.id === x.id))
                            .map(x => (
                              <SelectItem key={x.id} value={x.id}>
                                {x.institutes?.name} — {x.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {active.length >= 2 ? (
          <Tabs defaultValue="comparison" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 h-12">
              <TabsTrigger value="comparison" className="gap-1"><BarChart3 className="w-4 h-4" /> Overview</TabsTrigger>
              <TabsTrigger value="curriculum" className="gap-1"><BookOpen className="w-4 h-4" /> Curriculum</TabsTrigger>
              <TabsTrigger value="offers" className="gap-1"><Tag className="w-4 h-4" /> Offers</TabsTrigger>
              <TabsTrigger value="bestforyou" className="gap-1"><Sparkles className="w-4 h-4" /> Best for You</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="comparison">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* Quick Stats Cards */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Avg. Fees", icon: IndianRupee, value: `₹${Math.round(active.reduce((s, c) => s + (c.fees || 0), 0) / active.length).toLocaleString()}` },
                    { label: "Avg. Rating", icon: Star, value: (active.reduce((s, c) => s + (c.institutes?.rating || 0), 0) / active.length).toFixed(1) },
                    { label: "Avg. Success Rate", icon: TrendingUp, value: `${Math.round(active.reduce((s, c) => s + (c.institutes?.success_rate || 0), 0) / active.length)}%` },
                    { label: "Courses Compared", icon: Scale, value: String(active.length) },
                  ].map((stat, i) => (
                    <Card key={i} className="bg-secondary/30">
                      <CardContent className="pt-4 pb-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <stat.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">{stat.label}</div>
                          <div className="font-heading font-bold text-foreground text-lg">{stat.value}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Detailed Comparison Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="font-heading flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" /> Detailed Side-by-Side Comparison</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-primary/20">
                          <th className="text-left py-3 px-4 font-heading font-semibold text-foreground min-w-[140px] bg-muted/30">Feature</th>
                          {active.map(s => (
                            <th key={s.id} className="text-left py-3 px-4 font-heading font-semibold text-primary min-w-[180px]">
                              <div className="flex items-center gap-2">
                                {s.institutes?.logo_url ? (
                                  <img src={s.institutes.logo_url} className="w-6 h-6 rounded object-contain" alt={`${s.institutes.name} logo`} />
                                ) : null}
                                <div>
                                  <div className="text-foreground">{s.institutes?.name}</div>
                                  <div className="text-xs font-normal text-muted-foreground">{s.name}</div>
                                </div>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {([
                          { label: "💰 Course Fees", render: (s: DBCourse) => <span className="font-heading font-bold text-primary text-base">{s.fees ? `₹${Number(s.fees).toLocaleString()}` : "N/A"}</span> },
                          { label: "⏱ Duration", render: (s: DBCourse) => s.duration || "N/A" },
                          { label: "👥 Batch Info", render: (s: DBCourse) => s.batch_info || "N/A" },
                          { label: "🎓 Teaching Mode", render: (s: DBCourse) => <Badge variant="secondary" className="text-xs">{s.institutes?.mode || "N/A"}</Badge> },
                          { label: "⭐ Institute Rating", render: (s: DBCourse) => (
                            <div className="space-y-1">
                              <span className="flex items-center gap-1 font-semibold">
                                <Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {s.institutes?.rating || "N/A"}
                                <span className="text-xs font-normal text-muted-foreground">/ 5</span>
                              </span>
                              <Progress value={((s.institutes?.rating || 0) / 5) * 100} className="h-1.5" />
                            </div>
                          )},
                          { label: "📝 Total Reviews", render: (s: DBCourse) => `${s.institutes?.total_reviews || 0} reviews` },
                          { label: "📈 Success Rate", render: (s: DBCourse) => (
                            <div className="space-y-1">
                              <span className="font-semibold text-foreground">{s.institutes?.success_rate || 0}%</span>
                              <Progress value={s.institutes?.success_rate || 0} className="h-1.5" />
                            </div>
                          )},
                          { label: "👨‍🎓 Students Enrolled", render: (s: DBCourse) => `${s.institutes?.students_count || 0}+` },
                          { label: "📍 Location", render: (s: DBCourse) => `${s.institutes?.city || "N/A"}, ${s.institutes?.state || ""}` },
                          { label: "📚 Curriculum Topics", render: (s: DBCourse) => (
                            <div className="space-y-1">
                              {(s.curriculum || []).slice(0, 4).map((c, i) => (
                                <div key={i} className="text-xs flex items-start gap-1">
                                  <CheckCircle className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                                  <span className="line-clamp-1">{c}</span>
                                </div>
                              ))}
                              {(s.curriculum || []).length > 4 && (
                                <span className="text-xs text-primary font-medium">+{(s.curriculum || []).length - 4} more</span>
                              )}
                              {(s.curriculum || []).length === 0 && <span className="text-xs text-muted-foreground">Not specified</span>}
                            </div>
                          )},
                          { label: "📄 Syllabus PDF", render: (s: DBCourse) => s.syllabus_url ? (
                            <a href={s.syllabus_url} target="_blank" rel="noopener noreferrer" className="text-primary underline text-xs">Download</a>
                          ) : <span className="text-xs text-muted-foreground">Not available</span> },
                          { label: "🏢 Institute Features", render: (s: DBCourse) => (
                            <div className="space-y-1">
                              {(s.institutes?.features || []).slice(0, 3).map((f, i) => (
                                <div key={i} className="text-xs flex items-start gap-1">
                                  <CheckCircle className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                                  <span className="line-clamp-1">{f}</span>
                                </div>
                              ))}
                              {(s.institutes?.features || []).length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                            </div>
                          )},
                        ] as { label: string; render: (s: DBCourse) => React.ReactNode }[]).map((row, idx) => (
                          <tr key={row.label} className={`border-b border-border ${idx % 2 === 0 ? "bg-muted/10" : ""}`}>
                            <td className="py-3 px-4 text-muted-foreground font-medium bg-muted/20">{row.label}</td>
                            {active.map(s => (
                              <td key={s.id} className="py-3 px-4 text-foreground">{row.render(s)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                {/* Fee Comparison Visual */}
                <Card>
                  <CardHeader><CardTitle className="font-heading">Fee Comparison</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {active.map((s, i) => (
                        <div key={s.id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-foreground">{s.institutes?.name} — {s.name}</span>
                            <span className="font-heading font-bold text-primary">₹{Number(s.fees || 0).toLocaleString()}</span>
                          </div>
                          <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${((s.fees || 0) / maxFees) * 100}%` }}
                              transition={{ duration: 0.8, delay: i * 0.2 }}
                              className="h-full hero-gradient rounded-lg flex items-center justify-end pr-2"
                            >
                              <span className="text-xs font-bold text-primary-foreground">₹{Number(s.fees || 0).toLocaleString()}</span>
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
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {active.map(s => (
                    <Card key={s.id} className="h-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3">
                          {s.institutes?.logo_url ? (
                            <img src={s.institutes.logo_url} className="w-10 h-10 rounded-lg object-contain bg-muted p-1" alt={`${s.institutes.name} logo`} />
                          ) : (
                            <div className="w-10 h-10 hero-gradient rounded-lg flex items-center justify-center text-primary-foreground font-bold">
                              {s.institutes?.name?.charAt(0)}
                            </div>
                          )}
                          <div>
                            <CardTitle className="font-heading text-base">{s.institutes?.name}</CardTitle>
                            <p className="text-xs text-primary font-medium">{s.name}</p>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {s.description && (
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-3" dangerouslySetInnerHTML={{ __html: s.description }} />
                        )}
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                            <div className="text-xs text-muted-foreground">Duration</div>
                            <div className="font-semibold text-foreground text-sm">{s.duration || "N/A"}</div>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-2.5 text-center">
                            <div className="text-xs text-muted-foreground">Fees</div>
                            <div className="font-semibold text-primary text-sm">{s.fees ? `₹${Number(s.fees).toLocaleString()}` : "N/A"}</div>
                          </div>
                        </div>
                        <h4 className="font-heading font-semibold text-foreground text-sm mb-2">Curriculum ({(s.curriculum || []).length} topics)</h4>
                        <div className="space-y-1.5 max-h-64 overflow-y-auto">
                          {(s.curriculum || []).map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm">
                              <CheckCircle className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                              <span className="text-muted-foreground">{item}</span>
                            </div>
                          ))}
                          {(s.curriculum || []).length === 0 && (
                            <p className="text-sm text-muted-foreground italic">Curriculum details not available</p>
                          )}
                        </div>
                        {s.syllabus_url && (
                          <a href={s.syllabus_url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="w-full mt-4 gap-1">
                              <BookOpen className="w-3.5 h-3.5" /> Download Syllabus
                            </Button>
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            </TabsContent>

            {/* Offers Tab */}
            <TabsContent value="offers">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {active.map(s => (
                    <Card key={s.id} className="border-primary/30 bg-gradient-to-b from-secondary/50 to-background overflow-hidden">
                      <div className="h-1.5 hero-gradient" />
                      <CardContent className="pt-6">
                        <div className="text-center mb-5">
                          {s.institutes?.logo_url ? (
                            <img src={s.institutes.logo_url} className="w-14 h-14 rounded-xl object-contain bg-muted p-1 mx-auto mb-3" alt={`${s.institutes.name} logo`} />
                          ) : (
                            <div className="w-14 h-14 hero-gradient rounded-xl flex items-center justify-center mx-auto mb-3 text-primary-foreground font-bold text-lg">
                              {s.institutes?.name?.charAt(0)}
                            </div>
                          )}
                          <h3 className="font-heading font-semibold text-foreground">{s.institutes?.name}</h3>
                          <p className="text-sm text-primary">{s.name}</p>
                        </div>
                        <div className="space-y-3">
                          {s.institutes?.discount && (
                            <div className="bg-card rounded-lg p-4 border border-border">
                              <div className="flex items-center gap-2 mb-1">
                                <Tag className="w-4 h-4 text-primary" />
                                <span className="text-sm font-semibold text-foreground">Discount</span>
                              </div>
                              <p className="text-sm text-muted-foreground">{s.institutes.discount}</p>
                            </div>
                          )}
                          {s.institutes?.offer && (
                            <div className="bg-card rounded-lg p-4 border border-primary/30">
                              <div className="flex items-center gap-2 mb-1">
                                <Sparkles className="w-4 h-4 text-primary" />
                                <span className="text-sm font-semibold text-foreground">Special Offer</span>
                              </div>
                              <p className="text-sm text-muted-foreground">{s.institutes.offer}</p>
                            </div>
                          )}
                          {!s.institutes?.discount && !s.institutes?.offer && (
                            <div className="text-center py-4 text-sm text-muted-foreground">No active offers currently</div>
                          )}
                          <div className="text-center pt-3 border-t border-border">
                            <p className="text-2xl font-heading font-bold text-primary mb-3">{s.fees ? `₹${Number(s.fees).toLocaleString()}` : "Contact for fees"}</p>
                            <Link to={`/institute/${s.institutes?.slug}`}>
                              <Button className="w-full gap-1">
                                View Full Details <ArrowRight className="w-4 h-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </motion.div>
            </TabsContent>

            {/* Best for You Tab */}
            <TabsContent value="bestforyou">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardHeader>
                    <CardTitle className="font-heading flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-primary" /> Personalized Recommendation
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-2">
                      Our algorithm considers <strong>institute rating</strong>, <strong>success rate</strong>, and <strong>value-for-money</strong> to give you the best recommendation.
                    </p>
                    <div className="grid grid-cols-3 gap-3 mb-6 text-center">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <Star className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                        <div className="text-xs text-muted-foreground">Rating Weight</div>
                        <div className="font-heading font-bold text-foreground">40%</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <TrendingUp className="w-5 h-5 text-primary mx-auto mb-1" />
                        <div className="text-xs text-muted-foreground">Success Rate</div>
                        <div className="font-heading font-bold text-foreground">35%</div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <IndianRupee className="w-5 h-5 text-primary mx-auto mb-1" />
                        <div className="text-xs text-muted-foreground">Value for Money</div>
                        <div className="font-heading font-bold text-foreground">25%</div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {bestForYou.map((s, i) => {
                        const score = ((s.institutes?.rating || 0) * 20 + (s.institutes?.success_rate || 0) - ((s.fees || 0) / 10000)).toFixed(1);
                        return (
                          <motion.div
                            key={s.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.15 }}
                            className={`flex items-center gap-4 p-5 rounded-xl border-2 ${
                              i === 0 ? "border-primary bg-secondary/50 shadow-lg" : "border-border"
                            }`}
                          >
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-xl flex-shrink-0 ${
                              i === 0 ? "hero-gradient text-primary-foreground shadow-md" : "bg-muted text-muted-foreground"
                            }`}>
                              #{i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h3 className="font-heading font-semibold text-foreground text-lg">{s.institutes?.name}</h3>
                                {i === 0 && <Badge className="bg-primary text-primary-foreground">🏆 Top Pick</Badge>}
                              </div>
                              <p className="text-sm text-primary font-medium">{s.name}</p>
                              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {s.institutes?.rating}</span>
                                <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" /> {s.institutes?.success_rate}% success</span>
                                <span className="font-heading font-bold text-foreground">{s.fees ? `₹${Number(s.fees).toLocaleString()}` : "N/A"}</span>
                                <span>{s.institutes?.city}</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-xs text-muted-foreground mb-1">Value Score</div>
                              <div className={`font-heading font-bold text-2xl ${i === 0 ? "text-primary" : "text-foreground"}`}>{score}</div>
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
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <Scale className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">Select at least 2 courses to compare</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Choose from {courses.length} available MBA courses across {new Set(courses.map(c => c.institutes?.name)).size} institutes to see a detailed comparison.
            </p>
          </motion.div>
        )}

        {/* SEO Content Section */}
        <section className="mt-16 space-y-10">
          {/* How to Compare Guide */}
          <Card className="bg-secondary/20">
            <CardContent className="pt-8 pb-8">
              <h2 className="font-heading text-2xl font-bold text-foreground mb-4">How to Compare MBA Coaching Courses Effectively</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Choosing the right MBA coaching institute is one of the most critical decisions in your MBA preparation journey. With hundreds of coaching centres across India offering varying course structures, fee plans, study materials, and teaching methodologies, a systematic side-by-side comparison helps you make a well-informed decision. Here's what you should look for:
              </p>
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  { icon: BarChart3, title: "Compare Key Metrics", desc: "Evaluate success rates, student reviews, faculty experience, batch sizes, and past year IIM conversion rates across institutes to understand which delivers the best results for your target exam." },
                  { icon: IndianRupee, title: "Analyze Value for Money", desc: "Don't just compare fees — consider the full package: number of mock tests, quality of study material, doubt-clearing sessions, GD-PI preparation, interview coaching, and post-admission mentoring." },
                  { icon: Award, title: "Check Track Record", desc: "Look at historical results over multiple years, IIM call conversion rates, CAT 99+ percentile count, and the strength of their alumni network to gauge long-term effectiveness." },
                ].map((item, i) => (
                  <div key={i} className="bg-card rounded-xl p-5 border border-border">
                    <item.icon className="w-8 h-8 text-primary mb-3" />
                    <h3 className="font-heading font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Why Use Our Tool */}
          <Card className="bg-secondary/20">
            <CardContent className="pt-8 pb-8">
              <h2 className="font-heading text-2xl font-bold text-foreground mb-4">Why Use Our MBA Coaching Comparison Tool?</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { title: "Unbiased & Transparent", desc: "We present data as-is from verified coaching institutes. No paid rankings, no sponsored placements in comparison results. Every data point is verified." },
                  { title: "Comprehensive Data Points", desc: "Compare 12+ parameters including fees, duration, curriculum, success rates, batch sizes, teaching mode, faculty credentials, and available discounts — all in one view." },
                  { title: "AI-Powered Recommendations", desc: "Our 'Best for You' algorithm analyzes rating, success rate, and value-for-money to give you a personalized recommendation based on what matters most." },
                  { title: "Updated Regularly", desc: "Course fees, batch details, and success metrics are updated frequently in coordination with coaching institutes to ensure you're comparing the latest data." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <CheckCircle className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold text-foreground mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Factors */}
          <Card className="bg-secondary/20">
            <CardContent className="pt-8 pb-8">
              <h2 className="font-heading text-2xl font-bold text-foreground mb-4">Key Factors When Choosing MBA Coaching</h2>
              <div className="space-y-4">
                {[
                  { title: "Faculty Quality & Experience", desc: "The faculty is the backbone of any coaching institute. Look for experienced educators with IIM/top B-school backgrounds, industry experience, and a proven track record of producing high percentilers. Our comparison tool shows faculty credentials for each institute." },
                  { title: "Study Material & Test Series", desc: "Quality study material makes a huge difference in MBA preparation. Check if the institute provides comprehensive topic-wise notes, sectional tests, full-length mock tests (at least 50+), and previous year paper analysis. Some institutes also offer adaptive learning platforms." },
                  { title: "Batch Size & Personal Attention", desc: "Smaller batch sizes typically mean more personalized attention. Institutes with 30-40 students per batch generally provide better doubt resolution. Check if the institute offers personal mentoring, one-on-one doubt sessions, and performance tracking." },
                  { title: "Online vs Offline vs Hybrid Mode", desc: "Consider your learning style and location. Offline classes offer discipline and peer learning, online provides flexibility, and hybrid combines both. Our tool lets you compare courses across all modes to find what suits you best." },
                  { title: "Post-Exam Support (GD-PI-WAT)", desc: "MBA preparation doesn't end with the exam. Top coaching institutes offer comprehensive GD-PI-WAT preparation, mock interviews with industry professionals, essay writing workshops, and profile-building guidance. This can be a decisive factor in final conversions." },
                ].map((item, i) => (
                  <div key={i} className="bg-card rounded-xl p-5 border border-border">
                    <h3 className="font-heading font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* FAQ Section with Schema */}
          <Card className="bg-secondary/20">
            <CardContent className="pt-8 pb-8">
              <h2 className="font-heading text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <HelpCircle className="w-6 h-6 text-primary" /> Frequently Asked Questions
              </h2>
              <div className="space-y-3">
                {compareFaqs.map((faq, i) => (
                  <div key={i} className="bg-card rounded-xl border border-border overflow-hidden">
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                      className="w-full flex items-center justify-between p-5 text-left"
                    >
                      <h3 className="font-heading font-semibold text-foreground pr-4">{faq.q}</h3>
                      {expandedFaq === i ? <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
                    </button>
                    {expandedFaq === i && (
                      <div className="px-5 pb-5 -mt-2">
                        <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Inject FAQ Schema */}
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(compareFaqs)) }}
              />
            </CardContent>
          </Card>

          {/* Internal Links */}
          <Card className="bg-secondary/20">
            <CardContent className="pt-8 pb-8">
              <h2 className="font-heading text-2xl font-bold text-foreground mb-4">Explore More on BestMBACoaching.com</h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Top MBA Colleges", path: "/colleges", desc: "Rankings, fees & placements" },
                  { label: "MBA Blog & News", path: "/blog", desc: "Exam tips & career advice" },
                  { label: "MBA Exams Guide", path: "/", desc: "CAT, XAT, GMAT & more" },
                  { label: "Contact Us", path: "/contact", desc: "Get personalized guidance" },
                ].map((link, i) => (
                  <Link key={i} to={link.path} className="bg-card rounded-xl p-4 border border-border hover:border-primary/40 transition-colors group">
                    <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors text-sm">{link.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{link.desc}</p>
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
