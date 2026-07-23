/**
 * Single source of truth for the site's public STATIC routes.
 *
 * Both `serve-sitemap` (sitemap.xml) and `ssr-prerender` (SSR meta) must
 * consume this list so no route can be indexed in one place while missing
 * from the other (root cause of the /freebies indexing miss).
 *
 * Rules:
 *  - Only public, indexable routes. Do NOT list auth-gated, admin,
 *    /student/*, /lovable/*, or duplicate/alias routes.
 *  - Dynamic routes (blog posts, colleges, exams, etc.) are NOT here —
 *    they are generated from database rows in serve-sitemap.
 *  - Keep `path` verbatim as it appears in `<Route path="..." />`.
 *
 * When adding a new static route to src/App.tsx, add it here too, then
 * add its ssr-prerender template (see supabase/functions/ssr-prerender/index.ts).
 */

export type StaticChangefreq = "daily" | "weekly" | "monthly" | "yearly";

export interface StaticRoute {
  path: string;
  changefreq: StaticChangefreq;
  priority: number;
}

export const STATIC_ROUTES: StaticRoute[] = [
  { path: "/",                          changefreq: "daily",   priority: 1.0 },
  { path: "/blog",                      changefreq: "daily",   priority: 0.8 },
  { path: "/colleges",                  changefreq: "weekly",  priority: 0.8 },
  { path: "/coaching",                  changefreq: "weekly",  priority: 0.8 },
  { path: "/compare",                   changefreq: "monthly", priority: 0.6 },
  { path: "/college-finder",            changefreq: "monthly", priority: 0.6 },
  { path: "/profile-analyzer",          changefreq: "monthly", priority: 0.6 },
  { path: "/college-shortlister",       changefreq: "monthly", priority: 0.6 },
  { path: "/cat-score-calculator",      changefreq: "monthly", priority: 0.6 },
  { path: "/cat-mock-1",                changefreq: "weekly",  priority: 0.7 },
  { path: "/roi-calculator",            changefreq: "monthly", priority: 0.6 },
  { path: "/about",                     changefreq: "monthly", priority: 0.5 },
  { path: "/contact",                   changefreq: "monthly", priority: 0.5 },
  { path: "/business-inquiries",        changefreq: "monthly", priority: 0.5 },
  { path: "/list-your-business",        changefreq: "monthly", priority: 0.5 },
  { path: "/mocks",                     changefreq: "weekly",  priority: 0.8 },
  { path: "/courses",                   changefreq: "weekly",  priority: 0.8 },
  { path: "/iim-waitlist-movement",     changefreq: "daily",   priority: 0.8 },
  { path: "/freebies",                  changefreq: "weekly",  priority: 0.7 },
  { path: "/exams",                     changefreq: "weekly",  priority: 0.8 },
  { path: "/authors",                   changefreq: "monthly", priority: 0.5 },
  { path: "/formulas",                  changefreq: "weekly",  priority: 0.7 },
  { path: "/bundles",                   changefreq: "weekly",  priority: 0.7 },
  { path: "/editorial-policy",          changefreq: "yearly",  priority: 0.3 },
  { path: "/fact-check-policy",         changefreq: "yearly",  priority: 0.3 },
  { path: "/privacy-policy",            changefreq: "yearly",  priority: 0.3 },
  { path: "/review-policy",             changefreq: "yearly",  priority: 0.3 },
  { path: "/terms",                     changefreq: "yearly",  priority: 0.3 },
  { path: "/mba-compass",               changefreq: "weekly",  priority: 0.7 },
  { path: "/mba-compass/compare",       changefreq: "monthly", priority: 0.5 },
  { path: "/guides/ipmat-preparation",  changefreq: "monthly", priority: 0.7 },
];
