import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ShoppingBag, Clock, Sparkles, ArrowRight, BookOpen } from "lucide-react";

export default function StudentBuyMocks() {
  const { user } = useAuth();
  const [tests, setTests] = useState<any[]>([]);
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: e }] = await Promise.all([
        supabase
          .from("mock_tests")
          .select("id, slug, name, description, banner_url, exam_code, category, difficulty, total_duration_minutes, price_inr, pricing_type, is_published, is_live, scheduled_start_at, launch_date")
          .eq("is_published", true)
          .order("created_at", { ascending: false }),
        user
          ? supabase.from("mock_enrollments").select("test_id").eq("user_id", user.id)
          : Promise.resolve({ data: [] }),
      ]);
      setTests(t || []);
      setEnrolled(new Set((e || []).map((x: any) => x.test_id)));
      setLoading(false);
    })();
  }, [user]);

  const groups = useMemo(() => groupByExam(tests.filter((t) => !enrolled.has(t.id))), [tests, enrolled]);

  if (loading) return <div className="text-muted-foreground">Loading mock catalog…</div>;

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-sky-500 to-blue-600 text-white border-0 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <ShoppingBag className="h-6 w-6" /> Buy More Mocks
            </h1>
            <p className="text-sky-100 mt-1 text-sm">Expand your prep — add CAT, XAT, SNAP and more series to your dashboard.</p>
          </div>
          <Link to="/mocks">
            <Button variant="secondary" size="lg" className="gap-2">View landing page <ArrowRight className="h-4 w-4" /></Button>
          </Link>
        </div>
      </Card>

      <Tabs defaultValue="all">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">All ({Object.values(groups).flat().length})</TabsTrigger>
          {Object.entries(groups).map(([k, v]) => (
            <TabsTrigger key={k} value={k}>{k} ({(v as any[]).length})</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <Grid items={Object.values(groups).flat()} />
        </TabsContent>
        {Object.entries(groups).map(([k, v]) => (
          <TabsContent key={k} value={k} className="mt-4">
            <Grid items={v as any[]} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function groupByExam(items: any[]) {
  const out: Record<string, any[]> = {};
  for (const t of items) {
    const k = (t.exam_code || t.category || "Other").toUpperCase();
    if (!out[k]) out[k] = [];
    out[k].push(t);
  }
  return out;
}

function Grid({ items }: { items: any[] }) {
  if (!items.length)
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Nothing new here — you've enrolled in everything in this category.
      </Card>
    );
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((t) => (
        <Card key={t.id} className="overflow-hidden hover:shadow-md transition-all flex flex-col">
          <div className="aspect-[16/9] bg-gradient-to-br from-sky-100 to-blue-50 relative overflow-hidden">
            {t.banner_url ? (
              <img src={t.banner_url} alt={t.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="absolute inset-0 grid place-items-center text-sky-300">
                <BookOpen className="h-10 w-10" />
              </div>
            )}
            {t.is_live && <Badge className="absolute top-2 left-2 bg-rose-500">LIVE</Badge>}
          </div>
          <div className="p-4 flex-1 flex flex-col">
            <div className="flex items-center gap-2 mb-1 text-xs">
              {t.exam_code && <Badge variant="outline">{t.exam_code}</Badge>}
              {t.difficulty && <span className="text-muted-foreground capitalize">{t.difficulty}</span>}
            </div>
            <div className="font-semibold leading-tight">{t.name}</div>
            {t.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
            )}
            <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Clock className="h-3 w-3" /> {t.total_duration_minutes ?? "—"} min
            </div>
            <div className="mt-auto pt-3 flex items-center justify-between gap-2">
              <div>
                {t.pricing_type === "free" || Number(t.price_inr) === 0 ? (
                  <span className="text-emerald-600 font-bold">FREE</span>
                ) : (
                  <span className="font-bold">₹{Number(t.price_inr || 0).toLocaleString("en-IN")}</span>
                )}
              </div>
              <Link to={`/mocks/${t.slug}`}>
                <Button size="sm" className="gap-1">
                  <Sparkles className="h-3 w-3" /> View
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
