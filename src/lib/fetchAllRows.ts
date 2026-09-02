/**
 * The Data API caps every response at 1000 rows. Any query that is meant to
 * return a whole table (colleges, institutes, links…) must page through with
 * `.range()` or newer records silently disappear from the UI.
 *
 * Usage:
 *   const rows = await fetchAllRows((from, to) =>
 *     supabase.from("colleges").select("id, name").order("name").range(from, to)
 *   );
 */
const PAGE_SIZE = 1000;

/** How many pages to request simultaneously — sequential paging was adding
 *  one full round-trip per 1000 rows (≈5 serial requests on colleges). */
const BATCH = 5;

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = PAGE_SIZE,
): Promise<T[]> {
  const all: T[] = [];
  let offset = 0;
  for (;;) {
    const batch = await Promise.all(
      Array.from({ length: BATCH }, (_, i) => {
        const from = offset + i * pageSize;
        return page(from, from + pageSize - 1);
      })
    );
    let reachedEnd = false;
    for (const { data, error } of batch) {
      if (error) throw new Error(error.message);
      const rows = data || [];
      all.push(...rows);
      if (rows.length < pageSize) reachedEnd = true;
    }
    if (reachedEnd) break;
    offset += BATCH * pageSize;
  }
  return all;
}
