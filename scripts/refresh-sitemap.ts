// Fetches the live sitemap (page URLs + image entries) and writes it to
// public/sitemap.xml. Search Console should only submit this one URL.
//
// Runs via the `prebuild` npm hook. Fails soft — if the fetch errors, the existing
// public/sitemap.xml is left untouched so a build can still ship.

import { writeFileSync, existsSync, statSync, readFileSync } from "fs";
import { resolve } from "path";

const FN_BASE = "https://mttoiqruzzxooveooldo.supabase.co/functions/v1";

const SITEMAP_OUT = "public/sitemap.xml";

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

async function refreshCombinedSitemap() {
  const OUT = resolve(SITEMAP_OUT);
  try {
    const previousCount = existsSync(OUT)
      ? (readFileSync(OUT, "utf8").match(/<url>/g) || []).length
      : 0;

    const merged = await fetchXml("sitemap", `${FN_BASE}/serve-sitemap`, 50, SITEMAP_OUT);
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
