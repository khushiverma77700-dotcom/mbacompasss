import { useLayoutEffect } from "react";

/**
 * Force the page into light theme while mounted (mock runner pages).
 * Removes the `.dark` class from <html> on mount and restores it on unmount.
 * Used so students take mock tests on a clean white background regardless of
 * the LMS dark-mode preference.
 */
export function useForceLightTheme() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains("dark");
    if (wasDark) root.classList.remove("dark");
    return () => {
      if (wasDark) root.classList.add("dark");
    };
  }, []);
}
