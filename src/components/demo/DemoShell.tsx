import { ReactNode, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { DemoModeProvider } from "@/contexts/DemoModeContext";
import { DemoLockProvider, useDemoLock } from "./DemoLockPopup";

/**
 * Wraps the LIVE student dashboard for /demo/* routes.
 * Behaviour:
 *  - Sidebar / nav links are ALLOWED — internal /student/* links are rewritten
 *    to /demo/* so the user can browse every section freely.
 *  - Items explicitly marked `data-demo-blurred="true"` always trigger the
 *    upsell popup (used to lock all-but-first formula / vocab cards).
 *  - Items marked `data-demo-allow="true"` pass through (tabs, the badge,
 *    the popup itself, the section switcher checkboxes, etc.).
 *  - Everything else (buttons, form submits, mutating actions) → popup.
 */
function ClickInterceptor({ children }: { children: ReactNode }) {
  const { open } = useDemoLock();
  const navigate = useNavigate();

  const rewriteToDemo = useCallback((href: string): string | null => {
    try {
      // Only handle same-origin URLs.
      const url = href.startsWith("/")
        ? new URL(href, window.location.origin)
        : new URL(href);
      if (url.origin !== window.location.origin) return null;
      let path = url.pathname;
      if (path.startsWith("/student")) path = "/demo" + path.slice("/student".length);
      else if (path === "/" || path === "") path = "/demo";
      else if (!path.startsWith("/demo")) return null;
      return path + url.search + url.hash;
    } catch {
      return null;
    }
  }, []);

  const handleCapture = useCallback(
    (e: React.MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;

      // Blurred / locked card → always show popup.
      if (el.closest?.('[data-demo-blurred="true"]')) {
        e.preventDefault();
        e.stopPropagation();
        open();
        return;
      }

      // Explicitly allowed element → let it through untouched.
      if (el.closest?.('[data-demo-allow="true"]')) return;

      // Internal navigation link → rewrite to /demo/* and navigate.
      const anchor = el.closest?.("a") as HTMLAnchorElement | null;
      if (anchor && anchor.getAttribute("href")) {
        const href = anchor.getAttribute("href") || "";
        const target = anchor.getAttribute("target");
        if (target && target !== "_self") return; // external tab — let through
        const rewritten = rewriteToDemo(href);
        if (rewritten) {
          e.preventDefault();
          e.stopPropagation();
          navigate(rewritten);
          return;
        }
      }

      // Anything else (button, submit, mutating click) → popup.
      e.preventDefault();
      e.stopPropagation();
      open();
    },
    [open, navigate, rewriteToDemo]
  );

  const handleKeyCapture = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (el.closest?.('[data-demo-blurred="true"]')) {
        e.preventDefault();
        e.stopPropagation();
        open();
        return;
      }
      if (el.closest?.('[data-demo-allow="true"]')) return;
      // Let anchors flow through their own click handling (browser turns
      // Enter into a click which our click capture will rewrite).
      if (el.closest?.("a[href]")) return;
      const tag = (el.tagName || "").toLowerCase();
      if (["button", "input", "select", "textarea"].includes(tag) || el.getAttribute("role") === "button") {
        e.preventDefault();
        e.stopPropagation();
        open();
      }
    },
    [open]
  );

  const handleSubmitCapture = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation();
      open();
    },
    [open]
  );

  return (
    <div
      onClickCapture={handleCapture}
      onKeyDownCapture={handleKeyCapture}
      onSubmitCapture={handleSubmitCapture}
    >
      {children}
      {/* Floating Demo Mode badge */}
      <motion.div
        data-demo-allow="true"
        initial={{ y: -8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 220, damping: 22 }}
        className="fixed bottom-4 right-4 z-[150] pointer-events-none select-none"
      >
        <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-sky-500/30 ring-2 ring-white/60">
          <Sparkles className="h-3.5 w-3.5" />
          Demo Mode · Preview Access
        </div>
      </motion.div>
    </div>
  );
}

export default function DemoShell({ children }: { children: ReactNode }) {
  return (
    <DemoModeProvider>
      <DemoLockProvider>
        <ClickInterceptor>{children}</ClickInterceptor>
      </DemoLockProvider>
    </DemoModeProvider>
  );
}
