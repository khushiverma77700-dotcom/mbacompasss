import { useEffect, useState, useCallback, RefObject } from "react";
import { List, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

interface AutoTOCProps {
  /** Ref to the rendered content container (the wrapper around dangerouslySetInnerHTML / prose). */
  contentRef: RefObject<HTMLElement | null>;
  /** Title above the TOC. */
  title?: string;
  /** Tailwind classes for outer wrapper. */
  className?: string;
  /** Re-scan whenever any of these change (e.g. article slug / content length). */
  deps?: unknown[];
}

const slugify = (raw: string, used: Set<string>) => {
  const base = raw
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || "section";
  let id = base;
  let i = 2;
  while (used.has(id)) id = `${base}-${i++}`;
  used.add(id);
  return id;
};

/**
 * Automatic Table of Contents. Scans the supplied content container for
 * h2/h3 headings, injects stable ids, and renders a smooth-scroll TOC.
 * Renders nothing when fewer than 2 valid headings are found.
 */
export function AutoTOC({ contentRef, title = "Table of Contents", className, deps = [] }: AutoTOCProps) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [openMobile, setOpenMobile] = useState(false);

  // Build TOC from the rendered DOM
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;

    let tid = 0;
    const scan = () => {
      const headings = Array.from(root.querySelectorAll("h2, h3")) as HTMLHeadingElement[];
      const used = new Set<string>();
      const built: TocItem[] = [];

      for (const h of headings) {
        const text = (h.textContent || "").trim();
        if (!text || text.length < 2) continue;
        // Skip headings inside interactive / decorative blocks
        if (h.closest("nav, aside, form, button, [data-no-toc]")) continue;

        let id = h.id;
        if (!id) {
          id = slugify(text, used);
          h.id = id;
        } else {
          used.add(id);
        }
        // Add a little scroll offset for sticky headers
        h.style.scrollMarginTop = "96px";

        built.push({ id, text, level: h.tagName === "H2" ? 2 : 3 });
      }
      setItems((prev) =>
        prev.length === built.length && prev.every((p, i) => p.id === built[i].id && p.text === built[i].text)
          ? prev
          : built,
      );
    };
    tid = window.setTimeout(scan, 50);
    // Content can be re-rendered (sanitizer load, hydration) which drops the
    // injected ids, so re-scan whenever the content subtree changes.
    const mo = new MutationObserver(() => {
      window.clearTimeout(tid);
      tid = window.setTimeout(scan, 30);
    });
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      window.clearTimeout(tid);
      mo.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentRef, ...deps]);

  // Track active heading on scroll
  useEffect(() => {
    if (items.length === 0) return;
    const els = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => !!el);
    if (els.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [items]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, id: string, index: number) => {
    e.preventDefault();
    let el = document.getElementById(id);
    if (!el) {
      // Fallback: ids were lost on re-render — locate the heading by position/text.
      const root = contentRef.current;
      const hs = root
        ? (Array.from(root.querySelectorAll("h2, h3")) as HTMLElement[]).filter(
            (h) => (h.textContent || "").trim().length >= 2 && !h.closest("nav, aside, form, button, [data-no-toc]"),
          )
        : [];
      el = hs[index] ?? null;
      if (el) el.id = id;
    }
    if (!el) return;
    el.style.scrollMarginTop = "96px";
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
    setOpenMobile(false);
  }, [contentRef]);

  if (items.length < 2) return null;

  const list = (
    <ol className="space-y-1.5 text-sm">
      {items.map((item, idx) => {
        const active = activeId === item.id;
        return (
          <li key={item.id} className={cn(item.level === 3 && "ml-4")}>
            <a
              href={`#${item.id}`}
              onClick={(e) => handleClick(e, item.id, idx)}
              className={cn(
                "group flex items-start gap-2 rounded-md px-2.5 py-1.5 leading-snug transition-colors",
                active
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-foreground/75 hover:text-primary hover:bg-primary/[0.06]"
              )}
            >
              {item.level === 2 && (
                <span
                  className={cn(
                    "mt-[2px] shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-[0.25rem] text-xs font-bold border",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border group-hover:border-primary/40 group-hover:text-primary"
                  )}
                >
                  {String(idx + 1).padStart(2, "0").slice(-2)}
                </span>
              )}
              <span className={cn("min-w-0 break-words", item.level === 3 && "text-sm")}>
                {item.text}
              </span>
            </a>
          </li>
        );
      })}
    </ol>
  );

  return (
    <nav
      aria-label="Table of contents"
      className={cn(
        "rounded-2xl border border-border bg-card shadow-xs overflow-hidden",
        className
      )}
    >
      {/* Header: button on mobile, static on md+ */}
      <button
        type="button"
        onClick={() => setOpenMobile((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 md:cursor-default"
        aria-expanded={openMobile}
      >
        <span className="flex items-center gap-2 font-heading font-bold text-foreground text-sm">
          <List className="w-4 h-4 text-primary" />
          {title}
          <span className="text-xs font-medium text-muted-foreground">({items.length})</span>
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform md:hidden",
            openMobile && "rotate-180"
          )}
        />
      </button>
      <div
        className={cn(
          "px-3 pb-3 border-t border-border/60",
          openMobile ? "block" : "hidden",
          "md:block"
        )}
      >
        <div className="pt-3">{list}</div>
      </div>
    </nav>
  );
}

export default AutoTOC;
