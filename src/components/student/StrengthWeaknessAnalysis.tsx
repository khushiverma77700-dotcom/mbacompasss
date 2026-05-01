import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import {
  TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle2, Award,
  Activity, BookOpenCheck, ListChecks,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
type Resp = {
  id: string;
  attempt_id: string;
  question_id: string;
  section_id: string;
  status: string;
  is_correct: boolean | null;
  marks_awarded: number | null;
  time_spent_seconds: number | null;
};
type Question = {
  id: string;
  section_id: string;
  topic: string | null;
  subtopic: string | null;
  difficulty: string | null;
  positive_marks: number | null;
};
type Section = { id: string; name: string; test_id: string };

type SubAgg = {
  key: string;
  section: string;
  topic: string;
  subtopic: string;
  attempted: number;
  correct: number;
  incorrect: number;
  total: number;
  timeSec: number;
  marks: number;
  maxMarks: number;
  accuracy: number;
  attemptRate: number;
  readiness: number;
  trend: number[]; // accuracy per attempt date
};

type TopicAgg = {
  key: string;
  section: string;
  topic: string;
  attempted: number;
  correct: number;
  incorrect: number;
  total: number;
  accuracy: number;
  attemptRate: number;
  readiness: number;
  subs: SubAgg[];
};

type SectionAgg = {
  name: string;
  attempted: number;
  correct: number;
  incorrect: number;
  total: number;
  accuracy: number;
  readiness: number;
  topics: TopicAgg[];
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

/**
 * Readiness score (0-100) blends:
 *  - accuracy (60%)
 *  - attempt confidence (20%) — penalises low attempt counts
 *  - attempt rate vs total questions seen (20%)
 */
function readinessScore(attempted: number, correct: number, total: number) {
  if (attempted === 0) return 0;
  const accuracy = (correct / attempted) * 100;
  const attemptConf = Math.min(1, attempted / 10) * 100;
  const coverage = total > 0 ? (attempted / total) * 100 : attemptConf;
  return Math.round(accuracy * 0.6 + attemptConf * 0.2 + coverage * 0.2);
}

const COLORS = {
  weak: "#dc2626",
  ok: "#f59e0b",
  strong: "#0284c7",
  green: "#16a34a",
  muted: "#94a3b8",
};

// ─── Hook (shared by Overview, Weak page, Strength page) ───────────────────────
export type ExamAgg = {
  exam: string;
  attempts: number;
  attempted: number;
  correct: number;
  total: number;
  accuracy: number;
  readiness: number;
  avgScore: number;
  bestScore: number;
};

export function useStrengthWeaknessData() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<SectionAgg[]>([]);
  const [examAggs, setExamAggs] = useState<ExamAgg[]>([]);
  const [hasData, setHasData] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const refresh = () => setRefreshTick((t) => t + 1);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);

      // 1. Get all submitted attempts for this user (with exam_code & score)
      const { data: attempts } = await supabase
        .from("mock_attempts")
        .select("id, submitted_at, status, total_score, max_score, accuracy, test:mock_tests(exam_code, name)")
        .eq("user_id", user.id)
        .in("status", ["submitted", "auto_submitted"]);

      const attemptIds = (attempts ?? []).map((a) => a.id);
      if (attemptIds.length === 0) {
        if (!cancelled) { setSections([]); setExamAggs([]); setHasData(false); setLoading(false); }
        return;
      }

      // Exam-wise aggregation from attempts (works even with no responses)
      const examMap = new Map<string, { attempts: number; scoreSum: number; bestScore: number; accSum: number; accN: number }>();
      (attempts ?? []).forEach((a: any) => {
        const code = (a.test?.exam_code || "GENERAL").toUpperCase();
        if (!examMap.has(code)) examMap.set(code, { attempts: 0, scoreSum: 0, bestScore: 0, accSum: 0, accN: 0 });
        const e = examMap.get(code)!;
        e.attempts += 1;
        e.scoreSum += Number(a.total_score || 0);
        e.bestScore = Math.max(e.bestScore, Number(a.total_score || 0));
        if (a.accuracy != null) { e.accSum += Number(a.accuracy); e.accN += 1; }
      });

      // 2. Pull all responses for those attempts
      const { data: responses } = await supabase
        .from("mock_responses")
        .select("id, attempt_id, question_id, section_id, status, is_correct, marks_awarded, time_spent_seconds")
        .in("attempt_id", attemptIds);

      const qIds = Array.from(new Set((responses ?? []).map((r) => r.question_id)));
      const secIds = Array.from(new Set((responses ?? []).map((r) => r.section_id)));

      // 3. Fetch questions + sections in batches (chunked for very large datasets)
      const chunk = <T,>(arr: T[], size: number) => {
        const out: T[][] = [];
        for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
        return out;
      };

      const qChunks = chunk(qIds, 500);
      const questionsAll: Question[] = [];
      for (const ck of qChunks) {
        const { data } = await supabase
          .from("mock_questions")
          .select("id, section_id, topic, subtopic, difficulty, positive_marks")
          .in("id", ck);
        if (data) questionsAll.push(...(data as Question[]));
      }

      const { data: sectionRows } = await supabase
        .from("mock_sections")
        .select("id, name, test_id")
        .in("id", secIds);

      if (cancelled) return;

      // 4. Aggregate
      const qMap = new Map<string, Question>();
      questionsAll.forEach((q) => qMap.set(q.id, q));
      const sMap = new Map<string, Section>();
      (sectionRows ?? []).forEach((s) => sMap.set(s.id, s as Section));
      const attemptDate = new Map<string, string>();
      (attempts ?? []).forEach((a: any) => attemptDate.set(a.id, a.submitted_at));

      type Bucket = {
        attempted: number; correct: number; incorrect: number; total: Set<string>;
        time: number; marks: number; maxMarks: number;
        byDate: Map<string, { att: number; cor: number }>;
      };
      const mk = (): Bucket => ({
        attempted: 0, correct: 0, incorrect: 0, total: new Set(),
        time: 0, marks: 0, maxMarks: 0, byDate: new Map(),
      });

      // section -> topic -> subtopic
      const tree = new Map<string, Map<string, Map<string, Bucket>>>();

      for (const r of (responses ?? []) as Resp[]) {
        const q = qMap.get(r.question_id);
        if (!q) continue;
        const sec = sMap.get(r.section_id)?.name || sMap.get(q.section_id)?.name || "Other";
        const topic = (q.topic && q.topic.trim()) || "General";
        const sub = (q.subtopic && q.subtopic.trim()) || topic;

        if (!tree.has(sec)) tree.set(sec, new Map());
        const tMap = tree.get(sec)!;
        if (!tMap.has(topic)) tMap.set(topic, new Map());
        const stMap = tMap.get(topic)!;
        if (!stMap.has(sub)) stMap.set(sub, mk());
        const b = stMap.get(sub)!;

        b.total.add(q.id);
        b.maxMarks += Number(q.positive_marks || 0);
        b.time += Number(r.time_spent_seconds || 0);

        const attempted = r.status === "answered" || r.status === "marked_answered";
        if (attempted) {
          b.attempted += 1;
          b.marks += Number(r.marks_awarded || 0);
          if (r.is_correct) b.correct += 1;
          else b.incorrect += 1;

          const d = (attemptDate.get(r.attempt_id) || "").slice(0, 10) || "—";
          if (!b.byDate.has(d)) b.byDate.set(d, { att: 0, cor: 0 });
          const dd = b.byDate.get(d)!;
          dd.att += 1;
          if (r.is_correct) dd.cor += 1;
        }
      }

      // 5. Flatten
      const sectionAggs: SectionAgg[] = [];
      tree.forEach((tMap, secName) => {
        const topicAggs: TopicAgg[] = [];
        let secAtt = 0, secCor = 0, secInc = 0, secTot = 0;
        tMap.forEach((stMap, topic) => {
          const subs: SubAgg[] = [];
          let tAtt = 0, tCor = 0, tInc = 0, tTot = 0;
          stMap.forEach((b, sub) => {
            const trend = Array.from(b.byDate.entries())
              .sort(([a], [c]) => a.localeCompare(c))
              .map(([, v]) => (v.att > 0 ? Math.round((v.cor / v.att) * 100) : 0));
            subs.push({
              key: `${secName}|${topic}|${sub}`,
              section: secName,
              topic,
              subtopic: sub,
              attempted: b.attempted,
              correct: b.correct,
              incorrect: b.incorrect,
              total: b.total.size,
              timeSec: b.time,
              marks: Math.round(b.marks * 10) / 10,
              maxMarks: Math.round(b.maxMarks * 10) / 10,
              accuracy: pct(b.correct, b.attempted),
              attemptRate: pct(b.attempted, b.total.size),
              readiness: readinessScore(b.attempted, b.correct, b.total.size),
              trend,
            });
            tAtt += b.attempted; tCor += b.correct; tInc += b.incorrect; tTot += b.total.size;
          });
          subs.sort((a, b) => a.readiness - b.readiness);
          topicAggs.push({
            key: `${secName}|${topic}`,
            section: secName,
            topic,
            attempted: tAtt, correct: tCor, incorrect: tInc, total: tTot,
            accuracy: pct(tCor, tAtt),
            attemptRate: pct(tAtt, tTot),
            readiness: readinessScore(tAtt, tCor, tTot),
            subs,
          });
          secAtt += tAtt; secCor += tCor; secInc += tInc; secTot += tTot;
        });
        topicAggs.sort((a, b) => a.readiness - b.readiness);
        sectionAggs.push({
          name: secName,
          attempted: secAtt, correct: secCor, incorrect: secInc, total: secTot,
          accuracy: pct(secCor, secAtt),
          readiness: readinessScore(secAtt, secCor, secTot),
          topics: topicAggs,
        });
      });

      sectionAggs.sort((a, b) => b.attempted - a.attempted);
      setSections(sectionAggs);
      setHasData(sectionAggs.some((s) => s.attempted > 0));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user, refreshTick]);

  // ─── Derived: weak + strong topic lists ──────────────────────────────────────
  const allTopics = useMemo(
    () => sections.flatMap((s) => s.topics).filter((t) => t.attempted >= 3),
    [sections]
  );
  const weakTopics = useMemo(
    () => [...allTopics].filter((t) => t.readiness < 65).sort((a, b) => a.readiness - b.readiness),
    [allTopics]
  );
  const strongTopics = useMemo(
    () => [...allTopics].filter((t) => t.readiness >= 65).sort((a, b) => b.readiness - a.readiness),
    [allTopics]
  );

  const overallReadiness = useMemo(() => {
    const att = sections.reduce((s, x) => s + x.attempted, 0);
    const cor = sections.reduce((s, x) => s + x.correct, 0);
    const tot = sections.reduce((s, x) => s + x.total, 0);
    return readinessScore(att, cor, tot);
  }, [sections]);

  return { loading, hasData, sections, allTopics, weakTopics, strongTopics, overallReadiness, refresh };
}

// ─── Default component (kept for backwards compatibility — Overview etc.) ─────
export default function StrengthWeaknessAnalysis() {
  const { loading, hasData, sections, weakTopics, strongTopics, overallReadiness } = useStrengthWeaknessData();

  if (loading) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">Analysing your performance…</div>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card className="p-6 border-sky-100 bg-sky-50/40">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg bg-white border">
            <Activity className="h-5 w-5 text-sky-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">Weak & Strength Analysis</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Attempt at least one mock to unlock a detailed section, topic and sub-topic level analysis.
            </p>
            <Link to="/student/mocks"><Button size="sm" className="mt-3">Take a mock</Button></Link>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <BookOpenCheck className="h-4 w-4 text-sky-600" />
              Weak & Strength Analysis
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Auto-generated from every mock you have submitted. Readiness blends accuracy, attempts and coverage.
            </p>
          </div>
          <div className="flex items-center gap-6">
            <ReadinessBadge label="Overall Readiness" value={overallReadiness} />
            <ReadinessBadge label="Strong Topics" value={strongTopics.length} suffix="" tone="strong" />
            <ReadinessBadge label="Weak Topics" value={weakTopics.length} suffix="" tone="weak" />
          </div>
        </div>

        <div className="mt-5 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sections.map((s) => ({
              name: s.name, accuracy: s.accuracy, readiness: s.readiness,
            }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="accuracy" fill="#0284c7" name="Accuracy %" radius={[4, 4, 0, 0]} />
              <Bar dataKey="readiness" fill="#7dd3fc" name="Readiness %" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Tabs defaultValue="weak" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="weak" className="gap-2"><AlertTriangle className="h-3.5 w-3.5" /> Weak</TabsTrigger>
          <TabsTrigger value="strong" className="gap-2"><Award className="h-3.5 w-3.5" /> Strength</TabsTrigger>
          <TabsTrigger value="all" className="gap-2"><ListChecks className="h-3.5 w-3.5" /> Full Report</TabsTrigger>
        </TabsList>

        <TabsContent value="weak" className="mt-4">
          <TopicAnalysisPanel heading="My Weak Areas" description="Lowest-readiness topics across all your mocks. Fix these first for biggest score gains." topics={weakTopics} tone="weak" />
        </TabsContent>
        <TabsContent value="strong" className="mt-4">
          <TopicAnalysisPanel heading="My Strength Areas" description="Topics where you are consistent and accurate." topics={strongTopics} tone="strong" />
        </TabsContent>
        <TabsContent value="all" className="mt-4">
          <FullReportTable sections={sections} />
        </TabsContent>
      </Tabs>
    </div>
  );
}


// ─── Sub-components ───────────────────────────────────────────────────────────

export function ReadinessBadge({ label, value, suffix = "%", tone }: { label: string; value: number; suffix?: string; tone?: "weak" | "strong" }) {
  const color = tone === "weak" ? "text-red-600" : tone === "strong" ? "text-sky-700" : "text-slate-900";
  return (
    <div className="text-right">
      <div className={`text-2xl font-semibold ${color}`}>{value}{suffix}</div>
      <div className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</div>
    </div>
  );
}

export function TopicAnalysisPanel({ heading, description, topics, tone }: {
  heading: string; description: string; topics: TopicAgg[]; tone: "weak" | "strong";
}) {
  if (topics.length === 0) {
    return (
      <Card className="p-6">
        <div className="text-sm text-muted-foreground">
          Not enough data yet. Attempt more questions in this category to surface results here.
        </div>
      </Card>
    );
  }

  // Pie of accuracy distribution across topics
  const distribution = useMemo(() => {
    let strong = 0, ok = 0, weak = 0;
    topics.forEach((t) => {
      if (t.accuracy >= 70) strong += 1;
      else if (t.accuracy >= 50) ok += 1;
      else weak += 1;
    });
    return [
      { name: "Strong (≥70%)", value: strong, color: COLORS.strong },
      { name: "Average (50–69%)", value: ok, color: COLORS.ok },
      { name: "Weak (<50%)", value: weak, color: COLORS.weak },
    ].filter((x) => x.value > 0);
  }, [topics]);

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">{heading}</h3>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <Badge variant="outline" className="border-slate-200">{topics.length} topics</Badge>
        </div>

        <div className="grid lg:grid-cols-3 gap-5 mt-5">
          {/* Bar chart of accuracy per topic */}
          <div className="lg:col-span-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topics.slice(0, 10).map((t) => ({
                  name: t.topic.length > 14 ? t.topic.slice(0, 14) + "…" : t.topic,
                  accuracy: t.accuracy,
                  readiness: t.readiness,
                }))}
                layout="vertical"
                margin={{ left: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip />
                <Bar dataKey="accuracy" fill={tone === "weak" ? COLORS.weak : COLORS.strong} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie of distribution */}
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                  {distribution.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* Drill-down accordion */}
      <Card className="p-5">
        <h4 className="text-sm font-semibold mb-3">Topic & sub-topic breakdown</h4>
        <Accordion type="multiple" className="w-full">
          {topics.slice(0, 20).map((t) => (
            <AccordionItem value={t.key} key={t.key}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex flex-1 items-center justify-between pr-3 gap-3">
                  <div className="text-left">
                    <div className="text-sm font-medium text-slate-900">{t.topic}</div>
                    <div className="text-[11px] text-muted-foreground">{t.section} · {t.attempted} attempts · {t.correct} correct · {t.incorrect} wrong</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${t.accuracy < 50 ? "text-red-600" : t.accuracy < 70 ? "text-amber-600" : "text-sky-700"}`}>
                        {t.accuracy}%
                      </div>
                      <div className="text-[10px] text-muted-foreground">accuracy</div>
                    </div>
                    <div className="w-28 hidden sm:block">
                      <Progress value={t.readiness} className="h-1.5" />
                      <div className="text-[10px] text-muted-foreground mt-0.5 text-right">readiness {t.readiness}%</div>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sub-topic</TableHead>
                        <TableHead className="text-right">Attempts</TableHead>
                        <TableHead className="text-right">Correct</TableHead>
                        <TableHead className="text-right">Wrong</TableHead>
                        <TableHead className="text-right">Accuracy</TableHead>
                        <TableHead className="text-right">Readiness</TableHead>
                        <TableHead className="text-right">Avg Time</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {t.subs.map((s) => (
                        <TableRow key={s.key}>
                          <TableCell className="font-medium">{s.subtopic}</TableCell>
                          <TableCell className="text-right">{s.attempted}/{s.total}</TableCell>
                          <TableCell className="text-right text-sky-700">{s.correct}</TableCell>
                          <TableCell className="text-right text-red-600">{s.incorrect}</TableCell>
                          <TableCell className="text-right">{s.accuracy}%</TableCell>
                          <TableCell className="text-right">{s.readiness}%</TableCell>
                          <TableCell className="text-right">{s.attempted ? Math.round(s.timeSec / s.attempted) : 0}s</TableCell>
                          <TableCell>
                            {s.accuracy < 50 ? (
                              <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">Weak</Badge>
                            ) : s.accuracy < 70 ? (
                              <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">Improving</Badge>
                            ) : (
                              <Badge variant="outline" className="border-sky-200 text-sky-700 bg-sky-50">Strong</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Trend line for the topic (sub-topic averages) */}
                  {t.subs.some((s) => s.trend.length >= 2) && (
                    <div className="mt-4 h-40">
                      <div className="text-[11px] text-muted-foreground mb-1">Accuracy trend across mocks</div>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={buildTrend(t)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                          <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                          <Tooltip />
                          <Line type="monotone" dataKey="accuracy" stroke="#0284c7" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Card>
    </div>
  );
}

function buildTrend(t: TopicAgg) {
  // Merge sub-topic per-date accuracy into topic-level trend points
  const map = new Map<string, { att: number; cor: number }>();
  t.subs.forEach((s) => {
    s.trend.forEach((acc, i) => {
      const key = `M${i + 1}`;
      if (!map.has(key)) map.set(key, { att: 0, cor: 0 });
      const m = map.get(key)!;
      // approximate weighting by sub-topic attempts
      const weight = s.attempted || 1;
      m.att += weight;
      m.cor += (acc / 100) * weight;
    });
  });
  return Array.from(map.entries()).map(([label, v]) => ({
    label,
    accuracy: v.att > 0 ? Math.round((v.cor / v.att) * 100) : 0,
  }));
}

export function FullReportTable({ sections }: { sections: SectionAgg[] }) {
  const rows: Array<{
    section: string; topic: string; subtopic: string;
    attempts: number; total: number; correct: number; incorrect: number;
    accuracy: number; readiness: number; status: string;
  }> = [];
  sections.forEach((sec) => {
    sec.topics.forEach((t) => {
      t.subs.forEach((s) => {
        rows.push({
          section: sec.name,
          topic: t.topic,
          subtopic: s.subtopic,
          attempts: s.attempted,
          total: s.total,
          correct: s.correct,
          incorrect: s.incorrect,
          accuracy: s.accuracy,
          readiness: s.readiness,
          status: s.accuracy < 50 ? "Weak" : s.accuracy < 70 ? "Improving" : "Strong",
        });
      });
    });
  });
  rows.sort((a, b) => a.readiness - b.readiness);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold">Full performance report</h4>
        <span className="text-[11px] text-muted-foreground">{rows.length} rows · sorted by improvement scope</span>
      </div>
      <div className="overflow-x-auto max-h-[520px]">
        <Table>
          <TableHeader className="sticky top-0 bg-white z-10">
            <TableRow>
              <TableHead>Section</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Sub-topic</TableHead>
              <TableHead className="text-right">Attempts</TableHead>
              <TableHead className="text-right">Correct</TableHead>
              <TableHead className="text-right">Wrong</TableHead>
              <TableHead className="text-right">Accuracy</TableHead>
              <TableHead className="text-right">Strength Score</TableHead>
              <TableHead>Indicator</TableHead>
              <TableHead className="text-right">Improvement Scope</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell className="text-xs">{r.section}</TableCell>
                <TableCell className="text-xs font-medium">{r.topic}</TableCell>
                <TableCell className="text-xs">{r.subtopic}</TableCell>
                <TableCell className="text-right text-xs">{r.attempts}/{r.total}</TableCell>
                <TableCell className="text-right text-xs text-sky-700">{r.correct}</TableCell>
                <TableCell className="text-right text-xs text-red-600">{r.incorrect}</TableCell>
                <TableCell className="text-right text-xs">{r.accuracy}%</TableCell>
                <TableCell className="text-right text-xs">{r.readiness}/100</TableCell>
                <TableCell>
                  {r.status === "Weak" ? (
                    <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">Weak</Badge>
                  ) : r.status === "Improving" ? (
                    <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">Improving</Badge>
                  ) : (
                    <Badge variant="outline" className="border-sky-200 text-sky-700 bg-sky-50">Strong</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right text-xs font-medium">
                  {Math.max(0, 100 - r.readiness)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
