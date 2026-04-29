import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";

type Stats = { myScore: number; avg: number; top10: number; topper: number };

export default function PeerBenchmark({ stats }: { stats: Stats | null }) {
  if (!stats) return null;
  const max = Math.max(stats.topper, stats.myScore, 1);
  const items = [
    { label: "You", value: stats.myScore, color: "hsl(0 80% 55%)", highlight: true },
    { label: "Average", value: Math.round(stats.avg), color: "hsl(142 70% 45%)" },
    { label: "Top 10%", value: stats.top10, color: "hsl(210 90% 56%)" },
    { label: "Topper", value: stats.topper, color: "hsl(45 95% 55%)" },
  ];
  const gapToTop10 = stats.top10 - stats.myScore;
  const gapToTopper = stats.topper - stats.myScore;

  return (
    <Card className="p-5">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-500" /> Peer Benchmarking
      </h3>
      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.label}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className={`font-medium ${it.highlight ? "text-rose-600" : ""}`}>{it.label}</span>
              <span className="font-semibold">{it.value}</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${(it.value / max) * 100}%`, backgroundColor: it.color }} />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 mt-5">
        <div className="border rounded-lg p-3 bg-sky-50/40">
          <div className="text-xs text-muted-foreground">Gap to Top 10%</div>
          <div className="text-2xl font-bold mt-0.5">{gapToTop10 > 0 ? `+${gapToTop10}` : gapToTop10}</div>
          <p className="text-xs text-muted-foreground mt-0.5">{gapToTop10 > 0 ? "marks needed" : "you're in the top 10%!"}</p>
        </div>
        <div className="border rounded-lg p-3 bg-amber-50/40">
          <div className="text-xs text-muted-foreground">Gap to Topper</div>
          <div className="text-2xl font-bold mt-0.5">{gapToTopper > 0 ? `+${gapToTopper}` : "0"}</div>
          <p className="text-xs text-muted-foreground mt-0.5">{gapToTopper > 0 ? "marks to the top" : "you're the topper!"}</p>
        </div>
      </div>
    </Card>
  );
}
