import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BookOpenCheck,
  Trophy,
  TrendingUp,
  Flame,
  CheckCircle2,
  Clock,
  Target,
  Bell,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function StudentOverview() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: e }, { data: a }, { data: g }, { data: ann }] = await Promise.all([
        supabase
          .from("mock_enrollments")
          .select("id, test_id, source, expires_at, enrolled_at, test:mock_tests(name, slug, total_duration_minutes)")
          .eq("user_id", user.id)
          .order("enrolled_at", { ascending: false }),
        supabase
          .from("mock_attempts")
          .select("id, test_id, status, started_at, submitted_at, total_score, max_score, percentile, total_correct, total_attempted, accuracy, test:mock_tests(name, slug)")
          .eq("user_id", user.id)
          .order("started_at", { ascending: false }),
        supabase
          .from("student_goals")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_completed", false)
          .order("due_date", { ascending: true })
          .limit(3),
        supabase
          .from("student_announcements")
          .select("*")
          .eq("is_active", true)
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(3),
      ]);
      setEnrollments(e ?? []);
      setAttempts(a ?? []);
      setGoals(g ?? []);
      setAnnouncements(ann ?? []);
      setLoading(false);
    })();
  }, [user]);

  const stats = useMemo(() => {
    const submitted = attempts.filter((x) => x.status === "submitted" || x.status === "auto_submitted");
    const inProgress = attempts.filter((x) => x.status === "in_progress");
    const avgPercentile = submitted.length
      ? Math.round((submitted.reduce((s, x) => s + Number(x.percentile || 0), 0) / submitted.length) * 10) / 10
      : 0;
    const bestPercentile = submitted.length
      ? Math.max(...submitted.map((x) => Number(x.percentile || 0)))
      : 0;
    const accuracy = submitted.length
      ? Math.round(
          submitted.reduce((s, x) => s + Number(x.accuracy || 0), 0) / submitted.length
        )
      : 0;

    // streak: count distinct days with submitted attempts in the last 14 days
    const days = new Set(
      submitted
        .filter((x) => x.submitted_at)
        .map((x) => new Date(x.submitted_at).toDateString())
    );
    return {
      enrolledCount: enrollments.length,
      submittedCount: submitted.length,
      inProgressCount: inProgress.length,
      avgPercentile,
      bestPercentile,
      accuracy,
      streak: days.size,
    };
  }, [enrollments, attempts]);

  const trendData = useMemo(() => {
    const submitted = attempts
      .filter((x) => x.status === "submitted" || x.status === "auto_submitted")
      .slice()
      .reverse();
    return submitted.slice(-10).map((x, i) => ({
      name: `M${i + 1}`,
      percentile: Number(x.percentile || 0),
      score: Number(x.total_score || 0),
    }));
  }, [attempts]);

  const resumeMock = attempts.find((x) => x.status === "in_progress");
  const nextMock = enrollments.find(
    (e) => !attempts.some((a) => a.test_id === e.test_id && (a.status === "in_progress" || a.status === "submitted" || a.status === "auto_submitted"))
  );

  if (loading) return <div className="text-muted-foreground">Loading dashboard…</div>;

  return (
    <div className="space-y-6">
      {/* Hero greeting */}
      <Card className="p-6 bg-gradient-to-br from-sky-500 to-blue-600 text-white border-0 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Your CAT prep at a glance</h1>
            <p className="text-sky-100 mt-1 text-sm">
              {stats.submittedCount > 0
                ? `You've completed ${stats.submittedCount} mock${stats.submittedCount > 1 ? "s" : ""} • Best %ile ${stats.bestPercentile}`
                : "Take your first mock to unlock AI insights and percentile predictions."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {resumeMock ? (
              <Link to={`/mocks/attempt/${resumeMock.id}`}>
                <Button size="lg" variant="secondary" className="gap-2">
                  <Clock className="h-4 w-4" /> Resume Mock
                </Button>
              </Link>
            ) : nextMock?.test?.slug ? (
              <Link to={`/mocks/${nextMock.test.slug}`}>
                <Button size="lg" variant="secondary" className="gap-2">
                  Start Next Mock <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link to="/mocks">
                <Button size="lg" variant="secondary" className="gap-2">
                  Browse Mocks <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </Card>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile icon={BookOpenCheck} label="Enrolled" value={stats.enrolledCount} accent="from-sky-500 to-blue-600" />
        <StatTile icon={CheckCircle2} label="Completed" value={stats.submittedCount} accent="from-emerald-500 to-teal-600" />
        <StatTile icon={Trophy} label="Best %ile" value={stats.bestPercentile} accent="from-amber-500 to-orange-600" />
        <StatTile icon={Flame} label="Active Days" value={stats.streak} accent="from-rose-500 to-pink-600" />
      </div>

      {/* Performance trend + quick actions */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-sky-600" /> Percentile trend
              </h2>
              <p className="text-xs text-muted-foreground">Last {trendData.length} mocks</p>
            </div>
            <Link to="/student/performance" className="text-xs text-sky-700 hover:underline">
              View detailed analysis →
            </Link>
          </div>
          {trendData.length === 0 ? (
            <div className="h-48 grid place-items-center text-sm text-muted-foreground">
              Take a mock to see your trend chart
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="percentile" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-sky-600" /> Active goals
          </h2>
          {goals.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No active goals.{" "}
              <Link to="/student/goals" className="text-sky-700 hover:underline">
                Set one →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((g) => {
                const pct = g.target_value
                  ? Math.min(100, Math.round((Number(g.current_value || 0) / Number(g.target_value)) * 100))
                  : 0;
                return (
                  <div key={g.id}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium truncate">{g.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {g.current_value || 0}/{g.target_value || "—"} {g.unit}
                      </span>
                    </div>
                    <Progress value={pct} className="h-2 mt-1" />
                  </div>
                );
              })}
            </div>
          )}
          <Link to="/student/goals">
            <Button variant="outline" size="sm" className="w-full mt-4">
              Manage goals
            </Button>
          </Link>
        </Card>
      </div>

      {/* Recent attempts + Announcements */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent attempts</h2>
            <Link to="/student/mocks" className="text-xs text-sky-700 hover:underline">
              View all →
            </Link>
          </div>
          {attempts.length === 0 ? (
            <div className="text-sm text-muted-foreground">No attempts yet.</div>
          ) : (
            <div className="divide-y">
              {attempts.slice(0, 5).map((a) => (
                <div key={a.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{a.test?.name ?? "Mock"}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(a.started_at).toLocaleDateString()} ·{" "}
                      <StatusLabel status={a.status} />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {a.status !== "in_progress" && (
                      <div className="text-right">
                        <div className="text-sm font-semibold">{a.total_score ?? 0}/{a.max_score ?? 0}</div>
                        <div className="text-[11px] text-muted-foreground">%ile {a.percentile ?? 0}</div>
                      </div>
                    )}
                    {a.status === "in_progress" ? (
                      <Link to={`/mocks/attempt/${a.id}`}>
                        <Button size="sm">Resume</Button>
                      </Link>
                    ) : (
                      <Link to={`/mocks/result/${a.id}`}>
                        <Button size="sm" variant="outline">View</Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-sky-600" /> Announcements
          </h2>
          {announcements.length === 0 ? (
            <div className="text-sm text-muted-foreground">No new announcements.</div>
          ) : (
            <div className="space-y-3">
              {announcements.map((n) => (
                <div key={n.id} className="border-l-2 border-sky-400 pl-3 py-1">
                  <div className="flex items-center gap-2">
                    {n.pinned && <Badge variant="secondary" className="text-[10px] h-4">Pinned</Badge>}
                    <div className="font-medium text-sm">{n.title}</div>
                  </div>
                  {n.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{n.body}</p>}
                  {n.link_url && (
                    <a href={n.link_url} className="text-xs text-sky-700 hover:underline mt-1 inline-block">
                      {n.link_label || "Open"} →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* AI tools */}
      <Card className="p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-sky-600" /> Free AI tools — included with your account
        </h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <ToolCard title="AI Profile Analyzer" desc="Get an MBA admission probability score." href="/profile-analyzer" />
          <ToolCard title="College Shortlister" desc="Personalized college list based on your CAT %ile." href="/college-shortlister" />
          <ToolCard title="MBA ROI Calculator" desc="Project your ROI across top B-schools." href="/roi-calculator" />
        </div>
      </Card>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, accent }: any) {
  return (
    <Card className="p-4 relative overflow-hidden">
      <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full bg-gradient-to-br ${accent} opacity-10`} />
      <Icon className="h-5 w-5 text-sky-600" />
      <div className="text-2xl font-bold mt-2">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}

function StatusLabel({ status }: { status: string }) {
  const map: Record<string, string> = {
    in_progress: "In progress",
    submitted: "Completed",
    auto_submitted: "Auto-submitted",
    abandoned: "Abandoned",
  };
  return <span>{map[status] ?? status}</span>;
}

function ToolCard({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link
      to={href}
      className="block p-4 rounded-xl border border-sky-100 hover:border-sky-300 hover:shadow-sm transition-all bg-gradient-to-br from-white to-sky-50/30"
    >
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{desc}</div>
      <div className="text-xs text-sky-700 mt-2 font-medium">Open tool →</div>
    </Link>
  );
}
