import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import "./index.css";

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

  clearBrowserCaches();

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

  // Check on load, on tab focus, and every 5 min.
  checkVersion();
  window.addEventListener("focus", checkVersion);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkVersion();
  });
  setInterval(checkVersion, 5 * 60 * 1000);
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

