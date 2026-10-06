import { describe, expect, it, vi } from "vitest";
vi.mock("./firecrawlGateway.ts", () => ({
  firecrawlConfigured: () => true,
  firecrawlScrape: vi.fn(async () => ({ data: { markdown: "Reference background content. ".repeat(100), metadata: { title: "Official report", dateModified: "2026-09-20" } } })),
  firecrawlSearch: vi.fn(async () => [{ url: "https://public.example/report", title: "New report", markdown: "Latest published evidence. ".repeat(20), metadata: { datePublished: "2026-09-22" } }]),
}));
import { researchReferences, referenceGroundingRules, referenceReport } from "./referenceResearch.ts";
import { firecrawlSearch } from "./firecrawlGateway.ts";

describe("reference research", () => {
  it("searches gaps for changing topics even when supplied pages are long", async () => {
    const result = await researchReferences({ urls: ["https://official.example/fees"], topic: "Current MBA fees" });
    expect(result.sources[0].kind).toBe("primary");
    expect(result.supplementalUsed).toBe(true);
    expect(firecrawlSearch).toHaveBeenCalledWith(expect.objectContaining({ tbs: "qdr:m2" }));
    expect(result.sources[0].updatedAt).toBe("2026-09-20T00:00:00.000Z");
    expect(referenceReport(result)?.sources[0].updatedAt).toBe(result.sources[0].updatedAt);
    expect(referenceGroundingRules(result)).toContain("last 60 days");
  });
});