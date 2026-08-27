/**
 * Helpers to keep AI-generated / editor-entered values from blowing up card and
 * hero layouts. AI content often returns values like
 * "official TBA; latest-public range INR 9-12 lakh total program fee (approx.)".
 * Cards need "INR 9-12 lakh" — the long form belongs on the detail page.
 */

/** Hard character clip with an ellipsis. */
export const clipText = (value: unknown, max = 60): string => {
  const s = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
};

/**
 * Condenses a verbose stat string into a short, card-friendly value.
 * Drops hedging prefixes/suffixes and keeps the first meaningful clause.
 */
export const shortStat = (value: unknown, max = 26): string => {
  let s = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "";

  // Prefer the clause that actually carries a number.
  const clauses = s.split(/\s*[;|]\s*/).filter(Boolean);
  if (clauses.length > 1) {
    s = clauses.find((c) => /\d/.test(c)) || clauses[0];
  }

  s = s
    .replace(/\(approx\.?\)|\(estimated\)|\(verify[^)]*\)|\(subject to[^)]*\)/gi, "")
    .replace(/\b(official|latest[- ]public|latest|estimated|approximately|approx\.?|around|about|as per|verified)\b/gi, "")
    .replace(/\b(range|total program fee|total fees?|per annum|overall)\b/gi, "")
    .replace(/\bTBA\b/gi, "")
    .replace(/\s*[-–—,]\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!s || !/[a-z0-9]/i.test(s)) return "—";
  return clipText(s, max);
};

/** Chip labels: keep the exam/accreditation code, drop the caveat tail. */
export const shortLabel = (value: unknown, max = 18): string => {
  let s = String(value ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  s = s.replace(/\s*\([^)]*\)/g, "").replace(/\s*[-–—:]\s*(verify|subject|used)[\s\S]*$/i, "").trim();
  return clipText(s || String(value ?? ""), max);
};
