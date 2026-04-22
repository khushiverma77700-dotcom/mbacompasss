import { ExternalLink } from "lucide-react";

interface CitationLinkProps {
  /** The citation body, e.g. "NIRF" or "Placement Report". */
  source: string;
  /** Year, e.g. "2025" or "2024-25". */
  year?: string | number;
  /** Optional explicit URL — falls back to a Google search for "<source> <year> <site:domain>". */
  href?: string;
  className?: string;
}

const SOURCE_URL_HINTS: Record<string, string> = {
  nirf: "https://www.nirfindia.org/Rankings/2025/ManagementRanking.html",
  "placement report": "https://www.google.com/search?q=placement+report",
  brochure: "https://www.google.com/search?q=admission+brochure",
  "admission brochure": "https://www.google.com/search?q=admission+brochure",
  cat: "https://iimcat.ac.in",
  xat: "https://xatonline.in",
};

/**
 * Tiny inline "[NIRF 2025 ↗]" pill rendered next to a stat. Clicking opens
 * the official source (when known) or a Google query as a graceful fallback.
 */
export const CitationLink = ({ source, year, href, className }: CitationLinkProps) => {
  const label = year ? `${source} ${year}` : source;
  const fallbackKey = source.toLowerCase().trim();
  const url =
    href ||
    SOURCE_URL_HINTS[fallbackKey] ||
    `https://www.google.com/search?q=${encodeURIComponent(`${label} official source India MBA`)}`;

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
