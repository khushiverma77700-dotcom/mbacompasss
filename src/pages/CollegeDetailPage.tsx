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
import LastUpdatedBadge from "@/components/LastUpdatedBadge";
import CitationLink from "@/components/CitationLink";
import { enhanceAIContent } from "@/lib/aiContentEnhancer";
import { fallbackText } from "@/lib/contentFallback";
import MobileActionBar from "@/components/mobile/MobileActionBar";
import FloatingTOC from "@/components/mobile/FloatingTOC";
import ProgrammePortfolioTable from "@/components/college/ProgrammePortfolioTable";
import { useProgrammeCourses } from "@/hooks/useProgrammeCourses";
import { Share2, Phone } from "lucide-react";

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
      document.title = `${college.name} — Fees, Placements, Admission, Ranking | MBA Compass`;
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
          title: `${college.name} — Fees, Placements, Admission, Ranking | MBA Compass`,
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

  // ── Helpers to clean already-saved AI data that may contain raw HTML/citations ──
  const stripText = (v: any): string => {
    if (v == null) return "";
    return String(v)
      .replace(/\[src:[^\]]*\]/gi, "")
      .replace(/<p>\s*<em>\s*Last updated:[^<]*<\/em>\s*<\/p>/gi, "")
      .replace(/Last updated:\s*\d{4}-\d{2}-\d{2}/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
      .replace(/\s+/g, " ").trim();
  };
  const toPctNum = (v: any): number => {
    const m = stripText(v).match(/(\d+(?:\.\d+)?)/);
    return m ? Number(m[1]) : 0;
  };

  // Placement sectors from DB or fallback
  const placementSectors = placementData.sectors?.length > 0
    ? placementData.sectors.map((s: any) => ({ sector: stripText(s.sector), pct: toPctNum(s.percentage) }))
    : [{ sector: "Consulting", pct: 35 }, { sector: "Finance", pct: 28 }, { sector: "IT", pct: 18 }, { sector: "FMCG", pct: 12 }, { sector: "Others", pct: 7 }];

  const placementRecruiters = placementData.recruiters?.length > 0
    ? placementData.recruiters.map((r: any) => stripText(r.name)).filter(Boolean)
    : topRecruiters;

  // Rankings from DB or fallback
  const rankingsList = rankingsData.rankings?.length > 0
    ? rankingsData.rankings.map((r: any) => ({ body: stripText(r.body), rank: stripText(r.rank), year: stripText(r.year) }))
    : [
        { body: "NIRF", rank: college.ranking ? `#${college.ranking}` : "N/A", year: "2025" },
        { body: "Business Today", rank: college.ranking ? `#${Math.max(1, (college.ranking || 1) - 2)}` : "N/A", year: "2025" },
      ];

  const rankAccreditations = rankingsData.accreditations?.length > 0
    ? rankingsData.accreditations.map((a: any) => stripText(a.name)).filter(Boolean)
    : accreditations;

  // Scholarships from DB or fallback
  const scholarships = scholarshipsData.scholarships?.length > 0
    ? scholarshipsData.scholarships.map((s: any) => ({
        name: stripText(s.name),
        criteria: stripText(s.criteria),
        amount: stripText(s.amount),
        description: stripText(s.description),
      }))
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

      {/* ===== Premium Hero Banner ===== */}
      <div className="relative overflow-hidden" style={{ background: 'hsl(207 90% 54%)' }}>
        {/* Layered background */}
        <div className="absolute inset-0 pointer-events-none">
          {college.banner_url && (
            <img src={college.banner_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40 scale-105" />
          )}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-primary/70 to-primary/90" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(0_0%_100%/0.18),transparent_55%)]" />
          <div className="absolute -top-20 -left-20 w-[480px] h-[480px] bg-white/8 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 right-0 w-[420px] h-[420px] bg-white/5 rounded-full blur-3xl" />
          {/* Subtle dot grid */}
          <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'radial-gradient(hsl(0 0% 100%) 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        </div>

        <div className="container mx-auto px-4 relative z-10 pt-6 pb-12 md:pt-8 md:pb-16">
          {/* Breadcrumb / Back row */}
          <div className="flex items-center justify-between mb-6">
            <Link to="/colleges" className="inline-flex items-center gap-1.5 text-primary-foreground/85 hover:text-primary-foreground text-sm font-medium transition-colors group">
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" /> Back to Colleges
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ title: "Link copied!" }); }}
                className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-primary-foreground bg-white/10 hover:bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/15 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
              <Badge className="bg-amber-400/95 text-amber-950 border-none font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 shadow-md">
                ✦ Verified Profile
              </Badge>
            </div>
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Identity Row */}
            <div className="flex flex-col md:flex-row items-start md:items-center gap-5 mb-7">
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-1.5 bg-gradient-to-br from-amber-300 via-white/60 to-amber-200 rounded-3xl blur-md opacity-70" />
                {college.logo_url ? (
                  <img src={college.logo_url} alt={college.name} className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl object-contain bg-white p-2 shadow-2xl ring-2 ring-white/50" />
                ) : (
                  <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white shadow-2xl ring-2 ring-white/50 flex items-center justify-center text-primary font-extrabold text-3xl">
                    {college.ranking ? `#${college.ranking}` : college.name.charAt(0)}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {college.ranking && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-950 bg-gradient-to-r from-amber-300 to-amber-400 px-2.5 py-1 rounded-md uppercase tracking-wider shadow-md">
                      <Award className="w-3 h-3" /> NIRF Rank #{college.ranking}
                    </span>
                  )}
                  {college.tier && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary-foreground bg-white/15 backdrop-blur-sm border border-white/25 px-2.5 py-1 rounded-md uppercase tracking-wider">
                      {college.tier}
                    </span>
                  )}
                  {college.type && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary-foreground bg-white/15 backdrop-blur-sm border border-white/25 px-2.5 py-1 rounded-md uppercase tracking-wider">
                      <Building className="w-3 h-3" /> {college.type}
                    </span>
                  )}
                </div>
                <h1 className="font-heading text-3xl md:text-5xl font-extrabold text-primary-foreground leading-tight tracking-tight mb-2 [text-shadow:_0_2px_8px_rgb(0_0_0_/_0.2)]">
                  {college.name}
                </h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-primary-foreground/90 text-sm">
                  <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {college.city}{college.state ? `, ${college.state}` : ""}</span>
                  {college.established && <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Est. {college.established}</span>}
                  <span className="inline-flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
                    <span className="font-bold text-primary-foreground">{overallRating}</span>
                    <span className="text-primary-foreground/70">/5 rating</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Premium Stats Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {[
                { label: "NIRF Ranking", value: college.ranking ? `#${college.ranking}` : fallbackText(null, { kind: "ranking", tier: college.tier }), source: "NIRF", icon: Award, year: new Date().getFullYear().toString() },
                { label: "Total Fees", value: fallbackText(college.fees, { kind: "fees_text", tier: college.tier }), source: "Brochure", icon: Banknote, year: new Date().getFullYear().toString() },
                { label: "Avg Package", value: fallbackText(placementData.avg_package || college.placement_avg, { kind: "placement_avg", tier: college.tier }), source: "Placement Report", icon: TrendingUp, year: `${new Date().getFullYear() - 1}-${String(new Date().getFullYear()).slice(-2)}` },
                { label: "Highest Package", value: fallbackText(placementData.highest_package || college.placement_highest, { kind: "placement_highest", tier: college.tier }), source: "Placement Report", icon: Medal, year: `${new Date().getFullYear() - 1}-${String(new Date().getFullYear()).slice(-2)}` },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="group relative bg-white/10 backdrop-blur-md rounded-xl px-4 py-3 border border-white/15 hover:bg-white/15 hover:border-white/25 transition-all">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Icon className="w-3.5 h-3.5 text-primary-foreground/70" />
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-foreground/70">{s.label}</span>
                      <CitationLink source={s.source} year={s.year} className="!bg-white/10 !border-white/20 !text-primary-foreground/80 ml-auto" />
                    </div>
                    <div className="font-heading font-extrabold text-primary-foreground text-base md:text-lg leading-tight">{s.value}</div>
                  </div>
                );
              })}
            </div>

            {/* Premium Action Row */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <Button
                onClick={handleDownloadBrochure}
                size="lg"
                className="bg-white text-primary hover:bg-white/95 font-bold shadow-2xl hover:shadow-white/20 hover:scale-[1.02] transition-all gap-2 px-6"
              >
                <Download className="w-4 h-4" /> Download Brochure
              </Button>
              <Button
                onClick={() => sectionRefs.current["admission"]?.scrollIntoView({ behavior: "smooth" })}
                size="lg"
                variant="outline"
                className="bg-white/10 backdrop-blur-md border-white/30 text-primary-foreground hover:bg-white/20 hover:border-white/50 hover:text-primary-foreground font-bold gap-2"
              >
                <GraduationCap className="w-4 h-4" /> Apply Now
              </Button>
              <Link to="/compare">
                <Button
                  size="lg"
                  variant="outline"
                  className="bg-white/10 backdrop-blur-md border-white/30 text-primary-foreground hover:bg-white/20 hover:border-white/50 hover:text-primary-foreground font-bold gap-2"
                >
                  <TrendingUp className="w-4 h-4" /> Compare
                </Button>
              </Link>
              {college.website && (
                <a href={college.website} target="_blank" rel="noopener noreferrer">
                  <Button
                    size="lg"
                    variant="ghost"
                    className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground font-semibold gap-2"
                  >
                    <Globe className="w-4 h-4" /> Visit Website
                  </Button>
                </a>
              )}
            </div>

            {/* Footer row: Accreditations + Last Updated */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {rankAccreditations.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {rankAccreditations.slice(0, 6).map((a: string) => (
                    <span key={a} className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-400/95 text-emerald-950 shadow-sm">
                      ✓ {a}
                    </span>
                  ))}
                </div>
              )}
              <LastUpdatedBadge
                date={(college as any).last_seo_refresh || (college as any).updated_at}
                className="!bg-white/10 !border-white/20 !text-primary-foreground/85 ml-auto"
              />
            </div>
          </motion.div>
        </div>

        {/* Subtle bottom curve */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-b from-transparent to-background/60" />
      </div>

      {/* Sticky Tab Nav — Premium pill style */}
      <div className="sticky top-16 z-40 bg-card/95 backdrop-blur-xl border-b border-border shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex overflow-x-auto gap-1.5 py-2.5 scrollbar-hide">
            {tabItems.map(t => (
              <button
                key={t.value}
                onClick={() => scrollToSection(t.value)}
                className="group relative whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all text-muted-foreground hover:text-primary hover:bg-primary/8 border border-transparent hover:border-primary/15"
              >
                {t.label}
              </button>
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
            <div id="overview" ref={el => { sectionRefs.current["overview"] = el; }} className="scroll-mt-32">
              <Card className="overflow-hidden border-border/60 shadow-md">
                <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-transparent" />
                <CardHeader>
                  <CardTitle className="font-heading flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    About {college.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {getSectionContent("why_join") ? (
                    <div className="text-muted-foreground leading-relaxed ai-content max-w-none" dangerouslySetInnerHTML={{ __html: enhanceAIContent(getSectionContent("why_join")) }} />
                  ) : (
                    <div className="text-muted-foreground leading-relaxed ai-content max-w-none" dangerouslySetInnerHTML={{ __html: enhanceAIContent(college.description || `${college.name} is a premier ${college.type} institute in ${college.city}.`) }} />
                  )}
                  {highlights && (
                    <div className="mt-6 pt-6 border-t border-dashed border-border">
                      <h3 className="font-heading font-bold text-foreground mb-4 flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" /> Key Highlights
                      </h3>
                      <div className="grid sm:grid-cols-2 gap-2.5">
                        {(Array.isArray(highlights) ? highlights : Object.entries(highlights).map(([k, v]) => `${k}: ${v}`)).map((h: string, i: number) => (
                          <div key={i} className="flex items-start gap-2.5 text-sm text-foreground p-2.5 rounded-lg bg-gradient-to-br from-primary/5 to-transparent border border-border/40">
                            <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Why Join Ratings */}
              <Card className="overflow-hidden border-amber-200/50 dark:border-amber-900/30 shadow-md mt-6 bg-gradient-to-br from-amber-50/30 to-transparent dark:from-amber-950/10">
                <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-transparent" />
                <CardHeader>
                  <CardTitle className="font-heading flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/30 to-amber-500/10 flex items-center justify-center">
                      <Star className="w-5 h-5 text-amber-600 fill-amber-500" />
                    </div>
                    Why Join {college.name}?
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6 mb-6">
                    <div className="text-center flex-shrink-0 p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-200/40 dark:border-amber-900/30 min-w-[100px]">
                      <div className="text-4xl font-heading font-extrabold bg-gradient-to-br from-amber-600 to-amber-500 bg-clip-text text-transparent">{overallRating}</div>
                      <div className="flex items-center gap-0.5 justify-center mt-1">
                        {[...Array(5)].map((_, i) => <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(Number(overallRating)) ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40"}`} />)}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">Overall</div>
                    </div>
                    <div className="flex-1 space-y-2.5">
                      {whyJoinRatings.map((a: any) => (
                        <div key={a.label} className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-foreground w-28 flex-shrink-0">{a.label}</span>
                          <Progress value={Number(a.score) * 20} className="flex-1 h-2" />
                          <span className="text-xs font-extrabold text-foreground w-10 text-right">{a.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Courses & Fees */}
            <div id="courses" ref={el => { sectionRefs.current["courses"] = el; }} className="scroll-mt-32">
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
            <div id="admission" ref={el => { sectionRefs.current["admission"] = el; }} className="scroll-mt-32">
              <Card>
                <CardHeader><CardTitle className="font-heading">Admission Process</CardTitle></CardHeader>
                <CardContent>
                  {getSectionContent("admission") ? (
                    <div className="text-muted-foreground leading-relaxed mb-6 ai-content max-w-none" dangerouslySetInnerHTML={{ __html: getSectionContent("admission") }} />
                  ) : (
                    <div className="text-muted-foreground leading-relaxed mb-6 ai-content max-w-none" dangerouslySetInnerHTML={{ __html: college.admission_process || `Admission to ${college.name} is based on entrance exams followed by GD/PI.` }} />
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
            <div id="placements" ref={el => { sectionRefs.current["placements"] = el; }} className="scroll-mt-32">
              <Card className="overflow-hidden border-border/60 shadow-md">
                <div className="h-1 bg-gradient-to-r from-emerald-500 via-emerald-400 to-transparent" />
                <CardHeader>
                  <CardTitle className="font-heading flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                    </div>
                    Placement Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    {[
                      { label: "Average Package", value: placementData.avg_package || college.placement_avg || "N/A", icon: TrendingUp, color: "from-blue-500/15 to-blue-500/5", iconColor: "text-blue-600" },
                      { label: "Highest Package", value: placementData.highest_package || college.placement_highest || "N/A", icon: Award, color: "from-amber-500/15 to-amber-500/5", iconColor: "text-amber-600" },
                      { label: "Median Package", value: placementData.median_package || college.placement_median || "N/A", icon: Star, color: "from-purple-500/15 to-purple-500/5", iconColor: "text-purple-600" },
                      { label: "Placement Rate", value: placementData.placement_rate || "98%", icon: CheckCircle, color: "from-emerald-500/15 to-emerald-500/5", iconColor: "text-emerald-600" },
                    ].map(s => (
                      <div key={s.label} className={`relative bg-gradient-to-br ${s.color} rounded-xl p-4 text-center border border-border/40 hover:shadow-md hover:-translate-y-0.5 transition-all`}>
                        <s.icon className={`w-5 h-5 ${s.iconColor} mx-auto mb-2`} />
                        <div className="font-heading text-lg font-extrabold text-foreground leading-tight">{s.value}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mt-1">{s.label}</div>
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
                    <div className="mt-4 ai-content max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: getSectionContent("placements") }} />
                  )}
                </CardContent>
              </Card>
            </div>

            <InlineAIToolCTA variant="college-shortlister" />

            {/* Cutoff */}
            <div id="cutoff" ref={el => { sectionRefs.current["cutoff"] = el; }} className="scroll-mt-32">
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
                    <div className="mt-4 ai-content max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: getSectionContent("cutoff") }} />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Rankings */}
            <div id="rankings" ref={el => { sectionRefs.current["rankings"] = el; }} className="scroll-mt-32">
              <Card className="overflow-hidden border-border/60 shadow-md">
                <div className="h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-transparent" />
                <CardHeader>
                  <CardTitle className="font-heading flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/30 to-amber-500/10 flex items-center justify-center">
                      <Medal className="w-5 h-5 text-amber-600" />
                    </div>
                    Rankings & Accreditations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 gap-3 mb-6">
                    {rankingsList.map((r: any, i: number) => (
                      <div key={i} className="relative bg-gradient-to-br from-amber-50/40 to-transparent dark:from-amber-950/10 rounded-xl p-4 flex items-center gap-4 border border-amber-200/40 dark:border-amber-900/30 hover:shadow-md hover:-translate-y-0.5 transition-all">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-extrabold text-base flex-shrink-0 shadow-lg shadow-amber-500/30">
                          {r.rank}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-foreground text-sm">{r.body}</div>
                          <div className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">{r.year} Ranking</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {rankAccreditations.length > 0 && (
                    <div className="pt-4 border-t border-dashed border-border">
                      <h3 className="font-heading font-bold text-foreground mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600" /> Accreditations
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {rankAccreditations.map((a: string) => (
                          <div key={a} className="flex items-center gap-1.5 bg-gradient-to-r from-emerald-500/15 to-emerald-500/5 border border-emerald-200/50 dark:border-emerald-900/30 rounded-lg px-3 py-1.5">
                            <Award className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-xs font-bold text-foreground">{a}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Reviews */}
            <div id="reviews" ref={el => { sectionRefs.current["reviews"] = el; }} className="scroll-mt-32">
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
            <div id="gallery" ref={el => { sectionRefs.current["gallery"] = el; }} className="scroll-mt-32">
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
            <div id="scholarships" ref={el => { sectionRefs.current["scholarships"] = el; }} className="scroll-mt-32">
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
            <div id="faculty" ref={el => { sectionRefs.current["faculty"] = el; }} className="scroll-mt-32">
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
            <div id="hostel" ref={el => { sectionRefs.current["hostel"] = el; }} className="scroll-mt-32">
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
                    <div className="mt-4 ai-content max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: getSectionContent("hostel") }} />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Q&A */}
            <div id="qa" ref={el => { sectionRefs.current["qa"] = el; }} className="scroll-mt-32">
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
            <div id="news" ref={el => { sectionRefs.current["news"] = el; }} className="scroll-mt-32">
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

          {/* ===== Premium Sidebar ===== */}
          <div className="space-y-4 lg:sticky lg:top-32 lg:self-start">
            {/* Quick Info Card */}
            <Card className="overflow-hidden border-border/60 shadow-lg shadow-primary/5">
              <div className="h-1.5 bg-gradient-to-r from-primary via-primary/80 to-primary/40" />
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-heading font-bold text-foreground">Quick Info</h3>
                </div>
                <div className="space-y-2.5">
                  {[
                    { icon: MapPin, label: "Location", value: `${college.city}, ${college.state}` },
                    { icon: Award, label: "Ranking", value: college.ranking ? `#${college.ranking} (NIRF)` : "N/A" },
                    { icon: BookOpen, label: "Type", value: college.type || "N/A" },
                    { icon: Users, label: "Students", value: college.total_students ? `${college.total_students}+` : "N/A" },
                    { icon: Building, label: "Campus", value: college.campus_size || "N/A" },
                    { icon: Calendar, label: "Established", value: college.established ? String(college.established) : "N/A" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center flex-shrink-0">
                        <item.icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{item.label}</div>
                        <div className="font-bold text-foreground text-sm truncate">{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {college.website && (
                  <a href={college.website} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full mt-4 gap-1.5 font-semibold border-primary/30 hover:bg-primary/5 hover:border-primary/50">
                      <Globe className="w-4 h-4" /> Visit Official Site
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Premium Fees + Brochure Card */}
            <Card className="overflow-hidden border-0 shadow-2xl shadow-primary/15 bg-gradient-to-br from-primary via-primary/95 to-primary/85 text-primary-foreground relative">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
              <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(hsl(0 0% 100%) 1px, transparent 1px)', backgroundSize: '18px 18px' }} />
              <CardContent className="pt-6 relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider bg-amber-400 text-amber-950 px-2 py-0.5 rounded-md shadow-md">
                    ★ Featured
                  </span>
                  <span className="text-[10px] uppercase tracking-wider text-primary-foreground/70 font-semibold">Total Program Fees</span>
                </div>
                <p className="font-heading text-4xl font-extrabold leading-none mb-1 [text-shadow:_0_2px_8px_rgb(0_0_0_/_0.15)]">
                  {college.fees_lakhs ? `₹${college.fees_lakhs}L` : (college.fees || "Contact College")}
                </p>
                <p className="text-xs text-primary-foreground/75 mb-5">For complete 2-year program · GST inclusive</p>

                <Button onClick={handleDownloadBrochure} size="lg" className="w-full bg-white text-primary hover:bg-white/95 font-bold gap-2 shadow-xl mb-2">
                  <Download className="w-4 h-4" /> Download Brochure
                </Button>
                <Button onClick={() => sectionRefs.current["admission"]?.scrollIntoView({ behavior: "smooth" })} variant="outline" className="w-full bg-white/10 backdrop-blur-sm border-white/30 text-primary-foreground hover:bg-white/20 hover:text-primary-foreground hover:border-white/50 font-semibold gap-2">
                  <GraduationCap className="w-4 h-4" /> Apply Now
                </Button>

                {/* Trust strip */}
                <div className="mt-5 pt-4 border-t border-white/20 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-base font-extrabold">100%</div>
                    <div className="text-[9px] text-primary-foreground/70 uppercase tracking-wider">Verified</div>
                  </div>
                  <div className="border-x border-white/20">
                    <div className="text-base font-extrabold">Free</div>
                    <div className="text-[9px] text-primary-foreground/70 uppercase tracking-wider">Brochure</div>
                  </div>
                  <div>
                    <div className="text-base font-extrabold">24h</div>
                    <div className="text-[9px] text-primary-foreground/70 uppercase tracking-wider">Response</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Compare Card */}
            <Card className="overflow-hidden border-border/60 hover:border-primary/30 transition-colors group">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-foreground text-sm">Compare Colleges</h4>
                    <p className="text-xs text-muted-foreground">Side-by-side analysis of fees, placements & more.</p>
                  </div>
                </div>
                <Link to="/compare">
                  <Button variant="outline" className="w-full font-semibold border-primary/30 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all">
                    Open Compare Tool
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Suggested Colleges */}
            {suggestedColleges.length > 0 && (
              <Card className="overflow-hidden border-border/60">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Star className="w-4 h-4 text-amber-500" />
                    </div>
                    <h4 className="font-heading font-bold text-foreground">You May Also Like</h4>
                  </div>
                  <div className="space-y-2">
                    {suggestedColleges.slice(0, 5).map((sc) => (
                      <Link key={sc.slug} to={`/college/${sc.slug}`} className="block p-3 rounded-xl hover:bg-primary/5 border border-border hover:border-primary/30 transition-all group/sc">
                        <div className="flex items-start gap-2">
                          {sc.ranking && (
                            <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex-shrink-0">#{sc.ranking}</span>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-foreground text-sm group-hover/sc:text-primary transition-colors line-clamp-1">{sc.name}</div>
                            <div className="text-[11px] text-muted-foreground line-clamp-1">{sc.city} · {sc.fees}</div>
                          </div>
                          <ChevronUp className="w-3.5 h-3.5 text-muted-foreground rotate-90 group-hover/sc:text-primary group-hover/sc:translate-x-0.5 transition-all flex-shrink-0" />
                        </div>
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

      {/* Mobile-first: Floating TOC + Sticky action bar */}
      <FloatingTOC
        items={tabItems.map(t => ({ id: t.value, label: t.label }))}
        onSelect={scrollToSection}
        bottomOffset={88}
      />
      <MobileActionBar
        actions={[
          { icon: <Phone />, label: "Enquire", primary: true, onClick: () => sectionRefs.current["overview"]?.scrollIntoView({ behavior: "smooth" }) },
          { icon: <Download />, label: "Brochure", onClick: handleDownloadBrochure },
          { icon: <Share2 />, label: "Share", onClick: () => { if (navigator.share) navigator.share({ title: college.name, url: window.location.href }); else { navigator.clipboard.writeText(window.location.href); toast({ title: "Link copied!" }); } } },
        ]}
      />
      <div className="md:hidden h-20" aria-hidden />
    </div>
  );
};

export default CollegeDetailPage;
