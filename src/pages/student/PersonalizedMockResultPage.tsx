import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Circle, ArrowLeft, RotateCcw } from "lucide-react";

import KPIGrid from "@/components/mock/report/KPIGrid";
import QuestionLevelTable, { QRow } from "@/components/mock/report/QuestionLevelTable";
import TimeManagementCharts from "@/components/mock/report/TimeManagementCharts";
import StrategyClassifier from "@/components/mock/report/StrategyClassifier";
import DifficultyAnalysis, { DiffRow } from "@/components/mock/report/DifficultyAnalysis";
import StrengthsWeaknesses, { TopicRow } from "@/components/mock/report/StrengthsWeaknesses";

export default function PersonalizedMockResultPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      const { data } = await supabase
        .from("personalized_mock_attempts").select("*").eq("id", attemptId).maybeSingle();
      setAttempt(data);
      if (data) {
        const ids = (data.questions as any[]).map((q) => q.id);
        const { data: full } = await supabase
          .from("personalized_questions")
          .select("id, correct_index, explanation, difficulty, topic")
          .in("id", ids);
        const map = new Map((full ?? []).map((q) => [q.id, q]));
        setQuestions((data.questions as any[]).map((q) => ({ ...q, ...(map.get(q.id) || {}) })));
      }
    })();
  }, [attemptId]);

  const answers = attempt?.answers || {};
  const timeMap: Record<string, number> = attempt?.time_per_question || {};

  const qRows: QRow[] = useMemo(() => {
    if (!questions.length) return [];
    return questions.map((q, i) => {
      const picked = answers[q.id];
      const isAnswered = picked !== undefined && picked !== null;
      const status: QRow["status"] = !isAnswered ? "skipped" : (picked === q.correct_index ? "correct" : "incorrect");
      const timeSec = Math.round(Number(timeMap[q.id] ?? 0));
      const tags: string[] = [];
      const ideal = q.difficulty === "easy" ? 60 : q.difficulty === "difficult" || q.difficulty === "hard" ? 150 : 100;
      if (status === "incorrect" && timeSec < 30) tags.push("silly mistake");
      if (status === "incorrect" && timeSec > ideal * 1.5) tags.push("conceptual");
      if (status === "skipped" && q.difficulty === "easy") tags.push("missed easy");
      return {
        qNum: i + 1,
        sectionCode: q.section || "—",
        difficulty: q.difficulty || "moderate",
        topic: q.topic ?? null,
        status, timeSec, idealSec: ideal, tags,
      };
    });
  }, [questions, answers, timeMap]);

  const diffRows: DiffRow[] = useMemo(() => {
    const m: Record<string, { attempted: number; correct: number; total: number }> = {};
    qRows.forEach((r) => {
      const d = r.difficulty || "unknown";
      if (!m[d]) m[d] = { attempted: 0, correct: 0, total: 0 };
      m[d].total += 1;
      if (r.status !== "skipped") m[d].attempted += 1;
      if (r.status === "correct") m[d].correct += 1;
    });
    return Object.entries(m).map(([k, v]) => ({
      difficulty: k.charAt(0).toUpperCase() + k.slice(1),
      attempted: v.attempted, correct: v.correct, total: v.total,
      accuracy: v.attempted ? Math.round((v.correct / v.attempted) * 100) : 0,
    }));
  }, [qRows]);

  const topicRows: TopicRow[] = useMemo(() => {
    const m: Record<string, { attempted: number; correct: number }> = {};
    qRows.forEach((r) => {
      if (!r.topic) return;
      if (!m[r.topic]) m[r.topic] = { attempted: 0, correct: 0 };
      if (r.status !== "skipped") m[r.topic].attempted += 1;
      if (r.status === "correct") m[r.topic].correct += 1;
    });
    return Object.entries(m).map(([topic, v]) => ({
      topic, attempted: v.attempted, correct: v.correct,
      accuracy: v.attempted ? Math.round((v.correct / v.attempted) * 100) : 0,
    })).sort((a, b) => b.attempted - a.attempted);
  }, [qRows]);

  const perSectionTime = useMemo(() => {
    const m: Record<string, { name: string; correctTime: number; wrongTime: number; skippedTime: number }> = {};
    qRows.forEach((r) => {
      const name = r.sectionCode;
      if (!m[name]) m[name] = { name, correctTime: 0, wrongTime: 0, skippedTime: 0 };
      const minutes = r.timeSec / 60;
      if (r.status === "correct") m[name].correctTime += minutes;
      else if (r.status === "incorrect") m[name].wrongTime += minutes;
      else m[name].skippedTime += minutes;
    });
    return Object.values(m).map((s) => ({
      ...s,
      correctTime: Math.round(s.correctTime),
      wrongTime: Math.round(s.wrongTime),
      skippedTime: Math.round(s.skippedTime),
    }));
  }, [qRows]);

  const histogram = useMemo(() => {
    const buckets = [
      { bucket: "0-30s", min: 0, max: 30, count: 0 },
      { bucket: "30-60s", min: 30, max: 60, count: 0 },
      { bucket: "1-2m", min: 60, max: 120, count: 0 },
      { bucket: "2-3m", min: 120, max: 180, count: 0 },
      { bucket: "3-5m", min: 180, max: 300, count: 0 },
      { bucket: "5m+", min: 300, max: 99999, count: 0 },
    ];
    qRows.forEach((r) => {
      if (r.timeSec === 0) return;
      const b = buckets.find((x) => r.timeSec >= x.min && r.timeSec < x.max);
      if (b) b.count++;
    });
    return buckets.map(({ bucket, count }) => ({ bucket, count }));
  }, [qRows]);

  const speedAcc = useMemo(() => {
    const win = 5;
    const seq = qRows.map((r) => ({ t: r.timeSec, c: r.status === "correct" ? 1 : 0, attempted: r.status !== "skipped" ? 1 : 0 }));
    const out: Array<{ idx: number; speedSec: number; accuracy: number }> = [];
    for (let i = win - 1; i < seq.length; i++) {
      const slice = seq.slice(i - win + 1, i + 1);
      const totT = slice.reduce((a, x) => a + x.t, 0);
      const totC = slice.reduce((a, x) => a + x.c, 0);
      const totA = slice.reduce((a, x) => a + x.attempted, 0);
      out.push({ idx: i + 1, speedSec: Math.round(totT / win), accuracy: totA ? Math.round((totC / totA) * 100) : 0 });
    }
    return out;
  }, [qRows]);

  if (!attempt) return <div className="p-6 text-muted-foreground">Loading…</div>;

  const total = attempt.num_questions;
  const correct = attempt.total_correct || 0;
  const wrong = attempt.total_wrong || 0;
  const skipped = attempt.total_unattempted || 0;
  const attempted = correct + wrong;
  const totalTimeSec = Number(attempt.time_taken_seconds || 0);
  const attemptRate = total > 0 ? Math.round((attempted / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Mock Result</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/student/personalized-hub")}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Hub
          </Button>
          <Button onClick={() => navigate("/student/personalized-hub")} className="bg-sky-600 hover:bg-sky-700">
            <RotateCcw className="h-4 w-4 mr-1" /> Generate New
          </Button>
        </div>
      </div>

      {/* 1. Overall Summary */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">1. Overall Performance Summary</h2>
        <KPIGrid data={{
          totalScore: Number(attempt.score ?? 0),
          maxScore: total,
          percentile: 0,
          accuracy: Number(attempt.accuracy ?? 0),
          attempted,
          totalQuestions: total,
          timeUsedSec: totalTimeSec,
          totalTimeSec: 0,
        }} />
        <Card className="border-sky-100">
          <CardHeader><CardTitle className="text-base">Quick stats</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
            <Stat label="Total" value={total} />
            <Stat label="Correct" value={correct} tone="ok" />
            <Stat label="Wrong" value={wrong} tone="bad" />
            <Stat label="Skipped" value={skipped} tone="neutral" />
            <Stat label="Score" value={attempt.score} tone="sky" />
          </CardContent>
        </Card>
      </section>

      {/* 3. Section-wise (lightweight) - skipped, sections embedded in question table */}

      {/* 4. Question-Level */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">2. Question-Level Analysis</h2>
        <QuestionLevelTable rows={qRows} />
      </section>

      {/* 5. Time Management */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">3. Time Management</h2>
        <TimeManagementCharts perSection={perSectionTime} histogram={histogram} speedAcc={speedAcc} />
      </section>

      {/* 6. Strategy */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">4. Attempt Strategy</h2>
        <StrategyClassifier
          attemptRate={attemptRate}
          accuracy={Number(attempt.accuracy ?? 0)}
          sectionPoints={perSectionTime.map((s) => {
            const sectionRows = qRows.filter((r) => r.sectionCode === s.name);
            const att = sectionRows.filter((r) => r.status !== "skipped").length;
            const cor = sectionRows.filter((r) => r.status === "correct").length;
            return {
              name: s.name,
              attemptRate: sectionRows.length ? Math.round((att / sectionRows.length) * 100) : 0,
              accuracy: att ? Math.round((cor / att) * 100) : 0,
            };
          })}
        />
      </section>

      {/* 7. Difficulty */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">5. Difficulty Analysis</h2>
        <DifficultyAnalysis rows={diffRows} />
      </section>

      {/* 9. Strengths & Weaknesses */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold">6. Strengths & Weaknesses</h2>
        <StrengthsWeaknesses topics={topicRows} />
      </section>

      {/* Question Review */}
      <Card className="border-sky-100">
        <CardHeader><CardTitle className="text-base">Question Review with Explanations</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {questions.map((q, i) => {
            const picked = answers[q.id];
            const isCorrect = picked === q.correct_index;
            const isAnswered = picked !== undefined && picked !== null;
            return (
              <div key={q.id} className="border rounded-lg p-4 bg-white">
                <div className="flex items-start gap-2 mb-2">
                  <div className="flex-shrink-0">
                    {!isAnswered ? <Circle className="h-5 w-5 text-gray-400" />
                      : isCorrect ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      : <XCircle className="h-5 w-5 text-rose-600" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground mb-1">Q{i + 1} · {q.section}</div>
                    <p className="text-sm font-medium">{q.question_text}</p>
                  </div>
                </div>
                <div className="ml-7 space-y-1">
                  {q.options.map((opt: string, j: number) => {
                    const isPick = picked === j;
                    const isAns = q.correct_index === j;
                    const cls = isAns ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                      : isPick ? "bg-rose-50 border-rose-300 text-rose-900"
                      : "border-gray-100 text-gray-700";
                    return (
                      <div key={j} className={`p-2 rounded border text-sm ${cls}`}>
                        <span className="font-semibold mr-2">{String.fromCharCode(65 + j)}.</span>{opt}
                        {isAns && <Badge variant="outline" className="ml-2 text-emerald-700 border-emerald-300">Correct</Badge>}
                        {isPick && !isAns && <Badge variant="outline" className="ml-2 text-rose-700 border-rose-300">Your answer</Badge>}
                      </div>
                    );
                  })}
                </div>
                {q.explanation && (
                  <div className="ml-7 mt-2 p-3 rounded bg-sky-50/60 border border-sky-100 text-sm">
                    <span className="font-semibold text-sky-800">Explanation: </span>{q.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
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
