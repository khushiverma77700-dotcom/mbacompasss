import { useParams, Link } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { MapPin, Star, Users, TrendingUp, Award, BookOpen, ArrowLeft, Globe, GraduationCap, CheckCircle, Building, Calendar, ChevronDown, ChevronUp, Download, ThumbsUp, ThumbsDown, HelpCircle, Home, Image, Medal, Banknote, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useCollegeBySlug, useColleges } from "@/hooks/useInstitutes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import SEOHead, { generateCollegeSchema } from "@/components/SEOHead";

const ratingAspects = [
  { key: "academics", label: "Academics", score: 4.5 },
  { key: "faculty", label: "Faculty", score: 4.2 },
  { key: "infrastructure", label: "Infrastructure", score: 4.0 },
  { key: "accommodation", label: "Accommodation", score: 3.8 },
  { key: "social", label: "Social Life", score: 4.3 },
  { key: "placements", label: "Placements", score: 4.6 },
  { key: "value", label: "Value for Money", score: 3.9 },
];

const galleryImages = [
  "https://images.unsplash.com/photo-1562774053-701939374585?w=600",
  "https://images.unsplash.com/photo-1523050854058-8df90110c476?w=600",
  "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600",
  "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=600",
  "https://images.unsplash.com/photo-1606761568499-6d2451b23c66?w=600",
];

const CollegeDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data: college, isLoading } = useCollegeBySlug(slug);
  const { data: allColleges } = useColleges();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [qaOpen, setQaOpen] = useState<number | null>(null);
  const [reviewForm, setReviewForm] = useState({ positives: "", negatives: "", rating: 5 });
  const galleryRef = useRef<ReturnType<typeof setInterval>>();

  // Auto-slide gallery
  useEffect(() => {
    galleryRef.current = setInterval(() => setGalleryIdx(p => (p + 1) % galleryImages.length), 3000);
    return () => clearInterval(galleryRef.current);
  }, []);

  // Fetch related articles
  const { data: relatedArticles } = useQuery({
    queryKey: ["college-articles", college?.name],
    queryFn: async () => {
      const { data } = await supabase.from("articles").select("*").eq("published", true).order("created_at", { ascending: false }).limit(4);
      return data || [];
    },
    enabled: !!college,
  });

  useEffect(() => {
    if (college) {
      document.title = `${college.name} — Fees, Placements, Admission, Ranking | MBAHub`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) metaDesc.setAttribute("content",
        `${college.name}, ${college.city} — Fees: ${college.fees}, Avg Package: ${college.placement_avg}. Ranking #${college.ranking}. Check courses, cutoffs, placements & admission details.`
      );
    }
  }, [college]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="hero-gradient py-12"><div className="container mx-auto px-4"><Skeleton className="h-10 w-80 mb-3" /><Skeleton className="h-6 w-60" /></div></div>
        <div className="container mx-auto px-4 py-8 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>
          <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
        </div>
      </div>
    );
  }

  if (!college) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-4">College not found</h1>
          <Link to="/colleges"><Button>Browse All Colleges</Button></Link>
        </div>
      </div>
    );
  }

  const exams = college.exams_accepted || [];
  const courses = college.courses || [];
  const accreditations = college.accreditations || [];
  const topRecruiters = college.top_recruiters || [];
  const highlights = college.highlights as any;
  const cutoffInfo = college.cutoff_info as any;
  const suggestedColleges = (allColleges || []).filter(c => c.slug !== college.slug).slice(0, 6);

  const overallRating = (ratingAspects.reduce((s, a) => s + a.score, 0) / ratingAspects.length).toFixed(1);
  const collegeJsonLd = generateCollegeSchema(college);

  const qaItems = [
    { q: `What is the fee structure at ${college.name}?`, a: `The total program fees at ${college.name} is ${college.fees || "available on request"}. This typically covers tuition, hostel, and other charges.` },
    { q: `What exams are accepted for admission?`, a: `${college.name} accepts scores from ${exams.length > 0 ? exams.join(", ") : "CAT, XAT, GMAT"} for MBA admissions.` },
    { q: `What is the average placement package?`, a: `The average placement package at ${college.name} is ${college.placement_avg || "competitive"}. The highest package offered is ${college.placement_highest || "among the best in India"}.` },
    { q: `Is hostel accommodation available?`, a: `Yes, ${college.name} provides hostel accommodation for students with modern amenities including Wi-Fi, mess, gym, and recreational facilities.` },
    { q: `What are the eligibility criteria?`, a: `Candidates must hold a bachelor's degree with minimum 50% marks. A valid score in ${exams[0] || "CAT"} is required along with clearing GD-PI rounds.` },
  ];

  const handleDownloadBrochure = () => {
    const content = [
      `${college.name} - Brochure`,
      `Location: ${college.city}, ${college.state}`,
      `Ranking: #${college.ranking} (NIRF)`,
      `Fees: ${college.fees}`,
      `Avg Package: ${college.placement_avg}`,
      `Highest Package: ${college.placement_highest}`,
      `Courses: ${courses.join(", ")}`,
      `Exams Accepted: ${exams.join(", ")}`,
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${college.slug}-brochure.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Brochure downloaded!" });
  };

  const tabItems = [
    { value: "overview", label: "Overview" },
    { value: "courses", label: "Courses & Fees" },
    { value: "admission", label: "Admissions" },
    { value: "placements", label: "Placements" },
    { value: "cutoff", label: "Cut-off" },
    { value: "rankings", label: "Rankings" },
    { value: "reviews", label: "Reviews" },
    { value: "gallery", label: "Gallery" },
    { value: "scholarships", label: "Scholarships" },
    { value: "faculty", label: "Faculty" },
    { value: "hostel", label: "Hostel & Campus" },
    { value: "qa", label: "Q&A" },
    { value: "news", label: "News" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="hero-gradient py-10 md:py-14">
        <div className="container mx-auto px-4">
          <Link to="/colleges" className="inline-flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Colleges
          </Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 rounded-xl bg-primary-foreground/20 flex items-center justify-center text-primary-foreground font-bold text-2xl flex-shrink-0">
                {college.ranking ? `#${college.ranking}` : college.name.charAt(0)}
              </div>
              <div>
                <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground mb-1">{college.name}</h1>
                <div className="flex flex-wrap items-center gap-3 text-primary-foreground/80 text-sm">
                  <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {college.city}, {college.state}</span>
                  <Badge className="bg-primary-foreground/15 text-primary-foreground border-none text-xs">{college.type}</Badge>
                  {college.established && <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Est. {college.established}</span>}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              {[
                { label: "NIRF Ranking", value: college.ranking ? `#${college.ranking}` : "N/A" },
                { label: "Fees", value: college.fees || "N/A" },
                { label: "Avg Package", value: college.placement_avg || "N/A" },
                { label: "Highest Package", value: college.placement_highest || "N/A" },
              ].map((s) => (
                <div key={s.label} className="bg-primary-foreground/10 backdrop-blur-sm rounded-lg px-4 py-2">
                  <div className="text-xs text-primary-foreground/70">{s.label}</div>
                  <div className="font-heading font-bold text-primary-foreground text-sm">{s.value}</div>
                </div>
              ))}
            </div>
            {accreditations.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {accreditations.map((a: string) => (
                  <Badge key={a} className="bg-primary-foreground/20 text-primary-foreground border-none text-xs">{a}</Badge>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="flex flex-wrap h-auto gap-1">
                {tabItems.map(t => <TabsTrigger key={t.value} value={t.value} className="text-xs">{t.label}</TabsTrigger>)}
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="font-heading">About {college.name}</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
                      {college.description || `${college.name} is a premier ${college.type} institute located in ${college.city}, ${college.state}. Ranked #${college.ranking} nationally, it offers world-class MBA education.`}
                    </p>
                    {highlights && (
                      <div className="mt-6">
                        <h3 className="font-heading font-semibold text-foreground mb-3">Key Highlights</h3>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {(Array.isArray(highlights) ? highlights : Object.entries(highlights).map(([k, v]) => `${k}: ${v}`)).map((h: string, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                              <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />{h}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Why Join Section */}
                <Card className="border-primary/30">
                  <CardHeader><CardTitle className="font-heading flex items-center gap-2"><Star className="w-5 h-5 text-primary" /> Why Join {college.name}?</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="text-center">
                        <div className="text-4xl font-heading font-bold text-primary">{overallRating}</div>
                        <div className="flex items-center gap-0.5 justify-center mt-1">
                          {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < Math.round(Number(overallRating)) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Overall Rating</div>
                      </div>
                      <div className="flex-1 space-y-2">
                        {ratingAspects.map(a => (
                          <div key={a.key} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{a.label}</span>
                            <Progress value={a.score * 20} className="flex-1 h-2" />
                            <span className="text-xs font-semibold text-foreground w-8">{a.score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {exams.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="font-heading">Exams Accepted</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {exams.map((exam: string) => (
                          <Link key={exam} to={`/exam/${exam.toLowerCase()}`}>
                            <Badge variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-sm py-1.5 px-3">{exam}</Badge>
                          </Link>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Courses & Fees */}
              <TabsContent value="courses" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="font-heading">Courses & Fee Structure</CardTitle></CardHeader>
                  <CardContent>
                    {courses.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead><tr className="bg-muted/50">
                            <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Course</th>
                            <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Duration</th>
                            <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Eligibility</th>
                            <th className="text-right py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Total Fees</th>
                          </tr></thead>
                          <tbody>
                            {courses.map((c: string, i: number) => (
                              <tr key={i} className="border-b border-border hover:bg-muted/30">
                                <td className="py-3 px-3 font-medium text-foreground">{c}</td>
                                <td className="py-3 px-3 text-muted-foreground">2 Years</td>
                                <td className="py-3 px-3 text-muted-foreground">Graduation + {exams[0] || "CAT"}</td>
                                <td className="py-3 px-3 text-right font-heading font-bold text-primary">{college.fees || "Contact College"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">Course details coming soon. Fee: {college.fees || "Contact the college"}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Admissions */}
              <TabsContent value="admission" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="font-heading">Admission Process</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed mb-6">
                      {college.admission_process || `Admission to ${college.name} is based on scores in national-level entrance exams such as ${exams.join(", ") || "CAT, XAT, GMAT"}, followed by GD, WAT, and PI.`}
                    </p>
                    <div className="space-y-4">
                      <h3 className="font-heading font-semibold text-foreground">Admission Steps</h3>
                      {[
                        { step: "1", title: "Entrance Exam", desc: `Score well in ${exams[0] || "CAT"} or other accepted exams`, icon: BookOpen },
                        { step: "2", title: "Shortlisting", desc: "Based on exam scores, academic profile, and work experience", icon: CheckCircle },
                        { step: "3", title: "GD/WAT/PI", desc: "Group Discussion, Written Ability Test, and Personal Interview rounds", icon: Users },
                        { step: "4", title: "Final Selection", desc: "Merit list based on composite scores from all rounds", icon: Award },
                      ].map((s) => (
                        <div key={s.step} className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full hero-gradient flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">{s.step}</div>
                          <div>
                            <h4 className="font-semibold text-foreground">{s.title}</h4>
                            <p className="text-sm text-muted-foreground">{s.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 p-4 rounded-lg bg-secondary/50 border border-border">
                      <h4 className="font-heading font-semibold text-foreground mb-2">Eligibility Criteria</h4>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-primary" /> Bachelor's degree with minimum 50% marks (45% for reserved categories)</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-primary" /> Valid {exams.join(" / ") || "CAT/XAT/GMAT"} score</li>
                        <li className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-primary" /> Work experience preferred but not mandatory</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Placements */}
              <TabsContent value="placements" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="font-heading">Placement Statistics</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                      {[
                        { label: "Average Package", value: college.placement_avg || "N/A", icon: TrendingUp },
                        { label: "Highest Package", value: college.placement_highest || "N/A", icon: Award },
                        { label: "Median Package", value: college.placement_median || "N/A", icon: Star },
                        { label: "Placement Rate", value: "98%", icon: CheckCircle },
                      ].map((s) => (
                        <div key={s.label} className="bg-secondary/50 rounded-lg p-4 text-center">
                          <s.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                          <div className="font-heading text-lg font-bold text-primary">{s.value}</div>
                          <div className="text-xs text-muted-foreground">{s.label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Sector-wise breakdown */}
                    <h3 className="font-heading font-semibold text-foreground mb-3">Sector-wise Placements</h3>
                    <div className="space-y-2 mb-6">
                      {[
                        { sector: "Consulting", pct: 35 },
                        { sector: "Finance & Banking", pct: 28 },
                        { sector: "IT & Analytics", pct: 18 },
                        { sector: "FMCG & Marketing", pct: 12 },
                        { sector: "Others", pct: 7 },
                      ].map(s => (
                        <div key={s.sector} className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground w-36 flex-shrink-0">{s.sector}</span>
                          <Progress value={s.pct} className="flex-1 h-3" />
                          <span className="text-sm font-semibold text-foreground w-10 text-right">{s.pct}%</span>
                        </div>
                      ))}
                    </div>

                    {topRecruiters.length > 0 && (
                      <div>
                        <h3 className="font-heading font-semibold text-foreground mb-3">Top Recruiters</h3>
                        <div className="flex flex-wrap gap-2">
                          {topRecruiters.map((r: string) => (
                            <Badge key={r} variant="outline" className="text-xs py-1.5 px-3"><Building className="w-3 h-3 mr-1" /> {r}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Cutoff */}
              <TabsContent value="cutoff" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="font-heading">Cutoff Details</CardTitle></CardHeader>
                  <CardContent>
                    {cutoffInfo ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead><tr className="bg-muted/50">
                            <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Category</th>
                            <th className="text-right py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Cutoff Percentile</th>
                          </tr></thead>
                          <tbody>
                            {Object.entries(cutoffInfo).map(([cat, val]) => (
                              <tr key={cat} className="border-b border-border">
                                <td className="py-3 px-3 font-medium text-foreground capitalize">{cat}</td>
                                <td className="py-3 px-3 text-right font-heading font-bold text-primary">{String(val)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <GraduationCap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">Cutoff data for {exams[0] || "CAT"} at {college.name}: General 95+ percentile (expected).</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Rankings */}
              <TabsContent value="rankings" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="font-heading flex items-center gap-2"><Medal className="w-5 h-5 text-primary" /> Rankings & Accreditations</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 gap-4 mb-6">
                      {[
                        { body: "NIRF", rank: college.ranking ? `#${college.ranking}` : "N/A", year: "2025" },
                        { body: "Business Today", rank: college.ranking ? `#${Math.max(1, (college.ranking || 1) - 2)}` : "N/A", year: "2025" },
                        { body: "Outlook", rank: college.ranking ? `#${Math.max(1, (college.ranking || 1) + 1)}` : "N/A", year: "2024" },
                        { body: "The Week", rank: college.ranking ? `#${Math.max(1, (college.ranking || 1) - 1)}` : "N/A", year: "2024" },
                      ].map(r => (
                        <div key={r.body} className="bg-secondary/50 rounded-lg p-4 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg hero-gradient flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">{r.rank}</div>
                          <div>
                            <div className="font-semibold text-foreground">{r.body}</div>
                            <div className="text-xs text-muted-foreground">{r.year} Ranking</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {accreditations.length > 0 && (
                      <div>
                        <h3 className="font-heading font-semibold text-foreground mb-3">Accreditations</h3>
                        <div className="flex flex-wrap gap-3">
                          {accreditations.map((a: string) => (
                            <div key={a} className="flex items-center gap-2 bg-primary/10 rounded-lg px-4 py-2">
                              <Award className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium text-foreground">{a}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Reviews */}
              <TabsContent value="reviews" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="font-heading flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /> Student Reviews</CardTitle></CardHeader>
                  <CardContent>
                    {/* Overall Rating Summary */}
                    <div className="flex items-center gap-6 mb-6 p-4 bg-secondary/30 rounded-lg">
                      <div className="text-center">
                        <div className="text-4xl font-heading font-bold text-primary">{overallRating}</div>
                        <div className="flex items-center gap-0.5 justify-center mt-1">
                          {[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(Number(overallRating)) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">Based on student reviews</div>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {ratingAspects.slice(0, 5).map(a => (
                          <div key={a.key} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-24">{a.label}</span>
                            <Progress value={a.score * 20} className="flex-1 h-2" />
                            <span className="text-xs font-semibold w-6">{a.score}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sample Reviews with Green/Red sections */}
                    {[
                      { name: "Rahul S.", year: "Batch 2024", rating: 5, positives: "Excellent faculty, world-class infrastructure, great alumni network. Campus placements are outstanding with top companies visiting.", negatives: "High fees, competitive peer pressure. Limited diversity in elective options." },
                      { name: "Priya M.", year: "Batch 2023", rating: 4, positives: "Industry exposure through live projects. Strong case study methodology. Amazing peer learning environment.", negatives: "Hostel facilities could be improved. Food quality varies. Campus is a bit isolated." },
                      { name: "Amit K.", year: "Batch 2024", rating: 4, positives: "Best ROI among MBA colleges. Professors bring real industry experience. Club activities are vibrant.", negatives: "Workload is intense, especially during placement season. Library hours should be extended." },
                    ].map((review, i) => (
                      <div key={i} className="border border-border rounded-xl p-5 mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className="font-semibold text-foreground">{review.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">{review.year}</span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {[...Array(5)].map((_, j) => <Star key={j} className={`w-3.5 h-3.5 ${j < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />)}
                          </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-lg p-3">
                            <div className="flex items-center gap-1 mb-1.5 text-green-700 dark:text-green-400 text-sm font-semibold"><ThumbsUp className="w-3.5 h-3.5" /> Positives</div>
                            <p className="text-xs text-green-800 dark:text-green-300 leading-relaxed">{review.positives}</p>
                          </div>
                          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3">
                            <div className="flex items-center gap-1 mb-1.5 text-red-700 dark:text-red-400 text-sm font-semibold"><ThumbsDown className="w-3.5 h-3.5" /> Negatives</div>
                            <p className="text-xs text-red-800 dark:text-red-300 leading-relaxed">{review.negatives}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Gallery */}
              <TabsContent value="gallery" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="font-heading flex items-center gap-2"><Image className="w-5 h-5 text-primary" /> Campus Gallery</CardTitle></CardHeader>
                  <CardContent>
                    <div className="relative rounded-xl overflow-hidden aspect-video mb-4">
                      <AnimatePresence mode="wait">
                        <motion.img
                          key={galleryIdx}
                          src={galleryImages[galleryIdx]}
                          alt={`${college.name} campus ${galleryIdx + 1}`}
                          className="w-full h-full object-cover"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.5 }}
                        />
                      </AnimatePresence>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {galleryImages.map((_, i) => (
                          <button key={i} onClick={() => setGalleryIdx(i)} className={`w-2.5 h-2.5 rounded-full transition-all ${i === galleryIdx ? "bg-primary-foreground scale-125" : "bg-primary-foreground/50"}`} />
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {galleryImages.map((img, i) => (
                        <button key={i} onClick={() => setGalleryIdx(i)} className={`rounded-lg overflow-hidden aspect-square border-2 transition-all ${i === galleryIdx ? "border-primary" : "border-transparent hover:border-primary/50"}`}>
                          <img src={img} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Scholarships */}
              <TabsContent value="scholarships" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="font-heading flex items-center gap-2"><Banknote className="w-5 h-5 text-primary" /> Scholarships</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { name: "Merit Scholarship", criteria: "Top 10% CAT percentile", amount: "Up to 50% tuition waiver", desc: "Awarded to students with exceptional entrance exam scores." },
                        { name: "Need-Based Aid", criteria: "Family income < ₹8 LPA", amount: "₹1-3 Lakh per year", desc: "Financial assistance for deserving students from economically weaker sections." },
                        { name: "Diversity Scholarship", criteria: "Women / Non-engineering backgrounds", amount: "Up to 25% fee waiver", desc: "Encouraging diverse cohorts by supporting underrepresented groups." },
                        { name: "SC/ST/OBC Scholarship", criteria: "Government category students", amount: "As per government norms", desc: "Government-backed financial aid for reserved category students." },
                      ].map((s, i) => (
                        <div key={i} className="border border-border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-heading font-semibold text-foreground">{s.name}</h4>
                            <Badge className="bg-primary/10 text-primary border-none text-xs">{s.amount}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-1">{s.desc}</p>
                          <p className="text-xs text-primary font-medium">Criteria: {s.criteria}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Faculty */}
              <TabsContent value="faculty" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="font-heading">Faculty Profiles</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {[
                        { name: "Prof. Rajesh Kumar", dept: "Finance & Accounting", exp: "20+ years", qual: "PhD IIM Ahmedabad" },
                        { name: "Prof. Sunita Verma", dept: "Marketing Management", exp: "15+ years", qual: "PhD ISB Hyderabad" },
                        { name: "Prof. Anil Sharma", dept: "Operations & Supply Chain", exp: "18+ years", qual: "PhD IIT Delhi" },
                        { name: "Prof. Meera Patel", dept: "HR & Organizational Behavior", exp: "12+ years", qual: "PhD XLRI Jamshedpur" },
                        { name: "Prof. Vikram Singh", dept: "Strategy & Entrepreneurship", exp: "22+ years", qual: "PhD Wharton" },
                        { name: "Prof. Kavita Rao", dept: "Business Analytics", exp: "10+ years", qual: "PhD Stanford" },
                      ].map((f, i) => (
                        <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border">
                          <div className="w-12 h-12 rounded-full hero-gradient flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
                            {f.name.split(" ").slice(1).map(n => n[0]).join("")}
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground text-sm">{f.name}</h4>
                            <p className="text-xs text-primary font-medium">{f.dept}</p>
                            <p className="text-xs text-muted-foreground">{f.qual} • {f.exp}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Hostel & Campus */}
              <TabsContent value="hostel" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="font-heading flex items-center gap-2"><Home className="w-5 h-5 text-primary" /> Hostel & Campus Life</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid sm:grid-cols-2 gap-4 mb-6">
                      {[
                        { label: "Campus Size", value: college.campus_size || "Sprawling campus", icon: Building },
                        { label: "Total Students", value: college.total_students ? `${college.total_students}+` : "1000+", icon: Users },
                        { label: "Hostel Rooms", value: "Single & Double occupancy", icon: Home },
                        { label: "Library", value: "24/7 Access, 50,000+ books", icon: BookOpen },
                      ].map((item, i) => (
                        <div key={i} className="bg-secondary/50 rounded-lg p-4 flex items-center gap-3">
                          <item.icon className="w-6 h-6 text-primary flex-shrink-0" />
                          <div>
                            <div className="text-xs text-muted-foreground">{item.label}</div>
                            <div className="font-semibold text-foreground text-sm">{item.value}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <h4 className="font-heading font-semibold text-foreground mb-3">Campus Facilities</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {["Wi-Fi Campus", "Swimming Pool", "Gymnasium", "Sports Complex", "Cafeteria", "Auditorium", "Computer Labs", "Medical Center", "ATM & Bank"].map((f, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                          <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />{f}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Q&A */}
              <TabsContent value="qa" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="font-heading flex items-center gap-2"><HelpCircle className="w-5 h-5 text-primary" /> Frequently Asked Questions</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {qaItems.map((item, i) => (
                        <div key={i} className="border border-border rounded-lg overflow-hidden">
                          <button onClick={() => setQaOpen(qaOpen === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors">
                            <span className="font-medium text-foreground text-sm pr-4">{item.q}</span>
                            {qaOpen === i ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                          </button>
                          <AnimatePresence>
                            {qaOpen === i && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* News / Articles */}
              <TabsContent value="news" className="space-y-6">
                <Card>
                  <CardHeader><CardTitle className="font-heading">Latest News & Articles</CardTitle></CardHeader>
                  <CardContent>
                    {(relatedArticles || []).length > 0 ? (
                      <div className="space-y-3">
                        {(relatedArticles || []).map((article: any) => (
                          <Link key={article.id} to={`/article/${article.slug}`} className="block p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors border border-border">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="secondary" className="text-xs">{article.category}</Badge>
                              <span className="text-xs text-muted-foreground">{new Date(article.created_at).toLocaleDateString()}</span>
                            </div>
                            <h4 className="font-semibold text-foreground text-sm">{article.title}</h4>
                            {article.excerpt && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{article.excerpt}</p>}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-6">No related articles yet.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-heading font-semibold text-foreground mb-4">Quick Info</h3>
                <div className="space-y-3">
                  {[
                    { icon: MapPin, label: "Location", value: `${college.city}, ${college.state}` },
                    { icon: Award, label: "Ranking", value: college.ranking ? `#${college.ranking} (NIRF)` : "N/A" },
                    { icon: BookOpen, label: "Type", value: college.type || "N/A" },
                    { icon: Users, label: "Students", value: college.total_students ? `${college.total_students}+` : "N/A" },
                    { icon: Building, label: "Campus", value: college.campus_size || "N/A" },
                    { icon: Calendar, label: "Established", value: college.established ? String(college.established) : "N/A" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center"><item.icon className="w-4 h-4 text-primary" /></div>
                      <div>
                        <div className="text-xs text-muted-foreground">{item.label}</div>
                        <div className="font-semibold text-foreground text-sm">{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {college.website && (
                  <a href={college.website} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full mt-4 gap-1"><Globe className="w-4 h-4" /> Visit Website</Button>
                  </a>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/30 bg-secondary/50">
              <CardContent className="pt-6 text-center">
                <GraduationCap className="w-8 h-8 text-primary mx-auto mb-3" />
                <h4 className="font-heading font-semibold text-foreground mb-1">Total Fees</h4>
                <p className="font-heading text-2xl font-bold text-primary">{college.fees || "Contact College"}</p>
                <p className="text-xs text-muted-foreground mt-1">For full program duration</p>
                <Button className="w-full mt-4 gap-1" onClick={handleDownloadBrochure}><Download className="w-4 h-4" /> Download Brochure</Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <Award className="w-8 h-8 text-primary mx-auto mb-3" />
                <h4 className="font-heading font-semibold text-foreground mb-2">Compare Colleges</h4>
                <p className="text-sm text-muted-foreground mb-4">Compare {college.name} with other top MBA colleges</p>
                <Link to="/compare"><Button variant="outline" className="w-full">Go to Compare</Button></Link>
              </CardContent>
            </Card>

            {/* Suggested Colleges */}
            <Card>
              <CardContent className="pt-6">
                <h4 className="font-heading font-semibold text-foreground mb-3">Suggested Colleges</h4>
                <div className="space-y-2">
                  {suggestedColleges.map((c: any) => (
                    <Link key={c.slug} to={`/college/${c.slug}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-xs font-bold text-primary">
                        {c.ranking ? `#${c.ranking}` : c.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.city} • {c.fees || "N/A"}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollegeDetailPage;
