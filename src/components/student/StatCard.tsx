import { ReactNode } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  /** Positive number = up, negative = down, 0/undefined = flat */
  delta?: number;
  /** Suffix shown after the delta value, e.g. "%" or "pts" */
  deltaSuffix?: string;
  /** Tone applied to the gradient ring + icon background */
  tone?: "primary" | "success" | "warning" | "info";
  className?: string;
}

const TONE_RING: Record<NonNullable<Props["tone"]>, string> = {
  primary: "from-sky-500/30 to-blue-600/10",
  success: "from-emerald-500/30 to-teal-500/10",
  warning: "from-amber-500/30 to-orange-500/10",
  info: "from-violet-500/30 to-fuchsia-500/10",
};

const TONE_ICON: Record<NonNullable<Props["tone"]>, string> = {
  primary: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  success: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  info: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
};

/**
 * Premium stat card used across the Student LMS.
 * - Gradient ring on the corner
 * - Large value, supporting hint
 * - Optional delta chip with trend arrow
 */
export default function StatCard({
  label, value, hint, icon, delta, deltaSuffix = "", tone = "primary", className,
}: Props) {
  const trend = typeof delta === "number" ? (delta > 0 ? "up" : delta < 0 ? "down" : "flat") : null;
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up" ? "text-emerald-600 bg-emerald-500/10"
    : trend === "down" ? "text-rose-600 bg-rose-500/10"
    : "text-muted-foreground bg-muted";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-card text-card-foreground",
        "p-4 transition-shadow hover:shadow-[var(--card-shadow-hover)]",
        className,
      )}
    >
      {/* Gradient corner ring */}
      <div
        className={cn(
          "pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br blur-2xl opacity-70",
          TONE_RING[tone],
        )}
        aria-hidden
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-bold leading-tight text-foreground">{value}</div>
          {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
        </div>
        {icon && (
          <div className={cn("h-9 w-9 shrink-0 grid place-items-center rounded-lg", TONE_ICON[tone])}>
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className={cn("relative mt-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold", trendColor)}>
          <TrendIcon className="h-3 w-3" />
          {delta! > 0 ? "+" : ""}{delta}{deltaSuffix}
        </div>
      )}
    </div>
  );
}
