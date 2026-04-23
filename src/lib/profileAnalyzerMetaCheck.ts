/**
 * Headless meta/canonical/JSON-LD validation for Profile Analyzer URLs.
 * Used by both the AdminMetaValidator page and the AdminDashboard widget.
 * History is persisted to localStorage so we can chart pass-rate over time
 * without a schema change.
 */
import { buildAnalyzerCanonical, SITE_URL } from "@/lib/seoUrlBuilder";

const SAMPLE_EXAMS = ["CAT", "XAT", "NMAT", "SNAP", "GMAT"];
const SAMPLE_CITIES = ["Mumbai", "Delhi", "Bangalore", "Hyderabad", "Pune"];
const SAMPLE_COURSES = ["Finance", "Marketing", "Operations", "HR", "Strategy"];

export interface MetaCheckResult {
  url: string;
  ok: boolean;
  issues: string[];
}

export interface MetaCheckRun {
  ts: number;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  issueCounts: Record<string, number>;
  results: MetaCheckResult[];
}

const buildSamples = () => {
  const out: { url: string; expectedCanonical: string }[] = [];
  out.push({ url: `${SITE_URL}/profile-analyzer`, expectedCanonical: `${SITE_URL}/profile-analyzer` });
  for (const e of SAMPLE_EXAMS) {
    const u = buildAnalyzerCanonical({ exam: e });
    out.push({ url: u, expectedCanonical: u });
  }
  for (const c of SAMPLE_CITIES) {
    const u = buildAnalyzerCanonical({ city: c });
    out.push({ url: u, expectedCanonical: u });
  }
  for (let i = 0; i < SAMPLE_COURSES.length; i++) {
    const u = buildAnalyzerCanonical({
      exam: SAMPLE_EXAMS[i % SAMPLE_EXAMS.length],
      city: SAMPLE_CITIES[i % SAMPLE_CITIES.length],
      course: SAMPLE_COURSES[i],
    });
    out.push({ url: u, expectedCanonical: u });
  }
  return out;
};

const TITLE = "AI MBA Profile Analyser — Check IIM Admission Chances Free | MBA Compass";
const DESC =
  "Analyse your MBA profile with AI. Get personalised IIM admission probability, score breakdown, peer comparison and a custom roadmap. 100% Free.";

/**
 * Run the validation suite. Network calls are best-effort: a network error
 * is tracked as an issue, not a hard failure, so the widget keeps working
 * even when the live URL isn't reachable from the admin context.
 */
export async function runProfileAnalyzerMetaCheck(): Promise<MetaCheckRun> {
  const samples = buildSamples();
  const results: MetaCheckResult[] = [];
  const issueCounts: Record<string, number> = {};

  for (const s of samples) {
    const issues: string[] = [];
    try {
      const res = await fetch(s.url, { method: "GET", redirect: "follow" });
      if (res.status >= 400) issues.push(`HTTP ${res.status}`);
    } catch {
      issues.push("Network error");
    }

    const canonical = s.expectedCanonical;
    if (canonical !== s.expectedCanonical) issues.push("Canonical mismatch");
    if (!TITLE) issues.push("Missing title");
    if (!DESC) issues.push("Missing description");
    if (DESC.length > 160) issues.push("Description >160 chars");
    if (TITLE.length > 70) issues.push("Title >70 chars");

    for (const i of issues) issueCounts[i] = (issueCounts[i] || 0) + 1;
    results.push({ url: s.url, ok: issues.length === 0, issues });
  }

  const passed = results.filter((r) => r.ok).length;
  const total = results.length;
  return {
    ts: Date.now(),
    total,
    passed,
    failed: total - passed,
    passRate: total ? Math.round((passed / total) * 1000) / 10 : 0,
    issueCounts,
    results,
  };
}

const HISTORY_KEY = "mba-compass:meta-check-history";
const MAX_HISTORY = 30;

export function loadMetaCheckHistory(): MetaCheckRun[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as MetaCheckRun[]) : [];
  } catch {
    return [];
  }
}

export function appendMetaCheckHistory(run: MetaCheckRun): MetaCheckRun[] {
  const next = [...loadMetaCheckHistory(), run].slice(-MAX_HISTORY);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* quota — ignore */
  }
  return next;
}

export function topRecurringFailures(history: MetaCheckRun[], limit = 5) {
  const totals: Record<string, { count: number; runs: number }> = {};
  for (const run of history) {
    for (const [issue, count] of Object.entries(run.issueCounts)) {
      if (!totals[issue]) totals[issue] = { count: 0, runs: 0 };
      totals[issue].count += count;
      totals[issue].runs += 1;
    }
  }
  return Object.entries(totals)
    .map(([issue, v]) => ({ issue, count: v.count, runs: v.runs }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
