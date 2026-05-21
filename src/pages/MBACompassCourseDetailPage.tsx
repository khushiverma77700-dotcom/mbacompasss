import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowLeft, Star, Users, Clock, Award, CheckCircle2, GraduationCap,
  Sparkles, Target, BookOpen, Download, ArrowRight, GitCompare,
  ListChecks, Layers, BarChart3, FileText, Shield, Calendar, Zap, Flame,
  Trophy, Headphones, RefreshCw, BadgeCheck, Brain, Rocket, LineChart,
  PlayCircle, X as XIcon, MessageSquare, Globe, IndianRupee, TrendingUp,
} from "lucide-react";


import SEOHead from "@/components/SEOHead";
import PageKeywords from "@/components/PageKeywords";
import { useResolvedSeo } from "@/hooks/useResolvedSeo";
import { useCtaGate, openLoginDialog } from "@/hooks/useCtaGate";
import { CompassCompareProvider, useCompassCompare } from "@/contexts/CompassCompareContext";
import OnboardingDialog from "@/components/OnboardingDialog";
import { toast } from "sonner";

const formatINR = (n: number | null) => n == null ? "—" : `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function MBACompassCourseDetailPage() {
  return (
    <CompassCompareProvider>
      <DetailInner />
    </CompassCompareProvider>
  );
}

function loadRzp(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function DetailInner() {

  const { slug } = useParams<{ slug: string }>();

  const [c, setC] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [phoneGateOpen, setPhoneGateOpen] = useState(false);
  const [phoneGateUser, setPhoneGateUser] = useState<{ id: string; email?: string | null } | null>(null);

  const [mockAgg, setMockAgg] = useState<{
    total: number;
    byType: Record<string, number>;
    byExam: Record<string, number>;
    bySection: Record<string, number>;
    totalDurationMins: number;
    totalQuestions: number;
    tests: Array<{ id: string; name: string; slug: string; exam_code: string; test_type: string; total_duration_minutes: number; difficulty: string }>;
  }>({ total: 0, byType: {}, byExam: {}, bySection: {}, totalDurationMins: 0, totalQuestions: 0, tests: [] });
  const [related, setRelated] = useState<any[]>([]);
  const compare = useCompassCompare();


  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase.from("mba_compass_courses").select("*").eq("slug", slug).maybeSingle();
      setC(data); setLoading(false);
      if (!data) return;

      const { data: u } = await supabase.auth.getUser();
      if (u.user) {
        const { data: e } = await supabase.from("course_enrollments")
          .select("id").eq("user_id", u.user.id).eq("course_id", data.id).maybeSingle();
        if (e) setEnrolled(true);
      }

      // Aggregate mocks from linked bundles (admin-only concept; user only sees totals)
      const { data: cb } = await supabase.from("course_bundles").select("bundle_id").eq("course_id", data.id);
      const bundleIds = (cb ?? []).map((r: any) => r.bundle_id);
      if (bundleIds.length === 0) return;

      const { data: items } = await supabase.from("mock_bundle_items").select("test_id").in("bundle_id", bundleIds);
      const testIds = Array.from(new Set((items ?? []).map((r: any) => r.test_id)));
      if (testIds.length === 0) return;

      const { data: tests } = await supabase.from("mock_tests")
        .select("id,name,slug,exam_code,test_type,total_duration_minutes,difficulty,is_published")
        .in("id", testIds);

      const live = (tests ?? []).filter((t: any) => t.is_published !== false);

      const byType: Record<string, number> = {};
      const byExam: Record<string, number> = {};
      let totalDuration = 0;
      live.forEach((t: any) => {
        byType[t.test_type] = (byType[t.test_type] ?? 0) + 1;
        byExam[t.exam_code] = (byExam[t.exam_code] ?? 0) + 1;
        totalDuration += t.total_duration_minutes ?? 0;
      });

      // Section breakdown + total questions via mock_sections
      const liveIds = live.map((t: any) => t.id);
      const bySection: Record<string, number> = {};
      let totalQuestions = 0;
      if (liveIds.length > 0) {
        const { data: secs } = await supabase.from("mock_sections")
          .select("name,total_questions,test_id").in("test_id", liveIds);
        (secs ?? []).forEach((s: any) => {
          const key = (s.name ?? "Other").trim();
          bySection[key] = (bySection[key] ?? 0) + 1;
          totalQuestions += s.total_questions ?? 0;
        });
      }

      setMockAgg({
        total: live.length,
        byType, byExam, bySection,
        totalDurationMins: totalDuration,
        totalQuestions,
        tests: live as any,
      });
    })();
  }, [slug]);

  // Related courses (other live MBA Compass courses)
  useEffect(() => {
    if (!c?.id) return;
    (async () => {
      const { data } = await supabase
        .from("mba_compass_courses")
        .select("id,title,slug,subtitle,thumbnail_url,price,original_price,rating,reviews_count,exam_focus,full_mocks_count,is_published")
        .neq("id", c.id)
        .eq("is_published", true)
        .order("sort_order")
        .limit(3);
      setRelated(data ?? []);
    })();
  }, [c?.id]);



  const { requiresLogin: courseRequiresLogin } = useCtaGate("course_enroll");
  const handlePay = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      if (courseRequiresLogin) { openLoginDialog("Sign in with mobile OTP to enroll in this course."); return; }
      toast.error("Please sign in to enroll"); window.location.href = "/auth"; return;
    }
    // Mobile OTP verification gate — required before any course purchase.
    const { data: prof } = await supabase
      .from("profiles")
      .select("phone, onboarding_completed")
      .eq("user_id", u.user.id)
      .maybeSingle();
    if (!prof?.phone || !prof?.onboarding_completed) {
      setPhoneGateUser({ id: u.user.id, email: u.user.email });
      setPhoneGateOpen(true);
      toast.message("Verify your mobile number to continue with the purchase.");
      return;
    }
    setPaying(true);
    try {
      const ok = await loadRzp();
      if (!ok) throw new Error("Could not load checkout");
      const { data, error } = await supabase.functions.invoke("razorpay-create-order", { body: { course_id: c.id } });
      if (error || !data?.order_id) throw new Error(data?.error || error?.message || "Order failed");

      const rzp = new (window as any).Razorpay({
        key: data.key_id, amount: data.amount, currency: data.currency,
        name: "MBA Compass", description: data.course_name, order_id: data.order_id,
        prefill: { email: u.user.email },
        theme: { color: "#0284c7" },
        handler: async (resp: any) => {
          const { data: v, error: ve } = await supabase.functions.invoke("razorpay-verify-payment", {
            body: {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            },
          });
          if (ve || !v?.success) { toast.error("Payment verification failed"); return; }
          toast.success("Enrollment successful!");
          setEnrolled(true);
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.open();
    } catch (e: any) {
      toast.error(e.message || "Payment failed");
    } finally {
      setPaying(false);
    }
  };


  const { seo } = useResolvedSeo("course", c?.id ?? "", {
    title: c?.meta_title || c?.seo_title || (c?.title ? `${c.title} — MBA Compass` : "MBA Compass Course"),
    description: c?.meta_description || c?.seo_description || c?.subtitle || c?.description || `${c?.title ?? ""} program details`,
    keywords: c?.keywords || undefined,
    canonical: c?.slug ? `https://mbacompass.in/mba-compass/${c.slug}` : undefined,
  });

  if (loading) return <div className="container mx-auto px-4 py-12 text-muted-foreground">Loading…</div>;
  if (!c) return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Course not found</h1>
      <Button asChild className="mt-4 bg-sky-600 hover:bg-sky-700"><Link to="/mba-compass">Back to all courses</Link></Button>
    </div>
  );

  const features: string[] = Array.isArray(c.features) ? c.features : [];
  const learn: string[] = Array.isArray(c.what_youll_learn) ? c.what_youll_learn : [];
  const curriculum: any[] = Array.isArray(c.curriculum) ? c.curriculum : [];
  const instructors: any[] = Array.isArray(c.instructors) ? c.instructors : [];
  const faqs: any[] = Array.isArray(c.faqs) ? c.faqs : [];
  const gallery: string[] = Array.isArray(c.gallery_images) ? c.gallery_images : [];

  const hasDiscount = c.original_price && c.price && c.original_price > c.price;

  const inCompare = compare.has(c.id);
  const toggleCompare = () => {
    if (inCompare) compare.remove(c.id);
    else if (!compare.add(c.id)) toast.error("You can compare up to 3 courses");
    else toast.success("Added to compare");
  };

  // Highlight features list (toggles)
  const featureCheck = [
    ["AI Study Planner", c.has_ai_study_planner],
    ["AI Tools", c.has_ai_tools],
    ["Daily Test", c.has_daily_test],
    ["Daily Mocks", c.has_daily_mocks],
    ["CAT Planner", c.has_cat_planner],
    ["Sectional Tests", c.has_sectional_tests],
    ["Topic Tests", c.has_topic_tests],
    ["Previous Year Papers", c.has_previous_year_papers],
    ["Personalized Mock Hub", c.has_personalized_hub],
    ["Live Classes", c.has_live_classes],
    ["Recorded Lectures", c.has_recorded_lectures],
    ["Study Material (PDFs)", c.has_study_material],
    ["1:1 Mentorship", c.has_mentorship_1on1],
    ["Doubt Resolution", c.has_doubt_resolution],
    ["Mock Analysis", c.has_mock_analysis],
    ["Performance Analytics", c.has_performance_analytics],
    ["Leaderboard Access", c.has_leaderboard_access],
    ["Percentile Predictor", c.has_percentile_predictor],
    ["AI Insights & Goals", c.has_ai_insights],
    ["GD-PI Prep", c.has_gd_pi_prep],
    ["Certificate", c.has_certificate],
    ["Lifetime Access", c.has_lifetime_access],
  ] as [string, boolean][];

  return (
    <>
      <SEOHead
        title={seo.title}
        description={seo.description}
        keywords={seo.keywords}
        canonical={seo.canonical}
        jsonLd={seo.jsonLd as any}
        ogTitle={seo.ogTitle}
        ogDescription={seo.ogDescription}
        ogImage={c.thumbnail_url || c.banner_url || undefined}
        twitterTitle={seo.twitterTitle}
        twitterDescription={seo.twitterDescription}
      />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sky-50 via-white to-blue-50 pt-8 pb-12">
        <div className="absolute inset-0 pointer-events-none opacity-60" aria-hidden>
          <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-sky-200/40 blur-3xl" />
          <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
        </div>
        <div className="container mx-auto px-4 relative">
          <Button asChild variant="ghost" size="sm" className="mb-4">
            <Link to="/courses"><ArrowLeft className="h-4 w-4 mr-1" /> All courses</Link>
          </Button>

          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7">
              <div className="flex flex-wrap gap-2 mb-3">
                {(c.exam_focus ?? []).map((e: string) => (
                  <Badge key={e} className="bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100">{e}</Badge>
                ))}
                {c.mode && <Badge variant="outline" className="capitalize">{c.mode}</Badge>}
                {c.level && <Badge variant="outline" className="capitalize bg-violet-50 text-violet-700 border-violet-200">{c.level}</Badge>}
                {c.has_certificate && <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50"><Award className="h-3 w-3 mr-1" /> Certified</Badge>}
              </div>

              <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight tracking-tight">{c.title}</h1>
              {c.subtitle && <p className="text-base md:text-lg text-muted-foreground mt-3">{c.subtitle}</p>}

              <div className="flex flex-wrap items-center gap-4 mt-5 text-sm">
                {c.rating ? (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span className="font-semibold">{c.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({c.reviews_count ?? 0} reviews)</span>
                  </div>
                ) : null}
                {c.total_students_enrolled ? (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-4 w-4" /> {c.total_students_enrolled.toLocaleString("en-IN")} enrolled
                  </span>
                ) : null}
                {c.duration_weeks ? (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" /> {c.duration_weeks} weeks
                  </span>
                ) : null}
                {c.validity_months ? (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-4 w-4" /> {c.validity_months}-month access
                  </span>
                ) : null}
              </div>

              {c.description
                ? <p className="mt-5 text-gray-700 leading-relaxed">{c.description}</p>
                : (
                  <p className="mt-5 text-gray-700 leading-relaxed">
                    A focused, exam-ready program with {mockAgg.total || c.full_mocks_count || 0}+ practice mocks,
                    {mockAgg.totalQuestions ? ` ${mockAgg.totalQuestions.toLocaleString("en-IN")} questions ` : " curated questions "}
                    and a structured plan to take you from prep to test-day with confidence.
                  </p>
                )}

              {/* Hero highlight strip */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <HeroChip icon={Layers} label="Total Mocks" value={mockAgg.total || c.full_mocks_count || 0} tint="sky" />
                <HeroChip icon={FileText} label="Questions" value={mockAgg.totalQuestions ? mockAgg.totalQuestions.toLocaleString("en-IN") : "—"} tint="violet" />
                <HeroChip icon={Clock} label="Mock Hours" value={mockAgg.totalDurationMins ? `${Math.round(mockAgg.totalDurationMins / 60)}h` : `${c.total_video_hours ?? 0}h`} tint="emerald" />
                <HeroChip icon={Zap} label="Live Classes" value={c.live_classes_count ?? 0} tint="amber" />
              </div>

              {Object.keys(mockAgg.byExam).length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="text-xs font-semibold text-gray-600 self-center mr-1">Exams Covered:</span>
                  {Object.entries(mockAgg.byExam).sort((a,b)=>b[1]-a[1]).map(([exam, n]) => (
                    <span key={exam} className="inline-flex items-center gap-1 text-xs bg-white border border-sky-200 text-sky-700 rounded-full px-3 py-1 shadow-sm">
                      <Flame className="h-3 w-3 text-sky-500" /> {exam} <span className="font-bold">{n}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5">
              <Card className="overflow-hidden border-sky-100 shadow-xl sticky top-20">
                {c.thumbnail_url ? (
                  <img src={c.thumbnail_url} alt={c.title} className="w-full aspect-video object-cover" />
                ) : (
                  <div className="aspect-video bg-gradient-to-br from-sky-100 to-blue-100 grid place-items-center">
                    <GraduationCap className="h-12 w-12 text-sky-400" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900">{formatINR(c.price)}</span>
                    {hasDiscount && (
                      <>
                        <span className="text-base text-muted-foreground line-through">{formatINR(c.original_price)}</span>
                        {c.discount_percent ? <Badge className="bg-rose-500 text-white border-0">{c.discount_percent}% OFF</Badge> : null}
                      </>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{c.validity_months ?? 12} months access • Taxes included</div>

                  <div className="mt-4 space-y-2">
                    {enrolled ? (
                      <Button asChild size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700">
                        <Link to="/student"><CheckCircle2 className="h-4 w-4 mr-1" /> Enrolled — Go to Dashboard</Link>
                      </Button>
                    ) : c.price ? (
                      <Button size="lg" className="w-full bg-sky-600 hover:bg-sky-700" disabled={paying} onClick={handlePay}>
                        {paying ? "Processing…" : <>Enroll Now <ArrowRight className="h-4 w-4 ml-1" /></>}
                      </Button>
                    ) : c.enroll_url ? (
                      <Button asChild size="lg" className="w-full bg-sky-600 hover:bg-sky-700">
                        <a href={c.enroll_url} target="_blank" rel="noopener noreferrer">Enroll Now <ArrowRight className="h-4 w-4 ml-1" /></a>
                      </Button>
                    ) : (
                      <Button size="lg" className="w-full bg-sky-600 hover:bg-sky-700">Enroll Now <ArrowRight className="h-4 w-4 ml-1" /></Button>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" onClick={toggleCompare}>
                        <GitCompare className="h-4 w-4 mr-1" /> {inCompare ? "Added" : "Compare"}
                      </Button>
                      {c.brochure_url ? (
                        <Button asChild variant="outline">
                          <a href={c.brochure_url} target="_blank" rel="noopener noreferrer"><Download className="h-4 w-4 mr-1" /> Brochure</a>
                        </Button>
                      ) : <Button variant="outline" disabled><Download className="h-4 w-4 mr-1" /> Brochure</Button>}
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-sky-100 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-700"><Shield className="h-4 w-4 text-emerald-500" /> Secure checkout via Razorpay</div>
                    <div className="flex items-center gap-2 text-gray-700"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Instant access after payment</div>
                    <div className="flex items-center gap-2 text-gray-700"><BarChart3 className="h-4 w-4 text-emerald-500" /> Detailed analytics & solutions</div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* STATS STRIP */}
      <section className="container mx-auto px-4 -mt-6 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={Layers} value={mockAgg.total || c.full_mocks_count || 0} label="Total Mocks" />
          <StatCard icon={Target} value={mockAgg.byType.full_length || c.full_mocks_count || 0} label="Full Length" />
          <StatCard icon={ListChecks} value={(mockAgg.byType.sectional || 0) + (mockAgg.byType.topic_wise || 0) || c.sectional_mocks_count || 0} label="Sectional / Topic" />
          <StatCard icon={FileText} value={mockAgg.totalQuestions ? mockAgg.totalQuestions.toLocaleString("en-IN") : "—"} label="Total Questions" />
          <StatCard icon={Clock} value={mockAgg.totalDurationMins ? `${Math.round(mockAgg.totalDurationMins / 60)}h` : `${c.total_video_hours ?? 0}h`} label="Practice Hours" />
          <StatCard icon={Zap} value={c.live_classes_count ?? 0} label="Live Classes" />
        </div>
      </section>

      {/* WHAT YOU'LL LEARN + KEY FEATURES */}
      {(learn.length > 0 || features.length > 0) && (
        <section className="container mx-auto px-4 py-12">
          <SectionHead eyebrow="Outcomes" title="What you will master in this program" />
          <div className="grid md:grid-cols-2 gap-6 mt-8">
            {learn.length > 0 && (
              <Card className="p-6 border-sky-100 bg-gradient-to-br from-white to-sky-50/50">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900">
                  <span className="h-9 w-9 rounded-lg bg-sky-100 text-sky-600 grid place-items-center"><Target className="h-5 w-5" /></span>
                  What you will learn
                </h3>
                <ul className="space-y-3">
                  {learn.map((l, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" /> <span>{l}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {features.length > 0 && (
              <Card className="p-6 border-sky-100 bg-gradient-to-br from-white to-violet-50/30">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-900">
                  <span className="h-9 w-9 rounded-lg bg-violet-100 text-violet-600 grid place-items-center"><Sparkles className="h-5 w-5" /></span>
                  Key program features
                </h3>
                <ul className="space-y-3">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700 leading-relaxed">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" /> <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* EXAM COVERAGE + MOCK LIBRARY */}
      {(Object.keys(mockAgg.byExam).length > 0 || mockAgg.total > 0) && (
        <section className="container mx-auto px-4 py-8">
          <SectionHead eyebrow="Practice library" title="Mocks, exams & sections — everything inside" />
          <div className="grid lg:grid-cols-3 gap-6 mt-8">
            <Card className="p-6 border-sky-100 lg:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <span className="h-9 w-9 rounded-lg bg-sky-100 text-sky-600 grid place-items-center"><Flame className="h-5 w-5" /></span>
                <h3 className="font-bold text-lg text-gray-900">Exam-wise coverage</h3>
              </div>
              {Object.keys(mockAgg.byExam).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(mockAgg.byExam).sort((a,b)=>b[1]-a[1]).map(([exam, n]) => {
                    const max = Math.max(...Object.values(mockAgg.byExam));
                    const pct = Math.max(8, Math.round((n/max)*100));
                    return (
                      <div key={exam}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-semibold text-gray-800">{exam}</span>
                          <span className="text-sky-700 font-bold">{n} mocks</span>
                        </div>
                        <div className="h-2 bg-sky-50 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-sky-500 to-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : <p className="text-sm text-muted-foreground">Exam coverage will appear here as mocks are added.</p>}
            </Card>

            <Card className="p-6 border-sky-100 bg-gradient-to-br from-sky-600 to-blue-700 text-white">
              <div className="flex items-center gap-2 mb-4">
                <span className="h-9 w-9 rounded-lg bg-white/15 grid place-items-center"><Layers className="h-5 w-5" /></span>
                <h3 className="font-bold text-lg">Mock breakdown</h3>
              </div>
              <div className="space-y-3 text-sm">
                <BreakdownRow label="Full-length mocks" value={mockAgg.byType.full_length || 0} />
                <BreakdownRow label="Sectional mocks" value={mockAgg.byType.sectional || 0} />
                <BreakdownRow label="Topic-wise mocks" value={mockAgg.byType.topic_wise || 0} />
                <BreakdownRow label="Daily tests" value={mockAgg.byType.daily_test || 0} />
                <div className="h-px bg-white/20 my-2" />
                <BreakdownRow label="Total questions" value={mockAgg.totalQuestions ? mockAgg.totalQuestions.toLocaleString("en-IN") : "—"} />
                <BreakdownRow label="Total practice time" value={mockAgg.totalDurationMins ? `${Math.round(mockAgg.totalDurationMins / 60)} hours` : "—"} />
              </div>
            </Card>
          </div>

          {Object.keys(mockAgg.bySection).length > 0 && (
            <Card className="p-6 border-sky-100 mt-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="h-9 w-9 rounded-lg bg-emerald-100 text-emerald-600 grid place-items-center"><BarChart3 className="h-5 w-5" /></span>
                <h3 className="font-bold text-lg text-gray-900">Section-wise question pool</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(mockAgg.bySection).sort((a,b)=>b[1]-a[1]).map(([sec, n]) => (
                  <div key={sec} className="rounded-lg border border-sky-100 bg-sky-50/40 p-3">
                    <div className="text-xs uppercase tracking-wide text-sky-700 font-semibold">{sec}</div>
                    <div className="text-xl font-bold text-gray-900 mt-1">{n}</div>
                    <div className="text-[10px] text-muted-foreground">questions</div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </section>
      )}

      {/* EVERYTHING INCLUDED */}
      <section className="container mx-auto px-4 py-12">
        <SectionHead eyebrow="Inside the program" title="Everything included in this course" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-8">
          {featureCheck.map(([label, on]) => (
            <div key={label} className={`flex items-center gap-2.5 text-sm rounded-xl px-4 py-3 border transition ${on ? "bg-emerald-50/60 border-emerald-200 text-emerald-900 shadow-sm" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
              <span className={`h-7 w-7 rounded-md grid place-items-center shrink-0 ${on ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"}`}>
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <span className="font-medium">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CURRICULUM */}
      {curriculum.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <SectionHead eyebrow="Curriculum" title="A step-by-step plan from basics to exam mastery" />
          <Card className="p-6 border-sky-100 mt-8">
            <Accordion type="multiple" defaultValue={curriculum.map((_, i) => `m-${i}`)} className="space-y-2">
              {curriculum.map((m, i) => (
                <AccordionItem key={i} value={`m-${i}`} className="border rounded-xl px-4 bg-white">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3 text-left">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white font-bold text-sm shrink-0">{i + 1}</div>
                      <div>
                        <div className="font-semibold text-gray-900">{m.title}</div>
                        <div className="text-xs text-muted-foreground">{m.lessons ?? 0} lessons {m.duration ? `• ${m.duration}` : ""}</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    {m.description && <p className="text-sm text-gray-700 mb-2">{m.description}</p>}
                    {m.topics && <div className="text-xs text-muted-foreground"><BookOpen className="h-3 w-3 inline mr-1" /> {m.topics}</div>}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        </section>
      )}

      {/* INSTRUCTORS */}
      {instructors.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <SectionHead eyebrow="Mentors" title="Learn from people who have cracked the exam" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {instructors.map((p, i) => (
              <Card key={i} className="p-6 border-sky-100 text-center hover:shadow-lg transition">
                {p.photo_url
                  ? <img src={p.photo_url} alt={p.name} className="h-24 w-24 rounded-full mx-auto object-cover ring-4 ring-sky-100" />
                  : <div className="h-24 w-24 rounded-full mx-auto bg-gradient-to-br from-sky-100 to-blue-100 grid place-items-center ring-4 ring-sky-100"><GraduationCap className="h-10 w-10 text-sky-400" /></div>}
                <div className="mt-3 font-semibold text-gray-900">{p.name}</div>
                {p.title && <div className="text-xs text-sky-700 font-medium">{p.title}</div>}
                {p.bio && <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{p.bio}</p>}
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* GALLERY */}
      {gallery.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <SectionHead eyebrow="Inside the classroom" title="A peek at the experience" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-8">
            {gallery.map((src, i) => (
              <img key={i} src={src} alt="" className="rounded-xl w-full aspect-video object-cover border border-sky-100 hover:scale-[1.02] transition" loading="lazy" />
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <SectionHead eyebrow="Questions" title="Frequently asked questions" />
          <Card className="p-6 border-sky-100 mt-8 max-w-3xl mx-auto">
            <Accordion type="multiple">
              {faqs.map((f, i) => (
                <AccordionItem key={i} value={`f-${i}`}>
                  <AccordionTrigger className="text-left font-semibold">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-gray-700 leading-relaxed">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Card>
        </section>
      )}

      {/* CTA FOOTER */}
      <section className="container mx-auto px-4 py-12">
        <Card className="p-8 md:p-10 border-0 bg-gradient-to-r from-sky-600 to-blue-700 text-white text-center shadow-xl">
          <h3 className="text-2xl md:text-3xl font-bold">Ready to start with {c.title}?</h3>
          <p className="text-sky-100 mt-2 max-w-2xl mx-auto">Join {(c.total_students_enrolled ?? 0).toLocaleString("en-IN")}+ aspirants already preparing. Instant access, full analytics, structured curriculum.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {enrolled ? (
              <Button asChild size="lg" className="bg-white text-sky-700 hover:bg-sky-50"><Link to="/student">Go to Dashboard <ArrowRight className="h-4 w-4 ml-1" /></Link></Button>
            ) : (
              <Button size="lg" className="bg-white text-sky-700 hover:bg-sky-50" disabled={paying} onClick={handlePay}>
                {paying ? "Processing…" : <>Enroll Now for {formatINR(c.price)} <ArrowRight className="h-4 w-4 ml-1" /></>}
              </Button>
            )}
            <Button asChild size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white/10 hover:text-white"><Link to="/courses">Explore more courses</Link></Button>
          </div>
        </Card>

        <div className="mt-8">
          <PageKeywords contentType="course" recordId={c.id} fallbackKeywords={c.keywords || []} />
        </div>
      </section>

      {phoneGateUser && (
        <OnboardingDialog
          open={phoneGateOpen}
          onComplete={() => {
            setPhoneGateOpen(false);
            // Mobile verified — automatically resume the purchase flow.
            setTimeout(() => { void handlePay(); }, 100);
          }}
          userId={phoneGateUser.id}
          userEmail={phoneGateUser.email}
        />
      )}
    </>
  );
}

function Stat({ n, l }: { n: any; l: string }) {
  return (
    <div className="bg-sky-50/60 border border-sky-100 rounded-md py-2">
      <div className="text-base font-bold text-sky-700">{n}</div>
      <div className="text-[10px] text-muted-foreground">{l}</div>
    </div>
  );
}

function HeroChip({ icon: Icon, label, value, tint }: { icon: any; label: string; value: any; tint: "sky"|"violet"|"emerald"|"amber" }) {
  const map: Record<string,string> = {
    sky: "from-sky-50 to-blue-50 border-sky-200 text-sky-700",
    violet: "from-violet-50 to-purple-50 border-violet-200 text-violet-700",
    emerald: "from-emerald-50 to-teal-50 border-emerald-200 text-emerald-700",
    amber: "from-amber-50 to-orange-50 border-amber-200 text-amber-700",
  };
  return (
    <div className={`rounded-xl border bg-gradient-to-br ${map[tint]} p-3 shadow-sm`}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-[11px] uppercase tracking-wide font-semibold">{label}</span>
      </div>
      <div className="mt-1 text-xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function StatCard({ icon: Icon, value, label }: { icon: any; value: any; label: string }) {
  return (
    <div className="rounded-2xl bg-white border border-sky-100 shadow-sm p-4 hover:shadow-md transition">
      <div className="h-9 w-9 rounded-lg bg-sky-100 text-sky-600 grid place-items-center mb-2">
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-bold text-gray-900 leading-none">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="text-center max-w-2xl mx-auto">
      <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.15em] uppercase text-sky-600 bg-sky-50 border border-sky-200 rounded-full px-3 py-1">
        <Sparkles className="h-3 w-3" /> {eyebrow}
      </div>
      <h2 className="text-2xl md:text-4xl font-bold text-gray-900 mt-3 tracking-tight">{title}</h2>
    </div>
  );
}

function BreakdownRow({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/80">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

