import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileAction {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  primary?: boolean;
  active?: boolean;
}

interface MobileActionBarProps {
  actions: MobileAction[];
  className?: string;
}

/**
 * Sticky bottom action bar — visible only on mobile (< md).
 * Place once near the end of a page; sits above the viewport edge with safe-area padding.
 */
const MobileActionBar = ({ actions, className }: MobileActionBarProps) => {
  return (
    <div
      className={cn(
        "md:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.08)]",
        "px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]",
        className,
      )}
      role="toolbar"
      aria-label="Page actions"
    >
      <div className="flex items-stretch gap-1.5">
        {actions.map((a, i) => (
          <button
            key={i}
            onClick={a.onClick}
            aria-label={a.label}
            className={cn(
              "flex-1 min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold transition-all active:scale-95",
              a.primary
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : a.active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span className="[&_svg]:w-4 [&_svg]:h-4">{a.icon}</span>
            <span className="leading-none">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MobileActionBar;
