import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

export type TrendPoint = { label: string; score: number; accuracy: number; percentile: number };

export default function ProgressTrend({ points }: { points: TrendPoint[] }) {
  if (!points || points.length < 2) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        <TrendingUp className="h-5 w-5 mx-auto mb-2 text-sky-600" />
        Take more mocks of this exam to see your progress trend over time.
      </Card>
    );
  }
  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-sky-600" /> Progress Across Last {points.length} Mocks
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={points}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
          <Tooltip />
          <Legend />
          <Line yAxisId="left" type="monotone" dataKey="score" stroke="hsl(210 90% 56%)" name="Score" strokeWidth={2} />
          <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="hsl(142 70% 45%)" name="Accuracy %" strokeWidth={2} />
          <Line yAxisId="right" type="monotone" dataKey="percentile" stroke="hsl(280 70% 55%)" name="Percentile" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}
