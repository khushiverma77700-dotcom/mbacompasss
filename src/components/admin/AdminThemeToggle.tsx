import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "admin_theme";

export const applyAdminTheme = (theme: "light" | "dark") => {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("admin-dark");
  else root.classList.remove("admin-dark");
};

export const getInitialAdminTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const AdminThemeToggle = () => {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const initial = getInitialAdminTheme();
    setTheme(initial);
    applyAdminTheme(initial);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyAdminTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  const isDark = theme === "dark";

  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle theme"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="group relative inline-flex h-9 w-[68px] items-center rounded-full border border-border bg-gradient-to-r from-secondary to-muted px-1 shadow-inner transition-all hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
        <Sun className={`h-3.5 w-3.5 transition-all ${isDark ? "text-muted-foreground/50" : "text-amber-500"}`} />
      </span>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
        <Moon className={`h-3.5 w-3.5 transition-all ${isDark ? "text-primary" : "text-muted-foreground/50"}`} />
      </span>
      <span
        className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full bg-card shadow-lg ring-1 ring-border transition-transform duration-300 ease-out ${
          isDark ? "translate-x-[32px]" : "translate-x-0"
        }`}
      >
        {isDark ? (
          <Moon className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Sun className="h-3.5 w-3.5 text-amber-500" />
        )}
      </span>
    </button>
  );
};

export default AdminThemeToggle;
