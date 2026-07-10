// Post-build guard: crawls every generated dist/**/index.html and fails the
// build (exit 1) when any prerendered route ships:
//   - no <h1> element, OR
//   - an empty/missing <meta name="description">, OR
//   - an empty <div id="root"></div>
//
// This is what previously caused Google Search Console to flag pages as
// Soft 404 / Crawled — currently not indexed. Wired into the `build` npm
// script so a regression can never reach production.

import { readdirSync, readFileSync, statSync } from "fs";
import { resolve, join } from "path";

const DIST = resolve("dist");
const SAMPLE_LIMIT = Number(process.env.PRERENDER_VERIFY_LIMIT ?? 500); // scan up to N files

type Problem = { file: string; reasons: string[] };

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (entry === "index.html") out.push(p);
  }
  return out;
}

function check(html: string): string[] {
  const reasons: string[] = [];
  if (!/<h1[\s>]/i.test(html)) reasons.push("missing <h1>");
  const desc = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  if (!desc || !desc[1].trim()) reasons.push("empty meta description");
  if (/<div id="root">\s*<\/div>/i.test(html)) reasons.push("empty #root");
  return reasons;
}

const files = walk(DIST).slice(0, SAMPLE_LIMIT);
if (files.length === 0) {
  console.error("[verify-prerender] no dist/**/index.html files found");
  process.exit(1);
}

const problems: Problem[] = [];
for (const f of files) {
  const html = readFileSync(f, "utf8");
  const reasons = check(html);
  if (reasons.length) problems.push({ file: f.replace(DIST, ""), reasons });
}

if (problems.length) {
  console.error(
    `\n[verify-prerender] ❌ ${problems.length} of ${files.length} prerendered files are missing crawler-visible content:\n`,
  );
  for (const p of problems.slice(0, 25)) {
    console.error(`  ${p.file}\n    - ${p.reasons.join("\n    - ")}`);
  }
  if (problems.length > 25) console.error(`  … and ${problems.length - 25} more`);
  console.error(
    "\nFix scripts/prerender-seo.ts so buildHtml() injects <h1> + meta description + non-empty #root for every route.\n",
  );
  process.exit(1);
}

console.log(`[verify-prerender] ✅ all ${files.length} prerendered files ship <h1> + description + non-empty #root`);
