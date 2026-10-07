import { useEffect } from "react";
import { useLocation } from "@/lib/router-compat";
import { loadEditorialLinkPool } from "@/lib/editorialLinkPool";
import { linkEditorialContent } from "@/lib/editorialLinks";

const ROOTS = ".prose,.ai-content,[data-editorial-content]";
const MAX_PASSES = 4;

export default function EditorialInterlinks() {
  const { pathname } = useLocation();
  useEffect(() => {
    const main = document.getElementById("main-content");
    if (!main) return;
    let stopped = false;
    let passes = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const done = new WeakSet<HTMLElement>();
    const apply = async () => {
      // Work only in rich-text editorial bodies, never navigation or product controls.
      const roots = [...main.querySelectorAll<HTMLElement>(ROOTS)].filter(
        (r) => !done.has(r) && !r.parentElement?.closest(ROOTS) && !r.closest("[data-ad-slot]"),
      );
      if (!roots.length) return;
      passes += 1;
      if (passes >= MAX_PASSES) observer.disconnect();
      try {
        const targets = await loadEditorialLinkPool();
        if (stopped) return;
        observer.disconnect();
        roots.forEach((root) => { linkEditorialContent(root, targets, pathname); done.add(root); });
        if (passes < MAX_PASSES) observer.observe(main, { childList: true, subtree: true });
      } catch (error) { console.warn("Editorial links unavailable", error); }
    };
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
        if (w.requestIdleCallback) w.requestIdleCallback(() => void apply(), { timeout: 2000 });
        else void apply();
      }, 800);
    };
    const observer = new MutationObserver((records) => {
      // Ignore our own link inserts and ad slot changes to avoid feedback loops.
      if (records.some((r) => [...r.addedNodes].some((n) => n instanceof HTMLElement && !n.closest("[data-ad-slot]") && n.tagName !== "A"))) schedule();
    });
    observer.observe(main, { childList: true, subtree: true });
    schedule();
    return () => { stopped = true; observer.disconnect(); if (timer) clearTimeout(timer); };
  }, [pathname]);
  return null;
}
