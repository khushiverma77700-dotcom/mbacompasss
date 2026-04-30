import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles, Lightbulb, AlertTriangle, BookOpen, ChevronRight, TrendingUp,
  Brain, Clock, Target, Activity, Bell, Gauge, ShieldAlert, Heart, Compass
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Insights = any;

function Section({ icon: Icon, title, color, children }: any) {
  return (
    <div className="rounded-xl border bg-white overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-slate-50/60">
        <div className={`h-7 w-7 rounded-md flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function AIAnalysisPanel({ attemptId }: { attemptId: string }) {
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insights>(null);

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
            <h2 className="font-semibold text-lg">AI Mentor — Deep Analysis</h2>
            <p className="text-xs text-muted-foreground">
              Optional · Runs only when you click. Diagnosis, mistake patterns, score leakage, behavioral insights, and a personalized 7 & 30-day plan.
            </p>
          </div>
        </div>
        {!insights ? (
          <Button onClick={run} disabled={loading} className="bg-sky-600 hover:bg-sky-700 text-white gap-2">
            <Sparkles className="h-4 w-4" />
            {loading ? "Analyzing…" : "Run AI Analysis"}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-sky-600" /> Report generated
          </span>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-24 w-full" />
          <div className="grid md:grid-cols-2 gap-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-40 w-full" />
        </div>
      )}

      {!loading && !insights && (
        <p className="text-sm text-muted-foreground">
          Click <strong>Run AI Analysis</strong> for a mentor-style report: root-cause diagnosis, mistake patterns,
          time management, score leakage, behavioral insights, and a personalized 7 & 30-day plan.
        </p>
      )}

      {insights && (
        <div className="space-y-4">
          {/* A. Diagnosis */}
          {insights.diagnosis && (
            <Section icon={Brain} title="Performance Diagnosis" color="bg-sky-600">
              <div className="font-semibold text-base">{insights.diagnosis.headline}</div>
              {insights.diagnosis.core_problem && (
                <p className="text-sm text-foreground/80 mt-1.5">{insights.diagnosis.core_problem}</p>
              )}
              {insights.diagnosis.evidence?.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {insights.diagnosis.evidence.map((e: string, i: number) => (
                    <li key={i} className="flex gap-1.5"><ChevronRight className="h-3 w-3 mt-0.5 text-sky-600 shrink-0" />{e}</li>
                  ))}
                </ul>
              )}
            </Section>
          )}

          {/* H. Smart Alerts */}
          {insights.smart_alerts?.length > 0 && (
            <Section icon={Bell} title="Smart Alerts" color="bg-amber-500">
              <div className="grid md:grid-cols-2 gap-2">
                {insights.smart_alerts.map((a: any, i: number) => (
                  <div key={i} className={`text-xs border-l-4 pl-3 py-2 rounded-r ${
                    a.type === "warning" ? "border-rose-500 bg-rose-50/40"
                    : a.type === "success" ? "border-green-500 bg-green-50/40"
                    : "border-sky-500 bg-sky-50/40"
                  }`}>
                    {a.message}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* B. Mistake Patterns */}
          {insights.mistake_patterns?.length > 0 && (
            <Section icon={AlertTriangle} title="Mistake Patterns" color="bg-rose-500">
              <div className="space-y-2">
                {insights.mistake_patterns.map((m: any, i: number) => (
                  <div key={i} className="border rounded-lg p-3">
                    <div className="font-semibold text-sm">{m.pattern}</div>
                    {m.evidence && <p className="text-xs text-muted-foreground mt-1">{m.evidence}</p>}
                    {m.fix && <p className="text-xs mt-1.5"><span className="font-semibold text-sky-700">Fix: </span>{m.fix}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* D. Score Leakage */}
          {insights.score_leakage && (
            <Section icon={ShieldAlert} title="Score Leakage" color="bg-orange-500">
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-2xl font-bold text-rose-600">−{insights.score_leakage.total_lost_marks_estimate}</span>
                <span className="text-xs text-muted-foreground">marks lost (avoidable)</span>
              </div>
              <div className="space-y-2">
                {insights.score_leakage.breakdown?.map((b: any, i: number) => (
                  <div key={i} className="flex items-start justify-between gap-3 border rounded-md p-2.5">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{b.source}</div>
                      {b.fix && <div className="text-xs text-muted-foreground mt-0.5">{b.fix}</div>}
                    </div>
                    <Badge variant="destructive" className="text-[10px] shrink-0">−{b.marks}</Badge>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* C. Time Management */}
          {insights.time_management && (
            <Section icon={Clock} title="Time Management" color="bg-indigo-500">
              <p className="text-sm font-medium">{insights.time_management.verdict}</p>
              <div className="grid md:grid-cols-2 gap-3 mt-3">
                {insights.time_management.over_invested?.length > 0 && (
                  <div className="border rounded-lg p-3 bg-rose-50/40">
                    <div className="text-xs font-semibold text-rose-700 mb-1.5">Over-invested time</div>
                    <ul className="text-xs space-y-1">
                      {insights.time_management.over_invested.map((s: string, i: number) => <li key={i}>• {s}</li>)}
                    </ul>
                  </div>
                )}
                {insights.time_management.under_utilized?.length > 0 && (
                  <div className="border rounded-lg p-3 bg-amber-50/40">
                    <div className="text-xs font-semibold text-amber-700 mb-1.5">Under-utilized</div>
                    <ul className="text-xs space-y-1">
                      {insights.time_management.under_utilized.map((s: string, i: number) => <li key={i}>• {s}</li>)}
                    </ul>
                  </div>
                )}
              </div>
              {insights.time_management.fix && (
                <p className="text-xs mt-3"><span className="font-semibold text-sky-700">Fix: </span>{insights.time_management.fix}</p>
              )}
            </Section>
          )}

          {/* E. Strategy */}
          {insights.strategy_evaluation && (
            <Section icon={Compass} title="Strategy Evaluation" color="bg-violet-500">
              <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">{insights.strategy_evaluation.label}</Badge>
              {insights.strategy_evaluation.what_went_wrong && (
                <p className="text-sm mt-2">{insights.strategy_evaluation.what_went_wrong}</p>
              )}
              <div className="grid md:grid-cols-2 gap-3 mt-3 text-xs">
                {insights.strategy_evaluation.section_order_advice && (
                  <div className="border rounded-md p-2.5"><div className="font-semibold mb-1">Section order</div>{insights.strategy_evaluation.section_order_advice}</div>
                )}
                {insights.strategy_evaluation.attempt_advice && (
                  <div className="border rounded-md p-2.5"><div className="font-semibold mb-1">Attempt advice</div>{insights.strategy_evaluation.attempt_advice}</div>
                )}
              </div>
            </Section>
          )}

          {/* H. Behavioral */}
          {insights.behavioral_insights?.length > 0 && (
            <Section icon={Heart} title="Behavioral Insights" color="bg-pink-500">
              <div className="grid md:grid-cols-2 gap-2">
                {insights.behavioral_insights.map((b: any, i: number) => (
                  <div key={i} className="border rounded-lg p-3">
                    <div className="font-semibold text-sm">{b.behavior}</div>
                    {b.evidence && <p className="text-xs text-muted-foreground mt-1">{b.evidence}</p>}
                    {b.advice && <p className="text-xs mt-1.5"><span className="font-semibold text-sky-700">Do: </span>{b.advice}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Strengths & Weaknesses */}
          <div className="grid md:grid-cols-2 gap-3">
            {insights.strengths?.length > 0 && (
              <Section icon={TrendingUp} title="Strengths" color="bg-green-600">
                <div className="space-y-2">
                  {insights.strengths.map((s: any, i: number) => (
                    <div key={i} className="border-l-4 border-green-500 pl-3 py-1.5">
                      <div className="font-semibold text-sm">{s.area}</div>
                      {s.why && <div className="text-xs text-muted-foreground mt-0.5">{s.why}</div>}
                      {s.leverage && <div className="text-xs mt-1"><span className="font-semibold text-green-700">Leverage: </span>{s.leverage}</div>}
                    </div>
                  ))}
                </div>
              </Section>
            )}
            {insights.weaknesses?.length > 0 && (
              <Section icon={Target} title="Weaknesses" color="bg-rose-600">
                <div className="space-y-2">
                  {insights.weaknesses.map((w: any, i: number) => (
                    <div key={i} className="border-l-4 pl-3 py-1.5"
                      style={{ borderColor: w.priority === "high" ? "hsl(0 80% 60%)" : w.priority === "medium" ? "hsl(45 95% 55%)" : "hsl(215 20% 70%)" }}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{w.area}</span>
                        {w.priority && <Badge variant={w.priority === "high" ? "destructive" : "secondary"} className="text-[10px]">{w.priority}</Badge>}
                      </div>
                      {w.why && <div className="text-xs text-muted-foreground mt-1">{w.why}</div>}
                      {w.fix && <div className="text-xs mt-1"><span className="font-semibold text-sky-700">Fix: </span>{w.fix}</div>}
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>

          {/* G. Score Potential */}
          {insights.score_potential && (
            <Section icon={Gauge} title="Score Potential" color="bg-emerald-600">
              <div className="flex items-baseline gap-3 flex-wrap">
                <div>
                  <div className="text-xs text-muted-foreground">Current</div>
                  <div className="text-2xl font-bold">{insights.score_potential.current}</div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-xs text-muted-foreground">Achievable</div>
                  <div className="text-2xl font-bold text-emerald-600">{insights.score_potential.achievable}</div>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 ml-auto text-sm">
                  +{insights.score_potential.delta} marks
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                <div className="border rounded-md p-2 text-center"><div className="font-bold text-emerald-600">+{insights.score_potential.from_accuracy}</div><div className="text-muted-foreground">Accuracy</div></div>
                <div className="border rounded-md p-2 text-center"><div className="font-bold text-emerald-600">+{insights.score_potential.from_time}</div><div className="text-muted-foreground">Time</div></div>
                <div className="border rounded-md p-2 text-center"><div className="font-bold text-emerald-600">+{insights.score_potential.from_strategy}</div><div className="text-muted-foreground">Strategy</div></div>
              </div>
              {insights.score_potential.rationale && (
                <p className="text-xs text-muted-foreground mt-3">{insights.score_potential.rationale}</p>
              )}
            </Section>
          )}

          {/* F. 7-Day Plan */}
          {insights.improvement_plan?.seven_day?.length > 0 && (
            <Section icon={BookOpen} title="7-Day Action Plan" color="bg-sky-600">
              <div className="space-y-2">
                {insights.improvement_plan.seven_day.map((d: any, i: number) => (
                  <div key={i} className="border rounded-lg p-3">
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
            </Section>
          )}

          {/* 30-day plan */}
          {insights.improvement_plan?.thirty_day && (
            <Section icon={Activity} title="30-Day Roadmap" color="bg-indigo-600">
              <div className="grid md:grid-cols-2 gap-3 text-xs">
                {insights.improvement_plan.thirty_day.mock_frequency && (
                  <div className="border rounded-md p-2.5"><div className="font-semibold mb-1">Mock frequency</div>{insights.improvement_plan.thirty_day.mock_frequency}</div>
                )}
                {insights.improvement_plan.thirty_day.sectional_focus?.length > 0 && (
                  <div className="border rounded-md p-2.5">
                    <div className="font-semibold mb-1">Sectional focus</div>
                    <ul className="space-y-0.5">{insights.improvement_plan.thirty_day.sectional_focus.map((s: string, i: number) => <li key={i}>• {s}</li>)}</ul>
                  </div>
                )}
                {insights.improvement_plan.thirty_day.strategy_shifts?.length > 0 && (
                  <div className="border rounded-md p-2.5">
                    <div className="font-semibold mb-1">Strategy shifts</div>
                    <ul className="space-y-0.5">{insights.improvement_plan.thirty_day.strategy_shifts.map((s: string, i: number) => <li key={i}>• {s}</li>)}</ul>
                  </div>
                )}
                {insights.improvement_plan.thirty_day.milestones?.length > 0 && (
                  <div className="border rounded-md p-2.5">
                    <div className="font-semibold mb-1">Milestones</div>
                    <ul className="space-y-0.5">{insights.improvement_plan.thirty_day.milestones.map((s: string, i: number) => <li key={i}>• {s}</li>)}</ul>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Mentor note */}
          {insights.mentor_note && (
            <div className="rounded-xl border border-sky-200 bg-gradient-to-r from-sky-50 to-white p-4">
              <div className="flex items-center gap-2 text-sky-700 text-xs font-semibold mb-1.5">
                <Lightbulb className="h-4 w-4" /> A note from your mentor
              </div>
              <p className="text-sm leading-relaxed">{insights.mentor_note}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
