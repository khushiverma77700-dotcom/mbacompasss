import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, CheckCircle2, XCircle, MinusCircle } from "lucide-react";

export default function MockResultPage() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<any>(null);
  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      const { data: a } = await supabase.from("mock_attempts").select("*").eq("id", attemptId).maybeSingle();
      if (!a) {
        navigate("/mocks");
        return;
      }
      const { data: t } = await supabase.from("mock_tests").select("*").eq("id", a.test_id).maybeSingle();
      setAttempt(a);
      setTest(t);
      setLoading(false);
    })();
  }, [attemptId, navigate]);

  if (loading) return <div className="p-8 text-muted-foreground">Loading…</div>;
  if (!attempt) return <div className="p-8">Not found</div>;

  const sectionalScores = attempt.sectional_scores ?? {};

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <header className="mb-6">
        <Link to="/mocks" className="text-sm text-muted-foreground hover:underline">← All mocks</Link>
        <h1 className="text-3xl font-bold mt-2">{test?.name} — Result</h1>
        {attempt.auto_submitted_reason && (
          <Badge variant="destructive" className="mt-2">Auto-submitted: {attempt.auto_submitted_reason}</Badge>
        )}
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <ScoreCard icon={<Trophy className="h-5 w-5" />} label="Score" value={`${attempt.total_score ?? 0} / ${attempt.max_score ?? 0}`} />
        <ScoreCard icon={<Target className="h-5 w-5" />} label="Percentile" value={`${attempt.percentile ?? 0}`} />
        <ScoreCard icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} label="Correct" value={attempt.total_correct ?? 0} />
        <ScoreCard icon={<XCircle className="h-5 w-5 text-red-500" />} label="Incorrect" value={attempt.total_incorrect ?? 0} />
      </div>

      <Card className="p-5 mb-6">
        <h2 className="font-semibold mb-3">Sectional Performance</h2>
        <div className="space-y-2">
          {Object.entries(sectionalScores).map(([sid, sec]: [string, any]) => (
            <div key={sid} className="flex items-center justify-between border rounded-md p-3 text-sm">
              <div>
                <div className="font-medium">{sec.name} ({sec.code})</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Attempted: {sec.attempted} · Correct: {sec.correct} · Incorrect: {sec.incorrect}
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{sec.score} / {sec.max}</div>
                <div className="text-xs text-muted-foreground">
                  {sec.max > 0 ? Math.round((sec.score / sec.max) * 100) : 0}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex gap-3 flex-wrap">
        <Button onClick={() => navigate(`/mocks/review/${attempt.id}`)}>Question-by-question Review</Button>
        {test?.slug && (
          <Button variant="outline" onClick={() => navigate(`/mocks/leaderboard/${test.slug}`)}>Leaderboard</Button>
        )}
        <Button variant="outline" onClick={() => navigate("/dashboard/mocks")}>My Mocks</Button>
        <Button variant="ghost" onClick={() => navigate("/mocks")}>All Mocks</Button>
      </div>
    </div>
  );
}

function ScoreCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase">
        {icon}{label}
      </div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </Card>
  );
}
