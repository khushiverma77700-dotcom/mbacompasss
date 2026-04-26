import { useEffect, useRef, useState } from "react";

/**
 * Returns true once the referenced element scrolls within `rootMargin` of the viewport.
 * Used to defer mounting heavy below-the-fold sections until they're about to be visible.
 */
export const useInView = <T extends HTMLElement = HTMLDivElement>(rootMargin = "400px") => {
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

interface LazyMountProps {
  children: ReactNode;
  rootMargin?: string;
  minHeight?: number;
  fallback?: ReactNode;
}

export const LazyMount = ({ children, rootMargin = "400px", minHeight = 200, fallback = null }: LazyMountProps) => {
  const { ref, inView } = useInView<HTMLDivElement>(rootMargin);
  return createElement(
    "div",
    { ref, style: inView ? undefined : { minHeight } },
    inView ? createElement(Suspense, { fallback }, children) : null
  );
};
