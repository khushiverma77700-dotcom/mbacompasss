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

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = PAGE_SIZE,
): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data || [];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}
