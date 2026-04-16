/**
 * Shared helpers for fee + specialization filtering
 * Used across CollegesPage, CoachingPage, CategoryPage, CollegeFilterPage, CoachingFilterPage
 */

export const FEE_BUCKETS = [
  { value: "all", label: "All Fees", max: Infinity },
  { value: "under-1l", label: "Under ₹1 Lakh", max: 1 },
  { value: "under-3l", label: "Under ₹3 Lakhs", max: 3 },
  { value: "under-5l", label: "Under ₹5 Lakhs", max: 5 },
  { value: "under-10l", label: "Under ₹10 Lakhs", max: 10 },
  { value: "under-20l", label: "Under ₹20 Lakhs", max: 20 },
  { value: "above-20l", label: "Above ₹20 Lakhs", max: -1 },
];

export const FEE_BUCKET_LABELS: Record<string, string> = Object.fromEntries(
  FEE_BUCKETS.map(b => [b.value, b.label])
);

/** Returns true if the given fees_lakhs value falls within the bucket. */
export function matchesFeeBucket(feesLakhs: number | null | undefined, bucket: string): boolean {
  if (!bucket || bucket === "all") return true;
  if (feesLakhs == null) return false;
  const def = FEE_BUCKETS.find(b => b.value === bucket);
  if (!def) return true;
  if (def.max === -1) return feesLakhs >= 20;
  return feesLakhs <= def.max;
}

/** Best-effort parse a free-form fee string ("₹23 Lakhs", "23L", "2300000") into a numeric fees_lakhs. */
export function parseFeesText(input: string | null | undefined): number | null {
  if (!input) return null;
  const lower = input.toLowerCase().replace(/[, ]/g, "");
  const numMatch = lower.match(/[\d.]+/);
  if (!numMatch) return null;
  const num = parseFloat(numMatch[0]);
  if (Number.isNaN(num)) return null;
  if (lower.includes("crore") || lower.includes("cr")) return num * 100;
  if (lower.includes("lakh") || lower.includes("lac") || lower.endsWith("l")) return num;
  if (num >= 100000) return num / 100000; // raw rupees
  return num; // assume already lakhs
}

/** Returns the effective fees_lakhs for an entity, falling back to text parse / cheapest course. */
export function getEffectiveFeesLakhs(entity: any): number | null {
  if (entity?.fees_lakhs != null) return Number(entity.fees_lakhs);
  if (entity?.fees) {
    const parsed = parseFeesText(entity.fees);
    if (parsed != null) return parsed;
  }
  if (Array.isArray(entity?.courses) && entity.courses.length) {
    const min = Math.min(
      ...entity.courses
        .map((c: any) => Number(c?.fees) || 0)
        .filter((n: number) => n > 0)
    );
    if (Number.isFinite(min) && min > 0) return min / 100000;
  }
  return null;
}

export function specMatches(entitySpecs: string[] | null | undefined, slug: string | null | undefined): boolean {
  if (!slug || slug === "all") return true;
  if (!entitySpecs || !Array.isArray(entitySpecs)) return false;
  const target = slug.trim().toLowerCase();
  return entitySpecs.some(s => s?.toLowerCase().trim() === target);
}

const normalizeLocationValue = (value: string | null | undefined) =>
  value?.trim().toLowerCase() ?? "";

export function locationMatches(
  value: string | null | undefined,
  target: string | null | undefined,
  aliases: string[] | null | undefined = [],
): boolean {
  if (!target || target === "all") return true;

  const normalizedValue = normalizeLocationValue(value);
  if (!normalizedValue) return false;

  const candidates = [target, ...(aliases || [])]
    .map(normalizeLocationValue)
    .filter(Boolean);

  return candidates.includes(normalizedValue);
}
