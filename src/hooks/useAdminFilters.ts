import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Persistent admin-table filter state.
 *
 * - URL query params are the source of truth (shareable, refresh-safe, back/forward works).
 * - On mount, if URL is empty we hydrate from localStorage (per `storageKey`).
 * - Every change writes to BOTH the URL and localStorage.
 * - Filters never reset on refresh — only the explicit "Clear" action removes them.
 *
 * Keys whose value equals the default (or the falsy values "", "all", null, undefined)
 * are stripped from the URL to keep links clean.
 */
export type AdminFiltersState = Record<string, string>;

export interface UseAdminFiltersOptions {
  /** localStorage namespace, e.g. "admin.colleges.filters". Required for persistence. */
  storageKey: string;
  /** Default values for each filter key (used to strip "no-op" params from the URL). */
  defaults: AdminFiltersState;
  /** URL params that should be preserved (e.g. "edit") and not treated as filters. */
  preserveKeys?: string[];
}

const isDefaultValue = (val: string, def: string) => {
  const v = (val ?? "").trim();
  if (!v) return true;
  if (v === def) return true;
  if (v === "all") return true;
  return false;
};

export function useAdminFilters({ storageKey, defaults, preserveKeys = [] }: UseAdminFiltersOptions) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Hydrate initial state: URL > localStorage > defaults
  const [filters, setFilters] = useState<AdminFiltersState>(() => {
    const initial: AdminFiltersState = { ...defaults };

    // 1) localStorage fallback (only used if URL has no filter params)
    let urlHasAnyFilter = false;
    for (const key of Object.keys(defaults)) {
      const urlVal = searchParams.get(key);
      if (urlVal != null) urlHasAnyFilter = true;
    }

    if (!urlHasAnyFilter && typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as AdminFiltersState;
          for (const key of Object.keys(defaults)) {
            if (typeof parsed[key] === "string") initial[key] = parsed[key];
          }
        }
      } catch {
        /* ignore corrupt localStorage */
      }
    }

    // 2) URL overrides
    for (const key of Object.keys(defaults)) {
      const urlVal = searchParams.get(key);
      if (urlVal != null) initial[key] = urlVal;
    }
    return initial;
  });

  // Sync state -> URL + localStorage whenever filters change
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    // Preserve keys we don't manage (e.g. ?edit=...)
    const preserved: Record<string, string> = {};
    for (const key of preserveKeys) {
      const v = searchParams.get(key);
      if (v != null) preserved[key] = v;
    }
    // Remove all keys we own
    for (const key of Object.keys(defaults)) next.delete(key);
    // Re-add only non-default values
    for (const key of Object.keys(filters)) {
      const val = filters[key];
      const def = defaults[key] ?? "";
      if (!isDefaultValue(val, def)) next.set(key, val);
    }
    // Restore preserved
    for (const [k, v] of Object.entries(preserved)) next.set(k, v);

    // Only call setSearchParams if URL actually changed (avoid render loop)
    const currentStr = searchParams.toString();
    const nextStr = next.toString();
    if (currentStr !== nextStr) {
      setSearchParams(next, { replace: true });
    }

    // Persist to localStorage (always, even when default — so we remember "user cleared it")
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(filters));
      } catch {
        /* ignore quota errors */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setAll = useCallback((next: AdminFiltersState) => {
    setFilters((prev) => ({ ...prev, ...next }));
  }, []);

  const clearAll = useCallback(() => {
    setFilters({ ...defaults });
  }, [defaults]);

  const activeCount = useMemo(() => {
    let count = 0;
    for (const key of Object.keys(filters)) {
      if (!isDefaultValue(filters[key], defaults[key] ?? "")) count += 1;
    }
    return count;
  }, [filters, defaults]);

  return { filters, setFilter, setAll, clearAll, activeCount };
}
