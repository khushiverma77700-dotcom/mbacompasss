// Fetches the live sitemap (built from the DB by the serve-sitemap edge function)
// and writes it to public/sitemap.xml so the deployed Hostinger static file stays
// in sync with the database on every publish/build.
//
// Runs via the `prebuild` npm hook. Fails soft — if the fetch errors, the existing
// public/sitemap.xml is left untouched so a build can still ship.

import { writeFileSync, existsSync, statSync, readFileSync } from "fs";
import { resolve } from "path";

const FN_BASE = "https://mttoiqruzzxooveooldo.supabase.co/functions/v1";

async function refresh(
  label: string,
  url: string,
  outPath: string,
  minUrls: number,
) {
  const OUT = resolve(outPath);
  try {
    console.log(`[${label}] fetching ${url} ...`);
    const res = await fetch(`${url}?cb=${Date.now()}`, {
      headers: { "cache-control": "no-cache" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const count = (xml.match(/<url>/g) || []).length;
    if (count < minUrls) throw new Error(`Suspicious URL count: ${count}`);

    const prevCount = existsSync(OUT)
      ? (readFileSync(OUT, "utf8").match(/<url>/g) || []).length
      : 0;

    writeFileSync(OUT, xml, "utf8");
    console.log(
      `[${label}] wrote ${OUT} — ${count} URLs (was ${prevCount}, ${(statSync(OUT).size / 1024).toFixed(1)} KB)`,
    );
  } catch (err) {
    console.warn(
      `[${label}] refresh failed, keeping existing ${outPath} — ${(err as Error).message}`,
    );
  }
}

(async () => {
  await refresh("sitemap", `${FN_BASE}/serve-sitemap`, "public/sitemap.xml", 50);
  await refresh(
    "image-sitemap",
    `${FN_BASE}/serve-image-sitemap`,
    "public/sitemap-images.xml",
    1,
  );
})();
