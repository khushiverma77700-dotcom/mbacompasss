import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Gauge } from "lucide-react";
import { buildRadarData, type ScoreBreakdown } from "@/lib/profileScoring";

interface Props { breakdown?: ScoreBreakdown }

export const RadarChartCard = ({ breakdown }: Props) => {
  const data = buildRadarData(breakdown);
  if (!data.length) return null;

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-primary" /> Profile Radar — You vs Top 1%
        </CardTitle>
        <CardDescription>Six-dimension profile fingerprint with top-percentile benchmark overlay.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="78%">
              <PolarGrid stroke="hsl(var(--border))" />
              <PolarAngleAxis dataKey="axis" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
              <Radar name="You" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.45} />
              <Radar name="Top 1%" dataKey="benchmark" stroke="hsl(var(--accent-foreground))" fill="hsl(var(--accent))" fillOpacity={0.15} strokeDasharray="4 4" />
              <Legend />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default RadarChartCard;
