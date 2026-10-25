import { expect, it } from "vitest";
import { directoryPage, directoryPageUrl, pageRows } from "./directoryPagination";
it("returns distinct twenty-record directory pages", () => {
  const rows = Array.from({ length: 45 }, (_, i) => i + 1);
  expect(pageRows(rows, 1)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  expect(pageRows(rows, 2)).toEqual(Array.from({ length: 20 }, (_, i) => i + 21));
  expect(pageRows(rows, 3)).toEqual([41, 42, 43, 44, 45]);
});
it("rejects invalid page values", () => {
  for (const value of [0, -1, 1.2, "bad", Infinity, 10001]) expect(directoryPage(value)).toBe(1);
  expect(directoryPage("2")).toBe(2);
});
it("preserves filters in navigation and removes the first-page parameter", () => {
  expect(directoryPageUrl("/colleges", 2, new URLSearchParams("city=Delhi"))).toBe("/colleges?city=Delhi&page=2");
  expect(directoryPageUrl("/colleges", 1, new URLSearchParams("page=2"))).toBe("/colleges");
});