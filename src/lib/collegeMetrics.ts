/**
 * One source per college metric, formatted identically everywhere
 * (homepage, /colleges, college pages, comparisons):
 * fees → colleges.fees, average CTC → colleges.placement_avg,
 * highest CTC → colleges.placement_highest, rank → colleges.ranking.
 */
const NUM = /\d[\d,]*(?:\.\d+)?/g;

function trimNum(n: number, digits: number) {
  return String(Number(n.toFixed(digits)));
}

/** "₹27,50,000" / "INR 35.22 LPA" / "27.5 lakh" → "₹27.5 L"; crores → "₹1.2 Cr". Unparseable text is returned trimmed. */
export function formatMoney(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  if (typeof raw === "number") return raw > 0 ? lakhsLabel(raw >= 1000 ? raw / 1e5 : raw) : "";
  const s = String(raw).trim();
  if (!s) return "";
  const nums = s.match(NUM);
  if (!nums || nums.length !== 1) return s;
  const n = Number(nums[0].replace(/,/g, ""));
  if (!Number.isFinite(n) || n <= 0) return s;
  if (/\b(cr|crore)s?\b/i.test(s)) return lakhsLabel(n * 100);
  if (/(lpa|lakh|lac|\bl\b|\d\s*l\b)/i.test(s)) return lakhsLabel(n);
  if (/(usd|\$)/i.test(s)) return s;
  if (n >= 1000) return lakhsLabel(n / 1e5);
  return s;
}

function lakhsLabel(lakhs: number) {
  if (lakhs >= 100) return `₹${trimNum(lakhs / 100, 2)} Cr`;
  if (lakhs < 1) return `₹${Math.round(lakhs * 100)}K`;
  return `₹${trimNum(lakhs, 1)} L`;
}

export function formatRank(rank: unknown): string {
  const n = Number(rank);
  return Number.isFinite(n) && n > 0 ? `#${n}` : "";
}

type CollegeLike = { fees?: unknown; placement_avg?: unknown; placement_highest?: unknown; ranking?: unknown };

export function collegeMetrics(c: CollegeLike) {
  return {
    fees: formatMoney(c.fees),
    avgCtc: formatMoney(c.placement_avg),
    highestCtc: formatMoney(c.placement_highest),
    rank: formatRank(c.ranking),
  };
}
