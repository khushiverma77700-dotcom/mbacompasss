import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Award } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MockLeaderboardPage() {
  const { slug } = useParams();
  const [test, setTest] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: t } = await supabase.from("mock_tests").select("*").eq("slug", slug).maybeSingle();
      if (!t) {
        setLoading(false);
        return;
      }
      setTest(t);
      const { data } = await supabase.rpc("get_mock_leaderboard", { _test_id: t.id, _limit: 100 });
      setRows((data ?? []) as any);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="p-8 text-muted-foreground">Loading leaderboard…</div>;
  if (!test) return <div className="p-8">Test not found</div>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <header className="mb-6">
        <Link to="/mocks" className="text-sm text-muted-foreground hover:underline">← All mocks</Link>
        <h1 className="text-3xl font-bold mt-2 flex items-center gap-2">
          <Trophy className="h-7 w-7 text-amber-500" />
          {test.name} — Leaderboard
        </h1>
        <p className="text-muted-foreground mt-1">Top 100 scorers ranked by total score.</p>
      </header>

      {rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No submissions yet. <Link to={`/mocks/${slug}`} className="text-primary">Be the first →</Link>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="grid grid-cols-[60px_1fr_100px_80px_120px] bg-muted/50 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
            <div>Rank</div>
            <div>Candidate</div>
            <div className="text-right">Score</div>
            <div className="text-right">%ile</div>
            <div className="text-right">Submitted</div>
          </div>
          <div className="divide-y">
            {rows.map((r) => (
              <div
                key={r.attempt_id}
                className={cn(
                  "grid grid-cols-[60px_1fr_100px_80px_120px] px-4 py-3 text-sm items-center",
                  r.is_self && "bg-primary/5 font-medium",
                )}
              >
                <div className="flex items-center gap-1">
                  <RankBadge rank={Number(r.rank)} />
                </div>
                <div className="flex items-center gap-2">
                  <span>{r.display_name}</span>
                  {r.is_self && <Badge variant="secondary" className="text-[10px]">You</Badge>}
                </div>
                <div className="text-right font-mono">{Number(r.total_score).toFixed(0)}/{Number(r.max_score ?? 0).toFixed(0)}</div>
                <div className="text-right">{Number(r.percentile ?? 0).toFixed(2)}</div>
                <div className="text-right text-xs text-muted-foreground">
                  {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : "—"}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="mt-6 flex gap-3">
        <Link to={`/mocks/${slug}`}><Button>Take this Mock</Button></Link>
        <Link to="/dashboard/mocks"><Button variant="outline">My Mocks</Button></Link>
      </div>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="flex items-center gap-1"><Trophy className="h-4 w-4 text-amber-500" /><strong>{rank}</strong></span>;
  if (rank === 2) return <span className="flex items-center gap-1"><Medal className="h-4 w-4 text-slate-400" /><strong>{rank}</strong></span>;
  if (rank === 3) return <span className="flex items-center gap-1"><Award className="h-4 w-4 text-amber-700" /><strong>{rank}</strong></span>;
  return <span className="text-muted-foreground">{rank}</span>;
}
