import { expect, it } from "vitest";
import { publicRequestRedirect } from "./publicRequestRedirect";

it("permanently redirects only www to apex while preserving path and query", () => {
  const response = publicRequestRedirect(new Request("https://www.mbacompass.in/college/iim-ahmedabad?ref=google"));
  expect(response?.status).toBe(301);
  expect(response?.headers.get("Location")).toBe("https://mbacompass.in/college/iim-ahmedabad?ref=google");
});
it("redirects exam and tool aliases before rendering with queries intact", () => {
  expect(publicRequestRedirect(new Request("https://mbacompass.in/exams/"))?.headers.get("Location")).toBe("https://mbacompass.in/exam");
  expect(publicRequestRedirect(new Request("https://mbacompass.in/profile-analyzer?source=google"))?.headers.get("Location")).toBe("https://mbacompass.in/tools/profile-analyzer?source=google");
});
it("preserves primary, dashboard, preview, regional and non-read requests", () => {
  for (const url of ["https://mbacompass.in/", "https://dashboard.mbacompass.in/student", "https://id-preview.lovable.app/exams", "https://mbacompass.in/colleges/by-city/delhi"])
    expect(publicRequestRedirect(new Request(url))).toBeUndefined();
  expect(publicRequestRedirect(new Request("https://www.mbacompass.in/api/public/callback", { method: "POST" }))).toBeUndefined();
});