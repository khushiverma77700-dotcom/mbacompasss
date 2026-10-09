import { describe, expect, it } from "vitest";
import { countdownParts, deadlineDays, deadlineTimestamp, compareRecommendations, reorderRecommendations } from "./applicationDeadline";

describe("application deadlines", () => {
  it("keeps a date-only deadline open through the end of its IST day", () => {
    expect(deadlineTimestamp("2026-10-09")).toBe(Date.parse("2026-10-09T18:29:59.999Z"));
    expect(countdownParts("2026-10-09", Date.parse("2026-10-09T17:26:00Z"))?.expired).toBe(false);
    expect(countdownParts("2026-10-09", Date.parse("2026-10-09T18:30:00Z"))?.expired).toBe(true);
  });
  it("changes day labels at IST midnight", () => {
    expect(deadlineDays("2026-10-10", Date.parse("2026-10-09T18:29:00Z"))).toBe(1);
    expect(deadlineDays("2026-10-10", Date.parse("2026-10-09T18:30:00Z"))).toBe(0);
  });
  it("counts seconds down and never goes negative", () => {
    const target = "2026-10-09T18:30:00Z";
    expect(countdownParts(target, Date.parse("2026-10-09T18:29:58Z"))?.seconds).toBe(2);
    expect(countdownParts(target, Date.parse("2026-10-09T18:29:59Z"))?.seconds).toBe(1);
    expect(countdownParts(target, Date.parse("2026-10-09T18:31:00Z"))?.seconds).toBe(0);
  });
  it("does not invent a countdown for an absent date", () => {
    expect(countdownParts(null, Date.now())).toBe(null);
    expect(deadlineTimestamp("invalid")).toBe(null);
  });
  it("orders recommendations by saved priority with a consistent name tie-break", () => {
    const rows = [{ name: "Z", recommendation_priority: 2 }, { name: "B", recommendation_priority: 1 }, { name: "A", recommendation_priority: 1 }];
    expect(rows.sort(compareRecommendations).map((row) => row.name)).toEqual(["A", "B", "Z"]);
  });
  it("moves only adjacent picks even with duplicate or nonsequential priorities", () => {
    const rows = [{ id: "a", recommendation_priority: 0 }, { id: "b", recommendation_priority: 0 }, { id: "c", recommendation_priority: 99 }];
    expect(reorderRecommendations(rows, 2, -1).map((row) => row.id)).toEqual(["a", "c", "b"]);
    expect(reorderRecommendations(rows, 0, -1)).toEqual(rows);
    expect(rows.map((row) => row.id)).toEqual(["a", "b", "c"]);
  });
});