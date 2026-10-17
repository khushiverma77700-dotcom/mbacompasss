import { expect, it } from "vitest";
import { buildSitemaps } from "./buildSitemap";
it("uses an index only above 1,000 URLs and omits invented modification dates", () => {
  const pages = Array.from({ length: 1000 }, (_, i) => ({ path: `/college/school-${i}` }));
  expect(buildSitemaps(pages)["sitemap.xml"]).toContain("<urlset");
  const files = buildSitemaps([...pages, { path: "/article/test", lastmod: "2026-09-20" }]);
  expect(files["sitemap.xml"]).toContain("<sitemapindex");
  expect(files["sitemap-2.xml"]).toContain("<lastmod>2026-09-20</lastmod>");
  expect(files["sitemap-1.xml"]).not.toContain("lastmod");
  expect(files["sitemap.xml"]).not.toContain("lastmod");
});
it("rejects private and filtered sitemap entries", () => {
  for (const path of ["/student", "/admin/a", "/auth", "/college/a?q=test", "//external.test"]) expect(() => buildSitemaps([{ path }])).toThrow();
});