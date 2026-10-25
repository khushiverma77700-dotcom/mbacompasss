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
it("canonicalises filtered and paginated URLs to the clean tool page", () => {
  expect(publicPageHead("/cat-score-calculator?q=cat&page=2", "CAT Calculator", "CAT scores").links[0].href).toBe("https://mbacompass.in/tools/cat-score-calculator");
});
it("keeps genuine directory result pages distinct while removing presentation variants", () => {
  for (const path of ["/colleges", "/coaching", "/colleges/by-city/delhi", "/colleges/by-state/gujarat", "/colleges/type/private", "/colleges/by-exam/cat"])
    expect(publicPageHead(`${path}?page=2&sort=fees`, "Directory", "Results").links[0].href).toBe(`https://mbacompass.in${path}?page=2`);
  expect(publicPageHead("/colleges?page=1", "Directory", "Results").links[0].href).toBe("https://mbacompass.in/colleges");
});