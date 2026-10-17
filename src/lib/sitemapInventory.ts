/** Follow same-origin sitemap indexes; never trust XML to choose an external fetch target. */
export async function readSitemapInventory(rootUrl: string, fetcher: typeof fetch = fetch) {
  const origin = new URL(rootUrl).origin;
  const seen = new Set<string>();
  const urls = new Set<string>();
  let imageCount = 0;
  let bytes = 0;
  let rootXml = "";
  const decode = (text: string) => text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  async function visit(url: string) {
    const parsed = new URL(url);
    if ((parsed.origin !== origin && parsed.origin !== "https://mbacompass.in") || !/^\/sitemap(?:-[a-z0-9-]+)?\.xml$/.test(parsed.pathname)) throw new Error("Invalid sitemap child URL");
    // Generated children use the canonical host; inspect the current deployment's files.
    const local = new URL(parsed.pathname, origin);
    parsed.search = "";
    if (seen.has(local.href)) return;
    seen.add(local.href);
    if (seen.size > 1000) throw new Error("Too many sitemap files");
    const response = await fetcher(`${local.href}?cb=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Sitemap returned HTTP ${response.status}`);
    const xml = await response.text();
    if (!rootXml) rootXml = xml;
    bytes += new TextEncoder().encode(xml).byteLength;
    if (/<sitemapindex[\s>]/.test(xml) && /<\/sitemapindex>/.test(xml)) {
      const children = [...xml.matchAll(/<sitemap>\s*<loc>([^<]+)<\/loc>/g)].map(match => decode(match[1]));
      if (!children.length) throw new Error("Empty sitemap index");
      // Small batches avoid overwhelming the host for larger indexes.
      for (let i = 0; i < children.length; i += 4) await Promise.all(children.slice(i, i + 4).map(visit));
    } else if (/<urlset[\s>]/.test(xml) && /<\/urlset>/.test(xml)) {
      for (const match of xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>/g)) urls.add(decode(match[1]));
      imageCount += (xml.match(/<image:image>/g) || []).length;
    } else throw new Error("Invalid sitemap XML");
  }
  await visit(rootUrl);
  return { xml: rootXml, urlCount: urls.size, imageCount, fileCount: seen.size, bytes, urls: [...urls] };
}