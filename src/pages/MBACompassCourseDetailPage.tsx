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
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { useCtaGate, openLoginDialog } from "@/hooks/useCtaGate";
import { CompassCompareProvider, useCompassCompare } from "@/contexts/CompassCompareContext";
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
  const compare = useCompassCompare();

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase.from("mba_compass_courses").select("*").eq("slug", slug).maybeSingle();
      setC(data); setLoading(false);
      if (data) {
        const { data: u } = await supabase.auth.getUser();
        if (u.user) {
          const { data: e } = await supabase.from("course_enrollments")
            .select("id").eq("user_id", u.user.id).eq("course_id", data.id).maybeSingle();
          if (e) setEnrolled(true);
        }
      }
    })();
  }, [slug]);

  const { requiresLogin: courseRequiresLogin } = useCtaGate("course_enroll");
  const handlePay = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      if (courseRequiresLogin) { openLoginDialog("Sign in to enroll in this course."); return; }
      toast.error("Please sign in to enroll"); window.location.href = "/auth"; return;
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
    ["CAT Planner", c.has_cat_planner],
    ["Sectional Tests", c.has_sectional_tests],
    ["Topic Tests", c.has_topic_tests],
    ["Live Classes", c.has_live_classes],
    ["Recorded Lectures", c.has_recorded_lectures],
    ["Study Material (PDFs)", c.has_study_material],
    ["1:1 Mentorship", c.has_mentorship_1on1],
    ["Doubt Resolution", c.has_doubt_resolution],
    ["Mock Analysis", c.has_mock_analysis],
    ["Performance Analytics", c.has_performance_analytics],
    ["Leaderboard Access", c.has_leaderboard_access],
    ["Percentile Predictor", c.has_percentile_predictor],
    ["GD-PI Prep", c.has_gd_pi_prep],
    ["Certificate", c.has_certificate],
    ["Lifetime Access", c.has_lifetime_access],
  ] as [string, boolean][];

  return (
    <>
      <SEOHead
        title={c.seo_title || `${c.title} — MBA Compass`}
        description={c.seo_description || c.subtitle || c.description || `${c.title} program details`}
        canonical={`https://mbacompass.in/mba-compass/${c.slug}`}
      />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-sky-50 via-white to-blue-50 pt-8 pb-10">
        <div className="container mx-auto px-4">
          <Button asChild variant="ghost" size="sm" className="mb-4">
            <Link to="/mba-compass"><ArrowLeft className="h-4 w-4 mr-1" /> All courses</Link>
          </Button>

          <div className="grid lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7">
              <div className="flex flex-wrap gap-2 mb-3">
                {(c.exam_focus ?? []).map((e: string) => (
                  <Badge key={e} className="bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100">{e}</Badge>
                ))}
                {c.mode && <Badge variant="outline" className="capitalize">{c.mode}</Badge>}
                {c.level && <Badge variant="outline" className="capitalize bg-violet-50 text-violet-700 border-violet-200">{c.level}</Badge>}
              </div>

              <h1 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight">{c.title}</h1>
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
              </div>

              {c.description && <p className="mt-5 text-gray-700 leading-relaxed">{c.description}</p>}
            </div>

            <div className="lg:col-span-5">
              <Card className="overflow-hidden border-sky-100 shadow-lg sticky top-20">
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

                  <div className="mt-5 grid grid-cols-2 gap-2 text-center text-xs">
                    <Stat n={c.full_mocks_count ?? 0} l="Full Mocks" />
                    <Stat n={c.sectional_mocks_count ?? 0} l="Sectional Tests" />
                    <Stat n={`${c.total_video_hours ?? 0}h`} l="Video Lessons" />
                    <Stat n={c.live_classes_count ?? 0} l="Live Classes" />
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Body tabs */}
      <section className="container mx-auto px-4 py-10">
        <Tabs defaultValue="overview">
          <TabsList className="bg-sky-50">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
            {instructors.length > 0 && <TabsTrigger value="instructors">Instructors</TabsTrigger>}
            {gallery.length > 0 && <TabsTrigger value="gallery">Gallery</TabsTrigger>}
            {faqs.length > 0 && <TabsTrigger value="faqs">FAQs</TabsTrigger>}
          </TabsList>

          <TabsContent value="overview" className="mt-6 grid md:grid-cols-2 gap-6">
            {learn.length > 0 && (
              <Card className="p-6 border-sky-100">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Target className="h-5 w-5 text-sky-600" /> What you'll learn</h3>
                <ul className="space-y-2">
                  {learn.map((l, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /> {l}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {features.length > 0 && (
              <Card className="p-6 border-sky-100">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2"><Sparkles className="h-5 w-5 text-sky-600" /> Key features</h3>
                <ul className="space-y-2">
                  {features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="features" className="mt-6">
            <Card className="p-6 border-sky-100">
              <h3 className="font-bold text-lg mb-4">Everything included in this program</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {featureCheck.map(([label, on]) => (
                  <div key={label} className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 border ${on ? "bg-emerald-50/60 border-emerald-200 text-emerald-800" : "bg-slate-50 border-slate-200 text-slate-400"}`}>
                    <CheckCircle2 className={`h-4 w-4 ${on ? "text-emerald-500" : "text-slate-300"}`} /> {label}
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="curriculum" className="mt-6">
            <Card className="p-6 border-sky-100">
              {curriculum.length === 0 ? (
                <p className="text-sm text-muted-foreground">Curriculum coming soon.</p>
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {curriculum.map((m, i) => (
                    <AccordionItem key={i} value={`m-${i}`} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          <div className="h-8 w-8 rounded-full bg-sky-100 grid place-items-center text-sky-700 font-bold text-sm shrink-0">{i + 1}</div>
                          <div>
                            <div className="font-semibold">{m.title}</div>
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
              )}
            </Card>
          </TabsContent>

          {instructors.length > 0 && (
            <TabsContent value="instructors" className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {instructors.map((p, i) => (
                <Card key={i} className="p-5 border-sky-100 text-center">
                  {p.photo_url
                    ? <img src={p.photo_url} alt={p.name} className="h-20 w-20 rounded-full mx-auto object-cover" />
                    : <div className="h-20 w-20 rounded-full mx-auto bg-sky-100 grid place-items-center"><GraduationCap className="h-8 w-8 text-sky-400" /></div>}
                  <div className="mt-3 font-semibold">{p.name}</div>
                  {p.title && <div className="text-xs text-sky-700">{p.title}</div>}
                  {p.bio && <p className="text-xs text-muted-foreground mt-2">{p.bio}</p>}
                </Card>
              ))}
            </TabsContent>
          )}

          {gallery.length > 0 && (
            <TabsContent value="gallery" className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {gallery.map((src, i) => (
                <img key={i} src={src} alt="" className="rounded-lg w-full aspect-video object-cover border border-sky-100" loading="lazy" />
              ))}
            </TabsContent>
          )}

          {faqs.length > 0 && (
            <TabsContent value="faqs" className="mt-6">
              <Card className="p-6 border-sky-100">
                <Accordion type="multiple">
                  {faqs.map((f, i) => (
                    <AccordionItem key={i} value={`f-${i}`}>
                      <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                      <AccordionContent className="text-sm text-gray-700">{f.a}</AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </section>
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
