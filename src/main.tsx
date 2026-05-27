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

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

// Hide the static LCP shell once React has committed the real hero.
// Two rAFs guarantee the real hero has painted before we hide the shell — no flash.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    document.documentElement.classList.add("app-mounted");
  });
});

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
      wb.addEventListener("waiting", () => wb.messageSkipWaiting());
      wb.register().catch(() => {});
    });
  }
})();
