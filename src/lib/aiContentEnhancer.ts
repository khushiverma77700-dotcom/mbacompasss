// Post-processor for AI-generated HTML.
//
// 1. Converts inline citation markers — both "[src:NIRF 2025]" (machine-readable)
//    and "(source: NIRF 2025)" (legacy human-readable) — into clickable
//    "[NIRF 2025 ↗]" pills that link to the official source.
//    When a college context (name + website) is supplied, citations like
//    "Placement Report 2024-25" or "Admission Brochure 2026" are deep-linked
//    to that college's own site (via a site:domain Google query) instead of
//    a generic Google search — so users land on the actual official page.
// 2. Wraps every <table> in a horizontally-scrollable container so wide tables
//    don't break mobile layouts.
// 3. Strips any "Not available" / "Contact for details" leftovers that slipped
//    past the prompt and replaces them with a neutral "—".

export type CitationContext = {
  /** Name of the college/institute (used as fallback search query). */
  entityName?: string;
  /** Official website URL — we extract its domain and target site:queries to it. */
  entityWebsite?: string;
};

// Sources that ALWAYS point to a national/exam portal — never the college site.
const GLOBAL_SOURCE_URLS: Record<string, string> = {
  nirf: "https://www.nirfindia.org/Rankings/2025/ManagementRanking.html",
  "aicte approved": "https://facilities.aicte-india.org/dashboard/pages/angulardashboard.php#!/approved",
  aicte: "https://facilities.aicte-india.org/dashboard/pages/angulardashboard.php#!/approved",
  "naac accredited": "http://naac.gov.in/index.php/en/assessment-accreditation",
  naac: "http://naac.gov.in/index.php/en/assessment-accreditation",
  ugc: "https://www.ugc.gov.in/",
  cat: "https://iimcat.ac.in",
  xat: "https://xatonline.in",
  gmat: "https://www.mba.com/exams/gmat",
  gre: "https://www.ets.org/gre",
  cmat: "https://cmat.nta.nic.in",
  nmat: "https://www.nmat.org",
  snap: "https://www.snaptest.org",
  iift: "https://iift.nta.nic.in",
};

// Source keywords whose pages typically live on the COLLEGE's own website.
// Maps citation keyword → search hint string used inside a site: query.
const COLLEGE_SITE_HINTS: Record<string, string> = {
  "placement report": "placement report",
  placements: "placements",
  placement: "placements",
  brochure: "admission brochure",
  "admission brochure": "admission brochure",
  admissions: "admissions",
  admission: "admissions",
  fees: "fees structure",
  "fee structure": "fees structure",
  faculty: "faculty",
  syllabus: "syllabus curriculum",
  curriculum: "curriculum",
  ranking: "rankings",
};

const extractDomain = (website?: string): string | undefined => {
  if (!website) return undefined;
  try {
    const url = website.startsWith("http") ? website : `https://${website}`;
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host || undefined;
  } catch {
    return undefined;
  }
};

const buildUrl = (source: string, year?: string, ctx?: CitationContext): string => {
  const key = source.toLowerCase().trim();

  // 1. Always-global sources (NIRF, AICTE, NAAC, CAT, etc.)
  if (GLOBAL_SOURCE_URLS[key]) return GLOBAL_SOURCE_URLS[key];

  const domain = extractDomain(ctx?.entityWebsite);
  const hint = COLLEGE_SITE_HINTS[key];

  // 2. College-site sources (placements, brochure, fees, faculty, …)
  if (hint) {
    if (domain) {
      // site:domain query reliably lands on the official page even when
      // we don't know the exact path.
      return `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} ${hint} ${year || ""}`.trim())}`;
    }
    if (ctx?.entityName) {
      return `https://www.google.com/search?q=${encodeURIComponent(`${ctx.entityName} ${hint} ${year || ""} official`.trim())}`;
    }
  }

  // 3. Unknown source — restrict the Google query to the college's site/name when possible.
  if (domain) {
    return `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} ${source} ${year || ""}`.trim())}`;
  }
  if (ctx?.entityName) {
    return `https://www.google.com/search?q=${encodeURIComponent(`${ctx.entityName} ${source} ${year || ""} official`.trim())}`;
  }
  return `https://www.google.com/search?q=${encodeURIComponent(`${source} ${year || ""} official India MBA`.trim())}`;
};

const buildPill = (source: string, year?: string, ctx?: CitationContext) => {
  const label = year ? `${source} ${year}` : source;
  const href = buildUrl(source, year, ctx);
  return ` <a href="${href}" target="_blank" rel="noopener noreferrer nofollow" class="ai-citation" title="View ${label} source">${label} ↗</a>`;
};

/**
 * Transform raw AI-generated HTML into enhanced HTML ready for display.
 * Pass `ctx` with the college's name + website so inline citations
 * (e.g. "Placement Report 2024-25") link straight to that college's
 * official page instead of a generic Google search.
 */
export function enhanceAIContent(html: string, ctx?: CitationContext): string {
  if (!html) return "";

  let out = html;

  // 1a. Machine-readable [src:NIRF 2025] or [src:Placement Report 2024-25]
  out = out.replace(
    /\[src:\s*([^\]\d]+?)\s*(\d{4}(?:[-–]\d{2,4})?)?\s*\]/gi,
    (_m, src: string, year?: string) =>
      buildPill(src.trim().replace(/[,;:]+$/, ""), year, ctx),
  );

  // 1b. Legacy "(source: NIRF 2025)" / "(source: Placement Report 2024-25)"
  out = out.replace(
    /\(\s*source:\s*([^)\d]+?)\s*(\d{4}(?:[-–]\d{2,4})?)?\s*\)/gi,
    (_m, src: string, year?: string) =>
      buildPill(src.trim().replace(/[,;:]+$/, ""), year, ctx),
  );

  // 2. Wrap raw <table> in a scrollable container so wide tables don't bust mobile.
  //    Only wrap tables that aren't already wrapped (idempotent).
  out = out.replace(
    /<table(?![^>]*data-wrapped)([^>]*)>/gi,
    '<div class="ai-table-wrap"><table data-wrapped="1"$1>',
  );
  out = out.replace(/<\/table>/gi, "</table></div>");

  // 3. Strip lingering "Not available" / "Contact for details" / "TBD" cells.
  out = out.replace(
    /\b(Not\s*Avail(?:able|aible)|N\/?A|TBD|Contact\s+for\s+details|Coming\s+soon)\b/gi,
    "—",
  );

  return out;
}
