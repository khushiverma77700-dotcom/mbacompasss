import { ReactNode, useCallback } from "react";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { DemoModeProvider } from "@/contexts/DemoModeContext";
import { DemoLockProvider, useDemoLock } from "./DemoLockPopup";

/**
 * Wraps the LIVE student dashboard for /demo/* routes.
 * - Provides DemoModeProvider so StudentLayout bypasses auth
 * - Intercepts every click (capture phase) and shows the lock popup
 *   instead of letting the user actually navigate / submit / mutate.
 * - Hover, scroll, animations, counters, graphs all stay live.
 * - Elements with `data-demo-allow="true"` (the popup itself, its
 *   buttons, the badge) are exempt from the intercept.
 */
function ClickInterceptor({ children }: { children: ReactNode }) {
  const { open } = useDemoLock();

  const handleCapture = useCallback(
    (e: React.MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && el.closest?.('[data-demo-allow="true"]')) return;
      e.preventDefault();
      e.stopPropagation();
      open();
    },
    [open]
  );

  // Also block keyboard "Enter"/"Space" activations on focused controls.
  const handleKeyCapture = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const el = e.target as HTMLElement | null;
      if (el && el.closest?.('[data-demo-allow="true"]')) return;
      const tag = (el?.tagName || "").toLowerCase();
      if (["a", "button", "input", "select", "textarea"].includes(tag) || el?.getAttribute("role") === "button") {
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
