import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Layers } from "lucide-react";
import { buildHeatmapData, heatColor, type CollegeRow } from "@/lib/profileScoring";

interface Props { rows?: CollegeRow[] }

export const CollegeFitHeatmap = ({ rows }: Props) => {
  const cells = buildHeatmapData(rows, 10);
  if (!cells.length) return null;

  const colleges = Array.from(new Set(cells.map((c) => c.college)));
  const metrics = Array.from(new Set(cells.map((c) => c.metric)));

  const cellMap = new Map(cells.map((c) => [`${c.college}|${c.metric}`, c]));

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" /> College Fit Heatmap
        </CardTitle>
        <CardDescription>Top 10 colleges scored across 4 dimensions. Greener = better fit for you.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="text-left font-semibold px-2 py-2 sticky left-0 bg-card min-w-[180px]">College</th>
                {metrics.map((m) => (
                  <th key={m} className="text-center font-semibold px-2 py-2 whitespace-nowrap">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {colleges.map((college, i) => (
                <tr key={college} className={i % 2 === 0 ? "bg-card" : "bg-muted/20"}>
                  <td className="px-2 py-2 font-semibold sticky left-0 bg-inherit">{college}</td>
                  {metrics.map((m) => {
                    const cell = cellMap.get(`${college}|${m}`);
                    if (!cell) return <td key={m} className="px-2 py-2 text-center text-muted-foreground">—</td>;
                    return (
                      <td key={m} className="px-1 py-1">
                        <div className={`rounded-md px-2 py-1.5 text-center font-bold ${heatColor(cell.score)}`}>
                          {cell.raw}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
          <span>Scale:</span>
          <span className="px-2 py-0.5 rounded bg-rose-300/80 text-rose-900">Low</span>
          <span className="px-2 py-0.5 rounded bg-amber-300/80 text-amber-900">Medium</span>
          <span className="px-2 py-0.5 rounded bg-emerald-400/70 text-emerald-900">Good</span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/90 text-white">Excellent</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default CollegeFitHeatmap;
