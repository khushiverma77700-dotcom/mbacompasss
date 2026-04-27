import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Trophy, Target, CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown,
  Brain, Sparkles, Download, Award, AlertTriangle, Flame, BookOpen,
  Users, Activity, Lightbulb, ChevronRight,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, Legend, AreaChart, Area, Cell,
} from "recharts";
import { toast } from "sonner";

type SectionAgg = {
  code: string; name: string; score: number; max: number;
  attempted: number; correct: number; incorrect: number;
};
type TopicAgg = { attempted: number; correct: number };

export default function MockResultPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const reportRef = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState<any>(null);
  const [test, setTest] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [peerScores, setPeerScores] = useState<number[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      const { data: a } = await supabase.from("mock_attempts").select("*").eq("id", attemptId).maybeSingle();
      if (!a) { navigate("/mocks"); return; }
      const [{ data: t }, { data: secs }, { data: rsp }, { data: peers }] = await Promise.all([
        supabase.from("mock_tests").select("*").eq("id", a.test_id).maybeSingle(),
        supabase.from("mock_sections").select("*").eq("test_id", a.test_id).order("sort_order"),
        supabase.from("mock_responses").select("*").eq("attempt_id", a.id),
        supabase.from("mock_attempts").select("total_score, accuracy, percentile")
          .eq("test_id", a.test_id).in("status", ["submitted", "auto_submitted"]),
      ]);
      const qIds = (rsp ?? []).map((r: any) => r.question_id);
      let qs: any[] = [];
      if (qIds.length) {
        const { data: qd } = await supabase
          .from("mock_questions")
          .select("id, section_id, topic, subtopic, difficulty, question_type, positive_marks")
          .in("id", qIds);
        qs = qd ?? [];
      }
      setAttempt(a);
      setTest(t);
      setSections(secs ?? []);
      setResponses(rsp ?? []);
      setQuestions(qs);
      setPeerScores((peers ?? []).map((p: any) => Number(p.total_score ?? 0)));
      setLoading(false);
    })();
  }, [attemptId, navigate]);

  const sectionalScores: Record<string, SectionAgg> = attempt?.sectional_scores ?? {};
  const topicBreakdown: Record<string, TopicAgg> = attempt?.topic_breakdown ?? {};

  // ============ Derived analytics ============
  const sectionRows = useMemo(() => {
    return Object.entries(sectionalScores).map(([id, s]) => ({
      id, ...s,
      pct: s.max > 0 ? Math.round((s.score / s.max) * 100) : 0,
      accuracy: s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0,
    }));
  }, [sectionalScores]);

  const topicRows = useMemo(() => {
    return Object.entries(topicBreakdown).map(([topic, t]) => ({
      topic,
      attempted: t.attempted,
      correct: t.correct,
      accuracy: t.attempted > 0 ? Math.round((t.correct / t.attempted) * 100) : 0,
    })).sort((a, b) => b.attempted - a.attempted);
  }, [topicBreakdown]);

  const strongTopics = useMemo(
    () => topicRows.filter((t) => t.attempted >= 2 && t.accuracy >= 70).slice(0, 5),
    [topicRows],
  );
  const weakTopics = useMemo(
    () => topicRows.filter((t) => t.attempted >= 2 && t.accuracy < 50).slice(0, 5),
    [topicRows],
  );

  // Time analysis
  const qById = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const timeBySection = useMemo(() => {
    const m: Record<string, { name: string; time: number; count: number; correct_time: number; wrong_time: number; correct_n: number; wrong_n: number }> = {};
    for (const sec of sections) m[sec.id] = { name: sec.code || sec.name, time: 0, count: 0, correct_time: 0, wrong_time: 0, correct_n: 0, wrong_n: 0 };
    for (const r of responses) {
      const t = Number(r.time_spent_seconds ?? 0);
      const sid = r.section_id;
      if (!m[sid]) continue;
      m[sid].time += t;
      m[sid].count += 1;
      if (r.is_correct === true) { m[sid].correct_time += t; m[sid].correct_n += 1; }
      if (r.is_correct === false) { m[sid].wrong_time += t; m[sid].wrong_n += 1; }
    }
    return Object.values(m).map((s) => ({
      ...s,
      avg: s.count ? Math.round(s.time / s.count) : 0,
      avg_correct: s.correct_n ? Math.round(s.correct_time / s.correct_n) : 0,
      avg_wrong: s.wrong_n ? Math.round(s.wrong_time / s.wrong_n) : 0,
    }));
  }, [responses, sections]);

  const perQuestionTime = useMemo(() => {
    return responses
      .map((r, i) => ({
        idx: i + 1,
        time: Number(r.time_spent_seconds ?? 0),
        correct: r.is_correct === true ? 1 : 0,
        wrong: r.is_correct === false ? 1 : 0,
      }))
      .filter((r) => r.time > 0);
  }, [responses]);

  const totalTimeSec = useMemo(
    () => responses.reduce((a, r) => a + Number(r.time_spent_seconds ?? 0), 0),
    [responses],
  );

  // Peer comparison
  const peerStats = useMemo(() => {
    if (!peerScores.length) return null;
    const sorted = [...peerScores].sort((a, b) => b - a);
    const top10Cut = sorted[Math.max(0, Math.floor(sorted.length * 0.1) - 1)] ?? sorted[0];
    const top1Cut = sorted[Math.max(0, Math.floor(sorted.length * 0.01) - 1)] ?? sorted[0];
    const avg = peerScores.reduce((a, b) => a + b, 0) / peerScores.length;
    const max = sorted[0];
    return { top10Cut, top1Cut, avg: Math.round(avg * 100) / 100, max, count: peerScores.length };
  }, [peerScores]);

  const percentileBands = useMemo(() => {
    if (!peerScores.length) return [];
    const bands = [
      { name: "0-25", min: 0, max: 25 }, { name: "25-50", min: 25, max: 50 },
      { name: "50-75", min: 50, max: 75 }, { name: "75-90", min: 75, max: 90 },
      { name: "90-95", min: 90, max: 95 }, { name: "95-99", min: 95, max: 99 },
      { name: "99+", min: 99, max: 101 },
    ];
    const myPct = Number(attempt?.percentile ?? 0);
    const sorted = [...peerScores].sort((a, b) => a - b);
    return bands.map((b) => {
      const cnt = sorted.filter((s) => {
        const p = (sorted.filter((x) => x < s).length / sorted.length) * 100;
        return p >= b.min && p < b.max;
      }).length;
      return { ...b, count: cnt, isMe: myPct >= b.min && myPct < b.max };
    });
  }, [peerScores, attempt?.percentile]);

  // Difficulty breakdown
  const difficultyRows = useMemo(() => {
    const m: Record<string, { attempted: number; correct: number }> = {};
    for (const r of responses) {
      const q = qById.get(r.question_id);
      if (!q || (r.status !== "answered" && r.status !== "answered_marked")) continue;
      const d = q.difficulty || "unknown";
      if (!m[d]) m[d] = { attempted: 0, correct: 0 };
      m[d].attempted += 1;
      if (r.is_correct) m[d].correct += 1;
    }
    return ["easy", "moderate", "hard", "unknown"]
      .filter((k) => m[k])
      .map((k) => ({
        difficulty: k.charAt(0).toUpperCase() + k.slice(1),
        attempted: m[k].attempted,
        correct: m[k].correct,
        accuracy: m[k].attempted ? Math.round((m[k].correct / m[k].attempted) * 100) : 0,
      }));
  }, [responses, qById]);

  // ============ AI Insights ============
  async function generateInsights() {
    if (!attemptId) return;
    setInsightsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-mock-insights", {
        body: { attempt_id: attemptId },
      });
      if (error) throw error;
      setInsights(data?.insights ?? null);
    } catch (e: any) {
      toast.error("Could not generate AI insights", { description: e?.message });
    } finally {
      setInsightsLoading(false);
    }
  }

  useEffect(() => {
    if (attempt && !insights && !insightsLoading) {
      generateInsights();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  // ============ PDF Export ============
  async function downloadPDF() {
    if (!reportRef.current) return;
    setDownloading(true);
    try {
      const [{ default: jsPDF }, html2canvasMod] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const html2canvas = (html2canvasMod as any).default ?? html2canvasMod;
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: reportRef.current.scrollWidth,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
        heightLeft -= pageH;
      }
      pdf.save(`${test?.name?.replace(/[^a-z0-9]/gi, "_") || "mock"}_report.pdf`);
      toast.success("Report downloaded");
    } catch (e: any) {
      toast.error("PDF export failed", { description: e?.message });
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-4">
        <Skeleton className="h-12 w-1/2" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (!attempt) return <div className="p-8">Not found</div>;

  const pct = Number(attempt.percentile ?? 0);
  const accuracy = Number(attempt.accuracy ?? 0);
  const score = Number(attempt.total_score ?? 0);
  const maxScore = Number(attempt.max_score ?? 0);
  const scorePct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  return (
    <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50/30 min-h-screen">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* Top action bar (excluded from PDF) */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <Link to="/mocks" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <ChevronRight className="h-4 w-4 rotate-180" /> All mocks
          </Link>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={downloadPDF} disabled={downloading} className="gap-2">
              <Download className="h-4 w-4" />
              {downloading ? "Preparing PDF…" : "Download Full Report"}
            </Button>
            <Button variant="outline" onClick={() => navigate(`/mocks/review/${attempt.id}`)}>
              Question Review
            </Button>
            {test?.slug && (
              <Button variant="outline" onClick={() => navigate(`/mocks/leaderboard/${test.slug}`)}>
                Leaderboard
              </Button>
            )}
            <Button onClick={() => navigate(`/student/analysis/${attempt.id}`)} className="bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:opacity-90 gap-1">
              <Sparkles className="h-4 w-4" /> AI Deep Analysis
            </Button>
          </div>
        </div>

        {/* === Report content (captured for PDF) === */}
        <div ref={reportRef} className="space-y-6 bg-white p-6 rounded-xl">
          {/* Hero */}
          <Card className="p-8 bg-gradient-to-br from-primary/5 via-blue-50/50 to-purple-50/30 border-primary/20 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="relative">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <Badge variant="secondary" className="mb-2">
                    {test?.category?.replace("_", " ").toUpperCase() || "MOCK TEST"}
                  </Badge>
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{test?.name}</h1>
                  <p className="text-muted-foreground mt-1">
                    Detailed Performance Report · {new Date(attempt.submitted_at ?? attempt.created_at).toLocaleString()}
                  </p>
                  {attempt.auto_submitted_reason && (
                    <Badge variant="destructive" className="mt-3">
                      Auto-submitted: {attempt.auto_submitted_reason}
                    </Badge>
                  )}
                </div>
                <PercentileGauge percentile={pct} />
              </div>
            </div>
          </Card>

          {/* Headline KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPI icon={<Trophy className="h-4 w-4" />} label="Total Score" value={`${score}`} sub={`/ ${maxScore} (${scorePct}%)`} accent="amber" />
            <KPI icon={<Target className="h-4 w-4" />} label="Percentile" value={`${pct}`} sub={peerStats ? `vs ${peerStats.count} peers` : "—"} accent="blue" />
            <KPI icon={<Activity className="h-4 w-4" />} label="Accuracy" value={`${accuracy}%`} sub={`${attempt.total_correct}/${attempt.total_attempted} correct`} accent="green" />
            <KPI icon={<Clock className="h-4 w-4" />} label="Time Used" value={fmtMin(totalTimeSec)} sub={`avg ${perQuestionTime.length ? Math.round(totalTimeSec / perQuestionTime.length) : 0}s/Q`} accent="purple" />
          </div>

          {/* AI Summary */}
          <Card className="p-6 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <h2 className="font-semibold text-lg">AI Performance Summary</h2>
              {insightsLoading && <Badge variant="secondary" className="animate-pulse">Generating…</Badge>}
            </div>
            {insights?.summary ? (
              <p className="text-sm leading-relaxed text-foreground/80">{insights.summary}</p>
            ) : insightsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No AI summary yet.</p>
            )}
          </Card>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="topics">Topics</TabsTrigger>
              <TabsTrigger value="time">Time Analysis</TabsTrigger>
              <TabsTrigger value="peers">Peer Compare</TabsTrigger>
              <TabsTrigger value="plan">Study Plan</TabsTrigger>
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" /> Sectional Performance
                  </h3>
                  <div className="space-y-4">
                    {sectionRows.map((s) => (
                      <div key={s.id}>
                        <div className="flex items-center justify-between text-sm mb-1.5">
                          <span className="font-medium">{s.name} <span className="text-xs text-muted-foreground">({s.code})</span></span>
                          <span className="font-semibold">{s.score} / {s.max}</span>
                        </div>
                        <Progress value={s.pct} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>Accuracy {s.accuracy}%</span>
                          <span>{s.correct}✓ · {s.incorrect}✗ · {s.attempted} attempted</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" /> Sectional Radar
                  </h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <RadarChart data={sectionRows.map((s) => ({ section: s.code, accuracy: s.accuracy, score: s.pct }))}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="section" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Radar name="Accuracy %" dataKey="accuracy" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                      <Radar name="Score %" dataKey="score" stroke="hsl(217 91% 60%)" fill="hsl(217 91% 60%)" fillOpacity={0.2} />
                      <Legend />
                    </RadarChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              {difficultyRows.length > 0 && (
                <Card className="p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-500" /> Performance by Difficulty
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {difficultyRows.map((d) => (
                      <div key={d.difficulty} className="border rounded-lg p-4">
                        <div className="text-xs uppercase text-muted-foreground tracking-wide">{d.difficulty}</div>
                        <div className="text-2xl font-bold mt-1">{d.accuracy}%</div>
                        <div className="text-xs text-muted-foreground mt-1">{d.correct}/{d.attempted} correct</div>
                        <Progress value={d.accuracy} className="h-1.5 mt-2" />
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* TOPICS */}
            <TabsContent value="topics" className="space-y-6 mt-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-5 border-green-200 bg-green-50/30">
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-green-700">
                    <TrendingUp className="h-4 w-4" /> Strong Areas
                  </h3>
                  {strongTopics.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Attempt more questions per topic to surface strengths.</p>
                  ) : (
                    <div className="space-y-2">
                      {strongTopics.map((t) => (
                        <div key={t.topic} className="flex items-center justify-between text-sm bg-white rounded-md p-2.5 border border-green-100">
                          <span className="font-medium">{t.topic}</span>
                          <Badge className="bg-green-600 hover:bg-green-600">{t.accuracy}%</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
                <Card className="p-5 border-red-200 bg-red-50/30">
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-red-700">
                    <TrendingDown className="h-4 w-4" /> Weak Areas
                  </h3>
                  {weakTopics.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No clear weak topics — well rounded!</p>
                  ) : (
                    <div className="space-y-2">
                      {weakTopics.map((t) => (
                        <div key={t.topic} className="flex items-center justify-between text-sm bg-white rounded-md p-2.5 border border-red-100">
                          <span className="font-medium">{t.topic}</span>
                          <Badge variant="destructive">{t.accuracy}%</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* Heatmap */}
              <Card className="p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary" /> Topic Mastery Heatmap
                </h3>
                {topicRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No topic-tagged questions in this attempt.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {topicRows.map((t) => (
                        <div
                          key={t.topic}
                          className="rounded-md p-3 border text-xs"
                          style={{ backgroundColor: heatColor(t.accuracy), borderColor: heatBorder(t.accuracy) }}
                        >
                          <div className="font-semibold text-foreground line-clamp-1" title={t.topic}>{t.topic}</div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-foreground/70">{t.correct}/{t.attempted}</span>
                            <span className="font-bold text-foreground">{t.accuracy}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
                      <span>Low</span>
                      <div className="flex gap-0.5">
                        {[10, 30, 50, 70, 90].map((v) => (
                          <div key={v} className="h-3 w-6 rounded-sm" style={{ backgroundColor: heatColor(v) }} />
                        ))}
                      </div>
                      <span>High Mastery</span>
                    </div>
                  </>
                )}
              </Card>

              {/* AI Recommendations */}
              {insights?.recommendations?.length > 0 && (
                <Card className="p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" /> AI Recommendations
                  </h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {insights.recommendations.map((r: any, i: number) => (
                      <div key={i} className="border rounded-lg p-4 bg-gradient-to-br from-amber-50/40 to-transparent">
                        <div className="font-semibold text-sm flex items-center gap-2">
                          <span className="h-5 w-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center">{i + 1}</span>
                          {r.title}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">{r.action}</p>
                        <div className="flex gap-2 mt-3 text-xs">
                          {r.time_commitment && <Badge variant="outline">⏱ {r.time_commitment}</Badge>}
                          {r.expected_impact && <Badge variant="secondary">📈 {r.expected_impact}</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {insights?.weaknesses?.length > 0 && (
                <Card className="p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" /> Priority Improvement Areas
                  </h3>
                  <div className="space-y-3">
                    {insights.weaknesses.map((w: any, i: number) => (
                      <div key={i} className="border-l-4 pl-4 py-2"
                        style={{ borderColor: w.priority === "high" ? "#ef4444" : w.priority === "medium" ? "#f59e0b" : "#94a3b8" }}>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{w.area}</span>
                          {w.priority && <Badge variant={w.priority === "high" ? "destructive" : "secondary"}>{w.priority} priority</Badge>}
                        </div>
                        {w.evidence && <p className="text-xs text-muted-foreground mt-1">{w.evidence}</p>}
                        {w.suggestion && <p className="text-sm mt-1.5">💡 {w.suggestion}</p>}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </TabsContent>

            {/* TIME ANALYSIS */}
            <TabsContent value="time" className="space-y-6 mt-6">
              <Card className="p-5">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" /> Time Spent per Section
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={timeBySection}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} label={{ value: "seconds", angle: -90, position: "insideLeft", fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avg_correct" name="Avg time (correct)" fill="hsl(142 76% 45%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="avg_wrong" name="Avg time (incorrect)" fill="hsl(0 84% 60%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="avg" name="Overall avg" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {perQuestionTime.length > 0 && (
                <Card className="p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" /> Per-Question Time Distribution
                  </h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={perQuestionTime}>
                      <defs>
                        <linearGradient id="timeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="idx" tick={{ fontSize: 11 }} label={{ value: "Question #", position: "insideBottom", offset: -5, fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} label={{ value: "seconds", angle: -90, position: "insideLeft", fontSize: 11 }} />
                      <Tooltip />
                      <Area type="monotone" dataKey="time" stroke="hsl(var(--primary))" fill="url(#timeGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              )}

              <div className="grid md:grid-cols-3 gap-3">
                <KPI icon={<Clock className="h-4 w-4" />} label="Avg time per question" value={`${perQuestionTime.length ? Math.round(totalTimeSec / perQuestionTime.length) : 0}s`} sub="" accent="blue" />
                <KPI icon={<CheckCircle2 className="h-4 w-4" />} label="Avg time on correct" value={fmtAvg(timeBySection, "avg_correct")} sub="" accent="green" />
                <KPI icon={<XCircle className="h-4 w-4" />} label="Avg time on incorrect" value={fmtAvg(timeBySection, "avg_wrong")} sub="" accent="red" />
              </div>
            </TabsContent>

            {/* PEERS */}
            <TabsContent value="peers" className="space-y-6 mt-6">
              {!peerStats ? (
                <Card className="p-8 text-center text-muted-foreground">
                  No peer data yet — be among the first to set the benchmark!
                </Card>
              ) : (
                <>
                  <div className="grid md:grid-cols-4 gap-3">
                    <KPI icon={<Users className="h-4 w-4" />} label="Total Test-Takers" value={peerStats.count.toString()} sub="completed attempts" accent="blue" />
                    <KPI icon={<Trophy className="h-4 w-4" />} label="Topper Score" value={peerStats.max.toString()} sub="highest so far" accent="amber" />
                    <KPI icon={<Award className="h-4 w-4" />} label="Top 1% Cutoff" value={peerStats.top1Cut.toString()} sub="join the elite" accent="purple" />
                    <KPI icon={<Target className="h-4 w-4" />} label="Average Score" value={peerStats.avg.toString()} sub="across all attempts" accent="green" />
                  </div>

                  <Card className="p-5">
                    <h3 className="font-semibold mb-4">Where You Stand</h3>
                    <div className="space-y-3">
                      <ComparisonBar label="You" value={score} max={Math.max(peerStats.max, score)} color="hsl(var(--primary))" highlight />
                      <ComparisonBar label="Top 1%" value={peerStats.top1Cut} max={Math.max(peerStats.max, score)} color="hsl(280 70% 55%)" />
                      <ComparisonBar label="Top 10%" value={peerStats.top10Cut} max={Math.max(peerStats.max, score)} color="hsl(217 91% 60%)" />
                      <ComparisonBar label="Average" value={peerStats.avg} max={Math.max(peerStats.max, score)} color="hsl(142 70% 45%)" />
                      <ComparisonBar label="Topper" value={peerStats.max} max={Math.max(peerStats.max, score)} color="hsl(45 95% 55%)" />
                    </div>
                  </Card>

                  <Card className="p-5">
                    <h3 className="font-semibold mb-4">Percentile Distribution</h3>
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={percentileBands}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} label={{ value: "Percentile band", position: "insideBottom", offset: -5, fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} label={{ value: "students", angle: -90, position: "insideLeft", fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                          {percentileBands.map((b, i) => (
                            <Cell key={i} fill={b.isMe ? "hsl(var(--primary))" : "hsl(217 91% 80%)"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      You are in the <strong className="text-primary">{percentileBands.find((b) => b.isMe)?.name ?? "—"}</strong> percentile band.
                    </p>
                  </Card>
                </>
              )}
            </TabsContent>

            {/* STUDY PLAN */}
            <TabsContent value="plan" className="space-y-6 mt-6">
              {insights?.study_plan?.length ? (
                <Card className="p-5">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" /> Your 7-Day Personalized Study Plan
                  </h3>
                  <div className="space-y-3">
                    {insights.study_plan.map((d: any, i: number) => (
                      <div key={i} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary font-bold flex items-center justify-center">
                              D{d.day || i + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-sm">{d.focus}</div>
                              {d.hours && <div className="text-xs text-muted-foreground">⏱ {d.hours} hours</div>}
                            </div>
                          </div>
                        </div>
                        {d.tasks?.length > 0 && (
                          <ul className="mt-3 space-y-1 ml-13 text-sm text-foreground/80">
                            {d.tasks.map((t: string, j: number) => (
                              <li key={j} className="flex items-start gap-2">
                                <ChevronRight className="h-3 w-3 mt-1 text-primary shrink-0" />
                                <span>{t}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              ) : (
                <Card className="p-8 text-center">
                  {insightsLoading ? (
                    <div className="space-y-2">
                      <Sparkles className="h-8 w-8 mx-auto text-primary animate-pulse" />
                      <p className="text-sm text-muted-foreground">Building your personalized study plan…</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground mb-3">No study plan generated yet.</p>
                      <Button onClick={generateInsights} variant="outline">
                        <Sparkles className="h-4 w-4 mr-2" /> Generate AI Study Plan
                      </Button>
                    </div>
                  )}
                </Card>
              )}

              {insights?.strengths?.length > 0 && (
                <Card className="p-5">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" /> Capitalize on Your Strengths
                  </h3>
                  <div className="space-y-2">
                    {insights.strengths.map((s: any, i: number) => (
                      <div key={i} className="text-sm border-l-4 border-green-500 pl-4 py-2">
                        <div className="font-semibold">{s.area}</div>
                        {s.suggestion && <div className="text-muted-foreground mt-0.5">{s.suggestion}</div>}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            Report generated by MBA Compass · {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============== Helpers ==============
function fmtMin(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}
function fmtAvg(rows: any[], key: string) {
  const vals = rows.map((r) => r[key]).filter((v) => v > 0);
  if (!vals.length) return "—";
  return `${Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)}s`;
}
function heatColor(pct: number) {
  if (pct >= 80) return "hsl(142 70% 88%)";
  if (pct >= 65) return "hsl(95 70% 88%)";
  if (pct >= 50) return "hsl(50 95% 88%)";
  if (pct >= 35) return "hsl(30 95% 88%)";
  return "hsl(0 75% 90%)";
}
function heatBorder(pct: number) {
  if (pct >= 80) return "hsl(142 70% 60%)";
  if (pct >= 65) return "hsl(95 70% 55%)";
  if (pct >= 50) return "hsl(50 90% 55%)";
  if (pct >= 35) return "hsl(30 90% 55%)";
  return "hsl(0 75% 65%)";
}

function KPI({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string; sub: string; accent: "amber" | "blue" | "green" | "purple" | "red" }) {
  const colors: Record<string, string> = {
    amber: "from-amber-50 to-amber-100/30 text-amber-700 border-amber-200",
    blue: "from-blue-50 to-blue-100/30 text-blue-700 border-blue-200",
    green: "from-green-50 to-green-100/30 text-green-700 border-green-200",
    purple: "from-purple-50 to-purple-100/30 text-purple-700 border-purple-200",
    red: "from-red-50 to-red-100/30 text-red-700 border-red-200",
  };
  return (
    <Card className={`p-4 bg-gradient-to-br ${colors[accent]} border`}>
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide opacity-80">
        {icon}{label}
      </div>
      <div className="text-2xl font-bold mt-1.5 text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </Card>
  );
}

function PercentileGauge({ percentile }: { percentile: number }) {
  const r = 50;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, percentile) / 100) * c;
  return (
    <div className="relative w-32 h-32">
      <svg width="128" height="128" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none"
          stroke="url(#gaugeGrad)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(217 91% 60%)" />
            <stop offset="100%" stopColor="hsl(280 70% 55%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-3xl font-bold leading-none">{percentile}</div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">percentile</div>
      </div>
    </div>
  );
}

function ComparisonBar({ label, value, max, color, highlight }: { label: string; value: number; max: number; color: string; highlight?: boolean }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className={highlight ? "font-bold text-primary" : "font-medium"}>{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: highlight ? `0 0 12px ${color}` : undefined }}
        />
      </div>
    </div>
  );
}
