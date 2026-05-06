import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface NavItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  hasAI?: boolean;
}

interface CollegeSectionNavProps {
  items: NavItem[];
  /** Pixel offset from top to account for sticky header. */
  topOffset?: number;
  className?: string;
}

/**
 * Sticky vertical navigation for the long-form college detail sections.
 *
 * - Hidden on small screens (a separate FloatingTOC handles mobile).
 * - Highlights the section currently in view using IntersectionObserver.
 * - Smooth-scrolls to the section on click.
 */
const CollegeSectionNav = ({ items, topOffset = 96, className }: CollegeSectionNavProps) => {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const observers: IntersectionObserver[] = [];
    const visible = new Map<string, number>();

    items.forEach((item) => {
      const el = document.getElementById(item.id);
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              visible.set(item.id, entry.intersectionRatio);
            } else {
              visible.delete(item.id);
            }
          }
          if (visible.size > 0) {
            const top = [...visible.entries()].sort((a, b) => b[1] - a[1])[0][0];
            setActive(top);
          }
        },
        { rootMargin: `-${topOffset}px 0px -55% 0px`, threshold: [0, 0.25, 0.5, 1] },
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, [items, topOffset]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - topOffset + 8;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <nav
      aria-label="College sections"
      className={cn("w-full min-w-0", className)}
    >
      <div className="w-full min-w-0 rounded-xl border border-border/60 bg-card shadow-sm p-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2 pb-2 mb-2 border-b border-border/40">
          On this page
        </div>
        <ul className="space-y-0.5">
          {items.map((item) => {
            const isActive = active === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => scrollTo(item.id)}
                  className={cn(
                    "group w-full min-w-0 text-left flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-all",
                    "border-l-2",
                    isActive
                      ? "bg-primary/10 text-primary font-semibold border-primary"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground border-transparent",
                  )}
                >
                  {item.icon && (
                    <span className={cn("flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground/70")}>
                      {item.icon}
                    </span>
                  )}
                  <span className="truncate flex-1">{item.label}</span>
                  {item.hasAI && (
                    <span
                      title="Extended AI insights available"
                      className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded"
                    >
                      AI+
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export default CollegeSectionNav;
