import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge as UIBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy, Flame, Zap, Target, Award, Star, TrendingUp, TrendingDown,
  Crown, Sparkles, Calendar, Users, Rocket, Brain, Activity, Share2,
  ChevronRight, Medal, ShieldCheck, Gauge, BarChart3, ArrowUpRight,
  Swords, Bell, CheckCircle2, Lock, PartyPopper,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  AreaChart, Area,
} from "recharts";
import { cn } from "@/lib/utils";

type Rewards = {
  coins: number; xp: number; level: number;
  streak_days: number; longest_streak: number; total_mocks_completed: number;
  last_activity_date?: string | null;
};

type Attempt = {
  id: string; test_id: string;
  total_score: number | null; max_score: number | null;
  percentile: number | null; accuracy: number | null;
  total_attempted: number | null; total_correct: number | null;
  submitted_at: string | null; created_at: string;
  sectional_scores: Record<string, any> | null;
  all_india_rank: number | null;
};

type LbRow = {
  rank: number; user_id: string; display_handle: string;
  coins: number; xp: number; level: number; streak_days: number;
  total_mocks_completed: number; is_self: boolean;
};

const SECTION_LABELS: Record<string, string> = {
  VARC: "VARC", QA: "Quant", DILR: "LRDI", LR: "Logical Reasoning",
  LS: "Language", QS: "Quant Skills", VALR: "Verbal & LR", DM: "Decision Making",
};

export default function StudentPerformX() {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<Rewards | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [badges, setBadges] = useState<{ badge_key: string }[]>([]);
  const [global, setGlobal] = useState<LbRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"global" | "peers" | "section">("global");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: r }, { data: a }, { data: b }, { data: lb }] = await Promise.all([
        supabase.from("student_rewards").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("mock_attempts").select(
          "id,test_id,total_score,max_score,percentile,accuracy,total_attempted,total_correct,submitted_at,created_at,sectional_scores,all_india_rank"
        ).eq("user_id", user.id).in("status", ["submitted", "auto_submitted"])
          .order("submitted_at", { ascending: true }).limit(60),
        supabase.from("student_badges").select("badge_key").eq("user_id", user.id),
        supabase.rpc("get_global_leaderboard", { _limit: 50 }),
      ]);
      setRewards(r as any);
      setAttempts((a ?? []) as any);
      setBadges((b ?? []) as any);
      setGlobal((lb ?? []) as any);
      setLoading(false);
    })();
  }, [user]);

  // ===== Derived metrics =====
  const xp = rewards?.xp ?? 0;
  const level = rewards?.level ?? 1;
  const xpInLevel = xp % 500;
  const xpProgressPct = Math.min(100, (xpInLevel / 500) * 100);

  const totalMocks = attempts.length;
  const avgPercentile = useMemo(() => {
    const arr = attempts.map(a => Number(a.percentile)).filter(n => !isNaN(n) && n > 0);
    return arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0;
  }, [attempts]);
  const bestPercentile = useMemo(
    () => attempts.reduce((m, a) => Math.max(m, Number(a.percentile) || 0), 0),
    [attempts]
  );
  const avgAccuracy = useMemo(() => {
    const arr = attempts.map(a => Number(a.accuracy)).filter(n => !isNaN(n) && n > 0);
    return arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0;
  }, [attempts]);

  // Improvement: latest 3 vs first 3
  const improvement = useMemo(() => {
    const valid = attempts.filter(a => a.percentile != null);
    if (valid.length < 4) return 0;
    const first = valid.slice(0, 3).map(a => Number(a.percentile));
    const last = valid.slice(-3).map(a => Number(a.percentile));
    const fAvg = first.reduce((s, n) => s + n, 0) / first.length;
    const lAvg = last.reduce((s, n) => s + n, 0) / last.length;
    return +(lAvg - fAvg).toFixed(1);
  }, [attempts]);

  // Consistency score (0-100): based on streak + frequency
  const consistencyScore = useMemo(() => {
    const streak = rewards?.streak_days ?? 0;
    const freq = Math.min(100, totalMocks * 4);
    return Math.min(100, Math.round(streak * 6 + freq * 0.5));
  }, [rewards, totalMocks]);

  // Speed-vs-accuracy balance: closer accuracy is to attempt-rate, the better balance
  const balanceScore = useMemo(() => {
    if (!attempts.length) return 0;
    const acc = avgAccuracy;
    const attemptRate = attempts.reduce((s, a) => {
      const tot = Number(a.total_attempted) || 0;
      return s + Math.min(100, tot);
    }, 0) / attempts.length;
    const diff = Math.abs(acc - attemptRate);
    return Math.max(0, Math.min(100, Math.round(100 - diff)));
  }, [attempts, avgAccuracy]);

  // Predicted next percentile: simple linear projection
  const predictedPercentile = useMemo(() => {
    const valid = attempts.filter(a => a.percentile != null).slice(-5);
    if (!valid.length) return 0;
    const trend = improvement / 3; // per attempt
    const latest = Number(valid[valid.length - 1].percentile);
    return Math.max(0, Math.min(100, +(latest + trend * 2).toFixed(1)));
  }, [attempts, improvement]);

  // Trend chart
  const trendData = useMemo(() => attempts
    .filter(a => a.percentile != null)
    .slice(-12)
    .map((a, i) => ({
      name: `M${i + 1}`,
      percentile: Number(a.percentile) || 0,
      accuracy: Number(a.accuracy) || 0,
    })), [attempts]);

  // Section radar (avg sectional scores)
  const radarData = useMemo(() => {
    const acc: Record<string, { sum: number; count: number; max: number }> = {};
    attempts.forEach(a => {
      const ss = a.sectional_scores || {};
      Object.entries(ss).forEach(([k, v]: [string, any]) => {
        const score = typeof v === "number" ? v : (v?.score ?? 0);
        const max = typeof v === "object" && v?.max ? Number(v.max) : 100;
        if (!acc[k]) acc[k] = { sum: 0, count: 0, max };
        acc[k].sum += Number(score) || 0;
        acc[k].count += 1;
      });
    });
    return Object.entries(acc).map(([k, v]) => ({
      section: SECTION_LABELS[k] ?? k,
      value: v.count ? Math.round((v.sum / v.count / Math.max(1, v.max)) * 100) : 0,
    }));
  }, [attempts]);

  // Heatmap (12 weeks x 7 days)
  const heatmap = useMemo(() => {
    const days: Record<string, number> = {};
    attempts.forEach(a => {
      const d = (a.submitted_at || a.created_at).slice(0, 10);
      days[d] = (days[d] || 0) + 1;
    });
    const cells: { date: string; intensity: number }[] = [];
    const today = new Date();
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      cells.push({ date: key, intensity: Math.min(4, days[key] || 0) });
    }
    return cells;
  }, [attempts]);

  // Achievements / badges (computed against thresholds)
  const allBadges = [
    { key: "first_mock", name: "First Step", icon: Rocket, color: "from-sky-500 to-blue-600", check: () => totalMocks >= 1 },
    { key: "mocks_10", name: "Consistent", icon: Target, color: "from-emerald-500 to-teal-600", check: () => totalMocks >= 10 },
    { key: "mocks_25", name: "Marathoner", icon: Award, color: "from-amber-500 to-orange-600", check: () => totalMocks >= 25 },
    { key: "score_90", name: "90+ Percentile", icon: Trophy, color: "from-violet-500 to-purple-600", check: () => bestPercentile >= 90 },
    { key: "score_99", name: "Elite Aspirant", icon: Crown, color: "from-yellow-500 to-amber-600", check: () => bestPercentile >= 99 },
    { key: "streak_7", name: "7-Day Streak", icon: Flame, color: "from-orange-500 to-rose-600", check: () => (rewards?.streak_days ?? 0) >= 7 },
    { key: "streak_30", name: "Iron Will", icon: Flame, color: "from-rose-500 to-red-600", check: () => (rewards?.longest_streak ?? 0) >= 30 },
    { key: "accuracy_master", name: "Accuracy Master", icon: ShieldCheck, color: "from-indigo-500 to-blue-700", check: () => avgAccuracy >= 80 },
    { key: "speed_champ", name: "Speed Champion", icon: Zap, color: "from-cyan-500 to-sky-600", check: () => balanceScore >= 75 && totalMocks >= 5 },
    { key: "improver", name: "Top Improver", icon: TrendingUp, color: "from-green-500 to-emerald-600", check: () => improvement >= 10 },
  ];

  // Adaptive theme tier
  const tier = level >= 20 ? "Legend" : level >= 10 ? "Elite" : level >= 5 ? "Pro" : "Rookie";
  const tierGradient = {
    Legend: "from-yellow-500 via-amber-500 to-rose-500",
    Elite:  "from-violet-600 via-fuchsia-500 to-sky-500",
    Pro:    "from-sky-500 via-blue-600 to-indigo-600",
    Rookie: "from-slate-500 via-sky-500 to-blue-500",
  }[tier];

  // Personalized challenges (AI-style heuristic)
  const challenges = useMemo(() => {
    const ch: { title: string; reward: string; icon: any }[] = [];
    if (avgAccuracy < 70) ch.push({ title: "Push accuracy above 70% in your next mock", reward: "+150 XP", icon: Target });
    if ((rewards?.streak_days ?? 0) < 7) ch.push({ title: "Maintain a 7-day practice streak", reward: "+200 XP · Iron badge", icon: Flame });
    if (totalMocks < 10) ch.push({ title: `Complete ${10 - totalMocks} more mocks to unlock Marathoner`, reward: "+100 XP each", icon: Rocket });
    if (improvement < 5) ch.push({ title: "Improve your average percentile by 5 points", reward: "+250 XP", icon: TrendingUp });
    if (radarData.length) {
      const weakest = [...radarData].sort((a, b) => a.value - b.value)[0];
      if (weakest) ch.push({ title: `Strengthen ${weakest.section} — your weakest section`, reward: "Unlocks Topic Mastery", icon: Brain });
    }
    return ch.slice(0, 4);
  }, [avgAccuracy, rewards, totalMocks, improvement, radarData]);

  // Rival = nearest XP neighbour above me
  const rival = useMemo(() => {
    const me = global.find(r => r.is_self);
    if (!me) return null;
    const above = global.filter(r => r.rank < me.rank).sort((a, b) => b.rank - a.rank)[0];
    return above ? { ...above, gap: me.xp - above.xp } : null;
  }, [global]);

  const myRow = global.find(r => r.is_self);

  // Milestones
  const milestones = useMemo(() => {
    const m: { label: string; done: boolean; icon: any }[] = [
      { label: "First mock completed", done: totalMocks >= 1, icon: Rocket },
      { label: "Hit 75 percentile", done: bestPercentile >= 75, icon: Medal },
      { label: "Hit 90 percentile", done: bestPercentile >= 90, icon: Trophy },
      { label: "10 mocks attempted", done: totalMocks >= 10, icon: Target },
      { label: "7-day streak", done: (rewards?.longest_streak ?? 0) >= 7, icon: Flame },
      { label: "Reach Level 5", done: level >= 5, icon: Star },
      { label: "Reach Level 10 — Elite tier", done: level >= 10, icon: Crown },
    ];
    return m;
  }, [totalMocks, bestPercentile, rewards, level]);

  if (loading) {
    return <div className="space-y-3"><div className="h-32 rounded-2xl bg-muted animate-pulse" /><div className="h-64 rounded-2xl bg-muted animate-pulse" /></div>;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ============ HERO — Adaptive theme by tier ============ */}
      <div className={cn("relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-xl bg-gradient-to-br", tierGradient)}>
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/30 blur-3xl" />
          <div className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-white/20 blur-3xl" />
        </div>
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" /> PerformX · Apex Arena
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 backdrop-blur text-xs font-bold">
                <Crown className="h-3.5 w-3.5" /> {tier} Tier
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black leading-tight">
              Level {level} · {xp.toLocaleString()} XP
            </h1>
            <p className="mt-1 text-white/85 text-sm max-w-xl">
              Compete, level up, unlock badges and beat your rivals. Your stats sync live across every mock and practice session.
            </p>
            <div className="mt-4 flex items-center gap-3 max-w-md">
              <Progress value={xpProgressPct} className="h-2.5 bg-white/20 [&>div]:bg-white" />
              <span className="text-xs font-semibold whitespace-nowrap">{xpInLevel}/500 XP</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <HeroStat icon={<Flame className="h-4 w-4" />} value={`${rewards?.streak_days ?? 0}d`} label="Streak" />
            <HeroStat icon={<Trophy className="h-4 w-4" />} value={myRow?.rank ? `#${myRow.rank}` : "—"} label="Global" />
            <HeroStat icon={<Gauge className="h-4 w-4" />} value={`${avgPercentile.toFixed(1)}%`} label="Avg %ile" />
          </div>
        </div>
      </div>

      {/* ============ KPI STRIP ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Activity} label="Consistency" value={`${consistencyScore}`} suffix="/100" tone="emerald" />
        <KpiCard icon={Gauge} label="Speed × Accuracy" value={`${balanceScore}`} suffix="/100" tone="sky" />
        <KpiCard icon={TrendingUp} label="Improvement" value={`${improvement >= 0 ? "+" : ""}${improvement}`} suffix=" %ile" tone={improvement >= 0 ? "emerald" : "rose"} />
        <KpiCard icon={Brain} label="Predicted Next" value={`${predictedPercentile}`} suffix=" %ile" tone="violet" />
      </div>

      {/* ============ LEADERBOARD with FILTER TABS ============ */}
      <Card className="overflow-hidden border-sky-100">
        <div className="p-5 border-b bg-gradient-to-r from-sky-50/60 to-blue-50/40 dark:from-sky-500/10 dark:to-blue-500/5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center text-white shadow">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <div className="font-bold text-gray-900 dark:text-foreground">Live Leaderboard</div>
              <div className="text-xs text-muted-foreground">Updates after every submitted mock</div>
            </div>
          </div>
          <div className="flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border/50">
            {([
              { key: "global", label: "Global", icon: Trophy },
              { key: "peers", label: "My Tier", icon: Users },
              { key: "section", label: "By Section", icon: BarChart3 },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setActiveView(t.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                  activeView === t.key
                    ? "bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-border/60 max-h-[420px] overflow-auto">
          {(activeView === "peers" && myRow
            ? global.filter(r => Math.abs(r.level - myRow.level) <= 2)
            : global
          ).slice(0, 25).map((r, i) => (
            <LbRowItem key={r.user_id} row={r} index={i} />
          ))}
          {!global.length && <div className="p-8 text-center text-sm text-muted-foreground">Be the first to climb the ranks — submit a mock!</div>}
        </div>
      </Card>

      {/* ============ RIVAL + STREAK CALENDAR ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 p-5 border-rose-100 bg-gradient-to-br from-rose-50/60 to-orange-50/40 dark:from-rose-500/10 dark:to-orange-500/5">
          <div className="flex items-center gap-2 mb-3">
            <Swords className="h-5 w-5 text-rose-600" />
            <div className="font-bold">Your Rival</div>
          </div>
          {rival ? (
            <div className="space-y-3">
              <div className="text-2xl font-black">{rival.display_handle}</div>
              <div className="text-sm text-muted-foreground">Rank #{rival.rank} · {rival.xp.toLocaleString()} XP</div>
              <div className="rounded-xl bg-white/70 dark:bg-background/40 p-3 border border-rose-200/50">
                <div className="text-xs text-muted-foreground">Gap to overtake</div>
                <div className="text-xl font-bold text-rose-600">{Math.abs(rival.gap)} XP</div>
              </div>
              <Button size="sm" className="w-full bg-gradient-to-r from-rose-500 to-orange-500 hover:opacity-90">
                <Zap className="h-3.5 w-3.5 mr-1" /> Take a mock to close the gap
              </Button>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Climb the leaderboard to be matched with a rival.</div>
          )}
        </Card>

        <Card className="lg:col-span-2 p-5 border-sky-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-sky-600" />
              <div className="font-bold">Activity Heatmap · Last 12 weeks</div>
            </div>
            <UIBadge variant="secondary" className="text-xs">{rewards?.streak_days ?? 0}-day streak</UIBadge>
          </div>
          <div className="grid grid-cols-12 gap-1.5">
            {heatmap.map((c, i) => (
              <div
                key={i}
                title={`${c.date}: ${c.intensity} mocks`}
                className={cn(
                  "aspect-square rounded-md transition-transform hover:scale-110",
                  c.intensity === 0 && "bg-muted/60",
                  c.intensity === 1 && "bg-sky-200 dark:bg-sky-500/40",
                  c.intensity === 2 && "bg-sky-400 dark:bg-sky-500/70",
                  c.intensity === 3 && "bg-sky-500 dark:bg-sky-400",
                  c.intensity >= 4 && "bg-blue-700 dark:bg-blue-400",
                )}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground justify-end">
            Less <span className="h-2.5 w-2.5 rounded bg-muted/60" /> <span className="h-2.5 w-2.5 rounded bg-sky-200 dark:bg-sky-500/40" /> <span className="h-2.5 w-2.5 rounded bg-sky-400" /> <span className="h-2.5 w-2.5 rounded bg-sky-500" /> <span className="h-2.5 w-2.5 rounded bg-blue-700" /> More
          </div>
        </Card>
      </div>

      {/* ============ TREND + RADAR ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 border-sky-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-sky-600" /><div className="font-bold">Performance Trend</div></div>
            <div className="text-xs text-muted-foreground">Last {trendData.length} mocks</div>
          </div>
          <div className="h-64">
            {trendData.length ? (
              <ResponsiveContainer>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="px" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/></linearGradient>
                    <linearGradient id="ax" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                  <Area type="monotone" dataKey="percentile" stroke="#0ea5e9" fill="url(#px)" strokeWidth={2.5} name="Percentile" />
                  <Area type="monotone" dataKey="accuracy" stroke="#10b981" fill="url(#ax)" strokeWidth={2} name="Accuracy" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">Submit a mock to see your trend.</div>
            )}
          </div>
        </Card>

        <Card className="p-5 border-sky-100">
          <div className="flex items-center gap-2 mb-3"><Target className="h-5 w-5 text-violet-600" /><div className="font-bold">Section Mastery</div></div>
          <div className="h-64">
            {radarData.length ? (
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="section" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">No sectional data yet.</div>
            )}
          </div>
        </Card>
      </div>

      {/* ============ AI CHALLENGES + WEEKLY COMPETITION ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 border-violet-100 bg-gradient-to-br from-violet-50/40 to-fuchsia-50/30 dark:from-violet-500/10 dark:to-fuchsia-500/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Brain className="h-5 w-5 text-violet-600" /><div className="font-bold">AI Personalized Challenges</div></div>
            <UIBadge className="bg-violet-600 hover:bg-violet-600">Auto-assigned</UIBadge>
          </div>
          {challenges.length ? (
            <div className="space-y-2">
              {challenges.map((c, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/70 dark:bg-background/40 border border-violet-200/50 hover:shadow-sm transition-all">
                  <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center text-white shrink-0">
                    <c.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{c.title}</div>
                    <div className="text-xs text-violet-600 dark:text-violet-300 font-semibold">{c.reward}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">You're crushing it — no challenges right now.</div>
          )}
        </Card>

        <Card className="p-5 border-amber-100 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-500/10 dark:to-orange-500/5">
          <div className="flex items-center gap-2 mb-3"><PartyPopper className="h-5 w-5 text-amber-600" /><div className="font-bold">Weekly Competition</div></div>
          <div className="text-2xl font-black mb-1">Best Improver</div>
          <p className="text-xs text-muted-foreground mb-4">Largest percentile jump this week wins +1000 XP and the Comeback King badge.</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your improvement</span>
              <span className="font-bold text-amber-600">{improvement >= 0 ? "+" : ""}{improvement} %ile</span>
            </div>
            <Progress value={Math.min(100, Math.max(0, improvement * 5))} className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-orange-500" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Resets every Monday</span>
              <span className="font-semibold">{improvement >= 5 ? "On track 🎯" : "Push harder"}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ============ BADGES ============ */}
      <Card className="p-5 border-sky-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><Award className="h-5 w-5 text-amber-600" /><div className="font-bold">Badges & Achievements</div></div>
          <Button size="sm" variant="outline" className="text-xs"><Share2 className="h-3.5 w-3.5 mr-1" /> Share</Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {allBadges.map(b => {
            const earned = b.check();
            const Icon = b.icon;
            return (
              <div
                key={b.key}
                className={cn(
                  "relative rounded-2xl p-4 border text-center transition-all hover:scale-105",
                  earned ? "border-transparent shadow-md" : "border-dashed border-border/60 bg-muted/40 opacity-60"
                )}
              >
                {earned && <div className={cn("absolute inset-0 rounded-2xl bg-gradient-to-br opacity-15", b.color)} />}
                <div className={cn("relative h-12 w-12 mx-auto rounded-xl grid place-items-center mb-2 bg-gradient-to-br text-white shadow", earned ? b.color : "from-slate-300 to-slate-400")}>
                  {earned ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                </div>
                <div className="relative text-xs font-bold">{b.name}</div>
                {earned && <div className="relative text-[10px] text-emerald-600 font-semibold mt-0.5">Unlocked</div>}
              </div>
            );
          })}
        </div>
      </Card>

      {/* ============ MILESTONE JOURNEY ============ */}
      <Card className="p-5 border-sky-100">
        <div className="flex items-center gap-2 mb-4"><Rocket className="h-5 w-5 text-sky-600" /><div className="font-bold">Progress Journey</div></div>
        <div className="relative">
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gradient-to-b from-sky-200 via-violet-200 to-amber-200" />
          <div className="space-y-3">
            {milestones.map((m, i) => {
              const Icon = m.icon;
              return (
                <div key={i} className="relative flex items-center gap-4 pl-1">
                  <div className={cn(
                    "relative z-10 h-8 w-8 rounded-full grid place-items-center shrink-0 transition-all",
                    m.done
                      ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md"
                      : "bg-muted text-muted-foreground border border-border"
                  )}>
                    {m.done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <div className={cn("text-sm font-semibold", !m.done && "text-muted-foreground")}>{m.label}</div>
                    {m.done && <UIBadge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">Achieved</UIBadge>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ============ SMART NOTIFICATION TICKER ============ */}
      <Card className="p-4 border-sky-100 bg-gradient-to-r from-sky-50/50 to-blue-50/30 dark:from-sky-500/10 dark:to-blue-500/5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white shrink-0">
            <Bell className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Smart Insight</div>
            <div className="text-sm font-medium">
              {improvement >= 5
                ? `🚀 You're up ${improvement} percentile points — keep this momentum to reach top 10%.`
                : avgAccuracy < 65
                ? "🎯 Your accuracy is below 65%. Slow down and focus on quality this week."
                : (rewards?.streak_days ?? 0) >= 7
                ? `🔥 ${rewards?.streak_days}-day streak — consistency is your superpower.`
                : "📈 Take 2 mocks this week to unlock your next personalized insight."}
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-sky-600" />
        </div>
      </Card>
    </div>
  );
}

/* ===================== Sub-components ===================== */

function HeroStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/15 backdrop-blur border border-white/20 px-3 py-2.5 text-center min-w-[78px]">
      <div className="flex items-center justify-center gap-1 text-white/80">{icon}</div>
      <div className="text-lg font-black leading-tight">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/70">{label}</div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, suffix, tone }: { icon: any; label: string; value: string; suffix?: string; tone: "emerald" | "sky" | "violet" | "rose" }) {
  const tones = {
    emerald: "from-emerald-500 to-teal-600 text-emerald-600 dark:text-emerald-300 bg-emerald-50/60 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20",
    sky: "from-sky-500 to-blue-600 text-sky-600 dark:text-sky-300 bg-sky-50/60 dark:bg-sky-500/10 border-sky-100 dark:border-sky-500/20",
    violet: "from-violet-500 to-fuchsia-600 text-violet-600 dark:text-violet-300 bg-violet-50/60 dark:bg-violet-500/10 border-violet-100 dark:border-violet-500/20",
    rose: "from-rose-500 to-orange-500 text-rose-600 dark:text-rose-300 bg-rose-50/60 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20",
  }[tone];
  const [grad, ...rest] = tones.split(" ");
  return (
    <Card className={cn("p-4 border", rest.join(" "))}>
      <div className="flex items-center justify-between mb-2">
        <div className={cn("h-9 w-9 rounded-xl bg-gradient-to-br grid place-items-center text-white shadow", grad, tones.split(" ")[1])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-2xl font-black leading-tight">{value}<span className="text-sm font-medium text-muted-foreground">{suffix}</span></div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </Card>
  );
}

function LbRowItem({ row, index }: { row: LbRow; index: number }) {
  const medal =
    row.rank === 1 ? "from-yellow-400 to-amber-500" :
    row.rank === 2 ? "from-slate-300 to-slate-400" :
    row.rank === 3 ? "from-orange-400 to-rose-400" :
    "from-sky-100 to-blue-100 dark:from-sky-500/20 dark:to-blue-500/10";
  const isTop3 = row.rank <= 3;
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 transition-colors hover:bg-accent/40",
      row.is_self && "bg-gradient-to-r from-sky-50/80 to-blue-50/40 dark:from-sky-500/15 dark:to-blue-500/5 ring-1 ring-inset ring-sky-200/60 dark:ring-sky-500/20"
    )}>
      <div className={cn(
        "h-9 w-9 rounded-xl grid place-items-center font-black text-sm shrink-0 bg-gradient-to-br",
        medal,
        isTop3 ? "text-white shadow" : "text-sky-700 dark:text-sky-200"
      )}>
        {isTop3 ? <Crown className="h-4 w-4" /> : row.rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate flex items-center gap-1.5">
          {row.display_handle}
          {row.is_self && <UIBadge className="bg-sky-600 text-[10px] px-1.5 py-0">You</UIBadge>}
        </div>
        <div className="text-[11px] text-muted-foreground">L{row.level} · {row.streak_days}d streak · {row.total_mocks_completed} mocks</div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-black text-sky-700 dark:text-sky-300">{row.xp.toLocaleString()}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">XP</div>
      </div>
    </div>
  );
}
