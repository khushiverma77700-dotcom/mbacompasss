import { describe, expect, it } from "vitest";
import { PUBLIC_STATIC_PATHS, selectPrerenderPaths } from "./publicPrerender";

describe("public prerender boundaries", () => {
  it("never emits student, admin, auth or query-parameter pages", () => {
    const paths = selectPrerenderPaths(["/admin", "/student", "/auth", "/college/iim-ahmedabad", "/college/foo?user=1"]);
    expect(paths).toEqual([...PUBLIC_STATIC_PATHS, "/college/iim-ahmedabad"]);
  });
  it("caps generated files while retaining all requested static routes", () => {
    const limit = PUBLIC_STATIC_PATHS.length + 1;
    const paths = selectPrerenderPaths(["/college/a", "/college/b"], limit);
    expect(paths).toHaveLength(limit);
    expect(paths[PUBLIC_STATIC_PATHS.length]).toBe("/college/a");
  });
});