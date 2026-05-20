import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Flag, Timer, CheckCircle2 } from "lucide-react";
import { useForceLightTheme } from "@/hooks/useForceLightTheme";
import MathContent from "@/components/mock/MathContent";
import MockCalculator from "@/components/mock/MockCalculator";

type Q = { id: string; section: string; difficulty: string; question_text: string; options: string[]; topic?: string };

export default function PersonalizedMockRunnerPage() {
  useForceLightTheme();
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      const { data, error } = await supabase
        .from("personalized_mock_attempts")
        .select("*")
        .eq("id", attemptId)
        .maybeSingle();
      if (error || !data) { toast.error("Attempt not found"); navigate("/student/personalized-hub"); return; }
      if (data.status === "submitted") { navigate(`/student/personalized-hub/result/${data.id}`); return; }
      setAttempt(data);
      setAnswers((data.answers as any) || {});
      const elapsed = Math.floor((Date.now() - new Date(data.started_at).getTime()) / 1000);
      const total = data.duration_minutes * 60;
      setRemaining(Math.max(0, total - elapsed));
      startRef.current = new Date(data.started_at).getTime();
    })();
  }, [attemptId, navigate]);

  useEffect(() => {
    if (!attempt) return;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [attempt]);

  useEffect(() => {
    if (attempt && remaining === 0 && !submitting) {
      handleSubmit(true);
    }
    // eslint-disable-next-line
  }, [remaining, attempt]);

  const questions: Q[] = (attempt?.questions as Q[]) ?? [];
  const current = questions[idx];

  const counts = useMemo(() => {
    const answered = Object.keys(answers).filter((k) => answers[k] !== undefined && answers[k] !== null).length;
    return { answered, unanswered: questions.length - answered, marked: Object.values(marked).filter(Boolean).length };
  }, [answers, marked, questions.length]);

  const setAns = (qid: string, v: number) => setAnswers((p) => ({ ...p, [qid]: v }));

  const handleSubmit = async (auto = false) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const time_taken_seconds = Math.floor((Date.now() - startRef.current) / 1000);
      const { data, error } = await supabase.functions.invoke("personalized-mock-submit", {
        body: { attempt_id: attemptId, answers, time_taken_seconds },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      if (auto) toast.info("Time's up — auto-submitted");
      navigate(`/student/personalized-hub/result/${attemptId}`);
    } catch (e: any) {
      toast.error(e.message ?? "Submit failed");
      setSubmitting(false);
    }
  };

  if (!attempt || !current) return <div className="p-8 text-muted-foreground">Loading…</div>;

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const lowTime = remaining < 60;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50/40 via-white to-blue-50/30">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-sky-100">
        <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{attempt.exam_code} · {attempt.difficulty}</div>
            <div className="text-xs text-muted-foreground">Question {idx + 1} of {questions.length} · {current.section}</div>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-sm ${lowTime ? "bg-rose-50 text-rose-700" : "bg-sky-50 text-sky-700"}`}>
            <Timer className="h-4 w-4" />
            {mm}:{ss}
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-[1fr_260px] gap-4 p-4 sm:p-6 max-w-6xl mx-auto">
        <Card className="border-sky-100">
          <CardContent className="p-5 space-y-5">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{current.section}</Badge>
              <Badge variant="outline" className="capitalize">{current.difficulty}</Badge>
              {current.topic && <Badge variant="outline">{current.topic}</Badge>}
            </div>
            <MathContent html={current.question_text} className="prose prose-sm max-w-none text-base leading-relaxed" />
            <div className="space-y-2">
              {current.options.map((opt, i) => {
                const picked = answers[current.id] === i;
                return (
                  <button
                    key={i}
                    onClick={() => setAns(current.id, i)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${picked ? "border-sky-500 bg-sky-50" : "border-gray-200 hover:border-sky-300 hover:bg-sky-50/40"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-6 w-6 rounded-full border flex-shrink-0 grid place-items-center text-xs font-semibold ${picked ? "bg-sky-600 border-sky-600 text-white" : "border-gray-300"}`}>
                        {String.fromCharCode(65 + i)}
                      </div>
                      <MathContent html={opt} className="prose prose-sm max-w-none text-sm leading-relaxed" />
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="outline" onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setMarked((m) => ({ ...m, [current.id]: !m[current.id] }))}
              >
                <Flag className="h-4 w-4 mr-1" /> {marked[current.id] ? "Unmark" : "Mark for review"}
              </Button>
              <Button onClick={() => setAnswers((p) => { const c = { ...p }; delete c[current.id]; return c; })} variant="ghost">Clear</Button>
              {idx < questions.length - 1 ? (
                <Button className="ml-auto bg-sky-600 hover:bg-sky-700" onClick={() => setIdx(idx + 1)}>
                  Save & Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button className="ml-auto bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSubmit(false)} disabled={submitting}>
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Submit
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <aside className="space-y-3">
          <Card className="border-sky-100">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-2">Question Palette</div>
              <div className="grid grid-cols-6 lg:grid-cols-5 gap-2">
                {questions.map((q, i) => {
                  const ans = answers[q.id] !== undefined && answers[q.id] !== null;
                  const mk = marked[q.id];
                  const cls = i === idx ? "ring-2 ring-sky-500 " : "";
                  const bg = mk ? "bg-amber-100 text-amber-800" : ans ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-700";
                  return (
                    <button key={q.id} onClick={() => setIdx(i)} className={`${cls}${bg} h-8 rounded text-xs font-medium hover:opacity-80`}>{i + 1}</button>
                  );
                })}
              </div>
              <div className="mt-3 text-xs space-y-1 text-muted-foreground">
                <div>Answered: <span className="font-semibold text-emerald-700">{counts.answered}</span></div>
                <div>Unanswered: <span className="font-semibold text-rose-600">{counts.unanswered}</span></div>
                <div>Marked: <span className="font-semibold text-amber-700">{counts.marked}</span></div>
              </div>
              <Button onClick={() => handleSubmit(false)} disabled={submitting} className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700">
                Submit Mock
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
