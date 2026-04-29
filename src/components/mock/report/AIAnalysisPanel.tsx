import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Lightbulb, AlertTriangle, BookOpen, ChevronRight, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AIAnalysisPanel({ attemptId }: { attemptId: string }) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<any>(null);

  async function run() {
    if (!attemptId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-mock-insights", {
        body: { attempt_id: attemptId },
      });
      if (error) throw error;
      setInsights(data?.insights ?? null);
      toast.success("AI analysis ready");
    } catch (e: any) {
      toast.error("Could not generate AI analysis", { description: e?.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-6 border-sky-200 bg-gradient-to-br from-sky-50/60 via-white to-white">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-sky-100 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-sky-600" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">AI-Powered Deep Analysis</h2>
            <p className="text-xs text-muted-foreground">Optional · Runs only when you click. Powered by Lovable AI.</p>
          </div>
        </div>
        {!insights && (
          <Button onClick={run} disabled={loading} className="bg-sky-600 hover:bg-sky-700 text-white gap-2">
            <Sparkles className="h-4 w-4" />
            {loading ? "Analyzing…" : "Run AI Analysis"}
          </Button>
        )}
        {insights && (
          <Button variant="outline" size="sm" onClick={run} disabled={loading}>
            Regenerate
          </Button>
        )}
      </div>

      {loading && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
          <Skeleton className="h-32 w-full mt-3" />
        </div>
      )}

      {!loading && !insights && (
        <p className="text-sm text-muted-foreground">
          Click <strong>Run AI Analysis</strong> for personalized recommendations, priority improvements,
          and a 7-day study plan based on this attempt.
        </p>
      )}

      {insights && (
        <div className="space-y-5">
          {insights.summary && (
            <div className="p-4 rounded-lg bg-white border">
              <p className="text-sm leading-relaxed">{insights.summary}</p>
            </div>
          )}

          {insights.recommendations?.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                <Lightbulb className="h-4 w-4 text-amber-500" /> Recommendations
              </h3>
              <div className="grid md:grid-cols-2 gap-3">
                {insights.recommendations.map((r: any, i: number) => (
                  <div key={i} className="border rounded-lg p-3 bg-white">
                    <div className="font-semibold text-sm">{r.title}</div>
                    {r.action && <p className="text-xs text-muted-foreground mt-1.5">{r.action}</p>}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {r.time_commitment && <Badge variant="outline" className="text-[10px]">{r.time_commitment}</Badge>}
                      {r.expected_impact && <Badge variant="secondary" className="text-[10px]">{r.expected_impact}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.weaknesses?.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-rose-500" /> Priority Improvements
              </h3>
              <div className="space-y-2">
                {insights.weaknesses.map((w: any, i: number) => (
                  <div key={i} className="border-l-4 pl-3 py-1.5 bg-white rounded-r"
                    style={{ borderColor: w.priority === "high" ? "hsl(0 80% 60%)" : w.priority === "medium" ? "hsl(45 95% 55%)" : "hsl(215 20% 70%)" }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{w.area}</span>
                      {w.priority && <Badge variant={w.priority === "high" ? "destructive" : "secondary"} className="text-[10px]">{w.priority}</Badge>}
                    </div>
                    {w.suggestion && <p className="text-xs mt-1">{w.suggestion}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.strengths?.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-green-600" /> Strengths to Capitalize
              </h3>
              <div className="grid md:grid-cols-2 gap-2">
                {insights.strengths.map((s: any, i: number) => (
                  <div key={i} className="border-l-4 border-green-500 pl-3 py-1.5 bg-white rounded-r text-sm">
                    <div className="font-semibold">{s.area}</div>
                    {s.suggestion && <p className="text-xs text-muted-foreground mt-0.5">{s.suggestion}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.study_plan?.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4 text-sky-600" /> 7-Day Study Plan
              </h3>
              <div className="space-y-2">
                {insights.study_plan.map((d: any, i: number) => (
                  <div key={i} className="border rounded-lg p-3 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-sky-100 text-sky-700 font-bold text-sm flex items-center justify-center shrink-0">
                        D{d.day || i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm">{d.focus}</div>
                        {d.hours && <div className="text-xs text-muted-foreground">{d.hours} hours</div>}
                      </div>
                    </div>
                    {d.tasks?.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs text-foreground/80 ml-12">
                        {d.tasks.map((t: string, j: number) => (
                          <li key={j} className="flex items-start gap-1.5">
                            <ChevronRight className="h-3 w-3 mt-0.5 text-sky-600 shrink-0" />
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
