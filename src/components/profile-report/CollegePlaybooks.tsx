import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Target, BookOpen, Mic2, CalendarRange, Trophy, CheckCircle2 } from "lucide-react";

export type CompositeRow = {
  component: string;
  weight_percent: number;
  your_current_estimate?: string;
  action_to_maximise: string;
};
export type SectionAction = {
  section: string;
  current_estimate?: string;
  target: string;
  improvement_actions: string[];
};
export type WatGdPi = {
  wat_focus: string;
  gd_focus?: string;
  pi_focus: string;
  mock_interview_checkpoints: string[];
};
export type RoadmapStep = { month: string; focus: string; deliverable: string };

export type Playbook = {
  college_name: string;
  tier: "Tier 1" | "Tier 2" | "Tier 3" | string;
  admission_exam: string;
  percentile_goal: string;
  composite_score_breakdown: CompositeRow[];
  section_wise_actions: SectionAction[];
  wat_gd_pi_plan: WatGdPi;
  study_roadmap: RoadmapStep[];
  admission_probability: number;
  verdict: string;
};

type Props = {
  playbooks?: Playbook[];
  coverage?: {
    tier1_count?: number;
    tier2_count?: number;
    tier3_count?: number;
    tier1_best_fit?: string;
    tier2_best_fit?: string;
    tier3_best_fit?: string;
  };
};

const TIERS = ["Tier 1", "Tier 2", "Tier 3"] as const;

const tierBadge = (tier: string) => {
  if (tier === "Tier 1") return "bg-sky-100 text-sky-800 border-sky-300";
  if (tier === "Tier 2") return "bg-cyan-100 text-cyan-800 border-cyan-300";
  return "bg-slate-100 text-slate-700 border-slate-300";
};

const ProbabilityRing = ({ value }: { value: number }) => {
  const v = Math.max(0, Math.min(100, Math.round(value || 0)));
  const color = v >= 65 ? "text-emerald-600" : v >= 35 ? "text-amber-600" : "text-rose-600";
  return (
    <div className={`inline-flex items-center justify-center w-14 h-14 rounded-full border-2 border-current ${color}`}>
      <span className="text-sm font-bold">{v}%</span>
    </div>
  );
};

export const CollegePlaybooks = ({ playbooks, coverage }: Props) => {
  const list = Array.isArray(playbooks) ? playbooks : [];
  const grouped = useMemo(() => {
    const g: Record<string, Playbook[]> = { "Tier 1": [], "Tier 2": [], "Tier 3": [] };
    for (const p of list) {
      const key = TIERS.includes(p.tier as any) ? p.tier : "Tier 3";
      g[key].push(p);
    }
    for (const k of Object.keys(g)) g[k].sort((a, b) => (b.admission_probability || 0) - (a.admission_probability || 0));
    return g;
  }, [list]);

  if (list.length === 0) return null;

  const counts = {
    "Tier 1": coverage?.tier1_count ?? grouped["Tier 1"].length,
    "Tier 2": coverage?.tier2_count ?? grouped["Tier 2"].length,
    "Tier 3": coverage?.tier3_count ?? grouped["Tier 3"].length,
  };
  const bestFit: Record<string, string | undefined> = {
    "Tier 1": coverage?.tier1_best_fit,
    "Tier 2": coverage?.tier2_best_fit,
    "Tier 3": coverage?.tier3_best_fit,
  };

  const [tab, setTab] = useState<string>(grouped["Tier 1"].length ? "Tier 1" : grouped["Tier 2"].length ? "Tier 2" : "Tier 3");

  return (
    <Card className="border-2 border-primary/10 shadow-xs">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Trophy className="w-5 h-5 text-primary" /> College Strategy Playbooks
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Percentile goals, composite-score breakdown, section actions, WAT-GD-PI plan and study roadmap — for each shortlisted college.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-3 w-full">
            {TIERS.map((t) => (
              <TabsTrigger key={t} value={t} className="flex flex-col items-center py-2">
                <span className="text-xs font-semibold">{t}</span>
                <span className="text-xs text-muted-foreground">
                  {counts[t]} {counts[t] === 1 ? "college" : "colleges"}
                  {bestFit[t] ? ` · Best: ${bestFit[t]}` : ""}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {TIERS.map((t) => (
            <TabsContent key={t} value={t} className="mt-4">
              {grouped[t].length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No {t} playbooks generated.</p>
              ) : (
                <Accordion type="single" collapsible defaultValue={grouped[t][0]?.college_name}>
                  {grouped[t].map((p) => (
                    <AccordionItem key={p.college_name} value={p.college_name} className="border rounded-lg mb-2 px-3">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 text-left w-full pr-2">
                          <ProbabilityRing value={p.admission_probability} />
                          <div className="flex-1">
                            <p className="font-semibold text-sm md:text-base">{p.college_name}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              <Badge variant="outline" className={`text-xs ${tierBadge(p.tier)}`}>{p.tier}</Badge>
                              <Badge variant="outline" className="text-xs">{p.admission_exam}</Badge>
                              <span className="text-xs text-muted-foreground">{p.percentile_goal}</span>
                            </div>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-5 pt-2">
                          <div className="rounded-md bg-primary/5 border border-primary/10 p-3 text-sm">
                            <strong>Verdict:</strong> {p.verdict}
                          </div>

                          {/* Composite score breakdown */}
                          <div>
                            <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                              <Target className="w-4 h-4 text-primary" /> Composite Score Breakdown
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border rounded-md">
                                <thead className="bg-muted/50">
                                  <tr>
                                    <th className="text-left p-2">Component</th>
                                    <th className="text-left p-2">Weight</th>
                                    <th className="text-left p-2">Your Estimate</th>
                                    <th className="text-left p-2">Action to Maximise</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {p.composite_score_breakdown?.map((r, i) => (
                                    <tr key={i} className="border-t">
                                      <td className="p-2 font-medium">{r.component}</td>
                                      <td className="p-2">{r.weight_percent}%</td>
                                      <td className="p-2 text-muted-foreground">{r.your_current_estimate || "—"}</td>
                                      <td className="p-2">{r.action_to_maximise}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Section-wise actions */}
                          <div>
                            <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                              <BookOpen className="w-4 h-4 text-primary" /> Section-wise Improvement Plan
                            </h4>
                            <div className="grid md:grid-cols-2 gap-2">
                              {p.section_wise_actions?.map((s, i) => (
                                <div key={i} className="rounded-md border p-3 text-xs space-y-1">
                                  <div className="flex justify-between font-medium">
                                    <span>{s.section}</span>
                                    <span className="text-primary">Target {s.target}</span>
                                  </div>
                                  {s.current_estimate && (
                                    <p className="text-muted-foreground">Now: {s.current_estimate}</p>
                                  )}
                                  <ul className="list-disc ml-4 space-y-0.5">
                                    {s.improvement_actions?.map((a, j) => <li key={j}>{a}</li>)}
                                  </ul>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* WAT-GD-PI */}
                          <div>
                            <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                              <Mic2 className="w-4 h-4 text-primary" /> WAT-GD-PI Preparation Plan
                            </h4>
                            <div className="grid md:grid-cols-3 gap-2 text-xs">
                              <div className="rounded-md border p-3">
                                <p className="font-medium mb-1">WAT Focus</p>
                                <p className="text-muted-foreground">{p.wat_gd_pi_plan?.wat_focus}</p>
                              </div>
                              <div className="rounded-md border p-3">
                                <p className="font-medium mb-1">GD Focus</p>
                                <p className="text-muted-foreground">{p.wat_gd_pi_plan?.gd_focus || "No GD round"}</p>
                              </div>
                              <div className="rounded-md border p-3">
                                <p className="font-medium mb-1">PI Focus</p>
                                <p className="text-muted-foreground">{p.wat_gd_pi_plan?.pi_focus}</p>
                              </div>
                            </div>
                            {p.wat_gd_pi_plan?.mock_interview_checkpoints?.length > 0 && (
                              <div className="mt-2 rounded-md bg-muted/30 border p-3">
                                <p className="text-xs font-medium mb-1">Mock-Interview Checkpoints</p>
                                <ul className="text-xs space-y-1">
                                  {p.wat_gd_pi_plan.mock_interview_checkpoints.map((c, i) => (
                                    <li key={i} className="flex gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" /> {c}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Study roadmap */}
                          {p.study_roadmap?.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold flex items-center gap-1.5 mb-2">
                                <CalendarRange className="w-4 h-4 text-primary" /> Study Roadmap
                              </h4>
                              <div className="space-y-1.5">
                                {p.study_roadmap.map((r, i) => (
                                  <div key={i} className="flex gap-3 text-xs rounded-md border p-2">
                                    <span className="font-semibold text-primary w-20 shrink-0">{r.month}</span>
                                    <div>
                                      <p className="font-medium">{r.focus}</p>
                                      <p className="text-muted-foreground">{r.deliverable}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CollegePlaybooks;
