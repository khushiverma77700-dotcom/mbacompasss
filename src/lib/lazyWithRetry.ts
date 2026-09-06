import { lazy, type ComponentType } from "react";

const RELOAD_KEY = "__chunk_reload_attempted__";

/**
 * React.lazy with stale-chunk recovery.
 *
 * After a deploy, an already-open tab holds an old index.html that points at
 * hashed chunk files which no longer exist, so the dynamic import rejects with
 * "Failed to fetch dynamically imported module" and the page goes blank.
 *
 * Strategy: retry once (handles transient network blips), then force ONE hard
 * reload so the browser picks up the fresh index.html and asset hashes.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      try {
        return await factory();
      } catch (finalError) {
        if (typeof window !== "undefined") {
          try {
            if (!sessionStorage.getItem(RELOAD_KEY)) {
              sessionStorage.setItem(RELOAD_KEY, "1");
              window.location.reload();
              // Never resolves — the reload takes over.
              return await new Promise<{ default: T }>(() => {});
            }
          } catch {
            /* sessionStorage unavailable (private mode) */
          }
        }
        throw finalError;
      }
    }
  });
}
