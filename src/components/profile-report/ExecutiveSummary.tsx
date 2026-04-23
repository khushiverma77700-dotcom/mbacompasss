import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, TrendingUp, AlertTriangle, Award } from "lucide-react";
import { topThree } from "@/lib/profileScoring";

interface Props {
  oneLine?: string;
  verdict?: string;
  strengths?: Array<{ title: string; description?: string; impact?: string }>;
  weaknesses?: Array<{ title: string; description?: string; severity?: string }>;
}

export const ExecutiveSummary = ({ oneLine, verdict, strengths, weaknesses }: Props) => {
  const topAdvantages = topThree(strengths || [], "impact");
  const topRisks = topThree(weaknesses || [], "severity");

  return (
    <Card className="border-2 border-primary/30 overflow-hidden bg-gradient-to-br from-primary/5 via-card to-card">
      <CardContent className="p-6 space-y-6">
        {oneLine && (
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-1">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-primary font-bold mb-1">Your Profile in One Line</p>
              <p className="text-lg md:text-xl font-semibold leading-snug">{oneLine}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 p-4 space-y-2">
            <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" /> Top 3 Advantages
            </p>
            {topAdvantages.length ? (
              <ol className="space-y-1.5 list-decimal list-inside">
                {topAdvantages.map((s, i) => (
                  <li key={i} className="text-sm text-emerald-900 dark:text-emerald-200">
                    <span className="font-semibold">{s.title}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-muted-foreground">No advantages identified yet.</p>
            )}
          </div>

          <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/20 p-4 space-y-2">
            <p className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" /> Top 3 Risks
            </p>
            {topRisks.length ? (
              <ol className="space-y-1.5 list-decimal list-inside">
                {topRisks.map((w, i) => (
                  <li key={i} className="text-sm text-rose-900 dark:text-rose-200">
                    <span className="font-semibold">{w.title}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-muted-foreground">No major risks detected.</p>
            )}
          </div>
        </div>

        {verdict && (
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
            <p className="text-xs uppercase tracking-wider font-bold text-primary mb-1.5 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Final Verdict
            </p>
            <p className="text-sm leading-relaxed">{verdict}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExecutiveSummary;
