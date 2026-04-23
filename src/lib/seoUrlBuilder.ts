/**
 * Centralized SEO-safe URL builder for the Profile Analyzer.
 * Normalizes exam, city, and course inputs into stable slugs and
 * keeps canonical URLs consistent across client navigation and SSR.
 */

export const SITE_URL = "https://mbacompass.in";

export const seoSlugify = (input: string): string =>
  (input || "")
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export interface ProfileAnalyzerContext {
  exam?: string;
  city?: string;
  state?: string;
  course?: string;
}

/** Build a stable, ordered query string for canonicals. */
export const buildAnalyzerQuery = (ctx: ProfileAnalyzerContext): string => {
  const parts: string[] = [];
  if (ctx.exam) parts.push(`exam-${seoSlugify(ctx.exam)}`);
  const loc = ctx.city || ctx.state;
  if (loc) parts.push(`city-${seoSlugify(loc)}`);
  if (ctx.course) parts.push(`course-${seoSlugify(ctx.course)}`);
  return parts.join("&");
};

export const buildAnalyzerCanonical = (ctx: ProfileAnalyzerContext): string => {
  const q = buildAnalyzerQuery(ctx);
  return q ? `${SITE_URL}/profile-analyzer?${q}` : `${SITE_URL}/profile-analyzer`;
};

/** Parse a canonical-style query back into a context. */
export const parseAnalyzerQuery = (search: string): ProfileAnalyzerContext => {
  const ctx: ProfileAnalyzerContext = {};
  const clean = (search || "").replace(/^\?/, "");
  for (const token of clean.split("&").filter(Boolean)) {
    if (token.startsWith("exam-")) ctx.exam = token.slice(5);
    else if (token.startsWith("city-")) ctx.city = token.slice(5);
    else if (token.startsWith("course-")) ctx.course = token.slice(7);
  }
  return ctx;
};

export const buildCollegeUrl = (slug: string) => `${SITE_URL}/college/${seoSlugify(slug)}`;
export const buildCityUrl = (city: string) => `${SITE_URL}/colleges/${seoSlugify(city)}`;
export const buildExamUrl = (exam: string) => `${SITE_URL}/exam/${seoSlugify(exam)}`;
