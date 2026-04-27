import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Circle, ArrowLeft, RotateCcw } from "lucide-react";

export default function PersonalizedMockResultPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      const { data } = await supabase
        .from("personalized_mock_attempts")
        .select("*")
        .eq("id", attemptId)
        .maybeSingle();
      setAttempt(data);
      if (data) {
        const ids = (data.questions as any[]).map((q) => q.id);
        const { data: full } = await supabase
          .from("personalized_questions")
          .select("id, correct_index, explanation")
          .in("id", ids);
        const map = new Map((full ?? []).map((q) => [q.id, q]));
        setQuestions((data.questions as any[]).map((q) => ({ ...q, ...(map.get(q.id) || {}) })));
      }
    })();
  }, [attemptId]);

  if (!attempt) return <div className="p-6 text-muted-foreground">Loading…</div>;

  const total = attempt.num_questions;
  const correct = attempt.total_correct || 0;
  const wrong = attempt.total_wrong || 0;
  const skipped = attempt.total_unattempted || 0;
  const answers = attempt.answers || {};

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

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Stat label="Total" value={total} />
        <Stat label="Correct" value={correct} tone="ok" />
        <Stat label="Wrong" value={wrong} tone="bad" />
        <Stat label="Skipped" value={skipped} tone="neutral" />
        <Stat label="Score" value={attempt.score} tone="sky" />
      </div>

      <Card className="border-sky-100">
        <CardHeader><CardTitle className="text-base">Performance Summary</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row label="Accuracy" value={`${attempt.accuracy ?? 0}%`} />
          <Row label="Time taken" value={`${Math.floor((attempt.time_taken_seconds || 0) / 60)} min ${Math.floor((attempt.time_taken_seconds || 0) % 60)} sec`} />
          <Row label="Exam" value={`${attempt.exam_code} · ${attempt.difficulty}`} />
          <Row label="Sections" value={(attempt.sections || []).join(", ")} />
        </CardContent>
      </Card>

      <Card className="border-sky-100">
        <CardHeader><CardTitle className="text-base">Question Review</CardTitle></CardHeader>
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
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}
