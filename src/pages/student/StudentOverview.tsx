import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BookOpenCheck, Trophy, TrendingUp, Flame, CheckCircle2, Clock, Target, Bell,
  ArrowRight, Sparkles, Zap, ShoppingBag, BarChart3, Activity, Brain,
} from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, BarChart, Bar, RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";

const SECTIONS = ["QA", "VARC", "DILR"] as const;

export default function StudentOverview() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [weak, setWeak] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [
        { data: e }, { data: a }, { data: g }, { data: ann }, { data: pf }, { data: tk }, { data: wk },
      ] = await Promise.all([
        supabase.from("mock_enrollments")
          .select("id, test_id, source, expires_at, enrolled_at, test:mock_tests(name, slug, exam_code)")
          .eq("user_id", user.id).order("enrolled_at", { ascending: false }),
        supabase.from("mock_attempts")
          .select("id, test_id, status, started_at, submitted_at, total_score, max_score, percentile, total_correct, total_attempted, accuracy, sectional_scores, test:mock_tests(name, slug)")
          .eq("user_id", user.id).order("started_at", { ascending: false }),
        supabase.from("student_goals").select("*").eq("user_id", user.id).eq("is_completed", false)
          .order("due_date", { ascending: true }).limit(3),
        supabase.from("student_announcements").select("*").eq("is_active", true)
          .order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(3),
        supabase.from("student_study_profile").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("student_daily_tasks").select("*").eq("user_id", user.id).eq("task_date", today),
        supabase.from("student_weak_topics").select("*").eq("user_id", user.id).order("level", { ascending: true }).limit(12),
      ]);
      setEnrollments(e ?? []);
      setAttempts(a ?? []);
      setGoals(g ?? []);
      setAnnouncements(ann ?? []);
      setProfile(pf);
      setTasks(tk ?? []);
      setWeak(wk ?? []);
      setLoading(false);
    })();
  }, [user]);

  const stats = useMemo(() => {
    const submitted = attempts.filter((x) => x.status === "submitted" || x.status === "auto_submitted");
    const inProgress = attempts.filter((x) => x.status === "in_progress");
    const avgPercentile = submitted.length
      ? Math.round((submitted.reduce((s, x) => s + Number(x.percentile || 0), 0) / submitted.length) * 10) / 10 : 0;
    const bestPercentile = submitted.length ? Math.max(...submitted.map((x) => Number(x.percentile || 0))) : 0;
    const accuracy = submitted.length
      ? Math.round(submitted.reduce((s, x) => s + Number(x.accuracy || 0), 0) / submitted.length) : 0;
    const totalAttempted = submitted.reduce((s, x) => s + Number(x.total_attempted || 0), 0);
    // streak: distinct days in last 30
    const days = new Set(
      submitted.filter((x) => x.submitted_at).map((x) => new Date(x.submitted_at).toDateString())
    );
    return {
      enrolledCount: enrollments.length,
      submittedCount: submitted.length,
      inProgressCount: inProgress.length,
      avgPercentile, bestPercentile, accuracy,
      totalAttempted, streak: days.size,
    };
  }, [enrollments, attempts]);

  // Percentile predictor: weighted avg of last 5 attempts, blended toward target
  const predicted = useMemo(() => {
    const last = attempts
      .filter((x) => x.status === "submitted" || x.status === "auto_submitted")
      .slice(0, 5).map((x) => Number(x.percentile || 0));
    if (!last.length) return null;
    const weights = last.map((_, i) => 5 - i);
    const wsum = weights.reduce((a, b) => a + b, 0);
    const w = last.reduce((s, v, i) => s + v * weights[i], 0) / wsum;
    const target = Number(profile?.target_percentile || 0);
    // Slight upward drift if consistent improvement
    const trend = last.length >= 3 ? (last[0] - last[last.length - 1]) / last.length : 0;
    return Math.max(0, Math.min(99.9, +(w + trend * 0.5).toFixed(1))) || 0;
  }, [attempts, profile]);

  const trendData = useMemo(() => {
    const submitted = attempts
      .filter((x) => x.status === "submitted" || x.status === "auto_submitted").slice().reverse();
    return submitted.slice(-10).map((x, i) => ({
      name: `M${i + 1}`,
      percentile: Number(x.percentile || 0),
      score: Number(x.total_score || 0),
      accuracy: Number(x.accuracy || 0),
    }));
  }, [attempts]);

  const sectional = useMemo(() => {
    const sums: Record<string, { total: number; count: number }> = {};
    for (const a of attempts) {
      const ss = a.sectional_scores || {};
      for (const k of Object.keys(ss)) {
        const v = Number((ss as any)[k]?.percentile ?? (ss as any)[k]?.score ?? 0);
        if (!sums[k]) sums[k] = { total: 0, count: 0 };
        sums[k].total += v; sums[k].count += 1;
      }
    }
    return Object.entries(sums).map(([k, v]) => ({ name: k, value: Math.round(v.total / Math.max(1, v.count)) }));
  }, [attempts]);

  const taskProgress = tasks.length
    ? Math.round((tasks.filter((t) => t.is_completed).length / tasks.length) * 100) : 0;

  const resumeMock = attempts.find((x) => x.status === "in_progress");
  const nextMock = enrollments.find(
    (e) => !attempts.some((a) => a.test_id === e.test_id && (a.status === "in_progress" || a.status === "submitted" || a.status === "auto_submitted"))
  );

  if (loading) return <div className="text-muted-foreground">Loading dashboard…</div>;

  const noProfile = !profile;
  const target = Number(profile?.target_percentile || 0);
  const gap = target && predicted != null ? +(target - predicted).toFixed(1) : null;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="p-6 bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-600 text-white border-0 shadow-xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-sm text-sky-100 mb-1">CAT 2026 Improvement Engine</div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {predicted != null ? `Projected: ${predicted}%ile` : "Welcome to your prep cockpit"}
            </h1>
            <p className="text-sky-100 mt-1 text-sm">
              {target && gap != null
                ? gap > 0
                  ? `${gap} %ile away from your ${target}%ile target — keep grinding.`
                  : `You're already ahead of your ${target}%ile target. Push higher!`
                : stats.submittedCount > 0
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
              <Link to="/student/buy-mocks">
                <Button size="lg" variant="secondary" className="gap-2">
                  <ShoppingBag className="h-4 w-4" /> Buy Mocks
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Inline KPI strip */}
        <div className="relative mt-5 grid grid-cols-2 md:grid-cols-5 gap-2 text-white/95">
          <Kpi label="Enrolled" value={stats.enrolledCount} />
          <Kpi label="Completed" value={stats.submittedCount} />
          <Kpi label="Best %ile" value={stats.bestPercentile} />
          <Kpi label="Accuracy" value={`${stats.accuracy}%`} />
          <Kpi label="Streak" value={`${stats.streak}d`} icon={<Flame className="h-3.5 w-3.5" />} />
        </div>
      </Card>

      {/* Setup banner if no profile */}
      {noProfile && (
        <Card className="p-5 border-sky-200 bg-sky-50/50">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-sky-100 grid place-items-center">
              <Sparkles className="h-5 w-5 text-sky-700" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">Set up your CAT Score Engine</div>
              <p className="text-sm text-muted-foreground">
                Tell us your target percentile, weak areas and study hours — we'll generate a personalised AI plan.
              </p>
            </div>
            <Link to="/student/goals">
              <Button>Set up now <ArrowRight className="h-4 w-4 ml-1" /></Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile icon={BookOpenCheck} label="Enrolled" value={stats.enrolledCount} accent="from-sky-500 to-blue-600" />
        <StatTile icon={CheckCircle2} label="Completed" value={stats.submittedCount} accent="from-emerald-500 to-teal-600" />
        <StatTile icon={Trophy} label="Best %ile" value={stats.bestPercentile} accent="from-amber-500 to-orange-600" />
        <StatTile icon={Activity} label="Questions" value={stats.totalAttempted} accent="from-rose-500 to-pink-600" />
      </div>

      {/* Predictor + trend */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-1">
            <Brain className="h-4 w-4 text-sky-600" /> Percentile Predictor
          </h2>
          <p className="text-xs text-muted-foreground mb-3">Weighted projection from your last 5 mocks.</p>
          {predicted == null ? (
            <div className="h-44 grid place-items-center text-sm text-muted-foreground text-center px-4">
              Submit at least one mock to see your projection.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={170}>
              <RadialBarChart innerRadius="65%" outerRadius="100%" data={[{ name: "p", value: predicted, fill: "#0284c7" }]} startAngle={210} endAngle={-30}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar background dataKey="value" cornerRadius={20} />
              </RadialBarChart>
            </ResponsiveContainer>
          )}
          {predicted != null && (
            <div className="text-center -mt-24 mb-6">
              <div className="text-3xl font-bold text-sky-700">{predicted}</div>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">projected %ile</div>
            </div>
          )}
          {target > 0 && predicted != null && (
            <div className="mt-4 text-xs flex items-center justify-between">
              <span className="text-muted-foreground">Target {target}%ile</span>
              <Badge variant={predicted >= target ? "default" : "secondary"}>
                {predicted >= target ? "On track" : `Gap ${(target - predicted).toFixed(1)}`}
              </Badge>
            </div>
          )}
        </Card>

        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-sky-600" /> Mock Score Trend
              </h2>
              <p className="text-xs text-muted-foreground">Last {trendData.length} mocks</p>
            </div>
            <Link to="/student/performance" className="text-xs text-sky-700 hover:underline">
              Detailed analysis →
            </Link>
          </div>
          {trendData.length === 0 ? (
            <div className="h-48 grid place-items-center text-sm text-muted-foreground">
              Take a mock to see your trend chart
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="pgrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip />
                <Area type="monotone" dataKey="percentile" stroke="#0284c7" strokeWidth={2.5} fill="url(#pgrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Today's plan + Sectional + Weak heatmap */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-sky-600" /> Today's Sprint
            </h2>
            <Link to="/student/goals" className="text-xs text-sky-700 hover:underline">Open planner →</Link>
          </div>
          {tasks.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No tasks scheduled for today.{" "}
              <Link to="/student/goals" className="text-sky-700 hover:underline">Generate plan →</Link>
            </div>
          ) : (
            <>
              <Progress value={taskProgress} className="h-2 mb-3" />
              <div className="space-y-2">
                {tasks.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm">
                    <span className={`h-2 w-2 rounded-full ${t.is_completed ? "bg-emerald-500" : "bg-sky-300"}`} />
                    <span className={`flex-1 truncate ${t.is_completed ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                    {t.section && <Badge variant="outline" className="text-[10px]">{t.section}</Badge>}
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-sky-600" /> Section Strength
          </h2>
          {sectional.length === 0 ? (
            <div className="h-40 grid place-items-center text-sm text-muted-foreground text-center">
              No sectional data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={sectional}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip />
                <Bar dataKey="value" fill="#0284c7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <Target className="h-4 w-4 text-sky-600" /> Weak Topic Heatmap
          </h2>
          {weak.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Complete a mock and review topics to populate this heatmap.
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {weak.map((w) => (
                <div
                  key={w.id}
                  title={`${w.topic} • ${w.section} • ${w.level}`}
                  className={`text-[10px] px-2 py-2 rounded-md text-center truncate ${
                    w.level === "red" ? "bg-rose-100 text-rose-800 border border-rose-200"
                    : w.level === "yellow" ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  {w.topic}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Goals + Recent + Announcements */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Recent attempts</h2>
            <Link to="/student/mocks" className="text-xs text-sky-700 hover:underline">View all →</Link>
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
                      {new Date(a.started_at).toLocaleDateString()} · <StatusLabel status={a.status} />
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
                      <Link to={`/mocks/attempt/${a.id}`}><Button size="sm">Resume</Button></Link>
                    ) : (
                      <Link to={`/mocks/result/${a.id}`}><Button size="sm" variant="outline">View</Button></Link>
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

      {/* Free AI tools */}
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

function Kpi({ label, value, icon }: any) {
  return (
    <div className="bg-white/15 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
      <div className="text-[10px] uppercase tracking-wider text-white/80 flex items-center gap-1">
        {icon} {label}
      </div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, accent }: any) {
  return (
    <Card className="p-4 relative overflow-hidden">
      <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full bg-gradient-to-br ${accent} opacity-10 pointer-events-none`} />
      <Icon className="h-5 w-5 text-sky-600" />
      <div className="text-2xl font-bold mt-2">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}
function StatusLabel({ status }: { status: string }) {
  const map: Record<string, string> = {
    in_progress: "In progress", submitted: "Completed", auto_submitted: "Auto-submitted", abandoned: "Abandoned",
  };
  return <span>{map[status] ?? status}</span>;
}
function ToolCard({ title, desc, href }: any) {
  return (
    <Link to={href} className="block p-4 rounded-xl border border-sky-100 hover:border-sky-300 hover:shadow-sm transition-all bg-gradient-to-br from-white to-sky-50/30">
      <div className="font-semibold text-sm">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{desc}</div>
      <div className="text-xs text-sky-700 mt-2 font-medium">Open tool →</div>
    </Link>
  );
}
