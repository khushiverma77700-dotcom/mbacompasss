import React, { Suspense, useEffect, useState, lazy } from "react";
import { useLocation } from "@/lib/router-compat";
import BackButton from "@/components/BackButton";
import { useAdSlots } from "@/components/ads/AdSlots";

const Navbar = lazy(() => import("@/components/Navbar"));
const Footer = lazy(() => import("@/components/Footer"));

// Mount heavy non-critical chrome (Footer) only after first paint + idle so it
// doesn't block initial JS execution / FCP. Ported from the pre-migration
// App.tsx DeferredChrome.
const DeferredChrome = () => {
  const [show, setShow] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setShow(false);
    const w = window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    let idleHandle: number | undefined;
    let rafHandle: number | undefined;
    if (typeof w.requestIdleCallback === "function") {
      idleHandle = w.requestIdleCallback(() => setShow(true), { timeout: 800 });
    } else {
      rafHandle = window.requestAnimationFrame(() => setShow(true));
    }
    return () => {
      if (idleHandle !== undefined) {
        try {
          w.cancelIdleCallback?.(idleHandle);
        } catch {
          /* noop */
        }
      }
      if (rafHandle !== undefined) window.cancelAnimationFrame(rafHandle);
    };
  }, [location.pathname]);

  if (!show) return null;

  return (
    <Suspense fallback={null}>
      <Footer />
    </Suspense>
  );
};

const PublicLayoutShell = ({ children }: { children: React.ReactNode }) => {
  const ads = useAdSlots();
  return (
  <>
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-lg focus:ring-2 focus:ring-primary"
    >
      Skip to main content
    </a>
    <Suspense fallback={<div style={{ height: 64 }} aria-hidden="true" />}>
      <Navbar />
    </Suspense>
    <BackButton />
    {ads.top}
    <main id="main-content">{children}</main>
    {ads.end}
    {ads.portals}
    <DeferredChrome />
  </>
  );
};

export default PublicLayoutShell;
