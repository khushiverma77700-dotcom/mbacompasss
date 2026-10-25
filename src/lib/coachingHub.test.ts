import { expect, it } from "vitest";
import { matchesCoachingHub, matchesCoachingExam, coachingModes } from "./coachingHub";

it("matches regional aliases and rejects other states", () => {
  const hub = { path: "/coaching/bangalore", title: "", description: "", h1: "", city: "Bangalore", aliases: ["Bengaluru"], state: "Karnataka" };
  expect(matchesCoachingHub({ city: "Bengaluru", state: "Karnataka" }, hub)).toBe(true);
  expect(matchesCoachingHub({ city: "Bengaluru", state: "Delhi" }, hub)).toBe(false);
});
it("matches exam course names without CAT matching unrelated words or MAT", () => {
  expect(matchesCoachingExam({ courses: [{ name: "CAT Complete Course" }] }, "cat")).toBe(true);
  expect(matchesCoachingExam({ name: "Education Academy", courses: [{ name: "GMAT Prep" }] }, "mat")).toBe(false);
  expect(matchesCoachingExam({ name: "Education Academy" }, "cat")).toBe(false);
});
it("filters teaching modes and preserves existing alias mappings", () => {
  expect(coachingModes.classroom).toBe("Offline");
  expect(matchesCoachingHub({ mode: "Online" }, { path: "", title: "", description: "", h1: "", mode: "Offline" })).toBe(false);
});