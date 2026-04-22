import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Play, RefreshCw, CheckCircle2, AlertCircle, Clock, MinusCircle, History, Loader2 } from "lucide-react";

type StepStatus = "completed" | "updated" | "pending" | "skipped";
interface StepLog {
  id: string; step_number: number; step_key: string; step_label: string;
  status: StepStatus; pages_affected: number; summary: string | null;
  duration_ms: number | null; created_at: string;
}
interface AuditRun {
  id: string; status: string; mode: string;
  started_at: string; finished_at: string | null;
  pages_scanned: number; issues_found: number; fixes_applied: number; pending_issues: number;
  overall_score: number | null; error_message: string | null;
}

const TOTAL_STEPS = 40;

const statusBadge = (s: StepStatus) => {
  const map: Record<StepStatus, { cls: string; icon: any; label: string }> = {
    completed: { cls: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30", icon: CheckCircle2, label: "Completed" },
    updated: { cls: "bg-blue-500/15 text-blue-700 border-blue-500/30", icon: RefreshCw, label: "Updated" },
    pending: { cls: "bg-amber-500/15 text-amber-700 border-amber-500/30", icon: AlertCircle, label: "Pending" },
    skipped: { cls: "bg-muted text-muted-foreground border-border", icon: MinusCircle, label: "Skipped" },
  };
  const v = map[s];
  const Icon = v.icon;
  return (
    <Badge variant="outline" className={`${v.cls} gap-1 font-medium`}>
      <Icon className="w-3 h-3" /> {v.label}
    </Badge>
  );
};

const AdminWebsiteOptimizer = () => {
  const [running, setRunning] = useState(false);
  const [activeRun, setActiveRun] = useState<AuditRun | null>(null);
  const [steps, setSteps] = useState<StepLog[]>([]);
  const [history, setHistory] = useState<AuditRun[]>([]);

  const loadHistory = async () => {
    const { data } = await supabase.from("audit_runs").select("*").order("started_at", { ascending: false }).limit(10);
    setHistory((data || []) as AuditRun[]);
    if (data && data[0] && !activeRun) {
      setActiveRun(data[0] as AuditRun);
      const { data: s } = await supabase.from("audit_step_logs").select("*").eq("run_id", data[0].id).order("step_number");
      setSteps((s || []) as StepLog[]);
    }
  };

  useEffect(() => { loadHistory(); }, []);

  // Poll active run
  useEffect(() => {
    if (!activeRun || activeRun.status !== "running") return;
    const t = setInterval(async () => {
      const { data: run } = await supabase.from("audit_runs").select("*").eq("id", activeRun.id).maybeSingle();
      const { data: s } = await supabase.from("audit_step_logs").select("*").eq("run_id", activeRun.id).order("step_number");
      if (run) setActiveRun(run as AuditRun);
      setSteps((s || []) as StepLog[]);
      if (run && run.status !== "running") {
        setRunning(false);
        clearInterval(t);
        loadHistory();
        toast.success(`Audit ${run.status} — score ${run.overall_score ?? "—"}/100`);
      }
    }, 2000);
    return () => clearInterval(t);
  }, [activeRun?.id, activeRun?.status]);

  const startRun = async (mode: "audit" | "fix") => {
    setRunning(true);
    setSteps([]);
    try {
      const { data, error } = await supabase.functions.invoke("ai-website-optimizer", {
        body: { mode, action: "run" },
      });
      if (error || !data?.ok) throw new Error(data?.error || error?.message || "Failed to start");
      toast.info(mode === "fix" ? "Revising everything — auto-fixes enabled" : "Audit started — read-only scan");
      const { data: run } = await supabase.from("audit_runs").select("*").eq("id", data.run_id).maybeSingle();
      setActiveRun(run as AuditRun);
    } catch (e: any) {
      toast.error(e.message);
      setRunning(false);
    }
  };

  const loadRun = async (id: string) => {
    const { data: run } = await supabase.from("audit_runs").select("*").eq("id", id).maybeSingle();
    const { data: s } = await supabase.from("audit_step_logs").select("*").eq("run_id", id).order("step_number");
    setActiveRun(run as AuditRun);
    setSteps((s || []) as StepLog[]);
  };

  const completedCount = steps.filter((s) => s.status === "completed" || s.status === "updated").length;
  const pct = activeRun?.status === "running"
    ? Math.round((steps.length / TOTAL_STEPS) * 100)
    : Math.round((completedCount / TOTAL_STEPS) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-primary" /> AI Website Optimization Engine
          </h1>
          <p className="text-muted-foreground mt-1">40-step site-wide audit + auto-fix across all dynamic and static pages.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => startRun("audit")} disabled={running} variant="outline">
            <Play className="w-4 h-4 mr-2" /> Audit only
          </Button>
          <Button onClick={() => startRun("fix")} disabled={running}>
            {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            Revise Everything
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Pages Scanned", value: activeRun?.pages_scanned ?? "—" },
          { label: "Issues Found", value: activeRun?.issues_found ?? "—" },
          { label: "Fixes Applied", value: activeRun?.fixes_applied ?? "—" },
          { label: "Pending", value: activeRun?.pending_issues ?? "—" },
          { label: "Score", value: activeRun?.overall_score != null ? `${activeRun.overall_score}/100` : "—" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active run progress */}
      {activeRun && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {activeRun.status === "running" ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <CheckCircle2 className="w-4 h-4 text-primary" />}
                <span className="font-semibold text-foreground">
                  Run {activeRun.id.slice(0, 8)} — {activeRun.status} ({activeRun.mode})
                </span>
              </div>
              <span className="text-sm text-muted-foreground">{steps.length} / {TOTAL_STEPS} steps · {pct}%</span>
            </div>
            <Progress value={pct} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Step results */}
      <Card>
        <CardHeader><CardTitle className="text-base">Step-by-Step Results</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-24 text-right">Pages</TableHead>
                  <TableHead>Summary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {steps.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                      No run loaded. Click "Audit only" or "Revise Everything" to start.
                    </TableCell>
                  </TableRow>
                )}
                {steps.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{s.step_number}</TableCell>
                    <TableCell className="font-medium">{s.step_label}</TableCell>
                    <TableCell>{statusBadge(s.status)}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.pages_affected}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.summary}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><History className="w-4 h-4" /> Run History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Pages</TableHead>
                <TableHead className="text-right">Fixes</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((r) => (
                <TableRow key={r.id} className={activeRun?.id === r.id ? "bg-muted/40" : ""}>
                  <TableCell className="text-sm">{new Date(r.started_at).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline">{r.mode}</Badge></TableCell>
                  <TableCell>
                    {r.status === "running" && <Badge className="bg-blue-500/15 text-blue-700 border-blue-500/30 gap-1"><Clock className="w-3 h-3" /> running</Badge>}
                    {r.status === "complete" && <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">complete</Badge>}
                    {r.status === "failed" && <Badge variant="destructive">failed</Badge>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.pages_scanned}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.fixes_applied}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.pending_issues}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.overall_score ?? "—"}</TableCell>
                  <TableCell><Button size="sm" variant="ghost" onClick={() => loadRun(r.id)}>View</Button></TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No runs yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminWebsiteOptimizer;
