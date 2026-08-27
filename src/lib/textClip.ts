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

/**
 * Removes placeholder/hedging noise that AI content sometimes prefixes to
 * stats, e.g. "official TBA; MBA tuitions typically in the USD 60,000-75,000
 * per year range (latest-public range)".
 */
export const stripTBA = (value: unknown): string =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/\b(official\s*)?TBA\b\s*[;:,.–—-]?\s*/gi, "")
    .replace(/^\s*[;:,.–—-]\s*/, "")
    .trim();

const UNIT = /(lakhs?|lacs?|lpa|cr(?:ore)?s?|k|thousand|million|per\s+year|per\s+annum|pa|acres?)/i;

/**
 * Card/hero stat renderer: keeps ONLY the numeric part of a value
 * (currency symbol + number range + unit). Falls back to `fallbackValue`
 * (or "—") when no number is present.
 */
export const numericStat = (value: unknown, fallbackValue = "—"): string => {
  const s = stripTBA(value);
  if (!s) return fallbackValue;

  // Already short and numeric — keep as-is.
  const match = s.match(
    /((?:₹|rs\.?|inr|usd|\$|€|£)\s*)?\d[\d,.]*\s*(?:[-–—to]{1,3}\s*(?:(?:₹|rs\.?|inr|usd|\$)\s*)?\d[\d,.]*)?\s*(?:lakhs?|lacs?|lpa|cr(?:ore)?s?|k|million|acres?|%)?/i,
  );
  if (!match) return fallbackValue;

  let out = match[0].replace(/\s+/g, " ").trim();

  // Attach a trailing unit that sits just after the number ("60,000 per year").
  const after = s.slice((match.index ?? 0) + match[0].length).trimStart();
  const unit = after.match(UNIT);
  if (unit && unit.index === 0 && !UNIT.test(out)) out += ` ${unit[0]}`;

  // Prefix a leading currency word that sat before the matched number.
  if (!/^(₹|rs|inr|usd|\$|€|£)/i.test(out)) {
    const before = s.slice(0, match.index ?? 0);
    const cur = before.match(/(₹|rs\.?|inr|usd|\$|€|£)\s*$/i);
    if (cur) out = `${cur[1].toUpperCase()} ${out}`;
  }
  return clipText(out.replace(/\s{2,}/g, " ").trim(), 22) || fallbackValue;
};

/** NIRF rank display — number only (e.g. "#12"), never prose. */
export const rankOnly = (value: unknown): string => {
  const s = stripTBA(value);
  const n = s.match(/\d{1,4}/);
  return n ? `#${n[0]}` : "—";
};
