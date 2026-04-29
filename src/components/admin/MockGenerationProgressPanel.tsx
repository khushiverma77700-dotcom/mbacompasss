import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Loader2, CheckCircle2, XCircle, Clock, Sparkles, Activity,
  Gauge, Timer, ListChecks, AlertTriangle, Zap, Brain, RotateCcw,
  ShieldCheck, Stethoscope, BarChart3, Copy, FileSearch, Layers,
} from "lucide-react";
import { useMockGenerationProgress, type SectionJob } from "@/hooks/useMockGenerationProgress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  generationId: string | null;
  compact?: boolean;
}

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "completed") return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
  if (status === "failed") return <XCircle className="w-4 h-4 text-rose-600" />;
  if (status === "processing") return <Loader2 className="w-4 h-4 animate-spin text-sky-600" />;
  return <Clock className="w-4 h-4 text-slate-400" />;
};

const fmtTime = (s: number | null) => {
  if (s === null) return "—";
  if (s <= 0) return "0s";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
};

export default function MockGenerationProgressPanel({ generationId, compact = false }: Props) {
  const p = useMockGenerationProgress(generationId);
  if (!generationId) return null;

  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const dash = (p.pct / 100) * circ;

  const headline = p.isComplete
    ? (p.hasFailures ? "Completed with errors" : "Generation complete")
    : p.totalSections === 0
      ? "Initializing AI workers…"
      : `Generating section ${p.doneSections + 1} of ${p.totalSections}`;

  return (
    <Card className="overflow-hidden border-sky-200 shadow-lg">
      {/* Animated header */}
      <div className="relative bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-600 text-white p-5">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-white/20 blur-3xl animate-pulse" />
          <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-cyan-300/30 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        <div className="relative flex items-center gap-5 flex-wrap">
          {/* Radial progress */}
          <div className="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
              <circle cx="60" cy="60" r={radius} stroke="rgba(255,255,255,0.2)" strokeWidth="10" fill="none" />
              <circle
                cx="60" cy="60" r={radius}
                stroke="white" strokeWidth="10" fill="none"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                style={{ transition: "stroke-dasharray 0.6s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-3xl font-bold leading-none">{p.pct}%</div>
              <div className="text-[10px] uppercase tracking-wider text-white/80 mt-1">complete</div>
            </div>
            {!p.isComplete && (
              <div className="absolute -top-1 -right-1 bg-white text-sky-600 rounded-full p-1.5 shadow-lg animate-bounce">
                <Brain className="w-4 h-4" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-[220px]">
            <div className="flex items-center gap-2 mb-1">
              {p.isComplete
                ? <CheckCircle2 className="w-5 h-5" />
                : <Sparkles className="w-5 h-5 animate-pulse" />}
              <span className="text-xs uppercase tracking-widest text-white/80 font-semibold">
                AI Mock Generation
              </span>
            </div>
            <div className="text-xl font-bold">{headline}</div>
            {!p.isComplete && p.current && (
              <div className="mt-1 text-sm text-white/90 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 animate-pulse" />
                <span>Now processing: <strong>{p.current}</strong></span>
              </div>
            )}

            {/* Live ticker chips */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Chip icon={<ListChecks className="w-3 h-3" />} label={`${p.generatedQuestions}/${p.totalQuestions} Q`} />
              <Chip icon={<Timer className="w-3 h-3" />} label={`Elapsed ${fmtTime(p.elapsedSec)}`} />
              <Chip icon={<Gauge className="w-3 h-3" />} label={`ETA ${fmtTime(p.etaSec)}`} />
              <Chip icon={<Zap className="w-3 h-3" />} label={`${p.qps.toFixed(1)} q/s`} />
              {p.failedSections > 0 && (
                <Chip icon={<AlertTriangle className="w-3 h-3" />} label={`${p.failedSections} failed`} tone="danger" />
              )}
            </div>
          </div>
        </div>

        {/* Slim animated progress bar at bottom of header */}
        <div className="relative mt-4 h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-700 relative"
            style={{ width: `${p.pct}%` }}
          >
            {!p.isComplete && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-pulse" />
            )}
          </div>
        </div>
      </div>

      <CardContent className="p-4 space-y-3 bg-gradient-to-b from-sky-50/40 to-white">
        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Sections done" value={`${p.doneSections} / ${p.totalSections}`} tone="ok" />
          <Stat label="Processing" value={p.processingSections} tone="info" />
          <Stat label="Generated" value={p.generatedQuestions} tone="ok" />
          <Stat label="Rejected dups" value={p.totalDuplicates} tone={p.totalDuplicates > 0 ? "info" : undefined} />
        </div>

        {!compact && (
          <Tabs defaultValue="health" className="pt-1">
            <TabsList className="grid w-full grid-cols-3 h-9 bg-sky-100/50">
              <TabsTrigger value="health" className="text-xs gap-1.5">
                <Stethoscope className="w-3.5 h-3.5" /> Health
              </TabsTrigger>
              <TabsTrigger value="diagnostics" className="text-xs gap-1.5">
                <FileSearch className="w-3.5 h-3.5" /> Diagnostics
              </TabsTrigger>
              <TabsTrigger value="queue" className="text-xs gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Queue
              </TabsTrigger>
            </TabsList>

            {/* ---------- HEALTH ---------- */}
            <TabsContent value="health" className="mt-3">
              {p.jobs.length === 0 ? (
                <EmptyHint text="Section workers will appear here as soon as the AI starts producing." />
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {p.jobs.map((j) => (
                    <SectionHealthRow key={j.id} job={j} />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ---------- DIAGNOSTICS ---------- */}
            <TabsContent value="diagnostics" className="mt-3">
              <DiagnosticsPanel jobs={p.jobs} totals={{
                hash: p.dupHash,
                similarity: p.dupSimilarity,
                paraphrase: p.dupParaphrase,
                dbConflict: p.dupDbConflict,
                invalid: p.rejectedInvalid,
              }} />
            </TabsContent>

            {/* ---------- QUEUE ---------- */}
            <TabsContent value="queue" className="mt-3">
              <QueuePanel queue={p.queue} thisRun={{
                pending: p.jobs.filter((j) => j.status === "pending").length,
                processing: p.processingSections,
                completed: p.doneSections,
                failed: p.failedSections,
                retried: p.jobs.filter((j) => (j.attempts || 0) > 1).length,
              }} />
            </TabsContent>
          </Tabs>
        )}

        {p.isComplete && !p.hasFailures && (
          <div className="text-center text-sm text-emerald-700 font-medium pt-1">
            All sections generated successfully — ready to review.
          </div>
        )}

        {p.isComplete && p.hasFailures && (
          <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-rose-800">
                Generation finished with {p.failedSections} failed section{p.failedSections === 1 ? "" : "s"}
              </div>
              <div className="text-xs text-rose-700 mt-0.5">
                Only {p.generatedQuestions}/{p.totalQuestions} questions were saved. Use the Retry button on each failed section in the Health tab — your saved questions will be preserved.
              </div>
              <RetryAllFailedButton jobs={p.jobs.filter((j) => j.status === "failed").map((j) => ({ id: j.id, name: j.section_name }))} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------- Health row ----------------
function SectionHealthRow({ job: j }: { job: SectionJob }) {
  const sectionPct = j.total_questions ? Math.round((j.questions_done / j.total_questions) * 100) : 0;
  const isActive = j.status === "processing";
  const isDone = j.status === "completed";
  const isFailed = j.status === "failed";
  const isStalled = !!j.isStalled;
  const canRetry = isFailed || isStalled;
  const dups = j.duplicates_rejected || 0;

  return (
    <div
      className={`relative rounded-lg border p-3 transition-all ${
        isStalled ? "border-amber-300 bg-amber-50/80 shadow-sm ring-1 ring-amber-200" :
        isActive ? "border-sky-300 bg-sky-50/80 shadow-sm ring-1 ring-sky-200" :
        isDone ? "border-emerald-200 bg-emerald-50/60" :
        isFailed ? "border-rose-200 bg-rose-50/60" :
        "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${
          isStalled ? "bg-amber-100" :
          isActive ? "bg-sky-100" : isDone ? "bg-emerald-100" : isFailed ? "bg-rose-100" : "bg-slate-100"
        }`}>
          {isStalled ? <AlertTriangle className="w-4 h-4 text-amber-600" /> : <StatusIcon status={j.status} />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate text-slate-900 flex items-center gap-2" title={j.section_name}>
                {j.section_name}
                {isStalled && (
                  <Badge className="h-4 px-1.5 text-[10px] bg-amber-500 hover:bg-amber-500 text-white">Stuck</Badge>
                )}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <Badge variant="outline" className="h-4 px-1.5 text-[10px]">{j.section_code}</Badge>
                {isActive && j.current_step && <span className="truncate">{j.current_step}</span>}
                {isFailed && j.error_message && <span className="text-rose-600 truncate" title={j.error_message}>{j.error_message}</span>}
              </div>
            </div>
            <div className="text-right shrink-0 flex items-center gap-2">
              <div>
                <div className="text-sm font-bold text-slate-900 tabular-nums">{j.questions_done}/{j.total_questions}</div>
                <div className="text-[10px] text-slate-500">{sectionPct}%</div>
              </div>
              {canRetry && (
                <RetryButton jobId={j.id} sectionName={j.section_name} />
              )}
            </div>
          </div>
          {/* Per-section progress */}
          <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200/60 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isStalled ? "bg-amber-500" :
                isFailed ? "bg-rose-500" :
                isDone ? "bg-emerald-500" :
                "bg-gradient-to-r from-sky-500 to-blue-500"
              }`}
              style={{ width: `${Math.max(sectionPct, isStalled ? 5 : 0)}%` }}
            >
              {isActive && !isStalled && (
                <div className="h-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse" />
              )}
            </div>
          </div>
          {/* Diagnostic mini-row */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
            <MiniChip icon={<ShieldCheck className="w-3 h-3" />} label={`${j.questions_done} produced`} tone="ok" />
            {dups > 0 && <MiniChip icon={<Copy className="w-3 h-3" />} label={`${dups} duplicates rejected`} tone="info" />}
            {(j.attempts || 0) > 1 && <MiniChip icon={<RotateCcw className="w-3 h-3" />} label={`${j.attempts} attempts`} />}
            {(isDone || isFailed) && j.final_reason && (
              <span className="text-[10px] text-slate-600 italic truncate max-w-full" title={j.final_reason}>
                {j.final_reason}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- Diagnostics panel ----------------
function DiagnosticsPanel({
  jobs, totals,
}: {
  jobs: SectionJob[];
  totals: { hash: number; similarity: number; paraphrase: number; dbConflict: number; invalid: number };
}) {
  // Find the most-recent failed hard / extreme run for the headline call-out.
  const HARD_LEVELS = new Set(["hard", "very_hard", "extremely_hard", "cat_pyq"]);
  const failedHard = jobs
    .filter((j) => j.status === "failed" && HARD_LEVELS.has(String(j.level || "").toLowerCase()))
    .sort((a, b) => (b.updated_at || "").localeCompare(a.updated_at || ""))[0];

  const reasons = [
    { key: "hash", label: "Exact hash collision", desc: "Identical to an already-saved question.", count: totals.hash, bar: "bg-rose-500" },
    { key: "similarity", label: "Similarity rule (Jaccard ≥ 0.72)", desc: "Token overlap with another question in this section.", count: totals.similarity, bar: "bg-amber-500" },
    { key: "paraphrase", label: "Near-paraphrase (5-word shingles)", desc: "Substantial phrasing reuse across the section.", count: totals.paraphrase, bar: "bg-sky-500" },
    { key: "dbConflict", label: "Database uniqueness conflict", desc: "Hash collided at insert-time (race).", count: totals.dbConflict, bar: "bg-violet-500" },
    { key: "invalid", label: "Invalid candidate (missing options / answer)", desc: "AI returned malformed JSON or incomplete options.", count: totals.invalid, bar: "bg-slate-500" },
  ];

  const grandTotal = reasons.reduce((s, r) => s + r.count, 0);
  const sorted = [...reasons].sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-3">
      {failedHard && (
        <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-3">
          <div className="text-xs font-semibold text-rose-800 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Last failed hard / extreme run — {failedHard.section_name}
          </div>
          <div className="mt-1 text-[11px] text-rose-700 leading-snug">
            {failedHard.final_reason || failedHard.error_message || `Saved ${failedHard.questions_done}/${failedHard.total_questions}.`}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" /> Top duplicate reasons
          </div>
          <Badge variant="outline" className="h-5 text-[10px]">{grandTotal} total</Badge>
        </div>
        <div className="p-2 space-y-1.5">
          {grandTotal === 0 ? (
            <EmptyHint text="No duplicates rejected yet — the AI's output has been clean so far." />
          ) : (
            sorted.map((r) => {
              const pct = grandTotal ? Math.round((r.count / grandTotal) * 100) : 0;
              return (
                <div key={r.key} className="px-2 py-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-[12px] font-medium text-slate-800">{r.label}</div>
                    <div className="text-[11px] tabular-nums text-slate-500">{r.count} ({pct}%)</div>
                  </div>
                  <div className="text-[10px] text-slate-500 mb-1">{r.desc}</div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${r.bar}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- Queue dashboard ----------------
function QueuePanel({
  queue, thisRun,
}: {
  queue: { pending: number; processing: number; completed: number; failed: number; retried: number };
  thisRun: { pending: number; processing: number; completed: number; failed: number; retried: number };
}) {
  const cells = [
    { label: "Pending", value: queue.pending, tone: "muted" as const, icon: <Clock className="w-3.5 h-3.5" /> },
    { label: "Running", value: queue.processing, tone: "info" as const, icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
    { label: "Retried", value: queue.retried, tone: "warn" as const, icon: <RotateCcw className="w-3.5 h-3.5" /> },
    { label: "Completed", value: queue.completed, tone: "ok" as const, icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    { label: "Failed", value: queue.failed, tone: "danger" as const, icon: <XCircle className="w-3.5 h-3.5" /> },
  ];
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
          Worker queue (last 24 hours)
        </div>
        <div className="grid grid-cols-5 gap-2">
          {cells.map((c) => <QueueCell key={c.label} {...c} />)}
        </div>
      </div>
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
          This run only
        </div>
        <div className="grid grid-cols-5 gap-2">
          <QueueCell label="Pending" value={thisRun.pending} tone="muted" icon={<Clock className="w-3.5 h-3.5" />} />
          <QueueCell label="Running" value={thisRun.processing} tone="info" icon={<Loader2 className="w-3.5 h-3.5 animate-spin" />} />
          <QueueCell label="Retried" value={thisRun.retried} tone="warn" icon={<RotateCcw className="w-3.5 h-3.5" />} />
          <QueueCell label="Completed" value={thisRun.completed} tone="ok" icon={<CheckCircle2 className="w-3.5 h-3.5" />} />
          <QueueCell label="Failed" value={thisRun.failed} tone="danger" icon={<XCircle className="w-3.5 h-3.5" />} />
        </div>
      </div>
    </div>
  );
}

function QueueCell({ label, value, tone, icon }: {
  label: string; value: number;
  tone: "muted" | "info" | "warn" | "ok" | "danger";
  icon: React.ReactNode;
}) {
  const map: Record<string, string> = {
    muted: "bg-slate-50 border-slate-200 text-slate-700",
    info: "bg-sky-50 border-sky-200 text-sky-800",
    warn: "bg-amber-50 border-amber-200 text-amber-800",
    ok: "bg-emerald-50 border-emerald-200 text-emerald-800",
    danger: "bg-rose-50 border-rose-200 text-rose-800",
  };
  return (
    <div className={`rounded-lg border px-2 py-2 ${map[tone]}`}>
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">
        {icon}{label}
      </div>
      <div className="text-lg font-bold tabular-nums leading-tight">{value}</div>
    </div>
  );
}

function MiniChip({ icon, label, tone }: { icon: React.ReactNode; label: string; tone?: "ok" | "info" }) {
  const cls =
    tone === "ok" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
    tone === "info" ? "bg-sky-50 text-sky-700 border-sky-200" :
    "bg-slate-50 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${cls}`}>
      {icon}{label}
    </span>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="text-[12px] text-slate-500 italic px-2 py-3 text-center bg-slate-50/60 rounded-lg border border-dashed border-slate-200">
      {text}
    </div>
  );
}

function Chip({ icon, label, tone }: { icon: React.ReactNode; label: string; tone?: "danger" }) {
  const cls = tone === "danger"
    ? "bg-rose-500/30 border-rose-200/40"
    : "bg-white/15 border-white/25";
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full border ${cls} backdrop-blur-sm`}>
      {icon}{label}
    </span>
  );
}

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: "ok" | "info" | "danger" }) {
  const color =
    tone === "ok" ? "text-emerald-700" :
    tone === "info" ? "text-sky-700" :
    tone === "danger" ? "text-rose-700" : "text-slate-900";
  const bg =
    tone === "ok" ? "bg-emerald-50 border-emerald-100" :
    tone === "info" ? "bg-sky-50 border-sky-100" :
    tone === "danger" ? "bg-rose-50 border-rose-100" : "bg-white border-slate-200";
  return (
    <div className={`px-3 py-2 rounded-lg border ${bg}`}>
      <div className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold">{label}</div>
      <div className={`text-base font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function RetryButton({ jobId, sectionName }: { jobId: string; sectionName: string }) {
  const [loading, setLoading] = useState(false);
  const onClick = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("retry-mock-section", { body: { job_id: jobId } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Retrying ${sectionName}…`);
    } catch (e: any) {
      toast.error(e?.message || "Retry failed");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Button size="sm" variant="outline" className="h-7 px-2 gap-1 border-amber-300 text-amber-700 hover:bg-amber-50" onClick={onClick} disabled={loading}>
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
      Retry
    </Button>
  );
}

function RetryAllFailedButton({ jobs }: { jobs: { id: string; name: string }[] }) {
  const [loading, setLoading] = useState(false);
  if (jobs.length === 0) return null;
  const onClick = async () => {
    setLoading(true);
    let ok = 0, fail = 0;
    for (const j of jobs) {
      try {
        const { data, error } = await supabase.functions.invoke("retry-mock-section", { body: { job_id: j.id } });
        if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
        ok++;
      } catch {
        fail++;
      }
    }
    setLoading(false);
    if (fail === 0) toast.success(`Re-queued ${ok} failed section${ok === 1 ? "" : "s"}`);
    else toast.warning(`Re-queued ${ok}, failed to retry ${fail}`);
  };
  return (
    <Button size="sm" className="mt-2 h-8 gap-1.5 bg-rose-600 hover:bg-rose-700" onClick={onClick} disabled={loading}>
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
      Retry all {jobs.length} failed section{jobs.length === 1 ? "" : "s"}
    </Button>
  );
}
