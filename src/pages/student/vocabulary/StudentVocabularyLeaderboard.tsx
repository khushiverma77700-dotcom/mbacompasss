import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Loader2 } from "lucide-react";

export default function StudentVocabularyLeaderboard() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  document.title = "Vocabulary Leaderboard | MBA Compass";

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_vocab_leaderboard", { _limit: 50 });
      setRows((data as any) || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-5 pb-20">
      <div>
        <Link to="/student/vocabulary" className="text-sm text-muted-foreground hover:text-foreground">← Vocabulary Hub</Link>
        <h1 className="font-heading text-2xl font-bold text-foreground mt-1 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary" /> Vocabulary Leaderboard
        </h1>
      </div>

      {loading ? <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto my-10" /> : rows.length === 0 ? (
        <Card><CardContent className="pt-6 text-center text-muted-foreground">No learners yet. Be the first!</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="divide-y divide-border">
              {rows.map((r) => (
                <div key={r.user_id} className={`flex items-center justify-between py-3 ${r.is_self ? "bg-primary/5 -mx-3 px-3 rounded" : ""}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-bold text-muted-foreground w-8 text-sm">#{r.rank}</span>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">{r.display_name}{r.is_self && <Badge variant="secondary" className="ml-2 text-[10px]">You</Badge>}</p>
                      <p className="text-xs text-muted-foreground">Level {r.level} · {r.current_streak}d streak</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{r.total_xp} XP</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
