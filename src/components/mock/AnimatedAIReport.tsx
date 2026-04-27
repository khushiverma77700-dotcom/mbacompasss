import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { Sparkles, Activity, TrendingUp, Target, Clock, Layers, BarChart3, PieChart as PieIcon, Radar as RadarIcon, Users, Gauge } from "lucide-react";

// Mock data — purely illustrative
const scorePercentile = Array.from({ length: 12 }, (_, i) => ({ score: 60 + i * 10, percentile: Math.min(99.9, 30 + i * 6.5) }));
const sectionWise = [
  { name: "VARC", you: 78, top: 92 },
  { name: "DILR", you: 65, top: 88 },
  { name: "QA", you: 82, top: 94 },
];
const accuracyAttempts = Array.from({ length: 24 }, (_, i) => ({ attempts: 8 + i * 2, accuracy: 50 + Math.sin(i / 2) * 18 + i * 0.7 }));
const difficulty = [
  { level: "Easy", accuracy: 92 },
  { level: "Medium", accuracy: 74 },
  { level: "Hard", accuracy: 48 },
];
const progress = Array.from({ length: 8 }, (_, i) => ({ mock: `M${i + 1}`, percentile: 72 + i * 3.4 + Math.sin(i) * 1.5 }));
const topicWise = [
  { topic: "RC", value: 84 },
  { topic: "VA", value: 71 },
  { topic: "LR", value: 68 },
  { topic: "DI", value: 62 },
  { topic: "Arith", value: 88 },
  { topic: "Algebra", value: 79 },
  { topic: "Geom", value: 74 },
];
const attemptDist = [
  { name: "Correct", value: 42, color: "#10b981" },
  { name: "Incorrect", value: 12, color: "#ef4444" },
  { name: "Skipped", value: 26, color: "#94a3b8" },
];
const radarData = [
  { area: "Speed", you: 78, top: 92 },
  { area: "Accuracy", you: 82, top: 94 },
  { area: "VARC", you: 75, top: 90 },
  { area: "DILR", you: 64, top: 88 },
  { area: "QA", you: 86, top: 95 },
  { area: "Stamina", you: 70, top: 89 },
];
const peerCompare = Array.from({ length: 8 }, (_, i) => ({ mock: `M${i + 1}`, you: 65 + i * 4, top: 88 + i * 1.2 }));

const AXIS = "hsl(215 16% 46%)";
const GRID = "hsl(214 32% 91%)";
const PRIMARY = "hsl(199 89% 48%)";
const ACCENT = "hsl(217 91% 60%)";
const SUCCESS = "#10b981";

function ChartCard({ icon: Icon, title, children, delay = 0 }: any) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <Card
      className={`p-4 border-sky-100 bg-white transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-md bg-sky-50 text-sky-700 flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <div className="h-44">{children}</div>
    </Card>
  );
}

export function AnimatedAIReport({ title, subtitle }: { title: string; subtitle: string }) {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setPulse((p) => !p), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="py-16 bg-gradient-to-b from-white via-sky-50/40 to-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-medium mb-3">
            <Sparkles className={`h-3.5 w-3.5 ${pulse ? "scale-110" : "scale-100"} transition-transform`} />
            AI-Generated Report · Live Preview
          </div>
          <h2 className="text-2xl md:text-3xl font-bold">{title}</h2>
          <p className="text-muted-foreground mt-2">{subtitle}</p>
        </div>

        {/* "Generating" simulated header bar */}
        <Card className="mt-8 p-4 border-sky-100 bg-gradient-to-r from-sky-50 via-white to-sky-50">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 rounded-lg bg-sky-600 text-white flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
                <span className="absolute -inset-1 rounded-lg bg-sky-400/30 animate-ping" />
              </div>
              <div>
                <div className="font-semibold text-sm">AI Insight Engine</div>
                <div className="text-xs text-muted-foreground">Analyzing 47 metrics across 16 visual reports…</div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">VARC ↑ 6%</span>
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-medium">DILR ↓ time</span>
              <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-medium">QA stable</span>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-sky-100 overflow-hidden">
            <div className="h-full w-2/3 bg-gradient-to-r from-sky-400 to-sky-600 animate-pulse" />
          </div>
        </Card>

        {/* Charts grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          <ChartCard icon={TrendingUp} title="Score vs Percentile" delay={50}>
            <ResponsiveContainer>
              <AreaChart data={scorePercentile}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={PRIMARY} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                <XAxis dataKey="score" stroke={AXIS} fontSize={10} />
                <YAxis stroke={AXIS} fontSize={10} />
                <Tooltip />
                <Area type="monotone" dataKey="percentile" stroke={PRIMARY} fill="url(#g1)" strokeWidth={2} isAnimationActive animationDuration={1400} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard icon={BarChart3} title="Section-wise Performance" delay={150}>
            <ResponsiveContainer>
              <BarChart data={sectionWise}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke={AXIS} fontSize={11} />
                <YAxis stroke={AXIS} fontSize={10} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="you" fill={PRIMARY} radius={[6, 6, 0, 0]} animationDuration={1400} />
                <Bar dataKey="top" fill={ACCENT} radius={[6, 6, 0, 0]} animationDuration={1400} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard icon={Activity} title="Accuracy vs Attempts" delay={250}>
            <ResponsiveContainer>
              <ScatterChart>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                <XAxis type="number" dataKey="attempts" name="Attempts" stroke={AXIS} fontSize={10} />
                <YAxis type="number" dataKey="accuracy" name="Accuracy %" stroke={AXIS} fontSize={10} />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={accuracyAttempts} fill={PRIMARY} animationDuration={1400} />
              </ScatterChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard icon={Layers} title="Difficulty-wise Accuracy" delay={350}>
            <ResponsiveContainer>
              <BarChart data={difficulty} layout="vertical">
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                <XAxis type="number" stroke={AXIS} fontSize={10} domain={[0, 100]} />
                <YAxis type="category" dataKey="level" stroke={AXIS} fontSize={11} />
                <Tooltip />
                <Bar dataKey="accuracy" fill={SUCCESS} radius={[0, 6, 6, 0]} animationDuration={1400} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard icon={TrendingUp} title="Score Progress (Across Mocks)" delay={450}>
            <ResponsiveContainer>
              <LineChart data={progress}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                <XAxis dataKey="mock" stroke={AXIS} fontSize={11} />
                <YAxis stroke={AXIS} fontSize={10} />
                <Tooltip />
                <Line type="monotone" dataKey="percentile" stroke={PRIMARY} strokeWidth={2.5} dot={{ r: 3 }} animationDuration={1400} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard icon={Target} title="Topic-wise Accuracy" delay={550}>
            <ResponsiveContainer>
              <BarChart data={topicWise}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                <XAxis dataKey="topic" stroke={AXIS} fontSize={10} />
                <YAxis stroke={AXIS} fontSize={10} />
                <Tooltip />
                <Bar dataKey="value" fill={ACCENT} radius={[6, 6, 0, 0]} animationDuration={1400} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard icon={PieIcon} title="Attempt Distribution" delay={650}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={attemptDist} dataKey="value" innerRadius={36} outerRadius={62} paddingAngle={3} animationDuration={1400}>
                  {attemptDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard icon={RadarIcon} title="Strong vs Weak Areas (Radar)" delay={750}>
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid stroke={GRID} />
                <PolarAngleAxis dataKey="area" tick={{ fontSize: 10, fill: AXIS }} />
                <PolarRadiusAxis tick={{ fontSize: 9, fill: AXIS }} />
                <Radar name="You" dataKey="you" stroke={PRIMARY} fill={PRIMARY} fillOpacity={0.35} animationDuration={1400} />
                <Radar name="Top 1%" dataKey="top" stroke={ACCENT} fill={ACCENT} fillOpacity={0.15} animationDuration={1400} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </RadarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard icon={Users} title="Peer Comparison vs Top 1%" delay={850}>
            <ResponsiveContainer>
              <LineChart data={peerCompare}>
                <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                <XAxis dataKey="mock" stroke={AXIS} fontSize={11} />
                <YAxis stroke={AXIS} fontSize={10} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="you" stroke={PRIMARY} strokeWidth={2.5} dot={{ r: 3 }} animationDuration={1400} />
                <Line type="monotone" dataKey="top" stroke={ACCENT} strokeWidth={2.5} strokeDasharray="4 4" dot={false} animationDuration={1400} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          {[
            { icon: Clock, label: "Time/Question Heatmap", note: "Spot questions where you bleed time." },
            { icon: Gauge, label: "Speed vs Accuracy", note: "Find your optimal pace per section." },
            { icon: TrendingUp, label: "Percentile Trend", note: "Track real progress over weeks." },
          ].map((x, i) => (
            <Card key={i} className="p-4 border-sky-100 bg-white flex items-start gap-3">
              <div className="h-9 w-9 rounded-md bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                <x.icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">{x.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{x.note}</div>
              </div>
            </Card>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Sample preview only. Real reports are generated from <strong>your</strong> mock attempt data.
        </p>
      </div>
    </section>
  );
}
