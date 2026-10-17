import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
export type PublicPage = { path: string; lastmod?: string };
export const SITEMAP_ORIGIN = "https://mbacompass.in";
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c] ?? c);
export function buildSitemaps(pages: PublicPage[]): Record<string, string> {
  const unique = [...new Map(pages.map((page) => [page.path, page])).values()];
  for (const page of unique) {
    if (!page.path.startsWith("/") || page.path.startsWith("//") || /[?#]/.test(page.path) || /^\/(auth|admin|student|api|demo)(\/|$)/.test(page.path)) throw new Error("Non-public sitemap path");
  }
  const xml = '<?xml version="1.0" encoding="UTF-8"?>';
  const urlset = (rows: PublicPage[]) => `${xml}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows.map((r) => `<url><loc>${escape(SITEMAP_ORIGIN + r.path)}</loc>${r.lastmod && /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(r.lastmod) && Number.isFinite(Date.parse(r.lastmod)) ? `<lastmod>${escape(r.lastmod)}</lastmod>` : ""}</url>`).join("")}</urlset>`;
  if (unique.length <= 1000) return { "sitemap.xml": urlset(unique) };
  const files: Record<string, string> = {};
  for (let i = 0; i < unique.length; i += 1000) files[`sitemap-${i / 1000 + 1}.xml`] = urlset(unique.slice(i, i + 1000));
  files["sitemap.xml"] = `${xml}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.keys(files).map((name) => `<sitemap><loc>${SITEMAP_ORIGIN}/${name}</loc></sitemap>`).join("")}</sitemapindex>`;
  return files;
}
export function writeBuildSitemaps(pages: PublicPage[], directory = "public") {
  const output = resolve(directory);
  mkdirSync(output, { recursive: true });
  const files = buildSitemaps(pages);
  for (const name of readdirSync(output)) if (/^sitemap-\d+\.xml$/.test(name) && !(name in files)) unlinkSync(resolve(output, name));
  for (const [name, xml] of Object.entries(files)) writeFileSync(resolve(output, name), xml);
  console.info(`[sitemap] ${pages.length} prerendered URLs, ${Object.keys(files).length} files`);
}