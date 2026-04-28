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
};

export type MockGenerationProgress = {
  loading: boolean;
  jobs: SectionJob[];
  totalSections: number;
  doneSections: number;
  pendingSections: number;
  failedSections: number;
  totalQuestions: number;
  generatedQuestions: number;
  remainingQuestions: number;
  pct: number;
  current?: string;
  isComplete: boolean;
  hasFailures: boolean;
};

export function useMockGenerationProgress(generationId: string | null, intervalMs = 2000): MockGenerationProgress {
  const [jobs, setJobs] = useState<SectionJob[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!generationId) {
      setJobs([]);
      return;
    }
    let alive = true;
    setLoading(true);
    const fetchJobs = async () => {
      const { data } = await supabase
        .from("mock_section_jobs")
        .select("id, section_code, section_name, total_questions, questions_done, status, attempts, current_step, error_message")
        .eq("generation_id", generationId)
        .order("created_at", { ascending: true });
      if (!alive) return;
      setJobs((data ?? []) as SectionJob[]);
      setLoading(false);
    };
    fetchJobs();
    const t = setInterval(fetchJobs, intervalMs);
    return () => { alive = false; clearInterval(t); };
  }, [generationId, intervalMs]);

  const totalSections = jobs.length;
  const doneSections = jobs.filter((j) => j.status === "completed").length;
  const failedSections = jobs.filter((j) => j.status === "failed").length;
  const pendingSections = jobs.filter((j) => j.status === "pending" || j.status === "processing").length;
  const totalQuestions = jobs.reduce((s, j) => s + (j.total_questions || 0), 0);
  const generatedQuestions = jobs.reduce((s, j) => s + (j.questions_done || 0), 0);
  const remainingQuestions = Math.max(0, totalQuestions - generatedQuestions);
  const pct = totalQuestions ? Math.round((generatedQuestions / totalQuestions) * 100) : 0;
  const current = jobs.find((j) => j.status === "processing")?.section_name;
  const isComplete = totalSections > 0 && pendingSections === 0;
  const hasFailures = failedSections > 0;

  return {
    loading, jobs,
    totalSections, doneSections, pendingSections, failedSections,
    totalQuestions, generatedQuestions, remainingQuestions,
    pct, current, isComplete, hasFailures,
  };
}
