import { lazy, Suspense, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, BookOpen, Newspaper, MessageSquare, Users, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LazyMount } from "@/hooks/useInView";

const MetaPassRateWidget = lazy(() => import("@/components/admin/MetaPassRateWidget"));

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    institutes: 0,
    courses: 0,
    articles: 0,
    inquiries: 0,
    colleges: 0,
    subscribers: 0,
  });

  useEffect(() => {
    const TABLES = [
      "institutes",
      "courses",
      "articles",
      "inquiries",
      "colleges",
      "newsletter_subscribers",
    ] as const;

    const exactCounts = async () => {
      const results = await Promise.all(
        TABLES.map(async (t) => {
          const { count } = await supabase.from(t).select("id", { count: "exact", head: true });
          return [t, count ?? 0] as const;
        }),
      );
      return new Map<string, number>(results);
    };

    // Fast path: planner row estimates in one round-trip. They can be stale or
    // zero for never-analyzed tables, so fall back to exact counts whenever the
    // RPC errors or returns anything non-positive.
    const fetchStats = async () => {
      let map = new Map<string, number>();
      const { data, error } = await supabase.rpc("admin_table_row_estimates");
      if (!error && data) {
        map = new Map<string, number>(
          (data ?? []).map((r: any) => [r.table_name as string, Number(r.row_estimate) || 0]),
        );
      }
      const needsExact = TABLES.some((t) => !((map.get(t) ?? 0) > 0));
      if (needsExact) {
        try {
          map = await exactCounts();
        } catch {
          /* keep estimates */
        }
      }
      setStats({
        institutes: map.get("institutes") ?? 0,
        courses: map.get("courses") ?? 0,
        articles: map.get("articles") ?? 0,
        inquiries: map.get("inquiries") ?? 0,
        colleges: map.get("colleges") ?? 0,
        subscribers: map.get("newsletter_subscribers") ?? 0,
      });
    };
    fetchStats();
  }, []);


  const cards = [
    { label: "Institutes", value: stats.institutes, icon: Building2 },
    { label: "Courses", value: stats.courses, icon: BookOpen },
    { label: "Articles", value: stats.articles, icon: Newspaper },
    { label: "Inquiries", value: stats.inquiries, icon: MessageSquare },
    { label: "Colleges", value: stats.colleges, icon: Users },
    { label: "Subscribers", value: stats.subscribers, icon: Mail },
  ];

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6 text-foreground">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-heading text-foreground">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-6">
        <LazyMount rootMargin="100px" minHeight={260}>
          <Suspense fallback={<div className="h-64 rounded-lg border border-dashed border-border" aria-hidden="true" />}>
            <MetaPassRateWidget />
          </Suspense>
        </LazyMount>
      </div>
    </div>
  );
};

export default AdminDashboard;
