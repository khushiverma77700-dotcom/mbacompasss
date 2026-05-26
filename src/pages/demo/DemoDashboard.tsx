import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, BookOpenCheck, BarChart3, Brain, Trophy, CalendarDays,
  Sparkles, Bell, Target, Flame, TrendingUp, Award, Zap, Clock, Rocket,
  GraduationCap, Activity, Layers, ChevronRight, Lock, Menu, X, Star,
  CheckCircle2, ArrowRight, ShoppingBag, Compass, BookMarked, FileText,
  Gauge, PieChart as PieIcon, LineChart as LineIcon,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend,
} from "recharts";

/* =========================================================================
   Dummy data — realistic enough to feel premium
   ========================================================================= */
const STUDENT = {
  name: "Aarav Sharma",
  target: "IIM Ahmedabad · CAT '26",
  streak: 27,
  xp: 8420,
  level: 14,
  rank: 312,
  percentile: 96.4,
};

const PERF_TREND = [
  { m: "Mock 1", score: 62, percentile: 78, target: 95 },
  { m: "Mock 2", score: 71, percentile: 84, target: 95 },
  { m: "Mock 3", score: 68, percentile: 82, target: 95 },
  { m: "Mock 4", score: 79, percentile: 89, target: 95 },
  { m: "Mock 5", score: 84, percentile: 92, target: 95 },
  { m: "Mock 6", score: 88, percentile: 94, target: 95 },
  { m: "Mock 7", score: 92, percentile: 96.4, target: 95 },
];

const SECTIONAL_RADAR = [
  { area: "VARC", you: 88, top: 96 },
  { area: "DILR", you: 74, top: 94 },
  { area: "QA", you: 91, top: 97 },
  { area: "GK", you: 68, top: 88 },
  { area: "Vocab", you: 82, top: 92 },
];

const TIME_PIE = [
  { name: "Quant", value: 38, color: "#0284c7" },
  { name: "VARC", value: 28, color: "#06b6d4" },
  { name: "DILR", value: 22, color: "#3b82f6" },
  { name: "GK", value: 12, color: "#7dd3fc" },
];

const ACCURACY_BARS = [
  { topic: "Algebra", acc: 92 },
  { topic: "Geometry", acc: 78 },
  { topic: "RC", acc: 86 },
  { topic: "PJ", acc: 72 },
  { topic: "LR Sets", acc: 64 },
  { topic: "DI Caselet", acc: 81 },
];

const MOCKS = [
  { title: "CAT Full Mock #14 — Adaptive AI", type: "Full Length", duration: 120, questions: 66, badge: "LIVE", color: "from-rose-500 to-orange-500" },
  { title: "VARC Sectional — RC Mastery", type: "Sectional", duration: 40, questions: 24, badge: "NEW", color: "from-sky-500 to-blue-600" },
  { title: "DILR Crusher — Set Theory", type: "Topic Wise", duration: 30, questions: 16, badge: "AI", color: "from-violet-500 to-indigo-600" },
  { title: "Quant Sprint — Number System", type: "Topic Wise", duration: 25, questions: 20, badge: "HOT", color: "from-emerald-500 to-teal-600" },
  { title: "XAT Decision Making Drill", type: "Sectional", duration: 35, questions: 21, badge: "PRO", color: "from-fuchsia-500 to-pink-600" },
  { title: "NMAT Speed Test #07", type: "Full Length", duration: 120, questions: 108, badge: "LIVE", color: "from-amber-500 to-orange-600" },
];

const LEADERBOARD = [
  { rank: 1, name: "Ishita R.", xp: 14820, badge: "🥇" },
  { rank: 2, name: "Karthik V.", xp: 13990, badge: "🥈" },
  { rank: 3, name: "Niharika S.", xp: 13510, badge: "🥉" },
  { rank: 4, name: "Rohan M.", xp: 12880, badge: "" },
  { rank: 5, name: "Sneha P.", xp: 12110, badge: "" },
  { rank: 6, name: "Aarav Sharma", xp: 8420, badge: "you" },
];

const PLAN_TODAY = [
  { time: "07:00", task: "RC Practice — 3 passages", section: "VARC", done: true },
  { time: "10:00", task: "Geometry Concept + 20Q drill", section: "QA", done: true },
  { time: "13:30", task: "DILR Set — Caselet 4 sets", section: "DILR", done: false },
  { time: "17:00", task: "GK 50 Daily Current Affairs", section: "GK", done: false },
  { time: "20:00", task: "Mock #15 review + error log", section: "Review", done: false },
];

const NOTIFS = [
  { icon: Trophy, title: "You jumped 38 ranks in All-India Leaderboard", time: "12m ago", tone: "amber" },
  { icon: Sparkles, title: "New AI Mock unlocked: CAT Adaptive #14", time: "1h ago", tone: "sky" },
  { icon: Target, title: "Weekly goal 78% complete — keep pushing!", time: "3h ago", tone: "emerald" },
  { icon: Brain, title: "AI flagged 6 weak topics for revision", time: "yesterday", tone: "violet" },
];

const NAV = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "mocks", label: "Mock Tests", icon: BookOpenCheck },
  { id: "performance", label: "Performance", icon: BarChart3 },
  { id: "personalized", label: "Personalised Hub", icon: Brain },
  { id: "planner", label: "Day Planner", icon: CalendarDays },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
  { id: "vocabulary", label: "Vocabulary", icon: BookMarked },
  { id: "tools", label: "AI Tools", icon: Sparkles },
  { id: "notifications", label: "Notifications", icon: Bell },
];

/* =========================================================================
   Shared UI atoms
   ========================================================================= */
function StatCard({ icon: Icon, label, value, sub, accent }: any) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="relative overflow-hidden rounded-2xl border border-sky-100 bg-white p-4 shadow-sm"
    >
      <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${accent} opacity-15 blur-xl`} />
      <div className="flex items-center justify-between">
        <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow`}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-xs font-medium text-emerald-600">▲ live</span>
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">{value}</div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      {sub && <div className="mt-1 text-[11px] text-slate-400">{sub}</div>}
    </motion.div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: any) {
  return (
    <div className="mb-4 flex items-end justify-between">
      <div>
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-sky-600" />}
          <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>
        </div>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}

/* =========================================================================
   View: Overview
   ========================================================================= */
function ViewOverview() {
  return (
    <div className="space-y-6">
      {/* Hero greeting */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-600 via-blue-600 to-indigo-700 p-6 text-white shadow-xl"
      >
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
        <motion.div animate={{ rotate: -360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-20 -left-10 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold backdrop-blur">
              <GraduationCap className="h-3.5 w-3.5" /> {STUDENT.target}
            </div>
            <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Good morning, {STUDENT.name} 👋</h1>
            <p className="mt-1 text-sm text-sky-100">You're <span className="font-semibold text-white">{STUDENT.percentile}%ile</span> · {STUDENT.streak}-day streak · Rank #{STUDENT.rank}</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur">
              <div className="text-2xl font-bold">{STUDENT.xp.toLocaleString()}</div>
              <div className="text-[11px] uppercase tracking-wide text-sky-100">XP · Lv {STUDENT.level}</div>
            </div>
            <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur">
              <div className="flex items-center gap-1 text-2xl font-bold"><Flame className="h-5 w-5 text-amber-300" /> {STUDENT.streak}</div>
              <div className="text-[11px] uppercase tracking-wide text-sky-100">Day Streak</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Trophy} label="Best Percentile" value="96.4%" sub="+2.1 vs last" accent="from-amber-400 to-orange-500" />
        <StatCard icon={BookOpenCheck} label="Mocks Attempted" value="42" sub="of 60 unlocked" accent="from-sky-500 to-blue-600" />
        <StatCard icon={Brain} label="AI Sessions" value="128" sub="this month" accent="from-violet-500 to-fuchsia-600" />
        <StatCard icon={TrendingUp} label="Accuracy" value="81%" sub="↑ 6% week" accent="from-emerald-500 to-teal-600" />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <SectionTitle icon={LineIcon} title="Percentile Trajectory" subtitle="Last 7 full-length mocks" />
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={PERF_TREND}>
              <defs>
                <linearGradient id="gPerc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="m" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[60, 100]} />
              <RTooltip />
              <Area type="monotone" dataKey="percentile" stroke="#0284c7" fill="url(#gPerc)" strokeWidth={2.4} />
              <Line type="monotone" dataKey="target" stroke="#f59e0b" strokeDasharray="4 4" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <SectionTitle icon={Gauge} title="Section Radar" subtitle="You vs top-percentile peers" />
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={SECTIONAL_RADAR}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="area" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis tick={{ fontSize: 10 }} angle={30} />
              <Radar dataKey="you" stroke="#0284c7" fill="#38bdf8" fillOpacity={0.4} />
              <Radar dataKey="top" stroke="#f59e0b" fill="#fbbf24" fillOpacity={0.15} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <SectionTitle icon={PieIcon} title="Time Split" subtitle="This week" />
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={TIME_PIE} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                {TIME_PIE.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <RTooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="lg:col-span-2 rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
          <SectionTitle icon={BarChart3} title="Topic Accuracy" subtitle="Top 6 attempted topics" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ACCURACY_BARS}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="topic" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
              <RTooltip />
              <Bar dataKey="acc" radius={[8, 8, 0, 0]}>
                {ACCURACY_BARS.map((d, i) => (
                  <Cell key={i} fill={d.acc >= 85 ? "#10b981" : d.acc >= 75 ? "#0ea5e9" : "#f59e0b"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   View: Mocks
   ========================================================================= */
function ViewMocks() {
  return (
    <div className="space-y-6">
      <SectionTitle icon={BookOpenCheck} title="Mock Test Library" subtitle="60+ adaptive AI-graded mocks across CAT / XAT / NMAT / SNAP" />

      {/* Featured launched mock */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-orange-500 to-amber-500 p-6 text-white shadow-xl"
      >
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 4, repeat: Infinity }}
          className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold backdrop-blur">
              <Zap className="h-3 w-3" /> JUST LAUNCHED
            </span>
            <h3 className="mt-3 text-xl font-bold sm:text-2xl">CAT Full Mock #14 — Adaptive AI</h3>
            <p className="mt-1 text-sm text-orange-50">120 min · 66 questions · 3.2k attempted today</p>
          </div>
          <button className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-orange-600 shadow-lg hover:shadow-xl">
            Attempt Now <ArrowRight className="ml-1 inline h-4 w-4" />
          </button>
        </div>
      </motion.div>

      {/* Upcoming strip */}
      <div className="rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-sky-700">
          <Clock className="h-3.5 w-3.5" /> NEW MOCKS LAUNCHING SOON
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { name: "CAT Mock #15", days: 2 },
            { name: "XAT Sim '26", days: 5 },
            { name: "DILR Pro Bundle", days: 9 },
          ].map((u, i) => (
            <div key={i} className="rounded-xl bg-white p-3 ring-1 ring-sky-100">
              <div className="text-sm font-semibold text-slate-900">{u.name}</div>
              <div className="text-xs text-sky-600">Goes live in <span className="font-bold">{u.days} days</span></div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {MOCKS.map((m, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -4 }}
            className="group relative overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm transition hover:shadow-xl"
          >
            <div className={`relative h-24 bg-gradient-to-br ${m.color} p-4 text-white`}>
              <div className="absolute right-3 top-3 rounded-full bg-white/25 px-2 py-0.5 text-[10px] font-bold backdrop-blur">{m.badge}</div>
              <div className="text-[11px] uppercase tracking-wide text-white/80">{m.type}</div>
              <div className="mt-1 text-base font-bold leading-tight">{m.title}</div>
            </div>
            <div className="p-4">
              <div className="mb-3 flex items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {m.duration} min</span>
                <span className="inline-flex items-center gap-1"><Layers className="h-3 w-3" /> {m.questions} Qs</span>
              </div>
              <button className="w-full rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-2.5 text-sm font-semibold text-white shadow hover:shadow-lg">
                Start Mock
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   View: Performance
   ========================================================================= */
function ViewPerformance() {
  return (
    <div className="space-y-6">
      <SectionTitle icon={BarChart3} title="Performance Deep-Dive" subtitle="AI-graded analytics across every section" />
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard icon={Trophy} label="All-India Rank" value="#312" sub="↑ 38 spots" accent="from-amber-400 to-orange-500" />
        <StatCard icon={Activity} label="Attempt Rate" value="74%" sub="optimal" accent="from-sky-500 to-blue-600" />
        <StatCard icon={Target} label="Accuracy" value="81%" sub="↑ 6%" accent="from-emerald-500 to-teal-600" />
        <StatCard icon={Award} label="Best Score" value="184/198" sub="Mock #7" accent="from-violet-500 to-fuchsia-600" />
      </div>

      <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <SectionTitle icon={LineIcon} title="Raw Score vs Percentile" subtitle="Last 7 mocks" />
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={PERF_TREND}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="m" /><YAxis />
            <RTooltip /><Legend />
            <Line type="monotone" dataKey="score" stroke="#0ea5e9" strokeWidth={2.4} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="percentile" stroke="#10b981" strokeWidth={2.4} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-5">
          <SectionTitle title="🔻 Weak Areas" subtitle="Prioritised by AI based on cost-per-mark" />
          <ul className="space-y-2 text-sm">
            {["LR Sets — Arrangements", "Geometry — Mensuration", "RC — Inference questions", "DI Caselet — Pie + Table"].map((w, i) => (
              <li key={i} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
                <span className="font-medium text-slate-800">{w}</span>
                <button className="text-xs font-semibold text-rose-600">Practice →</button>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5">
          <SectionTitle title="🚀 Strength Areas" subtitle="Defend & maintain" />
          <ul className="space-y-2 text-sm">
            {["Algebra — Equations", "RC — Main idea", "Number System", "Vocab — Synonyms"].map((w, i) => (
              <li key={i} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
                <span className="font-medium text-slate-800">{w}</span>
                <button className="text-xs font-semibold text-emerald-600">Drill →</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   View: Personalized Hub
   ========================================================================= */
function ViewPersonalized() {
  const tiles = [
    { title: "CAT Adaptive Mock", desc: "AI builds a 22Q sprint from your weak topics", color: "from-sky-500 to-blue-600", icon: Brain },
    { title: "NMAT Speed Builder", desc: "Pace-optimised set targeting NMAT scoring curve", color: "from-violet-500 to-indigo-600", icon: Rocket },
    { title: "XAT Decision Drill", desc: "12 DM cases with answer-rationale dissection", color: "from-fuchsia-500 to-pink-600", icon: Compass },
    { title: "SNAP Vocab Burst", desc: "30Q from your missed-words bank", color: "from-amber-500 to-orange-500", icon: Sparkles },
    { title: "IIFT Current Affairs", desc: "AI-curated GK from last 90 days", color: "from-emerald-500 to-teal-600", icon: BookMarked },
    { title: "CMAT Logical Bundle", desc: "16Q LR built from your error log", color: "from-rose-500 to-red-600", icon: Layers },
  ];
  return (
    <div className="space-y-5">
      <SectionTitle icon={Brain} title="Personalised AI Hub" subtitle="Every mock here is generated live from your performance signal" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t, i) => (
          <motion.div key={i} whileHover={{ y: -4 }}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${t.color} p-5 text-white shadow-lg`}>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/15 blur-xl" />
            <t.icon className="relative z-10 h-7 w-7" />
            <h3 className="relative z-10 mt-3 text-base font-bold">{t.title}</h3>
            <p className="relative z-10 mt-1 text-xs text-white/85">{t.desc}</p>
            <button className="relative z-10 mt-4 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold backdrop-blur hover:bg-white/30">
              Generate Mock <ArrowRight className="ml-1 inline h-3 w-3" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   View: Planner
   ========================================================================= */
function ViewPlanner() {
  return (
    <div className="space-y-5">
      <SectionTitle icon={CalendarDays} title="Day Planner" subtitle="AI-balanced schedule · 5 tasks · 2 complete" />
      <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-800">Today · Tuesday</div>
          <button className="rounded-lg bg-sky-100 px-3 py-1.5 text-xs font-semibold text-sky-700">+ Add task</button>
        </div>
        <ul className="space-y-2">
          {PLAN_TODAY.map((p, i) => (
            <li key={i} className={`flex items-center gap-3 rounded-xl border p-3 ${p.done ? "border-emerald-100 bg-emerald-50/50" : "border-slate-100 bg-slate-50/50"}`}>
              <div className={`flex h-9 w-9 items-center justify-center rounded-full ${p.done ? "bg-emerald-500 text-white" : "bg-white ring-1 ring-slate-200 text-slate-400"}`}>
                {p.done ? <CheckCircle2 className="h-5 w-5" /> : <Clock className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <div className={`text-sm font-medium ${p.done ? "text-slate-500 line-through" : "text-slate-900"}`}>{p.task}</div>
                <div className="text-xs text-slate-500">{p.time} · {p.section}</div>
              </div>
              <button className="text-xs font-semibold text-sky-600">Open</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* =========================================================================
   View: Leaderboard
   ========================================================================= */
function ViewLeaderboard() {
  return (
    <div className="space-y-5">
      <SectionTitle icon={Trophy} title="All-India Leaderboard" subtitle="Top performers this week" />
      <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
        {LEADERBOARD.map((l, i) => {
          const isYou = l.badge === "you";
          return (
            <div key={i} className={`flex items-center gap-4 border-b border-sky-50 p-4 last:border-0 ${isYou ? "bg-gradient-to-r from-sky-50 to-blue-50" : ""}`}>
              <div className="w-8 text-center text-lg font-bold text-slate-700">{l.badge && l.badge !== "you" ? l.badge : `#${l.rank}`}</div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-sm font-bold text-white">
                {l.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900">{l.name} {isYou && <span className="ml-2 rounded-full bg-sky-600 px-2 py-0.5 text-[10px] text-white">YOU</span>}</div>
                <div className="text-xs text-slate-500">{l.xp.toLocaleString()} XP</div>
              </div>
              <Star className="h-4 w-4 text-amber-400" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================================================================
   View: Vocabulary
   ========================================================================= */
function ViewVocabulary() {
  const words = [
    { w: "Ephemeral", m: "Lasting for a very short time", ex: "Social-media fame is often ephemeral." },
    { w: "Sycophant", m: "A person who acts obsequiously to gain advantage", ex: "The CEO was surrounded by sycophants." },
    { w: "Quixotic", m: "Extremely idealistic, unrealistic", ex: "A quixotic quest for perfection." },
    { w: "Pellucid", m: "Translucently clear", ex: "The pellucid waters of the lagoon." },
  ];
  return (
    <div className="space-y-5">
      <SectionTitle icon={BookMarked} title="Vocabulary Hub" subtitle="MBA-grade Word of the Day · SM-2 revision" />
      <div className="grid gap-4 md:grid-cols-2">
        {words.map((w, i) => (
          <motion.div key={i} whileHover={{ y: -3 }}
            className="rounded-2xl border border-sky-100 bg-gradient-to-br from-white to-sky-50/40 p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <h3 className="text-xl font-bold text-slate-900">{w.w}</h3>
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-700">CAT-Level</span>
            </div>
            <p className="mt-1 text-sm text-slate-700">{w.m}</p>
            <p className="mt-2 text-xs italic text-slate-500">"{w.ex}"</p>
            <div className="mt-4 flex gap-2">
              <button className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white">Bookmark</button>
              <button className="rounded-lg border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-700">Take Quiz</button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   View: AI Tools
   ========================================================================= */
function ViewTools() {
  const tools = [
    { t: "Percentile Predictor", d: "Forecast your CAT percentile from current performance", icon: Gauge, color: "from-sky-500 to-blue-600" },
    { t: "Profile Analyzer", d: "Get an AI-powered profile score for top B-Schools", icon: Brain, color: "from-violet-500 to-fuchsia-600" },
    { t: "College Shortlister", d: "AI-matched colleges with admit probability", icon: GraduationCap, color: "from-emerald-500 to-teal-600" },
    { t: "SOP Reviewer", d: "Instant rewrite + score for your statement of purpose", icon: FileText, color: "from-amber-500 to-orange-500" },
    { t: "AI Study Coach", d: "24/7 chat coach trained on past CAT toppers", icon: Sparkles, color: "from-rose-500 to-pink-600" },
    { t: "Mock Generator", d: "Spin up a custom mock from any topic combo", icon: Zap, color: "from-indigo-500 to-blue-700" },
  ];
  return (
    <div className="space-y-5">
      <SectionTitle icon={Sparkles} title="AI Tools" subtitle="Powered by MBA Compass intelligence" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((t, i) => (
          <motion.div key={i} whileHover={{ y: -4, scale: 1.01 }}
            className="group relative overflow-hidden rounded-2xl border border-sky-100 bg-white p-5 shadow-sm transition hover:shadow-lg">
            <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${t.color} text-white shadow`}>
              <t.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-base font-bold text-slate-900">{t.t}</h3>
            <p className="mt-1 text-xs text-slate-500">{t.d}</p>
            <button className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-sky-600">
              Launch tool <ArrowRight className="h-3 w-3" />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   View: Notifications
   ========================================================================= */
function ViewNotifications() {
  const toneMap: any = {
    amber: "from-amber-400 to-orange-500", sky: "from-sky-500 to-blue-600",
    emerald: "from-emerald-500 to-teal-600", violet: "from-violet-500 to-fuchsia-600",
  };
  return (
    <div className="space-y-5">
      <SectionTitle icon={Bell} title="Notifications" subtitle="Updates from your study journey" />
      <div className="space-y-2">
        {NOTIFS.map((n, i) => (
          <div key={i} className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${toneMap[n.tone]} text-white`}>
              <n.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-900">{n.title}</div>
              <div className="text-xs text-slate-500">{n.time}</div>
            </div>
            <button className="text-xs font-semibold text-sky-600">View</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================================
   Shell + global click interceptor
   ========================================================================= */
function Shell() {
  const [active, setActive] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => { document.title = "MBA Compass Demo Dashboard · Read-only Preview"; }, []);

  const view = useMemo(() => {
    switch (active) {
      case "mocks": return <ViewMocks />;
      case "performance": return <ViewPerformance />;
      case "personalized": return <ViewPersonalized />;
      case "planner": return <ViewPlanner />;
      case "leaderboard": return <ViewLeaderboard />;
      case "vocabulary": return <ViewVocabulary />;
      case "tools": return <ViewTools />;
      case "notifications": return <ViewNotifications />;
      default: return <ViewOverview />;
    }
  }, [active]);

  return (
    <div
      className="flex min-h-screen bg-gradient-to-br from-sky-50/60 via-white to-blue-50/40"
    >
      {/* Sidebar */}
      <aside
        data-demo-allow="true"
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-sky-100 bg-white/95 backdrop-blur transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b border-sky-100 px-5 py-4">
          <Link to="/" className="flex items-center gap-2" data-demo-allow="true">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow">
              <Compass className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">MBA Compass</div>
              <div className="text-[10px] font-medium text-sky-600">Demo Dashboard</div>
            </div>
          </Link>
          <button data-demo-allow="true" onClick={() => setSidebarOpen(false)} className="lg:hidden">
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>
        <nav className="p-3">
          {NAV.map((n) => (
            <button
              key={n.id}
              data-demo-allow="true"
              onClick={() => { setActive(n.id); setSidebarOpen(false); }}
              className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active === n.id
                  ? "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow"
                  : "text-slate-700 hover:bg-sky-50"
              }`}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
              {active === n.id && <ChevronRight className="ml-auto h-4 w-4" />}
            </button>
          ))}
        </nav>

        <div className="mx-3 mt-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-4 ring-1 ring-amber-100">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700">
            <Lock className="h-3.5 w-3.5" /> READ-ONLY PREVIEW
          </div>
          <p className="mt-2 text-xs text-amber-900/80">You're exploring a demo of MBA Compass. Buy the full course to unlock real mocks & AI tools.</p>
          <a
            data-demo-allow="true"
            href="/mba-compass"
            className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-2 text-xs font-bold text-white shadow hover:shadow-lg"
          >
            <ShoppingBag className="h-3.5 w-3.5" /> Buy Full Course
          </a>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col lg:pl-0">
        {/* Topbar */}
        <header
          data-demo-allow="true"
          className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-sky-100 bg-white/85 px-4 py-3 backdrop-blur lg:px-8"
        >
          <div className="flex items-center gap-3">
            <button data-demo-allow="true" onClick={() => setSidebarOpen(true)} className="lg:hidden">
              <Menu className="h-5 w-5 text-slate-700" />
            </button>
            <motion.div
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 2.4, repeat: Infinity }}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-[11px] font-bold text-white shadow"
            >
              <Sparkles className="h-3 w-3" /> DEMO MODE · FULL ACCESS PREVIEW
            </motion.div>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-lg p-2 text-slate-600 hover:bg-sky-50"><Bell className="h-4 w-4" /></button>
            <div className="hidden items-center gap-2 rounded-xl border border-sky-100 bg-white px-3 py-1.5 sm:flex">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-xs font-bold text-white">AS</div>
              <div className="text-xs">
                <div className="font-semibold text-slate-900">{STUDENT.name}</div>
                <div className="text-slate-500">Demo Student</div>
              </div>
            </div>
          </div>
        </header>

        {sidebarOpen && (
          <div
            data-demo-allow="true"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          />
        )}

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {view}
          </motion.div>

          <footer className="mt-12 border-t border-sky-100 pt-6 text-center text-xs text-slate-500">
            This is a demo preview of <span className="font-semibold text-slate-700">MBA Compass</span> · Read-only access ·
            <a href="/mba-compass" data-demo-allow="true" className="ml-1 font-semibold text-sky-600 hover:underline">Buy the full course</a>
          </footer>
        </main>
      </div>
    </div>
  );
}

export default function DemoDashboard() {
  return <Shell />;
}
