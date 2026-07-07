import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useEffect } from "react";
import {
  Rocket, Target, BookOpen, CalendarDays, Type, Calculator,
  Newspaper, BarChart3, Zap, Wallet, Unlock, Phone, ArrowRight, CheckCircle2, Sparkles,
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

interface Feature {
  icon: any;
  emoji: string;
  title: string;
  tagline: string;
  bullets: string[];
  accent: string;
}

const features: Feature[] = [
  {
    icon: Rocket, emoji: "🚀", accent: "from-sky-500 to-cyan-500",
    title: "Complete Full-Length Mock Test Series",
    tagline: "Progressive difficulty — from confidence-building to beyond-exam level.",
    bullets: [
      "30 CAT Full-Length Mocks",
      "20 XAT / NMAT / SNAP / IIFT / CMAT / MAT Mocks each",
      "Built on real exam pattern, structure & style",
      "Prepare for the exam — and prepare beyond it",
    ],
  },
  {
    icon: Target, emoji: "🎯", accent: "from-blue-500 to-indigo-500",
    title: "45+ Sectional Tests for Every Major Exam",
    tagline: "Pinpoint the section holding you back.",
    bullets: [
      "CAT, XAT, NMAT, SNAP, IIFT — 45+ sectional tests each",
      "Experiment with strategies, speed & accuracy",
      "Strengthen weak sections before the next full mock",
    ],
  },
  {
    icon: BookOpen, emoji: "📚", accent: "from-emerald-500 to-teal-500",
    title: "200+ Topic-Wise Tests",
    tagline: "Improvement happens one topic at a time.",
    bullets: [
      "3–5 dedicated tests per important concept",
      "Structured Learn → Practice → Analyze → Improve → Retest loop",
      "Master concepts, not just questions",
    ],
  },
  {
    icon: CalendarDays, emoji: "📅", accent: "from-orange-500 to-amber-500",
    title: "My Day Planner",
    tagline: "Your personal MBA preparation planner.",
    bullets: [
      "Daily to-dos, targets, mock schedules & topic plans",
      "Visual activity heat map & detailed stats",
      "See consistency, productivity & progress over time",
    ],
  },
  {
    icon: Type, emoji: "🔤", accent: "from-fuchsia-500 to-pink-500",
    title: "B-School Vocabulary — 5,000+ Words",
    tagline: "Understand it. Pronounce it. Use it.",
    bullets: [
      "Meanings in English, Hindi & Hinglish",
      "Pronunciation, GD, PI & professional usage",
      "Dedicated vocab tests to lock in retention",
      "Library grows daily",
    ],
  },
  {
    icon: Calculator, emoji: "🧮", accent: "from-violet-500 to-purple-500",
    title: "Digital Quants Formula Book",
    tagline: "Not a PDF. A living, interactive resource.",
    bullets: [
      "Every important QA formula, explained",
      "When to use, how to use, shortcuts & pitfalls",
      "Understand the why, not just the what",
    ],
  },
  {
    icon: Newspaper, emoji: "📰", accent: "from-rose-500 to-red-500",
    title: "News Insights — Stay MBA Ready",
    tagline: "Daily context on business, economy, tech & markets.",
    bullets: [
      "MBA, National, Sports, AI, Economy, Markets, Corporate",
      "Explained in English, Hindi & Hinglish",
      "Why each story matters for GDPI & interviews",
    ],
  },
  {
    icon: BarChart3, emoji: "📊", accent: "from-cyan-500 to-blue-500",
    title: "My Insights — Know Where You Stand",
    tagline: "Attempting mocks is only half the job.",
    bullets: [
      "All India Rank & per-mock position",
      "Strong areas, weak areas & section-wise trends",
      "Data-driven next-step decisions",
    ],
  },
  {
    icon: Zap, emoji: "⚡", accent: "from-yellow-500 to-orange-500",
    title: "Personalized Hub — Mock in One Click",
    tagline: "Have 10 minutes? Build the exact mock you need.",
    bullets: [
      "Exam → Section → Difficulty → Questions → Start",
      "AI creates a personalized test instantly",
      "Practice adapts to your schedule",
    ],
  },
];

const steps = [
  { n: 1, title: "Explore the Dashboard", desc: "Click below, go to Dashboard → Try a Demo Account." },
  { n: 2, title: "Complete a Simple Login", desc: "Quick verification — no purchase needed." },
  { n: 3, title: "Experience Everything", desc: "Mocks, planner, vocab, insights — all before you buy." },
];

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
        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <motion.div
            initial="hidden" animate="show" variants={stagger}
            className="max-w-3xl mx-auto text-center"
          >
            <motion.div variants={fadeUp}>
              <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0 mb-4">
                <Sparkles className="w-3.5 h-3.5 mr-1" /> Hi Aspirant
              </Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="font-heading text-3xl md:text-5xl font-bold text-slate-900 leading-tight"
            >
              Preparing for MBA is not about solving <span className="text-sky-600">more questions.</span>
              <br className="hidden md:block" />
              It's about the <span className="text-sky-600">right practice.</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-5 text-base md:text-lg text-slate-600 leading-relaxed">
              Right strategy. A clear daily plan. Continuous performance analysis. Strong vocabulary.
              Quick revision. And awareness of what's happening around you.
            </motion.p>
            <motion.p variants={fadeUp} className="mt-4 text-lg md:text-xl font-semibold text-slate-800">
              That's why we built <span className="text-sky-600">MBA Compass Mocks</span> — India's
              Most Student-Focused MBA Preparation Dashboard.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-3">
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

          {/* Quick stats */}
          <motion.div
            initial="hidden" whileInView="show" viewport={{ once: true }} variants={stagger}
            className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto"
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

      {/* Features — step by step */}
      <section className="container mx-auto px-4 py-10 md:py-16">
        <motion.h2
          initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
          className="font-heading text-2xl md:text-4xl font-bold text-center text-slate-900 mb-3"
        >
          Everything you get inside the dashboard
        </motion.h2>
        <p className="text-center text-slate-500 mb-12">Step by step — the way real preparation should work.</p>

        <div className="relative max-w-5xl mx-auto">
          {/* vertical line */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-sky-200 via-sky-100 to-transparent" />

          {features.map((f, i) => {
            const Icon = f.icon;
            const isLeft = i % 2 === 0;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: 0.05 }}
                className={`relative md:grid md:grid-cols-2 md:gap-8 mb-10 ${isLeft ? "" : "md:[&>div:first-child]:col-start-2"}`}
              >
                <div className={isLeft ? "md:pr-10 md:text-right" : "md:pl-10"}>
                  <Card className="p-6 border-sky-100 shadow-sm hover:shadow-lg transition-shadow bg-white">
                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r ${f.accent}`}>
                      <span>{f.emoji}</span> Step {i + 1}
                    </div>
                    <h3 className="mt-3 font-heading text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2 md:justify-inherit">
                      <Icon className="w-5 h-5 text-sky-600" /> {f.title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">{f.tagline}</p>
                    <ul className={`mt-4 space-y-2 ${isLeft ? "md:text-right" : ""}`}>
                      {f.bullets.map((b, j) => (
                        <li key={j} className={`flex items-start gap-2 text-sm text-slate-700 ${isLeft ? "md:flex-row-reverse" : ""}`}>
                          <CheckCircle2 className="w-4 h-4 text-sky-500 mt-0.5 shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
                {/* Node */}
                <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-6 w-10 h-10 rounded-full bg-white border-2 border-sky-400 items-center justify-center text-sky-600 font-bold shadow-md">
                  {i + 1}
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
          <Card className="p-8 md:p-10 border-sky-200 bg-gradient-to-br from-sky-50 to-white shadow-xl text-center">
            <Wallet className="w-10 h-10 text-sky-600 mx-auto" />
            <h3 className="mt-3 font-heading text-2xl md:text-3xl font-bold text-slate-900">
              Complete MBA Compass Mocks Access
            </h3>
            <p className="text-slate-600 mt-2">Full-Length + Sectional + Topic Tests, Day Planner, Vocab, Formula Book, News Insights, My Insights, Personalized Hub — everything.</p>
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
