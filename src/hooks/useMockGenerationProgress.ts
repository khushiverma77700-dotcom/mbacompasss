import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SectionJob = {
  id: string;
  section_code: string;
  section_name: string;
  total_questions: number;
  questions_done: number;
  status: "pending" | "processing" | "completed" | "failed" | string;
  attempts: number;
  current_step: string | null;
  error_message: string | null;
  updated_at: string | null;
  /** Kept for UI compatibility; long AI calls are no longer marked stuck client-side. */
  isStalled?: boolean;
};

export type MockGenerationProgress = {
  loading: boolean;
  jobs: SectionJob[];
  totalSections: number;
  doneSections: number;
  pendingSections: number;
  processingSections: number;
  failedSections: number;
  stalledSections: number;
  totalQuestions: number;
  generatedQuestions: number;
  remainingQuestions: number;
  pct: number;
  current?: string;
  isComplete: boolean;
  hasFailures: boolean;
  hasStalled: boolean;
  startedAt: number | null;
  elapsedSec: number;
  qps: number;          // questions per second
  etaSec: number | null;
};

export function useMockGenerationProgress(generationId: string | null, intervalMs = 1500): MockGenerationProgress {
  const [jobs, setJobs] = useState<SectionJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (!generationId) {
      setJobs([]);
      setStartedAt(null);
      return;
    }
    let alive = true;
    setLoading(true);
    setStartedAt(Date.now());
    const fetchJobs = async () => {
      const { data } = await supabase
        .from("mock_section_jobs")
        .select("id, section_code, section_name, total_questions, questions_done, status, attempts, current_step, error_message, updated_at")
        .eq("generation_id", generationId)
        .order("created_at", { ascending: true });
      if (!alive) return;
      setJobs((data ?? []) as SectionJob[]);
      setLoading(false);
    };
    fetchJobs();
    const t = setInterval(fetchJobs, intervalMs);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { alive = false; clearInterval(t); clearInterval(tick); };
  }, [generationId, intervalMs]);

  // Single-question generation can legitimately take a long time; do not show false "stuck" errors.
  const annotatedJobs: SectionJob[] = jobs.map((j) => ({ ...j, isStalled: false }));

  const totalSections = annotatedJobs.length;
  const doneSections = annotatedJobs.filter((j) => j.status === "completed").length;
  const failedSections = annotatedJobs.filter((j) => j.status === "failed").length;
  const processingSections = annotatedJobs.filter((j) => j.status === "processing").length;
  const stalledSections = annotatedJobs.filter((j) => j.isStalled).length;
  const pendingSections = annotatedJobs.filter((j) => j.status === "pending" || j.status === "processing").length;
  const totalQuestions = annotatedJobs.reduce((s, j) => s + (j.total_questions || 0), 0);
  const generatedQuestions = annotatedJobs.reduce((s, j) => s + (j.questions_done || 0), 0);
  const remainingQuestions = Math.max(0, totalQuestions - generatedQuestions);
  const pct = totalQuestions ? Math.round((generatedQuestions / totalQuestions) * 100) : 0;
  const current = annotatedJobs.find((j) => j.status === "processing")?.section_name;
  const isComplete = totalSections > 0 && pendingSections === 0;
  const hasFailures = failedSections > 0;
  const hasStalled = stalledSections > 0;

  const elapsedSec = startedAt ? Math.max(1, Math.round((now - startedAt) / 1000)) : 0;
  const qps = elapsedSec > 0 ? generatedQuestions / elapsedSec : 0;
  const etaSec = !isComplete && qps > 0 && remainingQuestions > 0
    ? Math.round(remainingQuestions / qps)
    : (isComplete ? 0 : null);

  return {
    loading, jobs: annotatedJobs,
    totalSections, doneSections, pendingSections, processingSections, failedSections, stalledSections,
    totalQuestions, generatedQuestions, remainingQuestions,
    pct, current, isComplete, hasFailures, hasStalled,
    startedAt, elapsedSec, qps, etaSec,
  };
}
