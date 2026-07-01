import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "./index.css";


// Kick off the Supabase client chunk download in parallel with App.tsx
// evaluation on auth-heavy entry routes (LMS, admin, mocks, dashboard
// subdomain). Without this, the first auth call is gated behind a serial
// dynamic import that adds noticeable latency on slow connections.
try {
  const host = window.location.hostname;
  const path = window.location.pathname;
  if (
    host === "dashboard.mbacompass.in" ||
    path.startsWith("/student") ||
    path === "/demo" ||
    path.startsWith("/demo/") ||
    path.startsWith("/admin") ||
    path.startsWith("/mocks") ||
    path.startsWith("/auth")
  ) {
    import("@/integrations/supabase/client");
  }
} catch {}

// Clear the stale-chunk reload guard once the new build has loaded successfully,
// so any future deploy can self-heal again.
try { sessionStorage.removeItem("__chunk_reload_attempted__"); } catch {}

// Catch chunk-load failures that happen OUTSIDE React rendering (e.g. lazy
// route imports triggered by navigation). Force one hard reload so the browser
// fetches the freshly hashed assets after a deploy.
window.addEventListener("vite:preloadError", () => {
  const KEY = "__chunk_reload_attempted__";
  try {
    if (!sessionStorage.getItem(KEY)) {
      sessionStorage.setItem(KEY, "1");
      window.location.reload();
    }
  } catch {
    window.location.reload();
  }
});

// ─────────────────────────────────────────────────────────────
// Cache rescue: older published builds registered a service worker that can
// keep serving stale article CSS/JS on mobile. Always remove it so public
// content pages render from the current network bundle.
// ─────────────────────────────────────────────────────────────
declare const __BUILD_ID__: string;
(() => {
  const clearBrowserCaches = async () => {
    try {
      const regs = await navigator.serviceWorker?.getRegistrations?.();
      await Promise.all((regs || []).map((r) => r.unregister()));
    } catch {}
    try {
      const keys = await caches?.keys?.();
      await Promise.all((keys || []).map((k) => caches.delete(k)));
    } catch {}
  };

  // One-time SW/caches cleanup — only run if a legacy service worker is still
  // registered. Running this on every page load destroys HTTP cache benefits
  // and adds noticeable latency on each navigation.
  const ONCE_KEY = "__sw_cleanup_done__";
  try {
    if (!localStorage.getItem(ONCE_KEY) && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        if (regs && regs.length > 0) {
          clearBrowserCaches().finally(() => {
            try { localStorage.setItem(ONCE_KEY, "1"); } catch {}
          });
        } else {
          try { localStorage.setItem(ONCE_KEY, "1"); } catch {}
        }
      }).catch(() => {});
    }
  } catch {}

  if (!import.meta.env.PROD) return;
  const CURRENT = typeof __BUILD_ID__ !== "undefined" ? __BUILD_ID__ : "";
  if (!CURRENT) return;
  const KEY = "__version_reload_attempted__";

  const checkVersion = async () => {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) return;
      const { buildId } = await res.json();
      if (!buildId || buildId === CURRENT) return;
      if (sessionStorage.getItem(KEY) === buildId) return;
      sessionStorage.setItem(KEY, buildId);
      await clearBrowserCaches();
      window.location.reload();
    } catch {}
  };

  // Defer the first version check until the browser is idle so it doesn't
  // compete with the initial render. Throttle focus checks to once per 2 min.
  const w = window as any;
  const schedule = w.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 3000));
  schedule(() => checkVersion(), { timeout: 5000 });

  let lastCheck = Date.now();
  const maybeCheck = () => {
    if (Date.now() - lastCheck < 2 * 60 * 1000) return;
    lastCheck = Date.now();
    checkVersion();
  };
  window.addEventListener("focus", maybeCheck);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") maybeCheck();
  });
  setInterval(checkVersion, 10 * 60 * 1000);
})();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

// Hide the static HTML shell ONLY after React has actually rendered real
// content into #root. On slow connections (especially the student dashboard
// where StudentLayout is a lazy chunk), naively hiding on rAF leaves the
// user staring at a blank white screen for several seconds while the chunk
// downloads. We watch #root for the first painted child instead, and fall
// back to a hard timeout so the shell never lingers indefinitely.
(() => {
  const root = document.getElementById("root");
  if (!root) return;
  let done = false;
  const hide = () => {
    if (done) return;
    done = true;
    // Two rAFs after content is mounted = guaranteed first paint of real UI
    // before the shell disappears. Prevents flash-of-white.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.documentElement.classList.add("app-mounted");
      });
    });
  };
  const hasRealContent = () => {
    const el = root.firstElementChild as HTMLElement | null;
    return !!(el && el.getBoundingClientRect().height > 0);
  };
  if (hasRealContent()) {
    hide();
  } else {
    const mo = new MutationObserver(() => {
      if (hasRealContent()) {
        mo.disconnect();
        hide();
      }
    });
    mo.observe(root, { childList: true, subtree: true });
    // Safety net — never keep the shell up longer than 8s even if something
    // is wrong; the user should at least see whatever error UI rendered.
    setTimeout(() => { mo.disconnect(); hide(); }, 8000);
  }
})();

