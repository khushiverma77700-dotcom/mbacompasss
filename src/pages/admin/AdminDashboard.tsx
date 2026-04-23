import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, BookOpen, Newspaper, MessageSquare, Users, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MetaPassRateWidget from "@/components/admin/MetaPassRateWidget";

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
    const fetchStats = async () => {
      const [inst, crs, art, inq, col, sub] = await Promise.all([
        supabase.from("institutes").select("id", { count: "exact", head: true }),
        supabase.from("courses").select("id", { count: "exact", head: true }),
        supabase.from("articles").select("id", { count: "exact", head: true }),
        supabase.from("inquiries").select("id", { count: "exact", head: true }),
        supabase.from("colleges").select("id", { count: "exact", head: true }),
        supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        institutes: inst.count ?? 0,
        courses: crs.count ?? 0,
        articles: art.count ?? 0,
        inquiries: inq.count ?? 0,
        colleges: col.count ?? 0,
        subscribers: sub.count ?? 0,
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
        <MetaPassRateWidget />
      </div>
    </div>
  );
};

export default AdminDashboard;
