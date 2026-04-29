import { Card } from "@/components/ui/card";
import { Trophy, Target, Activity, Clock, ListChecks } from "lucide-react";

type KPI = {
  totalScore: number;
  maxScore: number;
  percentile: number;
  accuracy: number;
  attempted: number;
  totalQuestions: number;
  timeUsedSec: number;
  totalTimeSec: number;
};

export default function KPIGrid({ data }: { data: KPI }) {
  const scorePct = data.maxScore > 0 ? Math.round((data.totalScore / data.maxScore) * 100) : 0;
  const timeUsedMin = Math.round(data.timeUsedSec / 60);
  const totalTimeMin = Math.round(data.totalTimeSec / 60);
  const utilization = data.totalTimeSec > 0 ? Math.round((data.timeUsedSec / data.totalTimeSec) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Card className="p-4 bg-gradient-to-br from-amber-50 to-amber-100/30 border-amber-200">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-amber-700">
          <Trophy className="h-4 w-4" /> Total Score
        </div>
        <div className="text-2xl font-bold mt-1.5">{data.totalScore}</div>
        <div className="text-xs text-muted-foreground mt-0.5">/ {data.maxScore} ({scorePct}%)</div>
      </Card>
      <Card className="p-4 bg-gradient-to-br from-sky-50 to-sky-100/30 border-sky-200">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-sky-700">
          <Target className="h-4 w-4" /> Percentile
        </div>
        <div className="text-2xl font-bold mt-1.5">{data.percentile}</div>
        <div className="text-xs text-muted-foreground mt-0.5">vs all test-takers</div>
      </Card>
      <Card className="p-4 bg-gradient-to-br from-green-50 to-green-100/30 border-green-200">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-green-700">
          <Activity className="h-4 w-4" /> Accuracy
        </div>
        <div className="text-2xl font-bold mt-1.5">{data.accuracy}%</div>
        <div className="text-xs text-muted-foreground mt-0.5">of attempted correct</div>
      </Card>
      <Card className="p-4 bg-gradient-to-br from-violet-50 to-violet-100/30 border-violet-200">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-violet-700">
          <ListChecks className="h-4 w-4" /> Attempted
        </div>
        <div className="text-2xl font-bold mt-1.5">{data.attempted}</div>
        <div className="text-xs text-muted-foreground mt-0.5">/ {data.totalQuestions} questions</div>
      </Card>
      <Card className="p-4 bg-gradient-to-br from-blue-50 to-blue-100/30 border-blue-200">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-blue-700">
          <Clock className="h-4 w-4" /> Time Used
        </div>
        <div className="text-2xl font-bold mt-1.5">{timeUsedMin}m</div>
        <div className="text-xs text-muted-foreground mt-0.5">{totalTimeMin > 0 ? `of ${totalTimeMin}m (${utilization}%)` : "—"}</div>
      </Card>
    </div>
  );
}
