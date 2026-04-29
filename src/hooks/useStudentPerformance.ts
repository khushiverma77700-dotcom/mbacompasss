import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Central performance engine for the Student LMS.
 *
 * One query, one cache key, realtime auto-refresh on new submissions.
 * Every dashboard / chart / widget consumes this hook so data is always in sync.
 */

type MockAttempt = {
  id: string;
  test_id: string;
  status: string;
  started_at: string | null;
  submitted_at: string | null;
  total_score: number | null;
  max_score: number | null;
  percentile: number | null;
  total_correct: number | null;
  total_attempted: number | null;
  total_incorrect?: number | null;
  accuracy: number | null;
  sectional_scores: any;
  topic_breakdown?: any;
  time_spent_seconds: number | null;
  test?: { name?: string; slug?: string; exam_code?: string } | null;
};

export type StudentPerformanceData = {
  attempts: MockAttempt[];
  submitted: MockAttempt[];
  inProgress: MockAttempt[];
  loading: boolean;
  // Headline metrics
  totalAttempts: number;
  avgPercentile: number;
  bestPercentile: number;
  avgAccuracy: number;
  avgScore: number;
  totalHours: number;
  streakDays: number;
  consistency: number;          // 0-100, higher = more consistent
  improvement: number;          // delta percentile first → last
  lastDelta: number;            // last attempt vs the one before
  // Section aggregates
  sectional: Array<{ name: string; avgScore: number; avgAccuracy: number; avgPercentile: number; pctOfMax: number }>;
  // Trend (chronological, last 12)
  trend: Array<{ name: string; percentile: number; score: number; accuracy: number }>;
};

const QUERY_KEY = (uid?: string) => ["student-performance", uid] as const;

async function fetchAttempts(userId: string): Promise<MockAttempt[]> {
  const { data, error } = await supabase
    .from("mock_attempts")
    .select(
      "id, test_id, status, started_at, submitted_at, total_score, max_score, percentile, total_correct, total_attempted, total_incorrect, accuracy, sectional_scores, topic_breakdown, time_spent_seconds, test:mock_tests(name, slug, exam_code)"
    )
    .eq("user_id", userId)
    .order("started_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MockAttempt[];
}

export function useStudentPerformance(): StudentPerformanceData {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: attempts = [], isLoading } = useQuery({
    queryKey: QUERY_KEY(user?.id),
    queryFn: () => fetchAttempts(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  // Realtime: refresh whenever this user's attempts change.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`student-perf-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "mock_attempts", filter: `user_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: QUERY_KEY(user.id) });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  const submitted = useMemo(
    () => attempts.filter((x) => x.status === "submitted" || x.status === "auto_submitted"),
    [attempts]
  );
  const inProgress = useMemo(() => attempts.filter((x) => x.status === "in_progress"), [attempts]);

  const metrics = useMemo(() => {
    const n = submitted.length;
    if (!n) {
      return {
        totalAttempts: 0, avgPercentile: 0, bestPercentile: 0, avgAccuracy: 0, avgScore: 0,
        totalHours: 0, streakDays: 0, consistency: 0, improvement: 0, lastDelta: 0,
      };
    }
    const totalScore = submitted.reduce((s, x) => s + Number(x.total_score || 0), 0);
    const totalSec = submitted.reduce((s, x) => s + Number(x.time_spent_seconds || 0), 0);
    const ps = submitted.map((x) => Number(x.percentile || 0));
    const accs = submitted.map((x) => Number(x.accuracy || 0));

    const avgPercentile = +(ps.reduce((a, b) => a + b, 0) / n).toFixed(1);
    const bestPercentile = Math.max(...ps);
    const avgAccuracy = Math.round(accs.reduce((a, b) => a + b, 0) / n);
    const avgScore = +(totalScore / n).toFixed(1);
    const totalHours = +(totalSec / 3600).toFixed(1);

    let consistency = 0;
    if (n >= 2) {
      const mean = ps.reduce((a, b) => a + b, 0) / n;
      const variance = ps.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
      consistency = Math.max(0, Math.round(100 - Math.sqrt(variance)));
    }

    const chrono = submitted.slice().reverse();
    const improvement = chrono.length >= 2
      ? +((Number(chrono[chrono.length - 1].percentile || 0)) - Number(chrono[0].percentile || 0)).toFixed(1)
      : 0;
    const lastDelta = submitted.length >= 2
      ? +((Number(submitted[0].percentile || 0)) - Number(submitted[1].percentile || 0)).toFixed(1)
      : 0;

    const days = new Set(
      submitted.filter((x) => x.submitted_at).map((x) => new Date(x.submitted_at!).toDateString())
    );

    return {
      totalAttempts: n,
      avgPercentile, bestPercentile, avgAccuracy, avgScore,
      totalHours, streakDays: days.size, consistency, improvement, lastDelta,
    };
  }, [submitted]);

  const sectional = useMemo(() => {
    const agg: Record<string, { score: number; max: number; correct: number; attempted: number; percentile: number; count: number }> = {};
    for (const a of submitted) {
      const ss = a.sectional_scores || {};
      for (const k of Object.keys(ss)) {
        const sec = ss[k] || {};
        if (!agg[k]) agg[k] = { score: 0, max: 0, correct: 0, attempted: 0, percentile: 0, count: 0 };
        agg[k].score += Number(sec.score || 0);
        agg[k].max += Number(sec.max_score || sec.max || 0);
        agg[k].correct += Number(sec.correct || 0);
        agg[k].attempted += Number(sec.attempted || 0);
        agg[k].percentile += Number(sec.percentile || 0);
        agg[k].count += 1;
      }
    }
    return Object.entries(agg).map(([name, v]) => ({
      name,
      avgScore: +(v.score / v.count).toFixed(1),
      avgAccuracy: v.attempted > 0 ? Math.round((v.correct / v.attempted) * 100) : 0,
      avgPercentile: Math.round(v.percentile / v.count),
      pctOfMax: v.max > 0 ? Math.round((v.score / v.max) * 100) : 0,
    }));
  }, [submitted]);

  const trend = useMemo(() => {
    const chrono = submitted.slice().reverse().slice(-12);
    return chrono.map((x, i) => ({
      name: `M${i + 1}`,
      percentile: Number(x.percentile || 0),
      score: Number(x.total_score || 0),
      accuracy: Number(x.accuracy || 0),
    }));
  }, [submitted]);

  return {
    attempts, submitted, inProgress,
    loading: isLoading,
    ...metrics,
    sectional, trend,
  };
}
