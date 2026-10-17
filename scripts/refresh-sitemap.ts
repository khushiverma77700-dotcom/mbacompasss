// Fetches the existing image sitemap. Vite independently writes page sitemaps
// from the validated public prerender manifest.
//   - public/sitemap-images.xml image-only sitemap
// Also keeps the `Sitemap:` block in public/robots.txt pointing at both files.
//
// Runs via the `prebuild` npm hook. Fails soft — if a fetch errors, the existing
// file on disk is left untouched so a build can still ship.

import { writeFileSync, existsSync, statSync, readFileSync } from "fs";
import { resolve } from "path";

const FN_BASE = "https://mttoiqruzzxooveooldo.supabase.co/functions/v1";
const SITE_URL = "https://mbacompass.in";

const IMAGE_SITEMAP_OUT = "public/sitemap-images.xml";
const ROBOTS_OUT = "public/robots.txt";

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

async function writeSitemap(label: string, fnPath: string, outPath: string, minUrls: number) {
  const OUT = resolve(outPath);
  try {
    const previousCount = existsSync(OUT)
      ? (readFileSync(OUT, "utf8").match(/<url>/g) || []).length
      : 0;

    const xml = await fetchXml(label, `${FN_BASE}/${fnPath}`, minUrls, outPath);
    const urlCount = (xml.match(/<url>/g) || []).length;
    const imageCount = (xml.match(/<image:image>/g) || []).length;
    if (urlCount < minUrls) throw new Error(`Suspicious URL count: ${urlCount}`);

    writeFileSync(OUT, xml, "utf8");
    console.log(
      `[${label}] wrote ${outPath} — ${urlCount} URLs + ${imageCount} images (was ${previousCount}, ${(statSync(OUT).size / 1024).toFixed(1)} KB)`,
    );
  } catch (err) {
    console.warn(
      `[${label}] refresh failed, keeping existing ${outPath} — ${(err as Error).message}`,
    );
  }
}

// Rewrites the trailing `Sitemap:` directives so both sitemaps are always declared.
function syncRobots() {
  const OUT = resolve(ROBOTS_OUT);
  if (!existsSync(OUT)) {
    console.warn(`[robots] ${ROBOTS_OUT} missing — skipped`);
    return;
  }
  const wanted = [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/sitemap-images.xml`];
  const original = readFileSync(OUT, "utf8");
  const body = original
    .split(/\r?\n/)
    .filter((line) => !/^\s*sitemap\s*:/i.test(line) && !/^# Sitemaps for project domain/.test(line))
    .join("\n")
    .replace(/# Sitemaps for project domain\s*$/i, "")
    .trimEnd();

  const next = `${body}\n\n# Sitemaps for project domain (kept in sync by scripts/refresh-sitemap.ts)\n${wanted
    .map((u) => `Sitemap: ${u}`)
    .join("\n")}\n`;

  if (next === original) {
    console.log("[robots] already in sync");
    return;
  }
  writeFileSync(OUT, next, "utf8");
  console.log(`[robots] updated ${ROBOTS_OUT} — ${wanted.length} sitemap directives`);
}

async function main() {
  // The Vite build now writes the page sitemap from the exact public prerender
  // manifest; do not replace it with a separate legacy server inventory.
  await writeSitemap("sitemap-images", "serve-image-sitemap", IMAGE_SITEMAP_OUT, 1);
  syncRobots();
}

main();
