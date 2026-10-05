// Freshness score for generated articles, based on how recent the source data
// is and whether the article's time-sensitive years match the active cycle.
// Deterministic and client-safe.

export interface FreshnessSource { url: string; title: string; excerpt: string }

export interface FreshnessReport {
  score: number;
  label: "Fresh" | "Ageing" | "Stale" | "Unknown";
  currentYear: number;
  sources: { url: string; title: string; latestYear: number | null; latestDate: string | null; ageYears: number | null }[];
  articleYears: { year: number; count: number }[];
  oldTimeSensitive: { year: number; context: string }[];
  notes: string[];
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const TIME_WORDS = /fee|fees|deadline|admission|application|cutoff|cut-off|placement|package|salary|ctc|lpa|ranking|nirf|seat|intake|exam date|registration|percentile/i;

const plain = (s: string) => (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

function latestIn(text: string, maxYear: number): { year: number | null; date: string | null } {
  let best: { y: number; m: number } | null = null;
  const consider = (y: number, m: number) => {
    if (y < 2000 || y > maxYear) return;
    if (!best || y > best.y || (y === best.y && m > best.m)) best = { y, m };
  };
  for (const m of text.matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s+(?:\d{1,2},?\s+)?(20\d{2})\b/gi)) consider(+m[2], MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1);
  for (const m of text.matchAll(/\b(20\d{2})[-/](\d{2})[-/]\d{2}\b/g)) consider(+m[1], +m[2]);
  for (const m of text.matchAll(/\b(20\d{2})\b/g)) consider(+m[1], 0);
  const b = best as { y: number; m: number } | null;
  if (!b) return { year: null, date: null };
  return { year: b.y, date: b.m ? `${MONTHS[b.m - 1][0].toUpperCase()}${MONTHS[b.m - 1].slice(1)} ${b.y}` : String(b.y) };
}

export function computeFreshness(input: { articleHtml: string; sources: FreshnessSource[]; now?: Date }): FreshnessReport {
  const now = input.now || new Date();
  const cy = now.getFullYear();
  const notes: string[] = [];

  const sources = (input.sources || []).map((s) => {
    const l = latestIn(plain(s.excerpt), cy + 1);
    return { url: s.url, title: s.title || s.url, latestYear: l.year, latestDate: l.date, ageYears: l.year === null ? null : Math.max(0, cy - l.year) };
  });

  // Source recency: 100 for current/next year, -30 per year older; undated sources count as 40.
  const sourceScores = sources.map((s) => (s.ageYears === null ? 40 : Math.max(0, 100 - s.ageYears * 30)));
  const sourceScore = sourceScores.length ? Math.max(...sourceScores) * 0.6 + (sourceScores.reduce((a, b) => a + b, 0) / sourceScores.length) * 0.4 : null;
  if (!sources.length) notes.push("No sources were read, so source recency could not be measured.");
  if (sources.some((s) => s.latestYear === null)) notes.push("Some sources show no date; confirm they are current.");

  // Article: time-sensitive mentions of old years.
  const text = plain(input.articleHtml);
  const counts = new Map<number, number>();
  const oldTimeSensitive: { year: number; context: string }[] = [];
  for (const m of text.matchAll(/\b(20[1-9]\d)\b/g)) {
    const y = +m[1];
    counts.set(y, (counts.get(y) || 0) + 1);
    if (y < cy - 1) {
      const ctx = text.slice(Math.max(0, (m.index || 0) - 70), (m.index || 0) + 70).trim();
      if (TIME_WORDS.test(ctx) && oldTimeSensitive.length < 15) oldTimeSensitive.push({ year: y, context: ctx });
    }
  }
  const articleYears = [...counts.entries()].sort((a, b) => b[0] - a[0]).map(([year, count]) => ({ year, count }));
  const hasCurrent = articleYears.some((y) => y.year >= cy - 1);
  let articleScore = 100 - oldTimeSensitive.length * 12;
  if (!hasCurrent && articleYears.length) { articleScore -= 20; notes.push(`The article mentions no ${cy - 1}–${cy + 1} data.`); }
  articleScore = Math.max(0, Math.min(100, articleScore));
  if (oldTimeSensitive.length) notes.push(`${oldTimeSensitive.length} fee, deadline, placement or ranking mention(s) use years before ${cy - 1}.`);

  const score = Math.round(sourceScore === null ? articleScore * 0.6 : sourceScore * 0.6 + articleScore * 0.4);
  const label: FreshnessReport["label"] = sourceScore === null && !articleYears.length ? "Unknown" : score >= 75 ? "Fresh" : score >= 50 ? "Ageing" : "Stale";
  return { score, label, currentYear: cy, sources, articleYears, oldTimeSensitive, notes };
}
