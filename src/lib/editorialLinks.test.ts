import { describe, expect, it } from "vitest";
import { createEditorialMatcher, type EditorialTarget } from "./editorialLinks";

const pool: EditorialTarget[] = [
  { label: "IIM Ahmedabad", url: "/college/iim-ahmedabad", kind: "colleges", aliases: [] },
  { label: "CAT", url: "/exam/cat", kind: "exams", aliases: [] },
  { label: "Career Launcher", url: "/institute/career-launcher", kind: "coachings", aliases: [] },
];
describe("editorial entity matching", () => {
  it("finds colleges, exams and coaching with exact destinations", () => {
    const matches = createEditorialMatcher(pool)("IIM Ahmedabad accepts CAT. Career Launcher prepares candidates.");
    expect(matches.map(m => m.target.url)).toEqual(pool.map(p => p.url));
  });
  it("does not link partial words or ordinary lowercase acronyms", () => {
    expect(createEditorialMatcher(pool)("cat, category, CATCH and IIM Ahmedabadx")).toEqual([]);
  });
  it("does not select an arbitrary branch for duplicate names", () => {
    const duplicate = { ...pool[2], url: "/institute/another-branch" };
    expect(createEditorialMatcher([...pool, duplicate])("Career Launcher")).toEqual([]);
  });
  it("handles whitespace, punctuation and case in full names", () => {
    expect(createEditorialMatcher(pool)("(iim   Ahmedabad), CAT.").map(m => m.text)).toEqual(["iim   Ahmedabad", "CAT"]);
  });
  it("prefers longest full names over overlapping short names", () => {
    expect(createEditorialMatcher([...pool, { label: "IIM", url: "/college/iim", kind: "colleges", aliases: [] }])("IIM Ahmedabad")[0]?.target.url).toBe("/college/iim-ahmedabad");
  });
});