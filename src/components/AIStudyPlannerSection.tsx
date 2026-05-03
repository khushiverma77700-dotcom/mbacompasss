import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Brain, Target, TrendingUp, CalendarDays, Sparkles, CheckCircle2, BookOpenCheck, Flame,
} from "lucide-react";

// Lazy-load recharts (~94KB) so it does not block homepage first paint.
const PercentileTrendChart = lazy(() =>
  import("./AIStudyPlannerCharts").then((m) => ({ default: m.PercentileTrendChart }))
);
const SectionalRadial = lazy(() =>
  import("./AIStudyPlannerCharts").then((m) => ({ default: m.SectionalRadial }))
);

const ChartSkeleton = ({ h = 240 }: { h?: number }) => (
  <div style={{ height: h }} className="w-full rounded-lg bg-sky-50/50 animate-pulse" aria-hidden="true" />
);

const todayPlan = [
  { time: "07:00", task: "VARC RC drill — 3 passages", mins: 45, done: true },
  { time: "10:00", task: "QA: Arithmetic concept revision", mins: 60, done: true },
  { time: "16:00", task: "DILR set practice — 2 sets", mins: 50, done: false },
  { time: "19:30", task: "Sectional mock — VARC", mins: 40, done: false },
];

export default function AIStudyPlannerSection() {
  return (
    <section className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-br from-sky-50 via-white to-blue-50/40">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -right-20 w-[480px] h-[480px] rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 w-[480px] h-[480px] rounded-full bg-blue-200/30 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white shadow-sm border border-sky-100 text-xs text-sky-700 font-medium mb-4">
            <Sparkles className="h-3.5 w-3.5" /> AI-Powered • Built into MBA Compass paid courses
          </div>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight">
            AI Study Planner that adapts to <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">your CAT journey</span>
          </h2>
          <p className="text-base md:text-lg text-muted-foreground mt-4">
            Daily tasks, weak-topic detection, percentile prediction, and smart revisions — auto-generated from your mock performance.
            Available exclusively with our MBA Compass paid programs.
          </p>
        </div>

        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left — percentile trajectory chart */}
          <Card className="lg:col-span-7 p-5 bg-white/90 backdrop-blur border-sky-100 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-xs text-muted-foreground">Predicted percentile growth</div>
                <div className="text-lg font-semibold text-gray-900">From 62 → 95+ percentile in 8 weeks</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-sky-600">+33<span className="text-base">%ile</span></div>
                <div className="text-[11px] text-muted-foreground">avg gain by Week 8</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="planArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.6}/>
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                <YAxis domain={[50, 100]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="percentile" stroke="#0ea5e9" strokeWidth={2.5} fill="url(#planArea)" />
                <Area type="monotone" dataKey="target" stroke="#10b981" strokeDasharray="4 4" fill="none" />
              </AreaChart>
            </ResponsiveContainer>

            <div className="grid grid-cols-3 gap-3 mt-4">
              <MiniStat icon={<Flame className="h-4 w-4 text-orange-500" />} label="Daily streak" value="42 days" />
              <MiniStat icon={<BookOpenCheck className="h-4 w-4 text-sky-600" />} label="Tasks done" value="318/356" />
              <MiniStat icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} label="Accuracy" value="71%" />
            </div>
          </Card>

          {/* Right — radial subject + today's plan */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-5 bg-white/90 backdrop-blur border-sky-100 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-sky-600" />
                <h3 className="font-semibold text-sm text-gray-900">Sectional readiness</h3>
              </div>
              <ResponsiveContainer width="100%" height={170}>
                <RadialBarChart data={subjectFocus} innerRadius="35%" outerRadius="100%" startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar dataKey="value" background cornerRadius={6} />
                  <Tooltip />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="flex justify-around text-xs">
                {subjectFocus.map((s) => (
                  <div key={s.name} className="text-center">
                    <div className="font-semibold" style={{ color: s.fill }}>{s.value}%</div>
                    <div className="text-muted-foreground">{s.name}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 bg-white/90 backdrop-blur border-sky-100 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-sky-600" />
                  <h3 className="font-semibold text-sm text-gray-900">Today's auto-generated plan</h3>
                </div>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Live</span>
              </div>
              <ul className="space-y-2">
                {todayPlan.map((p, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    <CheckCircle2 className={`h-4 w-4 shrink-0 ${p.done ? "text-emerald-500" : "text-slate-300"}`} />
                    <span className="text-xs text-muted-foreground w-12 shrink-0">{p.time}</span>
                    <span className={`flex-1 truncate ${p.done ? "line-through text-muted-foreground" : "text-gray-800"}`}>{p.task}</span>
                    <span className="text-[11px] text-muted-foreground">{p.mins}m</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        {/* Feature row */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          {[
            { icon: Brain, t: "AI weak-topic detection", d: "Pinpoints exactly where you lose marks." },
            { icon: CalendarDays, t: "Daily auto-plan", d: "Regenerated each morning from your latest mock." },
            { icon: TrendingUp, t: "Percentile forecast", d: "Know your projected CAT percentile in real time." },
            { icon: Sparkles, t: "Adaptive revisions", d: "Spaced-repetition for concepts you got wrong." },
          ].map((f, i) => (
            <Card key={i} className="p-4 border-sky-100 bg-white/80 hover:shadow-md transition">
              <f.icon className="h-5 w-5 text-sky-600 mb-2" />
              <div className="font-semibold text-sm text-gray-900">{f.t}</div>
              <div className="text-xs text-muted-foreground mt-1">{f.d}</div>
            </Card>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-10 text-center">
          <Card className="inline-block px-6 py-5 bg-gradient-to-r from-sky-600 to-blue-600 border-0 text-white shadow-lg">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="text-left">
                <div className="font-semibold text-lg">Get the AI Study Planner</div>
                <div className="text-xs text-sky-100">Included with every MBA Compass paid course</div>
              </div>
              <Button asChild size="lg" className="bg-white text-sky-700 hover:bg-sky-50">
                <Link to="/courses">Explore MBA Compass courses →</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg bg-sky-50/60 border border-sky-100 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">{icon}{label}</div>
      <div className="font-semibold text-sm text-gray-900 mt-0.5">{value}</div>
    </div>
  );
}
