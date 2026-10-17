import { expect, it } from "vitest";
import { publicPath } from "./publicPaths";
it("standardises exam and tool aliases while retaining legitimate LMS and regional links", () => {
  expect(publicPath("/exams/cat?q=x")).toBe("/exam/cat?q=x");
  expect(publicPath("/tools/predictor")).toBe("/tools/college-shortlister");
  expect(publicPath("/profile-analyzer")).toBe("/tools/profile-analyzer");
  expect(publicPath("/student")).toBe("/student");
  expect(publicPath("/colleges/mumbai")).toBe("/colleges/mumbai");
  expect(publicPath("/exams?q=cat#dates")).toBe("/exam?q=cat#dates");
});