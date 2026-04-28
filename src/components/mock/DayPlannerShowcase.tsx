import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  CalendarCheck, Activity, Target, Sparkles, ArrowRight, CheckCircle2, Flame, BookOpen, Timer, TrendingUp, Award, BarChart3, BrainCircuit, GraduationCap, Users, PlayCircle,
} from "lucide-react";

const ICONS: Record<string, any> = {
  CalendarCheck, Activity, Target, Sparkles, Flame, BookOpen, Timer, TrendingUp, Award, BarChart3, BrainCircuit, GraduationCap, Users, PlayCircle,
};

interface DayPlannerBlock {
  enabled?: boolean;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  cta_label?: string;
  cta_url?: string;
  features?: { icon?: string; title: string; desc: string }[];
  stats?: { label: string; value: string }[];
}

const SAMPLE_TASKS = [
  { time: "07:00", title: "QA · Time, Speed & Distance", min: 45, done: true },
  { time: "09:30", title: "VARC · RC Set + Vocabulary", min: 60, done: true },
  { time: "13:00", title: "DILR · Caselet Practice", min: 50, done: true },
  { time: "17:00", title: "Sectional Test — QA", min: 40, done: false, active: true },
  { time: "20:30", title: "Revise Yesterday's Mistakes", min: 30, done: false },
];

export default function DayPlannerShowcase({ block }: { block?: DayPlannerBlock }) {
  if (block && block.enabled === false) return null;
  const features = block?.features ?? [];
  const stats = block?.stats ?? [];

  return (
    <section className="relative overflow-hidden py-20 bg-gradient-to-b from-white via-sky-50/40 to-white">
      {/* Decorative blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 left-1/4 w-[26rem] h-[26rem] rounded-full bg-gradient-to-br from-sky-200/40 to-cyan-200/30 blur-3xl animate-blob" />
        <div className="absolute bottom-0 -right-20 w-[22rem] h-[22rem] rounded-full bg-gradient-to-br from-emerald-200/30 to-sky-200/30 blur-3xl animate-blob [animation-delay:4s]" />
      </div>

      <div className="container mx-auto px-4 max-w-6xl relative">
        <div className="text-center max-w-3xl mx-auto">
          <Badge className="mb-3 bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">
            <Sparkles className="h-3.5 w-3.5 mr-1" /> {block?.eyebrow ?? "Free for every aspirant"}
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-br from-slate-900 via-sky-900 to-sky-700 bg-clip-text text-transparent">
            {block?.title ?? "CAT Day Planner — Free Access"}
          </h2>
          <p className="text-muted-foreground mt-3 text-base md:text-lg leading-relaxed">
            {block?.subtitle ?? "An adaptive 90-day planner that turns CAT prep into a daily ritual."}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mt-12 items-center">
          {/* Animated planner preview */}
          <div className="relative">
            <div className="absolute -top-6 -left-6 h-20 w-20 rounded-2xl bg-gradient-to-br from-emerald-300 to-emerald-500 shadow-2xl rotate-6 animate-float-y opacity-90 hidden md:block" />
            <div className="absolute -bottom-6 -right-4 h-16 w-16 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 shadow-2xl animate-float-y [animation-delay:2s] opacity-90 hidden md:block" />

            <Card className="relative p-5 shadow-2xl border-sky-100 bg-white/95 backdrop-blur-xl rounded-2xl">
              {/* Header with streak */}
              <div className="flex items-center justify-between pb-4 border-b">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Today · Day 47</div>
                  <div className="text-lg font-bold mt-0.5">Adaptive Plan</div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
                  <Flame className="h-4 w-4 text-amber-600 animate-pulse" />
                  <span className="text-sm font-bold text-amber-800">12 day streak</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-muted-foreground">Today's progress</span>
                  <span className="font-bold text-emerald-700">3 / 5 tasks</span>
                </div>
                <div className="h-2.5 rounded-full bg-sky-50 overflow-hidden">
                  <div className="h-full w-[60%] rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-sky-500 animate-pulse" />
                </div>
              </div>

              {/* Tasks */}
              <div className="mt-4 space-y-2">
                {SAMPLE_TASKS.map((t, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      t.active
                        ? "border-sky-300 bg-sky-50/60 shadow-sm ring-2 ring-sky-200/50"
                        : t.done
                        ? "border-emerald-100 bg-emerald-50/40"
                        : "border-slate-100 bg-white"
                    }`}
                    style={{ animation: `fade-in 0.5s ease-out ${i * 0.1}s both` }}
                  >
                    <div className="shrink-0">
                      {t.done ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      ) : t.active ? (
                        <div className="h-5 w-5 rounded-full border-2 border-sky-500 bg-white relative">
                          <div className="absolute inset-1 rounded-full bg-sky-500 animate-pulse" />
                        </div>
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-slate-200" />
                      )}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground tabular-nums w-12">{t.time}</div>
                    <div className={`flex-1 text-sm font-medium ${t.done ? "line-through text-muted-foreground" : ""}`}>
                      {t.title}
                    </div>
                    <Badge variant="secondary" className="text-[10px] bg-slate-100">
                      {t.min}m
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Mastery rings */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
                {[
                  { name: "QA", val: 78, color: "from-sky-500 to-sky-600" },
                  { name: "VARC", val: 65, color: "from-emerald-500 to-emerald-600" },
                  { name: "DILR", val: 52, color: "from-amber-500 to-amber-600" },
                ].map((m) => (
                  <div key={m.name} className="text-center">
                    <div className="relative h-14 w-14 mx-auto">
                      <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(210 40% 96%)" strokeWidth="3" />
                        <circle
                          cx="18" cy="18" r="15" fill="none" stroke="url(#g-pl)"
                          strokeWidth="3" strokeLinecap="round"
                          strokeDasharray={`${m.val * 0.94} 100`}
                          className="transition-all duration-1000"
                        />
                        <defs>
                          <linearGradient id="g-pl" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="hsl(199 89% 48%)" />
                            <stop offset="100%" stopColor="hsl(199 89% 35%)" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">{m.val}%</div>
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 font-medium">{m.name}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Features + CTA */}
          <div>
            <div className="grid sm:grid-cols-2 gap-3">
              {features.map((f, i) => {
                const Icon = ICONS[f.icon ?? ""] ?? Sparkles;
                return (
                  <Card
                    key={i}
                    className="p-5 border-sky-100 bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all group"
                    style={{ animation: `fade-in 0.5s ease-out ${i * 0.1}s both` }}
                  >
                    <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-sky-500 to-sky-600 text-white flex items-center justify-center mb-3 shadow-md shadow-sky-500/30 group-hover:scale-110 transition-transform">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-sm">{f.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{f.desc}</p>
                  </Card>
                );
              })}
            </div>

            {stats.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mt-5">
                {stats.map((s, i) => (
                  <div key={i} className="rounded-xl bg-gradient-to-br from-sky-50 to-white border border-sky-100 px-4 py-3 text-center">
                    <div className="text-base md:text-lg font-bold bg-gradient-to-br from-sky-700 to-sky-500 bg-clip-text text-transparent">
                      {s.value}
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5 font-medium">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" className="shadow-lg shadow-sky-500/30">
                <Link to={block?.cta_url ?? "/student/day-planner"}>
                  {block?.cta_label ?? "Open Free Day Planner"} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Badge variant="secondary" className="px-3 py-2 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-center">
                100% Free · No card required
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
