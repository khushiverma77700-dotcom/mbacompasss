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

/** Remove boilerplate without turning an unsupported claim into a confirmed one. */
export function cleanBlogProse(input: string): string {
  const missing = /not\s+officially\s+published\s*(?:—|–|-|&mdash;|&ndash;)\s*verify\s+on\s+the\s+official\s+website/i;
  let out = String(input || "").replace(/<(p|li|td|th)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi, (block, tag: string, attrs: string, inner: string) => {
    if (!missing.test(inner.replace(/<[^>]+>/g, " "))) return block;
    // Remove the whole unsupported prose statement, not only its uncertainty label.
    return /^(td|th)$/i.test(tag) ? `<${tag}${attrs || ""}>—</${tag}>` : "";
  });
  out = out.replace(/(<(?:p|li)\b[^>]*>\s*)(?:<(strong|b|em)>\s*)?(?:short\s+answer\s*:\s*|yes\s*[,.:;!—–-]\s*)(<\/(?:strong|b|em)>\s*)?/gi, (_m, start: string, wrapper: string | undefined, closed: string | undefined) => `${start}${wrapper && !closed ? `<${wrapper}>` : ""}`);
  // Plain-text FAQ answers and excerpts use the same rule.
  if (!/<[a-z][^>]*>/i.test(out)) out = out.replace(/^\s*(?:short\s+answer\s*:\s*|yes\s*[,.:;!—–-]\s*)/i, "");
  return out.replace(/<(strong|b|em)>\s*<\/\1>/gi, "").trim();
}