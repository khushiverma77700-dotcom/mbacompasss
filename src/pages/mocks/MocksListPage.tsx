import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckCircle2,
  XCircle,
  Star,
  ShieldCheck,
  Clock,
  BrainCircuit,
  Timer,
  BookOpen,
  TrendingUp,
  Users,
  MessageCircle,
  Sparkles,
  ArrowRight,
  Target,
  Activity,
  PlayCircle,
  GraduationCap,
  BarChart3,
  Quote,
  Award,
} from "lucide-react";
import { MockCheckoutDialog } from "@/components/mock/MockCheckoutDialog";
import SEOHead from "@/components/SEOHead";
import { initMetaPixel, pixelTrack } from "@/lib/metaPixel";
import { toast } from "sonner";
import { AnimatedAIReport } from "@/components/mock/AnimatedAIReport";
import { AutoTestimonialMarquee } from "@/components/mock/AutoTestimonialMarquee";

const ICONS: Record<string, any> = {
  BrainCircuit, Timer, BookOpen, TrendingUp, Users, MessageCircle, Sparkles, ShieldCheck, Star, Clock,
  Target, Activity, PlayCircle, GraduationCap, BarChart3, Award,
};

interface Settings {
  hero_eyebrow: string;
  hero_headline: string;
  hero_subheadline: string;
  hero_cta_label: string;
  hero_image_url: string | null;
  price_current: number;
  price_original: number;
  price_discount_label: string;
  offer_urgency: string;
  offer_ends_at: string | null;
  bundle_title: string;
  bundle_subtitle: string;
  cta_target_test_id: string | null;
  trust_students: string;
  trust_avg_improvement: string;
  trust_rating: string;
  benefits: any[];
  whats_included: any[];
  comparison: any[];
  testimonials: any[];
  faqs: any[];
  meta_pixel_id: string | null;
  meta_title: string;
  meta_description: string;
  why_us_title?: string;
  why_us_subtitle?: string;
  why_us_points?: any[];
  auto_testimonials?: any[];
  student_analyses?: any[];
  student_feedback_text?: any[];
  student_feedback_images?: any[];
  expert_feedback?: any[];
  platform_features?: any[];
  ai_report_title?: string;
  ai_report_subtitle?: string;
}

interface MockTest {
  id: string;
  slug: string;
  name: string;
  price_inr: number;
  pricing_type: string;
}

function useCountdown(endsAt: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - now;
  if (diff <= 0) return null;
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const m = Math.floor((diff / (1000 * 60)) % 60);
  const s = Math.floor((diff / 1000) % 60);
  return { d, h, m, s };
}

export default function MocksListPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tests, setTests] = useState<MockTest[]>([]);
  const [checkoutTest, setCheckoutTest] = useState<MockTest | null>(null);
  const pricingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const [{ data: s }, { data: t }] = await Promise.all([
        supabase.from("mocks_landing_settings").select("*").maybeSingle(),
        supabase
          .from("mock_tests")
          .select("id, slug, name, price_inr, pricing_type")
          .eq("is_published", true)
          .order("created_at", { ascending: false }),
      ]);
      if (s) setSettings(s as any);
      setTests((t ?? []) as MockTest[]);
    })();
  }, []);

  useEffect(() => {
    if (settings?.meta_pixel_id) {
      initMetaPixel(settings.meta_pixel_id);
      pixelTrack("ViewContent", { content_name: "CAT Mocks Landing", content_category: "mocks" });
    }
  }, [settings?.meta_pixel_id]);

  const countdown = useCountdown(settings?.offer_ends_at ?? null);

  const targetTest = useMemo(() => {
    if (!settings) return null;
    if (settings.cta_target_test_id) return tests.find((x) => x.id === settings.cta_target_test_id) ?? null;
    return tests[0] ?? null;
  }, [settings, tests]);

  const scrollToPricing = () => {
    pixelTrack("AddToCart", {
      content_name: settings?.bundle_title,
      value: settings?.price_current,
      currency: "INR",
    });
    pricingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const startCheckout = async () => {
    if (!targetTest) {
      toast.error("No mock test configured. Please contact support.");
      return;
    }
    pixelTrack("InitiateCheckout", {
      content_name: targetTest.name,
      value: settings?.price_current,
      currency: "INR",
    });
    if (targetTest.pricing_type === "free") {
      navigate(`/mocks/${targetTest.slug}`);
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      navigate(`/auth?redirect=/mocks`);
      return;
    }
    setCheckoutTest(targetTest);
  };

  if (!settings) {
    return <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">Loading…</div>;
  }

  const discountPct = settings.price_original > 0
    ? Math.round(((settings.price_original - settings.price_current) / settings.price_original) * 100)
    : 0;

  return (
    <div className="bg-background">
      <SEOHead title={settings.meta_title} description={settings.meta_description} />

      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-b from-sky-50 via-white to-white">
        <div className="absolute inset-0 pointer-events-none opacity-40 [background-image:radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.15),transparent_50%)]" />
        <div className="container mx-auto px-4 py-12 md:py-20 relative">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <Badge className="mb-4 bg-sky-100 text-sky-800 hover:bg-sky-100 border-sky-200">
                {settings.hero_eyebrow}
              </Badge>
              <h1 className="text-3xl md:text-5xl font-bold leading-tight tracking-tight">
                {settings.hero_headline}
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">{settings.hero_subheadline}</p>

              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-amber-400 text-amber-400" /><strong>{settings.trust_rating}</strong> rating</div>
                <div className="flex items-center gap-1.5"><Users className="h-4 w-4 text-sky-600" /><strong>{settings.trust_students}</strong> aspirants</div>
                <div className="flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-emerald-600" /><strong>{settings.trust_avg_improvement}</strong> avg gain</div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Button size="lg" onClick={scrollToPricing} className="text-base px-8">
                  {settings.hero_cta_label} <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={startCheckout}>
                  Buy Now ₹{settings.price_current}
                </Button>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-emerald-600" /> 7-day money-back guarantee
              </div>
            </div>

            <div className="relative">
              <Card className="p-6 shadow-xl border-sky-100">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">{settings.bundle_title}</div>
                    <div className="text-base font-medium">{settings.bundle_subtitle}</div>
                  </div>
                  <Badge className="bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100">
                    {settings.price_discount_label || `${discountPct}% OFF`}
                  </Badge>
                </div>
                <div className="mt-4 flex items-baseline gap-3">
                  <div className="text-4xl font-bold">₹{settings.price_current}</div>
                  <div className="text-lg text-muted-foreground line-through">₹{settings.price_original}</div>
                </div>
                {countdown && (
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                    {[
                      ["Days", countdown.d],
                      ["Hrs", countdown.h],
                      ["Min", countdown.m],
                      ["Sec", countdown.s],
                    ].map(([l, v]) => (
                      <div key={l as string} className="rounded-lg bg-sky-50 py-2">
                        <div className="text-xl font-bold tabular-nums">{String(v).padStart(2, "0")}</div>
                        <div className="text-[10px] uppercase text-muted-foreground">{l}</div>
                      </div>
                    ))}
                  </div>
                )}
                <Button size="lg" className="w-full mt-5" onClick={startCheckout}>
                  Buy Now — Get Instant Access
                </Button>
                <div className="mt-3 text-xs text-center text-muted-foreground">{settings.offer_urgency}</div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center">Why aspirants choose us</h2>
          <p className="text-center text-muted-foreground mt-2">Everything you need to crack CAT 2025 — in one place.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
            {settings.benefits.map((b: any, i: number) => {
              const Icon = ICONS[b.icon] ?? Sparkles;
              return (
                <Card key={i} className="p-6 hover:shadow-md transition border-sky-100">
                  <div className="h-10 w-10 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{b.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{b.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* WHAT'S INCLUDED */}
      <section className="py-16 bg-sky-50/50">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center">What's included</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
            {settings.whats_included.map((w: any, i: number) => (
              <Card key={i} className="p-5 text-center bg-white">
                <div className="text-2xl font-bold text-sky-700">{w.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{w.label}</div>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button size="lg" onClick={scrollToPricing}>Get the Bundle</Button>
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      {settings.comparison?.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center">Why we're better than the rest</h2>
            <Card className="mt-8 overflow-hidden">
              <div className="grid grid-cols-3 bg-sky-50 px-4 py-3 text-sm font-semibold">
                <div>Feature</div>
                <div className="text-center">Us</div>
                <div className="text-center text-muted-foreground">Others</div>
              </div>
              {settings.comparison.map((row: any, i: number) => (
                <div key={i} className="grid grid-cols-3 px-4 py-3 border-t text-sm items-center">
                  <div>{row.feature}</div>
                  <div className="flex justify-center">
                    {row.us ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex justify-center">
                    {row.others ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-muted-foreground" />}
                  </div>
                </div>
              ))}
            </Card>
          </div>
        </section>
      )}

      {/* TESTIMONIALS */}
      {settings.testimonials?.length > 0 && (
        <section className="py-16 bg-sky-50/50">
          <div className="container mx-auto px-4 max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center">Real results from real aspirants</h2>
            <div className="grid md:grid-cols-3 gap-5 mt-10">
              {settings.testimonials.map((t: any, i: number) => (
                <Card key={i} className="p-6 bg-white">
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(5)].map((_, j) => <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="text-sm leading-relaxed">"{t.quote}"</p>
                  <div className="mt-4 pt-4 border-t">
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-sky-700 font-medium">{t.score}</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* PRICING */}
      <section ref={pricingRef} className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-bold text-center">One simple price</h2>
          <p className="text-center text-muted-foreground mt-2">{settings.offer_urgency}</p>
          <Card className="mt-8 p-8 border-2 border-sky-200 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{settings.bundle_title}</div>
                <div className="text-sm text-muted-foreground">{settings.bundle_subtitle}</div>
              </div>
              <Badge className="bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100">
                {settings.price_discount_label || `${discountPct}% OFF`}
              </Badge>
            </div>
            <div className="mt-5 flex items-baseline gap-3">
              <div className="text-5xl font-bold">₹{settings.price_current}</div>
              <div className="text-xl text-muted-foreground line-through">₹{settings.price_original}</div>
            </div>
            <ul className="mt-6 space-y-2">
              {settings.whats_included.slice(0, 6).map((w: any, i: number) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span><strong>{w.value}</strong> {w.label}</span>
                </li>
              ))}
            </ul>
            <Button size="lg" className="w-full mt-6 text-base" onClick={startCheckout}>
              Buy Now — ₹{settings.price_current}
            </Button>
            <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> 7-day refund</span>
              <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Instant access</span>
            </div>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      {settings.faqs?.length > 0 && (
        <section className="py-16 bg-sky-50/50">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center">Frequently asked questions</h2>
            <Accordion type="single" collapsible className="mt-8">
              {settings.faqs.map((f: any, i: number) => (
                <AccordionItem key={i} value={`item-${i}`} className="bg-white rounded-lg mb-2 px-4 border">
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      )}

      {/* FINAL CTA */}
      <section className="py-16 bg-gradient-to-br from-sky-600 to-sky-700 text-white">
        <div className="container mx-auto px-4 text-center max-w-2xl">
          <h2 className="text-2xl md:text-3xl font-bold">Start your CAT 2025 prep today</h2>
          <p className="mt-3 text-sky-100">{settings.offer_urgency}</p>
          <Button size="lg" variant="secondary" className="mt-6" onClick={startCheckout}>
            Get Instant Access — ₹{settings.price_current}
          </Button>
        </div>
      </section>

      {/* STICKY MOBILE CTA */}
      <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white border-t shadow-lg p-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="text-xs text-muted-foreground line-through">₹{settings.price_original}</div>
          <div className="font-bold text-lg leading-none">₹{settings.price_current}</div>
        </div>
        <Button onClick={scrollToPricing} className="flex-1">Buy Now</Button>
      </div>

      {checkoutTest && (
        <MockCheckoutDialog
          open={!!checkoutTest}
          onOpenChange={(o) => !o && setCheckoutTest(null)}
          testId={checkoutTest.id}
          testName={checkoutTest.name}
          priceInr={Number(checkoutTest.price_inr)}
          onEnrolled={() => navigate(`/mocks/thank-you?test=${checkoutTest.slug}`)}
        />
      )}
    </div>
  );
}
