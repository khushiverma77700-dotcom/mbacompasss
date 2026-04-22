// Latest-cycle checker — scans generated content (HTML or plain text) for
// admission / placement years and flags any value that is older than the active
// cycle window (current year ± 1). Helps catch AI hallucinations like "admission
// 2021" being shipped to production.

export interface CycleMismatch {
  year: number;
  context: string;          // ~80-char snippet around the year mention
  category: "admission" | "placement" | "ranking" | "general";
  severity: "high" | "medium" | "low";
}

export interface CycleReport {
  activeCycle: string;        // e.g. "2025-2026"
  acceptedYears: number[];    // e.g. [2024, 2025, 2026]
  mismatches: CycleMismatch[];
  totalYearMentions: number;
  ok: boolean;
}

const CONTEXT_KEYWORDS = {
  admission: /admission|apply|application|deadline|intake|cycle|registration|admit/i,
  placement: /placement|package|salary|recruit|hiring|offer|ctc|lpa/i,
  ranking: /ranking|nirf|outlook|rank|qs |ft\b|business today|the week/i,
};

export function checkLatestCycle(
  html: string,
  opts: { now?: Date; lookbackYears?: number; lookforwardYears?: number } = {},
): CycleReport {
  const now = opts.now || new Date();
  const cy = now.getFullYear();
  const back = opts.lookbackYears ?? 1;
  const fwd = opts.lookforwardYears ?? 1;
  const acceptedYears: number[] = [];
  for (let y = cy - back; y <= cy + fwd; y++) acceptedYears.push(y);
  const activeCycle = `${cy}-${cy + 1}`;

  const text = (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  // match 4-digit years 2010–2099
  const yearRe = /\b(20[1-9]\d)\b/g;
  const mismatches: CycleMismatch[] = [];
  let match: RegExpExecArray | null;
  let total = 0;

  while ((match = yearRe.exec(text)) !== null) {
    total++;
    const year = parseInt(match[1], 10);
    if (acceptedYears.includes(year)) continue;
    if (year > cy + fwd) continue; // future projections OK

    const start = Math.max(0, match.index - 60);
    const end = Math.min(text.length, match.index + 60);
    const context = text.slice(start, end).trim();

    let category: CycleMismatch["category"] = "general";
    if (CONTEXT_KEYWORDS.admission.test(context)) category = "admission";
    else if (CONTEXT_KEYWORDS.placement.test(context)) category = "placement";
    else if (CONTEXT_KEYWORDS.ranking.test(context)) category = "ranking";

    // 'general' historical mentions (e.g. founding year) are low severity
    let severity: CycleMismatch["severity"] = "low";
    if (category !== "general") {
      severity = year < cy - 2 ? "high" : "medium";
    }

    mismatches.push({ year, context, category, severity });
  }

  // De-dupe identical (year+category+context) entries
  const seen = new Set<string>();
  const unique = mismatches.filter(m => {
    const k = `${m.year}|${m.category}|${m.context.slice(0, 40)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Only report admission/placement/ranking mismatches as blockers
  const blocking = unique.filter(m => m.category !== "general");

  return {
    activeCycle,
    acceptedYears,
    mismatches: unique,
    totalYearMentions: total,
    ok: blocking.length === 0,
  };
}
