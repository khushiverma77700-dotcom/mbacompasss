import { useEffect, useState } from "react";
import { Compass, X } from "lucide-react";

const SECTIONS = [
  { id: "home-paths", label: "Your Path" },
  { id: "home-timeline", label: "Year Map" },
  { id: "home-salary", label: "Salaries" },
  { id: "home-specializations", label: "Specialisations" },
  { id: "home-cities", label: "Cities" },
  { id: "home-tools", label: "Tools" },
  { id: "home-comparisons", label: "Comparisons" },
  { id: "home-quick-answers", label: "Quick Answers" },
  { id: "home-blog", label: "Blog" },
];

/**
 * Compact "Jump to" mini-menu: lets keyboard and mouse users reach key
 * homepage sections without scrolling through the whole page.
 */
const JumpToMenu = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const jump = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setOpen(false);
  };

  return (
    <div
      className="fixed bottom-5 right-[4.5rem] z-50"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      {open && (
        <nav
          aria-label="Jump to section"
          className="absolute bottom-14 right-0 w-44 overflow-hidden rounded-xl border border-border bg-background/95 p-1.5 shadow-lg backdrop-blur"
        >
          <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Jump to
          </p>
          <ul>
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => jump(s.id)}
                  className="w-full rounded-md px-2 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                >
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Close jump to section menu" : "Open jump to section menu"}
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-lg transition-colors hover:bg-accent hover:text-accent-foreground"
      >
        {open ? <X className="h-5 w-5" /> : <Compass className="h-5 w-5" />}
      </button>
    </div>
  );
};

export default JumpToMenu;
