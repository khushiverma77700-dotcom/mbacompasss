/**
 * Deterministic scoring & simulation helpers for the Premium Profile Report.
 * Pure functions only — no AI calls. Designed to derive new insights from the
 * existing AnalysisResult shape returned by the profile-analyzer edge function.
 */

export interface ScoreBreakdown {
  academics_score: number;
  work_experience_score: number;
  diversity_score: number;
  profile_consistency_score: number;
  leadership_potential_score: number;
  extracurricular_score?: number;
  overall_competitiveness?: string;
  percentile_among_aspirants?: number;
}

export interface CollegeRow {
  college_name: string;
  city?: string;
  state?: string;
  nirf_ranking?: number;
  avg_fees_lakhs: number;
  avg_package_lakhs: number;
  median_package_lakhs?: number;
  highest_package_lakhs?: number;
  required_cat_percentile: number;
  student_cat_target: number;
  acceptance_rate_percent?: number;
  your_admission_probability: number;
  difficulty: string;
  tier: string;
}

export interface ProfileInputLite {
  tenth_score?: number;
  twelfth_score?: number;
  graduation_score?: number;
  graduation_stream?: string;
  work_experience_months?: number;
  category?: string;
  gender?: string;
  has_certifications?: string[];
  extracurriculars?: string[];
  leadership_roles?: string;
  fee_budget_lakhs?: number;
  expected_salary_lakhs?: number;
}

/* ── Normalisers ───────────────────────────────────────────── */
export const normalizeProb = (p: number): number => {
  if (p == null || isNaN(p)) return 0;
  return p > 1 ? Math.round(p) : Math.round(p * 100);
};

export const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

/* ── Radar data (8-axis premium radar) ──────────────────────── */
export interface RadarPoint { axis: string; value: number; benchmark: number }

export function buildRadarData(b?: ScoreBreakdown): RadarPoint[] {
  if (!b) return [];
  // Convert 0-10 scores to 0-100 for visual parity. Benchmarks = "top-1%" target.
  const to100 = (v?: number) => clamp(((v ?? 0) / 10) * 100);
  return [
    { axis: "Academics", value: to100(b.academics_score), benchmark: 90 },
    { axis: "Work Ex", value: to100(b.work_experience_score), benchmark: 80 },
    { axis: "Diversity", value: to100(b.diversity_score), benchmark: 70 },
    { axis: "Consistency", value: to100(b.profile_consistency_score), benchmark: 85 },
    { axis: "Leadership", value: to100(b.leadership_potential_score), benchmark: 75 },
    { axis: "Extra Curr.", value: to100(b.extracurricular_score), benchmark: 70 },
  ];
}

/* ── Percentile prediction (deterministic CAT estimate) ─────── */
export function predictCATPercentile(p: ProfileInputLite): { p10: number; p50: number; p90: number } {
  // Simple model based on academic strength + work-ex + stream.
  const acad = ((p.tenth_score ?? 70) + (p.twelfth_score ?? 70) + (p.graduation_score ?? 65) * 1.2) / 3.2;
  const streamBoost: Record<string, number> = {
    Engineering: 6, Science: 4, Commerce: 3, Other: 0, Medical: 2, Law: 1, Arts: 0,
  };
  const sb = streamBoost[p.graduation_stream || "Other"] ?? 0;
  const wkEx = Math.min((p.work_experience_months ?? 0) / 6, 8);
  const base = clamp(acad * 0.8 + sb + wkEx, 50, 99.9);
  return {
    p10: clamp(base - 8, 30, 99),
    p50: clamp(base, 30, 99.5),
    p90: clamp(base + 6, 50, 99.9),
  };
}

/* ── Scenario simulator (CAT 90 / 95 / 99) ──────────────────── */
export interface ScenarioCollege { college_name: string; tier: string; required: number; chance: number }

export function simulateScenarios(
  colleges: CollegeRow[] | undefined,
  scenarios: number[] = [90, 95, 99],
): Record<number, ScenarioCollege[]> {
  const result: Record<number, ScenarioCollege[]> = {};
  if (!Array.isArray(colleges)) {
    scenarios.forEach((s) => (result[s] = []));
    return result;
  }
  for (const s of scenarios) {
    result[s] = colleges
      .map((c) => {
        // Heuristic: chance = base + (student_score - required) * 4, clamped.
        const delta = s - (c.required_cat_percentile ?? 90);
        const chance = clamp(40 + delta * 5, 2, 96);
        return {
          college_name: c.college_name,
          tier: c.tier,
          required: c.required_cat_percentile,
          chance: Math.round(chance),
        };
      })
      .sort((a, b) => b.chance - a.chance)
      .slice(0, 8);
  }
  return result;
}

/* ── Work-ex toggle simulator ───────────────────────────────── */
export function workExImpact(p: ProfileInputLite): { withWorkEx: number; withoutWorkEx: number; deltaPct: number } {
  const monthsActual = p.work_experience_months ?? 0;
  const baseScore = 70;
  const wkExBoost = Math.min(monthsActual / 6, 8) * 1.2; // boost up to ~10pts
  const withWorkEx = clamp(baseScore + wkExBoost, 0, 100);
  const withoutWorkEx = baseScore;
  const deltaPct = Math.round(((withWorkEx - withoutWorkEx) / withoutWorkEx) * 100);
  return {
    withWorkEx: Math.round(withWorkEx),
    withoutWorkEx: Math.round(withoutWorkEx),
    deltaPct,
  };
}

/* ── Top-1% benchmark (synthesized realistic numbers) ───────── */
export interface BenchmarkRow { dimension: string; you: number; peer: number; top1: number }

export function buildBenchmark(b: ScoreBreakdown | undefined, p: ProfileInputLite): BenchmarkRow[] {
  if (!b) return [];
  return [
    { dimension: "Academics", you: b.academics_score * 10, peer: 70, top1: 92 },
    { dimension: "Work Experience", you: b.work_experience_score * 10, peer: 55, top1: 85 },
    { dimension: "Diversity", you: b.diversity_score * 10, peer: 60, top1: 78 },
    { dimension: "Leadership", you: b.leadership_potential_score * 10, peer: 50, top1: 88 },
    { dimension: "Extracurriculars", you: (b.extracurricular_score ?? 5) * 10, peer: 45, top1: 82 },
  ];
}

/* ── College Fit Heatmap — derive grid from college table ────── */
export interface HeatCell { college: string; metric: string; score: number; raw: string }

export function buildHeatmapData(rows: CollegeRow[] | undefined, max = 10): HeatCell[] {
  if (!Array.isArray(rows)) return [];
  const top = [...rows]
    .sort((a, b) => normalizeProb(b.your_admission_probability) - normalizeProb(a.your_admission_probability))
    .slice(0, max);
  const cells: HeatCell[] = [];
  for (const c of top) {
    const chance = normalizeProb(c.your_admission_probability);
    const fees = c.avg_fees_lakhs || 0;
    const pkg = c.avg_package_lakhs || 0;
    const roi = pkg > 0 && fees > 0 ? clamp((pkg / fees) * 30, 0, 100) : 50;
    cells.push({ college: c.college_name, metric: "Admission Chance", score: chance, raw: `${chance}%` });
    cells.push({ college: c.college_name, metric: "ROI Score", score: roi, raw: `${roi.toFixed(0)}` });
    cells.push({
      college: c.college_name,
      metric: "Brand Strength",
      score: clamp(100 - (c.nirf_ranking ?? 50), 0, 100),
      raw: c.nirf_ranking ? `#${c.nirf_ranking}` : "—",
    });
    cells.push({
      college: c.college_name,
      metric: "Affordability",
      score: clamp(100 - fees * 3, 0, 100),
      raw: `₹${fees}L`,
    });
  }
  return cells;
}

/* ── ROI scatter / fee-vs-salary chart data ──────────────────── */
export interface ROIPoint { college: string; fees: number; salary: number; chance: number; tier: string }

export function buildROIScatter(rows: CollegeRow[] | undefined): ROIPoint[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((c) => c.avg_fees_lakhs > 0 && c.avg_package_lakhs > 0)
    .map((c) => ({
      college: c.college_name,
      fees: c.avg_fees_lakhs,
      salary: c.avg_package_lakhs,
      chance: normalizeProb(c.your_admission_probability),
      tier: c.tier,
    }));
}

/* ── Top 3 risks / advantages from existing strengths/weaknesses ─ */
export function topThree<T extends { title: string; impact?: string; severity?: string }>(
  list: T[] | undefined,
  rankKey: "impact" | "severity",
): T[] {
  if (!Array.isArray(list)) return [];
  const order: Record<string, number> = { high: 3, High: 3, medium: 2, Medium: 2, low: 1, Low: 1 };
  return [...list]
    .sort((a, b) => (order[(b as any)[rankKey]] ?? 0) - (order[(a as any)[rankKey]] ?? 0))
    .slice(0, 3);
}

/* ── Color helpers (semantic, no raw hex) ───────────────────── */
export const heatColor = (v: number): string => {
  if (v >= 80) return "bg-emerald-500/90 text-white";
  if (v >= 60) return "bg-emerald-400/70 text-emerald-900";
  if (v >= 40) return "bg-amber-300/80 text-amber-900";
  if (v >= 20) return "bg-orange-300/80 text-orange-900";
  return "bg-rose-300/80 text-rose-900";
};

export const insightColor = (level: "good" | "warn" | "bad" | "info"): string => {
  switch (level) {
    case "good": return "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200";
    case "warn": return "border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200";
    case "bad": return "border-rose-300 bg-rose-50 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200";
    default: return "border-blue-300 bg-blue-50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200";
  }
}
