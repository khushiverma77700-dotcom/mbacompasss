import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Rocket, Zap, TrendingUp } from "lucide-react";
import { simulateScenarios, workExImpact, type CollegeRow, type ProfileInputLite } from "@/lib/profileScoring";
import ActionableInsight from "./ActionableInsight";

interface Props { rows?: CollegeRow[]; profile: ProfileInputLite }

export const ScenarioSimulator = ({ rows, profile }: Props) => {
  const [withWorkEx, setWithWorkEx] = useState(true);

  const scenarios = useMemo(() => simulateScenarios(rows, [90, 95, 99]), [rows]);
  const wx = useMemo(() => workExImpact(profile), [profile]);

  if (!rows?.length) return null;

  const colorByChance = (c: number) =>
    c >= 70 ? "bg-emerald-500" : c >= 40 ? "bg-amber-500" : "bg-rose-500";

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="w-5 h-5 text-primary" /> Scenario Simulator
        </CardTitle>
        <CardDescription>"What if my CAT score was…" — see how your college list shifts at different percentiles.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="95" className="w-full">
          <TabsList className="grid grid-cols-3 w-full md:w-[360px]">
            <TabsTrigger value="90">CAT 90%ile</TabsTrigger>
            <TabsTrigger value="95">CAT 95%ile</TabsTrigger>
            <TabsTrigger value="99">CAT 99%ile</TabsTrigger>
          </TabsList>

          {[90, 95, 99].map((s) => (
            <TabsContent key={s} value={String(s)} className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {scenarios[s]?.map((c) => (
                  <div key={c.college_name} className="rounded-lg border border-border p-3 bg-card">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-semibold text-sm truncate">{c.college_name}</span>
                      <Badge variant="outline" className="text-xs shrink-0">{c.tier}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full ${colorByChance(c.chance)}`} style={{ width: `${c.chance}%` }} />
                      </div>
                      <span className="text-xs font-bold w-10 text-right">{c.chance}%</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Cutoff: {c.required}%ile</p>
                  </div>
                ))}
              </div>
              <ActionableInsight
                level={s >= 99 ? "good" : s >= 95 ? "info" : "warn"}
                title={`If you score ${s}%ile`}
              >
                {s >= 99
                  ? "You'd unlock the full top-tier IIM list and most premium B-schools nationwide."
                  : s >= 95
                    ? "You'd open up the BLACKI tier (B, L, A, C, K, I) and tier-1 non-IIMs like FMS / SPJIMR / MDI."
                    : "You'd stay competitive for new IIMs, top non-IIM private schools, and tier-2 institutes."}
              </ActionableInsight>
            </TabsContent>
          ))}
        </Tabs>

        <div className="rounded-xl border-2 border-dashed border-primary/30 p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <Label htmlFor="wx-toggle" className="font-semibold">With your work experience</Label>
            </div>
            <Switch id="wx-toggle" checked={withWorkEx} onCheckedChange={setWithWorkEx} />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground">Without Work Ex</p>
              <p className="text-2xl font-bold">{wx.withoutWorkEx}</p>
            </div>
            <div className="rounded-lg p-3 bg-muted/30">
              <p className="text-xs text-muted-foreground">With Work Ex</p>
              <p className="text-2xl font-bold text-primary">{wx.withWorkEx}</p>
            </div>
            <div className="rounded-lg p-3 bg-emerald-50 dark:bg-emerald-950/30">
              <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1">
                <TrendingUp className="w-3 h-3" /> Impact
              </p>
              <p className="text-2xl font-bold text-emerald-600">+{wx.deltaPct}%</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {withWorkEx
              ? "Your profile reflects work-ex bonus across IIM-ABC and top non-IIM admissions."
              : "Toggle off to see how your profile would look if you applied as a fresher."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ScenarioSimulator;
