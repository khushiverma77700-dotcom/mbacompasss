import { useMemo } from "react";
import { useAdminFilters, AdminFiltersState } from "@/hooks/useAdminFilters";

export type FieldGetter<T> = (item: T) => string | number | boolean | null | undefined;

export interface FilteredListConfig<T> {
  /** localStorage namespace, e.g. "admin.banners.filters" */
  storageKey: string;
  /** Defaults for each filter key. Must include "search" if searchFields is provided. */
  defaults: AdminFiltersState;
  /** Fields to scan for the free-text search box (case-insensitive substring). */
  searchFields?: FieldGetter<T>[];
  /**
   * Map of filterKey -> getter that returns the value to compare to the filter's current string value.
   * A filter row is kept if `String(getter(item)).toLowerCase() === currentValue.toLowerCase()`.
   * Skip a key here for completely custom predicates (provide via `customPredicates`).
   */
  fieldFilters?: Record<string, FieldGetter<T>>;
  /** Fully custom predicates; receive the current value and the row, return true to keep. */
  customPredicates?: Record<string, (value: string, item: T) => boolean>;
  /** URL params that should be preserved (e.g. "edit") and not treated as filters. */
  preserveKeys?: string[];
}

/**
 * Wraps `useAdminFilters` with a client-side filter+search runner so admin pages
 * only need to declare which fields are searchable / filterable.
 */
export function useFilteredList<T>(items: T[], config: FilteredListConfig<T>) {
  const { filters, setFilter, setAll, clearAll, activeCount } = useAdminFilters({
    storageKey: config.storageKey,
    defaults: config.defaults,
    preserveKeys: config.preserveKeys,
  });

  const filtered = useMemo(() => {
    const search = (filters.search ?? "").trim().toLowerCase();
    const fieldKeys = Object.keys(config.fieldFilters ?? {});
    const customKeys = Object.keys(config.customPredicates ?? {});

    return items.filter((item) => {
      // free text
      if (search && config.searchFields?.length) {
        const hay = config.searchFields
          .map((g) => g(item))
          .filter((v) => v !== null && v !== undefined && v !== "")
          .map((v) => String(v).toLowerCase())
          .join(" ");
        if (!hay.includes(search)) return false;
      }

      // simple equality field filters
      for (const key of fieldKeys) {
        const val = filters[key];
        if (!val || val === "all" || val === "") continue;
        const got = config.fieldFilters![key](item);
        if (got === null || got === undefined) return false;
        if (String(got).toLowerCase() !== String(val).toLowerCase()) return false;
      }

      // custom predicates
      for (const key of customKeys) {
        const val = filters[key];
        if (!val || val === "all" || val === "") continue;
        if (!config.customPredicates![key](val, item)) return false;
      }

      return true;
    });
  }, [items, filters, config.fieldFilters, config.customPredicates, config.searchFields]);

  return { filters, setFilter, setAll, clearAll, activeCount, filtered };
}
