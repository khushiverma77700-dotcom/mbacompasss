// One source for college search titles/descriptions, used by the server head
// and the page itself so the title Google sees never flips after load.

const TITLE_MAX = 60;
const DESC_MAX = 158;

/** Admission cycle advertised in titles: from July onwards we target next year. */
export function admissionYear(now = new Date()): number {
  return now.getUTCFullYear() + (now.getUTCMonth() >= 6 ? 1 : 0);
}

const clean = (s: unknown) => String(s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** Turns raw rupee numbers ("2180000") into "₹21.8 Lakh"; passes short text through; drops vague prose. */
export function shortMoney(v: unknown, unit: "Lakh" | "LPA" = "Lakh"): string | null {
  const s = clean(v);
  if (!s) return null;
  if (/^\d{5,9}(\.\d+)?$/.test(s)) {
    const lakh = Number(s) / 100000;
    return `₹${Number(lakh.toFixed(1))} ${unit}`;
  }
  // Keep concise figures like "INR 14.50 Lakhs" (strip source tags); skip hedged ranges/TBA text.
  const stripped = s.replace(/\[src:[^\]]*\]/gi, "").replace(/\([^)]*\)/g, "").trim();
  if (/tba|latest-public|approx|expected|range|or official/i.test(stripped)) return null;
  return stripped.length <= 24 && /\d/.test(stripped) ? stripped : null;
}

function cutWords(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max + 1);
  const i = cut.lastIndexOf(" ");
  return cut.slice(0, i > 20 ? i : max).replace(/[\s,:&|–—-]+$/, "");
}

export function collegeTitle(row: { name?: string; meta_title?: string | null; city?: string | null }, now = new Date()): string {
  const name = clean(row.name);
  const mt = clean(row.meta_title);
  if (mt && mt.length <= TITLE_MAX) return mt;
  const year = admissionYear(now);
  // Long official names: also try the short form before a dash or comma ("MICA – Mudra…" → "MICA").
  const short = name.split(/\s+[–—-]\s+|,\s*/)[0].trim();
  const city = clean((row as any).city);
  const shortName = short && short !== name ? (city && !short.includes(city) ? `${short} ${city}` : short) : name;
  for (const t of [
    `${name}: Fees, Placements, Cut-off ${year}`,
    `${name}: Fees & Placements ${year}`,
    `${name} Fees & Placements`,
    `${shortName}: Fees, Placements, Cut-off ${year}`,
    `${shortName}: Fees & Placements ${year}`,
  ]) {
    if (t.length <= TITLE_MAX) return t;
  }
  return cutWords(name, TITLE_MAX);
}

export function collegeDescription(row: any): string {
  const md = clean(row.meta_description);
  if (md.length >= 110 && md.length <= 160) return md;
  const name = clean(row.name);
  const fees = shortMoney(row.fees, "Lakh");
  const avg = shortMoney(row.placement_avg, "LPA");
  const exams: string[] = (row.exams_accepted || []).filter(Boolean).slice(0, 3);
  const parts = [
    `${name}${row.city && !name.includes(clean(row.city)) ? `, ${clean(row.city)}` : ""} MBA ${admissionYear()}:`,
    fees ? `fees ${fees},` : "fees,",
    avg ? `average package ${avg},` : "placements,",
    exams.length ? `cut-offs for ${exams.join(", ")},` : "cut-offs,",
    "admission process and eligibility.",
  ];
  const built = parts.join(" ");
  if (built.length <= DESC_MAX) return built;
  return md ? cutWords(md, DESC_MAX) : cutWords(built, DESC_MAX);
}

/** Generic title shortener for other detail pages: drop the brand suffix before cutting words. */
export function fitTitle(title: string, max = TITLE_MAX): string {
  const t = clean(title);
  if (t.length <= max) return t;
  const noBrand = t.replace(/\s*[|–—-]\s*MBA Compass\s*$/i, "");
  return cutWords(noBrand, max);
}
