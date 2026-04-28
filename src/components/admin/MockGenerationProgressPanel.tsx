import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2, CheckCircle2, XCircle, Clock, Sparkles, Activity,
  Gauge, Timer, ListChecks, AlertTriangle, Zap, Brain, RotateCcw,
} from "lucide-react";
import { useMockGenerationProgress } from "@/hooks/useMockGenerationProgress";
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
          <Stat label="Remaining" value={p.remainingQuestions} />
        </div>

        {/* Per-section live cards */}
        {!compact && p.jobs.length > 0 && (
          <div className="space-y-2 pt-1 max-h-80 overflow-y-auto pr-1">
            {p.jobs.map((j) => {
              const sectionPct = j.total_questions ? Math.round((j.questions_done / j.total_questions) * 100) : 0;
              const isActive = j.status === "processing";
              const isDone = j.status === "completed";
              const isFailed = j.status === "failed";
              return (
                <div
                  key={j.id}
                  className={`relative rounded-lg border p-3 transition-all ${
                    isActive ? "border-sky-300 bg-sky-50/80 shadow-sm ring-1 ring-sky-200" :
                    isDone ? "border-emerald-200 bg-emerald-50/60" :
                    isFailed ? "border-rose-200 bg-rose-50/60" :
                    "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${
                      isActive ? "bg-sky-100" : isDone ? "bg-emerald-100" : isFailed ? "bg-rose-100" : "bg-slate-100"
                    }`}>
                      <StatusIcon status={j.status} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate text-slate-900" title={j.section_name}>
                            {j.section_name}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <Badge variant="outline" className="h-4 px-1.5 text-[10px]">{j.section_code}</Badge>
                            {isActive && j.current_step && <span className="truncate">{j.current_step}</span>}
                            {isFailed && j.error_message && <span className="text-rose-600 truncate" title={j.error_message}>{j.error_message}</span>}
                            {j.attempts > 1 && <span className="text-amber-600">retry #{j.attempts - 1}</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-slate-900 tabular-nums">{j.questions_done}/{j.total_questions}</div>
                          <div className="text-[10px] text-slate-500">{sectionPct}%</div>
                        </div>
                      </div>
                      {/* Per-section progress */}
                      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200/60 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isFailed ? "bg-rose-500" :
                            isDone ? "bg-emerald-500" :
                            "bg-gradient-to-r from-sky-500 to-blue-500"
                          }`}
                          style={{ width: `${sectionPct}%` }}
                        >
                          {isActive && (
                            <div className="h-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {p.isComplete && !p.hasFailures && (
          <div className="text-center text-sm text-emerald-700 font-medium pt-1">
            All sections generated successfully — ready to review.
          </div>
        )}
      </CardContent>
    </Card>
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
