import { expect, it } from "vitest";
import { readSitemapInventory } from "./sitemapInventory";
it("counts URLs across every child sitemap instead of counting only the index", async () => {
  const files: Record<string, string> = {
    "/sitemap.xml": '<sitemapindex><sitemap><loc>https://mbacompass.in/sitemap-1.xml</loc></sitemap><sitemap><loc>https://mbacompass.in/sitemap-2.xml</loc></sitemap></sitemapindex>',
    "/sitemap-1.xml": '<urlset><url><loc>https://mbacompass.in/college/a</loc></url></urlset>',
    "/sitemap-2.xml": '<urlset><url><loc>https://mbacompass.in/colleges/by-state/gujarat</loc></url><url><loc>https://mbacompass.in/colleges/by-city/ahmedabad</loc></url></urlset>',
  };
  const result = await readSitemapInventory("https://mbacompass.in/sitemap.xml", async input => new Response(files[new URL(String(input)).pathname]));
  expect(result.urlCount).toBe(3);
  expect(result.fileCount).toBe(3);
});
it("fails on missing children rather than showing a partial total", async () => {
  await expect(readSitemapInventory("https://mbacompass.in/sitemap.xml", async input => String(input).includes("sitemap-1") ? new Response("", { status: 503 }) : new Response('<sitemapindex><sitemap><loc>https://mbacompass.in/sitemap-1.xml</loc></sitemap></sitemapindex>'))).rejects.toThrow("503");
});
it("rejects cross-host child fetches", async () => {
  await expect(readSitemapInventory("https://mbacompass.in/sitemap.xml", async () => new Response('<sitemapindex><sitemap><loc>https://dashboard.mbacompass.in/sitemap.xml</loc></sitemap></sitemapindex>'))).rejects.toThrow("Invalid sitemap child");
});