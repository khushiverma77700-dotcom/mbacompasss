import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell,
  AreaChart, Area,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import {
  Sparkles, Trophy, Target, TrendingUp, Clock, Activity, Brain,
  CheckCircle2, XCircle, MinusCircle, Zap, Award, BarChart3,
} from "lucide-react";

const PRIMARY = "hsl(199 89% 48%)";
const ACCENT = "hsl(217 91% 60%)";
const GRID = "hsl(214 32% 91%)";
const AXIS = "hsl(215 16% 46%)";

const sectionData = [
  { name: "VARC", you: 78, top: 92, max: 72 },
  { name: "DILR", you: 62, top: 89, max: 72 },
  { name: "QA", you: 81, top: 94, max: 72 },
];
const percentileTrend = Array.from({ length: 10 }, (_, i) => ({
  mock: `Mock ${i + 1}`,
  percentile: 70 + i * 2.6 + Math.sin(i) * 1.4,
  target: 95,
}));
const radar = [
  { area: "Speed", you: 78, top: 92 },
  { area: "Accuracy", you: 82, top: 94 },
  { area: "VARC", you: 75, top: 90 },
  { area: "DILR", you: 64, top: 88 },
  { area: "QA", you: 86, top: 95 },
  { area: "Stamina", you: 70, top: 89 },
];
const attemptDist = [
  { name: "Correct", value: 48, color: "#10b981" },
  { name: "Incorrect", value: 14, color: "#ef4444" },
  { name: "Skipped", value: 24, color: "#94a3b8" },
];
const timePerSection = [
  { name: "VARC", time: 38 },
  { name: "DILR", time: 47 },
  { name: "QA", time: 35 },
];
const peerCompare = Array.from({ length: 8 }, (_, i) => ({
  mock: `M${i + 1}`,
  you: 65 + i * 4,
  top: 88 + i * 1.2,
  avg: 55 + i * 2,
}));
const topicWise = [
  { topic: "RC", acc: 84 }, { topic: "VA", acc: 71 }, { topic: "LR", acc: 68 },
  { topic: "DI", acc: 62 }, { topic: "Arith", acc: 88 }, { topic: "Algebra", acc: 79 },
  { topic: "Geom", acc: 74 }, { topic: "Mod Math", acc: 70 },
];

function Stat({ icon: Icon, label, value, sub, accent }: any) {
  return (
    <Card className="p-4 border-sky-100 bg-white">
      <div className="flex items-center gap-2">
        <div className={`h-8 w-8 rounded-md ${accent || "bg-sky-100 text-sky-700"} flex items-center justify-center`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </Card>
  );
}

export function SampleAIReport({ title, subtitle }: { title: string; subtitle: string }) {
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setPulse((p) => !p), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <section className="py-16 bg-gradient-to-b from-white via-sky-50/30 to-white">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center max-w-3xl mx-auto">
          <Badge className="mb-3 bg-sky-100 text-sky-800 hover:bg-sky-100 border-sky-200">
            <Sparkles className="h-3.5 w-3.5 mr-1" /> AI-Powered Mock Report
          </Badge>
          <h2 className="text-2xl md:text-3xl font-bold">{title}</h2>
          <p className="text-muted-foreground mt-2">{subtitle}</p>
        </div>

        {/* SAMPLE REPORT FRAME */}
        <Card className="mt-10 overflow-hidden border-sky-200 shadow-2xl">
          {/* Header bar */}
          <div className="bg-gradient-to-r from-sky-700 via-sky-600 to-sky-700 text-white p-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 rounded-lg bg-white/15 flex items-center justify-center">
                  <Sparkles className="h-5 w-5" />
                  <span className={`absolute -inset-1 rounded-lg bg-white/20 ${pulse ? "animate-ping" : ""}`} />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-sky-100">Mock Report · Sample Preview</div>
                  <div className="font-semibold">CAT 2026 Full Mock #07 — Detailed Analysis</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-white/15 text-white hover:bg-white/15 border-0">All India Rank · #428</Badge>
                <Badge className="bg-emerald-400 text-emerald-950 hover:bg-emerald-400 border-0">98.7%ile</Badge>
              </div>
            </div>
          </div>

          {/* Top KPI row */}
          <div className="p-5 bg-sky-50/50 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <Stat icon={Trophy} label="Overall Score" value="142" sub="of 198" accent="bg-amber-100 text-amber-700" />
            <Stat icon={Award} label="Percentile" value="98.7" sub="↑ 6.4 from last" accent="bg-emerald-100 text-emerald-700" />
            <Stat icon={BarChart3} label="All India Rank" value="#428" sub="of 3.3L" />
            <Stat icon={Target} label="Accuracy" value="78%" sub="↑ 5%" accent="bg-emerald-100 text-emerald-700" />
            <Stat icon={Activity} label="Attempts" value="62" sub="of 66" />
            <Stat icon={Clock} label="Time Used" value="119m" sub="of 120m" accent="bg-rose-100 text-rose-700" />
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="p-5">
            <TabsList className="flex flex-wrap h-auto bg-sky-50">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="sections">Sections</TabsTrigger>
              <TabsTrigger value="topics">Topics</TabsTrigger>
              <TabsTrigger value="time">Time Analysis</TabsTrigger>
              <TabsTrigger value="peer">Peer Compare</TabsTrigger>
              <TabsTrigger value="ai">AI Insights</TabsTrigger>
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="mt-5">
              <div className="grid lg:grid-cols-3 gap-4">
                <Card className="p-4 border-sky-100 lg:col-span-2">
                  <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-sky-700" /> Percentile Trend (last 10 mocks)
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer>
                      <AreaChart data={percentileTrend}>
                        <defs>
                          <linearGradient id="pt" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={PRIMARY} stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                        <XAxis dataKey="mock" stroke={AXIS} fontSize={11} />
                        <YAxis stroke={AXIS} fontSize={10} domain={[60, 100]} />
                        <Tooltip />
                        <Area type="monotone" dataKey="percentile" stroke={PRIMARY} fill="url(#pt)" strokeWidth={2.5} animationDuration={1400} />
                        <Line type="monotone" dataKey="target" stroke={ACCENT} strokeDasharray="4 4" strokeWidth={1.5} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card className="p-4 border-sky-100">
                  <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-sky-700" /> Attempt Distribution
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={attemptDist} dataKey="value" innerRadius={45} outerRadius={75} paddingAngle={3} animationDuration={1400}>
                          {attemptDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 text-center text-xs">
                    <div className="flex items-center gap-1 justify-center text-emerald-700"><CheckCircle2 className="h-3 w-3" /> 48 right</div>
                    <div className="flex items-center gap-1 justify-center text-rose-600"><XCircle className="h-3 w-3" /> 14 wrong</div>
                    <div className="flex items-center gap-1 justify-center text-muted-foreground"><MinusCircle className="h-3 w-3" /> 24 skip</div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* SECTIONS */}
            <TabsContent value="sections" className="mt-5">
              <Card className="p-4 border-sky-100">
                <div className="text-sm font-semibold mb-3">Section-wise: You vs Top 1% vs Cutoff</div>
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={sectionData}>
                      <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                      <XAxis dataKey="name" stroke={AXIS} fontSize={12} />
                      <YAxis stroke={AXIS} fontSize={10} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="you" name="You" fill={PRIMARY} radius={[6, 6, 0, 0]} animationDuration={1400} />
                      <Bar dataKey="top" name="Top 1%" fill={ACCENT} radius={[6, 6, 0, 0]} animationDuration={1400} />
                      <Bar dataKey="max" name="Cutoff" fill="#94a3b8" radius={[6, 6, 0, 0]} animationDuration={1400} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  {sectionData.map((s) => (
                    <div key={s.name} className="rounded-lg bg-sky-50 p-3">
                      <div className="text-xs text-muted-foreground">{s.name} percentile</div>
                      <div className="text-2xl font-bold text-sky-800">{(s.you * 1.2).toFixed(1)}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            {/* TOPICS */}
            <TabsContent value="topics" className="mt-5">
              <Card className="p-4 border-sky-100">
                <div className="text-sm font-semibold mb-3">Topic-wise Accuracy</div>
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={topicWise} layout="vertical" margin={{ left: 30 }}>
                      <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                      <XAxis type="number" stroke={AXIS} fontSize={10} domain={[0, 100]} />
                      <YAxis type="category" dataKey="topic" stroke={AXIS} fontSize={11} width={70} />
                      <Tooltip />
                      <Bar dataKey="acc" fill={PRIMARY} radius={[0, 6, 6, 0]} animationDuration={1400} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </TabsContent>

            {/* TIME */}
            <TabsContent value="time" className="mt-5">
              <div className="grid lg:grid-cols-2 gap-4">
                <Card className="p-4 border-sky-100">
                  <div className="text-sm font-semibold mb-3">Time per Section (min)</div>
                  <div className="h-56">
                    <ResponsiveContainer>
                      <BarChart data={timePerSection}>
                        <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke={AXIS} fontSize={11} />
                        <YAxis stroke={AXIS} fontSize={10} />
                        <Tooltip />
                        <Bar dataKey="time" fill={ACCENT} radius={[6, 6, 0, 0]} animationDuration={1400} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <Card className="p-4 border-sky-100">
                  <div className="text-sm font-semibold mb-3">Strong vs Weak Areas</div>
                  <div className="h-56">
                    <ResponsiveContainer>
                      <RadarChart data={radar}>
                        <PolarGrid stroke={GRID} />
                        <PolarAngleAxis dataKey="area" tick={{ fontSize: 10, fill: AXIS }} />
                        <PolarRadiusAxis tick={{ fontSize: 9, fill: AXIS }} />
                        <Radar dataKey="you" stroke={PRIMARY} fill={PRIMARY} fillOpacity={0.35} animationDuration={1400} />
                        <Radar dataKey="top" stroke={ACCENT} fill={ACCENT} fillOpacity={0.15} animationDuration={1400} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            </TabsContent>

            {/* PEER */}
            <TabsContent value="peer" className="mt-5">
              <Card className="p-4 border-sky-100">
                <div className="text-sm font-semibold mb-3">You vs Top 1% vs Average</div>
                <div className="h-64">
                  <ResponsiveContainer>
                    <LineChart data={peerCompare}>
                      <CartesianGrid stroke={GRID} strokeDasharray="3 3" />
                      <XAxis dataKey="mock" stroke={AXIS} fontSize={11} />
                      <YAxis stroke={AXIS} fontSize={10} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="you" stroke={PRIMARY} strokeWidth={2.5} dot={{ r: 3 }} animationDuration={1400} />
                      <Line type="monotone" dataKey="top" stroke={ACCENT} strokeDasharray="4 4" strokeWidth={2} dot={false} animationDuration={1400} />
                      <Line type="monotone" dataKey="avg" stroke="#94a3b8" strokeWidth={2} dot={false} animationDuration={1400} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </TabsContent>

            {/* AI INSIGHTS */}
            <TabsContent value="ai" className="mt-5">
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { icon: Zap, color: "bg-emerald-100 text-emerald-700", title: "What's working", points: ["QA accuracy up 8% — Algebra is now your strongest topic.", "VARC RC speed improved by 22 sec/passage.", "Maintaining 78% accuracy across 62 attempts."] },
                  { icon: Brain, color: "bg-rose-100 text-rose-700", title: "Where to fix", points: ["DILR Set 2 — spent 18 min, scored 0. Skip earlier.", "Geometry: 4 of 6 wrong. Revisit similar-triangle theorems.", "Last 10 minutes: 3 hurried wrong attempts (negative -3)."] },
                  { icon: Target, color: "bg-sky-100 text-sky-700", title: "Next 7 days plan", points: ["3 sectional DILR mocks (45 min each).", "Geometry concept refresh + 30 targeted Qs.", "1 full mock on Day 7 — target 99%ile."] },
                  { icon: Trophy, color: "bg-amber-100 text-amber-700", title: "B-school predictor", points: ["IIM-A: Strong call probability (88%)", "IIM-B: Likely call (74%)", "FMS / MDI: Very high probability (92%)"] },
                ].map((b, i) => (
                  <Card key={i} className="p-5 border-sky-100">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`h-8 w-8 rounded-md ${b.color} flex items-center justify-center`}><b.icon className="h-4 w-4" /></div>
                      <div className="font-semibold text-sm">{b.title}</div>
                    </div>
                    <ul className="space-y-2">
                      {b.points.map((p, j) => (
                        <li key={j} className="text-sm text-muted-foreground flex gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Sample preview only. Real reports are generated automatically from <strong>your</strong> mock attempt data.
        </p>
      </div>
    </section>
  );
}
