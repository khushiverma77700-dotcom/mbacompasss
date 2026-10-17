import { describe, it, expect } from "vitest";
import { buildTracker } from "./sitemapTracker";

const req = ["a", "b"];

describe("sitemap tracker", () => {
  it("flags a past day with incomplete submissions as missed", () => {
    const t = buildTracker([{ sitemap_url: "a", submitted_on: "2026-10-15" }], req, "2026-10-16");
    expect(t.days.find(d => d.date === "2026-10-15")?.status).toBe("missed");
    expect(t.missedDays).toBe(1);
  });
  it("counts a day complete only when every sitemap was submitted", () => {
    const t = buildTracker([{ sitemap_url: "a", submitted_on: "2026-10-15" }, { sitemap_url: "b", submitted_on: "2026-10-15" }], req, "2026-10-15");
    expect(t.completedDays).toBe(1);
    expect(t.pendingToday).toEqual([]);
  });
  it("keeps today pending, not missed, and lists what remains", () => {
    const t = buildTracker([{ sitemap_url: "a", submitted_on: "2026-10-17" }], req, "2026-10-17");
    expect(t.days[0].status).toBe("pending");
    expect(t.pendingToday).toEqual(["b"]);
  });
  it("flags fully skipped days between submissions", () => {
    const s = ["2026-10-10", "2026-10-13"].flatMap(d => req.map(u => ({ sitemap_url: u, submitted_on: d })));
    const t = buildTracker(s, req, "2026-10-13");
    expect(t.missedDays).toBe(2);
    expect(t.completedDays).toBe(2);
    expect(t.overallProgress).toBe(50);
  });
});
