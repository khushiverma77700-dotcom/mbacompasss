import React, { Suspense, useEffect, useState, lazy } from "react";
import { useLocation } from "@/lib/router-compat";
import BackButton from "@/components/BackButton";
import { useAdSlots } from "@/components/ads/AdSlots";
import EditorialInterlinks from "@/components/editorial/EditorialInterlinks";
import { useHydrated, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { refreshPublicSnapshot } from "@/lib/queries/publicSnapshot";
import SiteBreadcrumbs from "@/components/SiteBreadcrumbs";

const Navbar = lazy(() => import("@/components/Navbar"));
const Footer = lazy(() => import("@/components/Footer"));

// Mount heavy non-critical chrome (Footer) only after first paint + idle so it
// doesn't block initial JS execution / FCP. Ported from the pre-migration
// App.tsx DeferredChrome.
const DeferredChrome = () => {
  const [show, setShow] = useState(false);
  const hydrated = useHydrated();
  const [serverRendered] = useState(() => !hydrated);
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

  if (!show && !serverRendered) return null;

  return (
    <Suspense fallback={null}>
      <Footer />
    </Suspense>
  );
};

const PublicLayoutShell = ({ children }: { children: React.ReactNode }) => {
  const ads = useAdSlots();
  const client = useQueryClient();
  const router = useRouter();
  const location = useLocation();
  const hasPageBreadcrumbs = /^\/(article|exam|blog|category|mba-application|courses|mocks|formulas)(\/|$)/.test(location.pathname);
  const pageLabel = location.pathname.split("/").filter(Boolean).at(-1)?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "";
  useEffect(() => {
    let disposed = false;
    let running = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (disposed || running) return;
      running = true;
      void refreshPublicSnapshot(client).then((refreshed) => {
        if (refreshed && !disposed) void router.invalidate();
      }).finally(() => { running = false; });
    };
    // Split route components can subscribe after the shared shell's effect.
    const unsubscribe = client.getQueryCache().subscribe((event) => {
      if (event.type !== "observerAdded") return;
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(refresh, 0);
    });
    timer = setTimeout(refresh, 0);
    return () => { disposed = true; unsubscribe(); if (timer !== undefined) clearTimeout(timer); };
  }, [client, router, location.pathname]);
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
    <main id="main-content">
      {location.pathname !== "/" && !hasPageBreadcrumbs && <div className="container mx-auto px-4 pt-4"><SiteBreadcrumbs items={[
        ...(location.pathname.startsWith("/college/") ? [{ name: "Colleges", url: "/colleges" }] : []),
        ...(location.pathname.startsWith("/tools/") ? [{ name: "Tools", url: "/tools" }] : []),
        { name: pageLabel, url: location.pathname },
      ]} /></div>}
      {children}
    </main>
    <EditorialInterlinks />
    {ads.end}
    {ads.portals}
    <DeferredChrome />
  </>
  );
};

export default PublicLayoutShell;
