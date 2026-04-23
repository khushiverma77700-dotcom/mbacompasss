import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, Legend } from "recharts";
import { IndianRupee } from "lucide-react";
import { buildROIScatter, type CollegeRow } from "@/lib/profileScoring";

interface Props { rows?: CollegeRow[] }

const tierColor: Record<string, string> = {
  Dream: "hsl(var(--primary))",
  Target: "#f59e0b",
  Safe: "#10b981",
};

export const ROIScatterCard = ({ rows }: Props) => {
  const data = buildROIScatter(rows);
  if (!data.length) return null;

  const grouped: Record<string, typeof data> = { Dream: [], Target: [], Safe: [] };
  data.forEach((d) => {
    if (grouped[d.tier]) grouped[d.tier].push(d);
    else grouped.Target.push(d);
  });

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <IndianRupee className="w-5 h-5 text-primary" /> ROI Map — Fees vs Average Salary
        </CardTitle>
        <CardDescription>Each dot is a college. Bubble size = your admission chance. Top-left = best ROI.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 16, right: 16, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                type="number"
                dataKey="fees"
                name="Fees"
                unit="L"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                label={{ value: "Total Fees (₹ Lakhs)", position: "insideBottom", offset: -2, fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis
                type="number"
                dataKey="salary"
                name="Avg Salary"
                unit="L"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                label={{ value: "Avg Salary (LPA)", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <ZAxis type="number" dataKey="chance" range={[60, 400]} name="Your Chance" />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as any;
                  return (
                    <div className="bg-card border border-border rounded-md p-2 text-xs">
                      <p className="font-bold">{p.college}</p>
                      <p>Fees: ₹{p.fees}L</p>
                      <p>Avg Salary: ₹{p.salary} LPA</p>
                      <p>Your Chance: {p.chance}%</p>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {(["Dream", "Target", "Safe"] as const).map((tier) => (
                <Scatter key={tier} name={tier} data={grouped[tier]} fill={tierColor[tier]} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default ROIScatterCard;
