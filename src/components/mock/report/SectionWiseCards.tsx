import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Award } from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

export type SectionRow = {
  id: string;
  code: string;
  name: string;
  score: number;
  max: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  timeSec: number;
  idealSec: number;
};

export default function SectionWiseCards({ rows }: { rows: SectionRow[] }) {
  if (!rows.length) return null;
  return (
    <div className="space-y-4">
      {rows.map((s) => {
        const pct = s.max > 0 ? Math.round((s.score / s.max) * 100) : 0;
        const accuracy = s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0;
        const donut = [
          { name: "Correct", value: s.correct, color: "hsl(142 70% 45%)" },
          { name: "Incorrect", value: s.incorrect, color: "hsl(0 80% 60%)" },
          { name: "Skipped", value: s.unattempted, color: "hsl(215 20% 70%)" },
        ];
        const timeData = [
          { label: "You", time: Math.round(s.timeSec / 60) },
          { label: "Ideal", time: Math.round(s.idealSec / 60) },
        ];
        const overTime = s.timeSec > s.idealSec * 1.1;
        const underTime = s.timeSec < s.idealSec * 0.7;
        return (
          <Card key={s.id} className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-sky-600" />
                  <h3 className="font-semibold">{s.name}</h3>
                  <Badge variant="outline">{s.code}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {s.score} / {s.max} marks · {accuracy}% accuracy
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {overTime && <Badge variant="destructive">Spent too long</Badge>}
                {underTime && <Badge className="bg-amber-500 hover:bg-amber-500">Rushed section</Badge>}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {/* Score bar */}
              <div>
                <div className="text-xs text-muted-foreground mb-1">Score</div>
                <Progress value={pct} className="h-2.5" />
                <div className="flex justify-between text-xs mt-1">
                  <span>{pct}%</span>
                  <span className="text-muted-foreground">{s.attempted}/{s.attempted + s.unattempted} attempted</span>
                </div>
              </div>
              {/* Donut */}
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donut} dataKey="value" innerRadius={32} outerRadius={56} paddingAngle={2}>
                      {donut.map((d) => <Cell key={d.name} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-3 text-[10px] -mt-2">
                  {donut.map((d) => (
                    <span key={d.name} className="flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-full" style={{ background: d.color }} />
                      {d.name}: {d.value}
                    </span>
                  ))}
                </div>
              </div>
              {/* Time vs Ideal */}
              <div className="h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} label={{ value: "min", angle: -90, position: "insideLeft", fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="time" radius={[4, 4, 0, 0]}>
                      <Cell fill="hsl(210 90% 56%)" />
                      <Cell fill="hsl(142 70% 45%)" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
