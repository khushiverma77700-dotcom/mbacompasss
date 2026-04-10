import { useParams, Link } from "react-router-dom";
import PageKeywords from "@/components/PageKeywords";
import { useEffect, useState, useRef, useCallback } from "react";
import { MapPin, Star, Users, TrendingUp, Award, BookOpen, ArrowLeft, Globe, GraduationCap, CheckCircle, Building, Calendar, ChevronDown, ChevronUp, Download, ThumbsUp, ThumbsDown, HelpCircle, Home, Image, Medal, Banknote, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useCollegeBySlug, useColleges } from "@/hooks/useInstitutes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import SEOHead, { generateCollegeSchema } from "@/components/SEOHead";
import { useResolvedSeo } from "@/hooks/useResolvedSeo";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import AIGistSection from "@/components/AIGistSection";
import InlineAIToolCTA from "@/components/InlineAIToolCTA";

// ── Fallback data used when no DB sections exist ──
const fallbackRatingAspects = [
  { label: "Academics", score: 4.5 }, { label: "Faculty", score: 4.2 }, { label: "Infrastructure", score: 4.0 },
  { label: "Accommodation", score: 3.8 }, { label: "Social Life", score: 4.3 }, { label: "Placements", score: 4.6 },
  { label: "Value for Money", score: 3.9 },
];
const fallbackGallery = [
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
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [qaOpen, setQaOpen] = useState<number | null>(null);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const galleryRef = useRef<ReturnType<typeof setInterval>>();
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Fetch college sections from DB
  const { data: dbSections } = useQuery({
    queryKey: ["college-sections", college?.id],
    queryFn: async () => {
      const { data } = await supabase.from("college_sections").select("*").eq("college_id", college!.id).order("sort_order");
      return data || [];
    },
    enabled: !!college?.id,
  });

  // Helper to get section data
  const getSection = (type: string) => dbSections?.find((s: any) => s.section_type === type);
  const getSectionData = (type: string) => {
    const sec = getSection(type);
    return sec?.data as any || {};
  };
  const getSectionContent = (type: string) => getSection(type)?.content || "";

  const scrollToSection = useCallback((sectionId: string) => {
    if (!user) { setShowLoginDialog(true); return; }
    const el = sectionRefs.current[sectionId];
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: "smooth" });
    }
  }, [user]);

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
    }
  }, [college]);

  // Gallery auto-slide
  const galleryData = getSectionData("gallery");
  const galleryImages = galleryData.images?.length > 0 ? galleryData.images.map((i: any) => i.url) : fallbackGallery;

  useEffect(() => {
    galleryRef.current = setInterval(() => setGalleryIdx(p => (p + 1) % galleryImages.length), 3000);
    return () => clearInterval(galleryRef.current);
  }, [galleryImages.length]);

  // Must call useResolvedSeo before any early returns to obey hooks rules
  const collegeJsonLd = college ? generateCollegeSchema(college) : undefined;
  const { seo: resolvedSeo } = useResolvedSeo(
    college ? "college" : undefined,
    college?.id,
    college
      ? {
          title: `${college.name} — Fees, Placements, Admission, Ranking | MBAHub`,
          description:
            (college as any).meta_description ||
            `${college.name}, ${college.city} — Fees: ${college.fees}, Avg Package: ${college.placement_avg}.`,
          keywords: ((college as any).keywords || [college.name, college.city || "", "MBA"]).filter(Boolean),
          canonical: `${window.location.origin}/college/${college.slug}`,
          jsonLd: collegeJsonLd,
          ogImage: college.banner_url || college.logo_url || undefined,
        }
      : {},
  );

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

  // Section data from DB or fallback
  const reviewData = getSectionData("reviews");
  const ratingAspects = reviewData.aspects?.length > 0 ? reviewData.aspects : fallbackRatingAspects;
  const overallRating = reviewData.overall_rating || (ratingAspects.reduce((s: number, a: any) => s + Number(a.score), 0) / ratingAspects.length).toFixed(1);

  const placementData = getSectionData("placements");
  const cutoffData = getSectionData("cutoff");
  const rankingsData = getSectionData("rankings");
  const scholarshipsData = getSectionData("scholarships");
  const facultyData = getSectionData("faculty");
  const hostelData = getSectionData("hostel");
  const qaData = getSectionData("qa");
  const admissionData = getSectionData("admission");
  const coursesFeesData = getSectionData("courses_fees");
  const whyJoinData = getSectionData("why_join");

  // collegeJsonLd already computed above before early returns

  // Q&A items from DB or fallback
  const qaItems = qaData.questions?.length > 0 ? qaData.questions.map((q: any) => ({ q: q.question, a: q.answer })) : [
    { q: `What is the fee structure at ${college.name}?`, a: `The total program fees at ${college.name} is ${college.fees || "available on request"}.` },
    { q: `What exams are accepted?`, a: `${college.name} accepts ${exams.length > 0 ? exams.join(", ") : "CAT, XAT, GMAT"}.` },
    { q: `What is the average placement?`, a: `Average package: ${college.placement_avg || "competitive"}. Highest: ${college.placement_highest || "among the best"}.` },
  ];

  const handleDownloadBrochure = () => {
    if (!user) { setShowLoginDialog(true); return; }
    const content = [`${college.name} - Brochure`, `Location: ${college.city}, ${college.state}`, `Ranking: #${college.ranking}`, `Fees: ${college.fees}`, `Avg Package: ${college.placement_avg}`].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${college.slug}-brochure.txt`; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Brochure downloaded!" });
  };

  const tabItems = [
    { value: "overview", label: "Overview" }, { value: "courses", label: "Courses & Fees" },
    { value: "admission", label: "Admissions" }, { value: "placements", label: "Placements" },
    { value: "cutoff", label: "Cut-off" }, { value: "rankings", label: "Rankings" },
    { value: "reviews", label: "Reviews" }, { value: "gallery", label: "Gallery" },
    { value: "scholarships", label: "Scholarships" }, { value: "faculty", label: "Faculty" },
    { value: "hostel", label: "Hostel & Campus" }, { value: "qa", label: "Q&A" },
    { value: "news", label: "News" },
  ];

  // Placement sectors from DB or fallback
  const placementSectors = placementData.sectors?.length > 0
    ? placementData.sectors.map((s: any) => ({ sector: s.sector, pct: Number(s.percentage) }))
    : [{ sector: "Consulting", pct: 35 }, { sector: "Finance", pct: 28 }, { sector: "IT", pct: 18 }, { sector: "FMCG", pct: 12 }, { sector: "Others", pct: 7 }];

  const placementRecruiters = placementData.recruiters?.length > 0
    ? placementData.recruiters.map((r: any) => r.name)
    : topRecruiters;

  // Rankings from DB or fallback
  const rankingsList = rankingsData.rankings?.length > 0
    ? rankingsData.rankings
    : [
        { body: "NIRF", rank: college.ranking ? `#${college.ranking}` : "N/A", year: "2025" },
        { body: "Business Today", rank: college.ranking ? `#${Math.max(1, (college.ranking || 1) - 2)}` : "N/A", year: "2025" },
      ];

  const rankAccreditations = rankingsData.accreditations?.length > 0
    ? rankingsData.accreditations.map((a: any) => a.name)
    : accreditations;

  // Scholarships from DB or fallback
  const scholarships = scholarshipsData.scholarships?.length > 0
    ? scholarshipsData.scholarships
    : [
        { name: "Merit Scholarship", criteria: "Top 10% CAT percentile", amount: "Up to 50% waiver", description: "For exceptional entrance exam scores." },
        { name: "Need-Based Aid", criteria: "Family income < ₹8 LPA", amount: "₹1-3 Lakh/year", description: "Financial assistance for deserving students." },
      ];

  // Faculty from DB or fallback
  const facultyList = facultyData.faculty?.length > 0
    ? facultyData.faculty
    : [
        { name: "Prof. Rajesh Kumar", department: "Finance", qualification: "PhD IIM Ahmedabad", experience: "20+ years" },
        { name: "Prof. Sunita Verma", department: "Marketing", qualification: "PhD ISB Hyderabad", experience: "15+ years" },
      ];

  // Hostel facilities from DB or fallback
  const hostelFacilities = hostelData.facilities?.length > 0
    ? hostelData.facilities.map((f: any) => f.name)
    : ["Wi-Fi Campus", "Swimming Pool", "Gymnasium", "Sports Complex", "Cafeteria", "Auditorium"];

  // Admission steps from DB or fallback
  const admissionSteps = admissionData.steps?.length > 0
    ? admissionData.steps
    : [
        { title: "Entrance Exam", description: `Score well in ${exams[0] || "CAT"} or other accepted exams` },
        { title: "Shortlisting", description: "Based on exam scores, academic profile, work experience" },
        { title: "GD/WAT/PI", description: "Group Discussion, Written Ability Test, Personal Interview" },
        { title: "Final Selection", description: "Merit list based on composite scores" },
      ];

  const eligibilityCriteria = admissionData.eligibility?.length > 0
    ? admissionData.eligibility.map((e: any) => e.text)
    : ["Bachelor's degree with minimum 50% marks", `Valid ${exams.join(" / ") || "CAT/XAT/GMAT"} score`, "Work experience preferred but not mandatory"];

  // Course fee data from DB or fallback
  const coursesFeesList = coursesFeesData.courses?.length > 0
    ? coursesFeesData.courses
    : courses.map((c: string) => ({ name: c, duration: "2 Years", eligibility: `Graduation + ${exams[0] || "CAT"}`, fees: college.fees || "Contact College" }));

  // Reviews from DB or fallback
  const reviewsList = reviewData.reviews?.length > 0
    ? reviewData.reviews
    : [
        { name: "Rahul S.", year: "Batch 2024", rating: 5, positives: "Excellent faculty, world-class infrastructure.", negatives: "High fees, competitive pressure." },
        { name: "Priya M.", year: "Batch 2023", rating: 4, positives: "Industry exposure through live projects.", negatives: "Hostel facilities could improve." },
      ];

  const whyJoinRatings = whyJoinData.ratings?.length > 0 ? whyJoinData.ratings : ratingAspects;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead {...resolvedSeo} />
      <LoginRequiredDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} message="Sign in to access detailed college information." />

      {/* Hero Banner */}
      <div className="hero-gradient py-10 md:py-14 relative overflow-hidden">
        {college.banner_url && <img src={college.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />}
        <div className="container mx-auto px-4 relative z-10">
          <Link to="/colleges" className="inline-flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground mb-4 text-sm"><ArrowLeft className="w-4 h-4" /> Back to Colleges</Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-start gap-4 mb-4">
              {college.logo_url ? (
                <img src={college.logo_url} alt="" className="w-16 h-16 rounded-xl object-contain bg-white p-1 flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-primary-foreground/20 flex items-center justify-center text-primary-foreground font-bold text-2xl flex-shrink-0">
                  {college.ranking ? `#${college.ranking}` : college.name.charAt(0)}
                </div>
              )}
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
                { label: "Avg Package", value: placementData.avg_package || college.placement_avg || "N/A" },
                { label: "Highest Package", value: placementData.highest_package || college.placement_highest || "N/A" },
              ].map(s => (
                <div key={s.label} className="bg-primary-foreground/10 backdrop-blur-sm rounded-lg px-4 py-2">
                  <div className="text-xs text-primary-foreground/70">{s.label}</div>
                  <div className="font-heading font-bold text-primary-foreground text-sm">{s.value}</div>
                </div>
              ))}
            </div>
            {rankAccreditations.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {rankAccreditations.map((a: string) => <Badge key={a} className="bg-primary-foreground/20 text-primary-foreground border-none text-xs">{a}</Badge>)}
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Sticky Tab Nav */}
      <div className="sticky top-16 z-40 bg-card/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto gap-1 py-2 scrollbar-hide">
            {tabItems.map(t => (
              <button key={t.value} onClick={() => scrollToSection(t.value)} className="whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-medium transition-colors text-muted-foreground hover:text-foreground hover:bg-muted">{t.label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <AIGistSection
          content={college.description || college.name}
          pageType="college"
          pageId={college.id}
          onScrollToContent={() => sectionRefs.current["overview"]?.scrollIntoView({ behavior: "smooth" })}
        />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* Overview */}
            <div ref={el => { sectionRefs.current["overview"] = el; }}>
              <Card>
                <CardHeader><CardTitle className="font-heading">About {college.name}</CardTitle></CardHeader>
                <CardContent>
                  {getSectionContent("why_join") ? (
                    <div className="text-muted-foreground leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: getSectionContent("why_join") }} />
                  ) : (
                    <p className="text-muted-foreground leading-relaxed">{college.description || `${college.name} is a premier ${college.type} institute in ${college.city}.`}</p>
                  )}
                  {highlights && (
                    <div className="mt-6">
                      <h3 className="font-heading font-semibold text-foreground mb-3">Key Highlights</h3>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {(Array.isArray(highlights) ? highlights : Object.entries(highlights).map(([k, v]) => `${k}: ${v}`)).map((h: string, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-foreground"><CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />{h}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Why Join Ratings */}
              <Card className="border-primary/30 mt-6">
                <CardHeader><CardTitle className="font-heading flex items-center gap-2"><Star className="w-5 h-5 text-primary" /> Why Join {college.name}?</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-4xl font-heading font-bold text-primary">{overallRating}</div>
                      <div className="flex items-center gap-0.5 justify-center mt-1">
                        {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < Math.round(Number(overallRating)) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />)}
                      </div>
                    </div>
                    <div className="flex-1 space-y-2">
                      {whyJoinRatings.map((a: any) => (
                        <div key={a.label} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-24 flex-shrink-0">{a.label}</span>
                          <Progress value={Number(a.score) * 20} className="flex-1 h-2" />
                          <span className="text-xs font-semibold text-foreground w-8">{a.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Courses & Fees */}
            <div ref={el => { sectionRefs.current["courses"] = el; }}>
              <Card>
                <CardHeader><CardTitle className="font-heading">Courses & Fee Structure</CardTitle></CardHeader>
                <CardContent>
                  {coursesFeesList.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead><tr className="bg-muted/50">
                          <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Course</th>
                          <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Duration</th>
                          <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Eligibility</th>
                          <th className="text-right py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Fees</th>
                        </tr></thead>
                        <tbody>
                          {coursesFeesList.map((c: any, i: number) => (
                            <tr key={i} className="border-b border-border hover:bg-muted/30">
                              <td className="py-3 px-3 font-medium text-foreground">{c.name}</td>
                              <td className="py-3 px-3 text-muted-foreground">{c.duration}</td>
                              <td className="py-3 px-3 text-muted-foreground">{c.eligibility}</td>
                              <td className="py-3 px-3 text-right font-heading font-bold text-primary">{c.fees}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8"><BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">Course details coming soon.</p></div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Admissions */}
            <div ref={el => { sectionRefs.current["admission"] = el; }}>
              <Card>
                <CardHeader><CardTitle className="font-heading">Admission Process</CardTitle></CardHeader>
                <CardContent>
                  {getSectionContent("admission") ? (
                    <div className="text-muted-foreground leading-relaxed mb-6 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: getSectionContent("admission") }} />
                  ) : (
                    <p className="text-muted-foreground leading-relaxed mb-6">{college.admission_process || `Admission to ${college.name} is based on entrance exams followed by GD/PI.`}</p>
                  )}
                  <div className="space-y-4">
                    <h3 className="font-heading font-semibold text-foreground">Admission Steps</h3>
                    {admissionSteps.map((s: any, i: number) => (
                      <div key={i} className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full hero-gradient flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">{i + 1}</div>
                        <div><h4 className="font-semibold text-foreground">{s.title}</h4><p className="text-sm text-muted-foreground">{s.description}</p></div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-4 rounded-lg bg-secondary/50 border border-border">
                    <h4 className="font-heading font-semibold text-foreground mb-2">Eligibility Criteria</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {eligibilityCriteria.map((c: string, i: number) => (
                        <li key={i} className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-primary" /> {c}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Placements */}
            <div ref={el => { sectionRefs.current["placements"] = el; }}>
              <Card>
                <CardHeader><CardTitle className="font-heading">Placement Statistics</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {[
                      { label: "Average Package", value: placementData.avg_package || college.placement_avg || "N/A", icon: TrendingUp },
                      { label: "Highest Package", value: placementData.highest_package || college.placement_highest || "N/A", icon: Award },
                      { label: "Median Package", value: placementData.median_package || college.placement_median || "N/A", icon: Star },
                      { label: "Placement Rate", value: placementData.placement_rate || "98%", icon: CheckCircle },
                    ].map(s => (
                      <div key={s.label} className="bg-secondary/50 rounded-lg p-4 text-center">
                        <s.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                        <div className="font-heading text-lg font-bold text-primary">{s.value}</div>
                        <div className="text-xs text-muted-foreground">{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <h3 className="font-heading font-semibold text-foreground mb-3">Sector-wise Placements</h3>
                  <div className="space-y-2 mb-6">
                    {placementSectors.map((s: any) => (
                      <div key={s.sector} className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground w-36 flex-shrink-0">{s.sector}</span>
                        <Progress value={s.pct} className="flex-1 h-3" />
                        <span className="text-sm font-semibold text-foreground w-10 text-right">{s.pct}%</span>
                      </div>
                    ))}
                  </div>
                  {placementRecruiters.length > 0 && (
                    <div>
                      <h3 className="font-heading font-semibold text-foreground mb-3">Top Recruiters</h3>
                      <div className="flex flex-wrap gap-2">
                        {placementRecruiters.map((r: string) => <Badge key={r} variant="outline" className="text-xs py-1.5 px-3"><Building className="w-3 h-3 mr-1" /> {r}</Badge>)}
                      </div>
                    </div>
                  )}
                  {getSectionContent("placements") && (
                    <div className="mt-4 prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: getSectionContent("placements") }} />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Cutoff */}
            <div ref={el => { sectionRefs.current["cutoff"] = el; }}>
              <Card>
                <CardHeader><CardTitle className="font-heading">Cutoff Details</CardTitle></CardHeader>
                <CardContent>
                  {cutoffData.cutoffs?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead><tr className="bg-muted/50">
                          <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Category</th>
                          <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Exam</th>
                          <th className="text-left py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Year</th>
                          <th className="text-right py-3 px-3 font-heading font-semibold text-foreground border-b border-border">Percentile</th>
                        </tr></thead>
                        <tbody>
                          {cutoffData.cutoffs.map((c: any, i: number) => (
                            <tr key={i} className="border-b border-border">
                              <td className="py-3 px-3 font-medium text-foreground">{c.category}</td>
                              <td className="py-3 px-3 text-muted-foreground">{c.exam}</td>
                              <td className="py-3 px-3 text-muted-foreground">{c.year}</td>
                              <td className="py-3 px-3 text-right font-heading font-bold text-primary">{c.percentile}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : cutoffInfo ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead><tr className="bg-muted/50">
                          <th className="text-left py-3 px-3 font-heading font-semibold border-b border-border">Category</th>
                          <th className="text-right py-3 px-3 font-heading font-semibold border-b border-border">Cutoff</th>
                        </tr></thead>
                        <tbody>
                          {Object.entries(cutoffInfo).map(([cat, val]) => (
                            <tr key={cat} className="border-b border-border">
                              <td className="py-3 px-3 font-medium capitalize">{cat}</td>
                              <td className="py-3 px-3 text-right font-bold text-primary">{String(val)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">Cutoff data coming soon.</p>
                  )}
                  {getSectionContent("cutoff") && (
                    <div className="mt-4 prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: getSectionContent("cutoff") }} />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Rankings */}
            <div ref={el => { sectionRefs.current["rankings"] = el; }}>
              <Card>
                <CardHeader><CardTitle className="font-heading flex items-center gap-2"><Medal className="w-5 h-5 text-primary" /> Rankings & Accreditations</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    {rankingsList.map((r: any, i: number) => (
                      <div key={i} className="bg-secondary/50 rounded-lg p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg hero-gradient flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">{r.rank}</div>
                        <div><div className="font-semibold text-foreground">{r.body}</div><div className="text-xs text-muted-foreground">{r.year} Ranking</div></div>
                      </div>
                    ))}
                  </div>
                  {rankAccreditations.length > 0 && (
                    <div>
                      <h3 className="font-heading font-semibold text-foreground mb-3">Accreditations</h3>
                      <div className="flex flex-wrap gap-3">
                        {rankAccreditations.map((a: string) => (
                          <div key={a} className="flex items-center gap-2 bg-primary/10 rounded-lg px-4 py-2"><Award className="w-4 h-4 text-primary" /><span className="text-sm font-medium text-foreground">{a}</span></div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Reviews */}
            <div ref={el => { sectionRefs.current["reviews"] = el; }}>
              <Card>
                <CardHeader><CardTitle className="font-heading flex items-center gap-2"><MessageSquare className="w-5 h-5 text-primary" /> Student Reviews</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 mb-6 p-4 bg-secondary/30 rounded-lg">
                    <div className="text-center">
                      <div className="text-4xl font-heading font-bold text-primary">{overallRating}</div>
                      <div className="flex items-center gap-0.5 justify-center mt-1">
                        {[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(Number(overallRating)) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />)}
                      </div>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {ratingAspects.slice(0, 5).map((a: any) => (
                        <div key={a.label} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-24">{a.label}</span>
                          <Progress value={Number(a.score) * 20} className="flex-1 h-2" />
                          <span className="text-xs font-semibold w-6">{a.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {reviewsList.map((review: any, i: number) => (
                    <div key={i} className="border border-border rounded-xl p-5 mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <div><span className="font-semibold text-foreground">{review.name}</span><span className="text-xs text-muted-foreground ml-2">{review.year}</span></div>
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, j) => <Star key={j} className={`w-3.5 h-3.5 ${j < Number(review.rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />)}
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
            </div>

            {/* Gallery */}
            <div ref={el => { sectionRefs.current["gallery"] = el; }}>
              <Card>
                <CardHeader><CardTitle className="font-heading flex items-center gap-2"><Image className="w-5 h-5 text-primary" /> Campus Gallery</CardTitle></CardHeader>
                <CardContent>
                  <div className="relative rounded-xl overflow-hidden aspect-video mb-4">
                    <AnimatePresence mode="wait">
                      <motion.img key={galleryIdx} src={galleryImages[galleryIdx]} alt={`Campus ${galleryIdx + 1}`} className="w-full h-full object-cover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }} />
                    </AnimatePresence>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {galleryImages.map((_: any, i: number) => <button key={i} onClick={() => setGalleryIdx(i)} className={`w-2.5 h-2.5 rounded-full transition-all ${i === galleryIdx ? "bg-primary-foreground scale-125" : "bg-primary-foreground/50"}`} />)}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {galleryImages.map((img: string, i: number) => (
                      <button key={i} onClick={() => setGalleryIdx(i)} className={`rounded-lg overflow-hidden aspect-square border-2 transition-all ${i === galleryIdx ? "border-primary" : "border-transparent hover:border-primary/50"}`}>
                        <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Scholarships */}
            <div ref={el => { sectionRefs.current["scholarships"] = el; }}>
              <Card>
                <CardHeader><CardTitle className="font-heading flex items-center gap-2"><Banknote className="w-5 h-5 text-primary" /> Scholarships</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {scholarships.map((s: any, i: number) => (
                      <div key={i} className="border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-heading font-semibold text-foreground">{s.name}</h4>
                          <Badge className="bg-primary/10 text-primary border-none text-xs">{s.amount}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{s.description}</p>
                        <p className="text-xs text-primary font-medium">Criteria: {s.criteria}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Faculty */}
            <div ref={el => { sectionRefs.current["faculty"] = el; }}>
              <Card>
                <CardHeader><CardTitle className="font-heading">Faculty Profiles</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {facultyList.map((f: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border">
                        {f.photo_url ? (
                          <img src={f.photo_url} alt={f.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-full hero-gradient flex items-center justify-center text-primary-foreground font-bold text-sm flex-shrink-0">
                            {f.name.split(" ").slice(-1).map((n: string) => n[0]).join("")}
                          </div>
                        )}
                        <div>
                          <h4 className="font-semibold text-foreground text-sm">{f.name}</h4>
                          <p className="text-xs text-primary font-medium">{f.department}</p>
                          <p className="text-xs text-muted-foreground">{f.qualification} • {f.experience}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Hostel & Campus */}
            <div ref={el => { sectionRefs.current["hostel"] = el; }}>
              <Card>
                <CardHeader><CardTitle className="font-heading flex items-center gap-2"><Home className="w-5 h-5 text-primary" /> Hostel & Campus Life</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-4 mb-6">
                    {[
                      { label: "Campus Size", value: hostelData.campus_size || college.campus_size || "N/A", icon: Building },
                      { label: "Total Students", value: hostelData.total_students || (college.total_students ? `${college.total_students}+` : "N/A"), icon: Users },
                      { label: "Hostel Rooms", value: hostelData.hostel_rooms || "Single & Double", icon: Home },
                      { label: "Library", value: hostelData.library || "24/7 Access", icon: BookOpen },
                    ].map((item, i) => (
                      <div key={i} className="bg-secondary/50 rounded-lg p-4 flex items-center gap-3">
                        <item.icon className="w-6 h-6 text-primary flex-shrink-0" />
                        <div><div className="text-xs text-muted-foreground">{item.label}</div><div className="font-semibold text-foreground text-sm">{item.value}</div></div>
                      </div>
                    ))}
                  </div>
                  <h4 className="font-heading font-semibold text-foreground mb-3">Campus Facilities</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {hostelFacilities.map((f: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-foreground"><CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />{f}</div>
                    ))}
                  </div>
                  {getSectionContent("hostel") && (
                    <div className="mt-4 prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: getSectionContent("hostel") }} />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Q&A */}
            <div ref={el => { sectionRefs.current["qa"] = el; }}>
              <Card>
                <CardHeader><CardTitle className="font-heading flex items-center gap-2"><HelpCircle className="w-5 h-5 text-primary" /> Frequently Asked Questions</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {qaItems.map((item: any, i: number) => (
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
            </div>

            {/* News */}
            <div ref={el => { sectionRefs.current["news"] = el; }}>
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
            </div>
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
                      <div><div className="text-xs text-muted-foreground">{item.label}</div><div className="font-semibold text-foreground text-sm">{item.value}</div></div>
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
                <Button className="w-full mt-4" onClick={handleDownloadBrochure}><Download className="w-4 h-4 mr-1" /> Download Brochure</Button>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h4 className="font-heading font-semibold text-foreground mb-3">Compare Colleges</h4>
                <Link to="/compare"><Button variant="outline" className="w-full">Compare with Other Colleges</Button></Link>
              </CardContent>
            </Card>

            {suggestedColleges.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h4 className="font-heading font-semibold text-foreground mb-3">Suggested Colleges</h4>
                  <div className="space-y-2">
                    {suggestedColleges.slice(0, 5).map((sc) => (
                      <Link key={sc.slug} to={`/college/${sc.slug}`} className="block p-3 rounded-lg hover:bg-muted/50 border border-border transition-colors">
                        <div className="font-semibold text-foreground text-sm">{sc.name}</div>
                        <div className="text-xs text-muted-foreground">{sc.city} · Rank #{sc.ranking} · {sc.fees}</div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      {college?.id && <PageKeywords contentType="college" recordId={college.id} fallbackKeywords={(college as any).keywords || []} />}
    </div>
  );
};

export default CollegeDetailPage;
