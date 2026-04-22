// Post-processor for AI-generated HTML.
//
// 1. Converts inline citation markers — both "[src:NIRF 2025]" (machine-readable)
//    and "(source: NIRF 2025)" (legacy human-readable) — into clickable
//    "[NIRF 2025 ↗]" pills that link to the official source.
// 2. Wraps every <table> in a horizontally-scrollable container so wide tables
//    don't break mobile layouts.
// 3. Strips any "Not available" / "Contact for details" leftovers that slipped
//    past the prompt and replaces them with a neutral "—".
//
// Pure string-in/string-out so it's safe to feed straight into
// dangerouslySetInnerHTML without breaking SSR or hydration.

const SOURCE_URL_HINTS: Record<string, string> = {
  nirf: "https://www.nirfindia.org/Rankings/2025/ManagementRanking.html",
  "placement report": "https://www.google.com/search?q=MBA+placement+report+India",
  brochure: "https://www.google.com/search?q=MBA+admission+brochure+India",
  "admission brochure": "https://www.google.com/search?q=MBA+admission+brochure+India",
  cat: "https://iimcat.ac.in",
  xat: "https://xatonline.in",
  gmat: "https://www.mba.com/exams/gmat",
  cmat: "https://cmat.nta.nic.in",
  nmat: "https://www.nmat.org",
  snap: "https://www.snaptest.org",
};

const buildUrl = (source: string, year?: string) => {
  const key = source.toLowerCase().trim();
  if (SOURCE_URL_HINTS[key]) return SOURCE_URL_HINTS[key];
  return `https://www.google.com/search?q=${encodeURIComponent(`${source} ${year || ""} official India MBA`.trim())}`;
};

const buildPill = (source: string, year?: string) => {
  const label = year ? `${source} ${year}` : source;
  const href = buildUrl(source, year);
  return ` <a href="${href}" target="_blank" rel="noopener noreferrer nofollow" class="ai-citation" title="View ${label} source">${label} ↗</a>`;
};

/**
 * Transform raw AI-generated HTML into enhanced HTML ready for display.
 */
export function enhanceAIContent(html: string): string {
  if (!html) return "";

  let out = html;

  // 1a. Machine-readable [src:NIRF 2025] or [src:Placement Report 2024-25]
  out = out.replace(
    /\[src:\s*([^\]\d]+?)\s*(\d{4}(?:[-–]\d{2,4})?)?\s*\]/gi,
    (_m, src: string, year?: string) =>
      buildPill(src.trim().replace(/[,;:]+$/, ""), year),
  );

  // 1b. Legacy "(source: NIRF 2025)" / "(source: Placement Report 2024-25)"
  out = out.replace(
    /\(\s*source:\s*([^)\d]+?)\s*(\d{4}(?:[-–]\d{2,4})?)?\s*\)/gi,
    (_m, src: string, year?: string) =>
      buildPill(src.trim().replace(/[,;:]+$/, ""), year),
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
