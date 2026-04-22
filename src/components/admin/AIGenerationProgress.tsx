import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, X } from "lucide-react";

export type StepStatus = "pending" | "running" | "ok" | "fail";

export interface ProgressStep {
  key: string;
  label: string;
  status: StepStatus;
  error?: string;
}

interface Props {
  /** When true, shows the spinning indicator and the "Currently…" line. */
  active: boolean;
  total: number;
  done: number;
  ok: number;
  fail: number;
  current?: string;
  steps: ProgressStep[];
  /** Workflow name shown in the header e.g. "College Sections". */
  workflow: string;
  onDismiss?: () => void;
}

const AIGenerationProgress = ({ active, total, done, ok, fail, current, steps, workflow, onDismiss }: Props) => {
  const pct = Math.round((done / Math.max(total, 1)) * 100);

  return (
    <Card className="mb-4 border-primary/30 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {active
              ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
              : <CheckCircle2 className="w-4 h-4 text-primary" />}
            <span className="text-sm font-semibold text-foreground">
              {active ? `${workflow} — generating…` : `${workflow} — complete`}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">{done} / {total}</span>
            <span className="text-emerald-600 font-medium">✓ {ok}</span>
            {fail > 0 && <span className="text-destructive font-medium">✕ {fail}</span>}
            <span className="font-bold text-primary">{pct}%</span>
            {!active && onDismiss && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onDismiss}>
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>

        <Progress value={pct} className="h-2" />

        {current && active && (
          <p className="text-xs text-muted-foreground">
            Currently generating: <span className="font-medium text-foreground">{current}</span>
          </p>
        )}

        {steps.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pt-1">
            {steps.map((s) => (
              <div key={s.key} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-background/60 border border-border/50">
                {s.status === "ok" && <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />}
                {s.status === "fail" && <XCircle className="w-3 h-3 text-destructive flex-shrink-0" />}
                {s.status === "running" && <Loader2 className="w-3 h-3 animate-spin text-primary flex-shrink-0" />}
                {s.status === "pending" && <div className="w-3 h-3 rounded-full border border-muted-foreground/30 flex-shrink-0" />}
                <span
                  className={`truncate ${s.status === "fail" ? "text-destructive" : "text-foreground"}`}
                  title={s.error || s.label}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIGenerationProgress;
