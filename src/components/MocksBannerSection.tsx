import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Brain,
  LineChart,
  CalendarCheck,
  FileBarChart,
  Wand2,
  Trophy,
  Target,
  ArrowRight,
  CheckCircle2,
  Zap,
  TrendingUp,
} from "lucide-react";

const DELIVERABLES = [
  { icon: CalendarCheck, label: "CAT Study Planner", tag: "Free", tone: "from-emerald-500 to-teal-500" },
  { icon: Wand2,         label: "Advanced AI Tools", tag: "Free", tone: "from-sky-500 to-blue-500" },
  { icon: FileBarChart,  label: "AI Mock Analysis", tag: "Per-question",  tone: "from-violet-500 to-fuchsia-500" },
  { icon: Brain,         label: "Personalised Mocks", tag: "Adaptive", tone: "from-amber-500 to-orange-500" },
  { icon: LineChart,     label: "Score Predictor", tag: "Live", tone: "from-rose-500 to-pink-500" },
  { icon: Trophy,        label: "All-India Rank", tag: "Real-time", tone: "from-indigo-500 to-sky-500" },
];

export default function MocksBannerSection() {
  return (
    <section className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-white via-sky-50/40 to-white">
      {/* Decorative background — pointer-events-none so nothing blocks clicks */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute -bottom-24 -right-20 h-80 w-80 rounded-full bg-blue-200/40 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(to right, hsl(210 80% 50%) 1px, transparent 1px), linear-gradient(to bottom, hsl(210 80% 50%) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Eyebrow */}
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-sky-200 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <Sparkles className="h-3.5 w-3.5 text-sky-600" />
            <span className="text-xs font-semibold text-sky-700 tracking-wide uppercase">
              India's Best Mock Series · Powered by AI
            </span>
          </div>
        </div>

        {/* Headline */}
        <div className="text-center mt-5 max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
            Mocks that <span className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">think</span> with you.
          </h2>
          <p className="mt-4 text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Take CAT, NMAT, XAT, SNAP and more — every mock is graded by AI with a
            per-question deep-dive, weak-topic heatmap, and a percentile predictor that
            updates as you write.
          </p>
        </div>

        {/* Hero Card: AI report mockup + deliverables */}
        <div className="mt-10 grid lg:grid-cols-5 gap-6 items-stretch">
          {/* Left: animated AI report mockup */}
          <div className="lg:col-span-3 relative rounded-2xl border border-sky-100 bg-white shadow-xl shadow-sky-100/60 p-5 md:p-7 overflow-hidden">
            {/* Subtle moving sheen */}
            <div aria-hidden className="pointer-events-none absolute -inset-x-10 top-0 h-32 bg-gradient-to-r from-transparent via-sky-100/60 to-transparent blur-2xl animate-[fade-in_2s_ease-in-out_infinite_alternate]" />

            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white">
                  <Brain className="h-4.5 w-4.5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">AI Mock Report</div>
                  <div className="text-[11px] text-muted-foreground">CAT Full Length · 03/12 · Live</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-semibold text-emerald-700">Analyzing</span>
              </div>
            </div>

            {/* Stat strip */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <Stat label="Predicted %ile" value="98.7" trend="+1.4" />
              <Stat label="Score" value="148/198" trend="+12" />
              <Stat label="Accuracy" value="84%" trend="+6%" />
            </div>

            {/* Section bars */}
            <div className="space-y-3">
              <SectionBar name="VARC" pct={92} color="from-emerald-400 to-teal-500" delay="0s" />
              <SectionBar name="DILR" pct={74} color="from-sky-400 to-blue-500"     delay="0.15s" />
              <SectionBar name="QA"   pct={88} color="from-violet-400 to-fuchsia-500" delay="0.3s" />
            </div>

            {/* AI Insight bubble */}
            <div className="mt-5 rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50 to-blue-50/50 p-4 flex gap-3">
              <div className="h-8 w-8 shrink-0 rounded-full bg-white border border-sky-200 grid place-items-center">
                <Sparkles className="h-4 w-4 text-sky-600" />
              </div>
              <div className="text-xs leading-relaxed text-foreground">
                <span className="font-semibold text-sky-700">AI insight · </span>
                You lost 9 marks on <strong>Caselet-style DILR</strong>. Practising 3 caselet sets this week
                can lift your sectional percentile by ~6 points.
              </div>
            </div>

            {/* Floating chips */}
            <div aria-hidden className="pointer-events-none hidden md:block">
              <div className="absolute top-6 right-6 px-3 py-1.5 rounded-full bg-white border border-sky-200 shadow text-[11px] font-semibold text-sky-700 flex items-center gap-1 animate-[fade-in_0.6s_ease-out]">
                <TrendingUp className="h-3 w-3" /> Rank up 2,140
              </div>
              <div className="absolute bottom-6 right-6 px-3 py-1.5 rounded-full bg-white border border-emerald-200 shadow text-[11px] font-semibold text-emerald-700 flex items-center gap-1 animate-[fade-in_1s_ease-out]">
                <Zap className="h-3 w-3" /> Streak 14 days
              </div>
            </div>
          </div>

          {/* Right: deliverables grid */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-3 content-start">
            {DELIVERABLES.map((d, i) => (
              <div
                key={d.label}
                className="group relative rounded-xl bg-white border border-sky-100 p-4 hover:border-sky-300 hover:shadow-lg hover:shadow-sky-100/60 transition-all hover:-translate-y-0.5"
                style={{ animation: `fade-in 0.5s ease-out ${i * 0.06}s backwards` }}
              >
                <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${d.tone} text-white grid place-items-center mb-2.5 shadow-sm`}>
                  <d.icon className="h-4.5 w-4.5" />
                </div>
                <div className="text-sm font-semibold text-foreground leading-tight">{d.label}</div>
                <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  <CheckCircle2 className="h-2.5 w-2.5" /> {d.tag}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust strip + CTA */}
        <div className="mt-10 rounded-2xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 p-1 shadow-xl shadow-sky-200/60">
          <div className="rounded-[14px] bg-white px-5 py-5 md:px-8 md:py-6 flex flex-col md:flex-row items-center gap-5 md:gap-8">
            <div className="flex-1 grid grid-cols-3 gap-4 md:gap-8 w-full">
              <Trust label="Aspirants" value="50,000+" />
              <Trust label="Mocks live" value="180+" />
              <Trust label="AI accuracy" value="97.2%" />
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Button asChild size="lg" className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white shadow-lg">
                <Link to="/mocks">
                  <Target className="h-4 w-4 mr-2" /> Explore Mock Series
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-sky-200 text-sky-700 hover:bg-sky-50">
                <Link to="/courses">
                  Browse Courses <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="rounded-lg border border-sky-100 bg-gradient-to-br from-sky-50/50 to-white px-3 py-2.5">
      <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-lg md:text-xl font-bold text-foreground leading-tight">{value}</div>
      <div className="text-[10px] font-semibold text-emerald-600 flex items-center gap-0.5">
        <TrendingUp className="h-2.5 w-2.5" /> {trend}
      </div>
    </div>
  );
}

function SectionBar({ name, pct, color, delay }: { name: string; pct: number; color: string; delay: string }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-semibold text-foreground">{name}</span>
        <span className="text-muted-foreground">{pct}%ile</span>
      </div>
      <div className="h-2.5 rounded-full bg-sky-50 overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          style={{
            width: `${pct}%`,
            animation: `fade-in 0.8s ease-out ${delay} backwards`,
            transformOrigin: "left",
          }}
        />
      </div>
    </div>
  );
}

function Trust({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center md:text-left">
      <div className="text-xl md:text-2xl font-bold bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium">{label}</div>
    </div>
  );
}
