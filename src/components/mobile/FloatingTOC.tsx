import { useEffect, useState } from "react";
import { List, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TOCItem {
  id: string;
  label: string;
}

interface FloatingTOCProps {
  items: TOCItem[];
  onSelect: (id: string) => void;
  /** Bottom offset in px to sit above a mobile action bar */
  bottomOffset?: number;
}

/**
 * Floating Table-of-Contents button (bottom-right). Opens a sheet with quick links.
 * Mobile-first; on desktop it stays small and unobtrusive.
 */
const FloatingTOC = ({ items, onSelect, bottomOffset = 80 }: FloatingTOCProps) => {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Track active section via IntersectionObserver
  useEffect(() => {
    if (!items.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    items.forEach((it) => {
      const el = document.getElementById(it.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  const handlePick = (id: string) => {
    setOpen(false);
    onSelect(id);
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open table of contents"
        style={{ bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom, 0px))` }}
        className="fixed right-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform md:bottom-6"
      >
        <List className="w-5 h-5" />
      </button>

      {/* Sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed bottom-0 inset-x-0 z-50 bg-card rounded-t-3xl border-t border-border shadow-2xl max-h-[75vh] flex flex-col md:bottom-6 md:right-6 md:left-auto md:inset-x-auto md:w-80 md:rounded-2xl md:border"
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
                <h3 className="font-heading font-bold text-foreground text-base flex items-center gap-2">
                  <List className="w-4 h-4 text-primary" /> On this page
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                {items.map((it) => (
                  <button
                    key={it.id}
                    onClick={() => handlePick(it.id)}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                      activeId === it.id
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    {it.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default FloatingTOC;
