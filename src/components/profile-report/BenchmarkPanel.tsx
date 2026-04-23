import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Trophy } from "lucide-react";
import { buildBenchmark, type ScoreBreakdown, type ProfileInputLite } from "@/lib/profileScoring";
import ActionableInsight from "./ActionableInsight";

interface Props { breakdown?: ScoreBreakdown; profile: ProfileInputLite; rankPercentile?: number }

export const BenchmarkPanel = ({ breakdown, profile, rankPercentile }: Props) => {
  const data = buildBenchmark(breakdown, profile);
  if (!data.length) return null;

  const youAvg = Math.round(data.reduce((a, b) => a + b.you, 0) / data.length);
  const peerAvg = Math.round(data.reduce((a, b) => a + b.peer, 0) / data.length);
  const top1Avg = Math.round(data.reduce((a, b) => a + b.top1, 0) / data.length);

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" /> Benchmarking — Where You Stand
        </CardTitle>
        <CardDescription>You vs typical aspirant vs Top 1% converts. Synthesised from public CAT/IIM cutoff data.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl p-3 bg-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground">Your Avg</p>
            <p className="text-2xl font-bold text-primary">{youAvg}</p>
          </div>
          <div className="rounded-xl p-3 bg-muted/30">
            <p className="text-xs text-muted-foreground">Peer Avg</p>
            <p className="text-2xl font-bold">{peerAvg}</p>
          </div>
          <div className="rounded-xl p-3 bg-emerald-50 dark:bg-emerald-950/30">
            <p className="text-xs text-emerald-700 dark:text-emerald-400">Top 1% Avg</p>
            <p className="text-2xl font-bold text-emerald-600">{top1Avg}</p>
          </div>
        </div>

        <div className="w-full h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="dimension" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="you" name="You" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="peer" name="Peer Avg" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="top1" name="Top 1%" fill="hsl(var(--accent-foreground))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {typeof rankPercentile === "number" && (
          <ActionableInsight
            level={rankPercentile >= 80 ? "good" : rankPercentile >= 50 ? "info" : "warn"}
            title={`You rank in the Top ${100 - rankPercentile}% of similar aspirants`}
          >
            Based on your current dimensions, you outperform {rankPercentile}% of peers with comparable academics, work-ex and stream.
          </ActionableInsight>
        )}
      </CardContent>
    </Card>
  );
};

export default BenchmarkPanel;
