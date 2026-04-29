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
  ArrowRight, Sparkles, Zap, ShoppingBag, BarChart3, Activity, Brain, Timer,
  Percent, ListChecks, Gauge, LineChart as LineIcon, Award, AlertTriangle,
  CalendarDays, GraduationCap, Rocket, ChevronRight, Star, Compass, Layers,
} from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  AreaChart, Area, BarChart, Bar, RadialBarChart, RadialBar, PolarAngleAxis,
  ComposedChart, Legend, ReferenceLine,
} from "recharts";
import DailyTestCard from "@/components/student/DailyTestCard";
import { useStudentPerformance } from "@/hooks/useStudentPerformance";

const SECTION_COLORS: Record<string, string> = {
  QA: "#0284c7",
  VARC: "#0ea5e9",
  DILR: "#38bdf8",
  LRDI: "#38bdf8",
  RC: "#7dd3fc",
  GK: "#0369a1",
};

export default function StudentOverview() {
  const { user } = useAuth();
  // Central performance engine — shared with /student/performance, /student/mocks etc.
  // Realtime: auto-refreshes the moment a mock is submitted.
  const { attempts, loading: perfLoading } = useStudentPerformance();
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [goals, setGoals] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [weak, setWeak] = useState<any[]>([]);
  const [displayName, setDisplayName] = useState<string>("");
  const [examCountdowns, setExamCountdowns] = useState<any[]>([]);
  const [, setNowTick] = useState(0);
  const [sideLoading, setSideLoading] = useState(true);
  const loading = perfLoading || sideLoading;

  // Greeting changes by time of day — small touch that makes the dashboard feel alive
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);
  const todayLabel = useMemo(
    () => new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" }),
    []
  );

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [
        { data: e }, { data: g }, { data: ann }, { data: pf }, { data: tk }, { data: wk }, { data: prof },
      ] = await Promise.all([
        supabase.from("mock_enrollments")
          .select("id, test_id, source, expires_at, enrolled_at, test:mock_tests(name, slug, exam_code)")
          .eq("user_id", user.id).order("enrolled_at", { ascending: false }),
        supabase.from("student_goals").select("*").eq("user_id", user.id).eq("is_completed", false)
          .order("due_date", { ascending: true }).limit(3),
        supabase.from("student_announcements").select("*").eq("is_active", true)
          .order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(3),
        supabase.from("student_study_profile").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("student_daily_tasks").select("*").eq("user_id", user.id).eq("task_date", today),
        supabase.from("student_weak_topics").select("*").eq("user_id", user.id).order("level", { ascending: true }).limit(12),
        supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
      ]);
      setEnrollments(e ?? []);
      setGoals(g ?? []);
      setAnnouncements(ann ?? []);
      setProfile(pf);
      setTasks(tk ?? []);
      setWeak(wk ?? []);
      setDisplayName(prof?.display_name ?? user.email?.split("@")[0] ?? "Student");

      // Exam countdowns — admin-managed via the existing exams table.
      const { data: exRows } = await supabase
        .from("exams")
        .select("name, slug, exam_date")
        .not("exam_date", "is", null)
        .order("exam_date", { ascending: true });
      const upcoming = (exRows ?? [])
        .filter((x: any) => x.exam_date && new Date(x.exam_date).getTime() >= Date.now() - 86400000)
        .slice(0, 8);
      setExamCountdowns(upcoming);

      setSideLoading(false);
    })();
  }, [user]);

  // Re-render every minute so countdowns stay live without manual refresh.
  useEffect(() => {
    const id = setInterval(() => setNowTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const submitted = useMemo(
    () => attempts.filter((x) => x.status === "submitted" || x.status === "auto_submitted"),
    [attempts]
  );

  const stats = useMemo(() => {
    const inProgress = attempts.filter((x) => x.status === "in_progress");
    const avgPercentile = submitted.length
      ? +(submitted.reduce((s, x) => s + Number(x.percentile || 0), 0) / submitted.length).toFixed(1) : 0;
    const bestPercentile = submitted.length ? Math.max(...submitted.map((x) => Number(x.percentile || 0))) : 0;
    const accuracy = submitted.length
      ? Math.round(submitted.reduce((s, x) => s + Number(x.accuracy || 0), 0) / submitted.length) : 0;
    const totalAttempted = submitted.reduce((s, x) => s + Number(x.total_attempted || 0), 0);
    const totalCorrect = submitted.reduce((s, x) => s + Number(x.total_correct || 0), 0);
    const totalScore = submitted.reduce((s, x) => s + Number(x.total_score || 0), 0);
    const totalMaxScore = submitted.reduce((s, x) => s + Number(x.max_score || 0), 0);
    const avgScore = submitted.length ? +(totalScore / submitted.length).toFixed(1) : 0;
    const avgMaxScore = submitted.length ? +(totalMaxScore / submitted.length).toFixed(1) : 0;
    const avgPctScore = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;
    const totalTimeSec = submitted.reduce((s, x) => {
      if (x.started_at && x.submitted_at) {
        const diff = (new Date(x.submitted_at).getTime() - new Date(x.started_at).getTime()) / 1000;
        return s + Math.max(0, diff);
      }
      return s;
    }, 0);
    const totalHours = +(totalTimeSec / 3600).toFixed(1);
    const avgTimeMin = submitted.length ? Math.round(totalTimeSec / 60 / submitted.length) : 0;

    // Consistency = 100 - stddev of percentiles (clamped 0-100)
    let consistency = 0;
    if (submitted.length >= 2) {
      const ps = submitted.map((x) => Number(x.percentile || 0));
      const mean = ps.reduce((a, b) => a + b, 0) / ps.length;
      const variance = ps.reduce((s, v) => s + (v - mean) ** 2, 0) / ps.length;
      consistency = Math.max(0, Math.round(100 - Math.sqrt(variance)));
    }

    // Improvement: first vs last (chronological)
    const chrono = submitted.slice().reverse();
    const improvement = chrono.length >= 2
      ? +((Number(chrono[chrono.length - 1].percentile || 0)) - Number(chrono[0].percentile || 0)).toFixed(1)
      : 0;

    const days = new Set(
      submitted.filter((x) => x.submitted_at).map((x) => new Date(x.submitted_at).toDateString())
    );
    return {
      enrolledCount: enrollments.length,
      submittedCount: submitted.length,
      inProgressCount: inProgress.length,
      avgPercentile, bestPercentile, accuracy,
      totalAttempted, totalCorrect, totalScore, totalMaxScore,
      avgScore, avgMaxScore, avgPctScore,
      totalHours, avgTimeMin,
      consistency, improvement,
      streak: days.size,
    };
  }, [enrollments, attempts, submitted]);

  const predicted = useMemo(() => {
    const last = submitted.slice(0, 5).map((x) => Number(x.percentile || 0));
    if (!last.length) return null;
    const weights = last.map((_, i) => 5 - i);
    const wsum = weights.reduce((a, b) => a + b, 0);
    const w = last.reduce((s, v, i) => s + v * weights[i], 0) / wsum;
    const trend = last.length >= 3 ? (last[0] - last[last.length - 1]) / last.length : 0;
    return Math.max(0, Math.min(99.9, +(w + trend * 0.5).toFixed(1))) || 0;
  }, [submitted]);

  // Trend with cumulative average
  const trendData = useMemo(() => {
    const chrono = submitted.slice().reverse();
    let cumP = 0, cumA = 0, cumS = 0;
    return chrono.slice(-12).map((x, i) => {
      cumP += Number(x.percentile || 0);
      cumA += Number(x.accuracy || 0);
      cumS += Number(x.total_score || 0);
      return {
        name: `M${i + 1}`,
        percentile: Number(x.percentile || 0),
        score: Number(x.total_score || 0),
        accuracy: Number(x.accuracy || 0),
        cumPercentile: +(cumP / (i + 1)).toFixed(1),
        cumAccuracy: +(cumA / (i + 1)).toFixed(1),
        cumScore: +(cumS / (i + 1)).toFixed(1),
      };
    });
  }, [submitted]);

  // Sectional aggregates: avg score, avg accuracy, avg attempted, avg percentile
  const sectional = useMemo(() => {
    const agg: Record<string, { score: number; max: number; correct: number; attempted: number; percentile: number; count: number }> = {};
    for (const a of submitted) {
      const ss = a.sectional_scores || {};
      for (const k of Object.keys(ss)) {
        const sec = (ss as any)[k] || {};
        if (!agg[k]) agg[k] = { score: 0, max: 0, correct: 0, attempted: 0, percentile: 0, count: 0 };
        agg[k].score += Number(sec.score || 0);
        agg[k].max += Number(sec.max_score || sec.max || 0);
        agg[k].correct += Number(sec.correct || 0);
        agg[k].attempted += Number(sec.attempted || 0);
        agg[k].percentile += Number(sec.percentile || 0);
        agg[k].count += 1;
      }
    }
    return Object.entries(agg).map(([name, v]) => ({
      name,
      avgScore: +(v.score / v.count).toFixed(1),
      avgMax: +(v.max / v.count).toFixed(1),
      avgPercentile: Math.round(v.percentile / v.count),
      avgAccuracy: v.attempted > 0 ? Math.round((v.correct / v.attempted) * 100) : 0,
      avgAttempted: Math.round(v.attempted / v.count),
      pctOfMax: v.max > 0 ? Math.round((v.score / v.max) * 100) : 0,
      fill: SECTION_COLORS[name] || "#0284c7",
    }));
  }, [submitted]);

  // Percentile band distribution
  const bandData = useMemo(() => {
    const bands = [
      { name: "<70", min: 0, max: 70, count: 0 },
      { name: "70-80", min: 70, max: 80, count: 0 },
      { name: "80-90", min: 80, max: 90, count: 0 },
      { name: "90-95", min: 90, max: 95, count: 0 },
      { name: "95-99", min: 95, max: 99, count: 0 },
      { name: "99+", min: 99, max: 101, count: 0 },
    ];
    for (const a of submitted) {
      const p = Number(a.percentile || 0);
      const b = bands.find((x) => p >= x.min && p < x.max);
      if (b) b.count += 1;
    }
    return bands;
  }, [submitted]);

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
  const firstName = (displayName || "Student").split(" ")[0];
  const initial = (displayName || "S").charAt(0).toUpperCase();
  const targetProgress = target > 0 && predicted != null ? Math.min(100, Math.round((predicted / target) * 100)) : 0;

  return (
    <div className="space-y-6">
      {/* ── HERO: Personalised greeting + projection ring + smart CTAs ───────── */}
      <Card className="relative overflow-hidden border-0 shadow-xl bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 text-white">
        {/* Decorative orbs (non-interactive) */}
        <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-cyan-300/15 blur-3xl pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.6) 1px, transparent 0)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="relative p-5 sm:p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 sm:gap-6">
            {/* Left: greeting */}
            <div className="flex items-start gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white/15 backdrop-blur-sm grid place-items-center text-xl sm:text-2xl font-bold border border-white/25 shadow-inner shrink-0">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-xs text-sky-100/90">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>{todayLabel}</span>
                  </span>
                  {stats.streak > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-100">
                      <Flame className="h-3 w-3" /> {stats.streak}-day streak
                    </span>
                  )}
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mt-1 leading-tight break-words">
                  {greeting}, <span className="text-cyan-200">{firstName}</span>
                </h1>
                <p className="text-sky-100/90 mt-1.5 text-[13px] sm:text-sm max-w-lg">
                  {target && gap != null
                    ? gap > 0
                      ? `You're ${gap} %ile away from your ${target}%ile target — let's close the gap.`
                      : `You've crossed your ${target}%ile target. Aim higher today!`
                    : stats.submittedCount > 0
                      ? `${stats.submittedCount} mock${stats.submittedCount > 1 ? "s" : ""} done, best at ${stats.bestPercentile}%ile. Keep momentum.`
                      : "Take your first mock to unlock AI-powered insights and a personalised plan."}
                </p>

                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mt-4">
                  {resumeMock ? (
                    <Link to={`/mocks/attempt/${resumeMock.id}`} className="col-span-2 sm:col-auto">
                      <Button size="lg" className="w-full sm:w-auto gap-2 bg-white text-sky-700 hover:bg-sky-50 shadow-lg">
                        <Clock className="h-4 w-4" /> Resume Mock
                      </Button>
                    </Link>
                  ) : nextMock?.test?.slug ? (
                    <Link to={`/mocks/${nextMock.test.slug}`} className="col-span-2 sm:col-auto">
                      <Button size="lg" className="w-full sm:w-auto gap-2 bg-white text-sky-700 hover:bg-sky-50 shadow-lg">
                        <Rocket className="h-4 w-4" /> Start Next Mock
                      </Button>
                    </Link>
                  ) : (
                    <Link to="/student/buy-mocks" className="col-span-2 sm:col-auto">
                      <Button size="lg" className="w-full sm:w-auto gap-2 bg-white text-sky-700 hover:bg-sky-50 shadow-lg">
                        <ShoppingBag className="h-4 w-4" /> Browse Mocks
                      </Button>
                    </Link>
                  )}
                  <Link to="/student/goals">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white backdrop-blur-sm">
                      <Target className="h-4 w-4" /> Score Engine
                    </Button>
                  </Link>
                  <Link to="/student/day-planner">
                    <Button size="lg" variant="ghost" className="w-full sm:w-auto gap-2 text-white hover:bg-white/15 hover:text-white border border-white/15 sm:border-0">
                      <CalendarDays className="h-4 w-4" /> Today's Plan
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right: projection ring */}
            <div className="shrink-0 w-full lg:w-auto">
              <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-4 sm:p-5 flex items-center gap-4 sm:gap-5 lg:min-w-[280px]">
                <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0">
                  <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                    <circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,0.15)" strokeWidth="9" fill="none" />
                    <circle
                      cx="50" cy="50" r="42" stroke="white" strokeWidth="9" fill="none"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={(1 - (predicted ?? 0) / 100) * 2 * Math.PI * 42}
                      strokeLinecap="round"
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 grid place-items-center text-center">
                    <div>
                      <div className="text-xl sm:text-2xl font-bold leading-none">{predicted ?? "—"}</div>
                      <div className="text-[9px] uppercase tracking-wider text-sky-100/80 mt-0.5">%ile</div>
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] uppercase tracking-wider text-sky-100/80">Projected Percentile</div>
                  <div className="text-sm font-semibold mt-0.5">
                    {target > 0 ? `Target ${target}%ile` : "Set a target to track gap"}
                  </div>
                  {target > 0 && (
                    <div className="mt-2">
                      <div className="h-1.5 w-full max-w-[160px] rounded-full bg-white/15 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-300 to-emerald-300 transition-all duration-700"
                          style={{ width: `${targetProgress}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-sky-100/80 mt-1">{targetProgress}% to target</div>
                    </div>
                  )}
                  <Link to="/student/performance" className="inline-flex items-center text-xs text-cyan-200 hover:text-white mt-2">
                    View deep analytics <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Inline KPI strip */}
          <div className="relative mt-5 sm:mt-6 grid grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-2">
            <Kpi label="Enrolled" value={stats.enrolledCount} />
            <Kpi label="Completed" value={stats.submittedCount} />
            <Kpi label="Avg %ile" value={stats.avgPercentile} />
            <Kpi label="Best %ile" value={stats.bestPercentile} />
            <Kpi label="Accuracy" value={`${stats.accuracy}%`} />
            <Kpi label="Streak" value={`${stats.streak}d`} icon={<Flame className="h-3.5 w-3.5" />} />
          </div>
        </div>
      </Card>

      {/* ── Exam Countdowns — auto-updates every minute ──────────────────────── */}
      <ExamCountdownStrip exams={examCountdowns} />

      {/* ── Quick navigation rail ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickAction to="/student/personalized-hub" icon={Sparkles} label="Personalized Hub" desc="AI-built mocks" tone="violet" />
        <QuickAction to="/student/mocks/full-length" icon={Layers} label="Full-Length Mocks" desc="Exam-grade tests" tone="sky" />
        <QuickAction to="/student/performance" icon={BarChart3} label="Deep Analytics" desc="Track every metric" tone="emerald" />
        <QuickAction to="/student/leaderboard" icon={Trophy} label="Leaderboard" desc="See where you rank" tone="amber" />
      </div>

      <DailyTestCard />

      {/* Setup banner */}
      {noProfile && (
        <Card className="p-5 border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50/40 dark:from-sky-500/10 dark:to-blue-500/5 dark:border-sky-500/20">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center shadow-md shrink-0">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold flex items-center gap-2">
                Set up your CAT Score Engine
                <Badge variant="secondary" className="text-[10px]">Recommended</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Tell us your target percentile, weak areas and study hours — we'll generate a personalised AI plan.
              </p>
            </div>
            <Link to="/student/goals" className="shrink-0">
              <Button>Set up now <ArrowRight className="h-4 w-4 ml-1" /></Button>
            </Link>
          </div>
        </Card>
      )}

      {/* ── Headline stat tiles ──────────────────────────────────────────────── */}
      <div>
        <SectionHeading icon={Gauge} title="Your numbers at a glance" subtitle="Live snapshot — updates the moment you submit a mock" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile icon={BookOpenCheck} label="Mocks Enrolled" value={stats.enrolledCount} sub={`${stats.inProgressCount} in progress`} tone="sky" />
          <StatTile icon={CheckCircle2} label="Mocks Completed" value={stats.submittedCount} sub={stats.improvement >= 0 ? `▲ ${stats.improvement} %ile growth` : `▼ ${Math.abs(stats.improvement)} %ile`} tone="emerald" trend={stats.improvement} />
          <StatTile icon={Trophy} label="Best Percentile" value={stats.bestPercentile} sub={`Avg ${stats.avgPercentile}`} tone="amber" />
          <StatTile icon={Activity} label="Questions Solved" value={stats.totalAttempted} sub={`${stats.totalCorrect} correct`} tone="rose" />
        </div>
      </div>

      {/* Score & Time stats */}
      <div>
        <SectionHeading icon={Award} title="Scores & time invested" subtitle="How hard you've worked and how it's paying off" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile icon={Award} label="Avg Total Score" value={`${stats.avgScore}`} sub={`out of ${stats.avgMaxScore}`} tone="violet" />
          <StatTile icon={Percent} label="Avg % of Max" value={`${stats.avgPctScore}%`} sub="across all mocks" tone="cyan" />
          <StatTile icon={Timer} label="Total Hours" value={`${stats.totalHours}h`} sub={`Avg ${stats.avgTimeMin} min/mock`} tone="fuchsia" />
          <StatTile icon={Gauge} label="Consistency" value={`${stats.consistency}/100`} sub="100 = zero variance" tone="green" />
        </div>
      </div>

      {/* Predictor + cumulative trend */}
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
                <TrendingUp className="h-4 w-4 text-sky-600" /> Percentile — Mock vs Cumulative Avg
              </h2>
              <p className="text-xs text-muted-foreground">Bars: each mock • Line: running average</p>
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
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="percentile" name="Mock %ile" fill="#bae6fd" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="cumPercentile" name="Cumulative Avg" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 3 }} />
                {target > 0 && <ReferenceLine y={target} stroke="#16a34a" strokeDasharray="4 4" label={{ value: `Target ${target}`, fill: "#16a34a", fontSize: 10, position: "right" }} />}
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Cumulative score + Accuracy trend */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-1">
            <LineIcon className="h-4 w-4 text-sky-600" /> Cumulative Score Growth
          </h2>
          <p className="text-xs text-muted-foreground mb-3">Total score per mock and your running average</p>
          {trendData.length === 0 ? (
            <div className="h-48 grid place-items-center text-sm text-muted-foreground">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="sgrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="score" name="Score" stroke="#0284c7" strokeWidth={2.5} fill="url(#sgrad)" />
                <Line type="monotone" dataKey="cumScore" name="Cumulative Avg" stroke="#1d4ed8" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-1">
            <Percent className="h-4 w-4 text-sky-600" /> Accuracy Trend
          </h2>
          <p className="text-xs text-muted-foreground mb-3">Per-mock accuracy and cumulative average</p>
          {trendData.length === 0 ? (
            <div className="h-48 grid place-items-center text-sm text-muted-foreground">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="accuracy" name="Accuracy %" fill="#7dd3fc" radius={[4, 4, 0, 0]} />
                <Line type="monotone" dataKey="cumAccuracy" name="Cumulative Avg" stroke="#0369a1" strokeWidth={2.5} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Sectional deep dive */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-sky-600" /> Sectional Average Performance
            </h2>
            <p className="text-xs text-muted-foreground">Average score, percentile, accuracy and questions attempted per section</p>
          </div>
        </div>
        {sectional.length === 0 ? (
          <div className="h-40 grid place-items-center text-sm text-muted-foreground text-center">
            No sectional data yet — submit a mock to populate this view.
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={sectional}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="avgScore" name="Avg Score" fill="#0284c7" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="avgMax" name="Max Score" fill="#bae6fd" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={sectional}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} domain={[0, 100]} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="avgPercentile" name="Avg %ile" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="avgAccuracy" name="Accuracy %" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
              {sectional.map((s) => (
                <div key={s.name} className="rounded-lg border border-sky-100 bg-sky-50/40 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm">{s.name}</div>
                    <Badge variant="secondary">{s.avgPercentile} %ile</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                    <div className="text-muted-foreground">Avg score</div>
                    <div className="font-medium text-right">{s.avgScore} / {s.avgMax}</div>
                    <div className="text-muted-foreground">% of max</div>
                    <div className="font-medium text-right">{s.pctOfMax}%</div>
                    <div className="text-muted-foreground">Accuracy</div>
                    <div className="font-medium text-right">{s.avgAccuracy}%</div>
                    <div className="text-muted-foreground">Avg attempted</div>
                    <div className="font-medium text-right">{s.avgAttempted}</div>
                  </div>
                  <Progress value={s.pctOfMax} className="h-1.5 mt-2" />
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* Distribution + Today's plan + Heatmap */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <BarChart3 className="h-4 w-4 text-sky-600" /> Percentile Distribution
          </h2>
          {submitted.length === 0 ? (
            <div className="h-40 grid place-items-center text-sm text-muted-foreground">No mocks yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bandData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" name="Mocks" fill="#0284c7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

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
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-muted-foreground">{tasks.filter((t) => t.is_completed).length} of {tasks.length} done</span>
                <span className="font-semibold">{taskProgress}%</span>
              </div>
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
            <Target className="h-4 w-4 text-sky-600" /> Weak Topic Heatmap
          </h2>
          {weak.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Complete a mock and review topics to populate this heatmap.
            </div>
          ) : (
            <>
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
              <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400" /> Critical</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Improving</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Strong</span>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Recent attempts */}
      <div className="grid grid-cols-1 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><ListChecks className="h-4 w-4 text-sky-600" /> Recent attempts</h2>
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
                      {a.test?.exam_code && <> · {a.test.exam_code}</>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {a.status !== "in_progress" && (
                      <div className="text-right">
                        <div className="text-sm font-semibold">{a.total_score ?? 0}/{a.max_score ?? 0}</div>
                        <div className="text-[11px] text-muted-foreground">%ile {a.percentile ?? 0} · Acc {a.accuracy ?? 0}%</div>
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
    <div className="bg-white/10 hover:bg-white/15 transition-colors backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/20">
      <div className="text-[10px] uppercase tracking-wider text-white/75 flex items-center gap-1">
        {icon} {label}
      </div>
      <div className="text-xl font-bold mt-0.5">{value}</div>
    </div>
  );
}

const TONE_MAP: Record<string, { ring: string; icon: string; bg: string; bar: string }> = {
  sky:     { ring: "ring-sky-100 dark:ring-sky-500/20",         icon: "text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/10",       bg: "from-sky-500/10",       bar: "bg-sky-500" },
  emerald: { ring: "ring-emerald-100 dark:ring-emerald-500/20", icon: "text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10", bg: "from-emerald-500/10", bar: "bg-emerald-500" },
  amber:   { ring: "ring-amber-100 dark:ring-amber-500/20",     icon: "text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10", bg: "from-amber-500/10",     bar: "bg-amber-500" },
  rose:    { ring: "ring-rose-100 dark:ring-rose-500/20",       icon: "text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10",   bg: "from-rose-500/10",      bar: "bg-rose-500" },
  violet:  { ring: "ring-violet-100 dark:ring-violet-500/20",   icon: "text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/10", bg: "from-violet-500/10", bar: "bg-violet-500" },
  cyan:    { ring: "ring-cyan-100 dark:ring-cyan-500/20",       icon: "text-cyan-600 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-500/10",   bg: "from-cyan-500/10",      bar: "bg-cyan-500" },
  fuchsia: { ring: "ring-fuchsia-100 dark:ring-fuchsia-500/20", icon: "text-fuchsia-600 dark:text-fuchsia-300 bg-fuchsia-50 dark:bg-fuchsia-500/10", bg: "from-fuchsia-500/10", bar: "bg-fuchsia-500" },
  green:   { ring: "ring-green-100 dark:ring-green-500/20",     icon: "text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-500/10", bg: "from-green-500/10",   bar: "bg-green-500" },
};

function StatTile({ icon: Icon, label, value, sub, tone = "sky", trend }: any) {
  const t = TONE_MAP[tone] ?? TONE_MAP.sky;
  const trendColor = typeof trend === "number"
    ? trend > 0 ? "text-emerald-600 dark:text-emerald-400" : trend < 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
    : "text-muted-foreground";
  return (
    <Card className={`group relative overflow-hidden p-4 ring-1 ${t.ring} hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${t.bg} to-transparent opacity-60 pointer-events-none`} />
      <div className="relative flex items-start justify-between">
        <div className={`h-9 w-9 rounded-lg grid place-items-center ${t.icon}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className={`absolute top-0 right-0 h-1 w-8 rounded-bl-md ${t.bar} opacity-80`} />
      </div>
      <div className="relative mt-3 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div className="relative text-2xl font-bold mt-0.5 tabular-nums">{value}</div>
      {sub && <div className={`relative text-[11px] mt-1 truncate ${trendColor}`}>{sub}</div>}
    </Card>
  );
}

function QuickAction({ to, icon: Icon, label, desc, tone = "sky" }: any) {
  const t = TONE_MAP[tone] ?? TONE_MAP.sky;
  return (
    <Link
      to={to}
      className={`group relative overflow-hidden rounded-xl border border-border bg-card p-3 sm:p-4 ring-1 ${t.ring} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-2.5 sm:gap-3`}
    >
      <div className={`h-10 w-10 sm:h-11 sm:w-11 rounded-xl grid place-items-center ${t.icon} group-hover:scale-110 transition-transform shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-[13px] sm:text-sm leading-tight">{label}</div>
        <div className="text-[10.5px] sm:text-[11px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">{desc}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
    </Link>
  );
}

function SectionHeading({ icon: Icon, title, subtitle }: any) {
  return (
    <div className="flex items-end justify-between mb-3 gap-3">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold flex items-center gap-2 text-foreground">
          {Icon && <Icon className="h-4 w-4 text-sky-600 dark:text-sky-300" />} {title}
        </h2>
        {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
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

function ExamCountdownStrip({ exams }: { exams: any[] }) {
  if (!exams || exams.length === 0) {
    return (
      <Card className="p-5 border-sky-100 dark:border-sky-500/20 bg-gradient-to-br from-sky-50/60 to-white dark:from-sky-500/5 dark:to-background">
        <div className="flex items-center gap-3 text-sm">
          <div className="h-10 w-10 rounded-xl bg-sky-100 dark:bg-sky-500/20 grid place-items-center text-sky-700 dark:text-sky-300">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold">Exam Countdowns</div>
            <div className="text-xs text-muted-foreground">No upcoming exam dates yet — admin can add them in the Exams panel.</div>
          </div>
        </div>
      </Card>
    );
  }
  const now = Date.now();
  return (
    <div>
      <div className="flex items-end justify-between mb-3 px-1">
        <div>
          <h2 className="text-base font-bold flex items-center gap-2 text-foreground">
            <span className="h-7 w-7 rounded-lg bg-sky-100 dark:bg-sky-500/20 grid place-items-center text-sky-700 dark:text-sky-300">
              <CalendarDays className="h-4 w-4" />
            </span>
            Exam Countdowns
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5 ml-9">Track every D-day. Updates live.</p>
        </div>
        <Link to="/exams" className="text-xs font-medium text-sky-700 dark:text-sky-300 hover:underline">View all →</Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {exams.map((ex: any) => {
          const target = new Date(ex.exam_date).getTime();
          const days = Math.ceil((target - now) / 86_400_000);
          const past = days < 0;
          const critical = !past && days <= 7;
          const urgent = !past && days > 7 && days <= 30;
          const upcoming = !past && days > 30 && days <= 90;
          // far = > 90

          const ring = past
            ? "stroke-muted-foreground/30"
            : critical
              ? "stroke-rose-500"
              : urgent
                ? "stroke-amber-500"
                : upcoming
                  ? "stroke-sky-500"
                  : "stroke-emerald-500";

          const cardTone = past
            ? "border-border bg-muted/30"
            : critical
              ? "border-rose-200 bg-gradient-to-br from-rose-50 via-white to-rose-50/40 dark:from-rose-500/10 dark:via-background dark:to-background dark:border-rose-500/30"
              : urgent
                ? "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/40 dark:from-amber-500/10 dark:via-background dark:to-background dark:border-amber-500/30"
                : upcoming
                  ? "border-sky-200 bg-gradient-to-br from-sky-50 via-white to-sky-50/40 dark:from-sky-500/10 dark:via-background dark:to-background dark:border-sky-500/30"
                  : "border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 dark:from-emerald-500/10 dark:via-background dark:to-background dark:border-emerald-500/30";

          const numberTone = past
            ? "text-muted-foreground"
            : critical
              ? "text-rose-700 dark:text-rose-200"
              : urgent
                ? "text-amber-700 dark:text-amber-200"
                : upcoming
                  ? "text-sky-700 dark:text-sky-200"
                  : "text-emerald-700 dark:text-emerald-200";

          const badgeTone = past
            ? "bg-muted text-muted-foreground"
            : critical
              ? "bg-rose-600 text-white animate-pulse"
              : urgent
                ? "bg-amber-500 text-white"
                : upcoming
                  ? "bg-sky-600 text-white"
                  : "bg-emerald-600 text-white";

          const badgeLabel = past
            ? "Concluded"
            : critical
              ? "Final week"
              : urgent
                ? "Approaching"
                : upcoming
                  ? "Upcoming"
                  : "Plan ahead";

          // Progress ring: visual fullness based on 365-day horizon
          const pct = past ? 1 : Math.max(0, Math.min(1, 1 - days / 365));
          const C = 2 * Math.PI * 26; // r=26
          const dash = C * pct;

          const dateLabel = new Date(ex.exam_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
          const weekday = new Date(ex.exam_date).toLocaleDateString("en-IN", { weekday: "short" });

          return (
            <Link
              key={ex.slug}
              to={`/exams/${ex.slug}`}
              className={`group relative overflow-hidden rounded-2xl border ${cardTone} p-3 sm:p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all`}
            >
              {/* Badge: full-width row on top so it never overlaps exam name */}
              <div className="flex items-center justify-between mb-2 gap-2">
                <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeTone} truncate`}>
                  {badgeLabel}
                </span>
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground truncate text-right">
                  {ex.name}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0">
                  <svg viewBox="0 0 60 60" className="h-full w-full -rotate-90">
                    <circle cx="30" cy="30" r="26" className="fill-none stroke-foreground/10" strokeWidth="5" />
                    <circle
                      cx="30" cy="30" r="26"
                      className={`fill-none ${ring} transition-all duration-700`}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${dash} ${C}`}
                    />
                  </svg>
                  <div className="absolute inset-0 grid place-items-center">
                    <div className={`text-lg sm:text-xl font-extrabold tabular-nums leading-none ${numberTone}`}>
                      {past ? "—" : days}
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-[13px] sm:text-sm font-bold ${numberTone} leading-tight`}>
                    {past ? "Concluded" : days === 0 ? "Today!" : days === 1 ? "1 day left" : `${days} days left`}
                  </div>
                  <div className="text-[10.5px] sm:text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                    <CalendarDays className="h-3 w-3 shrink-0" />
                    <span className="truncate">{weekday}, {dateLabel}</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
