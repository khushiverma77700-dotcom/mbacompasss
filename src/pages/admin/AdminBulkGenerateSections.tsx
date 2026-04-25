import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Sparkles, Loader2, CheckCircle2, XCircle, AlertTriangle,
  ChevronDown, ChevronRight, Clock, ListChecks, Play, Ban, RotateCw,
} from "lucide-react";

interface SectionStep {
  type: string;
  label: string;
  status: "pending" | "processing" | "succeeded" | "failed";
  error?: string;
}
interface RowState {
  index: number;
  inputName: string;
  collegeId?: string;
  matchedName?: string;
  status: "pending" | "processing" | "matched" | "not_found" | "succeeded" | "failed";
  error?: string;
  steps: SectionStep[];
  startedAt?: string;
  finishedAt?: string;
}
interface Job {
  id: string;
  status: string;
  total_rows: number;
  total_steps: number;
  steps_done: number;
  not_found: number;
  succeeded: number;
  failed: number;
  rows: RowState[];
  current_activity: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

const PER_STEP_SECONDS = 35; // rough estimate per AI section call (single safe worker)

const formatDuration = (s: number) => {
  if (!isFinite(s) || s <= 0) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
};

export default function AdminBulkGenerateSections() {
  const { toast } = useToast();
  const [namesText, setNamesText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const pollRef = useRef<number | null>(null);

  const parsedNames = useMemo(() => {
    return Array.from(new Set(
      namesText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0)
    ));
  }, [namesText]);

  const loadRecent = async () => {
    const { data } = await supabase
      .from("bulk_section_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);
    setRecentJobs((data as any) || []);
  };

  useEffect(() => { loadRecent(); }, []);

  // Poll active job every 2s — re-arms whenever status flips back to active
  useEffect(() => {
    if (!job) return;
    const isTerminal = job.status === "completed" || job.status === "failed" || job.status === "cancelled";
    if (pollRef.current) { window.clearInterval(pollRef.current); pollRef.current = null; }
    if (isTerminal) { loadRecent(); return; }
    const tick = async () => {
      const { data } = await supabase
        .from("bulk_section_jobs").select("*").eq("id", job.id).maybeSingle();
      if (data) setJob(data as any);
      if (data && (data.status === "completed" || data.status === "failed" || data.status === "cancelled")) {
        if (pollRef.current) window.clearInterval(pollRef.current);
        pollRef.current = null;
        loadRecent();
      }
    };
    pollRef.current = window.setInterval(tick, 2000);
    tick();
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, [job?.id, job?.status]);

  const handleSubmit = async () => {
    if (parsedNames.length === 0) {
      toast({ title: "Paste at least one college name", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("bulk-section-create", {
        body: { action: "create", names: parsedNames },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({
        title: "Job started",
        description: `${data.eligible} colleges queued · ${data.not_found} not found · ${data.total_steps} total steps`,
      });
      // Load the created job
      const { data: jobRow } = await supabase
        .from("bulk_section_jobs").select("*").eq("id", data.job_id).maybeSingle();
      if (jobRow) setJob(jobRow as any);
      setNamesText("");
    } catch (e: any) {
      toast({ title: "Failed to start job", description: e?.message || "Unknown error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const openJob = async (id: string) => {
    const { data } = await supabase
      .from("bulk_section_jobs").select("*").eq("id", id).maybeSingle();
    if (data) setJob(data as any);
  };

  const overallPct = job
    ? Math.round((job.steps_done / Math.max(job.total_steps, 1)) * 100)
    : 0;

  const eta = useMemo(() => {
    if (!job || job.status !== "running") return null;
    const remaining = Math.max(job.total_steps - job.steps_done, 0);
    const seconds = remaining * PER_STEP_SECONDS;
    return seconds;
  }, [job]);

  const elapsed = useMemo(() => {
    if (!job?.started_at) return null;
    const end = job.finished_at ? new Date(job.finished_at).getTime() : Date.now();
    return (end - new Date(job.started_at).getTime()) / 1000;
  }, [job]);

  const cancelJob = async (jobId: string) => {
    if (!confirm("Cancel this job now? The active AI request will be stopped and unsaved section placeholders will be removed.")) return;
    const { error } = await supabase
      .from("bulk_section_jobs")
      .update({ status: "cancelled", current_activity: "Cancelling…" })
      .eq("id", jobId);
    if (error) {
      toast({ title: "Cancel failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Cancelling…", description: "Worker is stopping immediately and clearing unfinished work." });
  };

  const restartJob = async (jobId: string) => {
    if (!confirm("Restart this job? Pending and failed colleges/sections will be re-queued.")) return;
    const { data: j, error: fetchErr } = await supabase
      .from("bulk_section_jobs").select("rows").eq("id", jobId).maybeSingle();
    if (fetchErr || !j) {
      toast({ title: "Restart failed", description: fetchErr?.message || "Job not found", variant: "destructive" });
      return;
    }
    const resetRows = ((j.rows as unknown) as RowState[]).map(r => {
      if (r.status === "succeeded" || r.status === "not_found") return r;
      return {
        ...r,
        status: "pending" as const,
        error: undefined,
        steps: (r.steps || []).map(s =>
          s.status === "succeeded" ? s : { ...s, status: "pending" as const, error: undefined }
        ),
      };
    });
    await supabase.from("bulk_section_jobs").update({
      rows: resetRows as any,
      status: "pending",
      current_activity: "Restarting…",
      finished_at: null,
    }).eq("id", jobId);

    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.functions.invoke("bulk-section-create", {
      body: { action: "resume", job_id: jobId },
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    if (error) {
      toast({ title: "Restart failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Job restarted", description: "Pending colleges/sections are being processed again." });
  };

  const startAll = async (jobId: string) => {
    if (!confirm("Re-queue ALL non-completed items (pending, failed, cancelled, not-found) and start processing again?")) return;
    const { data: j, error: fetchErr } = await supabase
      .from("bulk_section_jobs").select("rows, status").eq("id", jobId).maybeSingle();
    if (fetchErr || !j) {
      toast({ title: "Start All failed", description: fetchErr?.message || "Job not found", variant: "destructive" });
      return;
    }
    const rows = ((j.rows as unknown) as RowState[]) || [];

    // Re-match not_found rows against current colleges table (in case colleges were added since)
    const notFoundNames = rows.filter(r => r.status === "not_found").map(r => r.inputName);
    const rematched: Record<string, { id: string; name: string }> = {};
    if (notFoundNames.length > 0) {
      const { data: matches } = await supabase.from("colleges")
        .select("id, name").in("name", notFoundNames);
      (matches || []).forEach((c: any) => { rematched[(c.name || "").toLowerCase()] = c; });
      const stillUnmatched = notFoundNames.filter(n => !rematched[n.toLowerCase()]);
      for (const n of stillUnmatched) {
        const { data: m } = await supabase.from("colleges")
          .select("id, name").ilike("name", n).limit(1).maybeSingle();
        if (m) rematched[n.toLowerCase()] = m;
      }
    }

    const SECTION_DEFS = [
      { value: "courses_fees", label: "Courses & Fee Structure" },
      { value: "admission", label: "Admission Process" },
      { value: "placements", label: "Placement Statistics" },
      { value: "cutoff", label: "Cutoff Details" },
      { value: "rankings", label: "Rankings & Accreditations" },
      { value: "reviews", label: "Student Reviews" },
      { value: "gallery", label: "Campus Gallery" },
      { value: "scholarships", label: "Scholarships" },
      { value: "faculty", label: "Faculty Profiles" },
      { value: "hostel", label: "Hostel & Campus Life" },
      { value: "qa", label: "Frequently Asked Questions" },
      { value: "quick_info", label: "Quick Info / Sidebar" },
      { value: "why_join", label: "Why Join (Ratings)" },
      { value: "news", label: "Latest News & Articles" },
    ];

    let requeuedRows = 0;
    let requeuedSteps = 0;
    let stillNotFound = 0;

    const newRows = rows.map((r: any) => {
      if (r.status === "not_found") {
        const m = rematched[(r.inputName || "").toLowerCase()];
        if (m) {
          requeuedRows++;
          return {
            ...r,
            collegeId: m.id,
            matchedName: m.name,
            status: "pending",
            error: undefined,
            steps: SECTION_DEFS.map(s => ({ type: s.value, label: s.label, status: "pending" })),
          };
        }
        stillNotFound++;
        return r;
      }
      if (r.status === "succeeded") return r;
      requeuedRows++;
      const newSteps = (r.steps || []).map((s: any) => {
        if (s.status === "succeeded") return s;
        requeuedSteps++;
        return { ...s, status: "pending", error: undefined, startedAt: undefined };
      });
      return { ...r, status: "pending", error: undefined, steps: newSteps };
    });

    const newTotalSteps = newRows.reduce((acc: number, r: any) =>
      acc + (r.status === "not_found" ? 0 : (r.steps?.length || 0)), 0);
    const newStepsDone = newRows.reduce((acc: number, r: any) =>
      acc + (r.steps || []).filter((s: any) => s.status === "succeeded").length, 0);

    if (requeuedRows === 0) {
      toast({ title: "Nothing to start", description: "All items are already completed." });
      return;
    }

    await supabase.from("bulk_section_jobs").update({
      rows: newRows as any,
      status: "pending",
      total_steps: newTotalSteps,
      steps_done: newStepsDone,
      not_found: stillNotFound,
      failed: 0,
      finished_at: null,
      current_activity: `Start All: re-queued ${requeuedRows} college(s), ${requeuedSteps} section(s)${Object.keys(rematched).length ? `, recovered ${Object.keys(rematched).length} not-found` : ""}`,
    }).eq("id", jobId);

    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.functions.invoke("bulk-section-create", {
      body: { action: "resume", job_id: jobId },
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    if (error) {
      toast({ title: "Start All failed", description: error.message, variant: "destructive" });
      return;
    }
    const recoveredMsg = Object.keys(rematched).length > 0 ? ` · ${Object.keys(rematched).length} not-found recovered` : "";
    const stillMsg = stillNotFound > 0 ? ` · ${stillNotFound} still not found` : "";
    // Immediately refresh local job state so the UI re-arms polling and shows progress
    const { data: refreshed } = await supabase
      .from("bulk_section_jobs").select("*").eq("id", jobId).maybeSingle();
    if (refreshed) setJob(refreshed as any);
    toast({
      title: "Started All",
      description: `${requeuedRows} college(s) · ${requeuedSteps} section(s) re-queued${recoveredMsg}${stillMsg}`,
    });
  };

  const retryFailed = async (jobId: string) => {
    const { data: j, error: fetchErr } = await supabase
      .from("bulk_section_jobs").select("rows").eq("id", jobId).maybeSingle();
    if (fetchErr || !j) {
      toast({ title: "Retry failed", description: fetchErr?.message || "Job not found", variant: "destructive" });
      return;
    }
    const rows = ((j.rows as unknown) as RowState[]);
    let failedSteps = 0;
    const resetRows = rows.map(r => {
      const failedInRow = (r.steps || []).filter(s => s.status === "failed").length;
      if (failedInRow === 0 && r.status !== "failed") return r;
      failedSteps += failedInRow;
      return {
        ...r,
        status: r.status === "not_found" ? r.status : ("pending" as const),
        error: undefined,
        steps: (r.steps || []).map(s =>
          s.status === "failed" ? { ...s, status: "pending" as const, error: undefined } : s
        ),
      };
    });
    if (failedSteps === 0) {
      toast({ title: "Nothing to retry", description: "No failed sections in this job." });
      return;
    }
    await supabase.from("bulk_section_jobs").update({
      rows: resetRows as any,
      status: "pending",
      current_activity: `Retrying ${failedSteps} failed section${failedSteps === 1 ? "" : "s"}…`,
      finished_at: null,
    }).eq("id", jobId);

    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.functions.invoke("bulk-section-create", {
      body: { action: "resume", job_id: jobId },
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    if (error) {
      toast({ title: "Retry failed", description: error.message, variant: "destructive" });
      return;
    }
    const { data: refreshed } = await supabase
      .from("bulk_section_jobs").select("*").eq("id", jobId).maybeSingle();
    if (refreshed) setJob(refreshed as any);
    toast({ title: "Retrying failed sections", description: `${failedSteps} section${failedSteps === 1 ? "" : "s"} re-queued.` });
  };

  const autoRetryStale = async (jobId: string, opts: { silent?: boolean } = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("bulk-section-create", {
      body: { action: "auto_retry_stale", job_id: jobId, threshold_ms: 5 * 60_000 },
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    if (error) {
      if (!opts.silent) toast({ title: "Auto-retry failed", description: error.message, variant: "destructive" });
      return;
    }
    const stepsRequeued = data?.steps_requeued || 0;
    const requeued = (data?.requeued || []) as { college: string; steps: string[] }[];
    if (stepsRequeued === 0) {
      if (!opts.silent) toast({ title: "Nothing stuck", description: "No items have been pending for >5 minutes." });
      return;
    }
    const summary = requeued.slice(0, 3).map(r => `${r.college} (${r.steps.length})`).join(", ");
    const more = requeued.length > 3 ? `, +${requeued.length - 3} more` : "";
    toast({
      title: `Re-queued ${stepsRequeued} stuck section${stepsRequeued === 1 ? "" : "s"}`,
      description: `${summary}${more}`,
    });
  };

  // Auto-trigger stale retry every 60s while job is active
  useEffect(() => {
    if (!job || (job.status !== "running" && job.status !== "pending")) return;
    const id = window.setInterval(() => {
      autoRetryStale(job.id, { silent: true });
    }, 60_000);
    return () => window.clearInterval(id);
  }, [job?.id, job?.status]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/admin/college-sections">
            <Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
          </Link>
          <h1 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" /> Bulk Generate College Sections
          </h1>
        </div>
      </div>

      {/* Input panel */}
      {!job && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-primary" /> Paste College Names
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-muted-foreground space-y-1.5 bg-muted/30 border border-border rounded-md p-3">
              <p><strong className="text-foreground">How it works:</strong></p>
              <ul className="list-disc pl-5 space-y-0.5">
                <li>Paste one college name per line — exactly as stored in the Colleges database (case-insensitive match supported).</li>
                <li>For each matched college we auto-create the 14 standard section rows (if missing) and call the AI for every section.</li>
                <li>One safe worker runs section-by-section and auto-resumes until the full batch is complete.</li>
                <li>Job runs in the background — feel free to switch tabs or close this page; come back any time to see progress.</li>
                <li>Unmatched college names are reported separately (no duplicates / not in DB).</li>
              </ul>
            </div>
            <Textarea
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              rows={12}
              placeholder={"IIM Ahmedabad\nIIM Bangalore\nXLRI Jamshedpur\nFMS Delhi\n..."}
              className="font-mono text-sm"
            />
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs text-muted-foreground">
                {parsedNames.length} unique college name{parsedNames.length === 1 ? "" : "s"} ready ·
                Estimated ~{formatDuration(parsedNames.length * 14 * PER_STEP_SECONDS)} total
              </div>
              <Button onClick={handleSubmit} disabled={submitting || parsedNames.length === 0}>
                {submitting
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting…</>
                  : <><Play className="w-4 h-4 mr-2" /> Start Bulk Generation</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Live progress panel */}
      {job && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                {job.status === "running"
                  ? <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  : job.status === "completed"
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    : <AlertTriangle className="w-4 h-4 text-amber-600" />}
                Job · {job.status}
              </CardTitle>
              <div className="flex items-center gap-2">
                {(job.status === "running" || job.status === "pending") && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => autoRetryStale(job.id)}>
                      <RotateCw className="w-3.5 h-3.5 mr-1.5" /> Retry Stuck (&gt;5min)
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => cancelJob(job.id)}>
                      <Ban className="w-3.5 h-3.5 mr-1.5" /> Cancel
                    </Button>
                  </>
                )}
                {(job.status === "completed" || job.status === "failed" || job.status === "cancelled") && job.failed > 0 && (
                  <Button size="sm" variant="default" onClick={() => retryFailed(job.id)}>
                    <RotateCw className="w-3.5 h-3.5 mr-1.5" /> Retry Failed ({job.failed})
                  </Button>
                )}
                {(job.status === "completed" || job.status === "failed" || job.status === "cancelled") && (
                  <>
                    <Button size="sm" variant="default" className="bg-primary" onClick={() => startAll(job.id)}>
                      <RotateCw className="w-3.5 h-3.5 mr-1.5" /> Start All (Pending + Failed + Cancelled + Not Found)
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => restartJob(job.id)}>
                      <RotateCw className="w-3.5 h-3.5 mr-1.5" /> Restart
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="sm" onClick={() => setJob(null)}>New job</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center">
              <div className="rounded-md border border-border bg-background p-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Colleges</div>
                <div className="text-base font-bold text-foreground">{job.total_rows}</div>
              </div>
              <div className="rounded-md border border-border bg-background p-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Steps Done</div>
                <div className="text-base font-bold text-primary">{job.steps_done} / {job.total_steps}</div>
              </div>
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2">
                <div className="text-[10px] uppercase tracking-wide text-emerald-700">Succeeded</div>
                <div className="text-base font-bold text-emerald-700">{job.succeeded}</div>
              </div>
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-2">
                <div className="text-[10px] uppercase tracking-wide text-destructive">Failed</div>
                <div className="text-base font-bold text-destructive">{job.failed}</div>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-2">
                <div className="text-[10px] uppercase tracking-wide text-amber-700">Not Found</div>
                <div className="text-base font-bold text-amber-700">{job.not_found}</div>
              </div>
              <div className="rounded-md border border-border bg-background p-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 justify-center"><Clock className="w-3 h-3" /> ETA</div>
                <div className="text-base font-bold text-foreground">
                  {job.status === "completed" || job.status === "failed"
                    ? formatDuration(elapsed || 0)
                    : eta != null ? `~${formatDuration(eta)}` : "—"}
                </div>
              </div>
            </div>

            {/* Overall progress */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-foreground">Overall progress</span>
                <span className="font-bold text-primary">{overallPct}%</span>
              </div>
              <Progress value={overallPct} className="h-3" />
              {job.current_activity && (
                <p className="text-xs text-muted-foreground mt-1.5 truncate">
                  <span className="font-medium text-foreground">Now:</span> {job.current_activity}
                </p>
              )}
            </div>

            {/* Per-row detail */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {(job.rows || []).map((row) => {
                const totalSteps = row.steps?.length || 0;
                const stepsDone = (row.steps || []).filter(s => s.status === "succeeded" || s.status === "failed").length;
                const rowPct = totalSteps ? Math.round((stepsDone / totalSteps) * 100) : 0;
                const isOpen = !!expanded[row.index];

                let badge: { label: string; cls: string; icon: any } = { label: row.status, cls: "bg-muted text-muted-foreground", icon: null };
                if (row.status === "succeeded") badge = { label: "Succeeded", cls: "bg-emerald-100 text-emerald-800", icon: CheckCircle2 };
                else if (row.status === "failed") badge = { label: "Failed", cls: "bg-destructive/10 text-destructive", icon: XCircle };
                else if (row.status === "not_found") badge = { label: "Not Found", cls: "bg-amber-100 text-amber-800", icon: AlertTriangle };
                else if (row.status === "processing") badge = { label: "Processing", cls: "bg-primary/10 text-primary", icon: Loader2 };
                else badge = { label: "Pending", cls: "bg-muted text-muted-foreground", icon: Clock };

                const Icon = badge.icon;

                return (
                  <div key={row.index} className="border border-border rounded-md overflow-hidden bg-background">
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/40 text-left"
                      onClick={() => setExpanded(prev => ({ ...prev, [row.index]: !isOpen }))}
                    >
                      {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      <span className="text-xs font-mono text-muted-foreground w-8">#{row.index + 1}</span>
                      <span className="text-sm font-medium text-foreground flex-1 truncate">
                        {row.inputName}
                        {row.matchedName && row.matchedName !== row.inputName && (
                          <span className="text-xs text-muted-foreground"> → {row.matchedName}</span>
                        )}
                      </span>
                      {row.collegeId && totalSteps > 0 && (
                        <div className="hidden md:flex items-center gap-2 w-44">
                          <Progress value={rowPct} className="h-1.5 flex-1" />
                          <span className="text-[10px] font-mono text-muted-foreground w-10 text-right">{stepsDone}/{totalSteps}</span>
                        </div>
                      )}
                      <Badge className={`${badge.cls} border-0 text-[10px] px-1.5 py-0.5`}>
                        {Icon && <Icon className={`w-3 h-3 mr-1 ${row.status === "processing" ? "animate-spin" : ""}`} />}
                        {badge.label}
                      </Badge>
                    </button>

                    {isOpen && (
                      <div className="border-t border-border bg-muted/20 p-3 space-y-1.5">
                        {row.error && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <XCircle className="w-3 h-3" /> {row.error}
                          </p>
                        )}
                        {row.steps?.length ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                            {row.steps.map((s, si) => {
                              let cls = "text-muted-foreground";
                              let SIcon: any = Clock;
                              if (s.status === "succeeded") { cls = "text-emerald-700"; SIcon = CheckCircle2; }
                              else if (s.status === "failed") { cls = "text-destructive"; SIcon = XCircle; }
                              else if (s.status === "processing") { cls = "text-primary"; SIcon = Loader2; }
                              return (
                                <div key={si} className={`flex items-start gap-1.5 text-xs px-2 py-1 rounded bg-background border border-border/50 ${cls}`}>
                                  <SIcon className={`w-3 h-3 mt-0.5 flex-shrink-0 ${s.status === "processing" ? "animate-spin" : ""}`} />
                                  <div className="flex-1 min-w-0">
                                    <div className="truncate font-medium">{s.label}</div>
                                    {s.error && <div className="text-[10px] truncate" title={s.error}>{s.error}</div>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No steps to run for this row.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent jobs */}
      {recentJobs.length > 0 && !job && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Recent Jobs</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recentJobs.map((j) => {
                const canRetry = j.failed > 0 && (j.status === "completed" || j.status === "failed" || j.status === "cancelled");
                return (
                  <div key={j.id} className="w-full px-4 py-2 hover:bg-muted/40 flex items-center justify-between gap-3">
                    <button type="button" onClick={() => openJob(j.id)} className="flex-1 text-left flex items-center gap-2 text-sm">
                      {j.status === "running" && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                      {j.status === "completed" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      {j.status === "failed" && <XCircle className="w-4 h-4 text-destructive" />}
                      {j.status === "pending" && <Clock className="w-4 h-4 text-muted-foreground" />}
                      <span className="font-medium text-foreground">{j.total_rows} colleges</span>
                      <span className="text-xs text-muted-foreground">
                        · {j.steps_done}/{j.total_steps} steps
                        {j.failed > 0 && <span className="text-destructive"> · ✕{j.failed} failed</span>}
                        · {new Date(j.created_at).toLocaleString()}
                      </span>
                    </button>
                    <div className="flex items-center gap-2">
                      {canRetry && (
                        <Button size="sm" variant="default" onClick={(e) => { e.stopPropagation(); retryFailed(j.id); }}>
                          <RotateCw className="w-3.5 h-3.5 mr-1.5" /> Retry Failed ({j.failed})
                        </Button>
                      )}
                      <Badge variant="outline" className="text-[10px]">{j.status}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
