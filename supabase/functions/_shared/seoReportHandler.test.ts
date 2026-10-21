import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { transform } from "esbuild";
import { readReportRows } from "./seoReportReads";

async function handler(options: { missingProperty?: boolean; syncError?: string; source?: { last_error: string | null; last_sync_at: string | null } } = {}) {
  let serve: ((req: Request) => Promise<Response>) | undefined;
  let refreshStarted = false;
  let release: ((rows: unknown[]) => void) | undefined;
  const provider = new Promise<unknown[]>((resolve) => { release = resolve; });
  const background: Promise<unknown>[] = [];
  const writes: string[] = [];
  const source = options.source ?? { last_error: null, last_sync_at: null };
  const cache = new Map<string, unknown>();
  const pages = Array.from({ length: 5938 }, (_, id) => ({ id, path: `/college/${id}`, clicks: 1, impressions: 10, prev_clicks: 0, title: "College" }));
  const keywords = Array.from({ length: 2168 }, (_, id) => ({ id, keyword: `keyword ${id}`, current_position: 8, previous_position: 12 }));
  const daily = [{ captured_on: "2026-10-18", clicks: 7, impressions: 70, ctr: 0.1, avg_position: 8 }];
  const sb = { from: (table: string) => {
    let data = table === "seo_intel_pages" ? pages : table === "seo_intel_keywords" ? keywords : table === "seo_gsc_daily" ? daily : [];
    const chain: any = {
      select: () => chain, order: () => chain, eq: () => chain, limit: (n: number) => { data = data.slice(0, n); return chain; },
      range: (a: number, b: number) => { data = data.slice(a, b + 1); return chain; },
      abortSignal: () => chain,
      maybeSingle: async () => ({ data: table === "seo_intel_sources" ? source : { captured_on: "2026-10-18", synced_at: "2026-01-01" }, error: null }),
      upsert: async () => { writes.push(table); return { error: null }; },
      then: (resolve: (r: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve),
    };
    return chain;
  } };
  const handlerSource = readFileSync(new URL("../seo-intel-control/index.ts", import.meta.url), "utf8").replace(/^import[\s\S]*?;\n/gm, "");
  const js = await transform(handlerSource, { loader: "ts", format: "cjs" });
  runInNewContext(js.code, {
    Deno: { serve: (fn: typeof serve) => { serve = fn; }, env: { get: () => undefined } },
    EdgeRuntime: { waitUntil: (p: Promise<unknown>) => background.push(p) },
    requireAdmin: async () => null,
    admin: () => sb, loadIntelSettings: async () => ({ gsc_site_url: options.missingProperty ? null : "https://mbacompass.in" }),
    cors: {}, json: (body: unknown) => Response.json(body),
    getReportCache: (key: string) => cache.get(key), setReportCache: (key: string, body: unknown) => cache.set(key, body),
    readReportRows, gscConfigured: () => true,
    resolveGscSite: async () => ({ siteUrl: options.missingProperty ? null : "https://mbacompass.in" }),
    gscDailyMetrics: () => { refreshStarted = true; return options.syncError ? Promise.reject(new Error(options.syncError)) : provider; },
    nowIso: () => new Date().toISOString(), markSource: async (_sb: unknown, key: string, patch: any) => {
      expect(key).toBe("search_console");
      Object.assign(source, patch);
    }, logActivity: async () => {},
    Date, console, atob,
  });
  const invoke = async (action: string, force = true) => {
    if (!serve) throw new Error("Handler not registered");
    const response = await serve(new Request("https://example.test", { method: "POST", body: JSON.stringify({ action, force }) }));
    expect(response.status).toBe(200);
    return response.json();
  };
  return { invoke, source, refreshStarted: () => refreshStarted, writes, finish: async () => { release?.([{ date: "2026-10-18", clicks: 7, impressions: 70, ctr: .1, position: 8 }]); await Promise.all(background); } };
}

describe("deployed admin report handler contract", () => {
  it("keeps an expired-connection error visible on a cached report and after a worker restart", async () => {
    const h = await handler({ syncError: "Search Console connection expired" });
    await h.invoke("performance_report");
    await h.finish();
    expect(h.source.last_error).toBe("Search Console connection expired");
    const cached = await h.invoke("performance_report", false);
    expect(cached.sync.error).toBe("Search Console connection expired");
    const restarted = await handler({ source: h.source });
    const report = await restarted.invoke("performance_report", false);
    expect(report.sync.error).toBe("Search Console connection expired");
    expect(report.overall.total_clicks).toBe(7);
    await restarted.finish();
    const recovered = await restarted.invoke("performance_report", false);
    expect(recovered.sync.error).toBeNull();
    await restarted.finish();
  });
  it("reports a missing property instead of silently returning old numbers", async () => {
    const h = await handler({ missingProperty: true });
    const report = await h.invoke("performance_report");
    await h.finish();
    expect(report.sync.error).toBe("Search Console property is not selected yet.");
    expect(h.source.last_error).toBe("Search Console property is not selected yet.");
    expect(h.writes).toEqual([]);
  });
  it("responds from stored history while Google is still pending and writes only daily metrics afterwards", async () => {
    const h = await handler();
    const report = await h.invoke("performance_report");
    expect(h.refreshStarted()).toBe(true);
    expect(report.overall.total_clicks).toBe(7);
    expect(report.sync.queued).toBe(true);
    expect(h.writes).toEqual([]);
    await h.finish();
    expect(h.writes).toEqual(["seo_gsc_daily"]);
  });
  it("coverage includes every tracked page and keyword without changing settings or articles", async () => {
    const h = await handler();
    const report = await h.invoke("coverage_pulse");
    expect(report.totals.pages).toBe(5938);
    expect(report.totals.keywords).toBe(2168);
    expect(h.writes).toEqual([]);
  });
  it("wins includes complete inventory counts without content writes", async () => {
    const h = await handler();
    const report = await h.invoke("wins_report");
    expect(report.totals.pages_tracked).toBe(5938);
    expect(report.totals.keywords_tracked).toBe(2168);
    expect(report.page_wins).toHaveLength(60);
    expect(h.writes).toEqual([]);
  });
});