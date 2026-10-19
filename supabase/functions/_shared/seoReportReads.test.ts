import { describe, it, expect } from "vitest";
import { readReportRows, getReportCache, setReportCache } from "./seoReportReads";

function database(total: number, fail = false) {
  let active = 0, peak = 0;
  const rows = Array.from({ length: total }, (_, id) => ({ id }));
  return {
    peak: () => peak,
    from: () => ({ select: () => ({ order: () => ({ range: (start: number, end: number) => ({
      abortSignal: async () => {
        active++; peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 1));
        active--;
        return { data: rows.slice(start, end + 1), error: fail ? { message: "timeout" } : null };
      },
    }) }) }) }),
  };
}

describe("admin report reads", () => {
  it("returns all 5938 pages in stable order with at most six in-flight reads", async () => {
    const db = database(5938);
    const rows = await readReportRows(db, "pages", "id", "id");
    expect(rows).toHaveLength(5938);
    expect(rows[5937].id).toBe(5937);
    expect(db.peak()).toBe(6);
  });
  it("continues past the first six batches without dropping keywords", async () => {
    const rows = await readReportRows(database(7210), "keywords", "id", "id");
    expect(rows).toHaveLength(7210);
    expect(new Set(rows.map((row) => row.id)).size).toBe(7210);
  });
  it("rejects database errors instead of presenting partial totals", async () => {
    await expect(readReportRows(database(5938, true), "pages", "id", "id")).rejects.toThrow("timeout");
  });
  it("does not silently report capped totals", async () => {
    await expect(readReportRows(database(20001), "pages", "id", "id")).rejects.toThrow("no partial totals");
  });
  it("keeps cached payloads separate by report action", () => {
    setReportCache("performance_report", { clicks: 7 });
    expect(getReportCache("performance_report")).toEqual({ clicks: 7 });
    expect(getReportCache("coverage_pulse")).toBeUndefined();
  });
});