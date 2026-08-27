import { useEffect } from "react";

/**
 * Auto-detects every <table> inside a rich-content container (blog articles,
 * college content blocks, AI-generated HTML) and makes it safely scrollable:
 *
 *  - ensures each table sits inside `.ai-table-wrap` (the horizontal scroller)
 *  - wraps that scroller in `.ai-table-shell` so we can paint an edge fade +
 *    a "Swipe" hint without the hint scrolling away
 *  - marks the shell with `data-scroll` / `data-at-end` so CSS can show or hide
 *    the affordance depending on whether the table actually overflows
 *
 * Idempotent — safe to run on every content change.
 */
export function useScrollableTables(
  ref: React.RefObject<HTMLElement>,
  deps: unknown[] = [],
) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const cleanups: Array<() => void> = [];

    const enhance = () => {
      const tables = Array.from(root.querySelectorAll("table"));
      tables.forEach((table) => {
        // 1. Make sure the direct parent is the scroll wrapper.
        let wrap = table.parentElement;
        if (!wrap || !wrap.classList.contains("ai-table-wrap")) {
          const created = document.createElement("div");
          created.className = "ai-table-wrap";
          table.parentNode?.insertBefore(created, table);
          created.appendChild(table);
          wrap = created;
        }

        // 2. Make sure the wrapper sits inside a positioned shell.
        let shell = wrap.parentElement;
        if (!shell || !shell.classList.contains("ai-table-shell")) {
          const created = document.createElement("div");
          created.className = "ai-table-shell";
          wrap.parentNode?.insertBefore(created, wrap);
          created.appendChild(wrap);
          shell = created;
        }

        const scroller = wrap as HTMLElement;
        const shellEl = shell as HTMLElement;

        const sync = () => {
          const overflowing = scroller.scrollWidth - scroller.clientWidth > 4;
          if (overflowing) shellEl.setAttribute("data-scroll", "1");
          else shellEl.removeAttribute("data-scroll");
          const atEnd =
            scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 8;
          if (atEnd) shellEl.setAttribute("data-at-end", "1");
          else shellEl.removeAttribute("data-at-end");
        };

        sync();
        scroller.addEventListener("scroll", sync, { passive: true });
        const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
        ro?.observe(scroller);
        ro?.observe(table);
        cleanups.push(() => {
          scroller.removeEventListener("scroll", sync);
          ro?.disconnect();
        });
      });
    };

    enhance();
    const t = window.setTimeout(enhance, 400); // late images/fonts changing widths
    window.addEventListener("resize", enhance);

    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", enhance);
      cleanups.forEach((fn) => fn());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default useScrollableTables;
