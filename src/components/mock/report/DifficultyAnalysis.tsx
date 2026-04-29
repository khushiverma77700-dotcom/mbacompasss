import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell } from "recharts";

export type DiffRow = { difficulty: string; attempted: number; correct: number; accuracy: number; total: number };

export default function DifficultyAnalysis({ rows }: { rows: DiffRow[] }) {
  if (!rows.length) return null;
  const tags: string[] = [];
  const easy = rows.find((r) => r.difficulty.toLowerCase() === "easy");
  const hard = rows.find((r) => r.difficulty.toLowerCase() === "hard");
  if (easy && easy.accuracy < 70) tags.push("Weak in Easy");
  if (easy && easy.accuracy >= 85) tags.push("Strong in Easy");
  if (hard && hard.accuracy >= 60) tags.push("Strong in Hard");
  if (hard && hard.accuracy < 30) tags.push("Hard questions need work");

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-500" /> Accuracy by Difficulty
        </h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="difficulty" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} label={{ value: "Accuracy %", angle: -90, position: "insideLeft", fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="accuracy" radius={[6, 6, 0, 0]}>
              {rows.map((r, i) => (
                <Cell key={i} fill={
                  r.accuracy >= 75 ? "hsl(142 70% 45%)" :
                  r.accuracy >= 50 ? "hsl(45 95% 55%)" :
                  "hsl(0 80% 60%)"
                } />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold mb-4">Attempts vs Total per Difficulty</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="difficulty" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="attempted" name="Attempted" fill="hsl(210 90% 56%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="total" name="Total" fill="hsl(210 30% 80%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
          </div>
        )}
      </Card>
    </div>
  );
}
