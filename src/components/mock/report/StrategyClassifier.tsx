import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ZAxis, ReferenceLine } from "recharts";

export type Strategy = "Aggressive" | "Balanced" | "Conservative";

export function classifyStrategy(attemptRate: number, accuracy: number): { label: Strategy; description: string; color: string } {
  if (attemptRate >= 80 && accuracy < 65) return { label: "Aggressive", description: "You attempted most questions but accuracy slipped. Be more selective in low-confidence Qs.", color: "hsl(0 80% 60%)" };
  if (attemptRate >= 65 && accuracy >= 65) return { label: "Balanced", description: "Healthy mix of attempts and accuracy. Push attempt rate up gradually without sacrificing accuracy.", color: "hsl(142 70% 45%)" };
  return { label: "Conservative", description: "Low attempt rate. You may be skipping winnable questions — practice question-selection drills.", color: "hsl(210 90% 56%)" };
}

export default function StrategyClassifier({
  attemptRate, accuracy, sectionPoints,
}: {
  attemptRate: number; // percentage
  accuracy: number; // percentage
  sectionPoints: Array<{ name: string; attemptRate: number; accuracy: number }>;
}) {
  const c = classifyStrategy(attemptRate, accuracy);

  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4 text-sky-600" /> Attempt Strategy
      </h3>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Badge style={{ backgroundColor: c.color, color: "white" }} className="text-sm px-3 py-1">{c.label}</Badge>
        <p className="text-sm text-muted-foreground">{c.description}</p>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" dataKey="attemptRate" name="Attempt %" domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: "Attempt %", position: "insideBottom", offset: -5, fontSize: 11 }} />
          <YAxis type="number" dataKey="accuracy" name="Accuracy %" domain={[0, 100]} tick={{ fontSize: 11 }} label={{ value: "Accuracy %", angle: -90, position: "insideLeft", fontSize: 11 }} />
          <ZAxis range={[80, 200]} />
          <ReferenceLine x={70} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <ReferenceLine y={65} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <Scatter data={[{ attemptRate, accuracy, name: "Overall" }]} fill="hsl(0 80% 55%)" />
          <Scatter data={sectionPoints} fill="hsl(210 90% 70%)" />
        </ScatterChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground mt-2">Top-right quadrant = ideal zone. Red = overall, blue = sections.</p>
    </Card>
  );
}
