import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export type TrendPoint = { label: string; score: number; accuracy: number; percentile?: number; maxScore?: number };

export default function ProgressTrend({ points }: { points: TrendPoint[] }) {
  if (!points || points.length < 2) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        <TrendingUp className="h-5 w-5 mx-auto mb-2 text-sky-600" />
        Take more mocks of this exam to see your progress trend over time.
      </Card>
    );
  }
  const data = points.map((p) => ({
    ...p,
    scorePct: p.maxScore && p.maxScore > 0 ? Math.round((p.score / p.maxScore) * 100) : null,
  }));

  // Compute clean left-axis domain so we never show negative values for scores.
  const maxScore = Math.max(...data.map((d) => d.score), 10);
  const leftMax = Math.ceil(maxScore * 1.1);

  return (
    <Card className="p-3 sm:p-5 overflow-hidden">
      <h3 className="font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
        <TrendingUp className="h-4 w-4 text-sky-600 shrink-0" />
        <span className="truncate">Progress Across Last {points.length} Mocks</span>
      </h3>
      <div className="w-full" style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="left" domain={[0, leftMax]} tick={{ fontSize: 10 }} width={32} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10 }} width={28} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} iconSize={8} />
            <Line yAxisId="left" type="monotone" dataKey="score" stroke="hsl(210 90% 56%)" name="Score" strokeWidth={2} dot={{ r: 3 }} />
            <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="hsl(142 70% 45%)" name="Accuracy %" strokeWidth={2} dot={{ r: 3 }} />
            {data.some((d) => d.scorePct != null) && (
              <Line yAxisId="right" type="monotone" dataKey="scorePct" stroke="hsl(280 70% 55%)" name="Score %" strokeWidth={2} dot={{ r: 3 }} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
