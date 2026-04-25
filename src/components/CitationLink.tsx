import { ExternalLink } from "lucide-react";

interface CitationLinkProps {
  /** The citation body, e.g. "NIRF" or "Placement Report". */
  source: string;
  /** Year, e.g. "2025" or "2024-25". */
  year?: string | number;
  /** Optional explicit URL — overrides everything else when provided. */
  href?: string;
  /** Name of the college/institute — used to build a relevant Google query when the official site isn't known. */
  entityName?: string;
  /** Official website of the college/institute — citations like "Placement Report" deep-link into this domain via a site: query. */
  entityWebsite?: string;
  className?: string;
}

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
  cmat: "https://cmat.nta.nic.in",
  nmat: "https://www.nmat.org",
  snap: "https://www.snaptest.org",
};

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
  "course catalogue": "courses",
  "faculty page": "faculty",
  "brand brochure": "about brochure",
  "3-yr results": "results toppers",
  results: "results",
};

const extractDomain = (website?: string): string | undefined => {
  if (!website) return undefined;
  try {
    const url = website.startsWith("http") ? website : `https://${website}`;
    return new URL(url).hostname.replace(/^www\./, "") || undefined;
  } catch {
    return undefined;
  }
};

const buildBestUrl = (
  source: string,
  year: string | undefined,
  entityName?: string,
  entityWebsite?: string,
): string => {
  const key = source.toLowerCase().trim();
  // 1. Recognised national portals — always official.
  if (GLOBAL_SOURCE_URLS[key]) return GLOBAL_SOURCE_URLS[key];

  const domain = extractDomain(entityWebsite);
  const hint = COLLEGE_SITE_HINTS[key] || source;

  // 2. Known official domain → deep-link via site:domain (guarantees the user
  //    lands on the institution's OWN site, not a partner/listing site).
  if (domain) {
    return `https://www.google.com/search?q=${encodeURIComponent(`site:${domain} ${hint} ${year || ""}`.trim())}`;
  }

  // 3. Domain unknown → bias the query strongly toward the official site.
  if (entityName) {
    return `https://www.google.com/search?q=${encodeURIComponent(`${entityName} official site ${hint} ${year || ""}`.trim())}`;
  }

  // 4. Last-resort fallback.
  return `https://www.google.com/search?q=${encodeURIComponent(`${source} ${year || ""} official source India MBA`.trim())}`;
};

/**
 * Tiny inline "[NIRF 2025 ↗]" pill rendered next to a stat. Clicking opens
 * the official source — preferring the college's own website when one is
 * supplied via `entityWebsite`, with sensible fallbacks otherwise.
 */
export const CitationLink = ({ source, year, href, entityName, entityWebsite, className }: CitationLinkProps) => {
  const yearStr = year !== undefined ? String(year) : undefined;
  const label = yearStr ? `${source} ${yearStr}` : source;
  const url = href || buildBestUrl(source, yearStr, entityName, entityWebsite);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={
        "inline-flex items-center gap-0.5 rounded-full border border-primary/30 bg-primary/5 px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/10 hover:underline align-middle ml-1 " +
        (className || "")
      }
      title={`View ${label} source`}
    >
      <span>{label}</span>
      <ExternalLink className="w-2.5 h-2.5" />
    </a>
  );
};

export default CitationLink;
