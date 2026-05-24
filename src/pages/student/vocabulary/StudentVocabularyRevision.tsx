import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ArrowRight, Loader2 } from "lucide-react";

export default function StudentVocabularyRevision() {
  const { user } = useAuth();
  const [words, setWords] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);

  document.title = "Revision Deck | MBA Compass";

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.rpc("vocab_due_for_review", { _user_id: user.id, _limit: 20 });
    setWords((data as any) || []);
    setIdx(0); setFlipped(false);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const rate = async (correct: boolean) => {
    if (!user || !words[idx]) return;
    await supabase.rpc("vocab_update_progress", { _word_id: words[idx].id, _correct: correct });
    if (correct) await supabase.rpc("award_vocab_xp", { _xp: 3, _activity_today: true });
    if (idx + 1 < words.length) { setIdx(idx + 1); setFlipped(false); }
    else { setWords([]); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  if (words.length === 0) {
    return (
      <div className="max-w-md mx-auto py-10 text-center">
        <Card><CardContent className="pt-8 pb-8">
          <CheckCircle2 className="w-10 h-10 text-primary mx-auto mb-3" />
          <h2 className="font-heading text-xl font-bold text-foreground">All caught up</h2>
          <p className="text-sm text-muted-foreground mt-1">No words due for revision right now.</p>
          <Link to="/student/vocabulary"><Button className="mt-4">Back to Hub</Button></Link>
        </CardContent></Card>
      </div>
    );
  }

  const w = words[idx];

  return (
    <div className="max-w-xl mx-auto space-y-5 pb-20">
      <div className="flex items-center justify-between">
        <Link to="/student/vocabulary" className="text-sm text-muted-foreground hover:text-foreground">← Vocabulary Hub</Link>
        <span className="text-sm text-muted-foreground">{idx + 1} / {words.length}</span>
      </div>

      <Card className="min-h-[280px] cursor-pointer border-primary/20" onClick={() => setFlipped(!flipped)}>
        <CardContent className="pt-10 pb-10 text-center">
          {!flipped ? (
            <>
              <p className="text-xs text-muted-foreground uppercase mb-2">Word</p>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground">{w.word}</h2>
              <p className="text-sm text-muted-foreground mt-6">Tap to reveal meaning</p>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground uppercase mb-2">Meaning</p>
              <p className="text-foreground text-lg">{w.meaning}</p>
              {w.example_business && <p className="text-sm italic text-foreground/70 mt-4">"{w.example_business}"</p>}
            </>
          )}
        </CardContent>
      </Card>

      {flipped && (
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 gap-1 border-destructive/40 text-destructive" onClick={() => rate(false)}>
            <XCircle className="w-4 h-4" /> Forgot
          </Button>
          <Button className="flex-1 gap-1" onClick={() => rate(true)}>
            <CheckCircle2 className="w-4 h-4" /> Got it <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
