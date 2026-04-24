import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, FileText, IndianRupee, Layers } from "lucide-react";
import { MockCheckoutDialog } from "@/components/mock/MockCheckoutDialog";
import { toast } from "sonner";


interface MockTest {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  test_type: string;
  total_duration_minutes: number;
  pricing_type: string;
  price_inr: number;
  difficulty: string;
  banner_url: string | null;
}

export default function MocksListPage() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<MockTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const [checkoutTest, setCheckoutTest] = useState<MockTest | null>(null);

  const loadEnrollments = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase
      .from("mock_enrollments")
      .select("test_id, expires_at")
      .eq("user_id", u.user.id);
    const now = new Date();
    setEnrolled(
      new Set(
        (data ?? [])
          .filter((r: any) => !r.expires_at || new Date(r.expires_at) > now)
          .map((r: any) => r.test_id),
      ),
    );
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mock_tests")
        .select("id, slug, name, description, test_type, total_duration_minutes, pricing_type, price_inr, difficulty, banner_url")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      setTests((data ?? []) as MockTest[]);
      await loadEnrollments();
      setLoading(false);
    })();
  }, []);

  const handleCta = async (t: MockTest) => {
    if (t.pricing_type === "free" || enrolled.has(t.id)) {
      navigate(`/mocks/${t.slug}`);
      return;
    }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.error("Please sign in to enroll");
      navigate(`/auth?redirect=/mocks`);
      return;
    }
    setCheckoutTest(t);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      

      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold">CAT Mock Tests</h1>
        <p className="text-muted-foreground mt-2">
          Real CAT interface · server-side timing · sectional locks · instant analytics
        </p>
      </header>

      {loading ? (
        <p className="text-muted-foreground">Loading mocks…</p>
      ) : tests.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No mocks published yet.</Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tests.map((t) => (
            <Card key={t.id} className="p-5 flex flex-col gap-4 hover:shadow-md transition">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold text-lg leading-snug">{t.name}</h2>
                <Badge variant={t.pricing_type === "free" ? "secondary" : "default"}>
                  {t.pricing_type === "free" ? "Free" : `₹${t.price_inr}`}
                </Badge>
              </div>
              {t.description && (
                <p className="text-sm text-muted-foreground line-clamp-3">{t.description}</p>
              )}
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{t.total_duration_minutes} min</span>
                <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" />{t.test_type.replace("_", " ")}</span>
                <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />{t.difficulty}</span>
              </div>
              <Button onClick={() => handleCta(t)} className="mt-auto">
                {t.pricing_type === "free" || enrolled.has(t.id) ? (
                  "Start Mock"
                ) : (
                  <span className="flex items-center gap-1"><IndianRupee className="h-4 w-4" />Enroll · ₹{t.price_inr}</span>
                )}
              </Button>
            </Card>
          ))}
        </div>
      )}

      {checkoutTest && (
        <MockCheckoutDialog
          open={!!checkoutTest}
          onOpenChange={(o) => !o && setCheckoutTest(null)}
          testId={checkoutTest.id}
          testName={checkoutTest.name}
          priceInr={Number(checkoutTest.price_inr)}
          onEnrolled={() => loadEnrollments()}
        />
      )}
    </div>
  );
}
