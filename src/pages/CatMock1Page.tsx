import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import {
  Rocket, Target, BookOpen, CalendarDays, Type, Calculator,
  Newspaper, BarChart3, Zap, Wallet, Unlock, Phone, ArrowRight,
  CheckCircle2, Sparkles, Clock, TrendingUp, Trophy, Flame, Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
} as const;

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

/* ---------------------------- Mock Snapshots ---------------------------- */

const BrowserFrame = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-2xl bg-white">
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
      <div className="flex gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
      </div>
      <div className="flex-1 text-center text-[11px] text-slate-500 font-mono truncate">{label}</div>
    </div>
    <div className="p-4 bg-gradient-to-br from-slate-50 to-white">{children}</div>
  </div>
);

const MockFullLengthSnap = () => (
  <BrowserFrame label="dashboard.mbacompass.in / mocks">
    <div className="flex items-center justify-between mb-3">
      <div>
        <div className="text-xs text-slate-500">CAT Full-Length</div>
        <div className="font-semibold text-slate-900 text-sm">CAT Mock #12 — Advanced</div>
      </div>
      <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0">Difficulty 4/5</Badge>
    </div>
    <div className="grid grid-cols-3 gap-2 mb-3">
      {[
        { l: "VARC", q: "24 Q", t: "40m" },
        { l: "DILR", q: "22 Q", t: "40m" },
        { l: "QA", q: "22 Q", t: "40m" },
      ].map((s) => (
        <div key={s.l} className="rounded-lg border border-slate-200 p-2 bg-white">
          <div className="text-[10px] font-semibold text-sky-600">{s.l}</div>
          <div className="text-xs text-slate-800 mt-0.5">{s.q}</div>
          <div className="text-[10px] text-slate-500 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {s.t}</div>
        </div>
      ))}
    </div>
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500">120 min · 66 questions</span>
      <span className="inline-flex items-center gap-1 rounded-md bg-sky-600 text-white px-3 py-1.5 text-xs font-medium">
        <Play className="w-3 h-3" /> Start Mock
      </span>
    </div>
  </BrowserFrame>
);

const MockInsightsSnap = () => {
  const bars = [42, 55, 48, 62, 70, 68, 78, 74, 82, 88];
  return (
    <BrowserFrame label="dashboard.mbacompass.in / insights">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs text-slate-500">My Insights</div>
          <div className="font-semibold text-slate-900 text-sm">All India Rank</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-sky-600">#1,284</div>
          <div className="text-[10px] text-emerald-600 flex items-center gap-0.5 justify-end">
            <TrendingUp className="w-3 h-3" /> +362
          </div>
        </div>
      </div>
      <div className="flex items-end gap-1.5 h-24 mb-2">
        {bars.map((h, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            whileInView={{ height: `${h}%` }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, duration: 0.6 }}
            className="flex-1 rounded-t bg-gradient-to-t from-sky-500 to-cyan-400"
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-emerald-50 p-1.5">
          <div className="text-[10px] text-slate-500">Accuracy</div>
          <div className="text-xs font-bold text-emerald-600">84%</div>
        </div>
        <div className="rounded-md bg-sky-50 p-1.5">
          <div className="text-[10px] text-slate-500">Attempts</div>
          <div className="text-xs font-bold text-sky-600">58</div>
        </div>
        <div className="rounded-md bg-amber-50 p-1.5">
          <div className="text-[10px] text-slate-500">Percentile</div>
          <div className="text-xs font-bold text-amber-600">96.4</div>
        </div>
      </div>
    </BrowserFrame>
  );
};

const MockPlannerSnap = () => {
  const days = Array.from({ length: 35 }, (_, i) => {
    const seed = (i * 37) % 5;
    return seed;
  });
  const shades = ["bg-slate-100", "bg-sky-100", "bg-sky-300", "bg-sky-500", "bg-sky-700"];
  return (
    <BrowserFrame label="dashboard.mbacompass.in / day-planner">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs text-slate-500">My Day Planner</div>
          <div className="font-semibold text-slate-900 text-sm">Consistency Heatmap</div>
        </div>
        <div className="inline-flex items-center gap-1 text-xs text-orange-600 font-semibold">
          <Flame className="w-3.5 h-3.5" /> 24 day streak
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-3">
        {days.map((v, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.6 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.015 }}
            className={`aspect-square rounded-sm ${shades[v]}`}
          />
        ))}
      </div>
      <div className="space-y-1.5">
        {[
          { t: "CAT Mock #13 — Advanced", d: "Full-length · 120 min", done: true },
          { t: "QA — Time, Speed & Distance", d: "Topic test · 20 Q", done: true },
          { t: "Vocabulary revision — 15 words", d: "Daily", done: false },
        ].map((task, i) => (
          <div key={i} className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 bg-white">
            <CheckCircle2 className={`w-3.5 h-3.5 ${task.done ? "text-emerald-500" : "text-slate-300"}`} />
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-medium truncate ${task.done ? "text-slate-500 line-through" : "text-slate-800"}`}>{task.t}</div>
              <div className="text-[10px] text-slate-400 truncate">{task.d}</div>
            </div>
          </div>
        ))}
      </div>
    </BrowserFrame>
  );
};

const MockVocabSnap = () => (
  <BrowserFrame label="dashboard.mbacompass.in / vocabulary">
    <div className="flex items-center justify-between mb-3">
      <div>
        <div className="text-xs text-slate-500">Word of the Day</div>
        <div className="font-semibold text-slate-900 text-lg">Ubiquitous</div>
        <div className="text-[11px] text-slate-500 mt-0.5">/juːˈbɪk.wɪ.təs/ · adjective</div>
      </div>
      <Badge className="bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-100 border-0">CAT · XAT</Badge>
    </div>
    <div className="space-y-2 text-xs">
      <div className="rounded-md bg-slate-50 p-2">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">English</div>
        <div className="text-slate-800">Present, appearing, or found everywhere.</div>
      </div>
      <div className="rounded-md bg-slate-50 p-2">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Hindi</div>
        <div className="text-slate-800">सर्वव्यापी — हर जगह मौजूद</div>
      </div>
      <div className="rounded-md bg-slate-50 p-2">
        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Usage · GDPI</div>
        <div className="text-slate-800">"Smartphones have become ubiquitous in modern business."</div>
      </div>
    </div>
    <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
      <span>Progress today</span>
      <span className="font-semibold text-sky-600">12 / 15 words</span>
    </div>
    <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: "80%" }}
        viewport={{ once: true }}
        transition={{ duration: 0.9 }}
        className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500"
      />
    </div>
  </BrowserFrame>
);

const MockPersonalizedSnap = () => (
  <BrowserFrame label="dashboard.mbacompass.in / personalized-hub">
    <div className="mb-3">
      <div className="text-xs text-slate-500">Personalized Hub</div>
      <div className="font-semibold text-slate-900 text-sm">Build a mock in one click</div>
    </div>
    <div className="space-y-2 text-xs">
      {[
        { l: "Exam", v: "CAT" },
        { l: "Section", v: "Quantitative Aptitude" },
        { l: "Difficulty", v: "Hard" },
        { l: "Questions", v: "15" },
      ].map((r) => (
        <div key={r.l} className="flex items-center justify-between rounded-md border border-slate-200 px-2.5 py-1.5">
          <span className="text-slate-500">{r.l}</span>
          <span className="font-semibold text-slate-800">{r.v}</span>
        </div>
      ))}
    </div>
    <button className="mt-3 w-full inline-flex items-center justify-center gap-1 rounded-md bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-semibold py-2">
      <Zap className="w-3.5 h-3.5" /> Generate My Mock
    </button>
  </BrowserFrame>
);

const MockFormulaSnap = () => (
  <BrowserFrame label="dashboard.mbacompass.in / formulas">
    <div className="mb-2">
      <div className="text-xs text-slate-500">Quants Formula Book</div>
      <div className="font-semibold text-slate-900 text-sm">Time · Speed · Distance</div>
    </div>
    <div className="rounded-lg bg-gradient-to-br from-violet-50 to-white border border-violet-100 p-3 text-center">
      <div className="font-mono text-lg text-violet-700">Distance = Speed × Time</div>
      <div className="text-[10px] text-slate-500 mt-1">D = S × T</div>
    </div>
    <div className="mt-3 space-y-1.5 text-xs text-slate-700">
      <div className="flex gap-2"><span className="text-violet-500">•</span> Use when two variables are known</div>
      <div className="flex gap-2"><span className="text-violet-500">•</span> Convert km/hr → m/s by × 5/18</div>
      <div className="flex gap-2"><span className="text-violet-500">•</span> Common trap: units mismatch</div>
    </div>
  </BrowserFrame>
);

/* ------------------------------- Features ------------------------------- */

interface Feature {
  icon: any;
  title: string;
  tagline: string;
  bullets: string[];
  accent: string;
  preview: React.ReactNode;
}

const features: Feature[] = [
  {
    icon: Rocket, accent: "from-sky-500 to-cyan-500",
    title: "Complete Full-Length Mock Test Series",
    tagline: "Progressive difficulty — from confidence-building to beyond-exam level.",
    bullets: [
      "30 CAT Full-Length Mocks",
      "20 XAT / NMAT / SNAP / IIFT / CMAT / MAT mocks each",
      "Built on real exam pattern, structure & style",
      "Prepare for the exam — and prepare beyond it",
    ],
    preview: <MockFullLengthSnap />,
  },
  {
    icon: Target, accent: "from-blue-500 to-indigo-500",
    title: "45+ Sectional Tests for Every Major Exam",
    tagline: "Pinpoint the section holding you back.",
    bullets: [
      "CAT, XAT, NMAT, SNAP, IIFT — 45+ sectional tests each",
      "Experiment with strategies, speed & accuracy",
      "Strengthen weak sections before the next full mock",
    ],
    preview: <MockInsightsSnap />,
  },
  {
    icon: BookOpen, accent: "from-emerald-500 to-teal-500",
    title: "200+ Topic-Wise Tests",
    tagline: "Improvement happens one topic at a time.",
    bullets: [
      "3–5 dedicated tests per important concept",
      "Learn → Practice → Analyze → Improve → Retest",
      "Master concepts, not just questions",
    ],
    preview: <MockFormulaSnap />,
  },
  {
    icon: CalendarDays, accent: "from-orange-500 to-amber-500",
    title: "My Day Planner",
    tagline: "Your personal MBA preparation planner.",
    bullets: [
      "Daily to-dos, targets, mock schedules & topic plans",
      "Visual activity heatmap & detailed stats",
      "See consistency, productivity & progress over time",
    ],
    preview: <MockPlannerSnap />,
  },
  {
    icon: Type, accent: "from-fuchsia-500 to-pink-500",
    title: "B-School Vocabulary — 5,000+ Words",
    tagline: "Understand it. Pronounce it. Use it.",
    bullets: [
      "Meanings in English, Hindi & Hinglish",
      "Pronunciation, GD, PI & professional usage",
      "Dedicated vocab tests, library grows daily",
    ],
    preview: <MockVocabSnap />,
  },
  {
    icon: Calculator, accent: "from-violet-500 to-purple-500",
    title: "Digital Quants Formula Book",
    tagline: "Not a PDF. A living, interactive resource.",
    bullets: [
      "Every important QA formula, explained",
      "When to use, how to use, shortcuts & pitfalls",
      "Understand the why, not just the what",
    ],
    preview: <MockFormulaSnap />,
  },
  {
    icon: Newspaper, accent: "from-rose-500 to-red-500",
    title: "News Insights — Stay MBA Ready",
    tagline: "Daily context on business, economy, tech & markets.",
    bullets: [
      "MBA, National, Sports, AI, Economy, Markets, Corporate",
      "Explained in English, Hindi & Hinglish",
      "Why each story matters for GDPI & interviews",
    ],
    preview: <MockInsightsSnap />,
  },
  {
    icon: BarChart3, accent: "from-cyan-500 to-blue-500",
    title: "My Insights — Know Where You Stand",
    tagline: "Attempting mocks is only half the job.",
    bullets: [
      "All India Rank & per-mock position",
      "Strong areas, weak areas & section-wise trends",
      "Data-driven next-step decisions",
    ],
    preview: <MockInsightsSnap />,
  },
  {
    icon: Zap, accent: "from-yellow-500 to-orange-500",
    title: "Personalized Hub — Mock in One Click",
    tagline: "Have 10 minutes? Build the exact mock you need.",
    bullets: [
      "Exam → Section → Difficulty → Questions → Start",
      "AI creates a personalized test instantly",
      "Practice adapts to your schedule",
    ],
    preview: <MockPersonalizedSnap />,
  },
];

const steps = [
  { n: 1, title: "Explore the Dashboard", desc: "Click below, go to Dashboard → Try a Demo Account." },
  { n: 2, title: "Complete a Simple Login", desc: "Quick verification — no purchase needed." },
  { n: 3, title: "Experience Everything", desc: "Mocks, planner, vocab, insights — all before you buy." },
];

/* --------------------------------- Page --------------------------------- */

const CatMock1Page = () => {
  useEffect(() => {
    document.title = "CAT Mock 1 — Inside MBA Compass Mocks Dashboard | MBA Compass";
    const meta = document.querySelector('meta[name="description"]');
    const content = "Inside India's most student-focused MBA prep dashboard: 30 CAT mocks, 45+ sectionals, 200+ topic tests, Day Planner, 5,000+ vocab, Quants formula book, Personalized Hub — all at ₹999.";
    if (meta) meta.setAttribute("content", content);
    else {
      const m = document.createElement("meta");
      m.name = "description"; m.content = content;
      document.head.appendChild(m);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sky-200 blur-3xl" />
          <div className="absolute top-40 -right-24 h-80 w-80 rounded-full bg-cyan-200 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 pt-16 md:pt-24 pb-10 relative">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <motion.div initial="hidden" animate="show" variants={stagger}>
              <motion.div variants={fadeUp}>
                <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0 mb-4">
                  <Sparkles className="w-3.5 h-3.5 mr-1" /> Hi Aspirant
                </Badge>
              </motion.div>
              <motion.h1
                variants={fadeUp}
                className="font-heading text-3xl md:text-5xl font-bold text-slate-900 leading-tight"
              >
                MBA prep isn't about solving <span className="text-sky-600">more questions.</span>
                <br className="hidden md:block" />
                It's about the <span className="text-sky-600">right practice.</span>
              </motion.h1>
              <motion.p variants={fadeUp} className="mt-5 text-base md:text-lg text-slate-600 leading-relaxed">
                Right strategy. A clear daily plan. Continuous performance analysis. Strong vocabulary.
                Quick revision. And awareness of what's happening around you.
              </motion.p>
              <motion.p variants={fadeUp} className="mt-4 text-lg md:text-xl font-semibold text-slate-800">
                That's why we built <span className="text-sky-600">MBA Compass Mocks</span> — India's most
                student-focused MBA preparation dashboard.
              </motion.p>
              <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3">
                <Link to="/student">
                  <Button size="lg" className="bg-sky-600 hover:bg-sky-700 text-white gap-2">
                    Explore the Dashboard for Free <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/mocks">
                  <Button size="lg" variant="outline" className="border-sky-200">
                    View Mocks
                  </Button>
                </Link>
              </motion.div>
            </motion.div>

            {/* Hero snapshot */}
            <motion.div
              initial={{ opacity: 0, y: 30, rotate: -1 }}
              animate={{ opacity: 1, y: 0, rotate: -1 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-gradient-to-tr from-sky-200/60 to-cyan-100/60 rounded-3xl blur-2xl pointer-events-none" />
              <div className="relative rotate-1 hover:rotate-0 transition-transform duration-500">
                <MockFullLengthSnap />
              </div>
              <div className="hidden md:block absolute -bottom-10 -left-8 w-56 -rotate-3 hover:rotate-0 transition-transform duration-500">
                <MockInsightsSnap />
              </div>
            </motion.div>
          </div>

          {/* Quick stats */}
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
            className="mt-20 md:mt-28 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto"
          >
            {[
              { k: "30", v: "CAT Full Mocks" },
              { k: "200+", v: "Topic Tests" },
              { k: "5,000+", v: "Vocabulary Words" },
              { k: "₹999", v: "Complete Access" },
            ].map((s, i) => (
              <motion.div key={i} variants={fadeUp}>
                <Card className="p-5 text-center border-sky-100 bg-white/70 backdrop-blur">
                  <div className="text-2xl md:text-3xl font-bold text-sky-600">{s.k}</div>
                  <div className="text-xs md:text-sm text-slate-600 mt-1">{s.v}</div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Intro line */}
      <section className="container mx-auto px-4 py-6">
        <motion.p
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center text-slate-600 max-w-2xl mx-auto"
        >
          One dashboard. Multiple MBA exams. Thousands of questions. Smart planning tools.
          Detailed analytics. A complete ecosystem — designed around <span className="font-semibold text-slate-800">you</span>.
        </motion.p>
      </section>

      {/* Features — alternating snapshots */}
      <section className="container mx-auto px-4 py-10 md:py-16">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <motion.h2
            initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="font-heading text-2xl md:text-4xl font-bold text-slate-900"
          >
            Everything you get inside the dashboard
          </motion.h2>
          <p className="text-slate-500 mt-3">Step by step — the way real preparation should work.</p>
        </div>

        <div className="space-y-20 md:space-y-28 max-w-6xl mx-auto">
          {features.map((f, i) => {
            const Icon = f.icon;
            const isLeft = i % 2 === 0;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="grid md:grid-cols-2 gap-8 md:gap-14 items-center"
              >
                {/* Text */}
                <div className={isLeft ? "md:order-1" : "md:order-2"}>
                  <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r ${f.accent}`}>
                    <Icon className="w-3.5 h-3.5" /> Step {i + 1}
                  </div>
                  <h3 className="mt-4 font-heading text-2xl md:text-3xl font-bold text-slate-900">
                    {f.title}
                  </h3>
                  <p className="text-slate-500 mt-2">{f.tagline}</p>
                  <ul className="mt-5 space-y-2.5">
                    {f.bullets.map((b, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-sky-500 mt-1 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Snapshot */}
                <div className={isLeft ? "md:order-2" : "md:order-1"}>
                  <div className="relative">
                    <div className={`absolute -inset-6 bg-gradient-to-tr ${f.accent} opacity-10 rounded-3xl blur-2xl pointer-events-none`} />
                    <div className="relative">{f.preview}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-4 py-10 md:py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }} transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto"
        >
          <Card className="p-8 md:p-10 border-sky-200 bg-gradient-to-br from-sky-50 to-white shadow-xl text-center relative overflow-hidden">
            <Trophy className="w-10 h-10 text-sky-600 mx-auto" />
            <h3 className="mt-3 font-heading text-2xl md:text-3xl font-bold text-slate-900">
              Complete MBA Compass Mocks Access
            </h3>
            <p className="text-slate-600 mt-2 max-w-xl mx-auto">
              Full-Length + Sectional + Topic Tests, Day Planner, Vocab, Formula Book, News Insights, My Insights, Personalized Hub — everything.
            </p>
            <div className="mt-6 flex items-end justify-center gap-2">
              <span className="text-5xl md:text-6xl font-bold text-sky-600">₹999</span>
              <span className="text-slate-500 mb-2">/ complete access</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">No bundles. No confusion. Just one student-focused dashboard.</p>
            <Link to="/mocks">
              <Button size="lg" className="mt-6 bg-sky-600 hover:bg-sky-700 text-white gap-2">
                Get Full Access <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </Card>
        </motion.div>
      </section>

      {/* Free demo */}
      <section className="container mx-auto px-4 py-10 md:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <div className="flex items-center gap-2 justify-center mb-4">
            <Unlock className="w-5 h-5 text-emerald-600" />
            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">Free Demo</Badge>
          </div>
          <h3 className="text-center font-heading text-2xl md:text-3xl font-bold text-slate-900">
            Not ready to purchase? Explore the dashboard for <span className="text-emerald-600">FREE</span>
          </h3>
          <p className="text-center text-slate-600 mt-2">Three simple steps — no credit card needed.</p>

          <div className="mt-8 grid md:grid-cols-3 gap-4">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
              >
                <Card className="p-6 h-full border-emerald-100 hover:border-emerald-300 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">{s.n}</div>
                  <h4 className="mt-4 font-semibold text-slate-900">{s.title}</h4>
                  <p className="text-sm text-slate-600 mt-1">{s.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link to="/student/login">
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                Explore the Dashboard for Free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Contact */}
      <section className="container mx-auto px-4 py-10 md:py-16">
        <motion.div
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 text-slate-700">
            <Phone className="w-4 h-4 text-sky-600" />
            <span>Questions? Call us at</span>
            <a href="tel:+917668129226" className="font-semibold text-sky-600 hover:underline">76681 29226</a>
          </div>
          <p className="mt-6 text-slate-600">
            Prepare consistently. Practice intelligently. Track your progress.
          </p>
          <p className="mt-4 font-heading font-semibold text-slate-900">All the very best!</p>
          <p className="text-sm text-slate-500 mt-1">— Team MBA Compass</p>
        </motion.div>
      </section>
    </div>
  );
};

export default CatMock1Page;
