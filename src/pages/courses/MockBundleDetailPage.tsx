import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Package, Clock, CheckCircle2, Loader2, ShieldCheck, Sparkles, Award, ChevronRight,
  Star, Users, TrendingUp, ArrowRight, Brain, Calendar, Headphones, BarChart3, Layers,
  GraduationCap, Trophy, Target, Lightbulb, Zap, MessageCircle, Video, UserCheck, Timer,
} from "lucide-react";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";
import {
  HIGHLIGHT_DEFINITIONS, HighlightKey, HighlightMap, isHighlightOn, getHighlightValue,
} from "@/lib/courseHighlights";
import { useMetaPixel, pixelTrack } from "@/lib/metaPixel";

const HIGHLIGHT_ICONS: Record<HighlightKey, any> = {
  daily_tests: Calendar,
  personalized_tests: Brain,
  sectional_tests: Layers,
  full_length_mocks: Package,
  previous_year_papers: GraduationCap,
  ai_mock_analysis: Sparkles,
  advanced_cat_planner: Target,
  study_planner: Lightbulb,
  score_predictor: TrendingUp,
  leaderboard: Trophy,
  deep_analysis: BarChart3,
  topper_videos: Video,
  doubt_solving: MessageCircle,
  support_247: Headphones,
  avg_resolution: Timer,
  live_classes: Zap,
  interview_prep: UserCheck,
  mentor_calls: Users,
};

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

type SectionRow = {
  name: string;
  mockCount: number;
  questions: number;
  durationMin: number;
};

export default function MockBundleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [bundle, setBundle] = useState<any | null>(null);
  const [mocks, setMocks] = useState<any[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [related, setRelated] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data: b } = await supabase
        .from("mock_bundles")
        .select("*, items:mock_bundle_items(test:mock_tests(id, name, slug, total_duration_minutes, exam_code, difficulty))")
        .eq("slug", slug).eq("is_published", true).maybeSingle();
      setBundle(b);
      const includedMocks = (b?.items ?? []).map((i: any) => i.test).filter(Boolean);
      setMocks(includedMocks);

      // Aggregate sections across all included mocks
      if (includedMocks.length) {
        const ids = includedMocks.map((m: any) => m.id);
        const { data: secs } = await supabase
          .from("mock_sections")
          .select("test_id, name, duration_minutes, total_questions")
          .in("test_id", ids);
        const map = new Map<string, SectionRow>();
        (secs ?? []).forEach((s: any) => {
          const key = (s.name || "Other").trim();
          const cur = map.get(key) ?? { name: key, mockCount: 0, questions: 0, durationMin: 0 };
          cur.mockCount += 1;
          cur.questions += Number(s.total_questions) || 0;
          cur.durationMin += Number(s.duration_minutes) || 0;
          map.set(key, cur);
        });
        setSections([...map.values()].sort((a, b) => b.questions - a.questions));
      } else {
        setSections([]);
      }

      // Related
      const { data: r } = await supabase
        .from("mock_bundles")
        .select("id, name, slug, exam_code, cover_image_url, price_inr, original_price_inr, validity_days, items:mock_bundle_items(test_id)")
        .eq("is_published", true)
        .neq("slug", slug)
        .order("sort_order")
        .limit(6);
      setRelated(r ?? []);

      setLoading(false);
      if (b) {
        const { data: u } = await supabase.auth.getUser();
        if (u.user) {
          const { data: e } = await supabase.from("mock_bundle_enrollments")
            .select("id").eq("user_id", u.user.id).eq("bundle_id", b.id).maybeSingle();
          if (e) setEnrolled(true);
        }
      }
    })();
  }, [slug]);

  const handlePay = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.error("Please sign in to purchase");
      window.location.href = `/auth?redirect=/courses/${slug}`;
      return;
    }
    pixelTrack("InitiateCheckout", {
      content_name: bundle?.name,
      content_ids: [bundle?.slug],
      content_type: "product",
      value: Number(bundle?.price_inr),
      currency: "INR",
      num_items: mocks.length,
    });
    setPaying(true);
    try {
      const ok = await loadRzp();
      if (!ok) throw new Error("Could not load checkout");
      const { data, error } = await supabase.functions.invoke("bundle-create-order", { body: { bundle_id: bundle.id } });
      if (error || !data?.order_id) throw new Error(data?.error || error?.message || "Order failed");

      const rzp = new (window as any).Razorpay({
        key: data.key_id, amount: data.amount, currency: data.currency,
        name: "MBA Compass", description: data.bundle_name, order_id: data.order_id,
        prefill: { email: u.user.email },
        theme: { color: "#0284c7" },
        handler: async (resp: any) => {
          const { data: v, error: ve } = await supabase.functions.invoke("bundle-verify-payment", {
            body: {
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            },
          });
          if (ve || !v?.success) { toast.error("Payment verification failed"); return; }
          pixelTrack("Purchase", {
            content_name: bundle?.name,
            content_ids: [bundle?.slug],
            content_type: "product",
            value: Number(bundle?.price_inr),
            currency: "INR",
            num_items: mocks.length,
          });
          toast.success("Bundle unlocked! All mocks are now in your dashboard.");
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

  // Pixel: ViewContent for this specific bundle once it loads
  useMetaPixel(
    bundle
      ? {
          contentName: bundle.name,
          contentCategory: "course",
          contentIds: [bundle.slug],
          value: Number(bundle.price_inr),
          currency: "INR",
        }
      : undefined,
  );

  if (loading) return <div className="container mx-auto px-4 py-12 text-muted-foreground">Loading…</div>;
  if (!bundle) return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Course not found</h1>
      <Button asChild className="mt-4"><Link to="/courses">Browse all courses</Link></Button>
    </div>
  );

  const price = Number(bundle.price_inr);
  const original = bundle.original_price_inr ? Number(bundle.original_price_inr) : null;
  const discountPct = original && original > price ? Math.round(((original - price) / original) * 100) : 0;
  const highlights = (bundle.highlights ?? {}) as HighlightMap;
  const enabledHighlights = HIGHLIGHT_DEFINITIONS.filter((d) => isHighlightOn(highlights, d.key));

  const totalQuestions = sections.reduce((a, s) => a + s.questions, 0);
  const totalDuration = sections.reduce((a, s) => a + s.durationMin, 0);
  const totalSectionalTests = sections.reduce((a, s) => a + s.mockCount, 0);

  // Build deliverables card for hero (pulls from highlights with sensible defaults)
  const heroOfferings: { icon: any; title: string; sub?: string }[] = [
    { icon: Package, title: `${mocks.length} Full-length Mocks`, sub: "Real exam pattern" },
    ...(sections.length > 0 ? [{ icon: Layers, title: `${sections.length} Sections covered`, sub: `${totalQuestions}+ questions` }] : []),
    ...(isHighlightOn(highlights, "daily_tests") ? [{ icon: Calendar, title: "Daily Tests", sub: "Fresh test every day" }] : []),
    ...(isHighlightOn(highlights, "personalized_tests") ? [{ icon: Brain, title: "Personalized AI Tests", sub: "Adapts to your ability" }] : []),
    ...(isHighlightOn(highlights, "support_247") ? [{ icon: Headphones, title: "24×7 Support", sub: "Always available" }] : []),
    ...(isHighlightOn(highlights, "avg_resolution") ? [{ icon: Timer, title: `Avg resolution ${getHighlightValue(highlights, "avg_resolution") ?? "28"} min`, sub: "Lightning-fast help" }] : []),
  ].slice(0, 6);

  return (
    <div className="bg-background min-h-screen">
      <SEOHead
        title={`${bundle.name} | MBA Compass`}
        description={bundle.description ?? `${bundle.name} — complete prep course with mocks, AI analysis and 24×7 support.`}
        canonical={`https://mbacompass.in/courses/${bundle.slug}`}
        ogType="product"
        ogImage={bundle.cover_image_url || undefined}
      />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-50 via-white to-white">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 -right-24 w-[26rem] h-[26rem] rounded-full bg-gradient-to-br from-sky-300/40 to-blue-400/30 blur-3xl animate-blob" />
          <div className="absolute bottom-0 -left-20 w-[20rem] h-[20rem] rounded-full bg-gradient-to-br from-cyan-300/40 to-sky-200/30 blur-3xl animate-blob [animation-delay:3s]" />
        </div>
        <div className="container mx-auto px-4 py-8 md:py-12 relative">
          {/* Breadcrumb */}
          <nav className="text-sm text-muted-foreground flex items-center gap-1 mb-4">
            <Link to="/courses" className="hover:text-sky-700">Courses</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium line-clamp-1">{bundle.name}</span>
          </nav>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              {bundle.cover_image_url ? (
                <img src={bundle.cover_image_url} alt={bundle.name} className="w-full rounded-2xl object-cover max-h-80 shadow-lg" loading="lazy" />
              ) : (
                <div className="w-full h-64 bg-gradient-to-br from-sky-100 via-cyan-50 to-blue-50 rounded-2xl flex items-center justify-center relative overflow-hidden shadow-lg">
                  <div className="absolute inset-0 [background-image:linear-gradient(to_right,hsl(var(--primary)/0.06)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.06)_1px,transparent_1px)] [background-size:32px_32px]" />
                  <Package className="h-20 w-20 text-sky-400 relative" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  {bundle.exam_code && <Badge variant="outline" className="border-sky-300 text-sky-700">{bundle.exam_code}</Badge>}
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">{mocks.length} mocks included</Badge>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                    <Star className="h-3 w-3 mr-1 fill-current" /> 4.8/5
                  </Badge>
                  {discountPct > 0 && <Badge className="bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100">{discountPct}% OFF</Badge>}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-br from-slate-900 via-sky-900 to-sky-700 bg-clip-text text-transparent">
                  {bundle.name}
                </h1>
                {bundle.description && <p className="text-muted-foreground mt-3 text-base leading-relaxed">{bundle.description}</p>}
              </div>

              {/* Hero offerings strip */}
              {heroOfferings.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {heroOfferings.map((o, i) => (
                    <div key={i} className="flex items-start gap-3 px-3 py-3 rounded-xl bg-white border border-sky-100 shadow-sm">
                      <o.icon className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold leading-tight">{o.title}</div>
                        {o.sub && <div className="text-[11px] text-muted-foreground mt-0.5">{o.sub}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sticky purchase card */}
            <div className="lg:col-span-1">
              <Card className="p-6 lg:sticky lg:top-4 border-2 border-sky-200 shadow-2xl rounded-2xl bg-white/95 backdrop-blur-xl">
                {discountPct > 0 && (
                  <Badge className="mb-3 bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100">
                    {discountPct}% OFF — Limited time
                  </Badge>
                )}
                <div className="flex items-baseline gap-3">
                  <div className="text-4xl font-bold bg-gradient-to-br from-sky-700 to-sky-500 bg-clip-text text-transparent">
                    ₹{price.toLocaleString()}
                  </div>
                  {original && original > price && (
                    <div className="text-lg text-muted-foreground line-through">₹{original.toLocaleString()}</div>
                  )}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-1 mt-2">
                  <Clock className="h-4 w-4" /> {bundle.validity_days} days access
                </div>

                <ul className="mt-5 space-y-2">
                  {[
                    `${mocks.length} full mocks included`,
                    sections.length > 0 ? `${totalQuestions.toLocaleString()}+ practice questions` : "Curated practice questions",
                    "Instant unlock in dashboard",
                    "AI-powered analysis on every attempt",
                  ].map((x, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{x}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-6">
                  {enrolled ? (
                    <Button asChild className="w-full" size="lg">
                      <Link to="/student/mocks">Go to My Mocks <ArrowRight className="ml-1 h-4 w-4" /></Link>
                    </Button>
                  ) : (
                    <Button onClick={handlePay} disabled={paying} className="w-full shadow-lg shadow-sky-500/30" size="lg">
                      {paying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Buy Course
                    </Button>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Secure</span>
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> 10k+ aspirants</span>
                </div>

                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Everything unlocks instantly after payment.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT YOU GET — admin-controlled deliverables */}
      {enabledHighlights.length > 0 && (
        <section className="py-14 bg-white">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center mb-10">
              <Badge className="mb-3 bg-sky-100 text-sky-800 hover:bg-sky-100 border-sky-200">What you get</Badge>
              <h2 className="text-2xl md:text-3xl font-bold">Everything packed inside this course</h2>
              <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">A complete prep ecosystem — tests, AI analytics, planning and human support, all under one roof.</p>
            </div>

            {(["Tests & Practice","AI & Analytics","Planning & Mentorship","Support"] as const).map((cat) => {
              const items = enabledHighlights.filter((d) => d.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat} className="mb-8">
                  <div className="text-xs font-semibold text-sky-700 uppercase tracking-wider mb-3">{cat}</div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map((d) => {
                      const Icon = HIGHLIGHT_ICONS[d.key] ?? CheckCircle2;
                      const val = getHighlightValue(highlights, d.key);
                      return (
                        <div key={d.key} className="group p-5 rounded-2xl border border-sky-100 bg-gradient-to-br from-white to-sky-50/40 hover:shadow-lg hover:border-sky-200 transition-all">
                          <div className="flex items-start gap-3">
                            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 grid place-items-center text-white shadow-md shadow-sky-500/30 shrink-0">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-sm">
                                {d.label}
                                {val && d.hasValue && (
                                  <span className="ml-1 text-sky-700">— {val}{d.unit ? ` ${d.unit}` : ""}</span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{d.description}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* SECTION-WISE BREAKDOWN — replaces old mock-name list */}
      {sections.length > 0 && (
        <section className="py-14 bg-gradient-to-b from-sky-50/40 via-white to-white">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-8">
              <Badge className="mb-3 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">Practice depth</Badge>
              <h2 className="text-2xl md:text-3xl font-bold">Section-wise practice you'll get</h2>
              <p className="text-muted-foreground mt-2">Across {mocks.length} full mocks, here's how the practice breaks down.</p>
            </div>

            {/* totals */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-4 rounded-xl bg-white border border-sky-100 text-center">
                <div className="text-2xl font-bold text-sky-700">{mocks.length}</div>
                <div className="text-xs text-muted-foreground mt-1">Full-length mocks</div>
              </div>
              <div className="p-4 rounded-xl bg-white border border-sky-100 text-center">
                <div className="text-2xl font-bold text-sky-700">{sections.length}</div>
                <div className="text-xs text-muted-foreground mt-1">Sections covered</div>
              </div>
              <div className="p-4 rounded-xl bg-white border border-sky-100 text-center">
                <div className="text-2xl font-bold text-sky-700">{totalQuestions.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground mt-1">Total questions</div>
              </div>
              <div className="p-4 rounded-xl bg-white border border-sky-100 text-center">
                <div className="text-2xl font-bold text-sky-700">{Math.round(totalDuration / 60)}h</div>
                <div className="text-xs text-muted-foreground mt-1">Practice time</div>
              </div>
            </div>

            <Card className="overflow-hidden border-sky-100">
              <Table>
                <TableHeader>
                  <TableRow className="bg-sky-50/60">
                    <TableHead>Section</TableHead>
                    <TableHead className="text-center">Sectional Tests</TableHead>
                    <TableHead className="text-center">Total Questions</TableHead>
                    <TableHead className="text-center">Practice Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sections.map((s) => (
                    <TableRow key={s.name}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-sky-600" />
                          {s.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{s.mockCount}</TableCell>
                      <TableCell className="text-center font-semibold text-sky-700">{s.questions}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{s.durationMin} min</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-sky-50/40 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-center">{totalSectionalTests}</TableCell>
                    <TableCell className="text-center text-sky-700">{totalQuestions}</TableCell>
                    <TableCell className="text-center">{totalDuration} min</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Card>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Mock names stay hidden until you join — so every test feels fresh on attempt day.
            </p>
          </div>
        </section>
      )}

      {/* TRUST STRIP */}
      <section className="py-10 bg-gradient-to-r from-sky-600 to-cyan-600 text-white">
        <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { n: "10,000+", l: "Aspirants enrolled" },
            { n: "4.8/5", l: "Average rating" },
            { n: "99+", l: "%ile achievers" },
            { n: "24×7", l: "Support window" },
          ].map((t, i) => (
            <div key={i}>
              <div className="text-2xl md:text-3xl font-bold">{t.n}</div>
              <div className="text-xs md:text-sm text-white/80 mt-1">{t.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* RELATED BUNDLES */}
      {related.length > 0 && (
        <section className="py-14 bg-gradient-to-b from-white via-sky-50/40 to-white">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
              <div>
                <Badge className="mb-2 bg-sky-100 text-sky-800 hover:bg-sky-100 border-sky-200">More courses</Badge>
                <h2 className="text-2xl md:text-3xl font-bold">Other courses you might like</h2>
              </div>
              <Button asChild variant="outline">
                <Link to="/courses">View all <ChevronRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.slice(0, 6).map((b) => {
                const rPrice = Number(b.price_inr);
                const rOriginal = b.original_price_inr ? Number(b.original_price_inr) : null;
                const rDiscount = rOriginal && rOriginal > rPrice ? Math.round(((rOriginal - rPrice) / rOriginal) * 100) : 0;
                return (
                  <Card key={b.id} className="overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all border-sky-100 flex flex-col group relative">
                    {rDiscount > 0 && (
                      <Badge className="absolute top-3 right-3 z-10 bg-rose-500 text-white hover:bg-rose-500 border-0 shadow-md">
                        {rDiscount}% OFF
                      </Badge>
                    )}
                    {b.cover_image_url ? (
                      <img src={b.cover_image_url} alt={b.name} className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="w-full h-36 bg-gradient-to-br from-sky-100 to-blue-50 flex items-center justify-center">
                        <Package className="h-12 w-12 text-sky-400" />
                      </div>
                    )}
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {b.exam_code && <Badge variant="outline" className="text-[10px]">{b.exam_code}</Badge>}
                        <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
                          {b.items?.length ?? 0} mocks
                        </Badge>
                      </div>
                      <h3 className="font-semibold leading-snug">{b.name}</h3>
                      <div className="flex items-center justify-between mt-3 pt-3 border-t">
                        <div className="flex items-baseline gap-2">
                          <div className="text-lg font-bold text-sky-700">₹{rPrice.toLocaleString()}</div>
                          {rOriginal && rOriginal > rPrice && (
                            <div className="text-xs text-muted-foreground line-through">₹{rOriginal.toLocaleString()}</div>
                          )}
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <Link to={`/courses/${b.slug}`}>View <ChevronRight className="h-4 w-4 ml-1" /></Link>
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
