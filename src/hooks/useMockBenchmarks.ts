import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MockBenchmark = {
  test_id: string;
  verified_students: number;
  cohort_average: number;
  cohort_median: number;
  top_10_score: number;
  topper_score: number;
  my_attempt_id: string | null;
  my_score: number | null;
  my_rank: number | null;
  my_percentile: number | null;
  is_provisional: boolean;
  difficulty: string;
};

export function useMockBenchmarks(testIds: string[]) {
  const stableIds = [...new Set(testIds)].sort();
  return useQuery({
    queryKey: ["mock-benchmarks", stableIds],
    queryFn: async () => {
      if (!stableIds.length) return {} as Record<string, MockBenchmark>;
      const { data, error } = await supabase.rpc("get_mock_benchmarks", { _test_ids: stableIds });
      if (error) throw error;
      return Object.fromEntries(
        (data ?? []).map((row) => [row.test_id, {
          ...row,
          verified_students: Number(row.verified_students ?? 0),
          cohort_average: Number(row.cohort_average ?? 0),
          cohort_median: Number(row.cohort_median ?? 0),
          top_10_score: Number(row.top_10_score ?? 0),
          topper_score: Number(row.topper_score ?? 0),
          my_rank: row.my_rank == null ? null : Number(row.my_rank),
          my_percentile: row.my_percentile == null ? null : Number(row.my_percentile),
        }]),
      ) as Record<string, MockBenchmark>;
    },
    enabled: stableIds.length > 0,
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });
}