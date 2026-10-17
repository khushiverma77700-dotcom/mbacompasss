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
      expect(pages).toHaveLength(PUBLIC_STATIC_PATHS.length + 1000);
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
});