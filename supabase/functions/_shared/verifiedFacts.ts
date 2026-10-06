// Verified-facts grounding for every AI long-form writer.
//
// Rule enforced here: factual college data (fees, ranking, placements, exams,
// eligibility) may ONLY come from our verified backend database (which itself is
// sourced from official college websites). The AI is never allowed to invent,
// assume or recall figures, and it may never name a college that does not match
// the filters implied by the topic (e.g. a "under ₹5 lakh fees" listicle must
// not contain IIM Ahmedabad / IIM Bangalore / XLRI).

export interface FactConstraints {
  feeMaxLakhs: number | null;
  feeMinLakhs: number | null;
  tiers: string[];
  category: string | null; // "IIM" | "Non IIM"
  city: string | null;
  state: string | null;
  exam: string | null;
  listSize: number | null;
  isCollegeTopic: boolean;
}

export interface VerifiedCollege {
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  tier: string | null;
  category: string | null;
  feesLakhs: number | null;
  fees: string | null;
  ranking: number | null;
  placementAvg: string | null;
  placementMedian: string | null;
  placementHighest: string | null;
  exams: string[];
  website: string | null;
  updatedAt: string | null;
}

export interface VerifiedFacts {
  constraints: FactConstraints;
  allowed: VerifiedCollege[];
  /** Colleges explicitly barred from this article (fail the topic filter or have no verified fee). */
  excluded: { name: string; reason: string }[];
  sheet: string;
}

const CITY_HINTS = [
  "bangalore", "bengaluru", "mumbai", "delhi", "new delhi", "pune", "hyderabad", "chennai",
  "kolkata", "ahmedabad", "jaipur", "lucknow", "indore", "nagpur", "kochi", "noida",
  "gurgaon", "gurugram", "bhopal", "chandigarh", "coimbatore", "visakhapatnam",
];
const STATE_HINTS = [
  "maharashtra", "karnataka", "tamil nadu", "kerala", "gujarat", "rajasthan", "punjab",
  "haryana", "uttar pradesh", "madhya pradesh", "west bengal", "telangana", "andhra pradesh",
  "odisha", "bihar", "delhi ncr", "assam", "jharkhand", "chhattisgarh", "uttarakhand",
];
const EXAM_HINTS = ["cat", "xat", "nmat", "snap", "cmat", "mat", "iift", "gmat", "gre", "micat", "atma", "tissnet"];

const COLLEGE_TOPIC_HINTS = [
  "college", "colleges", "b-school", "b school", "bschool", "institute", "institutes",
  "mba", "pgdm", "iim", "iims", "fees", "fee", "placement", "placements", "ranking",
  "rankings", "cutoff", "cutoffs", "eligibility", "package", "roi", "admission",
];

/** Convert a rupee amount phrase to lakhs. Handles "5 lakh", "₹5,00,000", "10 lac", "1 crore". */
const toLakhs = (value: number, unit: string): number | null => {
  const u = unit.toLowerCase();
  if (u.startsWith("cr")) return value * 100;
  if (u.startsWith("lak") || u.startsWith("lac") || u === "l") return value;
  if (u.startsWith("k")) return (value * 1000) / 100000;
  if (!u) return value >= 10000 ? value / 100000 : value;
  return null;
};

export function parseFactConstraints(rawText: string): FactConstraints {
  const text = String(rawText || "").toLowerCase().replace(/,/g, "");
  const constraints: FactConstraints = {
    feeMaxLakhs: null,
    feeMinLakhs: null,
    tiers: [],
    category: null,
    city: null,
    state: null,
    exam: null,
    listSize: null,
    isCollegeTopic: COLLEGE_TOPIC_HINTS.some((h) => new RegExp(`\\b${h}\\b`).test(text)),
  };

  const amountRe = /(below|under|less than|upto|up to|within|maximum|max|cheaper than|above|over|more than|greater than|minimum|min|at least|starting from)\s*(?:₹|rs\.?|inr)?\s*([\d.]+)\s*(lakhs?|lacs?|l|crores?|cr|k)?/g;
  let m: RegExpExecArray | null;
  while ((m = amountRe.exec(text))) {
    const dir = m[1];
    const value = Number(m[2]);
    if (!Number.isFinite(value)) continue;
    const lakhs = toLakhs(value, m[3] || "");
    if (lakhs == null) continue;
    const isMax = /below|under|less than|upto|up to|within|maximum|max|cheaper than/.test(dir);
    if (isMax) constraints.feeMaxLakhs = constraints.feeMaxLakhs == null ? lakhs : Math.min(constraints.feeMaxLakhs, lakhs);
    else constraints.feeMinLakhs = constraints.feeMinLakhs == null ? lakhs : Math.max(constraints.feeMinLakhs, lakhs);
  }

  const tierRe = /tier\s*-?\s*([1-4])/g;
  while ((m = tierRe.exec(text))) constraints.tiers.push(`Tier ${m[1]}`);

  if (/\bnon[- ]?iim/.test(text)) constraints.category = "Non IIM";
  else if (/\biims?\b/.test(text)) constraints.category = "IIM";

  constraints.city = CITY_HINTS.find((c) => text.includes(c)) || null;
  constraints.state = STATE_HINTS.find((s) => text.includes(s)) || null;
  constraints.exam = EXAM_HINTS.find((e) => new RegExp(`\\b${e}\\b`).test(text))?.toUpperCase() || null;

  const listMatch = text.match(/\b(?:top|best|list of)\s+(\d{1,3})\b/);
  if (listMatch) constraints.listSize = Math.min(100, Number(listMatch[1]) || 0) || null;

  return constraints;
}

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
};

const normalizeName = (s: string) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const matchesConstraints = (row: any, c: FactConstraints): { ok: boolean; reason: string } => {
  const fees = num(row.fees_lakhs);
  if (c.feeMaxLakhs != null || c.feeMinLakhs != null) {
    if (fees == null || fees <= 0) return { ok: false, reason: "no verified official fee on record" };
    if (c.feeMaxLakhs != null && fees > c.feeMaxLakhs) return { ok: false, reason: `official fee ₹${fees}L exceeds the ₹${c.feeMaxLakhs}L cap in the topic` };
    if (c.feeMinLakhs != null && fees < c.feeMinLakhs) return { ok: false, reason: `official fee ₹${fees}L is below the ₹${c.feeMinLakhs}L floor in the topic` };
  }
  if (c.tiers.length && !c.tiers.includes(String(row.tier || ""))) return { ok: false, reason: `tier ${row.tier || "unknown"} is outside the requested tiers` };
  if (c.category) {
    const cat = String(row.college_category || "");
    const isIim = /iim/i.test(cat) || /\biim\b/i.test(String(row.name || ""));
    if (c.category === "IIM" && !isIim) return { ok: false, reason: "not an IIM" };
    if (c.category === "Non IIM" && isIim) return { ok: false, reason: "is an IIM, topic asks for non-IIM colleges" };
  }
  if (c.city && !normalizeName(`${row.city} ${row.state} ${row.name}`).includes(normalizeName(c.city))) {
    return { ok: false, reason: `not located in ${c.city}` };
  }
  if (c.state && !normalizeName(`${row.state} ${row.city}`).includes(normalizeName(c.state))) {
    return { ok: false, reason: `not located in ${c.state}` };
  }
  if (c.exam) {
    const exams = Array.isArray(row.exams_accepted) ? row.exams_accepted.map((e: string) => String(e).toUpperCase()) : [];
    if (exams.length && !exams.some((e: string) => e.includes(c.exam!))) return { ok: false, reason: `does not accept ${c.exam}` };
  }
  return { ok: true, reason: "" };
};

const toVerified = (row: any): VerifiedCollege => ({
  name: String(row.name || "").trim(),
  slug: String(row.slug || ""),
  city: row.city || null,
  state: row.state || null,
  tier: row.tier || null,
  category: row.college_category || null,
  feesLakhs: num(row.fees_lakhs),
  fees: row.fees || null,
  ranking: num(row.ranking),
  placementAvg: row.placement_avg || null,
  placementMedian: row.placement_median || null,
  placementHighest: row.placement_highest || null,
  exams: Array.isArray(row.exams_accepted) ? row.exams_accepted.filter(Boolean).map(String) : [],
  website: row.website || null,
  updatedAt: row.updated_at || null,
});

/**
 * Build the verified fact sheet for a topic straight from the backend database.
 * Only rows that satisfy the topic's filters are allowed into the article.
 */
export async function fetchVerifiedFacts(
  client: any,
  topic: { title?: string; targetKeyword?: string; secondaryKeywords?: string[] },
): Promise<VerifiedFacts> {
  const rawTopic = [topic.title, topic.targetKeyword, ...(topic.secondaryKeywords || [])].filter(Boolean).join(" ");
  const constraints = parseFactConstraints(rawTopic);

  let allowed: VerifiedCollege[] = [];
  const excluded: { name: string; reason: string }[] = [];

  if (constraints.isCollegeTopic) {
    const { data, error } = await client
      .from("colleges")
      .select("name, slug, city, state, tier, college_category, fees_lakhs, fees, ranking, placement_avg, placement_median, placement_highest, exams_accepted, website, updated_at")
      .not("name", "is", null)
      .not("slug", "is", null)
      .limit(2000);
    if (error) throw error;

    const rows = (data || []).filter((r: any) => String(r.name || "").trim() && String(r.slug || "").trim());
    for (const row of rows) {
      const verdict = matchesConstraints(row, constraints);
      if (verdict.ok) allowed.push(toVerified(row));
      else excluded.push({ name: String(row.name).trim(), reason: verdict.reason });
    }

    allowed.sort((a, b) => {
      if (constraints.feeMaxLakhs != null) {
        const ra = a.ranking && a.ranking > 0 ? a.ranking : 9999;
        const rb = b.ranking && b.ranking > 0 ? b.ranking : 9999;
        if (ra !== rb) return ra - rb;
        return (a.feesLakhs ?? 999) - (b.feesLakhs ?? 999);
      }
      const ra = a.ranking && a.ranking > 0 ? a.ranking : 9999;
      const rb = b.ranking && b.ranking > 0 ? b.ranking : 9999;
      return ra - rb;
    });

    const cap = Math.max(constraints.listSize || 0, 40);
    allowed = allowed.slice(0, cap);
  }

  return { constraints, allowed, excluded, sheet: buildFactSheet(constraints, allowed) };
}

const fmtFee = (c: VerifiedCollege) =>
  c.feesLakhs != null && c.feesLakhs > 0 ? `INR ${c.feesLakhs} lakh (total)` : (c.fees || "not on record");

export function buildFactSheet(constraints: FactConstraints, allowed: VerifiedCollege[]): string {
  if (!allowed.length) return "";
  const filterLines = [
    constraints.feeMaxLakhs != null ? `total official fee must be ≤ INR ${constraints.feeMaxLakhs} lakh` : "",
    constraints.feeMinLakhs != null ? `total official fee must be ≥ INR ${constraints.feeMinLakhs} lakh` : "",
    constraints.tiers.length ? `tier in ${constraints.tiers.join(", ")}` : "",
    constraints.category ? `category: ${constraints.category}` : "",
    constraints.city ? `city: ${constraints.city}` : "",
    constraints.state ? `state: ${constraints.state}` : "",
    constraints.exam ? `accepts ${constraints.exam}` : "",
  ].filter(Boolean);

  const rows = allowed.map((c) => {
    const bits = [
      `name: ${c.name}`,
      `fee: ${fmtFee(c)}`,
      c.ranking && c.ranking > 0 ? `rank: ${c.ranking}` : "",
      c.city ? `city: ${c.city}${c.state ? `, ${c.state}` : ""}` : "",
      c.tier ? `tier: ${c.tier}` : "",
      c.placementAvg ? `avg package: ${c.placementAvg}` : "",
      c.placementMedian ? `median package: ${c.placementMedian}` : "",
      c.placementHighest ? `highest package: ${c.placementHighest}` : "",
      c.exams.length ? `exams: ${c.exams.join("/")}` : "",
      c.website ? `official site: ${c.website}` : "",
      `internal page: /college/${c.slug}`,
    ].filter(Boolean);
    return `- ${bits.join(" | ")}`;
  });

  return `VERIFIED DATA SHEET (database evidence and eligible college set; dated reference evidence may fill missing fields)
${filterLines.length ? `Topic filters that every listed college already satisfies: ${filterLines.join("; ")}.\n` : ""}${rows.join("\n")}`;
}

/** Prompt block appended to every writer system prompt. */
export function factGroundingRules(facts: VerifiedFacts | null): string {
  if (!facts || !facts.constraints.isCollegeTopic) {
    return `
MANDATORY DATA-ACCURACY RULES (non-negotiable):
- Never state a fee, ranking, cutoff, placement package, seat count, eligibility rule or exam date that you are not certain is officially published. No invented, remembered, assumed or "typical" numbers.
- Use supplied reference evidence first, then credible public-source evidence to fill missing facts. Changing figures need evidence published or updated within 60 days. Omit unsupported claims or use qualitative guidance without repetitive verification disclaimers; record gaps for the editor. Do not fabricate a table value.
- Never present estimates as confirmed facts.`;
  }

  const c = facts.constraints;
  const excludedSample = facts.excluded.slice(0, 25).map((e) => e.name);
  const filterText = [
    c.feeMaxLakhs != null ? `total official fee ≤ INR ${c.feeMaxLakhs} lakh` : "",
    c.feeMinLakhs != null ? `total official fee ≥ INR ${c.feeMinLakhs} lakh` : "",
    c.tiers.length ? c.tiers.join("/") : "",
    c.category || "",
    c.city || "",
    c.state || "",
    c.exam ? `accepts ${c.exam}` : "",
  ].filter(Boolean).join(", ");

  return `
MANDATORY DATA-ACCURACY RULES (non-negotiable — a violation makes the article unpublishable):
- The VERIFIED DATA SHEET defines eligible colleges and database evidence. Supplied reference excerpts take priority for facts; credible supplemental excerpts may fill missing fields. Changing figures require source publication/update evidence within 60 days; a database row update or retrieval date alone is not proof of freshness.
- You may NOT name any college, university or B-school that is not in the sheet — not even as a comparison, example, "honourable mention" or in a table. Do NOT name IIM Ahmedabad, IIM Bangalore, XLRI or any other institute unless it appears in the sheet.
- Reproduce supported figures exactly, with their programme, reporting period and fee basis. Replace a database figure only with explicit recent source evidence, never inference or recollection.
- If a field is missing, use the supplied links first and credible recent supplemental evidence second. If still unsupported, omit that claim/column or use an em dash in its cell. Never write missing-data or verify-on-website boilerplate in prose; leave gaps in the editor report.
- Never invent expected dates, cutoffs or seat counts. State them only when eligible source evidence explicitly confirms them.
${filterText ? `- Every college you mention must satisfy the topic filter: ${filterText}. Colleges failing this filter are excluded on purpose${excludedSample.length ? ` (e.g. ${excludedSample.slice(0, 8).join(", ")})` : ""} — mentioning them is a hard error.` : ""}
- Statistics, trends and "industry" claims must be either derived from the sheet or written without a fabricated number.

${facts.sheet}`;
}

/**
 * Post-generation verification. Removes list rows / table rows naming barred
 * colleges and reports anything that still violates the topic filters.
 */
export function auditVerifiedFacts(html: string, facts: VerifiedFacts | null): {
  html: string;
  violations: { code: string; message: string }[];
  removedBlocks: number;
} {
  let out = String(html || "");
  const violations: { code: string; message: string }[] = [];
  let removedBlocks = 0;
  if (!facts || !facts.constraints.isCollegeTopic || !facts.excluded.length) return { html: out, violations, removedBlocks };

  const hasFilter =
    facts.constraints.feeMaxLakhs != null || facts.constraints.feeMinLakhs != null ||
    facts.constraints.tiers.length > 0 || !!facts.constraints.category ||
    !!facts.constraints.city || !!facts.constraints.state || !!facts.constraints.exam;
  if (!hasFilter) return { html: out, violations, removedBlocks };

  const allowedNorm = new Set(facts.allowed.map((a) => normalizeName(a.name)));
  const barred = facts.excluded
    .filter((e) => e.name.length > 5 && !allowedNorm.has(normalizeName(e.name)))
    .slice(0, 900);

  const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  for (const item of barred) {
    const nameRe = new RegExp(escapeRe(item.name), "i");
    if (!nameRe.test(out)) continue;

    // Drop the offending list item / table row / paragraph rather than leaving a false claim.
    for (const tag of ["li", "tr", "p"] as const) {
      const blockRe = new RegExp(`<${tag}\\b[^>]*>(?:(?!</?${tag}\\b)[\\s\\S])*?</${tag}>`, "gi");
      out = out.replace(blockRe, (block) => {
        if (!nameRe.test(block)) return block;
        removedBlocks += 1;
        return "";
      });
    }

    if (nameRe.test(out)) {
      violations.push({
        code: "unverified_college_claim",
        message: `${item.name} does not match the topic filters (${item.reason}) but is still mentioned in the article.`,
      });
    }
  }

  out = out.replace(/<(ul|ol)\b[^>]*>\s*<\/\1>/gi, "").replace(/<tbody>\s*<\/tbody>/gi, "").replace(/<p>\s*<\/p>/gi, "");
  return { html: out, violations, removedBlocks };
}
