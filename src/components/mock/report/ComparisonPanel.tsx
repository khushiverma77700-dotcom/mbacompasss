import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  ScatterChart, Scatter, ZAxis,
} from "recharts";

type Stats = {
  myScore: number;
  myAccuracy: number;
  myAttempts: number;
  avg: number;
  top10: number;
  topper: number;
  count: number;
  scatter?: Array<{ attempts: number; accuracy: number; isMe?: boolean }>;
};

export default function ComparisonPanel({ stats }: { stats: Stats | null }) {
  if (!stats) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        Peer comparison will appear once more students have completed this mock.
      </Card>
    );
  }
  const data = [
    { name: "You", score: stats.myScore },
    { name: "Average", score: Math.round(stats.avg * 100) / 100 },
    { name: "Top 10%", score: stats.top10 },
    { name: "Topper", score: stats.topper },
  ];
  const gap = stats.topper - stats.myScore;
  const verdict =
    stats.myScore > stats.avg
      ? `You scored ${Math.round(stats.myScore - stats.avg)} marks above the average — keep pushing.`
      : `You are ${Math.round(stats.avg - stats.myScore)} marks below average. Focus on quick wins in your weak sections.`;

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <Card className="p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-sky-600" /> Score Comparison
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="score" fill="hsl(210 90% 56%)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground mt-2">{verdict} Topper is {gap > 0 ? `${gap} marks` : "matched"} ahead.</p>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-4">Attempts vs Accuracy (Peers)</h3>
        {stats.scatter && stats.scatter.length > 1 ? (
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="attempts" name="Attempts" tick={{ fontSize: 11 }} label={{ value: "Attempts", position: "insideBottom", offset: -5, fontSize: 11 }} />
              <YAxis dataKey="accuracy" name="Accuracy %" tick={{ fontSize: 11 }} domain={[0, 100]} label={{ value: "Accuracy %", angle: -90, position: "insideLeft", fontSize: 11 }} />
              <ZAxis range={[60, 200]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Scatter
                data={stats.scatter.map((p) => ({ ...p, fill: p.isMe ? "hsl(0 80% 55%)" : "hsl(210 90% 70%)" }))}
                fill="hsl(210 90% 70%)"
              />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
            Not enough peer data yet.
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">Red dot = you. Aim for the top-right quadrant (high attempts, high accuracy).</p>
      </Card>
    </div>
  );
}
