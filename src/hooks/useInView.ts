import { useEffect, useRef, useState } from "react";

/**
 * Returns true once the referenced element scrolls within `rootMargin` of the viewport.
 * Used to defer mounting heavy below-the-fold sections until they're about to be visible.
 */
export const useInView = <T extends HTMLElement = HTMLDivElement>(rootMargin = "180px") => {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (inView || !ref.current) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [inView, rootMargin]);

  return { ref, inView };
};

/**
 * Wrapper component: renders `children` only when its placeholder enters near the viewport.
 */
import { ReactNode, createElement, Suspense } from "react";
import { useHydrated } from "@tanstack/react-router";

interface LazyMountProps {
  children: ReactNode;
  rootMargin?: string;
  minHeight?: number;
  fallback?: ReactNode;
  id?: string;
  /**
   * When true, `children` are rendered during SSR (and therefore also on the
   * very first client render, so hydration matches byte-for-byte) instead of
   * the skeleton fallback. Crawlers and view-source then see real content
   * rather than `aria-busy` placeholders. Sections mounted *after* hydration
   * (client-side navigations) keep the normal mount-on-scroll behaviour.
   */
  ssr?: boolean;
}

export const LazyMount = ({ children, rootMargin = "180px", minHeight = 200, fallback = null, id, ssr = false }: LazyMountProps) => {
  const { ref, inView } = useInView<HTMLDivElement>(rootMargin);
  const hydrated = useHydrated();
  // `useHydrated()` is false during SSR *and* during the hydration render, and
  // true from the first render of any later client navigation — so this sticks
  // to `true` only for markup that was server-rendered.
  const [ssrMounted] = useState(() => ssr && !hydrated);
  // CRITICAL CLS fix: keep `min-height` reserved even AFTER `inView` flips true.
  // Otherwise the wrapper collapses to 0 while the lazy chunk downloads, then
  // snaps back to its real height — yanking the footer and everything below
  // (CLS was 2.1 — mostly from this). `content-visibility:auto` lets the
  // browser skip rendering work for off-screen sections while still reserving
  // the correct intrinsic space.
  return createElement(
    "div",
    {
      ref,
      id,
      style: {
        minHeight,
        contentVisibility: "auto" as any,
        containIntrinsicSize: `1px ${minHeight}px`,
        scrollMarginTop: "6rem",
      },
    },
    inView || ssrMounted ? createElement(Suspense, { fallback }, children) : fallback
  );
};

