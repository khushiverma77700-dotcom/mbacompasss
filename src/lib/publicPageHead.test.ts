import { expect, it } from "vitest";
import { publicPageHead } from "./publicPageHead";

it("keeps public search titles under 60 and descriptions under 155 characters", () => {
  const result = publicPageHead("/exam/cat", "CAT Entrance Exam ".repeat(10), "Exam registration information ".repeat(20));
  const title = result.meta.find((entry) => "title" in entry);
  const description = result.meta.find((entry) => "name" in entry && entry.name === "description");
  expect(title && "title" in title ? title.title.length : 1000).toBeLessThan(60);
  expect(description && "content" in description ? description.content.length : 1000).toBeLessThan(155);
  expect(result.links[0].href).toBe("https://mbacompass.in/exam/cat");
});