export const DIRECTORY_PAGE_SIZE = 20;
export function directoryPage(value: unknown): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 && page <= 10000 ? page : 1;
}
export function directoryPageUrl(path: string, page: number, search?: URLSearchParams): string {
  const params = new URLSearchParams(search);
  if (page > 1) params.set("page", String(page)); else params.delete("page");
  return `${path}${params.size ? `?${params}` : ""}`;
}
export function pageRows<T>(rows: T[], page: number): T[] {
  return rows.slice((page - 1) * DIRECTORY_PAGE_SIZE, page * DIRECTORY_PAGE_SIZE);
}