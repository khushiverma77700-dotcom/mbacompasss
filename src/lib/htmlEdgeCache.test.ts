import { describe, expect, it } from "vitest";
import { cacheKeyFor, isCacheableRequest, isCacheableResponse } from "./htmlEdgeCache";

const req = (path: string, init?: RequestInit) => new Request(`https://mbacompass.in${path}`, init);

describe("shared HTML cache eligibility", () => {
  it("caches public pages", () => {
    expect(isCacheableRequest(req("/"))).toBe(true);
    expect(isCacheableRequest(req("/colleges"))).toBe(true);
    expect(isCacheableRequest(req("/article/welingkar-mumbai-fees"))).toBe(true);
  });

  it("never caches admin, student, sign-in or server calls", () => {
    for (const p of ["/admin", "/admin/articles", "/student", "/student/mocks", "/auth", "/api/public/x", "/_serverFn/abc", "/mocks/result/1", "/report/9"]) {
      expect(isCacheableRequest(req(p))).toBe(false);
    }
  });

  it("never caches non-GET, signed or preview requests, or files", () => {
    expect(isCacheableRequest(req("/", { method: "POST" }))).toBe(false);
    expect(isCacheableRequest(req("/", { headers: { authorization: "Bearer x" } }))).toBe(false);
    expect(isCacheableRequest(req("/?ad_preview=1"))).toBe(false);
    expect(isCacheableRequest(req("/sitemap.xml"))).toBe(false);
  });

  it("only stores successful cookie-free HTML", () => {
    const html = { "content-type": "text/html; charset=utf-8" };
    expect(isCacheableResponse(new Response("x", { status: 200, headers: html }))).toBe(true);
    expect(isCacheableResponse(new Response("x", { status: 404, headers: html }))).toBe(false);
    expect(isCacheableResponse(new Response("x", { status: 200, headers: { ...html, "set-cookie": "a=1" } }))).toBe(false);
    expect(isCacheableResponse(new Response("{}", { status: 200, headers: { "content-type": "application/json" } }))).toBe(false);
  });

  it("keeps the main site and dashboard domain apart", () => {
    expect(cacheKeyFor(req("/"))).not.toBe(cacheKeyFor(new Request("https://dashboard.mbacompass.in/")));
  });
});
