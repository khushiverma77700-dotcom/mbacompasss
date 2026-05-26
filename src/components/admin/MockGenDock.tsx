import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Loader2, CheckCircle2, XCircle, Clock, X, ChevronRight,
  ChevronDown, ChevronUp, Trash2, StopCircle, Layers, Zap, RotateCw,
  Timer, ListOrdered,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useMockGenDock, type DockJob } from "@/contexts/MockGenDockContext";
import MockGenerationProgressPanel from "@/components/admin/MockGenerationProgressPanel";


/**
 * Floating, glassmorphism mock-generation dock pinned to the right edge.
 * - Minimized: small translucent pill showing live counts
 * - Expanded: scrollable panel with every queued / running / finished job
 * - Click outside expanded panel to minimize
 * - Up to 3 jobs run in parallel (handled by context); the next pending
 *   auto-starts whenever a slot frees
 */
export default function MockGenDock() {
  const {
    jobs, isOpen, open, close,
    activeCount, pendingCount, doneCount, failCount,
    cancel, dismiss, clearFinished, runNow, retry,
  } = useMockGenDock();
  const panelRef = useRef<HTMLDivElement>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  // Click outside collapses the expanded panel back to pill
  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) close();
    };
    const t = setTimeout(() => document.addEventListener("mousedown", onDown), 0);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", onDown); };
  }, [isOpen, close]);

  // Compute queue position (1-based) for each pending job by created order.
  const queuePosById = useMemo(() => {
    const map = new Map<string, number>();
    const pendings = jobs
      .filter((j) => j.status === "pending")
      .sort((a, b) => a.createdAt - b.createdAt);
    pendings.forEach((j, i) => map.set(j.id, i + 1));
    return map;
  }, [jobs]);

  const totalRequested = jobs.reduce((s, j) => s + (j.total_requested || 0), 0);
  const totalGenerated = jobs.reduce((s, j) => s + (j.total_generated || 0), 0);
  const overallPct = totalRequested > 0 ? Math.round((totalGenerated / totalRequested) * 100) : 0;

  if (!jobs.length) return null;


  return (
    <>
      {/* Minimized pill (always visible when jobs exist) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="pill"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            onClick={open}
            className="fixed right-4 bottom-6 z-[100] flex items-center gap-2 rounded-full px-4 py-2.5
                       bg-white/70 backdrop-blur-xl border border-sky-200/70 shadow-lg shadow-sky-500/10
                       hover:bg-white/90 transition group"
          >
            <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-white">
              {activeCount > 0
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Sparkles className="h-4 w-4" />}
              {pendingCount + activeCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-amber-400 ring-2 ring-white animate-pulse" />
              )}
            </span>
            <span className="text-sm font-semibold text-slate-800">
              AI Mocks
            </span>
            <span className="text-xs text-slate-600">
              {activeCount} running · {pendingCount} queued
              {doneCount ? ` · ${doneCount} done` : ""}
            </span>
            <ChevronRight className="h-4 w-4 text-slate-500 group-hover:-translate-x-0.5 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="panel"
            ref={panelRef}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="fixed right-3 top-16 bottom-4 z-[100] w-[min(420px,calc(100vw-1.5rem))]
                       flex flex-col rounded-2xl overflow-hidden
                       bg-white/75 backdrop-blur-2xl border border-sky-200/70
                       shadow-2xl shadow-sky-900/15"
          >
            {/* Header */}
            <div className="relative px-4 py-3 bg-gradient-to-br from-sky-50/80 via-white/40 to-blue-50/80 border-b border-sky-100/80">
              <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-sky-300/30 blur-3xl pointer-events-none" />
              <div className="relative flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white shadow shadow-sky-500/30">
                    {activeCount > 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900">AI Mock Generation</div>
                    <div className="text-[11px] text-slate-600">
                      {activeCount} running · {pendingCount} queued · {doneCount} done
                      {failCount ? ` · ${failCount} failed` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {(doneCount + failCount) > 0 && (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                      onClick={clearFinished} title="Clear finished">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={close}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {/* Concurrency hint */}
              <div className="relative mt-2 flex items-center gap-1.5 text-[10px] text-slate-600">
                <Layers className="h-3 w-3" />
                <span>Up to 3 mocks generate in parallel. The next queued one starts automatically.</span>
              </div>
            </div>

            {/* Scrollable list of jobs */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-2 space-y-2">
              {jobs.map((j) => (
                <JobRow key={j.id}
                  job={j}
                  expanded={expandedJob === j.id}
                  onToggle={() => setExpandedJob(expandedJob === j.id ? null : j.id)}
                  onCancel={() => cancel(j.id)}
                  onDismiss={() => dismiss(j.id)} />
              ))}
            </div>

            <div className="px-3 py-2 border-t border-sky-100/80 bg-white/40 text-[11px] text-slate-500 text-center">
              Click outside to minimize · The dock keeps running across pages
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ----------------------------------------------------------------------------

function statusMeta(status: DockJob["status"]) {
  // Shady gradient skins per status:
  //   completed → green   |  running/starting → yellow   |  pending → red
  switch (status) {
    case "pending":
      return {
        icon: Clock, color: "text-rose-700", label: "Not started",
        ring: "border-rose-200/80 bg-gradient-to-br from-rose-50 via-rose-100/60 to-rose-50 shadow-inner shadow-rose-200/40",
        bar: "[&_[data-state]]:bg-gradient-to-r [&_[data-state]]:from-rose-400 [&_[data-state]]:to-rose-500",
        dot: "bg-rose-500",
      };
    case "starting":
    case "running":
      return {
        icon: Loader2, spin: true, color: "text-amber-700", label: status === "starting" ? "Starting" : "In progress",
        ring: "border-amber-200/80 bg-gradient-to-br from-amber-50 via-yellow-100/70 to-amber-50 shadow-inner shadow-amber-200/40",
        bar: "[&_[data-state]]:bg-gradient-to-r [&_[data-state]]:from-amber-400 [&_[data-state]]:via-yellow-400 [&_[data-state]]:to-amber-500",
        dot: "bg-amber-500 animate-pulse",
      };
    case "completed":
      return {
        icon: CheckCircle2, color: "text-emerald-700", label: "Completed",
        ring: "border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-green-100/70 to-emerald-50 shadow-inner shadow-emerald-200/40",
        bar: "[&_[data-state]]:bg-gradient-to-r [&_[data-state]]:from-emerald-400 [&_[data-state]]:to-green-500",
        dot: "bg-emerald-500",
      };
    case "failed":
      return {
        icon: XCircle, color: "text-rose-700", label: "Failed",
        ring: "border-rose-300/80 bg-gradient-to-br from-rose-100 via-rose-200/60 to-rose-100 shadow-inner shadow-rose-300/40",
        bar: "[&_[data-state]]:bg-rose-500",
        dot: "bg-rose-600",
      };
    case "cancelled":
      return {
        icon: XCircle, color: "text-slate-600", label: "Cancelled",
        ring: "border-slate-200/80 bg-gradient-to-br from-slate-50 via-slate-100/60 to-slate-50",
        bar: "[&_[data-state]]:bg-slate-400",
        dot: "bg-slate-400",
      };
  }
}


function JobRow({
  job, expanded, onToggle, onCancel, onDismiss,
}: {
  job: DockJob; expanded: boolean;
  onToggle: () => void; onCancel: () => void; onDismiss: () => void;
}) {
  const meta = statusMeta(job.status);
  const Icon = meta.icon;
  const requested = job.total_requested ?? 0;
  const generated = job.total_generated ?? 0;
  const pct = requested > 0
    ? Math.min(100, Math.round((generated / requested) * 100))
    : (job.status === "completed" ? 100 : job.status === "running" ? 3 : 0);
  const isFinal = ["completed", "failed", "cancelled"].includes(job.status);

  return (
    <div className={`relative rounded-xl border ${meta.ring} backdrop-blur-sm transition-all overflow-hidden`}>
      {/* Glossy shimmer overlay — adds the "shady" depth */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/40 via-transparent to-white/10" />
      {/* Left status accent bar */}
      <div className={`pointer-events-none absolute left-0 top-0 bottom-0 w-1 ${meta.dot}`} />

      <button
        onClick={onToggle}
        className="relative w-full text-left pl-4 pr-3 py-2.5 flex items-start gap-2.5"
      >
        <div className={`mt-0.5 ${meta.color} flex-shrink-0`}>
          <Icon className={`h-4 w-4 ${meta.spin ? "animate-spin" : ""}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-slate-900 truncate">{job.label}</div>
            <Badge variant="outline" className={`text-[10px] font-semibold ${meta.color} bg-white/70 border-current/40 shadow-sm`}>
              <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </Badge>
          </div>
          <div className="mt-1 text-[11px] text-slate-700 flex items-center justify-between gap-2">
            <span>
              {generated}/{requested || "?"} questions
              {job.error ? ` · ${job.error.slice(0, 60)}` : ""}
            </span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </div>
          <Progress value={pct} className={`h-1.5 mt-1.5 bg-white/70 ${meta.bar}`} />
        </div>
      </button>


      {/* Row actions */}
      <div className="flex items-center justify-end gap-1 px-3 pb-2">
        {!isFinal && (
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] text-rose-600 hover:bg-rose-50"
            onClick={(e) => { e.stopPropagation(); onCancel(); }}>
            <StopCircle className="h-3 w-3 mr-1" /> Cancel
          </Button>
        )}
        {isFinal && (
          <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] text-slate-600 hover:bg-slate-100"
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}>
            <X className="h-3 w-3 mr-1" /> Dismiss
          </Button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {expanded && job.generation_id && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-current/10 bg-white/50"
          >
            <div className="p-2 max-h-[60vh] overflow-y-auto">
              <MockGenerationProgressPanel generationId={job.generation_id} compact />
            </div>
          </motion.div>
        )}
        {expanded && !job.generation_id && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-current/10 bg-white/50"
          >
            <p className="px-3 py-2 text-[11px] text-slate-500">
              {job.status === "pending" ? "Waiting for a free slot…" : "Dispatching to AI worker…"}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
