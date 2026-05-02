import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  RadialBarChart, RadialBar, PolarAngleAxis, LineChart, Line, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Award, AlertTriangle, Activity, Trophy, ChevronDown, GraduationCap,
  Target, TrendingUp, TrendingDown, Layers, ListChecks, Sparkles, BookOpenCheck,
  RefreshCw,
} from "lucide-react";
import {
  useStrengthWeaknessData,
  TopicAnalysisPanel,
  FullReportTable,
} from "./StrengthWeaknessAnalysis";
import { useStudentPerformance } from "@/hooks/useStudentPerformance";

type Mode = "strength" | "weak" | "performance" | "leaderboard";

export default function AnalysisDashboard({ mode }: { mode: Mode }) {
  const data = useStrengthWeaknessData();
  const perf = useStudentPerformance();

  if (data.loading || perf.loading) {
    return (
      <Card className="p-8 text-center">
        <div className="animate-pulse text-sm text-muted-foreground">Building your analytics dashboard…</div>
      </Card>
    );
  }

  if (!data.hasData) {
    return (
      <Card className="p-8 border-sky-100 bg-sky-50/40 text-center">
        <Activity className="h-10 w-10 text-sky-600 mx-auto mb-3" />
        <h3 className="font-semibold text-slate-900 text-lg">No mock data yet</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Submit at least one mock to unlock your personalised performance dashboard.
        </p>
        <Link to="/student/mocks"><Button className="mt-4">Take a mock</Button></Link>
      </Card>
    );
  }

  const isStrength = mode === "strength";

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Hero header */}
      <Card className={`relative overflow-hidden border-sky-100 ${isStrength ? "bg-gradient-to-br from-sky-50 via-white to-emerald-50/40" : "bg-gradient-to-br from-rose-50/60 via-white to-sky-50"}`}>
        <div className="absolute inset-0 pointer-events-none opacity-30" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, hsl(199 89% 48% / 0.18), transparent 45%)" }} />
        <div className="relative p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-xl border bg-white shadow-sm ${isStrength ? "text-sky-700 border-sky-200" : "text-rose-700 border-rose-200"}`}>
                {isStrength ? <Award className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
              </div>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">
                  {isStrength ? "Strength Dashboard" : "Improvement Dashboard"}
                </div>
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 leading-tight">
                  {isStrength ? "My Strength Areas" : "My Weak Areas"}
                </h1>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  {isStrength
                    ? "Topics, sections and exams where you are consistently strong. Maintain these for a higher percentile."
                    : "Topics, sections and exams that need urgent work. Fix these first for the biggest score gains."}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={data.refresh} className="gap-2">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            <Kpi label="Overall Readiness" value={`${data.overallReadiness}%`} icon={<Target className="h-4 w-4" />} accent="sky" />
            <Kpi label="Strong Topics" value={data.strongTopics.length} icon={<Award className="h-4 w-4" />} accent="emerald" />
            <Kpi label="Weak Topics" value={data.weakTopics.length} icon={<AlertTriangle className="h-4 w-4" />} accent="rose" />
            <Kpi label="Mocks Taken" value={perf.totalAttempts} icon={<BookOpenCheck className="h-4 w-4" />} accent="violet" />
          </div>
        </div>
      </Card>

      {/* Highlighted dropdown sections — order: Strong → Weak → Performance → Leaderboard */}
      <HighlightSection
        id="strength"
        title="Strength Areas"
        subtitle={`${data.strongTopics.length} topics where you score consistently well`}
        icon={<Award className="h-5 w-5" />}
        accent="emerald"
        defaultOpen={isStrength}
      >
        <StrengthBlock data={data} />
      </HighlightSection>

      <HighlightSection
        id="weak"
        title="Weak Areas"
        subtitle={`${data.weakTopics.length} topics that need urgent attention`}
        icon={<AlertTriangle className="h-5 w-5" />}
        accent="rose"
        defaultOpen={!isStrength}
      >
        <WeakBlock data={data} />
      </HighlightSection>

      <HighlightSection
        id="performance"
        title="Performance Analysis"
        subtitle="Topic-wise, section-wise and exam-wise performance across every mock"
        icon={<Activity className="h-5 w-5" />}
        accent="sky"
        defaultOpen={false}
      >
        <PerformanceBlock data={data} perf={perf} />
      </HighlightSection>

      <HighlightSection
        id="leaderboard"
        title="Leaderboard"
        subtitle="See where you stand against other aspirants"
        icon={<Trophy className="h-5 w-5" />}
        accent="amber"
        defaultOpen={false}
      >
        <LeaderboardBlock />
      </HighlightSection>
    </div>
  );
}

// ─── Highlighted collapsible wrapper ──────────────────────────────────────────
function HighlightSection({
  id, title, subtitle, icon, accent, defaultOpen, children,
}: {
  id: string; title: string; subtitle: string; icon: React.ReactNode;
  accent: "emerald" | "rose" | "sky" | "amber"; defaultOpen: boolean; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const palette: Record<string, { ring: string; text: string; chip: string; bar: string }> = {
    emerald: { ring: "ring-emerald-200/70", text: "text-emerald-700", chip: "bg-emerald-50 border-emerald-200 text-emerald-700", bar: "from-emerald-400 to-emerald-600" },
    rose:    { ring: "ring-rose-200/70",    text: "text-rose-700",    chip: "bg-rose-50 border-rose-200 text-rose-700",       bar: "from-rose-400 to-rose-600" },
    sky:     { ring: "ring-sky-200/70",     text: "text-sky-700",     chip: "bg-sky-50 border-sky-200 text-sky-700",          bar: "from-sky-400 to-sky-600" },
    amber:   { ring: "ring-amber-200/70",   text: "text-amber-700",   chip: "bg-amber-50 border-amber-200 text-amber-700",    bar: "from-amber-400 to-amber-600" },
  };
  const p = palette[accent];

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className={`overflow-hidden ring-1 ${p.ring} transition-all`}>
        <div className={`h-1 bg-gradient-to-r ${p.bar}`} />
        <CollapsibleTrigger className="w-full text-left">
          <div className="flex items-center justify-between p-4 sm:p-5 hover:bg-slate-50/60 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-2.5 rounded-lg border bg-white shadow-sm ${p.text}`}>{icon}</div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-semibold text-slate-900 text-base sm:text-lg truncate">{title}</h2>
                  <Badge variant="outline" className={p.chip}>Highlighted</Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">{subtitle}</p>
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-slate-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 sm:px-5 pb-5 pt-1 space-y-4 border-t bg-slate-50/30">
            {children}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function Kpi({ label, value, icon, accent }: { label: string; value: React.ReactNode; icon: React.ReactNode; accent: "sky" | "emerald" | "rose" | "violet" }) {
  const map: Record<string, string> = {
    sky: "text-sky-700 bg-sky-50 border-sky-100",
    emerald: "text-emerald-700 bg-emerald-50 border-emerald-100",
    rose: "text-rose-700 bg-rose-50 border-rose-100",
    violet: "text-violet-700 bg-violet-50 border-violet-100",
  };
  return (
    <div className="rounded-xl border bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        <div className={`p-1.5 rounded-md border ${map[accent]}`}>{icon}</div>
      </div>
      <div className="text-2xl font-semibold text-slate-900 mt-1.5">{value}</div>
    </div>
  );
}

// ─── Strength block ──────────────────────────────────────────────────────────
function StrengthBlock({ data }: { data: ReturnType<typeof useStrengthWeaknessData> }) {
  const top = data.strongTopics.slice(0, 8);
  if (top.length === 0) {
    return <Card className="p-5 text-sm text-muted-foreground">No strong topics yet — keep practising consistently to build readiness above 65%.</Card>;
  }
  return (
    <>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-900">Top strengths by readiness</h3>
            <Badge variant="outline" className="text-[10px]">Top {top.length}</Badge>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top.map((t) => ({ name: t.topic.length > 18 ? t.topic.slice(0, 18) + "…" : t.topic, accuracy: t.accuracy, readiness: t.readiness }))} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="accuracy" fill="#0284c7" radius={[0, 4, 4, 0]} name="Accuracy %" />
                <Bar dataKey="readiness" fill="#10b981" radius={[0, 4, 4, 0]} name="Readiness %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4 bg-white">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Strength signal</h3>
          <div className="space-y-2.5">
            {top.slice(0, 6).map((t) => (
              <div key={t.key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700 truncate pr-2">{t.topic}</span>
                  <span className="text-emerald-700 font-semibold">{t.readiness}%</span>
                </div>
                <Progress value={t.readiness} className="h-1.5" />
                <div className="text-[10px] text-muted-foreground mt-0.5">{t.section} · {t.attempted} attempts · {t.accuracy}% accurate</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <TopicAnalysisPanel
        heading="Detailed strength breakdown"
        description="Sub-topic accuracy, time taken and trend across mocks for your strongest topics."
        topics={data.strongTopics}
        tone="strong"
      />
    </>
  );
}

// ─── Weak block ──────────────────────────────────────────────────────────────
function WeakBlock({ data }: { data: ReturnType<typeof useStrengthWeaknessData> }) {
  const top = data.weakTopics.slice(0, 8);
  if (top.length === 0) {
    return <Card className="p-5 text-sm text-muted-foreground">No weak topics detected yet — great job! Keep attempting mocks to surface improvement areas.</Card>;
  }
  return (
    <>
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-900">Lowest readiness topics</h3>
            <Badge variant="outline" className="text-[10px] border-rose-200 text-rose-700 bg-rose-50">Fix first</Badge>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top.map((t) => ({ name: t.topic.length > 18 ? t.topic.slice(0, 18) + "…" : t.topic, accuracy: t.accuracy, gap: 100 - t.readiness }))} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="accuracy" fill="#dc2626" radius={[0, 4, 4, 0]} name="Accuracy %" />
                <Bar dataKey="gap" fill="#fda4af" radius={[0, 4, 4, 0]} name="Improvement scope %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4 bg-white">
          <h3 className="text-sm font-semibold text-slate-900 mb-2">Action queue</h3>
          <div className="space-y-2.5">
            {top.slice(0, 6).map((t, i) => (
              <div key={t.key} className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-md bg-rose-50 border border-rose-100 text-rose-700 text-[11px] font-semibold flex items-center justify-center shrink-0">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-800 truncate">{t.topic}</div>
                  <div className="text-[10px] text-muted-foreground">{t.section} · {t.accuracy}% acc · {t.attempted} attempts</div>
                  <Progress value={t.readiness} className="h-1 mt-1" />
                </div>
              </div>
            ))}
          </div>
          <Link to="/student/mocks/sectional"><Button size="sm" variant="outline" className="w-full mt-3">Practice these now</Button></Link>
        </Card>
      </div>
      <TopicAnalysisPanel
        heading="Detailed weak-area breakdown"
        description="Sub-topic accuracy, time taken and trend across mocks for your weakest topics."
        topics={data.weakTopics}
        tone="weak"
      />
    </>
  );
}

// ─── Performance block: topic / section / exam tabs ──────────────────────────
function PerformanceBlock({
  data, perf,
}: {
  data: ReturnType<typeof useStrengthWeaknessData>;
  perf: ReturnType<typeof useStudentPerformance>;
}) {
  return (
    <Tabs defaultValue="section" className="w-full">
      <TabsList className="bg-white border w-full sm:w-auto grid grid-cols-4 sm:inline-flex">
        <TabsTrigger value="section" className="gap-1.5"><Layers className="h-3.5 w-3.5" /> Section</TabsTrigger>
        <TabsTrigger value="topic" className="gap-1.5"><ListChecks className="h-3.5 w-3.5" /> Topic</TabsTrigger>
        <TabsTrigger value="exam" className="gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> Exam</TabsTrigger>
        <TabsTrigger value="trend" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Trend</TabsTrigger>
      </TabsList>

      {/* Section-wise */}
      <TabsContent value="section" className="mt-4 space-y-4">
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-4 bg-white">
            <h4 className="text-sm font-semibold mb-2">Accuracy & readiness by section</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.sections.map((s) => ({ name: s.name, accuracy: s.accuracy, readiness: s.readiness }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="accuracy" fill="#0284c7" name="Accuracy %" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="readiness" fill="#7dd3fc" name="Readiness %" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-4 bg-white">
            <h4 className="text-sm font-semibold mb-2">Section coverage</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Section</TableHead>
                  <TableHead className="text-right">Attempts</TableHead>
                  <TableHead className="text-right">Accuracy</TableHead>
                  <TableHead className="text-right">Readiness</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sections.map((s) => (
                  <TableRow key={s.name}>
                    <TableCell className="text-xs font-medium">{s.name}</TableCell>
                    <TableCell className="text-right text-xs">{s.attempted}/{s.total}</TableCell>
                    <TableCell className="text-right text-xs">{s.accuracy}%</TableCell>
                    <TableCell className="text-right text-xs">
                      <span className={s.readiness >= 65 ? "text-emerald-700 font-semibold" : s.readiness >= 50 ? "text-amber-700" : "text-rose-700 font-semibold"}>
                        {s.readiness}%
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
        <FullReportTable sections={data.sections} />
      </TabsContent>

      {/* Topic-wise */}
      <TabsContent value="topic" className="mt-4 space-y-4">
        <Card className="p-4 bg-white">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold">All topics — sorted by improvement scope</h4>
            <Badge variant="outline" className="text-[10px]">{data.allTopics.length} topics</Badge>
          </div>
          <div className="overflow-x-auto max-h-[480px]">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead>Topic</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead className="text-right">Attempts</TableHead>
                  <TableHead className="text-right">Correct</TableHead>
                  <TableHead className="text-right">Wrong</TableHead>
                  <TableHead className="text-right">Accuracy</TableHead>
                  <TableHead className="text-right">Readiness</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...data.allTopics].sort((a, b) => a.readiness - b.readiness).map((t) => (
                  <TableRow key={t.key}>
                    <TableCell className="text-xs font-medium">{t.topic}</TableCell>
                    <TableCell className="text-xs">{t.section}</TableCell>
                    <TableCell className="text-right text-xs">{t.attempted}/{t.total}</TableCell>
                    <TableCell className="text-right text-xs text-sky-700">{t.correct}</TableCell>
                    <TableCell className="text-right text-xs text-rose-700">{t.incorrect}</TableCell>
                    <TableCell className="text-right text-xs">{t.accuracy}%</TableCell>
                    <TableCell className="text-right text-xs font-semibold">{t.readiness}</TableCell>
                    <TableCell>
                      {t.readiness < 50 ? <Badge variant="outline" className="border-rose-200 text-rose-700 bg-rose-50">Weak</Badge>
                        : t.readiness < 70 ? <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">Improving</Badge>
                        : <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50">Strong</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </TabsContent>

      {/* Exam-wise */}
      <TabsContent value="exam" className="mt-4 space-y-4">
        {data.examAggs.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground">No exam data available yet.</Card>
        ) : (
          <div className="grid lg:grid-cols-2 gap-4">
            <Card className="p-4 bg-white">
              <h4 className="text-sm font-semibold mb-2">Exam-wise accuracy & readiness</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.examAggs.map((e) => ({ name: e.exam, accuracy: e.accuracy, readiness: e.readiness }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="accuracy" fill="#0284c7" name="Accuracy %" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="readiness" fill="#10b981" name="Readiness %" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card className="p-4 bg-white">
              <h4 className="text-sm font-semibold mb-2">Exam summary</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam</TableHead>
                    <TableHead className="text-right">Mocks</TableHead>
                    <TableHead className="text-right">Avg Score</TableHead>
                    <TableHead className="text-right">Best</TableHead>
                    <TableHead className="text-right">Accuracy</TableHead>
                    <TableHead className="text-right">Readiness</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.examAggs.map((e) => (
                    <TableRow key={e.exam}>
                      <TableCell className="text-xs font-semibold">{e.exam}</TableCell>
                      <TableCell className="text-right text-xs">{e.attempts}</TableCell>
                      <TableCell className="text-right text-xs">{e.avgScore}</TableCell>
                      <TableCell className="text-right text-xs text-sky-700">{e.bestScore}</TableCell>
                      <TableCell className="text-right text-xs">{e.accuracy}%</TableCell>
                      <TableCell className="text-right text-xs">
                        <span className={e.readiness >= 65 ? "text-emerald-700 font-semibold" : e.readiness >= 50 ? "text-amber-700" : "text-rose-700 font-semibold"}>
                          {e.readiness}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
        )}
      </TabsContent>

      {/* Trend */}
      <TabsContent value="trend" className="mt-4 space-y-4">
        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="p-4 bg-white lg:col-span-2">
            <h4 className="text-sm font-semibold mb-2">Percentile & accuracy trend</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={perf.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="percentile" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} name="Percentile" />
                  <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Accuracy %" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-4 bg-white">
            <h4 className="text-sm font-semibold mb-3">Performance highlights</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between"><span className="text-muted-foreground">Best percentile</span><span className="font-semibold text-sky-700">{perf.bestPercentile}</span></li>
              <li className="flex justify-between"><span className="text-muted-foreground">Avg percentile</span><span className="font-semibold">{perf.avgPercentile}</span></li>
              <li className="flex justify-between"><span className="text-muted-foreground">Avg accuracy</span><span className="font-semibold">{perf.avgAccuracy}%</span></li>
              <li className="flex justify-between"><span className="text-muted-foreground">Consistency</span><span className="font-semibold">{perf.consistency}%</span></li>
              <li className="flex justify-between">
                <span className="text-muted-foreground">Last delta</span>
                <span className={`font-semibold flex items-center gap-1 ${perf.lastDelta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {perf.lastDelta >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {perf.lastDelta >= 0 ? "+" : ""}{perf.lastDelta}
                </span>
              </li>
              <li className="flex justify-between"><span className="text-muted-foreground">Hours practised</span><span className="font-semibold">{perf.totalHours}h</span></li>
            </ul>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}

// ─── Leaderboard block ──────────────────────────────────────────────────────
type LBRow = {
  rank: number; user_id: string; display_handle: string;
  coins: number; xp: number; level: number; streak_days: number;
  total_mocks_completed: number; is_self: boolean;
};

function LeaderboardBlock() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LBRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase.rpc("get_global_leaderboard", { _limit: 50 });
      if (!cancelled) {
        setRows((data as any) || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  if (loading) return <Card className="p-5 text-sm text-muted-foreground">Loading leaderboard…</Card>;
  if (rows.length === 0) return <Card className="p-5 text-sm text-muted-foreground">Leaderboard will populate once aspirants start submitting mocks.</Card>;

  const me = rows.find((r) => r.is_self);
  const top10 = rows.slice(0, 10);

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <Card className="p-4 bg-white lg:col-span-2">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold flex items-center gap-2"><Trophy className="h-4 w-4 text-amber-600" /> Top aspirants</h4>
          <Link to="/student/leaderboard" className="text-xs text-sky-700 hover:underline">View full board →</Link>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rank</TableHead>
              <TableHead>Aspirant</TableHead>
              <TableHead className="text-right">XP</TableHead>
              <TableHead className="text-right">Level</TableHead>
              <TableHead className="text-right">Streak</TableHead>
              <TableHead className="text-right">Mocks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {top10.map((r) => (
              <TableRow key={r.user_id} className={r.is_self ? "bg-sky-50/60" : ""}>
                <TableCell className="text-xs font-semibold">
                  {r.rank <= 3 ? (
                    <span className={r.rank === 1 ? "text-amber-600" : r.rank === 2 ? "text-slate-500" : "text-orange-700"}>#{r.rank}</span>
                  ) : `#${r.rank}`}
                </TableCell>
                <TableCell className="text-xs">
                  {r.display_handle}
                  {r.is_self && <Badge variant="outline" className="ml-2 text-[9px] border-sky-200 text-sky-700 bg-sky-50">You</Badge>}
                </TableCell>
                <TableCell className="text-right text-xs font-semibold text-sky-700">{r.xp}</TableCell>
                <TableCell className="text-right text-xs">{r.level}</TableCell>
                <TableCell className="text-right text-xs">{r.streak_days}d</TableCell>
                <TableCell className="text-right text-xs">{r.total_mocks_completed}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Card className="p-4 bg-white">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-600" /> Your standing</h4>
        {me ? (
          <>
            <div className="text-center py-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Global rank</div>
              <div className="text-4xl font-bold text-sky-700">#{me.rank}</div>
              <div className="text-xs text-muted-foreground mt-1">out of {rows.length}+ aspirants</div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div className="text-center rounded-lg border bg-sky-50/40 p-2">
                <div className="text-[10px] uppercase text-muted-foreground">XP</div>
                <div className="text-base font-semibold text-sky-700">{me.xp}</div>
              </div>
              <div className="text-center rounded-lg border bg-emerald-50/40 p-2">
                <div className="text-[10px] uppercase text-muted-foreground">Streak</div>
                <div className="text-base font-semibold text-emerald-700">{me.streak_days}d</div>
              </div>
              <div className="text-center rounded-lg border bg-amber-50/40 p-2">
                <div className="text-[10px] uppercase text-muted-foreground">Level</div>
                <div className="text-base font-semibold text-amber-700">{me.level}</div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">Complete a mock to appear on the leaderboard.</div>
        )}
      </Card>
    </div>
  );
}
