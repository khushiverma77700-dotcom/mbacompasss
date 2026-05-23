// Fetches the live sitemap (built from the DB by the serve-sitemap edge function)
// and writes it to public/sitemap.xml so the deployed Hostinger static file stays
// in sync with the database on every publish/build.
//
// Runs via the `prebuild` npm hook. Fails soft — if the fetch errors, the existing
// public/sitemap.xml is left untouched so a build can still ship.

import { writeFileSync, existsSync, statSync } from "fs";
import { resolve } from "path";

const SITEMAP_URL =
  "https://mttoiqruzzxooveooldo.supabase.co/functions/v1/serve-sitemap";
const OUT = resolve("public/sitemap.xml");

(async () => {
  try {
    console.log(`[sitemap] fetching ${SITEMAP_URL} ...`);
    const res = await fetch(`${SITEMAP_URL}?cb=${Date.now()}`, {
      headers: { "cache-control": "no-cache" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    const count = (xml.match(/<url>/g) || []).length;
    if (count < 50) throw new Error(`Suspicious URL count: ${count}`);

    const prevCount = existsSync(OUT)
      ? ((require("fs").readFileSync(OUT, "utf8") as string).match(/<url>/g) || []).length
      : 0;

    writeFileSync(OUT, xml, "utf8");
    console.log(
      `[sitemap] wrote ${OUT} — ${count} URLs (was ${prevCount}, ${(statSync(OUT).size / 1024).toFixed(1)} KB)`,
    );
  } catch (err) {
    console.warn(
      `[sitemap] refresh failed, keeping existing public/sitemap.xml — ${(err as Error).message}`,
    );
  }
})();
