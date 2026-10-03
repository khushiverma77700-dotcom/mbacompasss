export interface ProfileNarrative {
  one_line_summary?: string;
  final_verdict?: string;
  top_advantages?: Array<{ title: string; why: string }>;
  top_risks?: Array<{ title: string; mitigation: string }>;
  section_insights?: Record<string, string>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const cleanString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const cleaned = value.replace(/\\n/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || undefined;
};

const normalizeNarrative = (value: unknown): ProfileNarrative | null => {
  if (!isRecord(value)) return null;

  const topAdvantages = Array.isArray(value.top_advantages)
    ? value.top_advantages.flatMap((item) => {
        if (!isRecord(item)) return [];
        const title = cleanString(item.title);
        const why = cleanString(item.why);
        return title && why ? [{ title, why }] : [];
      })
    : undefined;

  const topRisks = Array.isArray(value.top_risks)
    ? value.top_risks.flatMap((item) => {
        if (!isRecord(item)) return [];
        const title = cleanString(item.title);
        const mitigation = cleanString(item.mitigation);
        return title && mitigation ? [{ title, mitigation }] : [];
      })
    : undefined;

  const sectionInsights = isRecord(value.section_insights)
    ? Object.fromEntries(
        Object.entries(value.section_insights).flatMap(([key, insight]) => {
          const text = cleanString(insight);
          return text ? [[key, text]] : [];
        }),
      )
    : undefined;

  const narrative: ProfileNarrative = {
    one_line_summary: cleanString(value.one_line_summary),
    final_verdict: cleanString(value.final_verdict),
    top_advantages: topAdvantages?.length ? topAdvantages : undefined,
    top_risks: topRisks?.length ? topRisks : undefined,
    section_insights: sectionInsights && Object.keys(sectionInsights).length ? sectionInsights : undefined,
  };

  return Object.values(narrative).some(Boolean) ? narrative : null;
};

export const parseProfileNarrative = (value: unknown): ProfileNarrative | null => {
  if (isRecord(value)) return normalizeNarrative(value);
  if (typeof value !== "string" || !value.trim()) return null;

  let candidate: unknown = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (typeof candidate !== "string") break;
    const source = candidate;
    try {
      candidate = JSON.parse(source);
    } catch {
      const start = source.indexOf("{");
      const end = source.lastIndexOf("}");
      if (start < 0 || end <= start) return null;
      try {
        candidate = JSON.parse(source.slice(start, end + 1));
      } catch {
        return null;
      }
    }
  }

  return normalizeNarrative(candidate);
};