import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, X, Smartphone } from "lucide-react";

/**
 * Floating install prompt shown inside the student dashboard.
 *
 * - On Android / desktop Chromium it captures `beforeinstallprompt` so a single
 *   tap installs the dashboard to the home screen.
 * - On iOS Safari (no install API) it shows a short "Add to Home Screen" hint.
 * - Hidden when already running standalone, when permanently dismissed, or
 *   when the user is not on a mobile-ish viewport.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "mbc_install_prompt_dismissed_v1";

export default function InstallAppPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed → never show.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS
      (navigator as any).standalone === true;
    if (standalone) return;

    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const ua = navigator.userAgent || "";
    const ios = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    setIsIos(ios);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS gets a delayed manual hint.
    let iosTimer: number | undefined;
    if (ios) {
      iosTimer = window.setTimeout(() => setVisible(true), 6000);
    }

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
      localStorage.setItem(DISMISS_KEY, "1");
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      if (iosTimer) window.clearTimeout(iosTimer);
    };
  }, []);

  const dismiss = (permanent = true) => {
    setVisible(false);
    if (permanent) localStorage.setItem(DISMISS_KEY, "1");
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") {
      setDeferred(null);
      setVisible(false);
      localStorage.setItem(DISMISS_KEY, "1");
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+72px)] left-1/2 -translate-x-1/2 z-40 w-[min(94vw,420px)] lg:bottom-6 lg:left-auto lg:right-6 lg:translate-x-0 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="relative rounded-2xl border border-sky-200 bg-white shadow-2xl shadow-sky-500/15 dark:bg-slate-900 dark:border-sky-500/30">
        <button
          type="button"
          onClick={() => dismiss(true)}
          aria-label="Dismiss install prompt"
          className="absolute top-2 right-2 p-1.5 rounded-md text-muted-foreground hover:bg-accent"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="p-4 pr-10 flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 grid place-items-center text-white shadow">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm">Install MBA Compass</div>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {isIos
                ? "Tap Share → Add to Home Screen to use the dashboard like an app."
                : "Add the dashboard to your home screen — opens in one tap, faster, full-screen."}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              {deferred ? (
                <button
                  type="button"
                  onClick={install}
                  className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-semibold px-3 py-1.5 shadow-sm hover:shadow-md transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  Install now
                </button>
              ) : (
                <Link
                  to="/student/install"
                  onClick={() => dismiss(false)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-semibold px-3 py-1.5 shadow-sm hover:shadow-md transition"
                >
                  <Download className="h-3.5 w-3.5" />
                  Show me how
                </Link>
              )}
              <button
                type="button"
                onClick={() => dismiss(true)}
                className="text-xs text-muted-foreground hover:text-foreground px-2 py-1"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
