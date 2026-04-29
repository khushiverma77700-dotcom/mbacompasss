import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, BookOpen } from "lucide-react";

export type TopicRow = { topic: string; attempted: number; correct: number; accuracy: number };

function heatColor(pct: number) {
  if (pct >= 80) return "hsl(142 70% 88%)";
  if (pct >= 65) return "hsl(95 70% 88%)";
  if (pct >= 50) return "hsl(50 95% 88%)";
  if (pct >= 35) return "hsl(30 95% 88%)";
  return "hsl(0 75% 90%)";
}
function heatBorder(pct: number) {
  if (pct >= 80) return "hsl(142 70% 60%)";
  if (pct >= 65) return "hsl(95 70% 55%)";
  if (pct >= 50) return "hsl(50 90% 55%)";
  if (pct >= 35) return "hsl(30 90% 55%)";
  return "hsl(0 75% 65%)";
}

export default function StrengthsWeaknesses({ topics }: { topics: TopicRow[] }) {
  const strengths = topics.filter((t) => t.attempted >= 2 && t.accuracy >= 70).slice(0, 6);
  const weaknesses = topics.filter((t) => t.attempted >= 2 && t.accuracy < 50).slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 border-green-200 bg-green-50/30">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-green-700">
            <TrendingUp className="h-4 w-4" /> Strengths
          </h3>
          {strengths.length === 0 ? (
            <p className="text-sm text-muted-foreground">Attempt more questions per topic to surface strengths.</p>
          ) : (
            <div className="space-y-2">
              {strengths.map((t) => (
                <div key={t.topic} className="flex items-center justify-between text-sm bg-white rounded-md p-2.5 border border-green-100">
                  <div>
                    <div className="font-medium">{t.topic}</div>
                    <div className="text-xs text-muted-foreground">{t.correct}/{t.attempted} correct</div>
                  </div>
                  <Badge className="bg-green-600 hover:bg-green-600">{t.accuracy}%</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="p-5 border-red-200 bg-red-50/30">
          <h3 className="font-semibold mb-3 flex items-center gap-2 text-red-700">
            <TrendingDown className="h-4 w-4" /> Weaknesses
          </h3>
          {weaknesses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clear weak topics — well rounded!</p>
          ) : (
            <div className="space-y-2">
              {weaknesses.map((t) => (
                <div key={t.topic} className="flex items-center justify-between text-sm bg-white rounded-md p-2.5 border border-red-100">
                  <div>
                    <div className="font-medium">{t.topic}</div>
                    <div className="text-xs text-muted-foreground">{t.correct}/{t.attempted} correct</div>
                  </div>
                  <Badge variant="destructive">{t.accuracy}%</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-sky-600" /> Topic Mastery Heatmap
        </h3>
        {topics.length === 0 ? (
          <p className="text-sm text-muted-foreground">No topic-tagged questions in this attempt.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {topics.map((t) => (
                <div key={t.topic} className="rounded-md p-3 border text-xs"
                  style={{ backgroundColor: heatColor(t.accuracy), borderColor: heatBorder(t.accuracy) }}>
                  <div className="font-semibold line-clamp-1" title={t.topic}>{t.topic}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span>{t.correct}/{t.attempted}</span>
                    <span className="font-bold">{t.accuracy}%</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <span>Low</span>
              <div className="flex gap-0.5">
                {[10, 30, 50, 70, 90].map((v) => (
                  <div key={v} className="h-3 w-6 rounded-sm" style={{ backgroundColor: heatColor(v) }} />
                ))}
              </div>
              <span>High Mastery</span>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
