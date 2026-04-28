import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, CheckCircle2, Loader2, ShieldCheck, Sparkles, Award, ChevronRight, Star, Users, TrendingUp, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";

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

export default function MockBundleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [bundle, setBundle] = useState<any | null>(null);
  const [mocks, setMocks] = useState<any[]>([]);
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
      setMocks((b?.items ?? []).map((i: any) => i.test).filter(Boolean));

      // Related bundles
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

  if (loading) return <div className="container mx-auto px-4 py-12 text-muted-foreground">Loading…</div>;
  if (!bundle) return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Bundle not found</h1>
      <Button asChild className="mt-4"><Link to="/courses">Browse all bundles</Link></Button>
    </div>
  );

  const price = Number(bundle.price_inr);
  const original = bundle.original_price_inr ? Number(bundle.original_price_inr) : null;
  const discountPct = original && original > price ? Math.round(((original - price) / original) * 100) : 0;

  return (
    <div className="bg-background min-h-screen">
      <SEOHead title={`${bundle.name} | MBA Compass`} description={bundle.description ?? `${bundle.name} mock test bundle.`} />

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
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-br from-slate-900 via-sky-900 to-sky-700 bg-clip-text text-transparent">
                  {bundle.name}
                </h1>
                {bundle.description && <p className="text-muted-foreground mt-3 text-base leading-relaxed">{bundle.description}</p>}
              </div>

              {/* Trust pills */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: Sparkles, l: "Instant unlock" },
                  { icon: TrendingUp, l: "AI Analytics" },
                  { icon: Award, l: "Topper-grade" },
                  { icon: ShieldCheck, l: "Secure payment" },
                ].map((p, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-sky-100 shadow-sm">
                    <p.icon className="h-4 w-4 text-sky-600 shrink-0" />
                    <span className="text-xs font-medium">{p.l}</span>
                  </div>
                ))}
              </div>

              {/* Included mocks */}
              <Card className="p-6 border-sky-100">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-sky-600" /> What's included ({mocks.length})
                </h2>
                {mocks.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-3">No mocks linked yet.</p>
                ) : (
                  <ul className="space-y-2 mt-4">
                    {mocks.map((m) => (
                      <li key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-sky-50/40 border border-sky-100">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                        <span className="flex-1 text-sm font-medium">{m.name}</span>
                        {m.exam_code && <Badge variant="outline" className="text-[10px]">{m.exam_code}</Badge>}
                        {m.total_duration_minutes && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {m.total_duration_minutes}m
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            {/* Sticky purchase card */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-4 border-2 border-sky-200 shadow-2xl rounded-2xl bg-white/95 backdrop-blur-xl">
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
                    "Instant unlock in dashboard",
                    "AI-powered analysis on every attempt",
                    "Sectional & overall percentile",
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
                      {paying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Buy Bundle
                    </Button>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" /> Secure</span>
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" /> 10k+ aspirants</span>
                </div>

                <p className="text-xs text-muted-foreground mt-3 text-center">
                  All mocks unlock instantly after payment.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* RELATED BUNDLES (always present) */}
      {related.length > 0 && (
        <section className="py-14 bg-gradient-to-b from-white via-sky-50/40 to-white">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="flex items-end justify-between flex-wrap gap-3 mb-6">
              <div>
                <Badge className="mb-2 bg-sky-100 text-sky-800 hover:bg-sky-100 border-sky-200">More bundles</Badge>
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
