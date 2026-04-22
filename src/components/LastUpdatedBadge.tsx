import { Clock } from "lucide-react";

interface LastUpdatedBadgeProps {
  /** ISO date string, JS Date, or null. */
  date?: string | Date | null;
  /** Optional fallback ISO string (e.g. created_at) if `date` is missing. */
  fallbackDate?: string | Date | null;
  className?: string;
  variant?: "default" | "subtle" | "pill";
}

const fmt = (d: Date) =>
  d.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });

/**
 * Visible "Last updated · Mon DD, YYYY" badge. Used on every AI-generated
 * page (blogs, institutes, colleges, courses) so users can verify freshness.
 */
export const LastUpdatedBadge = ({
  date,
  fallbackDate,
  className,
  variant = "pill",
}: LastUpdatedBadgeProps) => {
  const raw = date || fallbackDate;
  if (!raw) return null;
  const d = typeof raw === "string" ? new Date(raw) : raw;
  if (isNaN(d.getTime())) return null;

  const text = `Last updated · ${fmt(d)}`;

  if (variant === "subtle") {
    return (
      <span className={`inline-flex items-center gap-1 text-[11px] text-muted-foreground ${className || ""}`}>
        <Clock className="w-3 h-3" />
        {text}
      </span>
    );
  }

  if (variant === "default") {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground ${className || ""}`}>
        <Clock className="w-3.5 h-3.5" />
        {text}
      </span>
    );
  }

  return (
    <span
      className={
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground " +
        (className || "")
      }
    >
      <Clock className="w-3 h-3 text-primary" />
      {text}
    </span>
  );
};

export default LastUpdatedBadge;
