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
  mat: "https://mat.aima.in",
  atma: "https://atmaaims.com",
  kmat: "https://kmatindia.com",
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

  // 1. Always-global sources (NIRF, AICTE, NAAC, CAT, etc.) — official portals only.
  if (GLOBAL_SOURCE_URLS[key]) return GLOBAL_SOURCE_URLS[key];

  const domain = extractDomain(ctx?.entityWebsite);

  // 2. If we know the official college website AND the citation matches a known
  //    "lives on the college's own site" hint (Placement Report, Brochure, Fees…),
  //    deep-link via a site:domain Google query so users land on the SPECIFIC
  //    page instead of the homepage.
  const collegeHint = COLLEGE_SITE_HINTS[key];
  if (domain && collegeHint) {
    const q = `site:${domain} ${collegeHint} ${year || ""}`.trim();
    return `https://www.google.com/search?q=${encodeURIComponent(q)}&btnI=1`;
  }

  // 3. Known college site hint but no domain on file — still deep-link via name.
  if (collegeHint && ctx?.entityName) {
    const q = `${ctx.entityName} official ${collegeHint} ${year || ""}`.trim();
    return `https://www.google.com/search?q=${encodeURIComponent(q)}&btnI=1`;
  }

  // 4. Generic citation with a known college website — fall back to homepage.
  if (ctx?.entityWebsite) {
    try {
      const u = ctx.entityWebsite.startsWith("http")
        ? ctx.entityWebsite
        : `https://${ctx.entityWebsite}`;
      new URL(u);
      return u;
    } catch {
      /* fall through */
    }
  }

  // 5. No website on file — last resort: Google query restricted to the official name.
  if (ctx?.entityName) {
    const hint = collegeHint || source;
    return `https://www.google.com/search?q=${encodeURIComponent(`${ctx.entityName} official site ${hint} ${year || ""}`.trim())}`;
  }

  // 6. Last resort — generic official-source query (no entity context).
  return `https://www.google.com/search?q=${encodeURIComponent(`${source} ${year || ""} official source India MBA`.trim())}`;
};

const buildPill = (source: string, year?: string, ctx?: CitationContext) => {
  const label = year ? `${source} ${year}` : source;
  const href = buildUrl(source, year, ctx);
  return ` <a href="${href}" target="_blank" rel="noopener noreferrer nofollow" class="ai-citation" title="View ${label} source">${label} ↗</a>`;
};

const applyInlineMarkdown = (value: string) => value
  .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
  .replace(/__([^_]+)__/g, "<strong>$1</strong>")
  .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer nofollow">$1</a>');

const plainOrMarkdownToHtml = (value: string) => {
  const lines = value.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return "";
  let inList = false;
  const parts: string[] = [];
  const closeList = () => {
    if (inList) {
      parts.push("</ul>");
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = applyInlineMarkdown(raw);
    if (/^###\s+/.test(line)) {
      closeList();
      parts.push(`<h3>${line.replace(/^###\s+/, "")}</h3>`);
    } else if (/^##\s+/.test(line)) {
      closeList();
      parts.push(`<h2>${line.replace(/^##\s+/, "")}</h2>`);
    } else if (/^[-•*]\s+/.test(line)) {
      if (!inList) {
        parts.push("<ul>");
        inList = true;
      }
      parts.push(`<li>${line.replace(/^[-•*]\s+/, "")}</li>`);
    } else {
      closeList();
      parts.push(`<p>${line}</p>`);
    }
  }
  closeList();
  return parts.join("");
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

  // 0a. Normalise leaked markdown embedded INSIDE existing HTML — e.g. a single
  // <p> containing "### Step-by-Step Process 1. **Enquiry**: …". Break it onto
  // separate lines so the markdown→HTML pass below renders headings + lists.
  out = out.replace(/\s*#{2,4}\s+/g, "\n### ");
  out = out.replace(/(^|[\s>.;:!?])(\d{1,2})\.\s+(?=\*\*|[A-Z])/g, "$1\n- ");
  out = out.replace(/\s+[•▪]\s+/g, "\n- ");
  // Drop stray runs of 3+ asterisks/hashes that aren't valid markdown.
  out = out.replace(/\*{3,}/g, "");
  out = out.replace(/(^|\s)#{1,6}(\s|$)/g, "$1$2");

  // 0b. If a model returns plain text/bullets without tags, convert it into
  // lightweight HTML so formatting is still visible in review and live pages.
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(out);
  if (!hasHtml) out = plainOrMarkdownToHtml(out);
  else {
    // Unwrap any <p> whose text contains markdown heading/list markers and
    // re-render that fragment so lists/headings show up properly.
    out = out.replace(/<p>([\s\S]*?)<\/p>/gi, (_m, inner) => {
      if (/(^|\n)\s*(###\s|-\s)/.test(inner)) return plainOrMarkdownToHtml(inner);
      return `<p>${applyInlineMarkdown(inner)}</p>`;
    });
    out = applyInlineMarkdown(out);
  }

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

  // 1c. Convert plain official exam names into hyperlinks when they appear in generated text.
  out = out.replace(/\b(CAT|XAT|GMAT|GRE|CMAT|NMAT|SNAP|IIFT|MAT|ATMA|KMAT)\b(?![^<]*>)/g, (exam) => {
    const href = GLOBAL_SOURCE_URLS[exam.toLowerCase()];
    return href ? `<a href="${href}" target="_blank" rel="noopener noreferrer nofollow">${exam}</a>` : exam;
  });

  // 1d. Strip any leaked source/citation parentheticals that DON'T match the pill formats above.
  //     Examples seen in production: "(Source/NIRF 2026 Ranking)", "(Source: NIRF)", "(as per NIRF)",
  //     "(Ref: Placement Report 2024-25)". These leak when the model ignores the no-citation rule.
  out = out.replace(/\(\s*sources?\s*[:\/\u2013\u2014-]\s*[^)]{0,80}\)/gi, "");
  out = out.replace(/\(\s*as\s+per\s+[^)]{0,80}\)/gi, "");
  out = out.replace(/\(\s*ref\.?\s*[:\u2013\u2014-]\s*[^)]{0,80}\)/gi, "");
  // Strip leftover "Last updated:" stamps the model may have inserted.
  out = out.replace(/<p>\s*<em>\s*Last updated:[^<]*<\/em>\s*<\/p>/gi, "");
  out = out.replace(/<em>\s*Last updated:[^<]*<\/em>/gi, "");

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

  // 4. Collapse double spaces that the strips above may have created.
  out = out.replace(/[ \t]{2,}/g, " ");

  return out;
}
