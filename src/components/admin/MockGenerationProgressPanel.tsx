import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Clock, Sparkles } from "lucide-react";
import { useMockGenerationProgress } from "@/hooks/useMockGenerationProgress";

interface Props {
  generationId: string | null;
  compact?: boolean;
}

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "completed") return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
  if (status === "failed") return <XCircle className="w-4 h-4 text-destructive" />;
  if (status === "processing") return <Loader2 className="w-4 h-4 animate-spin text-primary" />;
  return <Clock className="w-4 h-4 text-muted-foreground" />;
};

export default function MockGenerationProgressPanel({ generationId, compact = false }: Props) {
  const p = useMockGenerationProgress(generationId);
  if (!generationId) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {p.isComplete
              ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              : <Sparkles className="w-4 h-4 text-primary animate-pulse" />}
            <span className="text-sm font-semibold">
              {p.isComplete
                ? (p.hasFailures ? "Generation completed with errors" : "Generation complete")
                : "AI Mock Generation in progress…"}
            </span>
          </div>
          <span className="text-lg font-bold text-primary">{p.pct}%</span>
        </div>

        <Progress value={p.pct} className="h-2" />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <Stat label="Sections done" value={`${p.doneSections} / ${p.totalSections}`} />
          <Stat label="Sections pending" value={p.pendingSections} />
          <Stat label="Sections failed" value={p.failedSections} tone={p.failedSections ? "danger" : undefined} />
          <Stat label="Total questions" value={p.totalQuestions} />
          <Stat label="Generated" value={p.generatedQuestions} tone="ok" />
          <Stat label="Remaining" value={p.remainingQuestions} />
        </div>

        {!p.isComplete && p.current && (
          <p className="text-xs text-muted-foreground">
            Currently generating: <span className="font-medium text-foreground">{p.current}</span>
          </p>
        )}

        {!compact && p.jobs.length > 0 && (
          <div className="space-y-1.5 pt-1 max-h-64 overflow-y-auto">
            {p.jobs.map((j) => {
              const sectionPct = j.total_questions ? Math.round((j.questions_done / j.total_questions) * 100) : 0;
              return (
                <div key={j.id} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded bg-background border">
                  <StatusIcon status={j.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate" title={j.section_name}>{j.section_code} — {j.section_name}</span>
                      <span className="text-muted-foreground shrink-0">{j.questions_done}/{j.total_questions}</span>
                    </div>
                    {j.status === "processing" && j.current_step && (
                      <div className="text-[10px] text-muted-foreground truncate">{j.current_step}</div>
                    )}
                    {j.status === "failed" && j.error_message && (
                      <div className="text-[10px] text-destructive truncate" title={j.error_message}>{j.error_message}</div>
                    )}
                    {j.attempts > 1 && (
                      <div className="text-[10px] text-amber-600">Retries: {j.attempts - 1}</div>
                    )}
                  </div>
                  <div className="w-16">
                    <Progress value={sectionPct} className="h-1" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "ok" | "danger" }) {
  const color = tone === "ok" ? "text-emerald-700" : tone === "danger" ? "text-destructive" : "text-foreground";
  return (
    <div className="px-2 py-1.5 rounded bg-background border">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className={`text-sm font-semibold ${color}`}>{value}</div>
    </div>
  );
}
