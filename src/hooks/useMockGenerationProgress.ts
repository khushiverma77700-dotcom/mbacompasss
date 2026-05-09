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
  duplicates_rejected: number;
  dup_hash: number;
  dup_similarity: number;
  dup_paraphrase: number;
  dup_db_conflict: number;
  rejected_invalid: number;
  final_reason: string | null;
  level?: string | null;
  created_at?: string | null;
  /** Kept for UI compatibility; long AI calls are no longer marked stuck client-side. */
  isStalled?: boolean;
};

export type QueueSnapshot = {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  retried: number; // jobs whose attempts > 1
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
  qps: number; // questions per second
  etaSec: number | null;
  // ---- Diagnostics ----
  totalDuplicates: number;
  dupHash: number;
  dupSimilarity: number;
  dupParaphrase: number;
  dupDbConflict: number;
  rejectedInvalid: number;
  // ---- Global worker queue snapshot ----
  queue: QueueSnapshot;
};

export function useMockGenerationProgress(generationId: string | null, intervalMs = 1500): MockGenerationProgress {
  const [jobs, setJobs] = useState<SectionJob[]>([]);
  const [queue, setQueue] = useState<QueueSnapshot>({ pending: 0, processing: 0, completed: 0, failed: 0, retried: 0 });
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

    const SELECT = "id, section_code, section_name, total_questions, questions_done, status, attempts, current_step, error_message, updated_at, created_at, duplicates_rejected, dup_hash, dup_similarity, dup_paraphrase, dup_db_conflict, rejected_invalid, final_reason, level";

    const fetchJobs = async () => {
      const [{ data: gen }, { data: all }] = await Promise.all([
        supabase
          .from("mock_section_jobs")
          .select(SELECT)
          .eq("generation_id", generationId)
          .order("created_at", { ascending: true }),
        // Global queue snapshot — last 24h of activity gives a meaningful number
        supabase
          .from("mock_section_jobs")
          .select("status, attempts")
          .gte("updated_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

      if (!alive) return;
      setJobs((gen ?? []) as SectionJob[]);
      const firstCreatedAt = (gen ?? [])
        .map((j: any) => new Date(j.created_at || j.updated_at || 0).getTime())
        .filter((t) => Number.isFinite(t) && t > 0)
        .sort((a, b) => a - b)[0];
      if (firstCreatedAt) setStartedAt(firstCreatedAt);
      const snap: QueueSnapshot = { pending: 0, processing: 0, completed: 0, failed: 0, retried: 0 };
      for (const r of all ?? []) {
        const s = (r as any).status as string;
        if (s === "pending") snap.pending++;
        else if (s === "processing") snap.processing++;
        else if (s === "completed") snap.completed++;
        else if (s === "failed") snap.failed++;
        if (((r as any).attempts || 0) > 1) snap.retried++;
      }
      setQueue(snap);
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

  const sumOf = (k: keyof SectionJob) =>
    annotatedJobs.reduce((s, j) => s + (Number((j as any)[k]) || 0), 0);

  const dupHash = sumOf("dup_hash");
  const dupSimilarity = sumOf("dup_similarity");
  const dupParaphrase = sumOf("dup_paraphrase");
  const dupDbConflict = sumOf("dup_db_conflict");
  const rejectedInvalid = sumOf("rejected_invalid");
  const totalDuplicates = dupHash + dupSimilarity + dupParaphrase + dupDbConflict;

  return {
    loading, jobs: annotatedJobs,
    totalSections, doneSections, pendingSections, processingSections, failedSections, stalledSections,
    totalQuestions, generatedQuestions, remainingQuestions,
    pct, current, isComplete, hasFailures, hasStalled,
    startedAt, elapsedSec, qps, etaSec,
    totalDuplicates, dupHash, dupSimilarity, dupParaphrase, dupDbConflict, rejectedInvalid,
    queue,
  };
}
