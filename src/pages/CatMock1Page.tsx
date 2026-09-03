import { motion, LazyMotion, domAnimation, m } from "framer-motion";
import { Link } from "@/lib/router-compat";
import { useEffect, useState, memo, ReactNode } from "react";
import {
  Rocket, Target, BookOpen, CalendarDays, Type, Calculator,
  Newspaper, BarChart3, Zap, Unlock, Phone, ArrowRight,
  CheckCircle2, Sparkles, Clock, TrendingUp, Trophy, Flame, Play, Maximize2, X,
  ShoppingCart, ShieldCheck, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

/* ---------------- Buy Now → routes to the working /mocks checkout ---------------- */
const BUY_URL = "/mba-compass/bsb-full-series-advance-cat-nmat-xat-snap-other-omets";

const BuyNowButton = ({
  size = "lg",
  className = "",
  label = "Buy Now — ₹999",
  fullWidth = false,
}: { size?: "sm" | "default" | "lg"; className?: string; label?: string; fullWidth?: boolean }) => (
  <Link to={BUY_URL} className={fullWidth ? "block" : "inline-block"}>
    <Button
      size={size}
      className={`bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white gap-2 shadow-lg shadow-orange-500/30 ${fullWidth ? "w-full" : ""} ${className}`}
    >
      <ShoppingCart className="w-4 h-4" /> {label}
    </Button>
  </Link>
);

/* ---------------- Motion tokens (single source of truth) ---------------- */

const EASE = [0.16, 1, 0.3, 1] as const;
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
} as const;
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const viewportOnce = { once: true, amount: 0.2 } as const;

/* ---------------------------- Snapshot frame --------------------------- */

const AnimationStyles = () => (
  <style>{`
    @keyframes growBar { from { transform: scaleY(.05); opacity: .3 } to { transform: scaleY(1); opacity: 1 } }
    @keyframes flameWiggle { 0%,100% { transform: scale(1) rotate(-3deg) } 50% { transform: scale(1.18) rotate(4deg) } }
    @keyframes fillBar { from { width: 0 } to { width: var(--fill, 80%) } }
    @keyframes floatY { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
    @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(251,146,60,0) } 50% { box-shadow: 0 0 22px 4px rgba(251,146,60,.55) } }
    @keyframes pulseGlowSky { 0%,100% { box-shadow: 0 0 0 0 rgba(14,165,233,0) } 50% { box-shadow: 0 0 22px 4px rgba(14,165,233,.5) } }
    @keyframes shimmer { to { transform: translateX(100%) } }
    @keyframes popIn { from { transform: scale(.6); opacity: 0 } 60% { transform: scale(1.08); opacity: 1 } to { transform: scale(1); opacity: 1 } }
    @keyframes cellReveal { from { transform: scale(0); opacity: 0 } to { transform: scale(1); opacity: 1 } }
    @keyframes ticker { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-2px) } }
    @keyframes typing { from { width: 0 } to { width: 100% } }
    @keyframes caret { 50% { opacity: 0 } }
    @keyframes cursorTrack { 0% { transform: translate(0,0) } 30% { transform: translate(110%, 40%) } 60% { transform: translate(160%, 130%) } 100% { transform: translate(0,0) } }
    @keyframes gradientShift { 0%,100% { background-position: 0% 50% } 50% { background-position: 100% 50% } }

    .anim-grow-bar { transform-origin: bottom; animation: growBar 1.1s cubic-bezier(.22,1,.36,1) both }
    .anim-flame { display: inline-flex; animation: flameWiggle 1.1s ease-in-out infinite; transform-origin: center }
    .anim-fill-bar { animation: fillBar 1.8s cubic-bezier(.22,1,.36,1) forwards; width: 0 }
    .anim-float { animation: floatY 3.4s ease-in-out infinite }
    .anim-pulse-cta { animation: pulseGlow 2.2s ease-in-out infinite }
    .anim-pulse-sky { animation: pulseGlowSky 2.4s ease-in-out infinite }
    .anim-pop { animation: popIn .6s cubic-bezier(.22,1,.36,1) both }
    .anim-cell { animation: cellReveal .5s cubic-bezier(.22,1,.36,1) both }
    .anim-shimmer { position: relative; overflow: hidden }
    .anim-shimmer::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,.55), transparent); transform: translateX(-100%); animation: shimmer 3s infinite }
    .anim-ticker { display: inline-block; animation: ticker 1.4s ease-in-out infinite }
    .anim-typing { display: inline-block; overflow: hidden; white-space: nowrap; animation: typing 1.6s steps(20,end) both }
    .anim-caret::after { content: '|'; margin-left: 2px; animation: caret 1s steps(2) infinite; color: currentColor }
    .anim-cursor { animation: cursorTrack 6s ease-in-out infinite }
    .anim-gradient { background-size: 200% 200%; animation: gradientShift 6s ease-in-out infinite }
  `}</style>
);

const BrowserFrame = memo(({ label, children }: { label: string; children: ReactNode }) => (
  <div className="rounded-xl overflow-hidden border border-slate-200 shadow-xl bg-white w-full anim-float">
    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
      <div className="flex gap-1.5 shrink-0">
        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
      </div>
      <div className="flex-1 text-center text-xs sm:text-xs text-slate-500 font-mono truncate px-2">{label}</div>
      <Maximize2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
    </div>
    <div className="p-3 sm:p-4 bg-gradient-to-br from-slate-50 to-white">{children}</div>
  </div>
));
BrowserFrame.displayName = "BrowserFrame";

/* ---------------------------- Mock snapshots --------------------------- */

const MockFullLengthSnap = () => (
  <BrowserFrame label="dashboard.mbacompass.in / mocks">
    <div className="flex items-center justify-between mb-3 gap-2">
      <div className="min-w-0">
        <div className="text-xs text-slate-500">CAT Full-Length</div>
        <div className="font-semibold text-slate-900 text-sm truncate">CAT Mock #12 — Advanced</div>
      </div>
      <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0 shrink-0 text-xs">Difficulty 4/5</Badge>
    </div>
    <div className="grid grid-cols-3 gap-2 mb-3">
      {[
        { l: "VARC", q: "24 Q", t: "40m" },
        { l: "DILR", q: "22 Q", t: "40m" },
        { l: "QA", q: "22 Q", t: "40m" },
      ].map((s, i) => (
        <div
          key={s.l}
          className="rounded-lg border border-slate-200 p-2 bg-white anim-pop"
          style={{ animationDelay: `${i * 120}ms` }}
        >
          <div className="text-xs font-semibold text-sky-600">{s.l}</div>
          <div className="text-xs text-slate-800 mt-0.5">{s.q}</div>
          <div className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {s.t}</div>
        </div>
      ))}
    </div>
    <div className="flex items-center justify-between text-xs gap-2">
      <span className="text-slate-500 truncate">120 min · 66 questions</span>
      <span className="inline-flex items-center gap-1 rounded-md bg-sky-600 text-white px-3 py-1.5 text-xs font-medium shrink-0 anim-pulse-sky">
        <Play className="w-3 h-3" /> Start
      </span>
    </div>
  </BrowserFrame>
);

const MockInsightsSnap = () => {
  const bars = [42, 55, 48, 62, 70, 68, 78, 74, 82, 88];
  return (
    <BrowserFrame label="dashboard.mbacompass.in / insights">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="min-w-0">
          <div className="text-xs text-slate-500">My Insights</div>
          <div className="font-semibold text-slate-900 text-sm">All India Rank</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-sky-600 anim-ticker">#1,284</div>
          <div className="text-xs text-emerald-600 flex items-center gap-0.5 justify-end">
            <TrendingUp className="w-3 h-3 anim-float" /> +362
          </div>
        </div>
      </div>
      <div className="flex items-end gap-1 sm:gap-1.5 h-24 mb-2">
        {bars.map((h, i) => (
          <div
            key={i}
            style={{ height: `${h}%`, animationDelay: `${i * 80}ms` }}
            className="flex-1 rounded-t bg-gradient-to-t from-sky-500 to-cyan-400 anim-grow-bar"
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-md bg-emerald-50 p-1.5">
          <div className="text-xs text-slate-500">Accuracy</div>
          <div className="text-xs font-bold text-emerald-600">84%</div>
        </div>
        <div className="rounded-md bg-sky-50 p-1.5">
          <div className="text-xs text-slate-500">Attempts</div>
          <div className="text-xs font-bold text-sky-600">58</div>
        </div>
        <div className="rounded-md bg-amber-50 p-1.5">
          <div className="text-xs text-slate-500">Percentile</div>
          <div className="text-xs font-bold text-amber-600">96.4</div>
        </div>
      </div>
    </BrowserFrame>
  );
};

const MockPlannerSnap = () => {
  const days = Array.from({ length: 35 }, (_, i) => (i * 37) % 5);
  const shades = ["bg-slate-100", "bg-sky-100", "bg-sky-300", "bg-sky-500", "bg-sky-700"];
  return (
    <BrowserFrame label="dashboard.mbacompass.in / day-planner">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="min-w-0">
          <div className="text-xs text-slate-500">My Day Planner</div>
          <div className="font-semibold text-slate-900 text-sm">Consistency Heatmap</div>
        </div>
        <div className="inline-flex items-center gap-1 text-xs text-orange-600 font-semibold shrink-0">
          <span className="anim-flame"><Flame className="w-3.5 h-3.5" /></span> 24 day streak
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-3">
        {days.map((v, i) => (
          <div
            key={i}
            className={`aspect-square rounded-sm ${shades[v]} anim-cell`}
            style={{ animationDelay: `${i * 18}ms` }}
          />
        ))}
      </div>
      <div className="space-y-1.5">
        {[
          { t: "CAT Mock #13 — Advanced", d: "Full-length · 120 min", done: true },
          { t: "QA — Time, Speed & Distance", d: "Topic test · 20 Q", done: true },
          { t: "Vocabulary revision — 15 words", d: "Daily", done: false },
        ].map((task, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 bg-white anim-pop"
            style={{ animationDelay: `${700 + i * 140}ms` }}
          >
            <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${task.done ? "text-emerald-500" : "text-slate-300"}`} />
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-medium truncate ${task.done ? "text-slate-500 line-through" : "text-slate-800"}`}>{task.t}</div>
              <div className="text-xs text-slate-400 truncate">{task.d}</div>
            </div>
          </div>
        ))}
      </div>
    </BrowserFrame>
  );
};

const MockVocabSnap = () => (
  <BrowserFrame label="dashboard.mbacompass.in / vocabulary">
    <div className="flex items-center justify-between mb-3 gap-2">
      <div className="min-w-0">
        <div className="text-xs text-slate-500">Word of the Day</div>
        <div className="font-semibold text-slate-900 text-lg anim-typing anim-caret">Ubiquitous</div>
        <div className="text-xs text-slate-500 mt-0.5 truncate">/juːˈbɪk.wɪ.təs/ · adjective</div>
      </div>
      <Badge className="bg-fuchsia-100 text-fuchsia-700 hover:bg-fuchsia-100 border-0 shrink-0 text-xs">CAT · XAT</Badge>
    </div>
    <div className="space-y-2 text-xs">
      {[
        { l: "English", v: "Present, appearing, or found everywhere." },
        { l: "Hindi", v: "सर्वव्यापी — हर जगह मौजूद" },
        { l: "Usage · GDPI", v: "\"Smartphones have become ubiquitous in modern business.\"" },
      ].map((r, i) => (
        <div
          key={r.l}
          className="rounded-md bg-slate-50 p-2 anim-pop"
          style={{ animationDelay: `${300 + i * 180}ms` }}
        >
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{r.l}</div>
          <div className="text-slate-800 break-words">{r.v}</div>
        </div>
      ))}
    </div>
    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
      <span>Progress today</span>
      <span className="font-semibold text-sky-600">12 / 15 words</span>
    </div>
    <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden anim-shimmer">
      <div style={{ ["--fill" as string]: "80%" }} className="h-full bg-gradient-to-r from-fuchsia-500 to-pink-500 anim-fill-bar" />
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
      ].map((r, i) => (
        <div
          key={r.l}
          className="flex items-center justify-between rounded-md border border-slate-200 px-2.5 py-1.5 gap-2 anim-pop"
          style={{ animationDelay: `${i * 160}ms` }}
        >
          <span className="text-slate-500 shrink-0">{r.l}</span>
          <span className="font-semibold text-slate-800 truncate">{r.v}</span>
        </div>
      ))}
    </div>
    <div className="mt-3 w-full inline-flex items-center justify-center gap-1 rounded-md bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-semibold py-2 anim-pulse-cta anim-gradient">
      <Zap className="w-3.5 h-3.5 anim-flame" /> Generate My Mock
    </div>
  </BrowserFrame>
);

const MockFormulaSnap = () => (
  <BrowserFrame label="dashboard.mbacompass.in / formulas">
    <div className="mb-2">
      <div className="text-xs text-slate-500">Quants Formula Book</div>
      <div className="font-semibold text-slate-900 text-sm">Time · Speed · Distance</div>
    </div>
    <div className="rounded-lg bg-gradient-to-br from-violet-50 to-white border border-violet-100 p-3 text-center anim-pop">
      <div className="font-mono text-base sm:text-lg text-violet-700 break-words">Distance = Speed × Time</div>
      <div className="text-xs text-slate-500 mt-1">D = S × T</div>
    </div>
    <div className="mt-3 space-y-1.5 text-xs text-slate-700">
      <div className="flex gap-2 anim-pop" style={{ animationDelay: "300ms" }}><span className="text-violet-500">•</span> Use when two variables are known</div>
      <div className="flex gap-2 anim-pop" style={{ animationDelay: "500ms" }}><span className="text-violet-500">•</span> Convert km/hr → m/s by × 5/18</div>
      <div className="flex gap-2 anim-pop" style={{ animationDelay: "700ms" }}><span className="text-violet-500">•</span> Common trap: units mismatch</div>
    </div>
  </BrowserFrame>
);

/* ------------------------------- Features ------------------------------ */

interface Feature {
  icon: any;
  title: string;
  tagline: string;
  bullets: string[];
  accent: string;
  Preview: () => JSX.Element;
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
    Preview: MockFullLengthSnap,
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
    Preview: MockInsightsSnap,
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
    Preview: MockFormulaSnap,
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
    Preview: MockPlannerSnap,
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
    Preview: MockVocabSnap,
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
    Preview: MockFormulaSnap,
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
    Preview: MockInsightsSnap,
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
    Preview: MockInsightsSnap,
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
    Preview: MockPersonalizedSnap,
  },
];

const steps = [
  { n: 1, title: "Explore the Dashboard", desc: "Click below, go to Dashboard → Try a Demo Account." },
  { n: 2, title: "Complete a Simple Login", desc: "Quick verification — no purchase needed." },
  { n: 3, title: "Experience Everything", desc: "Mocks, planner, vocab, insights — all before you buy." },
];

/* ------------------------------ Lightbox ------------------------------- */

const SnapshotButton = ({ title, children, onOpen }: { title: string; children: ReactNode; onOpen: () => void }) => (
  <button
    type="button"
    onClick={onOpen}
    aria-label={`Open ${title} preview`}
    className="group relative block w-full text-left focus:outline-hidden focus-visible:ring-2 focus-visible:ring-sky-500 rounded-xl"
  >
    {children}
    <span className="pointer-events-none absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 text-white text-xs font-medium px-2 py-1 rounded-md inline-flex items-center gap-1">
      <Maximize2 className="w-3 h-3" /> View
    </span>
  </button>
);

/* --------------------- Suggested courses auto slider ------------------- */

type SuggestedCourse = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  price: number | null;
  original_price: number | null;
  thumbnail_url: string | null;
  rating: number | null;
};

const SuggestedCoursesSlider = () => {
  const [courses, setCourses] = useState<SuggestedCourse[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("mba_compass_courses")
        .select("id, slug, title, subtitle, price, original_price, thumbnail_url, rating")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("sort_order")
        .limit(12);
      setCourses((data ?? []) as SuggestedCourse[]);
    })();
  }, []);

  if (!courses.length) return null;
  const loop = [...courses, ...courses];

  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-white to-sky-50/50 overflow-hidden">
      <div className="container mx-auto px-5 sm:px-6 lg:px-8 mb-8">
        <div className="text-center max-w-2xl mx-auto">
          <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0 mb-3">
            <Sparkles className="w-3.5 h-3.5 mr-1" /> Suggested Courses
          </Badge>
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Students who bought this also loved
          </h2>
          <p className="text-slate-500 mt-2 text-sm md:text-base">
            Hand-picked MBA Compass courses to complement your mock prep.
          </p>
        </div>
      </div>

      <div className="relative group">
        <div
          className="flex gap-4 md:gap-5 w-max animate-[slide_40s_linear_infinite] group-hover:[animation-play-state:paused]"
        >
          {loop.map((c, i) => (
            <Link
              key={`${c.id}-${i}`}
              to={`/mba-compass/${c.slug}`}
              className="w-64 md:w-72 shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-white hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              <div
                className={`aspect-video relative overflow-hidden bg-gradient-to-br ${
                  ["from-sky-400 via-cyan-400 to-blue-500",
                   "from-fuchsia-400 via-pink-400 to-rose-500",
                   "from-emerald-400 via-teal-400 to-cyan-500",
                   "from-amber-400 via-orange-400 to-rose-500",
                   "from-violet-400 via-purple-400 to-fuchsia-500",
                   "from-blue-400 via-indigo-400 to-violet-500"][i % 6]
                }`}
              >
                {c.thumbnail_url ? (
                  <img
                    src={c.thumbnail_url}
                    alt={c.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <BookOpen className="w-10 h-10 anim-float drop-shadow-lg" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="font-semibold text-sm text-slate-900 line-clamp-2 min-h-[2.5rem]">{c.title}</div>
                {c.subtitle && <div className="text-xs text-slate-500 mt-1 line-clamp-1">{c.subtitle}</div>}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-baseline gap-2">
                    {c.price != null && (
                      <span className="text-base font-bold text-slate-900">₹{c.price}</span>
                    )}
                    {c.original_price && c.price && c.original_price > c.price && (
                      <span className="text-xs text-slate-400 line-through">₹{c.original_price}</span>
                    )}
                  </div>
                  {c.rating ? (
                    <div className="flex items-center gap-0.5 text-xs text-amber-600">
                      <Star className="w-3 h-3 fill-current" /> {c.rating.toFixed(1)}
                    </div>
                  ) : null}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes slide {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>

      <div className="text-center mt-8">
        <Link to="/mba-compass">
          <Button variant="outline" size="lg" className="border-sky-200 gap-2">
            Browse all courses <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>
    </section>
  );
};

/* --------------------------------- Page -------------------------------- */

type SeoOverride = {
  title?: string; description?: string; h1?: string; intro_html?: string;
  keywords?: string[]; faq?: { q: string; a: string }[]; json_ld?: any; og_image?: string;
};

const CatMock1Page = () => {
  const [lightbox, setLightbox] = useState<{ title: string; Preview: () => JSX.Element } | null>(null);
  const [override, setOverride] = useState<SeoOverride | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.from("page_seo_overrides").select("*").eq("slug", "cat-mock-1").maybeSingle()
      .then(({ data }) => { if (!cancelled && data) setOverride(data as any); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const defTitle = "CAT Mock Test 2026 — 30 Free & Paid CAT Mock Tests Online | MBA Compass";
    const defDesc = "Take India's most realistic CAT mock test 2026 online. 30 full-length CAT mock tests, 45+ sectional CAT mock tests, 200+ topic-wise CAT mock tests + XAT, NMAT, SNAP, IIFT, CMAT & MAT mocks. AI-personalized, deep analytics, ₹999 all-inclusive.";
    const defKeywords = "CAT mock test, CAT mock test 2026, free CAT mock test, CAT mock test online, sectional CAT mock test, CAT mock test series, best CAT mock test, CAT mock test with solutions, CAT mock test IIM, CAT online mock test, CAT full length mock test, CAT mock test analysis, XAT mock test, NMAT mock test, SNAP mock test, IIFT mock test, CMAT mock test, MAT mock test, MBA mock test";

    const title = override?.title || defTitle;
    const description = override?.description || defDesc;
    const keywords = override?.keywords?.length ? override.keywords.join(", ") : defKeywords;
    const canonicalUrl = "https://mbacompass.in/cat-mock-1";

    document.title = title;

    const setName = (name: string, val: string) => {
      let el = document.querySelector(`meta[name="${name}"]`);
      if (!el) { el = document.createElement("meta"); (el as HTMLMetaElement).name = name; document.head.appendChild(el); }
      el.setAttribute("content", val);
    };
    const setProp = (prop: string, val: string) => {
      let el = document.querySelector(`meta[property="${prop}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute("property", prop); document.head.appendChild(el); }
      el.setAttribute("content", val);
    };
    setName("description", description);
    setName("keywords", keywords);
    setName("robots", "index, follow, max-image-preview:large, max-snippet:-1");
    setName("author", "MBA Compass");
    setName("twitter:card", "summary_large_image");
    setName("twitter:title", title);
    setName("twitter:description", description);
    setProp("og:title", title);
    setProp("og:description", description);
    setProp("og:type", "website");
    setProp("og:site_name", "MBA Compass");
    setProp("og:locale", "en_IN");
    setProp("og:url", canonicalUrl);
    if (override?.og_image) setProp("og:image", override.og_image);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
    canonical.href = canonicalUrl;

    // Managed JSON-LD: Product + FAQPage + BreadcrumbList (always) + override (if any)
    document.querySelectorAll('script[data-cat-mock-jsonld="1"]').forEach(n => n.remove());
    const injectLd = (obj: any) => {
      const s = document.createElement("script");
      s.type = "application/ld+json";
      s.setAttribute("data-cat-mock-jsonld", "1");
      s.textContent = JSON.stringify(obj);
      document.head.appendChild(s);
    };

    injectLd({
      "@context": "https://schema.org",
      "@type": "Product",
      name: "MBA Compass CAT Mock Test Series 2026",
      description: "30 full-length CAT mock tests, 45+ sectional CAT mock tests and 200+ topic-wise CAT mock tests with AI-personalized practice, deep analytics, planner, vocab and formula book.",
      brand: { "@type": "Brand", name: "MBA Compass" },
      offers: {
        "@type": "Offer",
        price: "999",
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        url: canonicalUrl,
        priceValidUntil: "2026-12-31",
        itemCondition: "https://schema.org/NewCondition",
        hasMerchantReturnPolicy: {
          "@type": "MerchantReturnPolicy",
          applicableCountry: "IN",
          returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
          merchantReturnDays: 7,
          returnMethod: "https://schema.org/ReturnByMail",
          returnFees: "https://schema.org/FreeReturn",
        },
        shippingDetails: {
          "@type": "OfferShippingDetails",
          shippingRate: { "@type": "MonetaryAmount", value: "0", currency: "INR" },
          shippingDestination: { "@type": "DefinedRegion", addressCountry: "IN" },
          deliveryTime: {
            "@type": "ShippingDeliveryTime",
            handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 0, unitCode: "DAY" },
            transitTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 0, unitCode: "DAY" },
          },
        },
      },
      aggregateRating: { "@type": "AggregateRating", ratingValue: "4.8", reviewCount: "10248" },
    });

    injectLd({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        { q: "Is this the best CAT mock test online?", a: "Yes — each CAT mock test is exam-pattern accurate, timed like the real CAT, and comes with a personalized CAT mock test report with All India Rank and section-wise analytics." },
        { q: "Do I get a free CAT mock test?", a: "Yes. You can try a free CAT mock test from the demo dashboard before you buy the full CAT mock test series at ₹999." },
        { q: "How many CAT mock tests are included?", a: "30 full-length CAT mock tests, 45+ sectional CAT mock tests and 200+ topic-wise CAT mock tests, plus XAT, NMAT, SNAP, IIFT, CMAT and MAT mocks." },
        { q: "Are these CAT mock test 2026 pattern?", a: "Yes, every CAT mock test follows the latest CAT 2026 pattern, section timing and difficulty distribution." },
        { q: "Can I retake a CAT mock test?", a: "Yes — retake any CAT mock test unlimited times and compare attempts inside your CAT mock test analytics dashboard." },
        { q: "Is there a personalized CAT mock test?", a: "Yes — our Personalized Hub generates a custom AI CAT mock test around your weak topics in under a minute." },
      ].map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    });

    injectLd({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://mbacompass.in/" },
        { "@type": "ListItem", position: 2, name: "Mocks", item: "https://mbacompass.in/mocks" },
        { "@type": "ListItem", position: 3, name: "CAT Mock Test", item: canonicalUrl },
      ],
    });

    if (override?.json_ld) injectLd(override.json_ld);
  }, [override]);



  const openLightbox = (title: string, Preview: () => JSX.Element) => setLightbox({ title, Preview });

  return (
    <LazyMotion features={domAnimation}>
      <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white overflow-x-hidden">
        <AnimationStyles />
        {/* Hero */}
        <section className="relative">
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60 overflow-hidden">
            <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sky-200 blur-3xl" />
            <div className="absolute top-40 -right-24 h-80 w-80 rounded-full bg-cyan-200 blur-3xl" />
          </div>

          <div className="container mx-auto px-5 sm:px-6 lg:px-8 pt-14 md:pt-20 pb-10 relative">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
              <m.div initial="hidden" animate="show" variants={stagger}>
                <m.div variants={fadeUp}>
                  <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0 mb-4">
                    <Sparkles className="w-3.5 h-3.5 mr-1" /> India's #1 CAT Mock Test Platform
                  </Badge>
                </m.div>
                {override?.h1 ? (
                  <m.h1 variants={fadeUp} className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 leading-tight tracking-tight">
                    {override.h1}
                  </m.h1>
                ) : (
                  <m.h1 variants={fadeUp} className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 leading-tight tracking-tight">
                    The most realistic <span className="text-sky-600">CAT Mock Test</span> online — built for{" "}
                    <span className="text-sky-600">right practice</span>, not just more questions.
                  </m.h1>
                )}
                {override?.intro_html ? (
                  <m.div
                    variants={fadeUp}
                    className="mt-5 text-base md:text-lg text-slate-600 leading-relaxed prose prose-slate max-w-none prose-p:my-2 prose-strong:text-slate-900"
                    dangerouslySetInnerHTML={{ __html: override.intro_html }}
                  />
                ) : (
                  <>
                    <m.p variants={fadeUp} className="mt-5 text-base md:text-lg text-slate-600 leading-relaxed">
                      30 full-length CAT mock tests, 45+ sectional CAT mock tests and 200+ topic-wise CAT mock tests —
                      every CAT mock test comes with a personalized report, deep analytics and a smart revision plan.
                    </m.p>
                    <m.p variants={fadeUp} className="mt-4 text-lg md:text-xl font-semibold text-slate-800">
                      That's why <span className="text-sky-600">MBA Compass CAT Mock Test</span> is India's most
                      student-focused CAT mock test series.
                    </m.p>
                  </>
                )}
                <m.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-3">
                  <BuyNowButton label="Buy CAT Mock Test — ₹999" />
                  <Link to="/student">
                    <Button size="lg" variant="outline" className="border-sky-200 gap-2">
                      Try Free CAT Mock Test <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </m.div>
                <m.div variants={fadeUp} className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Secure Razorpay checkout</span>
                  <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Instant CAT mock test access</span>
                </m.div>

              </m.div>


              {/* Hero snapshots */}
              <m.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE }}
                className="relative w-full max-w-md mx-auto lg:max-w-none"
              >
                <div aria-hidden className="absolute -inset-4 bg-gradient-to-tr from-sky-200/60 to-cyan-100/60 rounded-3xl blur-2xl pointer-events-none" />
                <div className="relative">
                  <SnapshotButton title="Full-Length Mock" onOpen={() => openLightbox("Full-Length Mock", MockFullLengthSnap)}>
                    <MockFullLengthSnap />
                  </SnapshotButton>
                </div>
                <div className="hidden md:block absolute -bottom-10 -left-6 w-52">
                  <SnapshotButton title="My Insights" onOpen={() => openLightbox("My Insights", MockInsightsSnap)}>
                    <MockInsightsSnap />
                  </SnapshotButton>
                </div>
              </m.div>
            </div>

            {/* Quick stats */}
            <m.div
              initial="hidden" whileInView="show" viewport={viewportOnce} variants={stagger}
              className="mt-16 md:mt-24 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto"
            >
              {[
                { k: "30", v: "Full-Length CAT Mock Tests" },
                { k: "45+", v: "Sectional CAT Mock Tests" },
                { k: "200+", v: "Topic-wise CAT Mock Tests" },
                { k: "₹999", v: "Complete CAT Mock Test Access" },
              ].map((s, i) => (
                <m.div key={i} variants={fadeUp}>
                  <Card className="p-4 sm:p-5 text-center border-sky-100 bg-white/70 backdrop-blur">
                    <div className="text-2xl md:text-3xl font-bold text-sky-600">{s.k}</div>
                    <div className="text-xs md:text-sm text-slate-600 mt-1">{s.v}</div>
                  </Card>
                </m.div>
              ))}
            </m.div>
          </div>
        </section>

        {/* Intro */}
        <section className="container mx-auto px-5 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-slate-600 max-w-3xl mx-auto text-sm md:text-base">
            One CAT mock test platform. Every CAT mock test is exam-pattern accurate, timed like the real CAT,
            and paired with a personalized report so every CAT mock test moves you a step closer to your target percentile.
          </p>
        </section>

        {/* Animated marquee — keyword reinforcement */}
        <section aria-hidden className="py-4 border-y border-sky-100 bg-sky-50/50 overflow-hidden">
          <div className="flex gap-8 w-max animate-[slide_30s_linear_infinite] text-sky-700/80 text-sm font-semibold uppercase tracking-wider">
            {Array.from({ length: 2 }).flatMap((_, r) => [
              "Free CAT Mock Test", "Full-Length CAT Mock Test", "Sectional CAT Mock Test",
              "Personalized CAT Mock Test", "Topic-wise CAT Mock Test", "AI-powered CAT Mock Test",
              "Best CAT Mock Test 2026", "CAT Mock Test with Analytics",
            ].map((t, i) => (
              <span key={`${r}-${i}`} className="inline-flex items-center gap-2 whitespace-nowrap">
                <Sparkles className="w-3.5 h-3.5 text-sky-500" /> {t}
              </span>
            )))}
          </div>
        </section>

        {/* Exams & Mock Types We Cover */}
        <section className="container mx-auto px-5 sm:px-6 lg:px-8 py-14 md:py-20">
          <div className="text-center max-w-3xl mx-auto mb-10 md:mb-14">
            <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0 mb-3">
              <Trophy className="w-3.5 h-3.5 mr-1" /> Every Major MBA Entrance Exam
            </Badge>
            <h2 className="font-heading text-2xl md:text-4xl font-bold text-slate-900 tracking-tight">
              Not just a CAT mock test — mocks for <span className="text-sky-600">every</span> MBA exam
            </h2>
            <p className="text-slate-500 mt-3 text-sm md:text-base">
              Full-length, sectional, topic-wise and personalized mocks for CAT, XAT, NMAT, SNAP, IIFT, CMAT and MAT — all inside one dashboard.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto">
            {[
              { name: "CAT",   full: 30, sec: "45+", topic: "200+", accent: "from-sky-500 to-cyan-500",       tag: "IIM entrance" },
              { name: "XAT",   full: 20, sec: "45+", topic: "150+", accent: "from-blue-500 to-indigo-500",    tag: "XLRI & 160+ B-schools" },
              { name: "NMAT",  full: 20, sec: "45+", topic: "120+", accent: "from-emerald-500 to-teal-500",   tag: "NMIMS & top private" },
              { name: "SNAP",  full: 20, sec: "45+", topic: "120+", accent: "from-fuchsia-500 to-pink-500",   tag: "Symbiosis institutes" },
              { name: "IIFT",  full: 20, sec: "45+", topic: "120+", accent: "from-orange-500 to-amber-500",   tag: "IIFT MBA (IB)" },
              { name: "CMAT",  full: 20, sec: "40+", topic: "100+", accent: "from-violet-500 to-purple-500",  tag: "AICTE B-schools" },
              { name: "MAT",   full: 20, sec: "40+", topic: "100+", accent: "from-rose-500 to-red-500",       tag: "600+ B-schools" },
              { name: "TISSNET / MICAT / MAH-CET", full: 15, sec: "30+", topic: "80+", accent: "from-cyan-500 to-blue-500", tag: "Specialised exams" },
            ].map((e, i) => (
              <m.div
                key={e.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportOnce}
                transition={{ duration: 0.4, ease: EASE, delay: i * 0.05 }}
              >
                <Card className="p-5 h-full border-slate-200 hover:border-sky-300 hover:shadow-lg transition-all bg-white">
                  <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-white bg-gradient-to-r ${e.accent}`}>
                    <Rocket className="w-3 h-3" /> {e.name}
                  </div>
                  <div className="text-xs text-slate-500 mt-2">{e.tag}</div>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between"><span className="text-slate-600">Full-length mocks</span><span className="font-bold text-slate-900">{e.full}</span></div>
                    <div className="flex items-center justify-between"><span className="text-slate-600">Sectional tests</span><span className="font-bold text-slate-900">{e.sec}</span></div>
                    <div className="flex items-center justify-between"><span className="text-slate-600">Topic-wise tests</span><span className="font-bold text-slate-900">{e.topic}</span></div>
                    <div className="flex items-center justify-between"><span className="text-slate-600">Personalized</span><span className="font-bold text-emerald-600 inline-flex items-center gap-1"><Zap className="w-3 h-3" /> AI</span></div>
                  </div>
                </Card>
              </m.div>
            ))}
          </div>

          <div className="max-w-6xl mx-auto mt-12 grid md:grid-cols-4 gap-4">
            {[
              { icon: Rocket,       t: "Full-Length Mocks",     d: "Real exam pattern, timed like the actual paper, with All-India Rank." },
              { icon: Target,       t: "Sectional Tests",        d: "VARC, DILR, QA, LR, GK, DI — isolate and fix your weakest section." },
              { icon: BookOpen,     t: "Topic-Wise Tests",       d: "3–5 tests per concept: TSD, P&C, RC, Para-Jumbles, Sets, Caselets…" },
              { icon: Zap,          t: "Personalized Mocks",     d: "AI builds a mock by exam + section + difficulty + duration in 60 seconds." },
            ].map((c, i) => {
              const Ic = c.icon;
              return (
                <m.div
                  key={c.t}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={viewportOnce}
                  transition={{ duration: 0.35, ease: EASE, delay: i * 0.05 }}
                >
                  <Card className="p-5 h-full border-sky-100 bg-gradient-to-br from-sky-50/60 to-white">
                    <div className="w-9 h-9 rounded-lg bg-sky-600 text-white flex items-center justify-center"><Ic className="w-4 h-4" /></div>
                    <div className="mt-3 font-semibold text-slate-900">{c.t}</div>
                    <div className="text-sm text-slate-600 mt-1 leading-relaxed">{c.d}</div>
                  </Card>
                </m.div>
              );
            })}
          </div>

          <p className="text-center text-xs md:text-sm text-slate-500 mt-8 max-w-3xl mx-auto">
            One purchase unlocks every CAT mock test, XAT mock test, NMAT mock test, SNAP mock test, IIFT mock test, CMAT mock test and MAT mock test — plus sectional and topic-wise tests for each.
          </p>
        </section>

        {/* Personalized CAT Mock Test section */}
        <section className="container mx-auto px-5 sm:px-6 lg:px-8 py-14 md:py-20">
          <m.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.5, ease: EASE }}
            className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 md:gap-14 items-center"
          >
            <div>
              <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-0">
                <Zap className="w-3.5 h-3.5 mr-1" /> Personalized CAT Mock Test
              </Badge>
              <h2 className="mt-4 font-heading text-2xl md:text-4xl font-bold text-slate-900 tracking-tight">
                Build your own CAT mock test in <span className="text-sky-600">60 seconds</span>
              </h2>
              <p className="mt-3 text-slate-600 text-sm md:text-base leading-relaxed">
                Every aspirant is different — so every CAT mock test should be too. Pick a section, a difficulty and
                a duration, and our AI instantly assembles a personalized CAT mock test around your weak areas.
                No two CAT mock tests are ever the same.
              </p>
              <ul className="mt-5 space-y-2.5">
                {[
                  "Adaptive CAT mock test difficulty that grows with you",
                  "Weak-area targeting after every CAT mock test attempt",
                  "10-minute quick CAT mock test or full 3-hour sitting",
                  "Personalized revision plan after each CAT mock test",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-slate-700 text-sm md:text-base">
                    <CheckCircle2 className="w-4 h-4 text-sky-500 mt-1 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <BuyNowButton label="Start Personalized CAT Mock Test" />
                <Link to="/student">
                  <Button size="lg" variant="outline" className="border-sky-200 gap-2">
                    See a Sample <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <m.div
              initial={{ opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={viewportOnce}
              transition={{ duration: 0.6, ease: EASE }}
              className="relative"
            >
              <div aria-hidden className="absolute -inset-4 bg-gradient-to-tr from-yellow-200/50 to-orange-200/40 rounded-3xl blur-2xl pointer-events-none" />
              <div className="relative">
                <SnapshotButton title="Personalized CAT Mock Test" onOpen={() => openLightbox("Personalized CAT Mock Test", MockPersonalizedSnap)}>
                  <MockPersonalizedSnap />
                </SnapshotButton>
              </div>
            </m.div>
          </m.div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-5 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
            <h2 className="font-heading text-2xl md:text-4xl font-bold text-slate-900 tracking-tight">
              Everything inside your CAT mock test dashboard
            </h2>
            <p className="text-slate-500 mt-3 text-sm md:text-base">
              Tap any snapshot to zoom in. Real screens from a live CAT mock test attempt.
            </p>
          </div>


          <div className="space-y-16 md:space-y-24 max-w-6xl mx-auto">
            {features.map((f, i) => {
              const Icon = f.icon;
              const isLeft = i % 2 === 0;
              return (
                <m.div
                  key={i}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={viewportOnce}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="grid md:grid-cols-2 gap-8 md:gap-12 items-center"
                >
                  <div className={isLeft ? "md:order-1" : "md:order-2"}>
                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r ${f.accent}`}>
                      <Icon className="w-3.5 h-3.5" /> Step {i + 1}
                    </div>
                    <h3 className="mt-4 font-heading text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
                      {f.title}
                    </h3>
                    <p className="text-slate-500 mt-2 text-sm md:text-base">{f.tagline}</p>
                    <ul className="mt-5 space-y-2.5">
                      {f.bullets.map((b, j) => (
                        <li key={j} className="flex items-start gap-2.5 text-slate-700 text-sm md:text-base">
                          <CheckCircle2 className="w-4 h-4 text-sky-500 mt-1 shrink-0" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className={isLeft ? "md:order-2" : "md:order-1"}>
                    <div className="relative max-w-md mx-auto md:max-w-none">
                      <div aria-hidden className={`absolute -inset-4 bg-gradient-to-tr ${f.accent} opacity-10 rounded-3xl blur-2xl pointer-events-none`} />
                      <div className="relative">
                        <SnapshotButton title={f.title} onOpen={() => openLightbox(f.title, f.Preview)}>
                          <f.Preview />
                        </SnapshotButton>
                      </div>
                    </div>
                  </div>
                </m.div>
              );
            })}
          </div>
        </section>

        {/* Mid-page Buy Now band */}
        <section className="container mx-auto px-5 sm:px-6 lg:px-8 pb-4">
          <div className="max-w-5xl mx-auto rounded-2xl bg-gradient-to-r from-sky-600 via-sky-700 to-cyan-700 text-white p-6 md:p-8 shadow-2xl shadow-sky-500/20 flex flex-col md:flex-row items-center gap-5">
            <div className="flex-1 text-center md:text-left">
              <div className="text-xs uppercase tracking-wider text-sky-100">Limited launch offer</div>
              <div className="mt-1 text-xl md:text-2xl font-bold">Unlock the entire dashboard for just ₹999</div>
              <div className="text-sm text-sky-100 mt-1">30 CAT mocks · 200+ topic tests · Planner · Vocab · Formula book</div>
            </div>
            <BuyNowButton label="Buy Now — ₹999" className="!bg-white !text-orange-600 hover:!bg-amber-50 !from-white !to-white shadow-white/30" />
          </div>
        </section>


        {/* Pricing */}
        <section className="container mx-auto px-5 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="max-w-3xl mx-auto">
            <Card className="p-8 md:p-10 border-sky-200 bg-gradient-to-br from-sky-50 to-white shadow-xl text-center">
              <Trophy className="w-10 h-10 text-sky-600 mx-auto" />
              <h3 className="mt-3 font-heading text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                Complete CAT Mock Test Access — All-in-one
              </h3>
              <p className="text-slate-600 mt-2 max-w-xl mx-auto text-sm md:text-base">
                Full-length CAT mock tests, sectional CAT mock tests, topic-wise CAT mock tests, personalized CAT mock test builder, planner, vocab and formula book — one price, lifetime prep.
              </p>
              <div className="mt-6 flex items-end justify-center gap-2">
                <span className="text-5xl md:text-6xl font-bold text-sky-600">₹999</span>
                <span className="text-slate-500 mb-2 text-sm">/ complete access</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">No bundles. No confusion. Just one student-focused dashboard.</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <BuyNowButton label="Buy Now — Unlock Everything" />
                <Link to="/mocks">
                  <Button size="lg" variant="outline" className="border-sky-200 gap-2">
                    See what's inside <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Razorpay secured</span>
                <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Instant activation</span>
                <span className="inline-flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-500 fill-current" /> Loved by 10,000+ aspirants</span>
              </div>

            </Card>
          </div>
        </section>

        {/* Free demo */}
        <section className="container mx-auto px-5 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 justify-center mb-4">
              <Unlock className="w-5 h-5 text-emerald-600" />
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0">Free Demo</Badge>
            </div>
            <h3 className="text-center font-heading text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
              Not ready to purchase? Explore the dashboard for <span className="text-emerald-600">FREE</span>
            </h3>
            <p className="text-center text-slate-600 mt-2 text-sm md:text-base">Three simple steps — no credit card needed.</p>

            <div className="mt-8 grid md:grid-cols-3 gap-4">
              {steps.map((s) => (
                <Card key={s.n} className="p-6 h-full border-emerald-100 hover:border-emerald-300 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold">{s.n}</div>
                  <h4 className="mt-4 font-semibold text-slate-900">{s.title}</h4>
                  <p className="text-sm text-slate-600 mt-1">{s.desc}</p>
                </Card>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link to="/student/login">
                <Button size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                  Explore the Dashboard for Free <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* SEO-rich long-form content — Why our CAT Mock Test */}
        <section className="container mx-auto px-5 sm:px-6 lg:px-8 py-12 md:py-16 border-t border-slate-100">
          <article className="max-w-4xl mx-auto prose prose-slate prose-headings:font-heading prose-headings:tracking-tight prose-h2:text-2xl md:prose-h2:text-3xl prose-h3:text-xl prose-a:text-sky-600 prose-strong:text-slate-900">
            <h2>Why the MBA Compass CAT Mock Test is India's most trusted CAT mock test series in 2026</h2>
            <p>
              A great CAT mock test isn't just a set of questions — it is a full CAT preparation experience.
              Every MBA Compass CAT mock test is designed on the exact CAT 2026 exam pattern: three sections
              (VARC, DILR, QA), 66 questions in 120 minutes, sectional timers and negative marking. When you
              take a CAT mock test with us, you are training your brain for the real CAT exam — not just
              solving random questions.
            </p>
            <p>
              With 30 full-length CAT mock tests, 45+ sectional CAT mock tests and 200+ topic-wise CAT mock
              tests, our CAT mock test series is one of the most comprehensive CAT mock test libraries
              online. Every CAT mock test comes with detailed CAT mock test analysis, All India Rank,
              percentile prediction, section-wise accuracy, time management insights and a personalized
              revision plan — everything you need to convert practice into percentile.
            </p>

            <h3>What makes our CAT mock test different from any other CAT mock test online</h3>
            <ul>
              <li><strong>CAT mock test with solutions:</strong> every CAT mock test question includes a video-style explanation, shortcut approach and difficulty tag.</li>
              <li><strong>CAT mock test analysis:</strong> attempt-vs-attempt comparison, question-level time tracking and weak-topic detection after each CAT mock test.</li>
              <li><strong>Free CAT mock test demo:</strong> try a free CAT mock test with a real dashboard experience before buying the full CAT mock test series.</li>
              <li><strong>Personalized CAT mock test:</strong> AI builds a custom CAT mock test for your weak topics in under 60 seconds.</li>
              <li><strong>CAT mock test for IIM aspirants:</strong> difficulty progression from CAT 2023–2025 to a beyond-CAT level so a 99+ percentile feels comfortable.</li>
            </ul>

            <h3>Sectional CAT mock tests — VARC, DILR and Quant, done right</h3>
            <p>
              Sectional CAT mock tests are how serious CAT aspirants fix percentile leaks. Our sectional CAT
              mock test library covers Reading Comprehension, Verbal Ability, Para-Jumbles, Para-Summary,
              Data Interpretation, Logical Reasoning caselets, Arithmetic, Algebra, Number System, Geometry,
              Modern Math and more — each sectional CAT mock test is timed exactly like the CAT section it
              targets.
            </p>

            <h3>Topic-wise CAT mock tests — master concepts, not just questions</h3>
            <p>
              Every important CAT topic has 3–5 dedicated topic-wise CAT mock tests: Time-Speed-Distance,
              Percentages, Profit & Loss, Permutations & Combinations, Probability, Sets, Venn Diagrams,
              Functions, Progressions, Mensuration, Coordinate Geometry, Reading Comprehension by genre,
              Critical Reasoning, Assumptions, Puzzles, Arrangements and more. Attempt a topic-wise CAT
              mock test, review the analysis, revise the concept, and re-attempt until mastered.
            </p>

            <h3>Beyond the CAT mock test — XAT, NMAT, SNAP, IIFT, CMAT & MAT mocks</h3>
            <p>
              A single ₹999 purchase also unlocks XAT mock tests (with Decision Making and GK), NMAT mock
              tests (with adaptive timing), SNAP mock tests, IIFT mock tests (with GK section), CMAT mock
              tests and MAT mock tests. Whether you are targeting IIM Ahmedabad, XLRI Jamshedpur, NMIMS
              Mumbai, SIBM Pune, IIFT Delhi or any of the 600+ top B-schools in India, our mock test series
              covers the exam you need.
            </p>

            <h3>How to use this CAT mock test series to crack CAT 2026</h3>
            <ol>
              <li>Start with a diagnostic CAT mock test to establish your baseline percentile.</li>
              <li>Use topic-wise CAT mock tests to fix weak concepts identified by the analysis.</li>
              <li>Take a sectional CAT mock test twice a week to build section-specific strategy.</li>
              <li>Attempt one full-length CAT mock test every weekend under real exam conditions.</li>
              <li>Review every CAT mock test in your dashboard — solutions, timing, weak areas.</li>
              <li>Use the Personalized Hub to generate a CAT mock test for the topics you keep missing.</li>
            </ol>

            <h3>Who should buy this CAT mock test series</h3>
            <p>
              This CAT mock test series is built for first-time CAT aspirants targeting a 95+ percentile,
              repeaters targeting 99+, working professionals with limited prep time, and college students
              preparing alongside academics. If you want a CAT mock test that adapts to <em>your</em>
              schedule, weaknesses and target — this is the CAT mock test series to buy.
            </p>

            <div className="not-prose mt-6 p-5 rounded-xl bg-sky-50 border border-sky-100">
              <div className="font-semibold text-slate-900">Explore more MBA prep resources</div>
              <div className="mt-3 flex flex-wrap gap-2 text-sm">
                <Link to="/mocks" className="px-3 py-1.5 rounded-full bg-white border border-sky-200 hover:border-sky-400 text-sky-700">All Mock Tests</Link>
                <Link to="/student/personalized-hub" className="px-3 py-1.5 rounded-full bg-white border border-sky-200 hover:border-sky-400 text-sky-700">Personalized Mock Hub</Link>
                <Link to="/student/vocabulary" className="px-3 py-1.5 rounded-full bg-white border border-sky-200 hover:border-sky-400 text-sky-700">MBA Vocabulary</Link>
                <Link to="/mba-compass" className="px-3 py-1.5 rounded-full bg-white border border-sky-200 hover:border-sky-400 text-sky-700">MBA Compass Courses</Link>
                <Link to="/student/day-planner" className="px-3 py-1.5 rounded-full bg-white border border-sky-200 hover:border-sky-400 text-sky-700">Day Planner</Link>
                <Link to="/colleges" className="px-3 py-1.5 rounded-full bg-white border border-sky-200 hover:border-sky-400 text-sky-700">Top B-Schools</Link>
                <Link to="/exams" className="px-3 py-1.5 rounded-full bg-white border border-sky-200 hover:border-sky-400 text-sky-700">MBA Entrance Exams</Link>
                <Link to="/coaching" className="px-3 py-1.5 rounded-full bg-white border border-sky-200 hover:border-sky-400 text-sky-700">CAT Coaching</Link>
              </div>
            </div>
          </article>
        </section>

        {/* CAT Mock Test FAQ — keyword-dense */}
        <section className="container mx-auto px-5 sm:px-6 lg:px-8 py-12 md:py-16">

          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0 mb-3">
                <BookOpen className="w-3.5 h-3.5 mr-1" /> CAT Mock Test FAQ
              </Badge>
              <h2 className="font-heading text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                Frequently asked questions about our CAT mock test series
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                { q: "Is this the best CAT mock test online?", a: "Yes — each CAT mock test is exam-pattern accurate, timed like the real CAT, and comes with a personalized CAT mock test report." },
                { q: "Do I get a free CAT mock test?", a: "Absolutely. Try a demo CAT mock test with the free dashboard before you buy the full CAT mock test series." },
                { q: "How many CAT mock tests are included?", a: "30 full-length CAT mock tests, 45+ sectional CAT mock tests and 200+ topic-wise CAT mock tests — one CAT mock test for every stage of prep." },
                { q: "Are these CAT mock test 2026 pattern?", a: "Yes, every CAT mock test follows the latest CAT 2026 pattern and difficulty distribution." },
                { q: "Can I retake a CAT mock test?", a: "Yes — retake any CAT mock test and compare attempts inside your CAT mock test analytics." },
                { q: "Is there a personalized CAT mock test?", a: "Our Personalized Hub generates a custom CAT mock test around your weak areas in under a minute." },
              ].map((f, i) => (
                <m.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={viewportOnce}
                  transition={{ duration: 0.35, ease: EASE, delay: i * 0.04 }}
                >
                  <Card className="p-5 border-sky-100 hover:border-sky-300 transition-colors h-full">
                    <div className="font-semibold text-slate-900 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-sky-500 mt-1 shrink-0" /> {f.q}
                    </div>
                    <p className="text-sm text-slate-600 mt-2 leading-relaxed">{f.a}</p>
                  </Card>
                </m.div>
              ))}
            </div>
            <div className="mt-8 text-center">
              <BuyNowButton label="Buy CAT Mock Test Series — ₹999" />
            </div>
          </div>
        </section>

        {/* AI-optimized FAQ (from approved SEO audit) */}
        {override?.faq && override.faq.length > 0 && (
          <section className="container mx-auto px-5 sm:px-6 lg:px-8 py-12 md:py-16 border-t border-slate-100">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-6">CAT Mock Test — FAQs</h2>
              <div className="space-y-4">
                {override.faq.map((item, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
                    <div className="font-semibold text-slate-900">{item.q}</div>
                    <div className="mt-2 text-sm md:text-base text-slate-600 leading-relaxed">{item.a}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Suggested courses auto slider */}
        <SuggestedCoursesSlider />




        {/* Contact */}
        <section className="container mx-auto px-5 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex flex-wrap items-center justify-center gap-2 text-slate-700 text-sm md:text-base">
              <Phone className="w-4 h-4 text-sky-600" />
              <span>Questions? Call us at</span>
              <a href="tel:+917668129226" className="font-semibold text-sky-600 hover:underline">76681 29226</a>
            </div>
            <p className="mt-6 text-slate-600 text-sm md:text-base">
              Prepare consistently. Practice intelligently. Track your progress.
            </p>
            <p className="mt-4 font-heading font-semibold text-slate-900">All the very best!</p>
            <p className="text-sm text-slate-500 mt-1">— Team MBA Compass</p>
          </div>
        </section>

        {/* Lightbox */}
        <Dialog open={!!lightbox} onOpenChange={(o) => !o && setLightbox(null)}>
          <DialogContent className="max-w-2xl p-0 bg-transparent border-0 shadow-none">
            <DialogTitle className="sr-only">{lightbox?.title ?? "Preview"}</DialogTitle>
            {lightbox && (
              <div className="relative">
                <button
                  onClick={() => setLightbox(null)}
                  aria-label="Close"
                  className="absolute -top-3 -right-3 z-10 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-slate-50"
                >
                  <X className="w-4 h-4 text-slate-700" />
                </button>
                <div className="scale-100 md:scale-110 origin-center">
                  <lightbox.Preview />
                </div>
                <p className="text-center text-xs text-white/90 mt-4 drop-shadow-sm">{lightbox.title}</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
        {/* Sticky mobile Buy CTA */}
        <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 px-3 py-2.5 flex items-center gap-2 shadow-[0_-6px_20px_rgba(0,0,0,0.06)]">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500">Complete access</div>
            <div className="font-bold text-slate-900">₹999 <span className="text-xs font-normal text-slate-500">/ one-time</span></div>
          </div>
          <BuyNowButton size="default" label="Buy Now" />
        </div>
      </div>
    </LazyMotion>
  );
};

export default CatMock1Page;
