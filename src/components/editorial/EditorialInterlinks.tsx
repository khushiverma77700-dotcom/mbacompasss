import { useEffect } from "react";
import { useLocation } from "@/lib/router-compat";
import { loadEditorialLinkPool } from "@/lib/editorialLinkPool";
import { linkEditorialContent } from "@/lib/editorialLinks";

export default function EditorialInterlinks() {
  const { pathname } = useLocation();
  useEffect(() => {
    const main = document.getElementById("main-content");
    if (!main) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const apply = async () => {
      // Work only in rich-text editorial bodies, never navigation or product controls.
      const roots = main.querySelectorAll<HTMLElement>(".prose,.ai-content,[data-editorial-content]");
      if (!roots.length) return;
      try {
        const targets = await loadEditorialLinkPool();
        if (stopped) return;
        observer.disconnect();
        roots.forEach(root => {
          if (!root.parentElement?.closest(".prose,.ai-content,[data-editorial-content]")) linkEditorialContent(root, targets, pathname);
        });
        observer.observe(main, { childList: true, subtree: true, characterData: true });
      } catch (error) { console.warn("Editorial links unavailable", error); }
    };
    const schedule = () => { if (timer) clearTimeout(timer); timer = setTimeout(apply, 400); };
    const observer = new MutationObserver(schedule);
    observer.observe(main, { childList: true, subtree: true, characterData: true });
    schedule();
    return () => { stopped = true; observer.disconnect(); if (timer) clearTimeout(timer); };
  }, [pathname]);
  return null;
}