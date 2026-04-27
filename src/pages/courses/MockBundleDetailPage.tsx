import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: b } = await supabase
        .from("mock_bundles")
        .select("*, items:mock_bundle_items(test:mock_tests(id, name, slug, total_duration_minutes, exam_code, difficulty))")
        .eq("slug", slug).eq("is_published", true).maybeSingle();
      setBundle(b);
      setMocks((b?.items ?? []).map((i: any) => i.test).filter(Boolean));
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

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl">
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {bundle.cover_image_url ? (
            <img src={bundle.cover_image_url} alt={bundle.name} className="w-full rounded-lg object-cover max-h-72" loading="lazy" />
          ) : (
            <div className="w-full h-56 bg-gradient-to-br from-sky-100 to-blue-50 rounded-lg flex items-center justify-center">
              <Package className="h-16 w-16 text-sky-400" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 mb-2">
              {bundle.exam_code && <Badge variant="outline">{bundle.exam_code}</Badge>}
              <Badge variant="secondary">{mocks.length} mocks included</Badge>
            </div>
            <h1 className="text-3xl font-bold">{bundle.name}</h1>
            {bundle.description && <p className="text-muted-foreground mt-3">{bundle.description}</p>}
          </div>

          <Card className="p-5">
            <h2 className="font-semibold mb-3">What's included</h2>
            {mocks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No mocks linked yet.</p>
            ) : (
              <ul className="space-y-2">
                {mocks.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-sky-600 shrink-0" />
                    <span className="flex-1">{m.name}</span>
                    {m.total_duration_minutes && <span className="text-xs text-muted-foreground">{m.total_duration_minutes} min</span>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="p-5 sticky top-4">
            <div className="text-3xl font-bold text-sky-600">₹{Number(bundle.price_inr).toLocaleString()}</div>
            <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Clock className="h-4 w-4" /> {bundle.validity_days} days access
            </div>
            <div className="mt-5">
              {enrolled ? (
                <Button asChild className="w-full"><Link to="/student/mocks">Go to My Mocks</Link></Button>
              ) : (
                <Button onClick={handlePay} disabled={paying} className="w-full">
                  {paying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Buy Bundle
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              All mocks unlock instantly in your student dashboard after payment.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
