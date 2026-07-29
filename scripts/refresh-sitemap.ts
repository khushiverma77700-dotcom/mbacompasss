// Fetches the live page sitemap and image sitemap, then writes one combined
// Google-readable sitemap to public/sitemap.xml. Search Console should only
// submit https://mbacompass.in/sitemap.xml.
//
// Runs via the `prebuild` npm hook. Fails soft — if the fetch errors, the existing
// public/sitemap.xml is left untouched so a build can still ship.

import { writeFileSync, existsSync, statSync, readFileSync } from "fs";
import { resolve } from "path";

const FN_BASE = "https://mttoiqruzzxooveooldo.supabase.co/functions/v1";

const SITEMAP_OUT = "public/sitemap.xml";
const IMAGE_FALLBACK = "public/sitemap-images.xml";

async function fetchXml(label: string, url: string, minUrls: number, fallbackPath?: string) {
  try {
    console.log(`[${label}] fetching ${url} ...`);
    const res = await fetch(`${url}?cb=${Date.now()}`, {
      headers: { "cache-control": "no-cache" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const count = (xml.match(/<url>/g) || []).length;
    if (count < minUrls) throw new Error(`Suspicious URL count: ${count}`);
    return xml;
  } catch (err) {
    if (fallbackPath && existsSync(resolve(fallbackPath))) {
      console.warn(
        `[${label}] fetch failed, using ${fallbackPath} — ${(err as Error).message}`,
      );
      return readFileSync(resolve(fallbackPath), "utf8");
    }
    throw err;
  }
}

function extractUrlBlocks(xml: string) {
  return Array.from(xml.matchAll(/<url>([\s\S]*?)<\/url>/g)).map((m) => m[1]);
}

function extractLoc(block: string) {
  return block.match(/<loc>([\s\S]*?)<\/loc>/)?.[1]?.trim() || null;
}

function mergePageAndImageSitemaps(pageXml: string, imageXml: string) {
  const byLoc = new Map<string, { body: string; images: string[] }>();

  for (const block of extractUrlBlocks(pageXml)) {
    const loc = extractLoc(block);
    if (!loc) continue;
    byLoc.set(loc, {
      body: block.replace(/\s*<image:image>[\s\S]*?<\/image:image>/g, "").trim(),
      images: [],
    });
  }

  for (const block of extractUrlBlocks(imageXml)) {
    const loc = extractLoc(block);
    if (!loc) continue;
    const images = Array.from(block.matchAll(/<image:image>[\s\S]*?<\/image:image>/g)).map((m) => m[0]);
    if (images.length === 0) continue;
    const current = byLoc.get(loc) ?? { body: `<loc>${loc}</loc>`, images: [] };
    const seen = new Set(current.images);
    for (const image of images) {
      if (!seen.has(image)) {
        current.images.push(image);
        seen.add(image);
      }
    }
    byLoc.set(loc, current);
  }

  const urls = Array.from(byLoc.values()).map(({ body, images }) =>
    `  <url>\n    ${body.replace(/\n/g, "\n    ")}\n    ${images.join("\n    ")}\n  </url>`
      .replace(/\n\s+\n/g, "\n"),
  );

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join("\n")}\n</urlset>`;
}

async function refreshCombinedSitemap() {
  const OUT = resolve(SITEMAP_OUT);
  try {
    const previousCount = existsSync(OUT)
      ? (readFileSync(OUT, "utf8").match(/<url>/g) || []).length
      : 0;

    const [pageXml, imageXml] = await Promise.all([
      fetchXml("pages", `${FN_BASE}/serve-sitemap`, 50, SITEMAP_OUT),
      fetchXml("images", `${FN_BASE}/serve-image-sitemap`, 1, IMAGE_FALLBACK),
    ]);

    const merged = mergePageAndImageSitemaps(pageXml, imageXml);
    const urlCount = (merged.match(/<url>/g) || []).length;
    const imageCount = (merged.match(/<image:image>/g) || []).length;
    if (urlCount < 50) throw new Error(`Suspicious merged URL count: ${urlCount}`);

    writeFileSync(OUT, merged, "utf8");
    console.log(
      `[sitemap] wrote ${OUT} — ${urlCount} URLs + ${imageCount} images (was ${previousCount}, ${(statSync(OUT).size / 1024).toFixed(1)} KB)`,
    );
  } catch (err) {
    console.warn(
      `[sitemap] refresh failed, keeping existing ${SITEMAP_OUT} — ${(err as Error).message}`,
    );
  }
}

refreshCombinedSitemap();
