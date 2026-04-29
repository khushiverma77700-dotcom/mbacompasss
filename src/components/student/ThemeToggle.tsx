import { Moon, Sun } from "lucide-react";
import { useStudentTheme } from "@/contexts/StudentThemeContext";
import { cn } from "@/lib/utils";

/**
 * Sliding pill theme switch — no layout shift, no width change between modes.
 * Both icons are always rendered; the indicator slides over the active one.
 */
export default function ThemeToggle() {
  const { theme, toggle } = useStudentTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "relative inline-flex items-center h-8 w-[60px] rounded-full p-1",
        "border border-border bg-muted/60 hover:bg-muted transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60",
      )}
    >
      {/* Sliding indicator */}
      <span
        aria-hidden
        className={cn(
          "absolute top-1 left-1 h-6 w-6 rounded-full bg-card shadow-sm border border-border",
          "transition-transform duration-300 ease-out",
          isDark ? "translate-x-[28px]" : "translate-x-0",
        )}
      />
      {/* Icons (static positions) */}
      <span className="relative z-10 flex w-6 justify-center">
        <Sun className={cn("h-3.5 w-3.5 transition-colors", !isDark ? "text-amber-500" : "text-muted-foreground/60")} />
      </span>
      <span className="relative z-10 flex w-6 justify-center">
        <Moon className={cn("h-3.5 w-3.5 transition-colors", isDark ? "text-sky-300" : "text-muted-foreground/60")} />
      </span>
    </button>
  );
}
