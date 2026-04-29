import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
  LineChart, Line,
} from "recharts";

type SectionTime = { name: string; correctTime: number; wrongTime: number; skippedTime: number };
type Histogram = { bucket: string; count: number };
type SpeedAcc = { idx: number; speedSec: number; accuracy: number };

export default function TimeManagementCharts({
  perSection, histogram, speedAcc,
}: {
  perSection: SectionTime[];
  histogram: Histogram[];
  speedAcc: SpeedAcc[];
}) {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Clock className="h-4 w-4 text-sky-600" /> Time Spent per Section (Stacked)
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={perSection}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} label={{ value: "minutes", angle: -90, position: "insideLeft", fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="correctTime" stackId="t" name="On correct" fill="hsl(142 70% 45%)" />
            <Bar dataKey="wrongTime" stackId="t" name="On incorrect" fill="hsl(0 80% 60%)" />
            <Bar dataKey="skippedTime" stackId="t" name="On skipped" fill="hsl(215 20% 70%)" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Time-per-Question Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={histogram}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} label={{ value: "questions", angle: -90, position: "insideLeft", fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(210 90% 56%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="font-semibold mb-4">Speed vs Accuracy (rolling 5-Q window)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={speedAcc}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="idx" tick={{ fontSize: 11 }} label={{ value: "Question #", position: "insideBottom", offset: -5, fontSize: 11 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} label={{ value: "sec/Q", angle: -90, position: "insideLeft", fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="speedSec" stroke="hsl(210 90% 56%)" name="Avg time/Q" dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="hsl(142 70% 45%)" name="Accuracy %" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
