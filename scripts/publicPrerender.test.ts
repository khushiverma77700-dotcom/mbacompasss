import { describe, expect, it, vi } from "vitest";
import { PUBLIC_STATIC_PATHS, selectPrerenderPaths, enumeratePublicPages } from "./publicPrerender";

describe("public prerender boundaries", () => {
  it("never emits student, admin, auth or query-parameter pages", () => {
    const paths = selectPrerenderPaths(["/admin", "/student", "/auth", "/college/iim-ahmedabad", "/college/foo?user=1"]);
    expect(paths).toEqual([...PUBLIC_STATIC_PATHS, "/college/iim-ahmedabad"]);
  });
  it("paginates public collections and fails rather than shipping a partial later batch", async () => {
    const calls: string[] = [];
    const mock = vi.fn(async (input: string, init?: RequestInit) => {
      calls.push(`${new URL(input).pathname}:${new Headers(init?.headers).get("Range")}`);
      if (input.includes("/colleges?") && new Headers(init?.headers).get("Range") === "0-999") return new Response(JSON.stringify(Array.from({ length: 1000 }, (_, i) => ({ slug: `college-${i}`, updated_at: "2026-09-01" }))));
      return new Response("[]");
    });
    vi.stubGlobal("fetch", mock);
    try {
      const pages = await enumeratePublicPages("https://public.test", "public-key");
      expect(pages.filter(page => page.path.startsWith("/college/"))).toHaveLength(1000);
      expect(calls).toContain("/rest/v1/colleges:1000-1999");
      mock.mockImplementation(async (input: string, init?: RequestInit) => {
        if (input.includes("/colleges?")) return new Response(new Headers(init?.headers).get("Range") === "0-999" ? JSON.stringify(Array.from({ length: 1000 }, (_, i) => ({ slug: `college-${i}` }))) : "failure", { status: new Headers(init?.headers).get("Range") === "0-999" ? 200 : 503 });
        return new Response("[]");
      });
      await expect(enumeratePublicPages("https://public.test", "public-key")).rejects.toThrow("HTTP 503");
    } finally { vi.unstubAllGlobals(); }
  });
  it("caps generated files while retaining all requested static routes", () => {
    const limit = PUBLIC_STATIC_PATHS.length + 1;
    const paths = selectPrerenderPaths(["/college/a", "/college/b"], limit);
    expect(paths).toHaveLength(limit);
    expect(paths[PUBLIC_STATIC_PATHS.length]).toBe("/college/a");
  });
  it("includes all city/state/filter and published application URLs independently of the prerender cap", async () => {
    vi.stubGlobal("fetch", async (input: string) => {
      const table = new URL(input).pathname.split("/").pop();
      const data = table === "colleges" ? Array.from({ length: 900 }, (_, i) => ({ slug: `college-${i}`, name: `College ${i}`, city: `City ${i}`, state: "Gujarat", updated_at: "2026-09-01" })) : table === "application_trackers" ? [{ slug: "iim-ahmedabad", name: "IIM Ahmedabad" }] : table === "institutes" ? [{ id: "inst", name: "CAT Academy", slug: "cat-academy" }] : table === "courses" ? [{ id: "course", name: "CAT 2026", institute_id: null }] : table === "institute_courses" ? [{ institute_id: "inst", course_id: "course" }] : [];
      return new Response(JSON.stringify(data));
    });
    try {
      const pages = await enumeratePublicPages("https://public.test", "public-key");
      expect(pages.filter(page => page.path.startsWith("/college/"))).toHaveLength(900);
      expect(pages.filter(page => page.path.startsWith("/colleges/by-city/"))).toHaveLength(900);
      expect(pages).toContainEqual({ path: "/colleges/by-state/gujarat" });
      expect(pages).toContainEqual({ path: "/colleges/type/iim" });
      expect(pages).toContainEqual({ path: "/mba-application/college/iim-ahmedabad" });
      expect(pages).toContainEqual({ path: "/institute/cat-academy/course/cat-2026" });
      expect(pages.some(page => /dashboard|student|\?/.test(page.path))).toBe(false);
      expect(selectPrerenderPaths(pages.map(page => page.path), PUBLIC_STATIC_PATHS.length + 1)).toHaveLength(PUBLIC_STATIC_PATHS.length + 1);
    } finally { vi.unstubAllGlobals(); }
  });
});