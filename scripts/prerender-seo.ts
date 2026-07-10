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
let TEMPLATE = readFileSync(TEMPLATE_PATH, "utf8");

// ── FCP fix ──────────────────────────────────────────────────────────────
// Vite injects the bundled app CSS as a plain <link rel="stylesheet"> in
// <head>. On mobile 4G this stylesheet (100–200 KB) is render-blocking and
// pushes First Contentful Paint to ~4 s even though we already have inline
// critical CSS + an #app-shell loader. Rewriting every stylesheet link to a
// `rel="preload" ... onload="this.rel='stylesheet'"` swap makes the CSS
// non-blocking: FCP paints from inline CSS immediately, and the full
// stylesheet applies as soon as it arrives (no visual flash because the
// #app-shell overlay hides the tree until React mounts). A <noscript>
// fallback ensures no-JS crawlers still see the styles.
TEMPLATE = TEMPLATE.replace(
  /<link\s+rel="stylesheet"\s+([^>]*?)href="([^"]+\.css)"([^>]*)>/gi,
  (_m, pre, href, post) =>
    `<link rel="preload" as="style" ${pre}href="${href}"${post} onload="this.onload=null;this.rel='stylesheet'">` +
    `<noscript><link rel="stylesheet" ${pre}href="${href}"${post}></noscript>`,
);

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

  // ── Crawler-visible content shell ─────────────────────────────────────
  // Every prerendered route must ship visible HTML in #root, otherwise
  // Googlebot (which times out waiting for React to hydrate the app CSS
  // bundle) classifies the page as "Soft 404 / crawled — currently not
  // indexed". React overwrites this on hydration, so users never see it.
  const canonicalPath = canonical.replace(SITE, "") || "/";
  const contentShell = `
    <main style="max-width:960px;margin:0 auto;padding:40px 20px;font-family:'DM Sans','DM Sans Fallback',system-ui,sans-serif;color:#0f172a">
      <h1 style="font-family:'Plus Jakarta Sans','Plus Jakarta Fallback',system-ui,sans-serif;font-weight:700;font-size:clamp(24px,4vw,36px);line-height:1.2;margin:0 0 12px">${esc(title)}</h1>
      <p style="font-size:16px;line-height:1.55;color:#475569;margin:0 0 20px">${esc(description)}</p>
      <nav aria-label="Sections" style="font-size:14px;color:#334155">
        <a href="/" style="color:#0369a1;text-decoration:none;margin-right:16px">Home</a>
        <a href="/colleges" style="color:#0369a1;text-decoration:none;margin-right:16px">Top MBA Colleges</a>
        <a href="/coaching" style="color:#0369a1;text-decoration:none;margin-right:16px">MBA Coaching</a>
        <a href="/blog" style="color:#0369a1;text-decoration:none;margin-right:16px">Articles</a>
        <a href="/sitemap.xml" style="color:#0369a1;text-decoration:none">Sitemap</a>
      </nav>
      <p style="margin-top:24px;font-size:12px;color:#94a3b8">Loading interactive view for <span>${esc(canonicalPath)}</span>…</p>
    </main>
  `;
  html = html.replace(
    /<div id="root">[\s\S]*?<\/div>/,
    `<div id="root">${contentShell}</div>`,
  );

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
          headline: clip(r.title, 110),
          description,
          url: canonical,
          // Google Rich Results REQUIRES image for Article. Always fall back
          // to the sitewide OG image so we never ship Article JSON-LD without
          // an image (the previous spread-only shape omitted the field when
          // image_url was null and triggered "Missing field image" in GSC).
          image: r.image_url || DEFAULT_OG,
          author: {
            "@type": "Person",
            name: r.author || "MBA Compass Editorial",
          },
          datePublished: r.created_at,
          dateModified: r.updated_at || r.created_at,
          publisher: {
            "@type": "Organization",
            name: "MBA Compass",
            logo: { "@type": "ImageObject", url: `${SITE}/og-image.png` },
          },
          mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
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

// ── hub pages: /colleges/type/*, /colleges/by-exam/* ────────────────────
// These mirror the titles/intros in src/pages/CollegeHubPage.tsx. Keep in sync
// when copy changes there.
const TYPE_HUB_META: Record<string, { title: string; intro: string }> = {
  iim: {
    title: "IIM Colleges in India 2026 — Full List, CAT Cut-offs, Fees & Placements | MBA Compass",
    intro: "Complete list of all 21 IIMs with CAT cut-offs, fees, average and highest placement packages, sectional weightages and category-wise admission criteria. Compare older, new and baby IIMs side by side.",
  },
  private: {
    title: "Top Private MBA Colleges in India 2026 — Fees, Placements & Admissions | MBA Compass",
    intro: "Top private B-schools accepting CAT, XAT, NMAT, SNAP, CMAT, IIFT and MAT — XLRI, SPJIMR, MDI, IMI, IMT, NMIMS, Symbiosis, Great Lakes, TAPMI and more. Total fees, placement records and last-year cut-offs.",
  },
  "top-mba": {
    title: "Top 100 MBA Colleges in India 2026 — NIRF Ranking, Average Package & Cut-offs",
    intro: "Top 100 MBA colleges in India ranked by NIRF Management, recruiter perception and 3-year placement consistency. Compare average package, sectoral hiring split, percentile cut-offs and total fees.",
  },
  pgdm: {
    title: "Top PGDM Colleges in India 2026 — AICTE-Approved Institutes, Fees & Placements | MBA Compass",
    intro: "Every notable AICTE-approved PGDM institute — MDI, IMT, IMI, Great Lakes, TAPMI, IFMR, Welingkar, KJ Somaiya, BIMTECH — with fees, accepted exams, NBA accreditation status and median placement.",
  },
  university: {
    title: "University MBA Programmes in India 2026 — UGC-Recognised, NAAC-Accredited | MBA Compass",
    intro: "UGC-recognised university MBA programmes including DU FMS, JNU, BHU, Pondicherry University, AMU, Jamia Millia, DTU and Anna University. NAAC grade, total fees, entrance exam and last-year cut-off.",
  },
  government: {
    title: "Government MBA Colleges in India 2026 — Low Fees, Top Placements | MBA Compass",
    intro: "Government-funded MBA colleges with the best ROI in Indian management education. IIMs, IIT B-schools, NIT management depts, FMS Delhi, JBIMS, DFS DU — with cut-offs, fees, average package and recruiter mix.",
  },
};

const EXAM_HUB_META: Record<string, { label: string; intro: string }> = {
  cat: { label: "CAT", intro: "Every MBA college accepting CAT scores — 21 IIMs and 1,200+ other Indian B-schools. Compare percentile cut-offs, fees, average package and accepted alternative exams." },
  xat: { label: "XAT", intro: "MBA colleges accepting XAT scores — XLRI, XIMB, IMT, TAPMI, Great Lakes, MICA and SPJIMR. Compare XAT cut-offs, sectional importance, fees and placement track records." },
  cmat: { label: "CMAT", intro: "AICTE-approved MBA/PGDM colleges accepting CMAT scores — JBIMS, SIMSREE, KJ Somaiya, Welingkar, Great Lakes, BIMTECH. Cut-offs, fees and placement data." },
  mat: { label: "MAT", intro: "MAT-accepting B-schools across India with fees, cut-off percentiles and accepted CAT/XAT alternatives. Build a realistic mid-percentile shortlist." },
  nmat: { label: "NMAT", intro: "MBA colleges accepting NMAT by GMAC scores — NMIMS Mumbai, ISB CBA, SPJIMR PGMPW, VIT, Woxsen and ICFAI. Score cut-offs (out of 360), fees and placement record." },
  snap: { label: "SNAP", intro: "All 15 Symbiosis institutes accepting SNAP — SIBM Pune, SCMHRD, SIIB, SIBM Bengaluru, SIBM Hyderabad, SIOM Nashik and more. Cut-offs, fees and placement data." },
  iift: { label: "IIFT", intro: "IIFT Delhi/Kolkata/Kakinada plus other B-schools accepting IIFT scores. Cut-off pattern, fees and placement-by-sector breakdowns." },
  gmat: { label: "GMAT", intro: "Indian B-schools accepting GMAT scores — ISB, IIM 1-year programmes, SPJIMR PGMPW, Great Lakes One-Year. Typical score band, eligible programmes and average package." },
  atma: { label: "ATMA", intro: "AIMS-member B-schools accepting ATMA scores. Cut-offs, programme fees and placement profile across South and West India." },
};

async function prerenderHubs(): Promise<number> {
  let n = 0;
  for (const [slug, meta] of Object.entries(TYPE_HUB_META)) {
    const path = `/colleges/type/${slug}`;
    const canonical = `${SITE}${path}`;
    writeRoute(
      path,
      buildHtml({
        title: clip(meta.title, 65),
        description: clip(meta.intro, 160),
        canonical,
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: meta.title,
          url: canonical,
          description: meta.intro,
        },
      }),
    );
    n++;
  }
  for (const [slug, meta] of Object.entries(EXAM_HUB_META)) {
    const path = `/colleges/by-exam/${slug}`;
    const canonical = `${SITE}${path}`;
    const title = `MBA Colleges Accepting ${meta.label} Score 2026 — Cut-offs, Fees & Placements | MBA Compass`;
    writeRoute(
      path,
      buildHtml({
        title: clip(title, 65),
        description: clip(meta.intro, 160),
        canonical,
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: title,
          url: canonical,
          description: meta.intro,
        },
      }),
    );
    n++;
  }
  return n;
}

// ── static / marketing pages ────────────────────────────────────────────
const STATIC_PAGE_META: Array<{ path: string; title: string; description: string }> = [
  { path: "/", title: "MBA Compass — Find & Compare Top MBA Colleges & Coaching in India", description: "India's trusted platform to find, compare and review the best MBA colleges and coaching institutes for CAT, GMAT, XAT, SNAP and GRE. Fees, rankings, placements and student reviews." },
  { path: "/colleges", title: "MBA Colleges in India 2026 — Directory of Top 1,200+ B-Schools | MBA Compass", description: "Browse 1,200+ MBA, PGDM and management colleges in India. Filter by city, tier, accepted exam, fees and placement. Compare rankings, cut-offs and student reviews in one place." },
  { path: "/coaching", title: "Top MBA Coaching Institutes in India 2026 — Reviews, Fees & Batches | MBA Compass", description: "Compare top CAT, XAT, GMAT and SNAP coaching institutes across India — TIME, IMS, Career Launcher, Endeavor, 2IIM, iQuanta. Batch fees, faculty, mock tests and verified student reviews." },
  { path: "/compare", title: "Compare MBA Coaching Institutes — Side-by-Side Fees, Faculty & Results | MBA Compass", description: "Compare any two MBA coaching institutes across fees, batch size, faculty, mock tests, study material, online vs offline mode and 3-year selection record. Make data-driven decisions in seconds." },
  { path: "/college-finder", title: "AI MBA College Finder & Predictor 2026 — Personalised Shortlist | MBA Compass", description: "Input your profile and CAT/XAT/NMAT/SNAP score into our AI College Finder. Get a curated list of MBA colleges matched to your percentile, budget, location and target package." },
  { path: "/profile-analyzer", title: "MBA Profile Analyzer 2026 — Free AI Profile Strength Score | MBA Compass", description: "Free AI Profile Analyzer rates your academics, work experience, extracurriculars and diversity against IIM and top B-school admission criteria. Get a score, a verdict and a 90-day improvement plan." },
  { path: "/college-shortlister", title: "AI College Shortlister 2026 — Realistic IIM & B-School Apply List | MBA Compass", description: "AI College Shortlister builds a balanced 8–12 college apply-list across moonshot, target and safety schools based on your CAT percentile, profile and budget. 100-point match score per college." },
  { path: "/cat-score-calculator", title: "CAT Score Calculator 2025 — Raw to Scaled to Percentile in Seconds | MBA Compass", description: "Free CAT 2025 Score Calculator: convert raw marks to scaled score and percentile by section (VARC, DILR, QA) using IIM normalisation. Predict your IIM call chances instantly." },
  { path: "/mba-roi-calculator", title: "MBA ROI Calculator — Calculate Payback Period & 5-Year Earnings Delta | MBA Compass", description: "Free MBA ROI Calculator computes payback period, NPV and 5-year earnings delta from your CTC, fees, loan interest and opportunity cost. Compare any two MBA programmes financially." },
  { path: "/about", title: "About MBA Compass — India's Independent MBA Discovery Platform | Our Team", description: "MBA Compass (by B-School Buzz) is an independent platform helping Indian MBA aspirants make informed choices. Meet the founders, editorial team and our research methodology." },
  { path: "/contact", title: "Contact MBA Compass — Reach Our Editorial & Partnerships Team | Email & Phone", description: "Contact MBA Compass for editorial inquiries, partnerships, listing requests or feedback. Email, phone and registered office details for Akaniya Ventures Private Limited." },
  { path: "/business-inquiry", title: "Business Inquiry — Advertise, Partner or List with MBA Compass | India", description: "Coaching institute or B-school looking to feature on MBA Compass? Submit a business inquiry for verified listing, lead generation, branded content and aspirant outreach." },
  { path: "/list-your-business", title: "List Your MBA Coaching Institute Free on MBA Compass — Get Verified Leads", description: "List your MBA coaching institute, B-school or test prep business on MBA Compass — India's fastest-growing MBA discovery platform. Free verified listing, lead capture and analytics." },
  { path: "/mocks", title: "Free CAT Mocks & Sectional Tests 2025 — IIM-Level Difficulty | MBA Compass", description: "Free and paid CAT mock tests calibrated to IIM CAT difficulty — full-length, sectional (VARC/DILR/QA) and topic-wise practice with detailed analytics, percentile and AI deep analysis." },
  { path: "/courses", title: "MBA Compass Courses — AI-Generated CAT Mock Bundles & Topic Drills", description: "Buy AI-generated CAT, XAT, NMAT, SNAP, IIFT, CMAT and MAT mock bundles. Unlimited practice with adaptive difficulty, detailed solutions, percentile prediction and 24/7 access." },
  { path: "/iim-waitlist-movement", title: "IIM Waitlist Movement 2026 — Live Tracker, RTI Data & Result Dates | MBA Compass", description: "Live IIM 2026 result tracker, expected release calendar, category-wise waitlist movement (2021–2026), RTI insights, AI-powered conversion predictions and apply-now B-school list." },
  { path: "/mba-compass", title: "MBA Compass Courses Catalog — Paid Test-Prep, Mentoring & Mock Bundles", description: "Browse paid MBA Compass courses — CAT/XAT comprehensive prep, sectional crash courses, IIM interview mentoring and one-on-one profile review programmes from top mentors." },
  { path: "/mba-compass/compare", title: "Compare MBA Compass Courses — Pick the Right Test-Prep Programme", description: "Side-by-side comparison of MBA Compass test-prep courses — duration, syllabus coverage, mock count, live classes, mentor access and price — to pick the right programme for your prep stage." },
  { path: "/blog", title: "MBA Blog — Latest CAT Strategy, B-School News & Admission Insights | MBA Compass", description: "MBA blog with expert articles on CAT strategy, B-school news, IIM admissions, MBA placements, GD-PI tips, salary trends and career advice — written by ex-IIM students and admission consultants." },
];

// Static hero shell injected into dist/index.html so mobile browsers paint the
// LCP element (H1) BEFORE the React bundle downloads/parses. React hydrates
// on top; visible text stays identical, so browsers credit the pre-hydration
// paint as LCP.
const HOMEPAGE_HERO_SHELL = `
  <section style="min-height:520px;padding:64px 20px 40px;background:linear-gradient(180deg,#f0f9ff 0%,#ffffff 100%);text-align:center;font-family:'DM Sans','DM Sans Fallback',system-ui,sans-serif">
    <h1 style="font-family:'Plus Jakarta Sans','Plus Jakarta Fallback',system-ui,sans-serif;font-weight:700;font-size:clamp(28px,5vw,48px);line-height:1.15;color:#0f172a;max-width:880px;margin:0 auto 16px">Find the Best MBA Coaching</h1>
    <p style="font-size:clamp(15px,2.2vw,18px);line-height:1.5;color:#475569;max-width:640px;margin:0 auto 28px">Compare top MBA coaching institutes, read reviews, and make informed decisions</p>
    <div style="max-width:640px;margin:0 auto;height:56px;border-radius:14px;background:#fff;border:1px solid #e2e8f0;box-shadow:0 4px 12px rgba(15,23,42,.06)"></div>
  </section>
`;

async function prerenderStatics(): Promise<number> {
  let n = 0;
  for (const p of STATIC_PAGE_META) {
    const canonical = `${SITE}${p.path === "/" ? "" : p.path}`;
    writeRoute(
      p.path === "/" ? "/index-prerender" : p.path,
      buildHtml({
        title: clip(p.title, 65),
        description: clip(p.description, 160),
        canonical,
      }),
    );
    // Special-case "/" → also overwrite dist/index.html with homepage meta AND
    // a pre-rendered hero shell inside #root so LCP paints before JS runs.
    if (p.path === "/") {
      let homeHtml = buildHtml({
        title: clip(p.title, 65),
        description: clip(p.description, 160),
        canonical,
      });
      // buildHtml now injects a generic content shell into #root — for the
      // homepage we replace it with the branded LCP hero shell.
      homeHtml = homeHtml.replace(
        /<div id="root">[\s\S]*?<\/div>\s*(?=<!--|<script|<noscript)/,
        `<div id="root">${HOMEPAGE_HERO_SHELL}</div>\n    `,
      );
      writeFileSync(resolve(DIST, "index.html"), homeHtml, "utf8");
    }
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
    ["hubs", prerenderHubs],
    ["statics", prerenderStatics],
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

