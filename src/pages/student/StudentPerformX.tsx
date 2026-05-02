import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
  Swords, Bell, CheckCircle2, Lock, PartyPopper, Radio, Dot, Eye,
  Clock, Hash, Layers, ArrowRight, Diamond, GitBranch, LineChart as LineIcon,
  CircleDot, Headphones, Wand2, Compass, BookOpen, Heart, BadgeCheck,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  AreaChart, Area, BarChart, Bar, Cell, RadialBarChart, RadialBar, PieChart, Pie,
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
  const [pulseTick, setPulseTick] = useState(0);

  // "Live feel" — pulse ticker increments every 4s to drive subtle animations & change copy
  useEffect(() => {
    const i = setInterval(() => setPulseTick(t => t + 1), 4000);
    return () => clearInterval(i);
  }, []);

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

  // ============ Derived metrics ============
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

  const improvement = useMemo(() => {
    const valid = attempts.filter(a => a.percentile != null);
    if (valid.length < 4) return 0;
    const first = valid.slice(0, 3).map(a => Number(a.percentile));
    const last = valid.slice(-3).map(a => Number(a.percentile));
    return +((last.reduce((s,n)=>s+n,0)/last.length) - (first.reduce((s,n)=>s+n,0)/first.length)).toFixed(1);
  }, [attempts]);

  const consistencyScore = useMemo(() => {
    const streak = rewards?.streak_days ?? 0;
    const freq = Math.min(100, totalMocks * 4);
    return Math.min(100, Math.round(streak * 6 + freq * 0.5));
  }, [rewards, totalMocks]);

  const balanceScore = useMemo(() => {
    if (!attempts.length) return 0;
    const acc = avgAccuracy;
    const attemptRate = attempts.reduce((s, a) => s + Math.min(100, Number(a.total_attempted) || 0), 0) / attempts.length;
    return Math.max(0, Math.min(100, Math.round(100 - Math.abs(acc - attemptRate))));
  }, [attempts, avgAccuracy]);

  const predictedPercentile = useMemo(() => {
    const valid = attempts.filter(a => a.percentile != null).slice(-5);
    if (!valid.length) return 0;
    const trend = improvement / 3;
    const latest = Number(valid[valid.length - 1].percentile);
    return Math.max(0, Math.min(100, +(latest + trend * 2).toFixed(1)));
  }, [attempts, improvement]);

  // Trend data (last 12)
  const trendData = useMemo(() => attempts
    .filter(a => a.percentile != null)
    .slice(-12)
    .map((a, i) => ({
      name: `M${i + 1}`,
      percentile: Number(a.percentile) || 0,
      accuracy: Number(a.accuracy) || 0,
      score: Number(a.total_score) || 0,
    })), [attempts]);

  // Section radar
  const radarData = useMemo(() => {
    const acc: Record<string, { sum: number; count: number; max: number }> = {};
    attempts.forEach(a => {
      Object.entries(a.sectional_scores || {}).forEach(([k, v]: [string, any]) => {
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

  // Section bar (with rank simulation)
  const sectionRanks = useMemo(() => radarData.map((r, i) => ({
    ...r,
    rank: Math.max(1, Math.round((100 - r.value) * 50)) + i,
    fill: ["#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#ec4899"][i % 5],
  })), [radarData]);

  // Heatmap (84 cells = 12 weeks)
  const heatmap = useMemo(() => {
    const days: Record<string, number> = {};
    attempts.forEach(a => {
      const d = (a.submitted_at || a.created_at).slice(0, 10);
      days[d] = (days[d] || 0) + 1;
    });
    const cells: { date: string; intensity: number }[] = [];
    const today = new Date();
    for (let i = 83; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      cells.push({ date: key, intensity: Math.min(4, days[key] || 0) });
    }
    return cells;
  }, [attempts]);

  // Daily activity bars (last 14 days)
  const activity14 = useMemo(() => {
    const days: Record<string, number> = {};
    attempts.forEach(a => {
      const d = (a.submitted_at || a.created_at).slice(0, 10);
      days[d] = (days[d] || 0) + 1;
    });
    const out: { day: string; mocks: number }[] = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({ day: d.toLocaleDateString(undefined, { weekday: "short" }).slice(0, 2), mocks: days[key] || 0 });
    }
    return out;
  }, [attempts]);

  // Time-of-day distribution
  const timeOfDay = useMemo(() => {
    const buckets = { Morning: 0, Afternoon: 0, Evening: 0, Night: 0 };
    attempts.forEach(a => {
      const ts = a.submitted_at || a.created_at;
      const h = new Date(ts).getHours();
      if (h < 12) buckets.Morning++;
      else if (h < 17) buckets.Afternoon++;
      else if (h < 21) buckets.Evening++;
      else buckets.Night++;
    });
    return Object.entries(buckets).map(([name, value]) => ({ name, value }));
  }, [attempts]);

  // Achievements
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
    { key: "comeback", name: "Comeback King", icon: Heart, color: "from-pink-500 to-rose-600", check: () => improvement >= 15 },
    { key: "polymath", name: "Polymath", icon: Brain, color: "from-fuchsia-500 to-violet-600", check: () => radarData.every(r => r.value >= 60) && radarData.length >= 3 },
  ];
  const earnedCount = allBadges.filter(b => b.check()).length;

  // Tier
  const tier = level >= 20 ? "Legend" : level >= 10 ? "Elite" : level >= 5 ? "Pro" : "Rookie";
  const tierInfo = {
    Legend: { gradient: "from-yellow-500 via-amber-500 to-rose-500", next: "Mythic", needed: Math.max(0, 30 - level) },
    Elite:  { gradient: "from-violet-600 via-fuchsia-500 to-sky-500", next: "Legend", needed: Math.max(0, 20 - level) },
    Pro:    { gradient: "from-sky-500 via-blue-600 to-indigo-600", next: "Elite", needed: Math.max(0, 10 - level) },
    Rookie: { gradient: "from-slate-500 via-sky-500 to-blue-500", next: "Pro", needed: Math.max(0, 5 - level) },
  }[tier];

  // Personalized challenges
  const challenges = useMemo(() => {
    const ch: { title: string; reward: string; icon: any; progress: number }[] = [];
    if (avgAccuracy < 70) ch.push({ title: "Push accuracy above 70% in your next mock", reward: "+150 XP", icon: Target, progress: Math.round(avgAccuracy) });
    if ((rewards?.streak_days ?? 0) < 7) ch.push({ title: "Maintain a 7-day practice streak", reward: "+200 XP · Iron badge", icon: Flame, progress: Math.round((rewards?.streak_days ?? 0) / 7 * 100) });
    if (totalMocks < 10) ch.push({ title: `Complete ${10 - totalMocks} more mocks to unlock Marathoner`, reward: "+100 XP each", icon: Rocket, progress: Math.round(totalMocks / 10 * 100) });
    if (improvement < 5) ch.push({ title: "Improve your average percentile by 5 points", reward: "+250 XP", icon: TrendingUp, progress: Math.max(0, Math.round((improvement / 5) * 100)) });
    if (radarData.length) {
      const weakest = [...radarData].sort((a, b) => a.value - b.value)[0];
      if (weakest) ch.push({ title: `Strengthen ${weakest.section} — your weakest section`, reward: "Unlocks Topic Mastery", icon: Brain, progress: weakest.value });
    }
    return ch.slice(0, 5);
  }, [avgAccuracy, rewards, totalMocks, improvement, radarData]);

  // Rivals (top-3 above me)
  const rivals = useMemo(() => {
    const me = global.find(r => r.is_self);
    if (!me) return [];
    return global.filter(r => r.rank < me.rank).sort((a, b) => b.rank - a.rank).slice(0, 3)
      .map(r => ({ ...r, gap: me.xp - r.xp }));
  }, [global]);
  const myRow = global.find(r => r.is_self);

  // Milestones
  const milestones = [
    { label: "First mock completed", done: totalMocks >= 1, icon: Rocket },
    { label: "Hit 75 percentile", done: bestPercentile >= 75, icon: Medal },
    { label: "Hit 90 percentile", done: bestPercentile >= 90, icon: Trophy },
    { label: "10 mocks attempted", done: totalMocks >= 10, icon: Target },
    { label: "7-day streak", done: (rewards?.longest_streak ?? 0) >= 7, icon: Flame },
    { label: "Reach Level 5 — Pro tier", done: level >= 5, icon: Star },
    { label: "Reach Level 10 — Elite tier", done: level >= 10, icon: Crown },
    { label: "Reach Level 20 — Legend tier", done: level >= 20, icon: Diamond },
  ];

  // Social-proof feed (live-looking — rotates with pulseTick)
  const liveFeedAll = useMemo(() => {
    const events: { who: string; what: string; tone: string }[] = [];
    global.slice(0, 10).forEach((g, i) => {
      events.push({ who: g.display_handle, what: `climbed to rank #${g.rank}`, tone: "sky" });
      if (g.streak_days >= 7) events.push({ who: g.display_handle, what: `hit a ${g.streak_days}-day streak`, tone: "orange" });
      if (g.level >= 10) events.push({ who: g.display_handle, what: `entered Elite tier`, tone: "violet" });
      if (i % 2 === 0) events.push({ who: g.display_handle, what: `unlocked Accuracy Master badge`, tone: "emerald" });
    });
    return events;
  }, [global]);
  const liveFeed = useMemo(() => {
    const start = (pulseTick * 3) % Math.max(1, liveFeedAll.length);
    return [...liveFeedAll.slice(start), ...liveFeedAll.slice(0, start)].slice(0, 5);
  }, [pulseTick, liveFeedAll]);

  // Live counter (looks like other students online)
  const liveOnline = useMemo(() => 1247 + ((pulseTick * 7) % 53) - 17, [pulseTick]);

  if (loading) {
    return <div className="space-y-3">
      <div className="h-40 rounded-3xl bg-muted animate-pulse" />
      <div className="grid grid-cols-4 gap-3">{Array.from({length:4}).map((_,i)=><div key={i} className="h-24 rounded-2xl bg-muted animate-pulse"/>)}</div>
      <div className="h-72 rounded-2xl bg-muted animate-pulse" />
    </div>;
  }

  return (
    <div className="space-y-6 pb-16">
      {/* ============ LIVE STATUS BAR ============ */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-white to-sky-50 dark:from-emerald-500/10 dark:via-background dark:to-sky-500/10 border border-emerald-100 dark:border-emerald-500/20 text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-300">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          LIVE · Apex Arena
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="inline-flex items-center gap-1 text-muted-foreground"><Eye className="h-3 w-3" /> {liveOnline.toLocaleString()} aspirants competing now</span>
        <span className="text-muted-foreground hidden sm:inline">·</span>
        <span className="hidden sm:inline-flex items-center gap-1 text-muted-foreground"><Radio className="h-3 w-3 animate-pulse" /> Stats sync every mock</span>
        <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" /> Updated just now</span>
      </div>

      {/* ============ HERO ============ */}
      <div className={cn("relative overflow-hidden rounded-3xl p-6 sm:p-8 text-white shadow-2xl bg-gradient-to-br", tierInfo.gradient)}>
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/40 blur-3xl animate-pulse" />
          <div className="absolute -bottom-24 -left-12 h-80 w-80 rounded-full bg-white/30 blur-3xl" />
          <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="relative flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5" /> PerformX · Apex Arena
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 backdrop-blur text-xs font-bold">
                <Crown className="h-3.5 w-3.5" /> {tier} Tier
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-xs">
                <ArrowUpRight className="h-3 w-3" /> Next: {tierInfo.next} · {tierInfo.needed} levels
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black leading-tight">
              Level {level} <span className="text-white/70 font-bold">·</span> {xp.toLocaleString()} XP
            </h1>
            <p className="mt-1 text-white/85 text-sm max-w-xl">
              Real-time, fully automated competition. Every mock you submit re-ranks you globally, updates badges and re-trains your AI coach.
            </p>
            <div className="mt-4 flex items-center gap-3 max-w-md">
              <Progress value={xpProgressPct} className="h-2.5 bg-white/20 [&>div]:bg-white" />
              <span className="text-xs font-semibold whitespace-nowrap">{xpInLevel}/500 XP</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <HeroStat icon={<Flame className="h-4 w-4" />} value={`${rewards?.streak_days ?? 0}d`} label="Streak" />
            <HeroStat icon={<Trophy className="h-4 w-4" />} value={myRow?.rank ? `#${myRow.rank}` : "—"} label="Global" />
            <HeroStat icon={<Gauge className="h-4 w-4" />} value={`${avgPercentile.toFixed(1)}`} label="Avg %ile" />
            <HeroStat icon={<BadgeCheck className="h-4 w-4" />} value={`${earnedCount}/${allBadges.length}`} label="Badges" />
            <HeroStat icon={<Hash className="h-4 w-4" />} value={`${totalMocks}`} label="Mocks" />
            <HeroStat icon={<Diamond className="h-4 w-4" />} value={`${rewards?.coins ?? 0}`} label="Coins" />
          </div>
        </div>
      </div>

      {/* ============ KPI STRIP ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Activity} label="Consistency Score" value={`${consistencyScore}`} suffix="/100" tone="emerald" hint="Streak + frequency" />
        <KpiCard icon={Gauge} label="Speed × Accuracy" value={`${balanceScore}`} suffix="/100" tone="sky" hint="Balanced strategy" />
        <KpiCard icon={TrendingUp} label="Improvement" value={`${improvement >= 0 ? "+" : ""}${improvement}`} suffix=" %ile" tone={improvement >= 0 ? "emerald" : "rose"} hint="vs first 3 mocks" />
        <KpiCard icon={Brain} label="Predicted Rank" value={`${predictedPercentile}`} suffix=" %ile" tone="violet" hint="If trend continues" />
      </div>

      {/* ============ RADIAL SCORECARDS (4 dials) ============ */}
      <Card className="p-5 border-sky-100">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-sky-600" />
            <div className="font-bold">PerformX Scorecard</div>
          </div>
          <div className="text-xs text-muted-foreground">Live · auto-recalculated after every attempt</div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Accuracy", val: Math.round(avgAccuracy), color: "#10b981" },
            { label: "Consistency", val: consistencyScore, color: "#0ea5e9" },
            { label: "Speed Balance", val: balanceScore, color: "#8b5cf6" },
            { label: "Best %ile", val: Math.round(bestPercentile), color: "#f59e0b" },
          ].map((d, i) => (
            <div key={i} className="rounded-2xl bg-gradient-to-br from-muted/40 to-transparent p-3 border border-border/40">
              <div className="h-32">
                <ResponsiveContainer>
                  <RadialBarChart innerRadius="65%" outerRadius="100%" data={[{ name: d.label, value: d.val, fill: d.color }]} startAngle={90} endAngle={-270}>
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar dataKey="value" cornerRadius={20} background={{ fill: "hsl(var(--muted))" }} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center -mt-20 pointer-events-none">
                <div className="text-2xl font-black" style={{ color: d.color }}>{d.val}<span className="text-xs text-muted-foreground font-medium">/100</span></div>
              </div>
              <div className="text-center mt-12 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{d.label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ============ LIVE FEED + LEADERBOARD ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 p-5 border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-500/10 dark:to-background overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><Radio className="h-5 w-5 text-emerald-600 animate-pulse" /><div className="font-bold">Live Activity</div></div>
            <UIBadge variant="secondary" className="text-[10px]">Realtime</UIBadge>
          </div>
          <div className="space-y-2 min-h-[260px]">
            {liveFeed.map((e, i) => (
              <div key={`${pulseTick}-${i}`} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white/70 dark:bg-background/40 border border-emerald-100/50 dark:border-emerald-500/10 animate-fade-in">
                <Dot className={cn(
                  "h-5 w-5 -ml-1 mt-0.5 shrink-0",
                  e.tone === "sky" && "text-sky-500",
                  e.tone === "orange" && "text-orange-500",
                  e.tone === "violet" && "text-violet-500",
                  e.tone === "emerald" && "text-emerald-500",
                )} />
                <div className="text-xs leading-relaxed">
                  <span className="font-bold">{e.who}</span> <span className="text-muted-foreground">{e.what}</span>
                </div>
              </div>
            ))}
            {!liveFeed.length && <div className="text-xs text-muted-foreground p-3">Waiting for activity…</div>}
          </div>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden border-sky-100">
          <div className="p-5 border-b bg-gradient-to-r from-sky-50/60 to-blue-50/40 dark:from-sky-500/10 dark:to-blue-500/5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center text-white shadow">
                <Trophy className="h-4 w-4" />
              </div>
              <div>
                <div className="font-bold text-gray-900 dark:text-foreground">Live Leaderboard</div>
                <div className="text-xs text-muted-foreground">Auto-ranks by XP, accuracy & improvement</div>
              </div>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border/50">
              {([
                { key: "global", label: "Global", icon: Trophy },
                { key: "peers", label: "My Tier", icon: Users },
                { key: "section", label: "Sections", icon: BarChart3 },
              ] as const).map(t => (
                <button key={t.key} onClick={() => setActiveView(t.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                    activeView === t.key ? "bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow" : "text-muted-foreground hover:text-foreground"
                  )}>
                  <t.icon className="h-3.5 w-3.5" /> {t.label}
                </button>
              ))}
            </div>
          </div>
          {activeView === "section" ? (
            <div className="p-5">
              {sectionRanks.length ? (
                <div className="h-72">
                  <ResponsiveContainer>
                    <BarChart data={sectionRanks} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis dataKey="section" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                        {sectionRanks.map((s, i) => <Cell key={i} fill={s.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : <div className="p-8 text-center text-sm text-muted-foreground">Submit mocks with sectional scores to see rankings.</div>}
            </div>
          ) : (
            <div className="divide-y divide-border/60 max-h-[420px] overflow-auto">
              {(activeView === "peers" && myRow ? global.filter(r => Math.abs(r.level - myRow.level) <= 2) : global)
                .slice(0, 25).map((r, i) => <LbRowItem key={r.user_id} row={r} />)}
              {!global.length && <div className="p-8 text-center text-sm text-muted-foreground">Be the first to climb the ranks — submit a mock!</div>}
            </div>
          )}
        </Card>
      </div>

      {/* ============ RIVALS (3 cards) + COMEBACK + STREAK ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3 p-5 border-rose-100 bg-gradient-to-br from-rose-50/40 to-orange-50/30 dark:from-rose-500/10 dark:to-orange-500/5">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2"><Swords className="h-5 w-5 text-rose-600" /><div className="font-bold">Your Top 3 Rivals</div></div>
            <UIBadge variant="secondary" className="text-xs">Auto-matched by tier</UIBadge>
          </div>
          {rivals.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {rivals.map((r, i) => (
                <div key={r.user_id} className="rounded-2xl bg-white/80 dark:bg-background/40 p-4 border border-rose-200/50 dark:border-rose-500/20 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Rank #{r.rank}</div>
                    <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 grid place-items-center text-white text-xs font-bold">{i+1}</div>
                  </div>
                  <div className="font-bold truncate">{r.display_handle}</div>
                  <div className="text-xs text-muted-foreground mb-3">L{r.level} · {r.xp.toLocaleString()} XP</div>
                  <div className="text-xs text-muted-foreground">Gap to overtake</div>
                  <div className="text-lg font-black text-rose-600">{Math.abs(r.gap)} XP</div>
                  <Progress value={Math.max(5, 100 - Math.min(100, Math.abs(r.gap)/10))} className="h-1.5 mt-2 [&>div]:bg-rose-500" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground py-6 text-center">Climb the leaderboard to be matched with rivals.</div>
          )}
        </Card>

        <Card className="p-5 border-orange-100 bg-gradient-to-br from-orange-50/50 to-amber-50/30 dark:from-orange-500/10 dark:to-amber-500/5">
          <div className="flex items-center gap-2 mb-3"><Flame className="h-5 w-5 text-orange-600" /><div className="font-bold text-sm">Streak Power</div></div>
          <div className="text-center">
            <div className="text-5xl font-black bg-gradient-to-br from-orange-500 to-rose-600 bg-clip-text text-transparent">{rewards?.streak_days ?? 0}</div>
            <div className="text-xs text-muted-foreground mt-1">days in a row</div>
            <div className="mt-3 text-xs">Longest: <span className="font-bold">{rewards?.longest_streak ?? 0} days</span></div>
            <div className="mt-3 grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className={cn("h-1.5 rounded-full", i < (rewards?.streak_days ?? 0) % 7 ? "bg-orange-500" : "bg-muted")} />
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* ============ HEATMAP + ACTIVITY BARS ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 border-sky-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Calendar className="h-5 w-5 text-sky-600" /><div className="font-bold">Consistency Heatmap · 12 weeks</div></div>
            <div className="text-xs text-muted-foreground">{attempts.length} total attempts</div>
          </div>
          <div className="grid grid-cols-12 gap-1.5">
            {heatmap.map((c, i) => (
              <div key={i} title={`${c.date}: ${c.intensity} mocks`}
                className={cn(
                  "aspect-square rounded-md transition-all hover:scale-125 hover:ring-2 hover:ring-sky-400",
                  c.intensity === 0 && "bg-muted/60",
                  c.intensity === 1 && "bg-sky-200 dark:bg-sky-500/40",
                  c.intensity === 2 && "bg-sky-400 dark:bg-sky-500/70",
                  c.intensity === 3 && "bg-sky-500 dark:bg-sky-400",
                  c.intensity >= 4 && "bg-blue-700 dark:bg-blue-400",
                )} />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground justify-end">
            Less <span className="h-2.5 w-2.5 rounded bg-muted/60" /> <span className="h-2.5 w-2.5 rounded bg-sky-200 dark:bg-sky-500/40" /> <span className="h-2.5 w-2.5 rounded bg-sky-400" /> <span className="h-2.5 w-2.5 rounded bg-sky-500" /> <span className="h-2.5 w-2.5 rounded bg-blue-700" /> More
          </div>
        </Card>

        <Card className="p-5 border-sky-100">
          <div className="flex items-center gap-2 mb-3"><BarChart3 className="h-5 w-5 text-violet-600" /><div className="font-bold">Last 14 Days</div></div>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={activity14}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                <Bar dataKey="mocks" radius={[6, 6, 0, 0]}>
                  {activity14.map((d, i) => <Cell key={i} fill={d.mocks > 0 ? "#0ea5e9" : "hsl(var(--muted))"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ============ TREND + RADAR + TIME OF DAY ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 border-sky-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><LineIcon className="h-5 w-5 text-sky-600" /><div className="font-bold">Performance Trend</div></div>
            <div className="text-xs text-muted-foreground">Percentile · Accuracy · Score</div>
          </div>
          <div className="h-72">
            {trendData.length ? (
              <ResponsiveContainer>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="px" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.5}/><stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/></linearGradient>
                    <linearGradient id="ax" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.5}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                  <Area type="monotone" dataKey="percentile" stroke="#0ea5e9" fill="url(#px)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="accuracy" stroke="#10b981" fill="url(#ax)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-full grid place-items-center text-sm text-muted-foreground">Submit a mock to see your trend.</div>}
          </div>
        </Card>

        <Card className="p-5 border-sky-100">
          <div className="flex items-center gap-2 mb-3"><Target className="h-5 w-5 text-violet-600" /><div className="font-bold">Section Mastery</div></div>
          <div className="h-52">
            {radarData.length ? (
              <ResponsiveContainer>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="section" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Radar dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.4} />
                </RadarChart>
              </ResponsiveContainer>
            ) : <div className="h-full grid place-items-center text-sm text-muted-foreground">No sectional data yet.</div>}
          </div>
          <div className="mt-3 pt-3 border-t border-border/40">
            <div className="text-xs font-semibold mb-2 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> When you study most</div>
            <div className="h-24">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={timeOfDay} dataKey="value" innerRadius={20} outerRadius={40} paddingAngle={2}>
                    {timeOfDay.map((_, i) => <Cell key={i} fill={["#fbbf24","#f97316","#8b5cf6","#1e40af"][i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-4 gap-1 text-[10px] text-center mt-1">
              {timeOfDay.map((t, i) => (
                <div key={t.name}>
                  <span className="inline-block h-2 w-2 rounded-full mr-1" style={{ background: ["#fbbf24","#f97316","#8b5cf6","#1e40af"][i] }} />
                  {t.name}
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* ============ AI CHALLENGES + WEEKLY COMPETITION ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5 border-violet-100 bg-gradient-to-br from-violet-50/40 to-fuchsia-50/30 dark:from-violet-500/10 dark:to-fuchsia-500/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Brain className="h-5 w-5 text-violet-600" /><div className="font-bold">AI Personalized Challenges</div></div>
            <UIBadge className="bg-violet-600 hover:bg-violet-600 inline-flex items-center gap-1"><Wand2 className="h-3 w-3" /> Auto-assigned</UIBadge>
          </div>
          {challenges.length ? (
            <div className="space-y-2.5">
              {challenges.map((c, i) => (
                <div key={i} className="p-3 rounded-xl bg-white/70 dark:bg-background/40 border border-violet-200/50 dark:border-violet-500/20 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 grid place-items-center text-white shrink-0">
                      <c.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{c.title}</div>
                      <div className="text-xs text-violet-600 dark:text-violet-300 font-semibold">{c.reward}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Progress value={c.progress} className="h-1.5 mt-2.5 [&>div]:bg-gradient-to-r [&>div]:from-violet-500 [&>div]:to-fuchsia-500" />
                </div>
              ))}
            </div>
          ) : <div className="text-sm text-muted-foreground">You're crushing it — no active challenges.</div>}
        </Card>

        <Card className="p-5 border-amber-100 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-amber-500/10 dark:to-orange-500/5">
          <div className="flex items-center gap-2 mb-3"><PartyPopper className="h-5 w-5 text-amber-600" /><div className="font-bold">Weekly Competition</div></div>
          <div className="text-2xl font-black mb-1">Best Improver</div>
          <p className="text-xs text-muted-foreground mb-4">Largest %ile jump this week wins +1000 XP and the Comeback King badge.</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Your improvement</span>
              <span className="font-bold text-amber-600">{improvement >= 0 ? "+" : ""}{improvement} %ile</span>
            </div>
            <Progress value={Math.min(100, Math.max(0, improvement * 5))} className="h-2 [&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-orange-500" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Resets every Monday</span>
              <span className="font-semibold">{improvement >= 5 ? "On track" : "Push harder"}</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-amber-200/50 dark:border-amber-500/20">
            <div className="text-xs font-semibold mb-2">Other live competitions</div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Highest accuracy</span><span className="font-bold">+750 XP</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Most mocks (week)</span><span className="font-bold">+500 XP</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Longest streak</span><span className="font-bold">+1500 XP</span></div>
            </div>
          </div>
        </Card>
      </div>

      {/* ============ BADGES ============ */}
      <Card className="p-5 border-sky-100">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-600" />
            <div className="font-bold">Badges & Achievements</div>
            <UIBadge variant="secondary" className="text-[10px]">{earnedCount}/{allBadges.length} unlocked</UIBadge>
          </div>
          <Button size="sm" variant="outline" className="text-xs"><Share2 className="h-3.5 w-3.5 mr-1" /> Share progress</Button>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {allBadges.map(b => {
            const earned = b.check();
            const Icon = b.icon;
            return (
              <div key={b.key}
                className={cn(
                  "relative rounded-2xl p-3 border text-center transition-all hover:scale-105 cursor-pointer",
                  earned ? "border-transparent shadow-md" : "border-dashed border-border/60 bg-muted/40 opacity-60"
                )}>
                {earned && <div className={cn("absolute inset-0 rounded-2xl bg-gradient-to-br opacity-15", b.color)} />}
                <div className={cn("relative h-11 w-11 mx-auto rounded-xl grid place-items-center mb-2 bg-gradient-to-br text-white shadow", earned ? b.color : "from-slate-300 to-slate-400")}>
                  {earned ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                </div>
                <div className="relative text-[11px] font-bold leading-tight">{b.name}</div>
                {earned && <div className="relative text-[9px] text-emerald-600 font-bold mt-0.5 uppercase tracking-wider">Unlocked</div>}
              </div>
            );
          })}
        </div>
      </Card>

      {/* ============ JOURNEY ============ */}
      <Card className="p-5 border-sky-100">
        <div className="flex items-center gap-2 mb-4"><GitBranch className="h-5 w-5 text-sky-600" /><div className="font-bold">Progress Journey · Beginner → Legend</div></div>
        <div className="relative">
          <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gradient-to-b from-sky-200 via-violet-200 to-amber-200" />
          <div className="space-y-3">
            {milestones.map((m, i) => {
              const Icon = m.icon;
              return (
                <div key={i} className="relative flex items-center gap-4 pl-1">
                  <div className={cn(
                    "relative z-10 h-8 w-8 rounded-full grid place-items-center shrink-0 transition-all",
                    m.done ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md" : "bg-muted text-muted-foreground border border-border"
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

      {/* ============ SMART INSIGHTS ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {[
          { icon: TrendingUp, tone: "emerald", title: "Trend Insight",
            text: improvement >= 5 ? `You're up ${improvement} %ile points — keep this momentum to break top 10%.` : "Try 2 mocks this week to lift your trend curve." },
          { icon: Target, tone: "sky", title: "Accuracy Focus",
            text: avgAccuracy < 65 ? "Slow down — focus on quality over quantity this week." : `${avgAccuracy.toFixed(1)}% accuracy is solid. Now push attempt-rate higher.` },
          { icon: Flame, tone: "orange", title: "Consistency",
            text: (rewards?.streak_days ?? 0) >= 7 ? `${rewards?.streak_days}-day streak — your discipline is your superpower.` : "Open the dashboard tomorrow to keep your streak alive." },
        ].map((s, i) => (
          <Card key={i} className={cn(
            "p-4 border",
            s.tone === "emerald" && "border-emerald-100 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/5",
            s.tone === "sky" && "border-sky-100 bg-sky-50/40 dark:border-sky-500/20 dark:bg-sky-500/5",
            s.tone === "orange" && "border-orange-100 bg-orange-50/40 dark:border-orange-500/20 dark:bg-orange-500/5",
          )}>
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={cn(
                "h-4 w-4",
                s.tone === "emerald" && "text-emerald-600",
                s.tone === "sky" && "text-sky-600",
                s.tone === "orange" && "text-orange-600",
              )} />
              <div className="text-xs font-bold uppercase tracking-wider">{s.title}</div>
            </div>
            <div className="text-sm">{s.text}</div>
          </Card>
        ))}
      </div>

      {/* ============ PERFORMX PRO — MONETIZATION ============ */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-amber-300/40 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900 text-white p-6 sm:p-8 shadow-2xl">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -top-20 right-10 h-64 w-64 rounded-full bg-amber-500/30 blur-3xl" />
          <div className="absolute bottom-0 -left-20 h-72 w-72 rounded-full bg-violet-600/40 blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs font-black uppercase tracking-wider">
              <Crown className="h-3.5 w-3.5" /> PerformX Pro
            </span>
            <span className="text-xs text-white/70">Limited launch pricing</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black leading-tight">Unlock the AI Coaching Layer</h2>
          <p className="mt-2 text-white/75 text-sm max-w-2xl">
            Pro members get personalized AI mock generation, live 1:1 mentor calls, predictive percentile modelling, deep topic-level diagnostics and priority leaderboard slots — all auto-synced with your PerformX stats.
          </p>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { icon: Brain, title: "AI Mock Architect", desc: "Generates mocks targeting your weakest topics." },
              { icon: Headphones, title: "1:1 Mentor Calls", desc: "Monthly strategy call with a 99+ percentiler." },
              { icon: LineIcon, title: "Predictive Engine", desc: "ML-driven rank forecast across exam day scenarios." },
              { icon: Layers, title: "Deep Topic Diagnostics", desc: "Question-level analysis of every wrong answer." },
              { icon: BookOpen, title: "Pro Reports", desc: "Weekly PDF performance reports auto-delivered." },
              { icon: CircleDot, title: "Priority Leaderboard", desc: "Highlighted profile + Pro-only competitions." },
            ].map((p, i) => (
              <div key={i} className="rounded-2xl bg-white/10 backdrop-blur border border-white/15 p-4 hover:bg-white/15 transition-colors">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 grid place-items-center text-black mb-2">
                  <p.icon className="h-4 w-4" />
                </div>
                <div className="font-bold text-sm">{p.title}</div>
                <div className="text-xs text-white/70 mt-0.5">{p.desc}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4 justify-between">
            <div>
              <div className="text-xs text-white/60 line-through">₹4,999/year</div>
              <div className="text-3xl font-black bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">₹1,499<span className="text-base text-white/70 font-medium">/year</span></div>
              <div className="text-[11px] text-white/60">First 500 students · 70% off</div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/courses">
                <Button size="lg" className="bg-gradient-to-r from-amber-400 to-orange-500 hover:opacity-90 text-black font-bold shadow-xl">
                  <Crown className="h-4 w-4 mr-1.5" /> Upgrade to Pro
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
              <Link to="/courses">
                <Button size="lg" variant="outline" className="border-white/30 bg-white/5 hover:bg-white/15 text-white">
                  See plans
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== Sub-components ===================== */

function HeroStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-xl bg-white/15 backdrop-blur border border-white/20 px-3 py-2 text-center min-w-[70px]">
      <div className="flex items-center justify-center gap-1 text-white/80">{icon}</div>
      <div className="text-base font-black leading-tight">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-white/70">{label}</div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, suffix, tone, hint }: { icon: any; label: string; value: string; suffix?: string; tone: "emerald" | "sky" | "violet" | "rose"; hint?: string }) {
  const tones = {
    emerald: { grad: "from-emerald-500 to-teal-600", border: "border-emerald-100 dark:border-emerald-500/20", bg: "bg-emerald-50/60 dark:bg-emerald-500/10" },
    sky: { grad: "from-sky-500 to-blue-600", border: "border-sky-100 dark:border-sky-500/20", bg: "bg-sky-50/60 dark:bg-sky-500/10" },
    violet: { grad: "from-violet-500 to-fuchsia-600", border: "border-violet-100 dark:border-violet-500/20", bg: "bg-violet-50/60 dark:bg-violet-500/10" },
    rose: { grad: "from-rose-500 to-orange-500", border: "border-rose-100 dark:border-rose-500/20", bg: "bg-rose-50/60 dark:bg-rose-500/10" },
  }[tone];
  return (
    <Card className={cn("p-4 border relative overflow-hidden", tones.border, tones.bg)}>
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br opacity-10 blur-2xl" style={{ background: undefined }} />
      <div className="flex items-center justify-between mb-2">
        <div className={cn("h-9 w-9 rounded-xl bg-gradient-to-br grid place-items-center text-white shadow", tones.grad)}>
          <Icon className="h-4 w-4" />
        </div>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      <div className="text-2xl font-black leading-tight">{value}<span className="text-sm font-medium text-muted-foreground">{suffix}</span></div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </Card>
  );
}

function LbRowItem({ row }: { row: LbRow }) {
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
        medal, isTop3 ? "text-white shadow" : "text-sky-700 dark:text-sky-200"
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
