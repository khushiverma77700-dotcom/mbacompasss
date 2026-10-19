// Complete, ordered report reads with bounded concurrency and a request deadline.
export async function readReportRows(sb: any, table: string, columns: string, order: string, maxRows = 20000) {
  const rows: any[] = [];
  const deadline = Date.now() + 18000;
  for (let offset = 0; offset < maxRows; offset += 6000) {
    const starts = Array.from({ length: Math.min(6, Math.ceil((maxRows - offset) / 1000)) }, (_, i) => offset + i * 1000);
    const pages = await Promise.all(starts.map(async (start) => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new Error("Report data took too long to load. Please retry.");
      const { data, error } = await sb.from(table).select(columns).order(order, { ascending: true })
        .range(start, Math.min(start + 999, maxRows - 1)).abortSignal(AbortSignal.timeout(Math.min(12000, remaining)));
      if (error) throw new Error(`Report read failed (${table}): ${error.message}`);
      return data ?? [];
    }));
    for (const page of pages) {
      rows.push(...page);
      if (page.length < 1000) return rows;
    }
  }
  throw new Error("Report inventory exceeds the supported read window; no partial totals were returned.");
}

const reports = new Map<string, { at: number; body: unknown }>();
export function getReportCache(action: string) {
  const entry = reports.get(action);
  return entry && Date.now() - entry.at < 30000 ? entry.body : undefined;
}
export function setReportCache(action: string, body: unknown) {
  reports.set(action, { at: Date.now(), body });
}