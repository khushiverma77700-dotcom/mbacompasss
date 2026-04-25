import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Clock, AlertTriangle, Download, Activity, ShieldCheck } from "lucide-react";

export interface JobHealthRow {
  name: string;
  status: string; // succeeded | failed | pending | not_found | duplicate | processing
  detail?: string;
}

interface Props {
  workflow: "Bulk Colleges" | "Bulk College Sections";
  jobId: string;
  status: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  updatedAt?: string | null;
  total: number;
  succeeded: number;
  failed: number;
  pending: number;
  notFound?: number;
  duplicates?: number;
  rows: JobHealthRow[];
  /** When true, watchdog-managed: tells the user it'll auto-resume even if they close the laptop. */
  autonomous?: boolean;
}

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

const minutesSince = (iso?: string | null) => {
  if (!iso) return null;
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m;
};

const JobHealthReport = ({
  workflow, jobId, status, startedAt, finishedAt, updatedAt,
  total, succeeded, failed, pending, notFound = 0, duplicates = 0,
  rows, autonomous = true,
}: Props) => {
  const completed = succeeded + failed + notFound + duplicates;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const idleMin = minutesSince(updatedAt);
  const isTerminal = ["completed", "failed", "cancelled"].includes(status);

  const downloadReport = () => {
    const lines = [
      `${workflow} — Final Report`,
      `Job ID: ${jobId}`,
      `Status: ${status}`,
      `Started:  ${fmt(startedAt)}`,
      `Updated:  ${fmt(updatedAt)}`,
      `Finished: ${fmt(finishedAt)}`,
      ``,
      `Total:      ${total}`,
      `Succeeded:  ${succeeded}`,
      `Failed:     ${failed}`,
      `Pending:    ${pending}`,
      ...(notFound ? [`Not Found:  ${notFound}`] : []),
      ...(duplicates ? [`Duplicates: ${duplicates}`] : []),
      ``,
      `--- Per-item breakdown ---`,
      ...rows.map((r) => `[${r.status.toUpperCase()}] ${r.name}${r.detail ? ` — ${r.detail}` : ""}`),
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflow.replace(/\s+/g, "_")}_${jobId.slice(0, 8)}_report.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const failedRows = rows.filter((r) => r.status === "failed" || r.status === "not_found");

  return (
    <Card className="mb-4 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Job Health & Report
          </CardTitle>
          <div className="flex items-center gap-2">
            {autonomous && (
              <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-700">
                <ShieldCheck className="w-3 h-3" /> Runs in background
              </Badge>
            )}
            <Button size="sm" variant="outline" onClick={downloadReport} className="h-7">
              <Download className="w-3.5 h-3.5 mr-1.5" /> Download Report
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>Overall progress</span>
            <span className="font-semibold text-foreground">{completed} / {total} ({pct}%)</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Succeeded" value={succeeded} tone="emerald" />
          <Stat icon={<XCircle className="w-3.5 h-3.5" />} label="Failed" value={failed} tone="destructive" />
          <Stat icon={<Clock className="w-3.5 h-3.5" />} label="Pending" value={pending} tone="amber" />
          <Stat
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            label={notFound ? "Not Found" : "Skipped"}
            value={notFound + duplicates}
            tone="muted"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
          <InfoRow label="Started" value={fmt(startedAt)} />
          <InfoRow label="Last update" value={`${fmt(updatedAt)}${idleMin !== null ? ` · ${idleMin}m ago` : ""}`} />
          <InfoRow label="Finished" value={fmt(finishedAt)} />
        </div>

        {autonomous && !isTerminal && (
          <div className="rounded-md bg-primary/5 border border-primary/20 p-2.5 text-xs text-foreground/80">
            <ShieldCheck className="w-3.5 h-3.5 inline mr-1.5 text-primary" />
            This job runs on the server. You can <strong>close this tab, lock your screen or shut down your laptop</strong> — generation will keep going. A safety watchdog re-checks every 2 minutes and auto-resumes anything that stalls for more than 3 minutes.
          </div>
        )}

        {failedRows.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-foreground mb-1.5">
              Items needing attention ({failedRows.length})
            </div>
            <div className="max-h-40 overflow-y-auto border border-border/60 rounded-md divide-y">
              {failedRows.slice(0, 50).map((r, i) => (
                <div key={i} className="px-2.5 py-1.5 text-xs flex items-center justify-between gap-2">
                  <span className="truncate" title={r.name}>{r.name}</span>
                  <Badge
                    variant="outline"
                    className={
                      r.status === "failed"
                        ? "border-destructive/40 text-destructive text-[10px]"
                        : "border-amber-500/40 text-amber-700 text-[10px]"
                    }
                  >
                    {r.status}
                  </Badge>
                </div>
              ))}
              {failedRows.length > 50 && (
                <div className="px-2.5 py-1.5 text-[11px] text-muted-foreground">
                  +{failedRows.length - 50} more — see downloaded report.
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Stat = ({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "emerald" | "destructive" | "amber" | "muted" }) => {
  const cls =
    tone === "emerald" ? "text-emerald-700 bg-emerald-500/10 border-emerald-500/30"
    : tone === "destructive" ? "text-destructive bg-destructive/10 border-destructive/30"
    : tone === "amber" ? "text-amber-700 bg-amber-500/10 border-amber-500/30"
    : "text-muted-foreground bg-muted/40 border-border";
  return (
    <div className={`rounded-md border px-2.5 py-1.5 ${cls}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium opacity-80">{icon}{label}</div>
      <div className="text-lg font-bold leading-tight mt-0.5">{value}</div>
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md bg-muted/30 px-2.5 py-1.5">
    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    <div className="text-foreground font-medium truncate">{value}</div>
  </div>
);

export default JobHealthReport;
