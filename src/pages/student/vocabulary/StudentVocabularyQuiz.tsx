import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Sparkles, CheckCircle2, XCircle, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type QuizItem = {
  word_id: string;
  quiz_type: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
};

export default function StudentVocabularyQuiz() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<QuizItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  document.title = "Daily Vocabulary Quiz | MBA Compass";

  useEffect(() => { generate(); /* eslint-disable-next-line */ }, []);

  const generate = async () => {
    if (!user) return;
    setLoading(true);
    setItems([]); setIdx(0); setSelected(null); setRevealed(false); setScore(0); setDone(false);

    // Pick 10 words: prefer due-for-review, then random from library
    const { data: dueWords } = await supabase.rpc("vocab_due_for_review", { _user_id: user.id, _limit: 10 });
    let words: any[] = (dueWords as any) || [];
    if (words.length < 10) {
      const { data: more } = await supabase.from("vocab_words").select("*").limit(20);
      const ids = new Set(words.map((w) => w.id));
      for (const w of (more || [])) {
        if (words.length >= 10) break;
        if (!ids.has(w.id)) words.push(w);
      }
    }
    words = words.sort(() => Math.random() - 0.5).slice(0, 10);

    if (words.length === 0) {
      toast({ title: "No words available yet" });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("vocab-quiz-generate", { body: { words } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setItems(data.items || []);
    } catch (e: any) {
      toast({ title: "Quiz generation failed", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const current = items[idx];

  const submit = async () => {
    if (selected === null || !current || !user) return;
    const correct = selected === current.correct_index;
    setRevealed(true);
    if (correct) setScore((s) => s + 1);
    await supabase.from("vocab_quiz_attempts").insert({
      user_id: user.id, word_id: current.word_id, quiz_type: current.quiz_type as any, is_correct: correct,
    });
    await supabase.rpc("vocab_update_progress", { _word_id: current.word_id, _correct: correct });
    if (correct) await supabase.rpc("award_vocab_xp", { _xp: 10, _activity_today: true });
  };

  const next = async () => {
    if (idx + 1 < items.length) {
      setIdx(idx + 1); setSelected(null); setRevealed(false);
    } else {
      setDone(true);
      if (user) {
        const today = new Date().toISOString().slice(0, 10);
        const { data: g } = await supabase.from("vocab_daily_goals").select("*").eq("user_id", user.id).eq("on_date", today).maybeSingle();
        if (g) await supabase.from("vocab_daily_goals").update({ quiz_done: (g.quiz_done || 0) + items.length }).eq("user_id", user.id).eq("on_date", today);
        else await supabase.from("vocab_daily_goals").insert({ user_id: user.id, on_date: today, quiz_done: items.length });
      }
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
      <p className="text-sm text-muted-foreground">AI is preparing your quiz…</p>
    </div>
  );

  if (done) {
    const pct = items.length ? Math.round((score / items.length) * 100) : 0;
    return (
      <div className="max-w-md mx-auto py-10">
        <Card className="text-center border-primary/20">
          <CardContent className="pt-8 pb-8">
            <Trophy className="w-12 h-12 text-primary mx-auto mb-3" />
            <h2 className="font-heading text-2xl font-bold text-foreground">Quiz Complete</h2>
            <p className="text-muted-foreground mt-1">You scored</p>
            <div className="text-4xl font-bold text-primary mt-2">{score}/{items.length}</div>
            <p className="text-sm text-muted-foreground mt-1">{pct}% accuracy · +{score * 10} XP earned</p>
            <div className="flex gap-2 mt-6 justify-center">
              <Button onClick={generate} variant="outline">Another Quiz</Button>
              <Button onClick={() => navigate("/student/vocabulary")}>Back to Hub</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!current) return (
    <div className="text-center py-12">
      <p className="text-muted-foreground mb-3">Couldn't load quiz.</p>
      <Button onClick={generate}>Try Again</Button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <Link to="/student/vocabulary" className="text-sm text-muted-foreground hover:text-foreground">← Vocabulary Hub</Link>
          <h1 className="font-heading text-xl font-bold text-foreground mt-1">Daily Quiz</h1>
        </div>
        <span className="text-sm text-muted-foreground">{idx + 1} / {items.length}</span>
      </div>
      <Progress value={((idx) / items.length) * 100} />

      <Card>
        <CardContent className="pt-6">
          <div className="text-xs text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> {current.quiz_type}
          </div>
          <p className="text-foreground font-medium text-lg leading-relaxed">{current.question}</p>

          <div className="grid gap-2 mt-5">
            {current.options.map((opt, i) => {
              const isCorrect = i === current.correct_index;
              const isSelected = i === selected;
              let cls = "border-border";
              if (revealed) {
                if (isCorrect) cls = "border-green-500 bg-green-500/10";
                else if (isSelected) cls = "border-destructive bg-destructive/10";
              } else if (isSelected) cls = "border-primary bg-primary/5";
              return (
                <button
                  key={i}
                  disabled={revealed}
                  onClick={() => setSelected(i)}
                  className={`text-left p-3 rounded-md border transition-colors text-sm ${cls}`}
                >
                  <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                  {opt}
                  {revealed && isCorrect && <CheckCircle2 className="inline w-4 h-4 ml-2 text-green-600" />}
                  {revealed && isSelected && !isCorrect && <XCircle className="inline w-4 h-4 ml-2 text-destructive" />}
                </button>
              );
            })}
          </div>

          {revealed && (
            <div className="mt-4 p-3 rounded-md bg-muted/50 text-sm text-foreground/80">
              <span className="font-medium text-foreground">Explanation: </span>{current.explanation}
            </div>
          )}

          <div className="mt-5 flex justify-end">
            {!revealed ? (
              <Button onClick={submit} disabled={selected === null}>Submit</Button>
            ) : (
              <Button onClick={next}>{idx + 1 < items.length ? "Next" : "Finish"}</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
