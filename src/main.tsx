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
// Auto cache-bust: poll /version.json and force a hard reload
// (clearing SW + caches) whenever a newer build is detected.
// ─────────────────────────────────────────────────────────────
declare const __BUILD_ID__: string;
(() => {
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
      // Nuke SW + caches so the next load is fully fresh
      try {
        const regs = await navigator.serviceWorker?.getRegistrations?.();
        await Promise.all((regs || []).map((r) => r.unregister()));
        const keys = await caches?.keys?.();
        await Promise.all((keys || []).map((k) => caches.delete(k)));
      } catch {}
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

// ─────────────────────────────────────────────────────────────
// Service Worker registration — production only, never inside
// the Lovable editor preview or any iframe context.
// ─────────────────────────────────────────────────────────────
(() => {
  const inIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();
  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("preview--") ||
    host.includes("lovableproject.com") ||
    host.includes("lovableproject-dev.com") ||
    host.endsWith(".lovable.app"); // includes editor preview

  if (inIframe || isPreviewHost || !("serviceWorker" in navigator)) {
    // Defensive cleanup: unregister any SW that might exist in preview
    navigator.serviceWorker?.getRegistrations?.().then((regs) => {
      regs.forEach((r) => r.unregister());
    }).catch(() => {});
    return;
  }

  if (import.meta.env.PROD) {
    import("workbox-window").then(({ Workbox }) => {
      const wb = new Workbox("/sw.js");

      // When a new SW takes control, force a reload so the installed
      // PWA picks up the latest build instead of showing the cached one.
      let reloading = false;
      wb.addEventListener("controlling", () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
      });

      // As soon as a new SW is waiting, activate it immediately.
      wb.addEventListener("waiting", () => wb.messageSkipWaiting());

      wb.register({ immediate: true }).then((reg) => {
        if (!reg) return;
        // Check for updates on app focus / visibility (installed PWAs
        // rarely fully close, so this is the main update trigger).
        const checkForUpdate = () => reg.update().catch(() => {});
        window.addEventListener("focus", checkForUpdate);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") checkForUpdate();
        });
        // And poll every 30 min as a safety net.
        setInterval(checkForUpdate, 30 * 60 * 1000);
      }).catch(() => {});
    });
  }
})();
