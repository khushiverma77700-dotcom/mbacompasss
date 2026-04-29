import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";
import { ListChecks } from "lucide-react";

export type QRow = {
  qNum: number;
  sectionCode: string;
  difficulty: string;
  topic: string | null;
  status: "correct" | "incorrect" | "skipped";
  timeSec: number;
  idealSec: number;
  tags: string[]; // "silly mistake", "conceptual", "missed easy", "slow win"
};

export default function QuestionLevelTable({ rows }: { rows: QRow[] }) {
  const [statusFilter, setStatusFilter] = useState<"all" | QRow["status"]>("all");
  const [diffFilter, setDiffFilter] = useState<"all" | string>("all");

  const filtered = useMemo(
    () => rows.filter((r) => (statusFilter === "all" || r.status === statusFilter) && (diffFilter === "all" || r.difficulty.toLowerCase() === diffFilter)),
    [rows, statusFilter, diffFilter],
  );

  const outcomeData = useMemo(() => {
    const m = { correct: 0, incorrect: 0, skipped: 0 };
    rows.forEach((r) => { m[r.status]++; });
    return [
      { name: "Correct", value: m.correct, color: "hsl(142 70% 45%)" },
      { name: "Incorrect", value: m.incorrect, color: "hsl(0 80% 60%)" },
      { name: "Skipped", value: m.skipped, color: "hsl(215 20% 70%)" },
    ];
  }, [rows]);

  const diffData = useMemo(() => {
    const m: Record<string, { difficulty: string; correct: number; incorrect: number; skipped: number }> = {};
    rows.forEach((r) => {
      const d = (r.difficulty || "unknown").charAt(0).toUpperCase() + (r.difficulty || "unknown").slice(1);
      if (!m[d]) m[d] = { difficulty: d, correct: 0, incorrect: 0, skipped: 0 };
      m[d][r.status]++;
    });
    return Object.values(m);
  }, [rows]);

  const sillies = rows.filter((r) => r.tags.includes("silly mistake")).length;
  const conceptual = rows.filter((r) => r.tags.includes("conceptual")).length;
  const missedEasy = rows.filter((r) => r.tags.includes("missed easy")).length;

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-3">
        <Card className="p-4 bg-rose-50/50 border-rose-200">
          <div className="text-xs uppercase tracking-wide text-rose-700">Silly Mistakes</div>
          <div className="text-3xl font-bold mt-1">{sillies}</div>
          <p className="text-xs text-muted-foreground mt-1">Wrong answers solved in &lt; 30s — review the basics again.</p>
        </Card>
        <Card className="p-4 bg-amber-50/50 border-amber-200">
          <div className="text-xs uppercase tracking-wide text-amber-700">Conceptual Gaps</div>
          <div className="text-3xl font-bold mt-1">{conceptual}</div>
          <p className="text-xs text-muted-foreground mt-1">Wrong despite spending 1.5× ideal time — concept needs work.</p>
        </Card>
        <Card className="p-4 bg-sky-50/50 border-sky-200">
          <div className="text-xs uppercase tracking-wide text-sky-700">Missed Easy</div>
          <div className="text-3xl font-bold mt-1">{missedEasy}</div>
          <p className="text-xs text-muted-foreground mt-1">Easy questions you skipped — guaranteed marks left on the table.</p>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Outcome Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={outcomeData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={2} label>
                {outcomeData.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold mb-3">Outcomes by Difficulty</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={diffData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="difficulty" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="correct" stackId="a" fill="hsl(142 70% 45%)" />
              <Bar dataKey="incorrect" stackId="a" fill="hsl(0 80% 60%)" />
              <Bar dataKey="skipped" stackId="a" fill="hsl(215 20% 70%)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-sky-600" /> Question-Level Breakdown
          </h3>
          <div className="flex flex-wrap gap-2">
            {(["all", "correct", "incorrect", "skipped"] as const).map((s) => (
              <Button key={s} size="sm" variant={statusFilter === s ? "default" : "outline"} onClick={() => setStatusFilter(s)}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
            {(["all", "easy", "moderate", "hard"] as const).map((d) => (
              <Button key={d} size="sm" variant={diffFilter === d ? "secondary" : "outline"} onClick={() => setDiffFilter(d)}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </Button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b">
              <tr>
                <th className="text-left py-2 px-2">Q#</th>
                <th className="text-left py-2 px-2">Section</th>
                <th className="text-left py-2 px-2">Topic</th>
                <th className="text-left py-2 px-2">Difficulty</th>
                <th className="text-left py-2 px-2">Status</th>
                <th className="text-right py-2 px-2">Time</th>
                <th className="text-left py-2 px-2">Tags</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((r, i) => (
                <tr key={i} className="border-b hover:bg-muted/30">
                  <td className="py-2 px-2 font-mono">{r.qNum}</td>
                  <td className="py-2 px-2">{r.sectionCode}</td>
                  <td className="py-2 px-2 max-w-[200px] truncate" title={r.topic ?? ""}>{r.topic || "—"}</td>
                  <td className="py-2 px-2 capitalize">{r.difficulty}</td>
                  <td className="py-2 px-2">
                    <Badge variant={r.status === "correct" ? "default" : r.status === "incorrect" ? "destructive" : "outline"}
                      className={r.status === "correct" ? "bg-green-600 hover:bg-green-600" : ""}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="py-2 px-2 text-right font-mono">{r.timeSec}s</td>
                  <td className="py-2 px-2">
                    <div className="flex flex-wrap gap-1">
                      {r.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 200 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">Showing first 200 of {filtered.length} questions.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
