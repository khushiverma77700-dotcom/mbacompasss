// SSR Prerender for search-engine crawlers.
//
// Why this exists:
//   The site is a Vite + React SPA. Without prerender, Googlebot fetches the
//   bare index.html shell — every URL ends up with the same title, the same
//   description and no canonical, so duplicate-content signals nuke indexing.
//   This function returns fully-rendered HTML with route-specific title,
//   meta description, canonical, OG tags, BreadcrumbList JSON-LD and (for
//   article / college) the full body content. Cloudflare Worker routes any
//   bot UA here; humans never see it.
//
// Coverage:
//   - / (homepage)
//   - Static hubs: /blog /colleges /coaching /mocks /compare /courses /about
//     /contact /business-inquiries /list-your-business /college-finder
//     /profile-analyzer /college-shortlister /cat-score-calculator
//     /roi-calculator /freebies /exams /authors /formulas /bundles
//     /iim-waitlist-movement /mba-compass …
//   - Dynamic detail pages with full content:
//       /article/<slug>          (DB-backed Article schema)
//       /college/<slug>          (DB-backed CollegeOrUniversity schema)
//       /institute/<slug>        (DB-backed Organization schema)
//       /exam/<slug>             (DB-backed)
//       /coaching/<slug>
//   - Faceted listings (synthesized titles + canonicals):
//       /colleges/by-city/<slug> /colleges/by-exam/<slug>
//       /colleges/type/<slug>    /category/<slug>
//   - Unknown HTML route → SPA fallback (200, indexable) — never a noindex
//     404 for routes the client app actually renders. Genuine 404s only fire
//     when a DB lookup misses for a content-detail prefix.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=denonext";

const SITE = "https://mbacompass.in";
const OG_DEFAULT = `${SITE}/og-image.png`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
};

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeContent(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}

function stripHtml(s: string): string {
  return (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function clamp(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}

function slugToTitle(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const HTML_HEADERS = {
  ...corsHeaders,
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "public, max-age=600, s-maxage=3600",
  "Vary": "Cookie, Accept-Encoding, Accept",
  "X-Robots-Tag": "index, follow, max-image-preview:large",
  "X-Prerender-Source": "ssr-prerender",
};

const JSON_HEADERS = {
  ...corsHeaders,
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, max-age=600, s-maxage=3600",
  "Vary": "Cookie, Accept-Encoding, Accept",
  "X-Prerender-Source": "ssr-prerender",
};

function wantsJsonFormat(req: Request, url: URL): boolean {
  const fmt = url.searchParams.get("format");
  if (fmt === "json") return true;
  const accept = req.headers.get("accept") || "";
  return accept.includes("application/json") && !accept.includes("text/html");
}

function workerFallbackStyle(): string {
  // Defensive CSS for the Cloudflare merge path. Older Worker code used a
  // non-greedy #root replacement and could leave the static Hostinger fallback
  // hero stacked below the prerender shell. This hides only that leftover
  // hardcoded fallback section, while keeping the real prerender content fully
  // visible and styled even if the app CSS/JS assets are slow on staging.
  return `<style id="__ssr_visual_guard">
#root>section[style*="min-height:520px"]{display:none!important}
[data-ssr-shell="1"]{min-height:100vh;background:#fff;color:#0f172a;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.55}
[data-ssr-shell="1"] header,[data-ssr-shell="1"] main,[data-ssr-shell="1"] footer,[data-ssr-shell="1"] nav[aria-label="Breadcrumb"]{max-width:1120px;margin-left:auto;margin-right:auto;padding-left:24px;padding-right:24px;box-sizing:border-box}
[data-ssr-shell="1"] header{padding-top:56px;padding-bottom:22px}
[data-ssr-shell="1"] h1{margin:0;color:#0f172a;font-size:clamp(32px,5vw,58px);line-height:1.08;font-weight:850;letter-spacing:0}
[data-ssr-shell="1"] header p{max-width:760px;margin:18px 0 0;color:#475569;font-size:18px;line-height:1.65}
[data-ssr-shell="1"] main{padding-bottom:64px;font-size:16px;color:#334155}
[data-ssr-shell="1"] main p{max-width:880px;margin:0 0 18px}
[data-ssr-shell="1"] ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px 18px;margin:24px 0 0;padding-left:22px}
[data-ssr-shell="1"] li{margin:0}
[data-ssr-shell="1"] a{color:#2563eb;text-decoration:none;font-weight:650}
[data-ssr-shell="1"] a:hover{text-decoration:underline}
[data-ssr-shell="1"] footer{border-top:1px solid #e2e8f0;padding-top:26px;padding-bottom:34px;color:#64748b;font-size:14px}
[data-ssr-shell="1"] footer nav{display:flex;flex-wrap:wrap;gap:12px 18px;padding:0}
@media(max-width:640px){[data-ssr-shell="1"] header,[data-ssr-shell="1"] main,[data-ssr-shell="1"] footer,[data-ssr-shell="1"] nav[aria-label="Breadcrumb"]{padding-left:16px;padding-right:16px}[data-ssr-shell="1"] header{padding-top:36px}[data-ssr-shell="1"] ul{grid-template-columns:1fr}}
</style>`;
}

function bodyForWorkerMerge(bodyHtml: string): string {
  return `${workerFallbackStyle()}${bodyHtml || ""}`;
}

function emit(meta: PageMeta, status: number, asJson: boolean): Response {
  if (asJson) {
    // JSON contract used by the Cloudflare Worker merge (Plan B1). The
    // worker injects `bodyHtml` into <div id="root"> and rewrites the
    // <head> of the Hostinger-served SPA shell with these fields.
    return new Response(
      JSON.stringify({
        status,
        url: meta.url,
        title: meta.title,
        description: meta.description || "",
        image: meta.image || OG_DEFAULT,
        canonical: meta.url,
        noindex: !!meta.noindex,
        h1: meta.h1 || meta.title,
        breadcrumbs: meta.breadcrumbs || [],
        jsonLd: meta.jsonLd || null,
        bodyHtml: bodyForWorkerMerge(meta.bodyHtml || ""),
      }),
      {
        status,
        headers: {
          ...JSON_HEADERS,
          ...(meta.noindex ? { "X-Robots-Tag": "noindex, follow" } : {}),
        },
      },
    );
  }
  return new Response(buildHtml(meta), {
    status,
    headers: {
      ...HTML_HEADERS,
      ...(meta.noindex ? { "X-Robots-Tag": "noindex, follow" } : {}),
    },
  });
}

interface PageMeta {
  url: string;
  title: string;
  description: string;
  image?: string;
  noindex?: boolean;
  jsonLd?: object | object[];
  breadcrumbs?: { name: string; url: string }[];
  bodyHtml?: string;
  h1?: string;
}

function breadcrumbJsonLd(items: { name: string; url: string }[]): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      item: b.url,
    })),
  };
}

function buildHtml(m: PageMeta): string {
  const title = clamp(m.title, 70);
  const description = clamp(m.description || "", 200);
  const image = m.image || OG_DEFAULT;
  const robots = m.noindex ? "noindex, follow" : "index, follow, max-image-preview:large, max-snippet:-1";
  const jsonLdNodes: object[] = [];
  if (m.jsonLd) {
    if (Array.isArray(m.jsonLd)) jsonLdNodes.push(...m.jsonLd);
    else jsonLdNodes.push(m.jsonLd);
  }
  if (m.breadcrumbs && m.breadcrumbs.length > 0) {
    jsonLdNodes.push(breadcrumbJsonLd(m.breadcrumbs));
  }
  const ldHtml = jsonLdNodes
    .map((n) => `<script type="application/ld+json">${JSON.stringify(n)}</script>`)
    .join("\n");
  const breadcrumbHtml =
    m.breadcrumbs && m.breadcrumbs.length > 1
      ? `<nav aria-label="Breadcrumb"><ol>${m.breadcrumbs
          .map((b, i) =>
            i === m.breadcrumbs!.length - 1
              ? `<li>${esc(b.name)}</li>`
              : `<li><a href="${esc(b.url)}">${esc(b.name)}</a></li>`,
          )
          .join("")}</ol></nav>`
      : "";

  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${robots}">
<meta name="googlebot" content="${robots}">
<link rel="canonical" href="${esc(m.url)}">
<meta property="og:type" content="${m.bodyHtml ? "article" : "website"}">
<meta property="og:site_name" content="MBA Compass">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(m.url)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
${ldHtml}
</head>
<body>
<header><a href="${SITE}/"><strong>MBA Compass</strong></a> — India's MBA Discovery Platform</header>
${breadcrumbHtml}
<main>
<h1>${esc(m.h1 || title)}</h1>
${m.bodyHtml || `<p>${esc(description)}</p>`}
<p><a href="${esc(m.url)}">View the full interactive page on MBA Compass →</a></p>
</main>
<footer><nav>
<a href="${SITE}/colleges">Top MBA Colleges</a> ·
<a href="${SITE}/coaching">MBA Coaching</a> ·
<a href="${SITE}/blog">Articles</a> ·
<a href="${SITE}/mocks">Mock Tests</a> ·
<a href="${SITE}/about">About</a>
</nav></footer>
</body>
</html>`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Static + faceted route map. Templates use {slug} → title-cased slug.
// ──────────────────────────────────────────────────────────────────────────────

interface RouteTemplate {
  match: RegExp;
  build: (m: RegExpMatchArray) => Omit<PageMeta, "url"> & { url?: string };
}

const STATIC_ROUTES: RouteTemplate[] = [
  {
    match: /^\/$/,
    build: () => ({
      title: "MBA Compass: Top MBA Colleges, Coaching & CAT Prep in India",
      description:
        "Compare top MBA coaching institutes, read reviews, and make informed decisions",
      h1: "Find the Best MBA Coaching",
      breadcrumbs: [{ name: "Home", url: `${SITE}/` }],
      bodyHtml: `<p class="text-base sm:text-lg text-slate-700 leading-relaxed">Compare top MBA coaching institutes, read reviews, and make informed decisions. Explore India's leading business schools, entrance exams like CAT, XAT, NMAT and SNAP, and free tools to plan your MBA journey.</p>
<ul class="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-800">
  <li><a href="${SITE}/colleges" class="hover:underline">Browse top MBA colleges in India</a></li>
  <li><a href="${SITE}/coaching" class="hover:underline">Compare MBA coaching institutes</a></li>
  <li><a href="${SITE}/exams" class="hover:underline">CAT, XAT, NMAT, SNAP exam guides</a></li>
  <li><a href="${SITE}/mocks" class="hover:underline">Free CAT mock tests & practice</a></li>
  <li><a href="${SITE}/cat-score-calculator" class="hover:underline">CAT score & percentile calculator</a></li>
  <li><a href="${SITE}/roi-calculator" class="hover:underline">MBA ROI calculator</a></li>
  <li><a href="${SITE}/college-shortlister" class="hover:underline">Personalised college shortlister</a></li>
  <li><a href="${SITE}/blog" class="hover:underline">Latest MBA news & articles</a></li>
</ul>`,
    }),
  },
  {
    match: /^\/blog\/?$/,
    build: () => ({
      title: "MBA Blog & News: CAT Updates, B-School Rankings, Admissions",
      description:
        "Latest MBA admissions news, CAT/XAT/NMAT updates, B-school rankings, placement reports and strategy guides from MBA Compass.",
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "Blog", url: `${SITE}/blog` },
      ],
    }),
  },
  {
    match: /^\/colleges\/?$/,
    build: () => ({
      title: "Top MBA Colleges in India 2026: Rankings, Fees & Placements",
      description:
        "Explore India's top MBA colleges — IIMs, FMS, XLRI, SPJIMR and more. Compare fees, NIRF rankings, average packages, placements and student reviews.",
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "Colleges", url: `${SITE}/colleges` },
      ],
    }),
  },
  {
    match: /^\/coaching\/?$/,
    build: () => ({
      title: "Best MBA Coaching Institutes in India 2026 — Compare & Choose",
      description:
        "Top MBA coaching institutes for CAT, XAT, SNAP, NMAT and GMAT. Compare fees, faculty, study material, results and verified student reviews.",
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "Coaching", url: `${SITE}/coaching` },
      ],
    }),
  },
  {
    match: /^\/mocks\/?$/,
    build: () => ({
      title: "CAT Mock Tests 2026: Free Sectional & Full-Length Practice",
      description:
        "Practice CAT, XAT, NMAT, SNAP and IIFT with adaptive mock tests, detailed analytics, percentile predictor and topic-wise performance reports.",
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "Mock Tests", url: `${SITE}/mocks` },
      ],
    }),
  },
  {
    match: /^\/freebies\/?$/,
    build: () => ({
      title: "Free MBA Prep Resources: CAT PDFs, Checklists & Templates",
      description:
        "Download free CAT and MBA admissions resources from MBA Compass — preparation PDFs, college shortlisting templates, checklists and planning sheets.",
      h1: "Free MBA Prep Resources",
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "Freebies", url: `${SITE}/freebies` },
      ],
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Free MBA Prep Resources",
        url: `${SITE}/freebies`,
        description:
          "Free CAT and MBA admissions resources, templates, PDFs and planning tools for Indian MBA aspirants.",
      },
    }),
  },
  {
    match: /^\/compare\/?$/,
    build: () => ({
      title: "Compare MBA Colleges Side-by-Side: Fees, Placements & ROI",
      description:
        "Compare any two or three MBA colleges side-by-side on fees, placements, ROI, rankings, exams accepted and specializations.",
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "Compare Colleges", url: `${SITE}/compare` },
      ],
    }),
  },
  {
    match: /^\/courses\/?$/,
    build: () => ({
      title: "MBA Compass Courses: CAT, XAT & NMAT Online Prep Programs",
      description:
        "Structured online MBA prep courses with live classes, video lectures, sectional tests, full-length mocks and personalised mentorship.",
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "Courses", url: `${SITE}/courses` },
      ],
    }),
  },
  {
    match: /^\/about\/?$/,
    build: () => ({
      title: "About MBA Compass — India's Trusted MBA Discovery Platform",
      description:
        "MBA Compass helps lakhs of Indian aspirants find the right MBA college and coaching with unbiased data, verified reviews and expert content.",
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "About", url: `${SITE}/about` },
      ],
    }),
  },
  {
    match: /^\/guides\/ipmat-preparation\/?$/,
    build: () => ({
      title: "IPMAT Preparation Guide 2026 — Syllabus, Pattern & Strategy | MBA Compass",
      description:
        "Complete IPMAT 2026 guide — eligibility, IPMAT Indore & Rohtak pattern, section-wise syllabus, month-by-month study plan and top coaching for IIM integrated programme aspirants.",
      url: `${SITE}/guides/ipmat-preparation`,
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "Exams", url: `${SITE}/exams` },
        { name: "IPMAT Preparation Guide", url: `${SITE}/guides/ipmat-preparation` },
      ],
    }),
  },
  {
    match: /^\/contact\/?$/,
    build: () => ({
      title: "Contact MBA Compass — Get In Touch With Our Team",
      description:
        "Reach the MBA Compass team for admissions help, partnership queries, content suggestions, listing changes or technical support.",
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "Contact", url: `${SITE}/contact` },
      ],
    }),
  },
  {
    match: /^\/business-inquir(?:y|ies)\/?$/,
    build: () => ({
      title: "Business Inquiry — Advertise & Partner With MBA Compass",
      description:
        "Reach India's most engaged MBA aspirant audience. Submit a business inquiry for advertising, lead-gen, content and partnership opportunities.",
      url: `${SITE}/business-inquiries`,
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "Business Inquiry", url: `${SITE}/business-inquiries` },
      ],
    }),
  },
  {
    match: /^\/list-your-business\/?$/,
    build: () => ({
      title: "List Your MBA College or Coaching Institute on MBA Compass",
      description:
        "Get your MBA college or coaching institute discovered by thousands of aspirants. Free and premium listing plans with verified profiles.",
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "List Your Business", url: `${SITE}/list-your-business` },
      ],
    }),
  },
  {
    match: /^\/college-finder\/?$/,
    build: () => ({
      title: "MBA College Finder: AI-Powered Recommendations for You",
      description:
        "Answer a few questions about your score, budget and preferences. Get a personalised shortlist of MBA colleges that fit you best.",
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "College Finder", url: `${SITE}/college-finder` },
      ],
    }),
  },
  {
    match: /^\/college-shortlister\/?$/,
    build: () => ({
      title: "MBA College Shortlister: Build Your Personalised List Today",
      description:
        "Use the MBA Compass College Shortlister to rank colleges by ROI, placements, fees, location and exam scores — built for Indian aspirants.",
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "College Shortlister", url: `${SITE}/college-shortlister` },
      ],
    }),
  },
  {
    match: /^\/profile-analyzer\/?$/,
    build: () => ({
      title: "MBA Profile Analyzer: Get Your Free Admission Chances Report",
      description:
        "Upload your academics, work-ex and CAT score. Get a free profile evaluation with shortlist, weaknesses and tailored improvement advice.",
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "Profile Analyzer", url: `${SITE}/profile-analyzer` },
      ],
    }),
  },
  {
    match: /^\/cat-score-calculator\/?$/,
    build: () => ({
      title: "CAT Score Calculator 2026: Predict Your Percentile Instantly",
      description:
        "Enter your sectional attempts and accuracy to estimate your CAT score, percentile and likely B-school calls — updated for CAT 2026.",
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "CAT Score Calculator", url: `${SITE}/cat-score-calculator` },
      ],
    }),
  },
  {
    match: /^\/(?:roi-calculator|mba-roi-calculator)\/?$/,
    build: () => ({
      title: "MBA ROI Calculator: Compute Your Real Return on Investment",
      description:
        "Calculate your true MBA return on investment — accounts for fees, lost salary, expected package growth, taxes and EMI repayment in India.",
      url: `${SITE}/roi-calculator`,
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "MBA ROI Calculator", url: `${SITE}/roi-calculator` },
      ],
    }),
  },
  {
    match: /^\/cat-mock-1\/?$/i,
    build: () => ({
      title: "CAT Mock 1: Free Full-Length CAT Practice Test",
      description:
        "Take CAT Mock 1 on MBA Compass with exam-style questions, timed sections and performance analysis for serious CAT preparation.",
      url: `${SITE}/cat-mock-1`,
      h1: "CAT Mock 1",
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "Mocks", url: `${SITE}/mocks` },
        { name: "CAT Mock 1", url: `${SITE}/cat-mock-1` },
      ],
    }),
  },
  {
    match: /^\/exams\/?$/,
    build: () => ({
      title: "MBA Entrance Exams 2026: CAT, XAT, NMAT, SNAP & More",
      description:
        "Compare MBA entrance exams in India — CAT, XAT, NMAT, SNAP, CMAT, MAT, GMAT and IIFT with dates, syllabus, pattern and colleges accepting scores.",
      h1: "MBA Entrance Exams",
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "Exams", url: `${SITE}/exams` },
      ],
    }),
  },
  {
    match: /^\/authors\/?$/,
    build: () => ({
      title: "MBA Compass Authors & Editorial Experts",
      description:
        "Meet the MBA Compass editorial team and domain experts who write, review and fact-check MBA admissions, coaching and exam guidance.",
      h1: "Authors & Editorial Experts",
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "Authors", url: `${SITE}/authors` },
      ],
    }),
  },
  {
    match: /^\/formulas\/?$/,
    build: () => ({
      title: "MBA Quant Formula Book: CAT, XAT & Aptitude Formulas",
      description:
        "Revise essential CAT and MBA entrance quant formulas for arithmetic, algebra, geometry, number system and modern math.",
      h1: "MBA Quant Formula Book",
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "Formulas", url: `${SITE}/formulas` },
      ],
    }),
  },
  {
    match: /^\/bundles\/?$/,
    build: () => ({
      title: "CAT Mock Bundles: Practice Packs for MBA Entrance Exams",
      description:
        "Browse CAT, XAT, NMAT, SNAP and MBA entrance mock bundles with full-length tests, topic drills and detailed performance analysis.",
      h1: "CAT Mock Bundles",
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "Bundles", url: `${SITE}/bundles` },
      ],
    }),
  },
  {
    match: /^\/iim-waitlist-movement\/?$/,
    build: () => ({
      title: "IIM Waitlist Movement Tracker 2026: Live Updates & History",
      description:
        "Track IIM waitlist movement across IIM A, B, C, L, K, I and the new IIMs with historical conversion data, cutoffs and aspirant reports.",
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "IIM Waitlist Movement", url: `${SITE}/iim-waitlist-movement` },
      ],
    }),
  },
  {
    match: /^\/mba-compass(\/compare)?\/?$/,
    build: (m) => ({
      title: m[1]
        ? "Compare MBA Compass Courses: Plans, Features & Pricing"
        : "MBA Compass Courses: CAT 2026 Online Prep Programs",
      description: m[1]
        ? "Side-by-side comparison of MBA Compass course plans — features, mocks, mentorship, validity and pricing."
        : "Self-paced and live MBA Compass courses for CAT, XAT and NMAT with structured concept videos, daily practice and mentorship.",
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "MBA Compass", url: `${SITE}/mba-compass` },
        ...(m[1] ? [{ name: "Compare", url: `${SITE}/mba-compass/compare` }] : []),
      ],
    }),
  },
  {
    match: /^\/mba-programme-compare\/?$/,
    build: () => ({
      title: "Compare MBA Colleges Side-by-Side: Fees, Placements & ROI",
      description:
        "Compare any two or three MBA colleges side-by-side on fees, placements, ROI, rankings, exams accepted and specializations.",
      url: `${SITE}/compare`,
      breadcrumbs: [
        { name: "Home", url: `${SITE}/` },
        { name: "Compare Colleges", url: `${SITE}/compare` },
      ],
    }),
  },
];

// Faceted listing templates — synthesize per-facet titles & descriptions.
const FACETED_ROUTES: RouteTemplate[] = [
  {
    match: /^\/colleges\/by-city\/([^/?#]+)\/?$/,
    build: (m) => {
      const city = slugToTitle(m[1]);
      return {
        title: `Top MBA Colleges in ${city} 2026: Fees, Rankings & Reviews`,
        description: `Explore the best MBA colleges in ${city} — fees, placements, average packages, exams accepted and verified student reviews on MBA Compass.`,
        h1: `Top MBA Colleges in ${city}`,
        breadcrumbs: [
          { name: "Home", url: `${SITE}/` },
          { name: "Colleges", url: `${SITE}/colleges` },
          { name: city, url: `${SITE}/colleges/by-city/${m[1]}` },
        ],
      };
    },
  },
  {
    match: /^\/colleges\/by-exam\/([^/?#]+)\/?$/,
    build: (m) => {
      const exam = m[1].toUpperCase();
      return {
        title: `MBA Colleges Accepting ${exam} 2026: Cutoffs, Fees, Placements`,
        description: `Full list of MBA colleges that accept ${exam} scores in 2026 — sectional cutoffs, fees, placements, eligibility and admissions process.`,
        h1: `MBA Colleges Accepting ${exam}`,
        breadcrumbs: [
          { name: "Home", url: `${SITE}/` },
          { name: "Colleges", url: `${SITE}/colleges` },
          { name: `By ${exam}`, url: `${SITE}/colleges/by-exam/${m[1]}` },
        ],
      };
    },
  },
  {
    match: /^\/colleges\/type\/([^/?#]+)\/?$/,
    build: (m) => {
      const type = slugToTitle(m[1]);
      return {
        title: `${type} MBA Colleges in India 2026: Fees, Rankings & Reviews`,
        description: `Browse top ${type} MBA colleges in India with fees, rankings, NIRF positions, placement averages, exams accepted and aspirant reviews.`,
        h1: `${type} MBA Colleges in India`,
        breadcrumbs: [
          { name: "Home", url: `${SITE}/` },
          { name: "Colleges", url: `${SITE}/colleges` },
          { name: type, url: `${SITE}/colleges/type/${m[1]}` },
        ],
      };
    },
  },
  {
    match: /^\/category\/([^/?#]+)\/?$/,
    build: (m) => {
      const cat = slugToTitle(m[1]);
      return {
        title: `${cat} — Articles, Guides & Updates | MBA Compass`,
        description: `Curated ${cat} articles, news, guides and analysis from MBA Compass — written by editors and verified by domain experts.`,
        h1: `${cat}`,
        breadcrumbs: [
          { name: "Home", url: `${SITE}/` },
          { name: "Categories", url: `${SITE}/blog` },
          { name: cat, url: `${SITE}/category/${m[1]}` },
        ],
      };
    },
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Dynamic content renderers (DB-backed)
// ──────────────────────────────────────────────────────────────────────────────

function renderArticle(a: any): PageMeta {
  const url = `${SITE}/article/${a.slug}`;
  const title = a.meta_title || a.title || "MBA Compass Article";
  const description = clamp(
    stripHtml(a.meta_description || a.excerpt || a.content || ""),
    200,
  );
  const image = a.image_url || a.banner_url || a.mobile_banner_url || OG_DEFAULT;
  const author = a.author || "MBA Compass Editorial";
  const published = a.created_at ? new Date(a.created_at).toISOString() : new Date().toISOString();
  const modified = a.updated_at ? new Date(a.updated_at).toISOString() : published;
  const category = a.category || "MBA";
  const body = sanitizeContent(a.content || "");

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: clamp(title, 110),
    description,
    image: [image],
    author: { "@type": "Person", name: author },
    publisher: {
      "@type": "Organization",
      name: "MBA Compass",
      logo: { "@type": "ImageObject", url: `${SITE}/og-image.png`, width: 512, height: 512 },
    },
    datePublished: published,
    dateModified: modified,
    articleSection: category,
    inLanguage: "en-IN",
  };

  return {
    url,
    title,
    description,
    image,
    h1: a.title || title,
    jsonLd: articleLd,
    breadcrumbs: [
      { name: "Home", url: `${SITE}/` },
      { name: "Blog", url: `${SITE}/blog` },
      { name: a.title || slugToTitle(a.slug), url },
    ],
    bodyHtml: `<article>
      <p><em>Published: ${esc(new Date(published).toDateString())} · Updated: ${esc(new Date(modified).toDateString())} · By ${esc(author)}</em></p>
      ${a.excerpt ? `<p class="lead">${esc(a.excerpt)}</p>` : ""}
      ${body}
    </article>`,
  };
}

function renderCollege(c: any): PageMeta {
  const url = `${SITE}/college/${c.slug}`;
  const title = c.meta_title || `${c.name} — Fees, Placements, Cutoffs & Reviews 2026`;
  const description = clamp(
    stripHtml(c.meta_description || c.description || ""),
    200,
  );
  const image = c.banner_url || c.logo_url || OG_DEFAULT;
  const body = sanitizeContent(c.description || "");

  const collegeLd: any = {
    "@context": "https://schema.org",
    "@type": "CollegeOrUniversity",
    name: c.name,
    url,
    description,
    image,
  };
  if (c.city || c.state) {
    collegeLd.address = {
      "@type": "PostalAddress",
      addressLocality: c.city,
      addressRegion: c.state,
      addressCountry: "IN",
    };
  }
  if (c.established) collegeLd.foundingDate = String(c.established);

  // Helpers to render heterogenous DB shapes (string | string[] | object) as
  // real, visible HTML sections that mirror what the live React page shows.
  const listify = (v: any): string[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean);
    if (typeof v === "string") return v.split(/\n|,|;|\u2022|\|/).map((s) => s.trim()).filter(Boolean);
    if (typeof v === "object") return Object.entries(v).map(([k, val]) => `${k}: ${val}`);
    return [String(v)];
  };
  const renderList = (items: string[]) =>
    items.length
      ? `<ul class="list-disc pl-6 space-y-1 text-slate-700">${items
          .map((x) => `<li>${esc(x)}</li>`)
          .join("")}</ul>`
      : "";
  const renderKV = (rows: Array<[string, any]>) => {
    const filtered = rows.filter(([, v]) => v !== null && v !== undefined && v !== "");
    if (!filtered.length) return "";
    return `<div class="overflow-x-auto"><table class="w-full text-left border border-slate-200 rounded-md"><tbody>${filtered
      .map(
        ([k, v]) =>
          `<tr class="border-b border-slate-100 last:border-0"><th class="px-4 py-2 bg-slate-50 font-medium text-slate-700 w-1/3">${esc(k)}</th><td class="px-4 py-2 text-slate-800">${esc(String(v))}</td></tr>`,
      )
      .join("")}</tbody></table></div>`;
  };

  const overviewTable = renderKV([
    ["Location", [c.city, c.state].filter(Boolean).join(", ")],
    ["Type", c.type],
    ["Category", c.college_category],
    ["Tier", c.tier],
    ["Established", c.established],
    ["Accreditations", Array.isArray(c.accreditations) ? c.accreditations.join(", ") : c.accreditations],
    ["Campus Size", c.campus_size],
    ["Total Students", c.total_students],
    ["Website", c.website],
  ]);

  const feesTable = renderKV([
    ["Total Fees", c.fees],
    ["Fees (₹ Lakhs)", c.fees_lakhs],
  ]);

  const placementsTable = renderKV([
    ["Average Package", c.placement_avg],
    ["Median Package", c.placement_median],
    ["Highest Package", c.placement_highest],
  ]);

  const recruiters = listify(c.top_recruiters);
  const highlights = listify(c.highlights);
  const specializations = listify(c.specializations);
  const examsAccepted = listify(c.exams_accepted);
  const courses = listify(c.courses);

  const cutoffsHtml = c.cutoff_info
    ? typeof c.cutoff_info === "string"
      ? `<div class="text-slate-700 leading-relaxed">${sanitizeContent(c.cutoff_info)}</div>`
      : renderKV(Object.entries(c.cutoff_info))
    : "";

  const rankingLine = c.ranking
    ? `<p class="text-slate-800"><strong>Current Ranking:</strong> #${esc(c.ranking)}</p>`
    : "";

  const admissionHtml = c.admission_process
    ? `<div class="text-slate-700 leading-relaxed">${sanitizeContent(String(c.admission_process))}</div>`
    : "";

  const faqs = Array.isArray(c.faqs) ? c.faqs : [];
  const faqsHtml = faqs.length
    ? `<dl class="space-y-4">${faqs
        .map(
          (f: any) =>
            `<div><dt class="font-semibold text-slate-900">${esc(f.question || f.q || "")}</dt><dd class="mt-1 text-slate-700">${esc(f.answer || f.a || "")}</dd></div>`,
        )
        .join("")}</dl>`
    : "";

  const section = (title: string, html: string) =>
    html ? `<section class="mt-8"><h2 class="text-2xl font-bold text-slate-900 mb-3">${esc(title)}</h2>${html}</section>` : "";

  const bodyHtml = `${body ? `<section class="prose prose-slate max-w-none">${body}</section>` : ""}
${section("Overview", overviewTable)}
${section("Rankings", rankingLine)}
${section("Fees", feesTable)}
${section("Placements", placementsTable)}
${section("Top Recruiters", renderList(recruiters))}
${section("Cutoffs", cutoffsHtml)}
${section("Admission Process", admissionHtml)}
${section("Specializations", renderList(specializations))}
${section("Exams Accepted", renderList(examsAccepted))}
${section("Courses Offered", renderList(courses))}
${section("Highlights", renderList(highlights))}
${section("Frequently Asked Questions", faqsHtml)}`;

  return {
    url,
    title,
    description,
    image,
    h1: c.h1_tag || c.name,
    jsonLd: collegeLd,
    breadcrumbs: [
      { name: "Home", url: `${SITE}/` },
      { name: "Colleges", url: `${SITE}/colleges` },
      { name: c.name, url },
    ],
    bodyHtml,
  };
}

function renderInstitute(i: any): PageMeta {
  const url = `${SITE}/institute/${i.slug}`;
  const name = i.name || slugToTitle(i.slug);
  const title = i.meta_title || `${name} — Courses, Fees, Faculty & Reviews | MBA Compass`;
  const description = clamp(
    stripHtml(i.meta_description || i.description || ""),
    200,
  );
  const image = i.banner_url || i.logo_url || OG_DEFAULT;
  const body = sanitizeContent(i.description || "");

  const listify = (v: any): string[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : x?.name || x?.title || JSON.stringify(x))).filter(Boolean);
    if (typeof v === "string") return v.split(/\n|,|;|\u2022|\|/).map((s) => s.trim()).filter(Boolean);
    if (typeof v === "object") return Object.entries(v).map(([k, val]) => `${k}: ${val}`);
    return [String(v)];
  };
  const renderList = (items: string[]) =>
    items.length
      ? `<ul class="list-disc pl-6 space-y-1 text-slate-700">${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`
      : "";
  const renderKV = (rows: Array<[string, any]>) => {
    const filtered = rows.filter(([, v]) => v !== null && v !== undefined && v !== "");
    if (!filtered.length) return "";
    return `<div class="overflow-x-auto"><table class="w-full text-left border border-slate-200 rounded-md"><tbody>${filtered
      .map(([k, v]) => `<tr class="border-b border-slate-100 last:border-0"><th class="px-4 py-2 bg-slate-50 font-medium text-slate-700 w-1/3">${esc(k)}</th><td class="px-4 py-2 text-slate-800">${esc(String(v))}</td></tr>`)
      .join("")}</tbody></table></div>`;
  };
  const section = (t: string, html: string) =>
    html ? `<section class="mt-8"><h2 class="text-2xl font-bold text-slate-900 mb-3">${esc(t)}</h2>${html}</section>` : "";

  const orgLd: any = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    name,
    url,
    description,
    image,
  };
  if (i.city || i.state) {
    orgLd.address = {
      "@type": "PostalAddress",
      addressLocality: i.city,
      addressRegion: i.state,
      addressCountry: "IN",
    };
  }
  if (i.phone) orgLd.telephone = String(i.phone);
  if (i.email) orgLd.email = String(i.email);
  if (i.rating && i.total_reviews) {
    orgLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: String(i.rating),
      reviewCount: String(i.total_reviews),
      bestRating: "5",
    };
  }

  const overview = renderKV([
    ["Location", [i.city, i.state].filter(Boolean).join(", ")],
    ["Address", i.address],
    ["Mode", i.mode],
    ["Type", i.institute_type],
    ["Fees (₹ Lakhs)", i.fees_lakhs],
    ["Rating", i.rating ? `${i.rating} / 5 (${i.total_reviews || 0} reviews)` : ""],
    ["Students", i.students_count],
    ["Success Rate", i.success_rate ? `${i.success_rate}%` : ""],
    ["Website", i.website],
  ]);

  const features = listify(i.features);
  const specializations = listify(i.specializations);
  const faqs = Array.isArray(i.faqs) ? i.faqs : [];
  const faqsHtml = faqs.length
    ? `<dl class="space-y-4">${faqs.map((f: any) => `<div><dt class="font-semibold text-slate-900">${esc(f.question || f.q || "")}</dt><dd class="mt-1 text-slate-700">${esc(f.answer || f.a || "")}</dd></div>`).join("")}</dl>`
    : "";
  const sections = Array.isArray(i.sections) ? i.sections : [];
  const sectionsHtml = sections.length
    ? sections.map((s: any) => section(s.title || s.heading || "Details", `<div class="prose prose-slate max-w-none">${sanitizeContent(String(s.content || s.body || ""))}</div>`)).join("")
    : "";

  const bodyHtml = `${body ? `<section class="prose prose-slate max-w-none">${body}</section>` : ""}
${section("Overview", overview)}
${section("Key Features", renderList(features))}
${section("Specializations", renderList(specializations))}
${sectionsHtml}
${section("Frequently Asked Questions", faqsHtml)}`;

  return {
    url,
    title,
    description,
    image,
    h1: i.h1_tag || name,
    jsonLd: orgLd,
    breadcrumbs: [
      { name: "Home", url: `${SITE}/` },
      { name: "Coaching", url: `${SITE}/coaching` },
      { name, url },
    ],
    bodyHtml,
  };
}

function renderExam(e: any): PageMeta {
  const url = `${SITE}/exam/${e.slug}`;
  const name = e.name || slugToTitle(e.slug);
  const fullName = e.full_name || name;
  const title = e.meta_title || `${name} 2026: Exam Pattern, Syllabus, Dates & Eligibility`;
  const description = clamp(
    stripHtml(e.meta_description || e.description || `${fullName} exam pattern, syllabus, dates, eligibility and top MBA colleges accepting scores.`),
    200,
  );
  const body = sanitizeContent(e.description || "");

  const listify = (v: any): string[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : x?.name || JSON.stringify(x))).filter(Boolean);
    if (typeof v === "string") return v.split(/\n|,|;|\u2022|\|/).map((s) => s.trim()).filter(Boolean);
    if (typeof v === "object") return Object.entries(v).map(([k, val]) => `${k}: ${val}`);
    return [String(v)];
  };
  const renderList = (items: string[]) =>
    items.length
      ? `<ul class="list-disc pl-6 space-y-1 text-slate-700">${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`
      : "";
  const renderKV = (rows: Array<[string, any]>) => {
    const filtered = rows.filter(([, v]) => v !== null && v !== undefined && v !== "");
    if (!filtered.length) return "";
    return `<div class="overflow-x-auto"><table class="w-full text-left border border-slate-200 rounded-md"><tbody>${filtered
      .map(([k, v]) => `<tr class="border-b border-slate-100 last:border-0"><th class="px-4 py-2 bg-slate-50 font-medium text-slate-700 w-1/3">${esc(k)}</th><td class="px-4 py-2 text-slate-800">${esc(String(v))}</td></tr>`)
      .join("")}</tbody></table></div>`;
  };
  const section = (t: string, html: string) =>
    html ? `<section class="mt-8"><h2 class="text-2xl font-bold text-slate-900 mb-3">${esc(t)}</h2>${html}</section>` : "";

  const overview = renderKV([
    ["Exam", fullName],
    ["Conducted By", e.conducting_body],
    ["Frequency", e.frequency],
    ["Exam Date", e.exam_date],
    ["Registration Deadline", e.registration_deadline],
  ]);
  const eligibility = listify(e.eligibility);
  const syllabus = listify(e.syllabus);
  const faqs = Array.isArray(e.faqs) ? e.faqs : [];
  const faqsHtml = faqs.length
    ? `<dl class="space-y-4">${faqs.map((f: any) => `<div><dt class="font-semibold text-slate-900">${esc(f.question || f.q || "")}</dt><dd class="mt-1 text-slate-700">${esc(f.answer || f.a || "")}</dd></div>`).join("")}</dl>`
    : "";

  const examLd: any = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: fullName,
    description,
    url,
    provider: {
      "@type": "Organization",
      name: e.conducting_body || "MBA Compass",
      sameAs: SITE,
    },
  };
  const faqLd = faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f: any) => ({
          "@type": "Question",
          name: f.question || f.q || "",
          acceptedAnswer: { "@type": "Answer", text: f.answer || f.a || "" },
        })),
      }
    : null;

  const bodyHtml = `${body ? `<section class="prose prose-slate max-w-none">${body}</section>` : ""}
${section("Overview", overview)}
${section("Eligibility", renderList(eligibility))}
${section("Syllabus", renderList(syllabus))}
${section("Frequently Asked Questions", faqsHtml)}`;

  return {
    url,
    title,
    description,
    image: OG_DEFAULT,
    h1: e.h1_tag || fullName,
    jsonLd: faqLd ? [examLd, faqLd] : examLd,
    breadcrumbs: [
      { name: "Home", url: `${SITE}/` },
      { name: "Exams", url: `${SITE}/exams` },
      { name, url },
    ],
    bodyHtml,
  };
}

function renderCourse(c: any): PageMeta {
  const slug = c.slug;
  const url = `${SITE}/courses/${slug}`;
  const name = c.title || slugToTitle(slug);
  const title = c.meta_title || c.seo_title || `${name} — MBA Compass Course`;
  const description = clamp(
    stripHtml(c.meta_description || c.seo_description || c.subtitle || c.description || ""),
    200,
  );
  const image = c.banner_url || c.thumbnail_url || OG_DEFAULT;
  const body = sanitizeContent(c.description || "");

  const listify = (v: any): string[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : x?.title || x?.name || JSON.stringify(x))).filter(Boolean);
    if (typeof v === "string") return v.split(/\n|,|;|\u2022|\|/).map((s) => s.trim()).filter(Boolean);
    return [String(v)];
  };
  const renderList = (items: string[]) =>
    items.length
      ? `<ul class="list-disc pl-6 space-y-1 text-slate-700">${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`
      : "";
  const renderKV = (rows: Array<[string, any]>) => {
    const filtered = rows.filter(([, v]) => v !== null && v !== undefined && v !== "");
    if (!filtered.length) return "";
    return `<div class="overflow-x-auto"><table class="w-full text-left border border-slate-200 rounded-md"><tbody>${filtered
      .map(([k, v]) => `<tr class="border-b border-slate-100 last:border-0"><th class="px-4 py-2 bg-slate-50 font-medium text-slate-700 w-1/3">${esc(k)}</th><td class="px-4 py-2 text-slate-800">${esc(String(v))}</td></tr>`)
      .join("")}</tbody></table></div>`;
  };
  const section = (t: string, html: string) =>
    html ? `<section class="mt-8"><h2 class="text-2xl font-bold text-slate-900 mb-3">${esc(t)}</h2>${html}</section>` : "";

  const overview = renderKV([
    ["Exam Focus", c.exam_focus],
    ["Mode", c.mode],
    ["Level", c.level],
    ["Language", c.language],
    ["Duration", c.duration_weeks ? `${c.duration_weeks} weeks` : ""],
    ["Validity", c.validity_months ? `${c.validity_months} months` : ""],
    ["Price", c.price ? `₹${Number(c.price).toLocaleString("en-IN")}` : ""],
    ["Original Price", c.original_price ? `₹${Number(c.original_price).toLocaleString("en-IN")}` : ""],
    ["Rating", c.rating ? `${c.rating} / 5 (${c.reviews_count || 0} reviews)` : ""],
    ["Students Enrolled", c.total_students_enrolled],
  ]);

  const highlights = listify(c.highlights);
  const features = listify(c.features);
  const whatLearn = listify(c.what_youll_learn);
  const curriculum = listify(c.curriculum);
  const faqs = Array.isArray(c.faqs) ? c.faqs : [];
  const faqsHtml = faqs.length
    ? `<dl class="space-y-4">${faqs.map((f: any) => `<div><dt class="font-semibold text-slate-900">${esc(f.question || f.q || "")}</dt><dd class="mt-1 text-slate-700">${esc(f.answer || f.a || "")}</dd></div>`).join("")}</dl>`
    : "";

  const courseLd: any = {
    "@context": "https://schema.org",
    "@type": "Course",
    name,
    description,
    url,
    image,
    provider: { "@type": "Organization", name: "MBA Compass", sameAs: SITE },
  };
  if (c.rating && c.reviews_count) {
    courseLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: String(c.rating),
      reviewCount: String(c.reviews_count),
      bestRating: "5",
    };
  }
  if (c.price) {
    courseLd.offers = {
      "@type": "Offer",
      price: String(c.price),
      priceCurrency: "INR",
      url,
      availability: "https://schema.org/InStock",
    };
  }
  const faqLd = faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f: any) => ({
          "@type": "Question",
          name: f.question || f.q || "",
          acceptedAnswer: { "@type": "Answer", text: f.answer || f.a || "" },
        })),
      }
    : null;

  const bodyHtml = `${c.subtitle ? `<p class="lead text-lg text-slate-700">${esc(c.subtitle)}</p>` : ""}
${body ? `<section class="prose prose-slate max-w-none">${body}</section>` : ""}
${section("Course Overview", overview)}
${section("What You'll Learn", renderList(whatLearn))}
${section("Highlights", renderList(highlights))}
${section("Features", renderList(features))}
${section("Curriculum", renderList(curriculum))}
${section("Frequently Asked Questions", faqsHtml)}`;

  return {
    url,
    title,
    description,
    image,
    h1: name,
    jsonLd: faqLd ? [courseLd, faqLd] : courseLd,
    breadcrumbs: [
      { name: "Home", url: `${SITE}/` },
      { name: "Courses", url: `${SITE}/courses` },
      { name, url },
    ],
    bodyHtml,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Router
// ──────────────────────────────────────────────────────────────────────────────

function spaFallbackMeta(path: string): PageMeta {
  return {
    url: `${SITE}${path}`,
    title: "MBA Compass — India's MBA Discovery Platform",
    description:
      "MBA Compass helps you find, compare and choose the best MBA colleges, coaching institutes and prep courses in India.",
    h1: "MBA Compass",
  };
}

function notFoundMeta(path: string): PageMeta {
  const safe = esc(path).slice(0, 200);
  return {
    url: `${SITE}${path}`,
    title: "404 — Page Not Found | MBA Compass",
    description: `The page ${safe} does not exist on MBA Compass.`,
    h1: "Page Not Found",
    noindex: true,
    bodyHtml: `<p>The page <code>${safe}</code> was not found. Try the <a href="${SITE}/">homepage</a>, <a href="${SITE}/colleges">colleges</a>, or <a href="${SITE}/blog">blog</a>.</p>`,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const asJson = wantsJsonFormat(req, url);

  try {
    const path = (url.searchParams.get("path") || "/").trim().replace(/\/+$/, "") || "/";
    const fullUrl = `${SITE}${path === "/" ? "/" : path}`;

    // 1. Try static route templates first (cheap, no DB).
    for (const r of STATIC_ROUTES) {
      const m = path.match(r.match);
      if (m) {
        const meta = r.build(m);
        return emit({ url: fullUrl, ...meta }, 200, asJson);
      }
    }
    for (const r of FACETED_ROUTES) {
      const m = path.match(r.match);
      if (m) {
        const meta = r.build(m);
        return emit({ url: fullUrl, ...meta }, 200, asJson);
      }
    }

    // 2. Dynamic content lookups.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const articleMatch = path.match(/^\/article\/([^/?#]+)/);
    if (articleMatch) {
      const slug = decodeURIComponent(articleMatch[1]);
      const { data } = await supabase
        .from("articles").select("*").eq("slug", slug).eq("published", true).maybeSingle();
      if (!data) return emit(notFoundMeta(path), 404, asJson);
      return emit(renderArticle(data), 200, asJson);
    }

    const collegeMatch = path.match(/^\/college\/([^/?#]+)/);
    if (collegeMatch) {
      const slug = decodeURIComponent(collegeMatch[1]);
      const { data } = await supabase
        .from("colleges").select("*").eq("slug", slug).maybeSingle();
      if (!data) return emit(notFoundMeta(path), 404, asJson);
      return emit(renderCollege(data), 200, asJson);
    }

    const instituteMatch = path.match(/^\/institute\/([^/?#]+)/);
    if (instituteMatch) {
      const slug = decodeURIComponent(instituteMatch[1]);
      const { data } = await supabase
        .from("institutes").select("*").eq("slug", slug).maybeSingle();
      if (!data) return emit(notFoundMeta(path), 404, asJson);
      return emit(renderInstitute(data), 200, asJson);
    }

    const coachingMatch = path.match(/^\/coaching\/([^/?#]+)/);
    if (coachingMatch) {
      const slug = decodeURIComponent(coachingMatch[1]);
      const { data } = await supabase
        .from("institutes").select("*").eq("slug", slug).maybeSingle();
      if (!data) return emit(notFoundMeta(path), 404, asJson);
      return emit(renderInstitute(data), 200, asJson);
    }

    const examMatch = path.match(/^\/exam\/([^/?#]+)/);
    if (examMatch) {
      const slug = decodeURIComponent(examMatch[1]);
      const { data } = await supabase
        .from("exams").select("*").eq("slug", slug).maybeSingle();
      if (!data) return emit(notFoundMeta(path), 404, asJson);
      return emit(renderExam(data), 200, asJson);
    }

    // 3. Unknown route — fall back to an indexable SPA shell rather than 404.
    return emit(spaFallbackMeta(path), 200, asJson);
  } catch (err) {
    console.error("ssr-prerender error", err);
    return emit(
      {
        url: `${SITE}/`,
        title: "MBA Compass",
        description: "MBA Compass — India's MBA discovery platform.",
        h1: "MBA Compass",
      },
      200,
      asJson,
    );
  }
});
