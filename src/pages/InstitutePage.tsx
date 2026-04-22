import { useParams, Link, useNavigate } from "react-router-dom";
import PageKeywords from "@/components/PageKeywords";
import { useState, useEffect, useRef } from "react";
import SEOHead, { generateInstituteSchema } from "@/components/SEOHead";
import { Star, MapPin, Clock, Users, Award, BookOpen, ArrowLeft, Download, Tag, TrendingUp, GraduationCap, CheckCircle, ChevronDown, ChevronUp, Heart, Lock, Play, Quote, Columns2, Calendar, Video, Zap, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useInstituteBySlug } from "@/hooks/useInstitutes";
import { useResolvedSeo } from "@/hooks/useResolvedSeo";
import { useAuth } from "@/contexts/AuthContext";
import LoginRequiredDialog from "@/components/LoginRequiredDialog";
import AIGistSection from "@/components/AIGistSection";
import InlineAIToolCTA from "@/components/InlineAIToolCTA";
import LastUpdatedBadge from "@/components/LastUpdatedBadge";
import CitationLink from "@/components/CitationLink";
import { fallbackText } from "@/lib/contentFallback";
import MobileActionBar from "@/components/mobile/MobileActionBar";
import FloatingTOC from "@/components/mobile/FloatingTOC";
import { Share2 } from "lucide-react";

const testimonials = [
  { name: "Ankit Verma", text: "IMS coaching transformed my CAT prep. Scored 99.2 percentile. The faculty's approach to Quant was game-changing.", rating: 5, batch: "CAT 2024", type: "text" },
  { name: "Sneha Gupta", text: "The mock test series was incredibly close to the actual exam. Got 98.5 percentile and calls from all top IIMs!", rating: 5, batch: "CAT 2024", type: "text" },
  { name: "Rohit Sharma", text: "Switched from another coaching mid-way. Best decision ever. The personalized mentoring helped me crack XAT with 99.1.", rating: 4, batch: "XAT 2024", type: "text" },
  { name: "Priya Singh", text: "The GMAT prep course was excellent. Scored 740+ on first attempt. Faculty support was outstanding.", rating: 5, batch: "GMAT 2024", type: "text" },
  { name: "Vikram Das", text: "GD/PI preparation here is unmatched. Converted IIM-A after their intense interview prep sessions.", rating: 5, batch: "CAT 2023", type: "text" },
];

const InstitutePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: institute, isLoading } = useInstituteBySlug(slug);
  const { user } = useAuth();
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [selectedCourseCategory, setSelectedCourseCategory] = useState<string | null>(null);
  const [expandedFaculty, setExpandedFaculty] = useState<string | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [discountClaimed, setDiscountClaimed] = useState(false);
  const [showOfferLogin, setShowOfferLogin] = useState(false);
  const [enquiryForm, setEnquiryForm] = useState({ name: "", phone: "", email: "", course: "", message: "" });
  const [enquiryLoading, setEnquiryLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const { toast } = useToast();
  const testimonialRef = useRef<ReturnType<typeof setInterval>>();

  // Auto-scroll testimonials
  useEffect(() => {
    testimonialRef.current = setInterval(() => setTestimonialIdx(p => (p + 1) % testimonials.length), 4000);
    return () => clearInterval(testimonialRef.current);
  }, []);

  // Must call hooks before any early returns
  const seoSchema = institute ? generateInstituteSchema(institute) : undefined;
  const { seo: resolvedSeo } = useResolvedSeo(
    institute ? "institute" : undefined,
    institute?.id,
    institute
      ? {
          title: `${institute.name} — Best MBA Coaching in ${institute.city} | MBAHub`,
          description:
            institute.meta_description ||
            `${institute.name} offers top MBA coaching in ${institute.city}. ${institute.success_rate}% success rate, ${(institute.courses || []).length} courses.`,
          keywords: (institute.keywords as string[]) || [],
          canonical: `${window.location.origin}/institute/${institute.slug}`,
          jsonLd: seoSchema,
          ogImage: institute.banner_url || institute.logo_url || undefined,
        }
      : {},
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="hero-gradient py-10 md:py-14"><div className="container mx-auto px-4"><Skeleton className="h-10 w-64 mb-2" /><Skeleton className="h-6 w-96" /></div></div>
        <div className="container mx-auto px-4 py-8 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}</div>
          <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
        </div>
      </div>
    );
  }

  if (!institute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-4">Institute not found</h1>
          <Link to="/"><Button>Go Home</Button></Link>
        </div>
      </div>
    );
  }

  const courses = institute.courses || [];
  const faculty = institute.faculty || [];
  const reviews = institute.reviews || [];
  const categorySlug = (institute.categories as any)?.slug || "cat";
  const categoryName = (institute.categories as any)?.name || "MBA";

  // Extract unique course categories from courses
  const courseCategories = Array.from(
    new Map(
      courses
        .filter((c: any) => c.course_categories?.id)
        .map((c: any) => [c.course_categories.id, { id: c.course_categories.id, name: c.course_categories.name }])
    ).values()
  );

  // Filter courses based on selected target AND selected course category
  const filteredCourses = courses.filter((c: any) => {
    let matchTarget = true;
    let matchCategory = true;
    if (selectedTarget) {
      const target = selectedTarget.toLowerCase();
      const name = c.name.toLowerCase();
      matchTarget = name.includes(target.split(" ")[0]) || name.includes(target);
    }
    if (selectedCourseCategory) {
      matchCategory = c.course_categories?.id === selectedCourseCategory;
    }
    return matchTarget && matchCategory;
  });

  const displayCourses = filteredCourses.length > 0 ? filteredCourses : (selectedCourseCategory ? [] : courses);

  const handleGetBestOffer = () => {
    if (!user) {
      setShowOfferLogin(true);
      return;
    }
    setDiscountClaimed(true);
    toast({ title: "🎉 Best Offer Unlocked!", description: "Use code MBAHUB25 for 25% off. Show this code during enrollment." });
  };

  const handleDownloadPDF = () => {
    const content = [
      `${institute.name} - Course Details`,
      `Location: ${institute.city}, ${institute.state}`,
      `Rating: ${institute.rating}/5`,
      `Success Rate: ${institute.success_rate}%`,
      `\nCOURSES:`,
      ...courses.flatMap((c: any) => [
        `\n${c.name}`, `Duration: ${c.duration} | Fees: ₹${Number(c.fees).toLocaleString()}`,
        `Batch: ${c.batch_info || "N/A"}`, `Description: ${c.description || "N/A"}`,
        ...(c.curriculum || []).map((item: string) => `  ✓ ${item}`),
      ]),
      `\nFACULTY:`,
      ...faculty.map((f: any) => `${f.name} - ${f.designation} (${f.experience})`),
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${institute.slug}-course-details.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Download Started" });
  };

  const handleEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnquiryLoading(true);
    const { error } = await supabase.from("inquiries").insert({
      institute_id: institute.id,
      name: enquiryForm.name,
      email: enquiryForm.email,
      phone: enquiryForm.phone,
      message: `Course: ${enquiryForm.course}. ${enquiryForm.message}`,
      type: "demo",
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Enquiry Submitted!" });
      setEnquiryForm({ name: "", phone: "", email: "", course: "", message: "" });
    }
    setEnquiryLoading(false);
  };

  const handleSaveInstitute = async () => {
    if (!user) { toast({ title: "Please sign in to save institutes" }); return; }
    const { error } = await supabase.from("saved_institutes").insert({ user_id: user.id, institute_id: institute.id });
    if (error) {
      if (error.code === "23505") toast({ title: "Already saved!" });
      else toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setSaved(true);
      toast({ title: "Saved!" });
    }
  };

  const toggleCompare = (courseId: string) => {
    setCompareSelection(prev => prev.includes(courseId) ? prev.filter(id => id !== courseId) : prev.length < 3 ? [...prev, courseId] : prev);
  };

  const compareCourses = courses.filter((c: any) => compareSelection.includes(c.id));

  return (
    <div className="min-h-screen bg-background">
      <SEOHead {...resolvedSeo} />
      {/* Hero */}
      <div className="hero-gradient py-10 md:py-14 relative overflow-hidden">
        {institute.banner_url && (
          <img src={institute.banner_url} alt={`${institute.name} banner`} className="absolute inset-0 w-full h-full object-cover opacity-20" />
        )}
        <div className="container mx-auto px-4 relative z-10">
          <Link to={`/category/${categorySlug}`} className="inline-flex items-center gap-1 text-primary-foreground/70 hover:text-primary-foreground mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to listings
          </Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-start gap-4 mb-3">
              {institute.logo_url ? (
                <img src={institute.logo_url} alt={`${institute.name} logo`} className="w-14 h-14 rounded-xl object-contain bg-white p-1 flex-shrink-0" />
              ) : null}
              <div>
                <Badge className="mb-2 bg-primary-foreground/20 text-primary-foreground border-none">{categoryName.toUpperCase()} COACHING</Badge>
                <h1 className="font-heading text-2xl md:text-4xl font-bold text-primary-foreground mb-2">{institute.name}</h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 md:gap-4 text-primary-foreground/80 text-sm">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {institute.city}, {institute.state}</span>
              <span className="flex items-center gap-1"><Star className="w-4 h-4 fill-current" /> {institute.rating} ({institute.total_reviews} reviews)</span>
              <Badge className="bg-primary-foreground/15 text-primary-foreground border-none text-xs">{institute.mode}</Badge>
            </div>
            <div className="flex flex-wrap gap-4 mt-4">
              {[
                { label: "Students", value: institute.students_count ? `${institute.students_count}+` : fallbackText(null, { kind: "students_count" }), source: "Brand brochure" },
                { label: "Success Rate", value: institute.success_rate ? `${institute.success_rate}%` : fallbackText(null, { kind: "success_rate" }), source: "3-yr results", year: new Date().getFullYear().toString() },
                { label: "Courses", value: String(courses.length || 0), source: "Course catalogue" },
                { label: "Faculty", value: String(faculty.length || 0), source: "Faculty page" },
              ].map((s) => (
                <div key={s.label} className="bg-primary-foreground/10 backdrop-blur-sm rounded-lg px-4 py-2">
                  <div className="text-xs text-primary-foreground/70 flex items-center gap-1">
                    {s.label}
                    <CitationLink source={s.source} year={s.year} className="!bg-primary-foreground/15 !border-primary-foreground/25 !text-primary-foreground/90" />
                  </div>
                  <div className="font-heading font-bold text-primary-foreground">{s.value}</div>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <LastUpdatedBadge
                date={(institute as any).last_seo_refresh || (institute as any).updated_at}
                className="!bg-primary-foreground/10 !border-primary-foreground/20 !text-primary-foreground/80"
              />
            </div>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Target Selection */}
        {!selectedTarget && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            <Card className="border-primary/30 bg-secondary/30">
              <CardContent className="pt-6">
                <h3 className="font-heading font-semibold text-foreground text-lg mb-3">🎯 What are you targeting?</h3>
                <p className="text-sm text-muted-foreground mb-4">Select your target to see relevant courses only</p>
                <div className="flex flex-wrap gap-2">
                  {["CAT 2025", "CAT 2026", "XAT 2026", "GMAT", "GRE", "Mock Tests", "GD/PI Preparation"].map((t) => (
                    <Button key={t} variant="outline" size="sm" onClick={() => {
                      setSelectedTarget(t);
                      const rc = courses.find((c: any) => c.name.toLowerCase().includes(t.split(" ")[0].toLowerCase()));
                      if (rc) setExpandedCourse(rc.id);
                    }} className="hover:bg-primary hover:text-primary-foreground">{t}</Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
        {selectedTarget && (
          <div className="mb-6 flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground text-sm">Targeting: {selectedTarget}</Badge>
            <Button variant="ghost" size="sm" onClick={() => { setSelectedTarget(null); setExpandedCourse(null); }} className="text-xs text-muted-foreground">Change</Button>
          </div>
        )}

        <AIGistSection
          content={institute.description || institute.name}
          pageType="institute"
          pageId={institute.id}
          onScrollToContent={() => document.getElementById("institute-about")?.scrollIntoView({ behavior: "smooth" })}
        />
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* About */}
            <Card id="institute-about" className="scroll-mt-24">
              <CardHeader><CardTitle className="font-heading">About {institute.name}</CardTitle></CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-muted-foreground dark:prose-invert leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: institute.description || '' }} />
                {(institute.features || []).length > 0 && (
                  <div className="grid sm:grid-cols-2 gap-2">
                    {(institute.features as string[]).map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />{h}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Courses - Detailed */}
            <Card id="courses" className="overflow-hidden border-0 shadow-lg scroll-mt-24">
              {/* Gradient Header */}
              <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 px-6 py-5 border-b border-border/50">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.08),transparent_70%)] pointer-events-none" />
                <div className="relative flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle className="font-heading text-xl flex items-center gap-2">
                      <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-primary" />
                      </div>
                      {selectedTarget ? `Courses for ${selectedTarget}` : `All Courses`}
                      <Badge variant="secondary" className="ml-1 text-xs font-mono">{displayCourses.length}</Badge>
                    </CardTitle>
                    {selectedCourseCategory && (
                      <p className="text-xs text-muted-foreground mt-1 ml-11">Filtered by category</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {compareSelection.length >= 2 && (
                      <Button size="sm" variant="default" className="gap-1.5 shadow-md" onClick={() => setShowCompare(!showCompare)}>
                        <Columns2 className="w-4 h-4" /> Compare ({compareSelection.length})
                      </Button>
                    )}
                    <Button variant="outline" size="sm" className="gap-1.5 bg-background/80 backdrop-blur-sm" onClick={handleDownloadPDF}>
                      <Download className="w-4 h-4" /> Brochure
                    </Button>
                  </div>
                </div>
                {/* Course Category Filter Tabs */}
                {courseCategories.length > 0 && (
                  <div className="relative flex flex-wrap gap-2 mt-4 ml-11">
                    <button
                      onClick={() => setSelectedCourseCategory(null)}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                        selectedCourseCategory === null
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105"
                          : "bg-background/70 text-muted-foreground hover:bg-background hover:text-foreground border border-border/50"
                      }`}
                    >
                      All Courses
                    </button>
                    {courseCategories.map((cc: any) => (
                      <button
                        key={cc.id}
                        onClick={() => setSelectedCourseCategory(selectedCourseCategory === cc.id ? null : cc.id)}
                        className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                          selectedCourseCategory === cc.id
                            ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 scale-105"
                            : "bg-background/70 text-muted-foreground hover:bg-background hover:text-foreground border border-border/50"
                        }`}
                      >
                        {cc.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <CardContent className="p-5">
                {/* Course comparison */}
                <AnimatePresence>
                  {showCompare && compareCourses.length >= 2 && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-6">
                      <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl p-5 border border-primary/20">
                        <h4 className="font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
                          <Columns2 className="w-4 h-4 text-primary" /> Course Comparison
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead><tr className="bg-muted/50 rounded-lg">
                              <th className="text-left py-3 px-4 font-semibold text-foreground border-b border-border rounded-tl-lg">Feature</th>
                              {compareCourses.map((c: any) => <th key={c.id} className="text-left py-3 px-4 font-semibold text-primary border-b border-border">{c.name}</th>)}
                            </tr></thead>
                            <tbody>
                              {[
                                { label: "Duration", key: "duration" },
                                { label: "Fees", key: "fees", format: (v: any) => `₹${Number(v).toLocaleString()}` },
                                { label: "Batch", key: "batch_info" },
                                { label: "Curriculum Items", key: "curriculum", format: (v: any) => `${(v || []).length} topics` },
                              ].map(row => (
                                <tr key={row.label} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                  <td className="py-3 px-4 font-medium text-foreground">{row.label}</td>
                                  {compareCourses.map((c: any) => (
                                    <td key={c.id} className="py-3 px-4 text-muted-foreground">{row.format ? row.format(c[row.key]) : (c[row.key] || "N/A")}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Empty state */}
                {displayCourses.length === 0 && selectedCourseCategory && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-7 h-7 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground text-sm mb-1">No courses found in this category.</p>
                    <Button variant="ghost" size="sm" className="mt-2 text-primary" onClick={() => setSelectedCourseCategory(null)}>
                      ← Show all courses
                    </Button>
                  </motion.div>
                )}

                {/* Course Cards */}
                <div className="space-y-4">
                  {displayCourses.map((course: any, courseIdx: number) => {
                    const isExpanded = expandedCourse === course.id;
                    const categoryName = course.course_categories?.name;
                    return (
                      <motion.div
                        key={course.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: courseIdx * 0.05, duration: 0.3 }}
                        className={`group rounded-xl border overflow-hidden transition-all duration-300 ${
                          isExpanded
                            ? "border-primary/30 shadow-lg shadow-primary/5 ring-1 ring-primary/10"
                            : "border-border/60 hover:border-primary/20 hover:shadow-md"
                        }`}
                      >
                        {/* Discount Banner */}
                        {course.discount_text && (
                          <div className="bg-gradient-to-r from-destructive/90 to-destructive/70 text-destructive-foreground text-xs font-bold px-4 py-1.5 flex items-center gap-1.5">
                            <Zap className="w-3 h-3" /> {course.discount_text}
                          </div>
                        )}

                        {/* Course Header */}
                        <div className={`flex items-center gap-3 p-4 transition-colors ${
                          isExpanded ? "bg-gradient-to-r from-primary/8 to-transparent" : "bg-card hover:bg-muted/30"
                        }`}>
                          <Checkbox
                            checked={compareSelection.includes(course.id)}
                            onCheckedChange={() => toggleCompare(course.id)}
                            className="flex-shrink-0"
                          />
                          <button onClick={() => setExpandedCourse(isExpanded ? null : course.id)} className="flex-1 flex items-center justify-between text-left gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-heading font-semibold text-foreground text-base leading-tight">{course.name}</h4>
                                {categoryName && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-accent/50 text-accent-foreground border border-accent/30">
                                    {categoryName}
                                  </span>
                                )}
                                {course.mode && course.mode !== "Offline" && (
                                  <Badge variant="secondary" className="text-[10px]">{course.mode}</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-2 flex-wrap">
                                {course.duration && (
                                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <Clock className="w-3.5 h-3.5 text-primary/70" /> {course.duration}
                                  </span>
                                )}
                                {course.fees && Number(course.fees) > 0 && (
                                  <span className="inline-flex items-center gap-1 font-heading font-bold text-primary text-base">
                                    ₹{Number(course.fees).toLocaleString()}
                                  </span>
                                )}
                                {course.rating > 0 && (
                                  <span className="inline-flex items-center gap-1 text-sm">
                                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                    <span className="font-semibold text-foreground">{Number(course.rating).toFixed(1)}</span>
                                  </span>
                                )}
                                {course.enrolled_count > 0 && (
                                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full">
                                    <Users className="w-3 h-3" /> {course.enrolled_count} enrolled
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                              isExpanded ? "bg-primary text-primary-foreground rotate-180" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                            }`}>
                              <ChevronDown className="w-4 h-4" />
                            </div>
                          </button>
                        </div>

                        {/* Expanded Content */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3, ease: "easeInOut" }}
                              className="overflow-hidden"
                            >
                              <div className="px-5 pb-5 pt-1 space-y-5 bg-gradient-to-b from-transparent to-muted/10">
                                {/* Stats Grid - only show fields with data */}
                                {(() => {
                                  const statsItems = [
                                    course.duration ? { label: "Duration", value: course.duration, icon: Clock, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" } : null,
                                    course.fees && Number(course.fees) > 0 ? { label: "Fees", value: `₹${Number(course.fees).toLocaleString()}`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/5" } : null,
                                    (course.mode || institute.mode) ? { label: "Mode", value: course.mode || institute.mode || "", icon: Award, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" } : null,
                                    course.batch_info ? { label: "Batch", value: course.batch_info, icon: Users, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" } : null,
                                  ].filter(Boolean) as { label: string; value: string; icon: any; color: string; bg: string }[];
                                  if (statsItems.length === 0) return null;
                                  return (
                                    <div className={`grid grid-cols-2 ${statsItems.length >= 3 ? 'sm:grid-cols-' + Math.min(statsItems.length, 4) : ''} gap-3`}>
                                      {statsItems.map((stat, i) => (
                                        <motion.div
                                          key={stat.label}
                                          initial={{ opacity: 0, y: 8 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          transition={{ delay: i * 0.08 }}
                                          className={`${stat.bg} rounded-xl p-3.5 border border-border/30`}
                                        >
                                          <div className="flex items-center gap-1.5 mb-1">
                                            <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                                            <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">{stat.label}</span>
                                          </div>
                                          <div className="font-heading font-bold text-foreground text-sm">{stat.value}</div>
                                        </motion.div>
                                      ))}
                                    </div>
                                  );
                                })()}

                                {/* Extra Info Row: Start Date, Seats, Rating, Enrolled */}
                                {(course.start_date || course.total_seats || course.rating > 0 || course.enrolled_count > 0) && (
                                  <div className="flex flex-wrap gap-3">
                                    {course.start_date && (
                                      <div className="flex items-center gap-2 text-sm bg-muted/30 rounded-lg px-3 py-2 border border-border/20">
                                        <Calendar className="w-4 h-4 text-primary" />
                                        <span className="text-muted-foreground">Starts: <span className="font-semibold text-foreground">{course.start_date}</span></span>
                                      </div>
                                    )}
                                    {course.total_seats > 0 && (
                                      <div className="flex items-center gap-2 text-sm bg-muted/30 rounded-lg px-3 py-2 border border-border/20">
                                        <Users className="w-4 h-4 text-primary" />
                                        <span className="text-muted-foreground">Seats: <span className="font-semibold text-foreground">{course.total_seats}</span></span>
                                      </div>
                                    )}
                                    {course.rating > 0 && (
                                      <div className="flex items-center gap-2 text-sm bg-amber-50 dark:bg-amber-950/20 rounded-lg px-3 py-2 border border-amber-200/30 dark:border-amber-800/30">
                                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                        <span className="font-semibold text-foreground">{Number(course.rating).toFixed(1)}</span>
                                        <span className="text-muted-foreground text-xs">/ 5</span>
                                      </div>
                                    )}
                                    {course.enrolled_count > 0 && (
                                      <div className="flex items-center gap-2 text-sm bg-emerald-50 dark:bg-emerald-950/20 rounded-lg px-3 py-2 border border-emerald-200/30 dark:border-emerald-800/30">
                                        <GraduationCap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                        <span className="font-semibold text-foreground">{course.enrolled_count}</span>
                                        <span className="text-muted-foreground text-xs">students enrolled</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Eligibility */}
                                {course.eligibility && (
                                  <div className="flex items-start gap-3 bg-blue-50/50 dark:bg-blue-950/10 rounded-xl p-4 border border-blue-200/30 dark:border-blue-800/20">
                                    <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                                    <div>
                                      <h5 className="font-heading font-semibold text-foreground text-sm mb-0.5">Eligibility</h5>
                                      <p className="text-sm text-muted-foreground">{course.eligibility}</p>
                                    </div>
                                  </div>
                                )}

                                {/* Description */}
                                {course.description && (
                                  <div className="bg-muted/20 rounded-xl p-4 border border-border/30">
                                    <p className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: course.description }} />
                                  </div>
                                )}

                                {/* Demo Video */}
                                {course.demo_video_url && (
                                  <a href={course.demo_video_url} target="_blank" rel="noopener noreferrer"
                                    className="flex items-center gap-3 bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-4 border border-primary/20 hover:border-primary/40 transition-colors group/video">
                                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center group-hover/video:bg-primary/25 transition-colors">
                                      <Video className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                      <h5 className="font-heading font-semibold text-foreground text-sm">Watch Demo Class</h5>
                                      <p className="text-xs text-muted-foreground">Preview a free lecture before enrolling</p>
                                    </div>
                                    <Play className="w-4 h-4 text-primary ml-auto" />
                                  </a>
                                )}

                                {/* Highlights */}
                                {(course.highlights || []).length > 0 && (
                                  <div>
                                    <h5 className="font-heading font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-md bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                        <Zap className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                      </div>
                                      Course Highlights
                                    </h5>
                                    <div className="grid sm:grid-cols-2 gap-2">
                                      {(course.highlights as string[]).map((h: string, i: number) => (
                                        <motion.div
                                          key={i}
                                          initial={{ opacity: 0, x: -8 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: 0.1 + i * 0.04 }}
                                          className="flex items-center gap-2.5 text-sm text-foreground py-2 px-3 rounded-lg bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-950/10 border border-amber-200/20 dark:border-amber-800/10"
                                        >
                                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
                                          <span>{h}</span>
                                        </motion.div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* What You Get - only show if institute has features */}
                                {institute.features && institute.features.length > 0 && (
                                <div>
                                  <h5 className="font-heading font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                                      <CheckCircle className="w-3 h-3 text-primary" />
                                    </div>
                                    What You Get
                                  </h5>
                                  <div className="grid sm:grid-cols-2 gap-2">
                                    {institute.features.map((d: string, i: number) => (
                                      <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: -8 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.15 + i * 0.04 }}
                                        className="flex items-center gap-2.5 text-sm text-muted-foreground py-1.5 px-3 rounded-lg hover:bg-muted/40 transition-colors"
                                      >
                                        <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                                        <span>{d}</span>
                                      </motion.div>
                                    ))}
                                  </div>
                                </div>
                                )}

                                {/* Curriculum */}
                                {(course.curriculum || []).length > 0 && (
                                  <div>
                                    <h5 className="font-heading font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                                      <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                                        <BookOpen className="w-3 h-3 text-primary" />
                                      </div>
                                      Curriculum
                                      <Badge variant="secondary" className="text-[10px] ml-1">{(course.curriculum as string[]).length} topics</Badge>
                                    </h5>
                                    <div className="grid sm:grid-cols-2 gap-2">
                                      {(course.curriculum as string[]).map((item, idx) => (
                                        <motion.div
                                          key={idx}
                                          initial={{ opacity: 0, x: -8 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: 0.2 + idx * 0.03 }}
                                          className="flex items-start gap-2.5 text-sm py-2 px-3 rounded-lg bg-muted/20 border border-border/20"
                                        >
                                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                            {idx + 1}
                                          </span>
                                          <span className="text-muted-foreground">{item}</span>
                                        </motion.div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-2.5 flex-wrap pt-3 border-t border-border/30">
                                  <Button size="sm" className="shadow-md shadow-primary/20 gap-1.5">
                                    <GraduationCap className="w-4 h-4" /> Enquire Now
                                  </Button>
                                  <Button size="sm" variant="outline" className="gap-1.5" onClick={handleGetBestOffer}>
                                    <Tag className="w-3.5 h-3.5" /> Get Best Offer
                                  </Button>
                                  {course.demo_video_url && (
                                    <a href={course.demo_video_url} target="_blank" rel="noopener noreferrer">
                                      <Button size="sm" variant="outline" className="gap-1.5">
                                        <Play className="w-3.5 h-3.5" /> Watch Demo
                                      </Button>
                                    </a>
                                  )}
                                  {(course as any).brochure_url && (
                                    <a href={(course as any).brochure_url} target="_blank" rel="noopener noreferrer">
                                      <Button size="sm" variant="outline" className="gap-1.5">
                                        <Download className="w-3.5 h-3.5" /> Brochure
                                      </Button>
                                    </a>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <InlineAIToolCTA variant="coaching-finder" />

            {/* Faculty */}
            {faculty.length > 0 && (
              <Card id="faculty" className="scroll-mt-24">
                <CardHeader><CardTitle className="font-heading">Faculty Profiles ({faculty.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {faculty.map((f: any) => {
                      const isExpanded = expandedFaculty === f.id;
                      return (
                        <div key={f.id} className="rounded-xl border border-border overflow-hidden">
                          <button onClick={() => setExpandedFaculty(isExpanded ? null : f.id)} className="w-full flex items-center gap-4 p-4 bg-muted/30 hover:bg-muted/50 transition-colors text-left">
                            <div className="w-14 h-14 rounded-full hero-gradient flex items-center justify-center text-primary-foreground font-bold text-lg flex-shrink-0">
                              {f.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-foreground">{f.name}</h4>
                              <p className="text-sm text-primary font-medium">{f.designation}</p>
                              <p className="text-xs text-muted-foreground">{f.experience} | {f.qualification}</p>
                            </div>
                            {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />}
                          </button>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                <div className="p-4 bg-card space-y-3">
                                  {f.bio && <p className="text-sm text-muted-foreground leading-relaxed">{f.bio}</p>}
                                  {f.specialization && <Badge variant="secondary" className="text-xs">{f.specialization}</Badge>}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Auto-scroll Testimonials */}
            <Card id="testimonials" className="scroll-mt-24">
              <CardHeader><CardTitle className="font-heading flex items-center gap-2"><Quote className="w-5 h-5 text-primary" /> Student Testimonials</CardTitle></CardHeader>
              <CardContent>
                <div className="relative overflow-hidden rounded-xl bg-secondary/30 p-6 min-h-[160px]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={testimonialIdx}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -50 }}
                      transition={{ duration: 0.4 }}
                    >
                      <div className="flex items-center gap-0.5 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-4 h-4 ${i < testimonials[testimonialIdx].rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                        ))}
                      </div>
                      <p className="text-muted-foreground leading-relaxed italic mb-3">"{testimonials[testimonialIdx].text}"</p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full hero-gradient flex items-center justify-center text-primary-foreground text-xs font-bold">
                          {testimonials[testimonialIdx].name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground text-sm">{testimonials[testimonialIdx].name}</div>
                          <div className="text-xs text-muted-foreground">{testimonials[testimonialIdx].batch}</div>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                  <div className="absolute bottom-3 right-4 flex gap-1">
                    {testimonials.map((_, i) => (
                      <button key={i} onClick={() => setTestimonialIdx(i)} className={`w-2 h-2 rounded-full transition-all ${i === testimonialIdx ? "bg-primary scale-125" : "bg-muted-foreground/30"}`} />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reviews */}
            {reviews.length > 0 && (
              <Card id="reviews" className="scroll-mt-24">
                <CardHeader><CardTitle className="font-heading">Student Reviews ({reviews.length})</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reviews.map((r: any) => (
                      <div key={r.id} className="bg-muted/50 rounded-xl p-5 border border-border">
                        <div className="flex items-center gap-1 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-4 h-4 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                          ))}
                        </div>
                        {r.title && <h4 className="font-semibold text-foreground mb-1">{r.title}</h4>}
                        {r.content && <p className="text-sm text-muted-foreground">{r.content}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          {r.verified && <Badge variant="secondary" className="text-xs">Verified</Badge>}
                          <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {[
                    { icon: Users, label: "Students Enrolled", value: `${institute.students_count}+` },
                    { icon: TrendingUp, label: "Success Rate", value: `${institute.success_rate}%` },
                    { icon: BookOpen, label: "Courses", value: String(courses.length) },
                    { icon: Star, label: "Rating", value: `${institute.rating}/5` },
                    { icon: GraduationCap, label: "Faculty", value: String(faculty.length) },
                  ].map((stat, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center"><stat.icon className="w-5 h-5 text-primary" /></div>
                      <div><div className="text-xs text-muted-foreground">{stat.label}</div><div className="font-heading font-bold text-foreground">{stat.value}</div></div>
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-6">Get Free Counselling</Button>
                <Button variant="outline" className="w-full mt-2 gap-1" onClick={handleDownloadPDF}><Download className="w-4 h-4" /> Download Brochure</Button>
                <Button variant="outline" className="w-full mt-2 gap-1" onClick={handleSaveInstitute} disabled={saved}>
                  <Heart className={`w-4 h-4 ${saved ? "fill-current text-destructive" : ""}`} /> {saved ? "Saved" : "Save Institute"}
                </Button>
              </CardContent>
            </Card>

            {/* Get Best Offer */}
            <Card className="border-primary/30 bg-secondary/50">
              <CardContent className="pt-6 text-center">
                <Tag className="w-8 h-8 text-primary mx-auto mb-3" />
                <h4 className="font-heading font-semibold text-foreground mb-2">Get Best Offer</h4>
                <p className="text-sm text-muted-foreground mb-1">{institute.discount}</p>
                {institute.offer && <p className="text-xs text-primary mb-4">{institute.offer}</p>}
                {!discountClaimed ? (
                  <>
                    <Button className="w-full gap-1" onClick={handleGetBestOffer}>
                      {user ? <Tag className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      {user ? "Get Best Offer" : "Login to Get Best Offer"}
                    </Button>
                    <LoginRequiredDialog open={showOfferLogin && !user} onOpenChange={setShowOfferLogin} message="Sign in or create an account to unlock exclusive offers and coupon codes." />
                  </>
                ) : (
                  <div className="bg-primary/10 rounded-lg p-3">
                    <p className="text-sm font-semibold text-primary">Code: MBAHUB25</p>
                    <p className="text-xs text-muted-foreground mt-1">25% off — show during enrollment</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Enquiry */}
            <Card>
              <CardContent className="pt-6">
                <h4 className="font-heading font-semibold text-foreground mb-3">Quick Enquiry</h4>
                <form onSubmit={handleEnquiry} className="space-y-3">
                  <Input placeholder="Your Name *" value={enquiryForm.name} onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })} required />
                  <Input placeholder="Phone Number *" value={enquiryForm.phone} onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })} required />
                  <Input type="email" placeholder="Email *" value={enquiryForm.email} onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })} required />
                  <Select value={enquiryForm.course} onValueChange={(v) => setEnquiryForm({ ...enquiryForm, course: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Course" /></SelectTrigger>
                    <SelectContent>
                      {courses.map((c: any) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Textarea placeholder="Your message (optional)" value={enquiryForm.message} onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })} rows={3} />
                  <Button className="w-full" type="submit" disabled={enquiryLoading}>{enquiryLoading ? "Submitting..." : "Submit Enquiry"}</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 text-center">
                <Award className="w-8 h-8 text-primary mx-auto mb-3" />
                <h4 className="font-heading font-semibold text-foreground mb-2">Compare Courses</h4>
                <p className="text-sm text-muted-foreground mb-4">Compare this institute with others side by side</p>
                <Link to="/compare"><Button variant="outline" className="w-full">Go to Compare</Button></Link>
              </CardContent>
            </Card>
          </div>
        </div>
        {institute?.id && <PageKeywords contentType="institute" recordId={institute.id} fallbackKeywords={(institute as any).keywords || []} />}
      </div>

      {/* Mobile-first navigation + actions */}
      <FloatingTOC
        items={[
          { id: "institute-about", label: "About" },
          { id: "courses", label: "Courses & Fees" },
          { id: "faculty", label: "Faculty" },
          { id: "testimonials", label: "Testimonials" },
          { id: "reviews", label: "Reviews" },
        ]}
        onSelect={(id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })}
        bottomOffset={88}
      />
      <MobileActionBar
        actions={[
          { icon: <GraduationCap />, label: "Enquire", primary: true, onClick: () => document.getElementById("courses")?.scrollIntoView({ behavior: "smooth" }) },
          { icon: <Heart className={saved ? "fill-current" : ""} />, label: saved ? "Saved" : "Save", active: saved, onClick: handleSaveInstitute },
          { icon: <Download />, label: "Brochure", onClick: handleDownloadPDF },
          { icon: <Share2 />, label: "Share", onClick: () => { if (navigator.share) navigator.share({ title: institute.name, url: window.location.href }); else { navigator.clipboard.writeText(window.location.href); toast({ title: "Link copied!" }); } } },
        ]}
      />
      <div className="md:hidden h-20" aria-hidden />
    </div>
  );
};

export default InstitutePage;
