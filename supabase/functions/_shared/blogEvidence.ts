// Pure source-date and prose checks shared by the legacy writer and its tests.
export function sourceDates(metadata: Record<string, unknown> = {}, html = "", text = "") {
  const normal = (value: unknown): string | null => {
    if (typeof value !== "string" || !/\d{4}/.test(value)) return null;
    const time = Date.parse(value);
    return Number.isFinite(time) ? new Date(time).toISOString() : null;
  };
  const find = (keys: string[]) => {
    for (const key of keys) {
      const value = normal(metadata[key]);
      if (value) return value;
      const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const json = html.match(new RegExp(`"${escaped}"\\s*:\\s*"([^"]+)"`, "i"));
      const meta = html.match(new RegExp(`<meta[^>]*(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']+)`, "i"))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${escaped}["']`, "i"));
      const date = normal(json?.[1] || meta?.[1]);
      if (date) return date;
    }
    return null;
  };
  const labelled = text.match(/(?:last\s+updated|updated\s+on|last\s+modified)\s*[:\-]?\s*((?:\d{1,2}\s+[A-Za-z]+\s+\d{4})|(?:[A-Za-z]+\s+\d{1,2},?\s+\d{4})|(?:\d{4}-\d{2}-\d{2}))/i);
  return {
    publishedAt: find(["datePublished", "article:published_time", "publishedTime", "publishedDate"]),
    updatedAt: find(["dateModified", "article:modified_time", "modifiedTime", "updatedAt"]) || normal(labelled?.[1]),
  };
}

export function evidenceFreshness(source: { publishedAt?: string | null; updatedAt?: string | null }, now = new Date()): "recent" | "stale" | "undated" {
  const date = source.updatedAt || source.publishedAt;
  if (!date) return "undated";
  const age = now.getTime() - Date.parse(date);
  if (!Number.isFinite(age)) return "undated";
  return age >= 0 && age <= 60 * 86400000 ? "recent" : "stale";
}

/** One policy for every generation path; estimates are calculations, not invented facts. */
export const BLOG_COMPLETENESS_RULES = `
MISSING DETAILS AND ESTIMATES (applies to public prose, tables, FAQs and metadata):
- Read supplied links first; use recent credible public evidence to fill required gaps. Prefer official sources. Changing evidence needs explicit publication/update dates within 60 days; retain its actual reporting year.
- When a direct amount is absent, a useful approximation may be calculated from evidenced inputs (e.g. documented tuition plus accommodation, or a dated prior fee with an explicitly stated budgeting assumption). Label every derived value locally as "Estimated" or "Approximate", include units, period and a short calculation/assumption explanation. Keep the input URLs, dates and calculation basis in the editor evidence report. An estimate is not an official fee or prediction.
- Never invent a range, use generic tier averages as an institution's data, or use model recollection. Never estimate official deadlines, eligibility, rankings, accreditation, seat counts or actual placement outcomes. Estimates cannot establish eligibility for a fee-cap list.
- No empty cells, lone dashes, N/A, TBA, "not available" or verification boilerplate. Use supported facts or justified labelled estimates. If neither is possible, redesign the comparison around supported fields or omit the unsupported row/column; never fill it with a made-up number or an "Estimated" label without a value.
- Treat publisher names as private research metadata. Do not write "As per Careers360", "According to Shiksha", competitor attributions, publisher-branded tables, source lists or research-process commentary. Preserve institutions/regulators that are the subject of a factual rule. Sources and calculations remain visible to the editor, not repetitive public attribution.
`;

/** Strip known publisher attributions, not names of institutions under discussion. */
export function stripPublisherAttribution(input: string): string {
  const brand = "(?:careers?\\s*360|carrer\\s*360|shiksha(?:\\.com)?|mba\\s*universe(?:\\.com)?|collegedunia|college\\s*dekho|getmyuni|pagalguy|education\\s*times)";
  const styled = `(?:<(?:a|strong|b|em)\\b[^>]*>\\s*)?${brand}(?:\\s*</(?:a|strong|b|em)>)?`;
  return input
    .replace(new RegExp(`\\b(?:as\\s+per|according\\s+to|as\\s+(?:reported|stated|listed|published)\\s+(?:by|on)|data\\s+from)\\s+(?:the\\s+)?${styled}(?:[’']s)?(?:\\s+(?:website|report|data|portal))?\\s*[,;:—–-]?\\s*`, "gi"), "")
    .replace(new RegExp(`\\s*\\(\\s*(?:source\\s*:\\s*|as\\s+per\\s+|according\\s+to\\s+)?${styled}\\s*\\)`, "gi"), "")
    .replace(new RegExp(`<(p|li|caption)\\b[^>]*>\\s*(?:source|sources|credit)\\s*:\\s*${styled}[^<]*</\\1>`, "gi"), "");
}

/** Last-resort safeguard: omit incomplete rows, never silently invent cell values. */
export function removeIncompleteTableRows(input: string): string {
  const plain = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").trim();
  const missing = /^(?:\s|—|–|-|&mdash;|&ndash;|&#8211;|&#8212;|&#x201[34];)*$|^(?:n\/?a|not available|not on record|not announced|tba|tbd|estimated|approximate)$/i;
  return input.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, (table) => {
    const out = table.replace(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi, (row) => {
      const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)];
      return cells.some((cell) => missing.test(plain(cell[1]))) ? "" : row;
    });
    return /<td\b/i.test(out) ? out : "";
  });
}

/** Remove boilerplate without turning an unsupported claim into a confirmed one. */
export function cleanBlogProse(input: string): string {
  const missing = /not\s+officially\s+published\s*(?:—|–|-|&mdash;|&ndash;)\s*verify\s+on\s+the\s+official\s+website/i;
  let out = stripPublisherAttribution(String(input || "")).replace(/<(p|li|td|th)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (block, tag: string, attrs: string, inner: string) => {
    if (!missing.test(inner.replace(/<[^>]+>/g, " "))) return block;
    // Remove the whole unsupported prose statement, not only its uncertainty label.
    return /^(td|th)$/i.test(tag) ? `<${tag}${attrs || ""}>—</${tag}>` : "";
  });
  out = out.replace(/(<(?:p|li)\b[^>]*>\s*)(?:<(strong|b|em)>\s*)?(?:short\s+answer\s*:\s*|yes\s*[,.:;!—–-]\s*)(<\/(?:strong|b|em)>\s*)?/gi, (_m, start: string, wrapper: string | undefined, closed: string | undefined) => `${start}${wrapper && !closed ? `<${wrapper}>` : ""}`);
  // Plain-text FAQ answers and excerpts use the same rule.
  if (!/<[a-z][^>]*>/i.test(out)) out = out.replace(/^\s*(?:short\s+answer\s*:\s*|yes\s*[,.:;!—–-]\s*)/i, "");
  return removeIncompleteTableRows(out).replace(/<(strong|b|em)>\s*<\/\1>/gi, "").trim();
}