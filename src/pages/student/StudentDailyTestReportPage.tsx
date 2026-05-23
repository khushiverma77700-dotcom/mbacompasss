import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, CheckCircle2, XCircle, Circle, Clock, Target, Award, TrendingUp, BarChart3, ListChecks, Flame, Trophy } from "lucide-react";
import MathContent from "@/components/mock/MathContent";

type Section = { id: string; name: string; code: string; total_questions: number; duration_minutes: number };
type Question = { id: string; section_id: string; question_number: number; question_html: string; question_type: string; positive_marks: number; negative_marks: number; difficulty: string | null; topic: string | null; explanation_html: string | null; tita_correct_answers: string[] | null };
type Option = { id: string; question_id: string; option_label: string; option_html: string; is_correct: boolean; sort_order: number };
type Response = { question_id: string; section_id: string; selected_option_id: string | null; tita_answer: string | null; status: string; is_correct: boolean | null; marks_awarded: number; time_spent_seconds: number };

export default function StudentDailyTestReportPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<any>(null);
  const [test, setTest] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [options, setOptions] = useState<Option[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [streak, setStreak] = useState(0);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      const { data: att } = await supabase.from("mock_attempts").select("*").eq("id", attemptId).maybeSingle();
      if (!att) { setLoading(false); return; }
      setAttempt(att);

      const [{ data: t }, { data: secs }, { data: qs }, { data: resp }] = await Promise.all([
        supabase.from("mock_tests").select("id, name, slug, exam_code, total_duration_minutes, difficulty").eq("id", att.test_id).maybeSingle(),
        supabase.from("mock_sections").select("id, name, code, total_questions, duration_minutes, sort_order").eq("test_id", att.test_id).order("sort_order"),
        supabase.from("mock_questions").select("id, section_id, question_number, question_html, question_type, positive_marks, negative_marks, difficulty, topic, explanation_html, tita_correct_answers").in("section_id", []),
        supabase.from("mock_responses").select("*").eq("attempt_id", attemptId),
      ]);
      setTest(t);
      const secList = (secs ?? []) as Section[];
      setSections(secList);

      if (secList.length > 0) {
        const { data: allQs } = await supabase.from("mock_questions")
          .select("id, section_id, question_number, question_html, question_type, positive_marks, negative_marks, difficulty, topic, explanation_html, tita_correct_answers")
          .in("section_id", secList.map(s => s.id))
          .order("question_number");
        setQuestions((allQs ?? []) as Question[]);
        const qIds = (allQs ?? []).map((q: any) => q.id);
        if (qIds.length) {
          const { data: opts } = await supabase.from("mock_question_options").select("*").in("question_id", qIds).order("sort_order");
          setOptions((opts ?? []) as Option[]);
        }
      }
      setResponses((resp ?? []) as Response[]);

      // Streak + history
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prog } = await supabase.from("student_daily_test_progress")
          .select("assigned_date, completed_at")
          .eq("user_id", user.id)
          .order("assigned_date", { ascending: false })
          .limit(60);
        setHistory(prog ?? []);
        let s = 0;
        const dt = new Date();
        const map: Record<string, any> = {};
        (prog ?? []).forEach((p: any) => { map[p.assigned_date] = p; });
        while (true) {
          const key = dt.toISOString().slice(0, 10);
          if (map[key]?.completed_at) { s += 1; dt.setDate(dt.getDate() - 1); } else break;
        }
        setStreak(s);
      }
      setLoading(false);
    })();
  }, [attemptId]);

  const stats = useMemo(() => {
    if (!attempt || sections.length === 0) return null;
    const respByQ: Record<string, Response> = {};
    responses.forEach(r => { respByQ[r.question_id] = r; });
    const optByQ: Record<string, Option[]> = {};
    options.forEach(o => { (optByQ[o.question_id] = optByQ[o.question_id] || []).push(o); });

    const total = questions.length;
    const correct = responses.filter(r => r.is_correct === true).length;
    const wrong = responses.filter(r => r.is_correct === false && (r.selected_option_id || r.tita_answer)).length;
    const attempted = correct + wrong;
    const skipped = total - attempted;
    const totalScore = responses.reduce((acc, r) => acc + (Number(r.marks_awarded) || 0), 0);
    const maxScore = questions.reduce((acc, q) => acc + (Number(q.positive_marks) || 0), 0);
    const accuracy = attempted ? Math.round((correct / attempted) * 1000) / 10 : 0;
    const totalTime = responses.reduce((acc, r) => acc + (r.time_spent_seconds || 0), 0);
    const avgTime = attempted ? Math.round(totalTime / attempted) : 0;

    // Section breakdown
    const bySection = sections.map(s => {
      const sQs = questions.filter(q => q.section_id === s.id);
      const sResp = responses.filter(r => r.section_id === s.id);
      const sCorrect = sResp.filter(r => r.is_correct === true).length;
      const sWrong = sResp.filter(r => r.is_correct === false && (r.selected_option_id || r.tita_answer)).length;
      const sAttempted = sCorrect + sWrong;
      const sSkipped = sQs.length - sAttempted;
      const sScore = sResp.reduce((a, r) => a + (Number(r.marks_awarded) || 0), 0);
      const sMax = sQs.reduce((a, q) => a + (Number(q.positive_marks) || 0), 0);
      const sTime = sResp.reduce((a, r) => a + (r.time_spent_seconds || 0), 0);
      return { ...s, total: sQs.length, correct: sCorrect, wrong: sWrong, attempted: sAttempted, skipped: sSkipped, score: sScore, maxScore: sMax, accuracy: sAttempted ? Math.round((sCorrect / sAttempted) * 100) : 0, time: sTime };
    });

    // By difficulty
    const diffs = ["easy", "medium", "hard"];
    const byDiff = diffs.map(d => {
      const dQs = questions.filter(q => (q.difficulty || "medium") === d);
      const dResp = responses.filter(r => dQs.some(q => q.id === r.question_id));
      const dCorrect = dResp.filter(r => r.is_correct === true).length;
      const dWrong = dResp.filter(r => r.is_correct === false && (r.selected_option_id || r.tita_answer)).length;
      const dAttempted = dCorrect + dWrong;
      return { difficulty: d, total: dQs.length, correct: dCorrect, wrong: dWrong, attempted: dAttempted, accuracy: dAttempted ? Math.round((dCorrect / dAttempted) * 100) : 0 };
    });

    // By topic
    const topicMap: Record<string, { correct: number; wrong: number; total: number }> = {};
    questions.forEach(q => {
      const t = q.topic || "Uncategorized";
      topicMap[t] = topicMap[t] || { correct: 0, wrong: 0, total: 0 };
      topicMap[t].total += 1;
      const r = respByQ[q.id];
      if (r?.is_correct === true) topicMap[t].correct += 1;
      else if (r?.is_correct === false && (r.selected_option_id || r.tita_answer)) topicMap[t].wrong += 1;
    });
    const byTopic = Object.entries(topicMap)
      .map(([topic, v]) => ({ topic, ...v, accuracy: (v.correct + v.wrong) ? Math.round((v.correct / (v.correct + v.wrong)) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);

    return { total, correct, wrong, skipped, attempted, totalScore, maxScore, accuracy, totalTime, avgTime, bySection, byDiff, byTopic, respByQ, optByQ };
  }, [attempt, sections, questions, options, responses]);

  if (loading) return <div className="p-6 text-muted-foreground">Loading detailed report…</div>;
  if (!attempt || !stats) return <div className="p-6">Report not available.</div>;

  const last7 = history.slice(0, 7).filter((p: any) => p.completed_at).length;
  const monthCount = history.filter((p: any) => p.completed_at).length;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/student/daily-test")} className="mb-2 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Daily Test
          </Button>
          <h1 className="text-2xl font-bold">Daily Test — Detailed Report</h1>
          <p className="text-sm text-muted-foreground mt-1">{test?.name} · Submitted {new Date(attempt.submitted_at || attempt.updated_at).toLocaleString()}</p>
        </div>
        <Link to={`/mocks/${test?.slug}/leaderboard`}>
          <Button variant="outline" size="sm" className="gap-1"><Trophy className="h-3.5 w-3.5" /> Leaderboard</Button>
        </Link>
      </div>

      {/* Streak + improvement strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Daily streak" value={`${streak} day${streak === 1 ? "" : "s"}`} icon={<Flame className="h-4 w-4 text-orange-500" />} tone="orange" />
        <KPI label="Last 7 days" value={`${last7}/7`} icon={<TrendingUp className="h-4 w-4 text-emerald-600" />} tone="emerald" />
        <KPI label="This month" value={`${monthCount}`} icon={<CalendarStrip />} tone="sky" />
        <KPI label="Score" value={`${stats.totalScore.toFixed(1)} / ${stats.maxScore.toFixed(1)}`} icon={<Award className="h-4 w-4 text-amber-600" />} tone="amber" />
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Total Q" value={stats.total} />
        <Stat label="Correct" value={stats.correct} tone="ok" />
        <Stat label="Wrong" value={stats.wrong} tone="bad" />
        <Stat label="Skipped" value={stats.skipped} tone="neutral" />
        <Stat label="Accuracy" value={`${stats.accuracy}%`} tone="sky" />
      </div>

      {/* Performance summary */}
      <Card className="border-sky-100">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-sky-600" /> Performance Summary</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-3 text-sm">
          <Row label="Total time" value={fmtTime(stats.totalTime)} />
          <Row label="Avg time / question" value={fmtTime(stats.avgTime)} />
          <Row label="Attempted" value={`${stats.attempted} / ${stats.total}`} />
          <Row label="Net score" value={`${stats.totalScore.toFixed(2)} / ${stats.maxScore.toFixed(2)}`} />
          <Row label="Tab switches" value={String(attempt.tab_switch_count ?? 0)} />
          <Row label="Fullscreen exits" value={String(attempt.fullscreen_exits ?? 0)} />
        </CardContent>
      </Card>

      {/* Section-wise */}
      <Card className="border-sky-100">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><ListChecks className="h-4 w-4 text-sky-600" /> Section Breakdown</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {stats.bySection.map(s => (
            <div key={s.id} className="border rounded-lg p-3 bg-white">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                <div className="font-semibold">{s.name} <span className="text-xs text-muted-foreground ml-1">({s.code})</span></div>
                <div className="text-xs text-muted-foreground flex items-center gap-3">
                  <span><Clock className="h-3 w-3 inline mr-1" />{fmtTime(s.time)}</span>
                  <span>Score: <b className="text-gray-900">{s.score.toFixed(1)} / {s.maxScore.toFixed(1)}</b></span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs mb-2">
                <Mini label="Correct" value={s.correct} tone="ok" />
                <Mini label="Wrong" value={s.wrong} tone="bad" />
                <Mini label="Skipped" value={s.skipped} />
                <Mini label="Accuracy" value={`${s.accuracy}%`} tone="sky" />
              </div>
              <Progress value={s.accuracy} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* By difficulty */}
      <Card className="border-sky-100">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Gauge2 /> Difficulty-wise Performance</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {stats.byDiff.map(d => (
            <div key={d.difficulty} className="border rounded-lg p-3 bg-white">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-semibold capitalize">{d.difficulty}</span>
                <Badge variant="outline" className="text-[10px]">{d.total} Q</Badge>
              </div>
              <div className="text-xs text-muted-foreground mb-2">Correct {d.correct} · Wrong {d.wrong}</div>
              <Progress value={d.accuracy} className="h-2" />
              <div className="text-right text-xs mt-1 font-semibold text-sky-700">{d.accuracy}% accuracy</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* By topic */}
      {stats.byTopic.length > 0 && (
        <Card className="border-sky-100">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-sky-600" /> Topic-wise Performance</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {stats.byTopic.map((t) => (
              <div key={t.topic} className="grid grid-cols-12 gap-2 items-center text-sm">
                <div className="col-span-4 truncate">{t.topic}</div>
                <div className="col-span-6"><Progress value={t.accuracy} className="h-2" /></div>
                <div className="col-span-2 text-right text-xs">
                  <span className="text-emerald-600">{t.correct}</span> / <span className="text-rose-600">{t.wrong}</span> · <b>{t.accuracy}%</b>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Improvement plan (rule-based, no AI) */}
      <Card className="border-sky-100 bg-gradient-to-br from-sky-50/40 to-white">
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-sky-600" /> Daily Improvement Plan</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          {buildImprovementBullets(stats).map((b, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-600 shrink-0" />
              <span>{b}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Question Review */}
      <Card className="border-sky-100">
        <CardHeader><CardTitle className="text-base">Question-by-Question Review</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {sections.map(sec => {
            const sQs = questions.filter(q => q.section_id === sec.id);
            if (!sQs.length) return null;
            return (
              <div key={sec.id} className="space-y-3">
                <div className="text-sm font-semibold text-sky-700">{sec.name}</div>
                {sQs.map((q, i) => {
                  const r = stats.respByQ[q.id];
                  const opts = (stats.optByQ[q.id] || []).slice().sort((a, b) => a.sort_order - b.sort_order);
                  const isAnswered = !!(r?.selected_option_id || r?.tita_answer);
                  const isCorrect = r?.is_correct === true;
                  return (
                    <div key={q.id} className="border rounded-lg p-3 bg-white">
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5">
                          {!isAnswered ? <Circle className="h-4 w-4 text-gray-400" /> : isCorrect ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-rose-600" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs text-muted-foreground mb-1 flex flex-wrap items-center gap-2">
                            <span>Q{i + 1}</span>
                            {q.difficulty && <Badge variant="outline" className="text-[10px] capitalize">{q.difficulty}</Badge>}
                            {q.topic && <Badge variant="secondary" className="text-[10px]">{q.topic}</Badge>}
                            {r && <span><Clock className="h-3 w-3 inline mr-1" />{fmtTime(r.time_spent_seconds)}</span>}
                            <span className="ml-auto">{r ? `${(Number(r.marks_awarded) || 0).toFixed(2)} marks` : "—"}</span>
                          </div>
                          <div className="text-sm" dangerouslySetInnerHTML={{ __html: q.question_html }} />
                        </div>
                      </div>

                      {q.question_type === "mcq" && opts.length > 0 && (
                        <div className="ml-6 mt-2 space-y-1">
                          {opts.map((o) => {
                            const isPick = r?.selected_option_id === o.id;
                            const cls = o.is_correct ? "bg-emerald-50 border-emerald-300" : isPick ? "bg-rose-50 border-rose-300" : "border-gray-100";
                            return (
                              <div key={o.id} className={`p-2 rounded border text-sm ${cls}`}>
                                <span className="font-semibold mr-2">{o.option_label}.</span>
                                <span dangerouslySetInnerHTML={{ __html: o.option_html }} />
                                {o.is_correct && <Badge variant="outline" className="ml-2 text-emerald-700 border-emerald-300">Correct</Badge>}
                                {isPick && !o.is_correct && <Badge variant="outline" className="ml-2 text-rose-700 border-rose-300">Your answer</Badge>}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {q.question_type === "tita" && (
                        <div className="ml-6 mt-2 text-sm">
                          <div>Your answer: <b>{r?.tita_answer || "—"}</b></div>
                          <div>Correct answer: <b className="text-emerald-700">{(q.tita_correct_answers || []).join(" / ")}</b></div>
                        </div>
                      )}

                      {q.explanation_html && (
                        <div className="ml-6 mt-2 p-3 rounded bg-sky-50/60 border border-sky-100 text-sm">
                          <div className="font-semibold text-sky-800 mb-1">Solution</div>
                          <MathContent html={q.explanation_html} className="prose prose-sm max-w-none" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function fmtTime(s: number) {
  if (!s || s < 0) return "0s";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m ? `${m}m ${sec}s` : `${sec}s`;
}

function buildImprovementBullets(s: any): string[] {
  const out: string[] = [];
  const weakSec = [...s.bySection].sort((a: any, b: any) => a.accuracy - b.accuracy)[0];
  const strongSec = [...s.bySection].sort((a: any, b: any) => b.accuracy - a.accuracy)[0];
  if (weakSec && weakSec.attempted > 0) out.push(`Focus area: ${weakSec.name} — accuracy ${weakSec.accuracy}%. Aim for +10% by tomorrow with 15–20 targeted questions.`);
  if (strongSec && strongSec.accuracy >= 70) out.push(`Keep momentum in ${strongSec.name} (${strongSec.accuracy}%). Move to harder difficulty here.`);
  if (s.skipped > s.total * 0.2) out.push(`You skipped ${s.skipped} questions. Try one short pass after the main attempt to convert skips into attempts.`);
  if (s.avgTime > 90) out.push(`Average ${fmtTime(s.avgTime)} per question — practice timed sets to reduce to under 90s.`);
  if (s.byDiff.find((d: any) => d.difficulty === "easy" && d.attempted > 0 && d.accuracy < 80)) out.push("Easy questions accuracy is below 80% — fix silly mistakes before chasing harder ones.");
  const weakTopic = s.byTopic.find((t: any) => (t.correct + t.wrong) >= 2 && t.accuracy < 50);
  if (weakTopic) out.push(`Lowest topic: ${weakTopic.topic} — revise concepts and solve 10 fresh questions on it tomorrow.`);
  if (out.length === 0) out.push("Strong performance overall. Push to a higher difficulty mock tomorrow to keep improving.");
  return out;
}

function KPI({ label, value, icon, tone }: { label: string; value: any; icon: any; tone: "orange" | "emerald" | "sky" | "amber" }) {
  const bg = { orange: "bg-orange-50 border-orange-200", emerald: "bg-emerald-50 border-emerald-200", sky: "bg-sky-50 border-sky-200", amber: "bg-amber-50 border-amber-200" }[tone];
  return (
    <div className={`rounded-lg border p-3 ${bg}`}>
      <div className="text-[11px] text-muted-foreground flex items-center gap-1">{icon} {label}</div>
      <div className="text-lg font-bold mt-0.5">{value}</div>
    </div>
  );
}
function Stat({ label, value, tone }: { label: string; value: any; tone?: "ok" | "bad" | "neutral" | "sky" }) {
  const color = tone === "ok" ? "text-emerald-600" : tone === "bad" ? "text-rose-600" : tone === "sky" ? "text-sky-700" : "text-gray-700";
  return (
    <div className="p-3 rounded-lg border border-sky-100 bg-white">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
function Mini({ label, value, tone }: { label: string; value: any; tone?: "ok" | "bad" | "sky" }) {
  const color = tone === "ok" ? "text-emerald-600" : tone === "bad" ? "text-rose-600" : tone === "sky" ? "text-sky-700" : "text-gray-700";
  return (
    <div className="bg-gray-50 rounded p-2 text-center">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={`text-sm font-bold ${color}`}>{value}</div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between border-b last:border-0 py-1.5"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}
function CalendarStrip() {
  return <CalendarDaysIcon />;
}
function CalendarDaysIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4 text-sky-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
}
function Gauge2() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4 text-sky-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 14l4-4M3 12a9 9 0 0118 0" /></svg>;
}
