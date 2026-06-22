/**
 * Post-build prerender — writes per-route static HTML files into dist/ with
 * fully-baked <title>, <meta description>, <link rel="canonical">, robots,
 * og:*, twitter:*, and JSON-LD. Crawlers (and JS-disabled clients) get
 * accurate per-page head metadata BEFORE React hydrates.
 *
 * Routes prerendered:
 *   /college/{slug}
 *   /article/{slug}
 *   /institute/{slug}
 *   /exam/{slug}
 *   /colleges/{slug}     (city_pages)
 *   /category/{slug}
 *
 * The body of each generated file is the same SPA shell from dist/index.html,
 * so React still mounts on top and the user navigation behaves identically.
 * Lovable/Hostinger static hosting matches the exact path first, so the
 * crawler-friendly file is served instead of the generic SPA fallback.
 *
 * Fails soft — any fetch / write error logs a warning and skips that section
 * so the build never blocks on a transient issue.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve, dirname } from "path";

const SUPABASE_URL = "https://mttoiqruzzxooveooldo.supabase.co";
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10dG9pcXJ1enp4b292ZW9vbGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2OTM5NjUsImV4cCI6MjA5MDI2OTk2NX0.1IqkcJqW9Lzk5QnmToyQbnGxqMwO-ykTRlSnOv_cTxE";
const SITE = "https://mbacompass.in";
const DIST = resolve("dist");
const TEMPLATE_PATH = resolve(DIST, "index.html");

const DEFAULT_OG = `${SITE}/og-image.png`;
const ROBOTS_INDEX =
  "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";

if (!existsSync(TEMPLATE_PATH)) {
  console.warn(`[prerender] no dist/index.html found at ${TEMPLATE_PATH} — skipping`);
  process.exit(0);
}
const TEMPLATE = readFileSync(TEMPLATE_PATH, "utf8");

// ── helpers ─────────────────────────────────────────────────────────────
const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const stripHtml = (s: unknown) =>
  String(s ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const clip = (s: string, max: number) =>
  s.length <= max ? s : s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";

async function fetchAll<T = any>(table: string, select: string, filter = ""): Promise<T[]> {
  const out: T[] = [];
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}${filter}&limit=${pageSize}&offset=${from}`;
    const res = await fetch(url, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${ANON_KEY}`,
      },
    });
    if (!res.ok) throw new Error(`${table} HTTP ${res.status}: ${await res.text()}`);
    const batch = (await res.json()) as T[];
    out.push(...batch);
    if (batch.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

interface HeadFields {
  title: string;
  description: string;
  canonical: string;
  robots?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
}

function buildHtml(fields: HeadFields): string {
  const {
    title,
    description,
    canonical,
    robots = ROBOTS_INDEX,
    ogTitle = title,
    ogDescription = description,
    ogImage = DEFAULT_OG,
    ogType = "website",
    jsonLd,
  } = fields;

  let html = TEMPLATE;

  // Swap existing tags
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  html = html.replace(
    /<meta\s+name="description"[^>]*>/i,
    `<meta name="description" content="${esc(description)}">`,
  );
  html = html.replace(
    /<meta\s+name="robots"[^>]*>/i,
    `<meta name="robots" content="${esc(robots)}">`,
  );
  html = html.replace(
    /<meta\s+property="og:title"[^>]*>/i,
    `<meta property="og:title" content="${esc(ogTitle)}">`,
  );
  html = html.replace(
    /<meta\s+name="twitter:title"[^>]*>/i,
    `<meta name="twitter:title" content="${esc(ogTitle)}">`,
  );
  html = html.replace(
    /<meta\s+property="og:description"[^>]*>/i,
    `<meta property="og:description" content="${esc(ogDescription)}">`,
  );
  html = html.replace(
    /<meta\s+name="twitter:description"[^>]*>/i,
    `<meta name="twitter:description" content="${esc(ogDescription)}">`,
  );
  html = html.replace(
    /<meta\s+property="og:url"[^>]*>/i,
    `<meta property="og:url" content="${esc(canonical)}">`,
  );
  html = html.replace(
    /<meta\s+property="og:type"[^>]*>/i,
    `<meta property="og:type" content="${esc(ogType)}">`,
  );
  html = html.replace(
    /<meta\s+property="og:image"[^>]*>/i,
    `<meta property="og:image" content="${esc(ogImage)}">`,
  );
  html = html.replace(
    /<meta\s+name="twitter:image"[^>]*>/i,
    `<meta name="twitter:image" content="${esc(ogImage)}">`,
  );

  // Inject canonical + per-route JSON-LD just before </head>
  const inject: string[] = [];
  inject.push(`<link rel="canonical" href="${esc(canonical)}">`);
  if (jsonLd) {
    const blocks = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
    for (const block of blocks) {
      inject.push(
        `<script type="application/ld+json">${JSON.stringify(block).replace(
          /</g,
          "\\u003c",
        )}</script>`,
      );
    }
  }
  html = html.replace("</head>", `    ${inject.join("\n    ")}\n  </head>`);
  return html;
}

function writeRoute(routePath: string, html: string) {
  const out = resolve(DIST, `.${routePath}/index.html`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html, "utf8");
}

// ── per-section renderers ───────────────────────────────────────────────
async function prerenderColleges(): Promise<number> {
  const rows = await fetchAll<any>(
    "colleges",
    "slug,name,city,state,description,ranking,tier,type,fees,established,logo_url,meta_title,meta_description",
  );
  let n = 0;
  for (const r of rows) {
    if (!r.slug || !r.name || !String(r.name).trim()) continue;
    const path = `/college/${r.slug}`;
    const canonical = `${SITE}${path}`;
    const locality = [r.city, r.state].filter(Boolean).join(", ");
    const title = clip(
      r.meta_title ||
        `${r.name}${locality ? ` — ${locality}` : ""} | Fees, Ranking, Placements & Admissions`,
      65,
    );
    const description = clip(
      r.meta_description ||
        stripHtml(r.description) ||
        `${r.name}${locality ? `, ${locality}` : ""}: complete details on fees, ranking, placements, cutoffs and admissions on MBA Compass.`,
      160,
    );
    writeRoute(
      path,
      buildHtml({
        title,
        description,
        canonical,
        ogType: "website",
        ogImage: r.logo_url || DEFAULT_OG,
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "CollegeOrUniversity",
          name: r.name,
          url: canonical,
          ...(r.logo_url ? { logo: r.logo_url } : {}),
          ...(locality
            ? {
                address: {
                  "@type": "PostalAddress",
                  addressLocality: r.city || undefined,
                  addressRegion: r.state || undefined,
                  addressCountry: "IN",
                },
              }
            : {}),
          description,
        },
      }),
    );
    n++;
  }
  return n;
}

async function prerenderArticles(): Promise<number> {
  const rows = await fetchAll<any>(
    "articles",
    "slug,title,excerpt,meta_title,meta_description,image_url,published,updated_at,created_at,author",
    "&published=eq.true",
  );
  let n = 0;
  for (const r of rows) {
    if (!r.slug || !r.title) continue;
    const path = `/article/${r.slug}`;
    const canonical = `${SITE}${path}`;
    const title = clip(r.meta_title || `${r.title} | MBA Compass`, 65);
    const description = clip(
      r.meta_description || stripHtml(r.excerpt) || `${r.title} — read more on MBA Compass.`,
      160,
    );
    writeRoute(
      path,
      buildHtml({
        title,
        description,
        canonical,
        ogType: "article",
        ogImage: r.image_url || DEFAULT_OG,
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "Article",
          headline: r.title,
          url: canonical,
          ...(r.image_url ? { image: r.image_url } : {}),
          ...(r.author ? { author: { "@type": "Person", name: r.author } } : {}),
          datePublished: r.created_at,
          dateModified: r.updated_at || r.created_at,
          publisher: {
            "@type": "Organization",
            name: "MBA Compass",
            logo: { "@type": "ImageObject", url: `${SITE}/og-image.png` },
          },
        },
      }),
    );
    n++;
  }
  return n;
}

async function prerenderInstitutes(): Promise<number> {
  const rows = await fetchAll<any>(
    "institutes",
    "slug,name,city,state,description,meta_title,meta_description,logo_url,og_title,og_description,og_image,canonical_url",
  );
  let n = 0;
  for (const r of rows) {
    if (!r.slug || !r.name || !String(r.name).trim()) continue;
    const path = `/institute/${r.slug}`;
    const canonical = r.canonical_url || `${SITE}${path}`;
    const locality = [r.city, r.state].filter(Boolean).join(", ");
    const title = clip(
      r.meta_title ||
        `${r.name}${locality ? ` — ${locality}` : ""} | MBA Coaching Reviews & Fees`,
      65,
    );
    const description = clip(
      r.meta_description ||
        stripHtml(r.description) ||
        `${r.name}${locality ? `, ${locality}` : ""}: course details, fees, reviews and contact information on MBA Compass.`,
      160,
    );
    writeRoute(
      path,
      buildHtml({
        title,
        description,
        canonical,
        ogTitle: r.og_title || title,
        ogDescription: r.og_description || description,
        ogImage: r.og_image || r.logo_url || DEFAULT_OG,
        ogType: "website",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "EducationalOrganization",
          name: r.name,
          url: canonical,
          ...(r.logo_url ? { logo: r.logo_url } : {}),
          ...(locality
            ? {
                address: {
                  "@type": "PostalAddress",
                  addressLocality: r.city || undefined,
                  addressRegion: r.state || undefined,
                  addressCountry: "IN",
                },
              }
            : {}),
          description,
        },
      }),
    );
    n++;
  }
  return n;
}

async function prerenderExams(): Promise<number> {
  const rows = await fetchAll<any>(
    "exams",
    "slug,name,full_name,description,meta_title,meta_description",
  );
  let n = 0;
  for (const r of rows) {
    if (!r.slug || !r.name) continue;
    const path = `/exam/${r.slug}`;
    const canonical = `${SITE}${path}`;
    const fullName = r.full_name || r.name;
    const title = clip(
      r.meta_title || `${fullName} — Dates, Pattern, Syllabus & Cutoffs | MBA Compass`,
      65,
    );
    const description = clip(
      r.meta_description ||
        stripHtml(r.description) ||
        `${fullName}: latest exam dates, pattern, syllabus, eligibility and cutoffs on MBA Compass.`,
      160,
    );
    writeRoute(path, buildHtml({ title, description, canonical, ogType: "website" }));
    n++;
  }
  return n;
}

async function prerenderCityPages(): Promise<number> {
  const rows = await fetchAll<any>(
    "city_pages",
    "slug,name,state,meta_title,meta_description,intro_content,hero_image_url,active",
    "&active=eq.true",
  );
  let n = 0;
  for (const r of rows) {
    if (!r.slug || !r.name) continue;
    const path = `/colleges/${r.slug}`;
    const canonical = `${SITE}${path}`;
    const title = clip(
      r.meta_title || `Top MBA Colleges in ${r.name}${r.state ? `, ${r.state}` : ""} | MBA Compass`,
      65,
    );
    const description = clip(
      r.meta_description ||
        stripHtml(r.intro_content) ||
        `Find the best MBA colleges in ${r.name}: fees, ranking, placements and admissions on MBA Compass.`,
      160,
    );
    writeRoute(
      path,
      buildHtml({
        title,
        description,
        canonical,
        ogImage: r.hero_image_url || DEFAULT_OG,
      }),
    );
    n++;
  }
  return n;
}

async function prerenderCategories(): Promise<number> {
  const rows = await fetchAll<any>("categories", "slug,name,description");
  let n = 0;
  for (const r of rows) {
    if (!r.slug || !r.name) continue;
    const path = `/category/${r.slug}`;
    const canonical = `${SITE}${path}`;
    const title = clip(`${r.name} — MBA Coaching Institutes | MBA Compass`, 65);
    const description = clip(
      stripHtml(r.description) ||
        `Explore ${r.name} coaching institutes: courses, fees, reviews and contact details on MBA Compass.`,
      160,
    );
    writeRoute(path, buildHtml({ title, description, canonical }));
    n++;
  }
  return n;
}

// ── run ─────────────────────────────────────────────────────────────────
(async () => {
  const t0 = Date.now();
  const sections: Array<[string, () => Promise<number>]> = [
    ["colleges", prerenderColleges],
    ["articles", prerenderArticles],
    ["institutes", prerenderInstitutes],
    ["exams", prerenderExams],
    ["city_pages", prerenderCityPages],
    ["categories", prerenderCategories],
  ];

  let total = 0;
  for (const [label, fn] of sections) {
    try {
      const count = await fn();
      total += count;
      console.log(`[prerender] ${label}: ${count} pages`);
    } catch (err) {
      console.warn(`[prerender] ${label} failed — ${(err as Error).message}`);
    }
  }
  console.log(
    `[prerender] done — ${total} static HTML files written into dist/ in ${(
      (Date.now() - t0) /
      1000
    ).toFixed(1)}s`,
  );
})();
