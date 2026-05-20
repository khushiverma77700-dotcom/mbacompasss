import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, X, Smartphone } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "mbc-install-dismissed-at";
const DISMISS_MS = 1000 * 60 * 60 * 24 * 7; // hide for 7 days

/**
 * Lightweight, non-blocking install nudge for the student dashboard.
 *
 *  • Shows only when the browser fires `beforeinstallprompt` (i.e. installable).
 *  • Hidden if already running as a standalone PWA.
 *  • Respects a 7-day dismissal so we don't nag students.
 *  • iOS Safari never fires the event — for that crowd we surface a soft hint
 *    pointing to the dedicated /student/install guide.
 */
export default function InstallAppPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [manualFallback, setManualFallback] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    if (standalone) return;

    const last = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (last && Date.now() - last < DISMISS_MS) return;

    const ua = navigator.userAgent || "";
    const isIos = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios|edgios/i.test(ua);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
      setManualFallback(false);
      setIosHint(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // Soft iOS hint — show after a short delay so it doesn't feel intrusive
    let iosTimer: number | undefined;
    if (isIos) {
      iosTimer = window.setTimeout(() => setIosHint(true), 4000);
    }

    // Universal fallback: if no install event arrived after 6s and we're not
    // already showing iOS hint or the native prompt, surface a manual link to
    // the /student/install guide so users always have a way in.
    const fallbackTimer = window.setTimeout(() => {
      setManualFallback((prev) => prev || (!isIos));
    }, 6000);

    return () => {
      if (iosTimer) clearTimeout(iosTimer);
      clearTimeout(fallbackTimer);
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
    setIosHint(false);
    setManualFallback(false);
  };

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } finally {
      dismiss();
    }
  };

  if (!show && !iosHint && !manualFallback) return null;
  const showNative = show && !!deferred;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-40 w-[min(560px,calc(100vw-1.5rem))] animate-in slide-in-from-bottom duration-300"
      style={{ bottom: "calc(env(safe-area-inset-bottom,0px) + 76px)" }}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-sky-200 dark:border-sky-500/30 bg-card/95 backdrop-blur px-3 py-2.5 shadow-xl shadow-sky-500/10">
        <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white">
          <Smartphone className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">Install MBA Compass</div>
          <div className="text-[11px] text-muted-foreground truncate">
            {iosHint
              ? "Add to Home Screen for one-tap access"
              : "Use the dashboard like a native app"}
          </div>
        </div>
        {showNative ? (
          <button
            onClick={install}
            className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-semibold px-3 py-2 shadow"
          >
            <Download className="h-3.5 w-3.5" /> Install
          </button>
        ) : (
          <Link
            to="/student/install"
            onClick={dismiss}
            className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold px-3 py-2"
          >
            <Download className="h-3.5 w-3.5" /> {iosHint ? "How" : "Install"}
          </Link>
        )}
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
