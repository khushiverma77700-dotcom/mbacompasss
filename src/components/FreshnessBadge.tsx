import { Calendar } from "lucide-react";

interface FreshnessBadgeProps {
  date?: string | Date | null;
  label?: string;
  className?: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Visible freshness badge — shows "Updated <Month> <Year>" on content pages.
 * Falls back to current month if no date provided. Used by SEO to signal
 * recency to both users (higher CTR) and Google (faster re-crawl).
 */
const FreshnessBadge = ({ date, label = "Updated", className = "" }: FreshnessBadgeProps) => {
  const d = date ? new Date(date) : new Date();
  if (isNaN(d.getTime())) return null;
  const formatted = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 ${className}`}
      aria-label={`${label} ${formatted}`}
    >
      <Calendar className="h-3 w-3" aria-hidden="true" />
      {label} {formatted}
    </span>
  );
};

export default FreshnessBadge;
